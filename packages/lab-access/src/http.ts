/**
 * Chamadas HTTP do cliente: repetição conforme a seção 6.4, cabeçalhos dos
 * endpoints de consentimento e da API FHIR, e POST de formulário ao servidor
 * de autorização.
 */

import { randomUUID } from 'node:crypto';

import { createClientAssertion } from './client-assertion';
import { CLIENT_ASSERTION_TYPE } from './constants';
import type { ClientContext, ResolvedProvider } from './context';
import { parseJson, toApiError, toOAuthError } from './error-codes';
import {
  LabAccessApiError,
  LabAccessError,
  LabAccessProtocolError,
  LabAccessTransportError,
  OAuthError,
} from './errors';
import { header, type LabAccessRequest, type LabAccessResponse } from './transport';

/** Envia pelo transporte e converte qualquer falha sem resposta em erro de transporte. */
export async function send(
  ctx: ClientContext,
  request: LabAccessRequest,
): Promise<LabAccessResponse> {
  try {
    return await ctx.transport.request(request);
  } catch (cause) {
    if (cause instanceof LabAccessError) throw cause;
    throw new LabAccessTransportError('Falha de transporte na chamada ao provedor.', { cause });
  }
}

/**
 * Executa `attempt` e repete quando a taxonomia permite repetir a mesma
 * requisição: recuo exponencial a partir de 1 segundo, ou ao menos o
 * `Retry-After` indicado. Erros 4xx sem mudança não são repetidos.
 *
 * `repeatable` diz se a operação pode ser reenviada sem risco de duplicar
 * efeito. Quando é `false`, nada é repetido aqui.
 */
export async function withRetry<T>(
  ctx: ClientContext,
  repeatable: boolean,
  attempt: () => Promise<T>,
): Promise<T> {
  for (let tries = 1; ; tries += 1) {
    try {
      return await attempt();
    } catch (error) {
      const automatic =
        error instanceof LabAccessError &&
        (error.retry === 'backoff' || error.retry === 'after-retry-after');
      if (!repeatable || !automatic || tries >= ctx.retry.maxAttempts) throw error;

      const backoff = ctx.retry.baseDelayMs * 2 ** (tries - 1);
      const indicated =
        error instanceof LabAccessApiError || error instanceof OAuthError
          ? (error.retryAfterSeconds ?? 0) * 1000
          : 0;
      const delay = error.retry === 'after-retry-after' ? Math.max(indicated, backoff) : backoff;
      if (delay > ctx.retry.maxDelayMs) throw error;
      await ctx.sleep(delay);
    }
  }
}

export interface ApiRequest {
  /** `fhir` para a API FHIR, `json` para os endpoints de consentimento. */
  accept: 'fhir' | 'json';
  body?: unknown;
  consentId?: string;
  headers?: Record<string, string>;
  method: LabAccessRequest['method'];
  okStatuses: readonly number[];
  providerId: string;
  /** Ausente só em `GET /metadata`, que não exige token. */
  token?: string;
  url: string;
}

export interface ApiResponse {
  headers: LabAccessResponse['headers'];
  interactionId: string;
  /** Corpo JSON da resposta, ou `undefined` quando não há corpo. */
  json: unknown;
  response: LabAccessResponse;
  status: number;
}

const MEDIA_TYPES = { fhir: 'application/fhir+json', json: 'application/json' } as const;

/**
 * Uma chamada, sem repetição, aos endpoints de consentimento ou à API FHIR.
 *
 * O token vai só no cabeçalho `Authorization`. Cada chamada leva um
 * `x-fapi-interaction-id` novo, inclusive as repetições.
 */
export async function apiRequest(ctx: ClientContext, request: ApiRequest): Promise<ApiResponse> {
  const interactionId = randomUUID();
  const headers: Record<string, string> = {
    Accept: MEDIA_TYPES[request.accept],
    'x-fapi-interaction-id': interactionId,
    ...request.headers,
  };
  if (request.token !== undefined) headers.Authorization = `Bearer ${request.token}`;
  let body: string | undefined;
  if (request.body !== undefined) {
    headers['Content-Type'] = MEDIA_TYPES[request.accept];
    body = JSON.stringify(request.body);
  }

  const event = {
    clientId: ctx.clientId,
    consentId: request.consentId,
    interactionId,
    method: request.method,
    providerId: request.providerId,
    resource: request.url.split('?')[0]!,
  };

  let response: LabAccessResponse;
  try {
    response = await send(ctx, { body, headers, method: request.method, url: request.url });
  } catch (error) {
    ctx.onInteraction?.(event);
    throw error;
  }
  ctx.onInteraction?.({ ...event, status: response.status });

  if (!request.okStatuses.includes(response.status)) throw toApiError(response, interactionId);

  let json: unknown;
  if (response.body.trim() !== '') {
    json = parseJson(response.body);
    if (json === undefined) {
      throw new LabAccessProtocolError('A resposta do provedor não é JSON.');
    }
  }
  return { headers: response.headers, interactionId, json, response, status: response.status };
}

/**
 * POST de formulário ao PAR, ao endpoint de token ou ao de revogação, com a
 * asserção `private_key_jwt`. Cada chamada assina uma asserção nova.
 */
export async function oauthPost(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  url: string,
  params: Record<string, string>,
  okStatus: number,
): Promise<Record<string, unknown>> {
  const assertion = await createClientAssertion({
    clientId: ctx.clientId,
    issuer: resolved.endpoints.issuer,
    now: ctx.now(),
    signingKey: ctx.signingKey,
  });
  const form = new URLSearchParams({
    ...params,
    client_assertion: assertion,
    client_assertion_type: CLIENT_ASSERTION_TYPE,
  });
  const response = await send(ctx, {
    body: form.toString(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
    url,
  });

  if (response.status !== okStatus) {
    const error = toOAuthError(response);
    // Um 2xx diferente do previsto não é erro do OAuth: é resposta fora do formato.
    if (response.status >= 200 && response.status < 300) {
      throw new LabAccessProtocolError(
        `O servidor de autorização respondeu ${response.status} onde o protocolo prevê ${okStatus}.`,
      );
    }
    throw error;
  }
  const json = parseJson(response.body);
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new LabAccessProtocolError('A resposta do servidor de autorização não é um objeto JSON.');
  }
  return json as Record<string, unknown>;
}

export { header };
