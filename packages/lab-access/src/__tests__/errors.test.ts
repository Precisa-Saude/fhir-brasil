import { describe, expect, it } from 'vitest';

import { PROTOCOL_ERROR_CODES, toApiError, toOAuthError } from '../error-codes';
import {
  AuthorizationDeniedError,
  ConsentEndedError,
  LabAccessApiError,
  LabAccessAuthorizationError,
  LabAccessConfigError,
  LabAccessConsentError,
  LabAccessError,
  LabAccessOperationalError,
  LabAccessRequestError,
  LabAccessSchedulingError,
  LabAccessTransportError,
  OAuthError,
  PatientMismatchError,
  RegistryVerificationError,
  RevocationPendingError,
} from '../errors';
import { jsonResponse, operationOutcome } from './helpers';

/** Tabelas da seção 6.3: código, status HTTP, IssueType, família e se repete. */
const TAXONOMY: [string, number, string, unknown, string][] = [
  ['TOKEN_MISSING', 401, 'login', LabAccessAuthorizationError, 'never'],
  ['TOKEN_INVALID', 401, 'login', LabAccessAuthorizationError, 'after-token-refresh'],
  ['TOKEN_CERTIFICATE_MISMATCH', 401, 'security', LabAccessAuthorizationError, 'never'],
  ['CONSENT_REVOKED', 401, 'security', LabAccessAuthorizationError, 'never'],
  ['CONSENT_EXPIRED', 401, 'expired', LabAccessAuthorizationError, 'never'],
  ['SCOPE_INSUFFICIENT', 403, 'forbidden', LabAccessAuthorizationError, 'never'],
  ['PATIENT_NOT_IN_CONSENT', 403, 'forbidden', LabAccessAuthorizationError, 'never'],
  ['RECEIVER_NOT_ALLOWED', 403, 'forbidden', LabAccessAuthorizationError, 'never'],
  ['REGISTRY_EXPIRED', 403, 'forbidden', LabAccessAuthorizationError, 'never'],
  ['CLIENT_CERTIFICATE_REQUIRED', 401, 'security', LabAccessAuthorizationError, 'never'],
  ['INVALID_REQUEST', 400, 'invalid', LabAccessRequestError, 'never'],
  ['INTERACTION_ID_MISSING', 400, 'required', LabAccessRequestError, 'never'],
  ['UNSUPPORTED_SEARCH_PARAMETER', 400, 'not-supported', LabAccessRequestError, 'never'],
  ['SEARCH_WINDOW_TOO_LARGE', 400, 'too-costly', LabAccessRequestError, 'never'],
  ['IF_NONE_EXIST_REQUIRED', 400, 'required', LabAccessRequestError, 'never'],
  ['IF_MATCH_REQUIRED', 400, 'required', LabAccessRequestError, 'never'],
  ['RESOURCE_NOT_FOUND', 404, 'not-found', LabAccessRequestError, 'never'],
  ['CONSENT_NOT_FOUND', 404, 'not-found', LabAccessRequestError, 'never'],
  ['METHOD_NOT_ALLOWED', 405, 'not-supported', LabAccessRequestError, 'never'],
  ['NOT_ACCEPTABLE', 406, 'not-supported', LabAccessRequestError, 'never'],
  ['UNSUPPORTED_MEDIA_TYPE', 415, 'not-supported', LabAccessRequestError, 'never'],
  ['CONSENT_INVALID_SCOPES', 422, 'business-rule', LabAccessConsentError, 'never'],
  ['CONSENT_INVALID_EXPIRATION', 422, 'business-rule', LabAccessConsentError, 'never'],
  ['CONSENT_INVALID_STATE', 422, 'business-rule', LabAccessConsentError, 'never'],
  ['EXAM_NOT_AVAILABLE_AT_LOCATION', 422, 'business-rule', LabAccessSchedulingError, 'never'],
  ['SLOT_UNAVAILABLE', 409, 'conflict', LabAccessSchedulingError, 'never'],
  ['VERSION_CONFLICT', 412, 'conflict', LabAccessSchedulingError, 'after-reread'],
  ['APPOINTMENT_NOT_MODIFIABLE', 422, 'business-rule', LabAccessSchedulingError, 'never'],
  ['APPOINTMENT_FIELD_NOT_MODIFIABLE', 422, 'business-rule', LabAccessSchedulingError, 'never'],
  ['INVALID_RESOURCE', 422, 'invariant', LabAccessSchedulingError, 'never'],
  ['PATIENT_NOT_IN_CONSENT', 422, 'business-rule', LabAccessSchedulingError, 'never'],
  ['RATE_LIMITED', 429, 'throttled', LabAccessOperationalError, 'after-retry-after'],
  ['INTERNAL_ERROR', 500, 'exception', LabAccessOperationalError, 'backoff'],
  ['PROVIDER_UNAVAILABLE', 503, 'transient', LabAccessOperationalError, 'after-retry-after'],
  ['UPSTREAM_TIMEOUT', 504, 'timeout', LabAccessOperationalError, 'backoff'],
];

