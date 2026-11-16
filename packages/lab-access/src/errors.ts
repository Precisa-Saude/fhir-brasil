/**
 * Erros tipados do cliente.
 *
 * Nenhuma mensagem ou propriedade carrega token, CPF ou conteúdo de resultado.
 */

import type { ConsentEndedVia, ConsentStatus, ConsentStatusReasonCode } from './consent-types';
import type { FHIROperationOutcome } from './fhir-types';

/**
 * O que precisa acontecer para a mesma requisição ter chance de sucesso.
 *
 * - `never`: repetir sem mudar nada não adianta.
 * - `after-token-refresh`: renovar o token de acesso e repetir.
 * - `after-reread`: ler o recurso de novo e repetir com a versão atual.
 * - `after-retry-after`: esperar ao menos o `Retry-After` indicado.
 * - `backoff`: repetir com recuo exponencial.
 */
export type RetryStrategy =
  | 'after-reread'
  | 'after-retry-after'
  | 'after-token-refresh'
  | 'backoff'
  | 'never';

export interface LabAccessErrorOptions {
  cause?: unknown;
  retry?: RetryStrategy;
}

export class LabAccessError extends Error {
  readonly retry: RetryStrategy;

  constructor(message: string, options: LabAccessErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'LabAccessError';
    this.retry = options.retry ?? 'never';
  }

  /** `true` quando a mesma chamada pode ter sucesso mais tarde. */
  get retryable(): boolean {
    return this.retry !== 'never';
  }
}

/** Configuração ou argumento inválido: erro de quem chama o pacote. */
export class LabAccessConfigError extends LabAccessError {
  constructor(message: string, options?: LabAccessErrorOptions) {
    super(message, options);
    this.name = 'LabAccessConfigError';
  }
}

/** Falha de rede ou de TLS antes de haver resposta HTTP. */
export class LabAccessTransportError extends LabAccessError {
  constructor(message: string, options: LabAccessErrorOptions = {}) {
    super(message, { retry: 'backoff', ...options });
    this.name = 'LabAccessTransportError';
  }
}

/** Resposta do provedor que não tem o formato que o protocolo define. */
export class LabAccessProtocolError extends LabAccessError {
  constructor(message: string, options?: LabAccessErrorOptions) {
    super(message, options);
    this.name = 'LabAccessProtocolError';
  }
}

export type RegistryRejectionReason =
  | 'expired'
  | 'invalid-key-id'
  | 'invalid-schema'
  | 'invalid-signature'
  | 'invalid-validity'
  | 'issued-in-future'
  | 'malformed-signature'
  | 'sequence-conflict'
  | 'stale-sequence'
  | 'unknown-key';

/** O candidato a registro foi recusado. O documento atual continua valendo. */
export class RegistryVerificationError extends LabAccessError {
  constructor(
    readonly reason: RegistryRejectionReason,
    message: string,
    options?: LabAccessErrorOptions,
  ) {
    super(message, options);
    this.name = 'RegistryVerificationError';
  }
}

/** O registro em uso passou de `expires_at` e a operação não é mais permitida. */
export class RegistryExpiredError extends LabAccessError {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryExpiredError';
  }
}

export type ProviderUnavailableReason =
  | 'no-common-version'
  | 'not-active'
  | 'not-a-provider'
  | 'not-found';

/** O provedor não pode ser usado: ausente, inativo ou sem versão em comum. */
export class ProviderUnavailableError extends LabAccessError {
  constructor(
    readonly reason: ProviderUnavailableReason,
    message: string,
  ) {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

/** O documento de metadados do servidor de autorização não serve ao protocolo. */
export class ProviderMetadataError extends LabAccessError {
  constructor(message: string, options?: LabAccessErrorOptions) {
    super(message, options);
    this.name = 'ProviderMetadataError';
  }
}

/** O `issuer` recebido não é o do provedor esperado. */
export class IssuerMismatchError extends LabAccessError {
  constructor(
    readonly context: 'authorization-response' | 'metadata' | 'registry',
    message: string,
  ) {
    super(message);
    this.name = 'IssuerMismatchError';
  }
}

/** O `state` do retorno não é o da jornada. */
export class StateMismatchError extends LabAccessError {
  constructor() {
    super('O state da resposta de autorização não é o enviado no PAR desta jornada.');
    this.name = 'StateMismatchError';
  }
}

/** O retorno da autorização está malformado (sem `code`, parâmetro repetido). */
export class AuthorizationResponseError extends LabAccessError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationResponseError';
  }
}

