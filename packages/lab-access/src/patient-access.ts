/**
 * Acesso em nível de paciente: tokens do consentimento, renovação, e as
 * chamadas de `appointment.write`, `results.read` e `consent.read`.
 */

import type {
  FHIRConsent,
  FHIRDiagnosticReport,
  FHIRObservation,
  FHIRPatient,
} from '@precisa-saude/fhir';

import {
  type AppointmentIdentifier,
  type CancelInput,
  cancelled,
  prepareAppointmentCreation,
  rescheduled,
  type RescheduleInput,
} from './appointment';
import type { ConsentRecord, RevocationReason } from './consent-types';
import { readConsent, readConsentAsPatient } from './consents';
import { PATIENT_SCOPES, type PatientScope } from './constants';
import type { ClientContext, ResolvedProvider } from './context';
import {
  ConsentEndedError,
  IssuerMismatchError,
  LabAccessApiError,
  LabAccessConfigError,
  LabAccessProtocolError,
  OAuthError,
  RefreshTokenRevokedError,
  RevocationPendingError,
  ScopeError,
  TokensDiscardedError,
} from './errors';
import {
  asResource,
  commonParams,
  type CommonSearchParams,
  fhirBase,
  fhirCall,
  type FhirEnv,
  fhirRead,
  fhirSearch,
  type ReadResult,
  repeated,
  type SearchPage,
  type SearchParam,
} from './fhir';
import type { FHIRAppointment } from './fhir-types';
import { header } from './http';
import { resolveProvider, shouldRenewToken } from './resolve';
import { revokeConsent } from './revocation';
import { assertRegistryAllowsRefresh, isFresh, requestToken } from './tokens';
import { isConsentId, isFhirId } from './validation';

/**
 * O que o aplicativo guarda, cifrado em repouso e só no backend, para retomar
 * o acesso depois. Não contém CPF.
 */
export interface PatientAccessState {
  accessToken: string;
  /** Instante, em milissegundos, em que o token de acesso deixa de ser usado. */
  accessTokenExpiresAt: number;
  /** `expiration_date_time` do consentimento, quando conhecido. */
  consentExpiresAt?: string;
  consentId: string;
  issuer: string;
  /** Id lógico do recurso Patient no provedor. */
  patientFhirId: string;
  providerId: string;
  refreshToken?: string;
  scopes: PatientScope[];
}

export interface PatientAccessOptions {
  /** Chamado quando os tokens mudam, para o aplicativo gravar o estado novo. */
  onTokensUpdated?: (state: PatientAccessState) => void;
}

export interface AppointmentSearch extends CommonSearchParams {
  date?: string | string[];
  /** `sistema|valor`. */
  identifier?: string;
  status?: string;
}

export interface DiagnosticReportSearch extends CommonSearchParams {
  code?: string;
  date?: string | string[];
  /** Traz as `Observation` junto (`_include=DiagnosticReport:result`). Padrão: `true`. */
  includeResults?: boolean;
  status?: string;
}

export interface ObservationSearch extends CommonSearchParams {
  code?: string;
  date?: string | string[];
}

export interface CreatedAppointment extends ReadResult<FHIRAppointment> {
  /** `false` quando o provedor já tinha um agendamento com o mesmo identificador. */
  created: boolean;
  /** Cabeçalho `Location` da criação. */
  location?: string;
}

const CONSENT_ENDED_CODES = ['CONSENT_EXPIRED', 'CONSENT_REVOKED'];

/** Acesso de um paciente a um provedor, ligado a um consentimento. */
export class PatientAccess {
  readonly consentId: string;
  readonly patientFhirId: string;
  readonly providerId: string;
  readonly scopes: readonly PatientScope[];

  readonly #consentExpiresAt: string | undefined;
  readonly #ctx: ClientContext;
  readonly #issuer: string;
  readonly #options: PatientAccessOptions;
  #refreshing: Promise<string> | undefined;
  #tokens: { accessToken: string; expiresAt: number; refreshToken?: string } | undefined;

