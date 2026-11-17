/**
 * Jornada de autorização (fluxo 2.2): PAR com PKCE e `state`, conferência do
 * retorno, troca do código e conferência do titular.
 */

import { timingSafeEqual } from 'node:crypto';

import type { ConsentRecord } from './consent-types';
import { readConsentAsPatient } from './consents';
import { PATIENT_SCOPES, type PatientScope } from './constants';
import type { ClientContext, ResolvedProvider } from './context';
import { isValidCpf, normalizeExpectedCpf, sameCpf } from './cpf';
import {
  AuthorizationDeniedError,
  AuthorizationResponseError,
  HolderVerificationError,
  IssuerMismatchError,
  LabAccessConfigError,
  LabAccessProtocolError,
  PatientMismatchError,
  StateMismatchError,
} from './errors';
import { oauthPost, withRetry } from './http';
import { codeChallengeS256, generateCodeVerifier, generateState } from './pkce';
import { assertScopeUsable } from './resolve';
import { revokeConsent } from './revocation';
import { assertRegistryAllowsNewGrants, type IssuedToken, requestToken } from './tokens';
import { isConsentId, isFhirId } from './validation';

/**
 * Estado de uma jornada aberta. O aplicativo o guarda no backend, ligado à
 * sessão do paciente que iniciou a jornada, até o retorno.
 *
 * O objeto não tem campo para CPF nem para qualquer credencial do paciente.
 */
export interface AuthorizationJourney {
  /** URL a abrir no navegador do sistema. Leva só `client_id` e `request_uri`. */
  authorizationUrl: string;
  /** Segredo do PKCE. Fica no backend e não vai ao aplicativo. */
  codeVerifier: string;
  consentId: string;
  /** `issuer` do provedor para o qual a jornada foi aberta. */
  issuer: string;
  providerId: string;
  redirectUri: string;
  /** Instante em que o `request_uri` deixa de valer. */
  requestUriExpiresAt: string;
  scopes: PatientScope[];
  state: string;
}

export interface StartAuthorizationInput {
  /** O consentimento criado para esta jornada, em `AWAITING_AUTHORISATION`. */
  consent: Pick<ConsentRecord, 'consentId' | 'scopes' | 'status'>;
  /**
   * CPF do paciente que inicia a jornada no aplicativo. Só é conferido (11
   * dígitos, dígitos verificadores certos e algarismos não todos iguais): com
   * CPF inválido a jornada não começa. Não é enviado ao provedor nem guardado
   * na jornada, e volta a ser informado na conclusão.
   */
  expectedCpf: string;
  /** Um dos `redirect_uris` do receptor no registro, idêntico caractere a caractere. */
  redirectUri: string;
  /** Subconjunto dos escopos do consentimento. Padrão: todos. */
  scopes?: readonly PatientScope[];
}

export type AuthorizationCallback = Record<string, string> | string | URL | URLSearchParams;

/** Envia a requisição de autorização por PAR e devolve a jornada aberta. */
export async function startAuthorization(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  input: StartAuthorizationInput,
): Promise<AuthorizationJourney> {
  const { consent, redirectUri } = input;
  normalizeExpectedCpf(input.expectedCpf);
  if (!isConsentId(consent?.consentId)) {
    throw new LabAccessConfigError('O consentimento não traz um consent_id válido.');
  }
  if (consent.status !== 'AWAITING_AUTHORISATION') {
    throw new LabAccessConfigError(
      'Só um consentimento em AWAITING_AUTHORISATION abre uma jornada de autorização.',
    );
  }
  if (!resolved.receiver.receiver.redirect_uris.includes(redirectUri)) {
    throw new LabAccessConfigError(
      'O redirect_uri deveria ser idêntico a um dos redirect_uris do receptor no registro.',
    );
  }
  const scopes = [...(input.scopes ?? consent.scopes)] as PatientScope[];
  const patientScopes: readonly string[] = PATIENT_SCOPES;
  if (
    scopes.length === 0 ||
    !scopes.every((scope) => patientScopes.includes(scope) && consent.scopes.includes(scope))
  ) {
    throw new LabAccessConfigError(
      'Os escopos da autorização deveriam ser escopos de paciente contidos no consentimento.',
    );
  }
  for (const scope of scopes) assertScopeUsable(resolved, scope);
  assertRegistryAllowsNewGrants(ctx);

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const sentAt = ctx.now().getTime();
  const body = await withRetry(ctx, true, () =>
    oauthPost(
      ctx,
      resolved,
      resolved.endpoints.parEndpoint,
      {
        client_id: ctx.clientId,
        code_challenge: codeChallengeS256(codeVerifier),
        code_challenge_method: 'S256',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: [`consent:${consent.consentId}`, ...scopes].join(' '),
        state,
      },
      201,
    ),
  );

  const { expires_in: expiresIn, request_uri: requestUri } = body;
  if (typeof requestUri !== 'string' || requestUri === '') {
    throw new LabAccessProtocolError('A resposta do PAR não traz request_uri.');
  }
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new LabAccessProtocolError('A resposta do PAR não traz expires_in válido.');
  }

  const url = new URL(resolved.endpoints.authorizationEndpoint);
  url.search = new URLSearchParams({ client_id: ctx.clientId, request_uri: requestUri }).toString();

  return {
    authorizationUrl: url.toString(),
    codeVerifier,
    consentId: consent.consentId,
    issuer: resolved.endpoints.issuer,
    providerId: resolved.provider.participant_id,
    redirectUri,
    requestUriExpiresAt: new Date(sentAt + expiresIn * 1000).toISOString(),
    scopes,
    state,
  };
}