/**
 * O servidor de autorização devolveu `error` no redirecionamento.
 *
 * Com `access_denied` o consentimento foi a `REJECTED`. Com `server_error` e
 * `temporarily_unavailable` ele segue aguardando, e `sameConsentReusable`
 * indica que um novo PAR com o mesmo consentimento é permitido.
 */
export class AuthorizationDeniedError extends LabAccessError {
  readonly sameConsentReusable: boolean;

  constructor(
    readonly error: string,
    readonly errorDescription: string | undefined,
    readonly consentId: string,
  ) {
    super(`A autorização terminou com o erro OAuth "${error}".`);
    this.name = 'AuthorizationDeniedError';
    this.sameConsentReusable = error === 'server_error' || error === 'temporarily_unavailable';
  }
}

/** Erro JSON do OAuth vindo do PAR, do endpoint de token ou da revogação. */
export class OAuthError extends LabAccessError {
  constructor(
    readonly error: string,
    readonly errorDescription: string | undefined,
    readonly status: number,
    retry: RetryStrategy,
    readonly retryAfterSeconds?: number,
  ) {
    super(`O servidor de autorização respondeu ${status} com o erro "${error}".`, { retry });
    this.name = 'OAuthError';
  }
}

export interface LabAccessApiErrorDetails {
  /** Código do protocolo em `issue.details.coding`, quando presente. */
  code?: string;
  interactionId?: string;
  /** Código `IssueType` do FHIR. */
  issueCode?: string;
  operationOutcome?: FHIROperationOutcome;
  retry: RetryStrategy;
  retryAfterSeconds?: number;
  status: number;
  wwwAuthenticate?: string;
}

/** Erro HTTP dos endpoints de consentimento ou da API FHIR. */
export class LabAccessApiError extends LabAccessError {
  readonly code?: string;
  readonly interactionId?: string;
  readonly issueCode?: string;
  readonly operationOutcome?: FHIROperationOutcome;
  readonly retryAfterSeconds?: number;
  readonly status: number;
  readonly wwwAuthenticate?: string;

  constructor(details: LabAccessApiErrorDetails) {
    super(
      `O provedor respondeu ${details.status}${details.code ? ` com o código ${details.code}` : ''}.`,
      { retry: details.retry },
    );
    this.name = 'LabAccessApiError';
    this.code = details.code;
    this.interactionId = details.interactionId;
    this.issueCode = details.issueCode;
    this.operationOutcome = details.operationOutcome;
    this.retryAfterSeconds = details.retryAfterSeconds;
    this.status = details.status;
    this.wwwAuthenticate = details.wwwAuthenticate;
  }
}

/** Seção 6.3.1: token, certificado, escopo, consentimento encerrado. */
export class LabAccessAuthorizationError extends LabAccessApiError {
  constructor(details: LabAccessApiErrorDetails) {
    super(details);
    this.name = 'LabAccessAuthorizationError';
  }
}

/** Seção 6.3.2: requisição malformada, recurso inexistente, método ou mídia. */
export class LabAccessRequestError extends LabAccessApiError {
  constructor(details: LabAccessApiErrorDetails) {
    super(details);
    this.name = 'LabAccessRequestError';
  }
}

/** Seção 6.3.3: regras de negócio do consentimento. */
export class LabAccessConsentError extends LabAccessApiError {
  constructor(details: LabAccessApiErrorDetails) {
    super(details);
    this.name = 'LabAccessConsentError';
  }
}

/** Seção 6.3.4: agenda e agendamento. */
export class LabAccessSchedulingError extends LabAccessApiError {
  constructor(details: LabAccessApiErrorDetails) {
    super(details);
    this.name = 'LabAccessSchedulingError';
  }
}