describe('toApiError', () => {
  it.each(TAXONOMY)('%s (%i) vira erro tipado', (code, status, issueCode, family, retry) => {
    const outcome = operationOutcome(code, issueCode);
    const error = toApiError(jsonResponse(status, outcome), 'interacao-1');

    expect(error).toBeInstanceOf(family);
    expect(error).toBeInstanceOf(LabAccessApiError);
    expect(error).toBeInstanceOf(LabAccessError);
    expect(error).toMatchObject({
      code,
      interactionId: 'interacao-1',
      issueCode,
      operationOutcome: outcome,
      retry,
      retryable: retry !== 'never',
      status,
    });
  });

  it('a tabela de códigos cobre exatamente a taxonomia da especificação', () => {
    expect(Object.keys(PROTOCOL_ERROR_CODES).sort()).toEqual(
      [...new Set(TAXONOMY.map(([code]) => code))].sort(),
    );
  });

  it('código desconhecido é tratado pelo status: 4xx não se repete, 5xx se repete com recuo', () => {
    const unknown4xx = toApiError(jsonResponse(418, operationOutcome('CODIGO_NOVO')));
    expect(unknown4xx.constructor).toBe(LabAccessApiError);
    expect(unknown4xx).toMatchObject({ code: 'CODIGO_NOVO', retry: 'never' });

    const unknown5xx = toApiError(jsonResponse(502, operationOutcome('CODIGO_NOVO')));
    expect(unknown5xx).toMatchObject({ retry: 'backoff', retryable: true });
  });

  it('aceita corpo que não é OperationOutcome ou não tem código do protocolo', () => {
    expect(toApiError({ body: '<html>', headers: {}, status: 502 })).toMatchObject({
      code: undefined,
      operationOutcome: undefined,
      retry: 'backoff',
    });
    const foreign = {
      issue: [
        {
          code: 'invalid',
          details: { coding: [{ code: 'X', system: 'urn:outro' }] },
          severity: 'error',
        },
      ],
      resourceType: 'OperationOutcome',
    };
    expect(toApiError(jsonResponse(400, foreign))).toMatchObject({
      code: undefined,
      issueCode: 'invalid',
      retry: 'never',
    });
    expect(
      toApiError(jsonResponse(400, { issue: [], resourceType: 'OperationOutcome' })),
    ).toMatchObject({
      code: undefined,
      issueCode: undefined,
    });
  });

  it('lê o código do issue que traz o sistema do protocolo, mesmo não sendo o primeiro', () => {
    const outcome = {
      issue: [
        { code: 'informational', severity: 'information' },
        ...operationOutcome('SLOT_UNAVAILABLE', 'conflict').issue,
      ],
      resourceType: 'OperationOutcome',
    };
    expect(toApiError(jsonResponse(409, outcome))).toMatchObject({
      code: 'SLOT_UNAVAILABLE',
      issueCode: 'conflict',
    });
  });

  it('guarda WWW-Authenticate e Retry-After', () => {
    const error = toApiError(
      jsonResponse(429, operationOutcome('RATE_LIMITED', 'throttled'), {
        'Retry-After': '120',
        'WWW-Authenticate': 'Bearer error="invalid_token"',
      }),
    );
    expect(error.retryAfterSeconds).toBe(120);
    expect(error.wwwAuthenticate).toBe('Bearer error="invalid_token"');

    const dated = toApiError(
      jsonResponse(503, operationOutcome('PROVIDER_UNAVAILABLE', 'transient'), {
        'retry-after': ['Wed, 21 Oct 2026 07:28:00 GMT'] as never,
      }),
    );
    expect(dated.retryAfterSeconds).toBeUndefined();
  });

  it('a mensagem não repete o texto do provedor', () => {
    const error = toApiError(
      jsonResponse(409, operationOutcome('SLOT_UNAVAILABLE', 'conflict', 'texto do provedor')),
    );
    expect(error.message).toBe('O provedor respondeu 409 com o código SLOT_UNAVAILABLE.');
  });
});