  /** @internal Use `completeAuthorization` ou `resumePatientAccess`. */
  constructor(ctx: ClientContext, state: PatientAccessState, options: PatientAccessOptions = {}) {
    const patientScopes: readonly string[] = PATIENT_SCOPES;
    const valid =
      isConsentId(state?.consentId) &&
      isFhirId(state.patientFhirId) &&
      typeof state.accessToken === 'string' &&
      typeof state.accessTokenExpiresAt === 'number' &&
      Array.isArray(state.scopes) &&
      state.scopes.length > 0 &&
      state.scopes.every((scope) => patientScopes.includes(scope));
    if (!valid) {
      throw new LabAccessConfigError(
        'O estado do acesso do paciente está incompleto ou malformado.',
      );
    }
    this.#ctx = ctx;
    this.#options = options;
    this.#issuer = state.issuer;
    this.#consentExpiresAt =
      typeof state.consentExpiresAt === 'string' ? state.consentExpiresAt : undefined;
    this.consentId = state.consentId;
    this.patientFhirId = state.patientFhirId;
    this.providerId = state.providerId;
    this.scopes = [...state.scopes];
    this.#tokens = {
      accessToken: state.accessToken,
      expiresAt: state.accessTokenExpiresAt,
      refreshToken: state.refreshToken,
    };
  }

  // ── Tokens e consentimento ─────────────────────────────────────

  /** Descarta os tokens, sem chamar o provedor. */
  discard(): void {
    this.#tokens = undefined;
  }

  /** Estado a guardar para retomar o acesso. */
  exportState(): PatientAccessState {
    if (!this.#tokens) throw new TokensDiscardedError(this.consentId);
    const state: PatientAccessState = {
      accessToken: this.#tokens.accessToken,
      accessTokenExpiresAt: this.#tokens.expiresAt,
      consentId: this.consentId,
      issuer: this.#issuer,
      patientFhirId: this.patientFhirId,
      providerId: this.providerId,
      refreshToken: this.#tokens.refreshToken,
      scopes: [...this.scopes],
    };
    if (this.#consentExpiresAt !== undefined) state.consentExpiresAt = this.#consentExpiresAt;
    return state;
  }

  /** Lê o próprio consentimento pelo endpoint do protocolo. Qualquer token de paciente pode. */
  async getConsentRecord(): Promise<ConsentRecord> {
    const resolved = await this.#resolve();
    const read = await this.#run(resolved, (token) =>
      readConsentAsPatient(this.#ctx, resolved, this.consentId, token),
    );
    return read.record;
  }

  /**
   * Revoga o consentimento pelo lado do receptor.
   *
   * Os tokens são descartados antes de qualquer chamada, e continuam
   * descartados se ela falhar. A revogação usa um token de provedor só com
   * `consent.manage`, com até três tentativas automáticas. Sem confirmação,
   * ela fica pendente e o método lança `RevocationPendingError` com a
   * pendência: as repetições seguintes vêm de
   * `LabAccessClient.retryPendingRevocations`.
   */
  async revoke(reason: RevocationReason = 'PATIENT_REQUEST'): Promise<void> {
    if (!this.#tokens) return;
    this.discard();
    const result = await revokeConsent(this.#ctx, {
      consentExpiresAt: this.#consentExpiresAt,
      consentId: this.consentId,
      providerId: this.providerId,
      reason,
    });
    if (result.outcome === 'pending') {
      throw new RevocationPendingError(this.consentId, this.providerId, result.pending, {
        cause: result.error,
      });
    }
  }

  // ── appointment.write ──────────────────────────────────────────

  /** Cancela: `PUT` com `If-Match`, mudando só `status` e `cancelationReason`. */
  async cancelAppointment(input: CancelInput): Promise<ReadResult<FHIRAppointment>> {
    const { body, id } = cancelled(input);
    return this.#updateAppointment(id, body, input.etag);
  }

  /**
   * Cria o agendamento com os pedidos de exame contidos.
   *
   * A criação é condicional (`If-None-Exist` pelo identificador do receptor),
   * então pode ser repetida depois de uma falha de rede: a repetição recebe
   * 200, e o agendamento existente é lido e devolvido com `created: false`.
   */
  async createAppointment(
    appointment: FHIRAppointment,
    options: { identifier?: AppointmentIdentifier } = {},
  ): Promise<CreatedAppointment> {
    const ifNoneExist = prepareAppointmentCreation(
      appointment,
      this.patientFhirId,
      options.identifier,
    );
    const env = await this.#env('appointment.write');
    const response = await fhirCall(
      env,
      {
        body: appointment,
        headers: { 'If-None-Exist': ifNoneExist, Prefer: 'return=representation' },
        method: 'POST',
        okStatuses: [200, 201],
        url: `${fhirBase(env)}/Appointment`,
      },
      true,
    );

    if (response.status === 201) {
      return {
        ...asResource<FHIRAppointment>(response, 'Appointment'),
        created: true,
        location: header(response.response, 'location'),
      };
    }
    const existing = await fhirSearch<FHIRAppointment>(env, 'Appointment', [
      ['identifier', ifNoneExist.slice('identifier='.length)],
    ]);
    const [resource] = existing.resources;
    if (existing.resources.length !== 1 || !resource) {
      throw new LabAccessProtocolError(
        'A criação condicional respondeu 200, mas a busca pelo identificador não devolveu um agendamento único.',
      );
    }
    return { created: false, etag: undefined, resource };
  }

  async readAppointment(id: string): Promise<ReadResult<FHIRAppointment>> {
    return fhirRead(await this.#env('appointment.write'), 'Appointment', id);
  }

  /** Remarca: `PUT` com `If-Match`, trocando só `slot`, `start` e `end`. */
  async rescheduleAppointment(input: RescheduleInput): Promise<ReadResult<FHIRAppointment>> {
    const { body, id } = rescheduled(input);
    return this.#updateAppointment(id, body, input.etag);
  }

  async searchAppointments(params: AppointmentSearch = {}): Promise<SearchPage<FHIRAppointment>> {
    const query: SearchParam[] = [
      ['patient', this.patientFhirId],
      ['status', params.status],
      ...repeated('date', params.date),
      ['identifier', params.identifier],
      ...commonParams(params),
    ];
    return fhirSearch(await this.#env('appointment.write'), 'Appointment', query);
  }

  // ── results.read ───────────────────────────────────────────────

  async readDiagnosticReport(id: string): Promise<ReadResult<FHIRDiagnosticReport>> {
    return fhirRead(await this.#env('results.read'), 'DiagnosticReport', id);
  }

  async readObservation(id: string): Promise<ReadResult<FHIRObservation>> {
    return fhirRead(await this.#env('results.read'), 'Observation', id);
  }

  /** Busca laudos do paciente do consentimento. */
  async searchDiagnosticReports(
    params: DiagnosticReportSearch = {},
  ): Promise<SearchPage<FHIRDiagnosticReport>> {
    const [lastUpdated, count] = splitCommon(params);
    const query: SearchParam[] = [
      ['patient', this.patientFhirId],
      ...lastUpdated,
      ...repeated('date', params.date),
      ['status', params.status],
      ['code', params.code],
      ['_include', params.includeResults === false ? undefined : 'DiagnosticReport:result'],
      ...count,
    ];
    return fhirSearch(await this.#env('results.read'), 'DiagnosticReport', query);
  }

  async searchObservations(params: ObservationSearch = {}): Promise<SearchPage<FHIRObservation>> {
    const query: SearchParam[] = [
      ['patient', this.patientFhirId],
      ['code', params.code],
      ...repeated('date', params.date),
      ...commonParams(params),
    ];
    return fhirSearch(await this.#env('results.read'), 'Observation', query);
  }

  // ── Paciente e consent.read ────────────────────────────────────

  /** Lê um registro de consentimento na visão FHIR. */
  async readConsent(id: string): Promise<ReadResult<FHIRConsent>> {
    return fhirRead(await this.#env('consent.read'), 'Consent', id);
  }

  /** Lê o recurso Patient do paciente do consentimento. Não há leitura de outro paciente. */
  async readPatient(): Promise<ReadResult<FHIRPatient>> {
    return fhirRead(await this.#env(undefined), 'Patient', this.patientFhirId);
  }

  /** Busca os registros de consentimento entre este paciente e este receptor. */
  async searchConsents(
    params: CommonSearchParams & { status?: string } = {},
  ): Promise<SearchPage<FHIRConsent>> {
    const query: SearchParam[] = [
      ['patient', this.patientFhirId],
      ['status', params.status],
      ...commonParams(params),
    ];
    return fhirSearch(await this.#env('consent.read'), 'Consent', query);
  }

  // ── Interno ────────────────────────────────────────────────────

  async #accessToken(resolved: ResolvedProvider, force = false): Promise<string> {
    if (!this.#tokens) throw new TokensDiscardedError(this.consentId);
    if (!force && isFresh(this.#tokens.expiresAt, this.#ctx.now())) return this.#tokens.accessToken;
    this.#refreshing ??= this.#refresh(resolved).finally(() => {
      this.#refreshing = undefined;
    });
    return this.#refreshing;
  }

  /**
   * O consentimento pode ter saído de `AUTHORISED`. Os tokens são descartados,
   * o estado é lido com um token de provedor e vira erro tipado.
   */
  async #consentEnded(resolved: ResolvedProvider, original?: unknown): Promise<never> {
    this.discard();
    const record = await readConsent(this.#ctx, resolved, this.consentId);
    if (record.status !== 'AUTHORISED') {
      throw new ConsentEndedError(
        this.consentId,
        record.status,
        record.statusReason?.code,
        record.statusReason?.endedVia,
      );
    }
    throw original ?? new RefreshTokenRevokedError(this.consentId);
  }

  async #env(scope: PatientScope | undefined): Promise<FhirEnv> {
    if (scope !== undefined && !this.scopes.includes(scope)) {
      throw new ScopeError(`O consentimento não inclui o escopo ${scope}.`);
    }
    if (!this.#tokens) throw new TokensDiscardedError(this.consentId);
    const resolved = await this.#resolve();
    return {
      consentId: this.consentId,
      ctx: this.#ctx,
      resolved,
      run: (call) => this.#run(resolved, call),
    };
  }

  async #refresh(resolved: ResolvedProvider): Promise<string> {
    const refreshToken = this.#tokens?.refreshToken;
    if (refreshToken === undefined) return this.#consentEnded(resolved);
    assertRegistryAllowsRefresh(this.#ctx);

    let issued;
    try {
      issued = await requestToken(
        this.#ctx,
        resolved,
        { grant_type: 'refresh_token', refresh_token: refreshToken },
        true,
      );
    } catch (error) {
      if (error instanceof OAuthError && error.error === 'invalid_grant') {
        return this.#consentEnded(resolved);
      }
      throw error;
    }
    if (!this.#tokens) throw new TokensDiscardedError(this.consentId);

    // O servidor normalmente não troca o refresh token. Se vier um novo, ele passa a valer.
    this.#tokens = {
      accessToken: issued.accessToken,
      expiresAt: issued.expiresAt,
      refreshToken: issued.refreshToken ?? refreshToken,
    };
    this.#options.onTokensUpdated?.(this.exportState());
    return issued.accessToken;
  }

  async #resolve(): Promise<ResolvedProvider> {
    const resolved = await resolveProvider(this.#ctx, this.providerId);
    if (resolved.endpoints.issuer !== this.#issuer) {
      throw new IssuerMismatchError(
        'registry',
        'O issuer do provedor mudou: os tokens do servidor de autorização anterior não migram.',
      );
    }
    return resolved;
  }

  /** Executa com o token de paciente. Diante de 401, renova uma vez e repete. */
  async #run<R>(resolved: ResolvedProvider, call: (token: string) => Promise<R>): Promise<R> {
    const token = await this.#accessToken(resolved);
    try {
      return await call(token);
    } catch (error) {
      if (isConsentEnded(error)) return this.#consentEnded(resolved, error);
      if (!shouldRenewToken(error)) throw error;
    }
    // O consentimento pode acabar entre a renovação e a chamada repetida.
    const renewed = await this.#accessToken(resolved, true);
    try {
      return await call(renewed);
    } catch (error) {
      if (isConsentEnded(error)) return this.#consentEnded(resolved, error);
      throw error;
    }
  }

  async #updateAppointment(
    id: string,
    body: FHIRAppointment,
    etag: string,
  ): Promise<ReadResult<FHIRAppointment>> {
    const env = await this.#env('appointment.write');
    // Repetir o PUT com o mesmo If-Match é seguro: se a primeira tentativa foi
    // aplicada, a segunda recebe 412.
    const response = await fhirCall(
      env,
      {
        body,
        headers: { 'If-Match': etag, Prefer: 'return=representation' },
        method: 'PUT',
        okStatuses: [200],
        url: `${fhirBase(env)}/Appointment/${id}`,
      },
      true,
    );
    return asResource<FHIRAppointment>(response, 'Appointment');
  }
}

/** 401 em que o provedor diz que o consentimento expirou ou foi revogado. */
function isConsentEnded(error: unknown): boolean {
  return (
    error instanceof LabAccessApiError &&
    error.status === 401 &&
    CONSENT_ENDED_CODES.includes(error.code ?? '')
  );
}

/** Separa `_lastUpdated` de `_count`, para manter a ordem dos parâmetros da especificação. */
function splitCommon(params: CommonSearchParams): [SearchParam[], SearchParam[]] {
  return [
    commonParams({ lastUpdatedAfter: params.lastUpdatedAfter }),
    commonParams({ count: params.count }),
  ];
}