/** Seção 6.3.5: limite de chamadas e falhas do provedor. */
export class LabAccessOperationalError extends LabAccessApiError {
  constructor(details: LabAccessApiErrorDetails) {
    super(details);
    this.name = 'LabAccessOperationalError';
  }
}

/** O escopo pedido não pode ser usado nesta chamada. */
export class ScopeError extends LabAccessError {
  constructor(message: string) {
    super(message);
    this.name = 'ScopeError';
  }
}

/** Os tokens deste acesso foram descartados e não há como usá-lo. */
export class TokensDiscardedError extends LabAccessError {
  constructor(readonly consentId: string) {
    super('Os tokens deste consentimento foram descartados.');
    this.name = 'TokensDiscardedError';
  }
}

/**
 * Situação da revogação enviada pelo receptor.
 *
 * `pending` quer dizer que o `DELETE` não foi confirmado: o aplicativo trata o
 * consentimento como encerrado e repete a revogação até conseguir.
 */
export type RevocationOutcome = 'confirmed' | 'pending';

/**
 * Divergência de titular (`PATIENT_MISMATCH`): quem se autenticou no
 * laboratório não é o paciente que iniciou a jornada.
 *
 * O erro carrega só o que o registro de auditoria pede: o consentimento e o
 * `x-fapi-interaction-id` da leitura. Nenhum dos dois CPFs.
 */
export class PatientMismatchError extends LabAccessError {
  constructor(
    readonly consentId: string,
    readonly providerId: string,
    readonly interactionId: string | undefined,
    readonly revocation: RevocationOutcome,
  ) {
    super(
      'Quem se autenticou no laboratório não é o paciente desta jornada. O vínculo não foi concluído.',
    );
    this.name = 'PatientMismatchError';
  }
}

/** A conferência do titular não pôde ser concluída e o vínculo foi desfeito. */
export class HolderVerificationError extends LabAccessError {
  constructor(
    readonly consentId: string,
    readonly providerId: string,
    readonly revocation: RevocationOutcome,
    options?: LabAccessErrorOptions,
  ) {
    super('Não foi possível conferir o titular do consentimento. O vínculo não foi concluído.', {
      cause: options?.cause,
    });
    this.name = 'HolderVerificationError';
  }
}

/** O consentimento saiu de `AUTHORISED`. Só um novo consentimento devolve o acesso. */
export class ConsentEndedError extends LabAccessError {
  constructor(
    readonly consentId: string,
    readonly status: ConsentStatus,
    readonly reasonCode?: ConsentStatusReasonCode | string,
    readonly endedVia?: ConsentEndedVia | string,
  ) {
    super(`O consentimento está em ${status}.`);
    this.name = 'ConsentEndedError';
  }
}

/**
 * O consentimento segue `AUTHORISED`, mas o refresh token foi recusado: ele
 * foi revogado isoladamente. Só um novo consentimento devolve o acesso.
 */
export class RefreshTokenRevokedError extends LabAccessError {
  constructor(readonly consentId: string) {
    super('O refresh token foi recusado e o consentimento segue autorizado.');
    this.name = 'RefreshTokenRevokedError';
  }
}

/** A revogação não foi confirmada pelo provedor. Os tokens já foram descartados. */
export class RevocationPendingError extends LabAccessError {
  constructor(
    readonly consentId: string,
    readonly providerId: string,
    options?: LabAccessErrorOptions,
  ) {
    super(
      'A revogação não foi confirmada pelo provedor. Os tokens foram descartados e a revogação precisa ser repetida.',
      { cause: options?.cause, retry: 'backoff' },
    );
    this.name = 'RevocationPendingError';
  }
}

/** O próprio receptor não está `active` no registro. */
export class ReceiverStatusError extends LabAccessError {
  constructor(readonly status: string) {
    super(`O receptor está ${status} no registro e não chama provedores nessa situação.`);
    this.name = 'ReceiverStatusError';
  }
}