describe('toOAuthError', () => {
  const cases: [string, number, string][] = [
    ['invalid_request', 400, 'never'],
    ['invalid_client', 401, 'never'],
    ['invalid_grant', 400, 'never'],
    ['unauthorized_client', 400, 'never'],
    ['unsupported_grant_type', 400, 'never'],
    ['invalid_scope', 400, 'never'],
    ['server_error', 500, 'backoff'],
    ['temporarily_unavailable', 503, 'after-retry-after'],
  ];

  it.each(cases)('%s (%i)', (code, status, retry) => {
    const error = toOAuthError(
      jsonResponse(status, { error: code, error_description: 'detalhe' }, { 'Retry-After': '9' }),
    );
    expect(error).toBeInstanceOf(OAuthError);
    expect(error).toMatchObject({
      error: code,
      errorDescription: 'detalhe',
      retry,
      retryAfterSeconds: 9,
      status,
    });
    // error_description é texto de diagnóstico e não entra na mensagem.
    expect(error.message).not.toContain('detalhe');
  });

  it('erro OAuth desconhecido segue o status', () => {
    expect(toOAuthError(jsonResponse(400, { error: 'novo_erro' }))).toMatchObject({
      retry: 'never',
    });
    expect(
      toOAuthError(jsonResponse(502, { error: 'novo_erro', error_description: 1 })),
    ).toMatchObject({
      errorDescription: undefined,
      retry: 'backoff',
    });
  });

  it('resposta sem o formato do OAuth vira erro de API pelo status', () => {
    const error = toOAuthError({ body: 'Bad Gateway', headers: {}, status: 502 });
    expect(error).toBeInstanceOf(LabAccessApiError);
    expect(error).toMatchObject({ retry: 'backoff', status: 502 });
  });
});

describe('classes de erro', () => {
  it('guardam nome, causa e estratégia de repetição', () => {
    const cause = new Error('origem');
    const transport = new LabAccessTransportError('rede', { cause });
    expect(transport).toMatchObject({
      name: 'LabAccessTransportError',
      retry: 'backoff',
      retryable: true,
    });
    expect(transport.cause).toBe(cause);

    expect(new LabAccessConfigError('x')).toMatchObject({
      name: 'LabAccessConfigError',
      retryable: false,
    });
    expect(new RegistryVerificationError('expired', 'x', { step: 'V12' })).toMatchObject({
      reason: 'expired',
      step: 'V12',
    });
    const pending = {
      attempts: 3,
      consentId: 'c',
      lastAttemptAt: '2026-11-16T12:00:00.000Z',
      nextAttemptAt: '2026-11-16T13:00:00.000Z',
      providerId: 'p',
      reason: 'PATIENT_REQUEST' as const,
      requestedAt: '2026-11-16T12:00:00.000Z',
    };
    expect(new RevocationPendingError('c', 'p', pending)).toMatchObject({
      pending,
      retry: 'backoff',
    });
    expect(new ConsentEndedError('c', 'EXPIRED', 'MAX_DATE_REACHED', 'SYSTEM').message).toContain(
      'EXPIRED',
    );
    expect(new AuthorizationDeniedError('temporarily_unavailable', undefined, 'c')).toMatchObject({
      sameConsentReusable: true,
    });
    expect(new PatientMismatchError('c', 'p', undefined, 'pending')).toMatchObject({
      name: 'PatientMismatchError',
      retryable: false,
    });
  });
});
