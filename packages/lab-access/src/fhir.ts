/**
 * Interações REST da API FHIR (seção 5.5): busca, leitura e paginação.
 */

import type { ClientContext, ResolvedProvider } from './context';
import { isOperationOutcome } from './error-codes';
import { LabAccessConfigError, LabAccessProtocolError } from './errors';
import type { FHIROperationOutcome, FHIRSearchBundle } from './fhir-types';
import { type ApiRequest, apiRequest, type ApiResponse, header, withRetry } from './http';
import { assertFhirId, baseUrl } from './validation';

/** Executa uma chamada com o token certo e trata o 401 conforme o tipo de token. */
export type TokenRunner = <R>(call: (token: string) => Promise<R>) => Promise<R>;

export interface FhirEnv {
  consentId?: string;
  ctx: ClientContext;
  resolved: ResolvedProvider;
  run: TokenRunner;
}

export type SearchParam = [name: string, value: boolean | number | string | undefined];

export interface ReadResult<T> {
  /** Valor do cabeçalho `ETag`, para usar em `If-Match`. */
  etag?: string;
  resource: T;
}

export interface SearchPage<T> {
  /** O Bundle `searchset` como o provedor devolveu. */
  bundle: FHIRSearchBundle<T>;
  /** Recursos trazidos por `_include`. */
  included: unknown[];
  /** Busca a próxima página pelo link `next`, sem alterá-lo. */
  next(): Promise<SearchPage<T> | undefined>;
  nextUrl?: string;
  /** Entradas `OperationOutcome` informativas do Bundle. */
  outcomes: FHIROperationOutcome[];
  /** Recursos que casaram com a busca. */
  resources: T[];
}

export interface CommonSearchParams {
  /** `_count`, de 1 a 100. Padrão do provedor: 20. */
  count?: number;
  /** Só o que mudou depois deste instante (`_lastUpdated=gt...`). */
  lastUpdatedAfter?: Date | string;
}

function fhirBase(env: FhirEnv): string {
  return baseUrl(env.resolved.provider.provider.fhir_base_url);
}

export function fhirCall(
  env: FhirEnv,
  request: Omit<ApiRequest, 'accept' | 'consentId' | 'providerId' | 'token'>,
  repeatable: boolean,
): Promise<ApiResponse> {
  return env.run((token) =>
    withRetry(env.ctx, repeatable, () =>
      apiRequest(env.ctx, {
        ...request,
        accept: 'fhir',
        consentId: env.consentId,
        providerId: env.resolved.provider.participant_id,
        token,
      }),
    ),
  );
}

/** Parâmetros comuns de busca: `_lastUpdated` e `_count`. */
export function commonParams(params: CommonSearchParams): SearchParam[] {
  const result: SearchParam[] = [];
  if (params.lastUpdatedAfter !== undefined) {
    const value = params.lastUpdatedAfter;
    const instant = value instanceof Date ? value.getTime() : Date.parse(value);
    if (Number.isNaN(instant)) {
      throw new LabAccessConfigError('lastUpdatedAfter não é uma data válida.');
    }
    const text = value instanceof Date ? value.toISOString().replace(/\.\d{3}Z$/, 'Z') : value;
    result.push(['_lastUpdated', `gt${text}`]);
  }
  if (params.count !== undefined) {
    if (!Number.isInteger(params.count) || params.count < 1 || params.count > 100) {
      throw new LabAccessConfigError('count deveria ser um inteiro de 1 a 100.');
    }
    result.push(['_count', params.count]);
  }
  return result;
}

/** Repete o parâmetro para cada valor: na busca FHIR, repetição significa "e". */
export function repeated(
  name: string,
  value: readonly string[] | string | undefined,
): SearchParam[] {
  if (value === undefined) return [];
  return (typeof value === 'string' ? [value] : value).map((item) => [name, item]);
}