function callbackParams(journey: AuthorizationJourney, callback: AuthorizationCallback) {
  if (callback instanceof URLSearchParams) return callback;
  if (typeof callback === 'string' || callback instanceof URL) {
    let url: URL;
    try {
      url = new URL(callback);
    } catch {
      throw new AuthorizationResponseError('O retorno da autorização não é uma URL.');
    }
    const expected = new URL(journey.redirectUri);
    if (url.origin !== expected.origin || url.pathname !== expected.pathname) {
      throw new AuthorizationResponseError(
        'O retorno da autorização não chegou no redirect_uri desta jornada.',
      );
    }
    return url.searchParams;
  }
  return new URLSearchParams(callback);
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf-8');
  const right = Buffer.from(b, 'utf-8');
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Confere o retorno da autorização e devolve o código.
 *
 * O `iss` é conferido primeiro, por comparação simples de texto, também nas
 * respostas de erro: resposta sem `iss` ou com outro valor é recusada e o
 * código não é trocado. Depois vem o `state`.
 */
export function parseAuthorizationResponse(
  journey: AuthorizationJourney,
  callback: AuthorizationCallback,
): string {
  const params = callbackParams(journey, callback);
  for (const name of ['code', 'error', 'error_description', 'iss', 'state']) {
    if (params.getAll(name).length > 1) {
      throw new AuthorizationResponseError(`O retorno traz o parâmetro ${name} repetido.`);
    }
  }

  if (params.get('iss') !== journey.issuer) {
    throw new IssuerMismatchError(
      'authorization-response',
      'O iss do retorno não é o issuer do provedor para o qual a jornada foi aberta.',
    );
  }
  if (!sameText(params.get('state') ?? '', journey.state)) {
    throw new StateMismatchError();
  }

  const error = params.get('error');
  if (error !== null) {
    throw new AuthorizationDeniedError(
      error,
      params.get('error_description') ?? undefined,
      journey.consentId,
    );
  }
  const code = params.get('code');
  if (code === null || code === '') {
    throw new AuthorizationResponseError('O retorno da autorização não traz code.');
  }
  return code;
}

export interface CompletedAuthorization {
  /** `expiration_date_time` do consentimento, lido na conferência. */
  consentExpiresAt: string;
  patientFhirId: string;
  tokens: IssuedToken;
}

/**
 * Conclui a jornada: confere o retorno, troca o código e faz a conferência do
 * titular antes de devolver os tokens.
 *
 * Os tokens só saem desta função quando o CPF devolvido pelo provedor é o do
 * paciente que iniciou a jornada. Em qualquer outro desfecho o consentimento
 * é revogado e os tokens e o CPF recebido se perdem com o escopo da função.
 */
export async function completeAuthorization(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  journey: AuthorizationJourney,
  callback: AuthorizationCallback,
  expectedCpf: string,
): Promise<CompletedAuthorization> {
  const expected = normalizeExpectedCpf(expectedCpf);
  const providerId = resolved.provider.participant_id;
  if (journey.providerId !== providerId) {
    throw new LabAccessConfigError('A jornada foi aberta para outro provedor.');
  }
  if (journey.issuer !== resolved.endpoints.issuer) {
    throw new IssuerMismatchError(
      'registry',
      'O issuer do provedor no registro mudou desde a abertura da jornada.',
    );
  }
  const code = parseAuthorizationResponse(journey, callback);
  assertRegistryAllowsNewGrants(ctx);

  const tokens = await requestToken(
    ctx,
    resolved,
    {
      code,
      code_verifier: journey.codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: journey.redirectUri,
    },
    false,
  );

  // Conferência do titular: primeira chamada a recurso depois dos tokens.
  // Conferência impossível revoga com RECEIVER_TERMINATION, nunca com
  // PATIENT_MISMATCH, que afirmaria uma divergência que ninguém viu.
  const giveUp = async (cause?: unknown, consentExpiresAt?: string): Promise<never> => {
    const result = await revokeConsent(ctx, {
      consentExpiresAt,
      consentId: journey.consentId,
      providerId,
      reason: 'RECEIVER_TERMINATION',
    });
    throw new HolderVerificationError(
      journey.consentId,
      providerId,
      result.outcome,
      { cause },
      result.outcome === 'pending' ? result.pending : undefined,
    );
  };

  let read;
  try {
    read = await readConsentAsPatient(ctx, resolved, journey.consentId, tokens.accessToken);
  } catch (cause) {
    return giveUp(cause);
  }

  const patient = read.patient as { cpf?: unknown; fhir_id?: unknown } | undefined;
  const verifiable =
    read.record.consentId === journey.consentId &&
    read.record.status === 'AUTHORISED' &&
    typeof patient === 'object' &&
    patient !== null &&
    isValidCpf(patient.cpf) &&
    isFhirId(patient.fhir_id);
  const consentExpiresAt = read.record.expirationDateTime;
  if (!verifiable) return giveUp(undefined, consentExpiresAt);

  if (!sameCpf(expected, patient.cpf as string)) {
    const result = await revokeConsent(ctx, {
      consentExpiresAt,
      consentId: journey.consentId,
      providerId,
      reason: 'PATIENT_MISMATCH',
    });
    throw new PatientMismatchError(
      journey.consentId,
      providerId,
      read.interactionId,
      result.outcome,
      result.outcome === 'pending' ? result.pending : undefined,
    );
  }

  return { consentExpiresAt, patientFhirId: patient.fhir_id as string, tokens };
}
