/**
 * Taxonomia de erros do capítulo 6: de uma resposta HTTP para um erro tipado.
 */

import { ERROR_CODE_SYSTEM } from './constants';
import {
  LabAccessApiError,
  type LabAccessApiErrorDetails,
  LabAccessAuthorizationError,
  LabAccessConsentError,
  LabAccessOperationalError,
  LabAccessRequestError,
  LabAccessSchedulingError,
  OAuthError,
  type RetryStrategy,
} from './errors';
import type { FHIROperationOutcome } from './fhir-types';
import { header, type LabAccessResponse } from './transport';

type Family = 'authorization' | 'consent' | 'operational' | 'request' | 'scheduling';

interface CodeEntry {
  family: Family;
  retry: RetryStrategy;
}

const entry = (family: Family, retry: RetryStrategy = 'never'): CodeEntry => ({ family, retry });

/** Códigos da seção 6.3, com a família e a coluna "Repetir?". */
export const PROTOCOL_ERROR_CODES: Readonly<Record<string, CodeEntry>> = {
  APPOINTMENT_FIELD_NOT_MODIFIABLE: entry('scheduling'),
  APPOINTMENT_NOT_MODIFIABLE: entry('scheduling'),
  CLIENT_CERTIFICATE_REQUIRED: entry('authorization'),
  CONSENT_EXPIRED: entry('authorization'),
  CONSENT_INVALID_EXPIRATION: entry('consent'),
  CONSENT_INVALID_SCOPES: entry('consent'),
  CONSENT_INVALID_STATE: entry('consent'),
  CONSENT_NOT_FOUND: entry('request'),
  CONSENT_REVOKED: entry('authorization'),
  EXAM_NOT_AVAILABLE_AT_LOCATION: entry('scheduling'),
  IF_MATCH_REQUIRED: entry('request'),
  IF_NONE_EXIST_REQUIRED: entry('request'),
  INTERACTION_ID_MISSING: entry('request'),
  INTERNAL_ERROR: entry('operational', 'backoff'),
  INVALID_REQUEST: entry('request'),
  INVALID_RESOURCE: entry('scheduling'),
  METHOD_NOT_ALLOWED: entry('request'),
  NOT_ACCEPTABLE: entry('request'),
  PATIENT_NOT_IN_CONSENT: entry('authorization'),
  PROVIDER_UNAVAILABLE: entry('operational', 'after-retry-after'),
  RATE_LIMITED: entry('operational', 'after-retry-after'),
  RECEIVER_NOT_ALLOWED: entry('authorization'),
  RESOURCE_NOT_FOUND: entry('request'),
  SCOPE_INSUFFICIENT: entry('authorization'),
  SEARCH_WINDOW_TOO_LARGE: entry('request'),
  SLOT_UNAVAILABLE: entry('scheduling'),
  TOKEN_CERTIFICATE_MISMATCH: entry('authorization'),
  TOKEN_INVALID: entry('authorization', 'after-token-refresh'),
  TOKEN_MISSING: entry('authorization'),
  UNSUPPORTED_MEDIA_TYPE: entry('request'),
  UNSUPPORTED_SEARCH_PARAMETER: entry('request'),
  UPSTREAM_TIMEOUT: entry('operational', 'backoff'),
  VERSION_CONFLICT: entry('scheduling', 'after-reread'),
};

/** Erros OAuth do PAR e do endpoint de token (seção 6.2.1) que admitem repetição. */
const OAUTH_RETRY: Readonly<Record<string, RetryStrategy>> = {
  server_error: 'backoff',
  temporarily_unavailable: 'after-retry-after',
};

const FAMILY_CLASSES: Record<Family, new (details: LabAccessApiErrorDetails) => LabAccessApiError> =
  {
    authorization: LabAccessAuthorizationError,
    consent: LabAccessConsentError,
    operational: LabAccessOperationalError,
    request: LabAccessRequestError,
    scheduling: LabAccessSchedulingError,
  };

export function parseJson(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}

export function isOperationOutcome(value: unknown): value is FHIROperationOutcome {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { resourceType?: unknown }).resourceType === 'OperationOutcome' &&
    Array.isArray((value as { issue?: unknown }).issue)
  );
}

/** Código do protocolo e `IssueType` do primeiro `issue` que traz um código do protocolo. */
export function protocolCode(outcome: FHIROperationOutcome): {
  code?: string;
  issueCode?: string;
} {
  for (const issue of outcome.issue) {
    const coding = issue.details?.coding?.find((c) => c.system === ERROR_CODE_SYSTEM);
    if (coding?.code) return { code: coding.code, issueCode: issue.code };
  }
  return { issueCode: outcome.issue[0]?.code };
}

/** `Retry-After` em segundos. Aceita só o formato numérico que o protocolo define. */
export function retryAfterSeconds(response: LabAccessResponse): number | undefined {
  const value = header(response, 'retry-after');
  if (value === undefined || !/^\d+$/.test(value.trim())) return undefined;
  return Number(value.trim());
}

/**
 * Código desconhecido é tratado pelo status HTTP: 4xx não se repete, 5xx se
 * repete com recuo (seção 6.4, regra 5).
 */
function retryByStatus(status: number): RetryStrategy {
  return status >= 500 ? 'backoff' : 'never';
}

/** Converte uma resposta de erro dos endpoints de consentimento ou da API FHIR. */
export function toApiError(response: LabAccessResponse, interactionId?: string): LabAccessApiError {
  const body = parseJson(response.body);
  const operationOutcome = isOperationOutcome(body) ? body : undefined;
  const { code, issueCode } = operationOutcome ? protocolCode(operationOutcome) : {};
  const known = code === undefined ? undefined : PROTOCOL_ERROR_CODES[code];

  const details: LabAccessApiErrorDetails = {
    code,
    interactionId,
    issueCode,
    operationOutcome,
    retry: known?.retry ?? retryByStatus(response.status),
    retryAfterSeconds: retryAfterSeconds(response),
    status: response.status,
    wwwAuthenticate: header(response, 'www-authenticate'),
  };

  if (!known) return new LabAccessApiError(details);
  // O mesmo código vale para leitura (403) e para escrita (422).
  const family =
    code === 'PATIENT_NOT_IN_CONSENT' && response.status === 422 ? 'scheduling' : known.family;
  return new FAMILY_CLASSES[family](details);
}

/** Converte uma resposta de erro do PAR, do endpoint de token ou da revogação. */
export function toOAuthError(response: LabAccessResponse): LabAccessApiError | OAuthError {
  const body = parseJson(response.body) as
    | { error?: unknown; error_description?: unknown }
    | undefined;
  if (typeof body?.error !== 'string') {
    return new LabAccessApiError({
      retry: retryByStatus(response.status),
      retryAfterSeconds: retryAfterSeconds(response),
      status: response.status,
    });
  }
  return new OAuthError(
    body.error,
    typeof body.error_description === 'string' ? body.error_description : undefined,
    response.status,
    OAUTH_RETRY[body.error] ?? retryByStatus(response.status),
    retryAfterSeconds(response),
  );
}