function toPage<T>(env: FhirEnv, resourceType: string, json: unknown): SearchPage<T> {
  const bundle = json as FHIRSearchBundle<T> | undefined;
  if (bundle?.resourceType !== 'Bundle' || bundle.type !== 'searchset') {
    throw new LabAccessProtocolError('A busca não devolveu um Bundle do tipo searchset.');
  }

  const resources: T[] = [];
  const included: unknown[] = [];
  const outcomes: FHIROperationOutcome[] = [];
  for (const entry of bundle.entry ?? []) {
    const resource = entry.resource;
    if (isOperationOutcome(resource)) outcomes.push(resource);
    else if (entry.search?.mode === 'include') included.push(resource);
    else if ((resource as { resourceType?: unknown } | undefined)?.resourceType === resourceType) {
      resources.push(resource as T);
    } else if (resource !== undefined) included.push(resource);
  }

  const nextUrl = bundle.link?.find((link) => link.relation === 'next')?.url;
  return {
    bundle,
    included,
    next: async () =>
      nextUrl === undefined ? undefined : searchUrl<T>(env, resourceType, nextUrl),
    nextUrl,
    outcomes,
    resources,
  };
}

/**
 * O link `next` é seguido como veio, mas só dentro do `fhir_base_url` do
 * registro (seção 5.1): mesmo esquema, host e porta, e caminho que começa pelo
 * caminho da base em fronteira de segmento. A comparação é feita sobre a URL
 * já interpretada, para que `..`, maiúsculas no host ou a porta padrão escrita
 * não mudem o resultado. Fora disso nenhuma requisição é feita, e o token e o
 * certificado não chegam a outro endereço.
 */
export function isInsideBase(base: string, candidate: string): boolean {
  let target: URL;
  let root: URL;
  try {
    target = new URL(candidate);
    root = new URL(base);
  } catch {
    return false;
  }
  // A origem cobre esquema, host e porta. A URL que traz usuário antes do host
  // não começa pela própria origem e também é recusada.
  if (target.origin !== root.origin || !target.href.startsWith(`${target.origin}/`)) {
    return false;
  }
  const prefix = root.pathname.replace(/\/+$/, '');
  return target.pathname === prefix || target.pathname.startsWith(`${prefix}/`);
}

function assertInsideFhirBase(env: FhirEnv, url: string): void {
  if (!isInsideBase(fhirBase(env), url)) {
    throw new LabAccessProtocolError(
      'O link da próxima página aponta para fora da base FHIR do provedor no registro.',
    );
  }
}

async function searchUrl<T>(
  env: FhirEnv,
  resourceType: string,
  url: string,
): Promise<SearchPage<T>> {
  assertInsideFhirBase(env, url);
  const { json } = await fhirCall(env, { method: 'GET', okStatuses: [200], url }, true);
  return toPage<T>(env, resourceType, json);
}

/** Busca (`search-type`). Parâmetros sem valor são omitidos. */
export function fhirSearch<T>(
  env: FhirEnv,
  resourceType: string,
  params: readonly SearchParam[],
): Promise<SearchPage<T>> {
  const query = new URLSearchParams();
  for (const [name, value] of params) {
    if (value !== undefined) query.append(name, String(value));
  }
  const text = query.toString();
  return searchUrl<T>(
    env,
    resourceType,
    `${fhirBase(env)}/${resourceType}${text ? `?${text}` : ''}`,
  );
}

/** Confere que a resposta traz um recurso do tipo esperado. */
export function asResource<T>(response: ApiResponse, resourceType: string): ReadResult<T> {
  const resource = response.json as { resourceType?: unknown } | undefined;
  if (resource?.resourceType !== resourceType) {
    throw new LabAccessProtocolError(`A resposta não traz um recurso ${resourceType}.`);
  }
  return { etag: header(response.response, 'etag'), resource: resource as T };
}

/** Leitura por id (`read`). */
export async function fhirRead<T>(
  env: FhirEnv,
  resourceType: string,
  id: string,
): Promise<ReadResult<T>> {
  assertFhirId(id, `id de ${resourceType}`);
  const response = await fhirCall(
    env,
    { method: 'GET', okStatuses: [200], url: `${fhirBase(env)}/${resourceType}/${id}` },
    true,
  );
  return asResource<T>(response, resourceType);
}

export { fhirBase };
