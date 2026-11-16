/**
 * Operações em nível de provedor: catálogo, unidades, agenda, consentimentos
 * e a jornada de autorização.
 */

import type { ConsentRecord, CreateConsentInput, RevocationReason } from './consent-types';
import { buildConsentBody, createConsent, readConsent } from './consents';
import { type ProviderScope, SLOT_SEARCH_MAX_WINDOW_DAYS } from './constants';
import type { ClientContext } from './context';
import { IssuerMismatchError, LabAccessConfigError, RevocationPendingError } from './errors';
import {
  asResource,
  commonParams,
  type CommonSearchParams,
  fhirBase,
  type FhirEnv,
  fhirRead,
  fhirSearch,
  type ReadResult,
  repeated,
  type SearchPage,
  type SearchParam,
} from './fhir';
import type {
  FHIRActivityDefinition,
  FHIRCapabilityStatement,
  FHIRChargeItemDefinition,
  FHIRHealthcareService,
  FHIRLocation,
  FHIRSchedule,
  FHIRSlot,
} from './fhir-types';
import { apiRequest, withRetry } from './http';
import {
  type AuthorizationCallback,
  type AuthorizationJourney,
  completeAuthorization,
  startAuthorization,
  type StartAuthorizationInput,
} from './journey';
import {
  PatientAccess,
  type PatientAccessOptions,
  type PatientAccessState,
} from './patient-access';
import { resolveProvider, withProviderToken } from './resolve';
import { revokeConsent } from './revocation';
import { toReference } from './validation';

export interface ActivityDefinitionSearch extends CommonSearchParams {
  status?: string;
  title?: string;
  url?: string;
}

export interface ChargeItemDefinitionSearch extends CommonSearchParams {
  effective?: string | string[];
  /** Município, no formato `sistema|código`. */
  jurisdiction?: string;
  status?: string;
  url?: string;
}

export interface LocationSearch extends CommonSearchParams {
  addressCity?: string;
  addressPostalCode?: string;
  addressState?: string;
  near?: string;
  status?: string;
}

export interface HealthcareServiceSearch extends CommonSearchParams {
  active?: boolean;
  /** Unidade: id ou referência `Location/id`. */
  location: string;
}

export interface ScheduleSearch extends CommonSearchParams {
  active?: boolean;
  /** Unidade: id ou referência `Location/id`. */
  location: string;
}

export interface SlotSearch extends CommonSearchParams {
  /** Agenda: id ou referência `Schedule/id`. Obrigatória. */
  schedule: string;
  /** Um código por exame da cesta. O provedor devolve só horários que atendem a todos. */
  serviceTypes?: readonly { code: string; system: string }[];
  /** Janela da busca, de no máximo 31 dias: `start >= from` e `start < to`. */
  start: { from: string; to: string };
  status?: string;
}

export interface CompleteAuthorizationInput extends PatientAccessOptions {
  /** O retorno recebido no `redirect_uri`: a URL completa ou os parâmetros. */
  callback: AuthorizationCallback;
  /**
   * CPF do paciente que iniciou a jornada no aplicativo, com ou sem pontuação.
   * Fica no backend: não é enviado ao provedor em nenhum passo.
   */
  expectedCpf: string;
  journey: AuthorizationJourney;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function slotWindow(start: SlotSearch['start'] | undefined): SearchParam[] {
  const from = Date.parse(start?.from ?? '');
  const to = Date.parse(start?.to ?? '');
  if (Number.isNaN(from) || Number.isNaN(to)) {
    throw new LabAccessConfigError('A busca de horários exige os dois limites de start.');
  }
  if (to <= from || to - from > SLOT_SEARCH_MAX_WINDOW_DAYS * DAY_MS) {
    throw new LabAccessConfigError('A janela de start deveria ter de 1 instante a 31 dias.');
  }
  return [
    ['start', `ge${start!.from}`],
    ['start', `lt${start!.to}`],
  ];
}

/** Acesso a um provedor do registro. Criado por `LabAccessClient.provider`. */
export class ProviderAccess {
  /** @internal */
  constructor(
    private readonly ctx: ClientContext,
    readonly providerId: string,
  ) {}

  // ── Consentimento e jornada ────────────────────────────────────

  /** Conclui a jornada e devolve o acesso do paciente, já com o titular conferido. */
  async completeAuthorization(input: CompleteAuthorizationInput): Promise<PatientAccess> {
    const resolved = await resolveProvider(this.ctx, this.providerId);
    const { consentExpiresAt, patientFhirId, tokens } = await completeAuthorization(
      this.ctx,
      resolved,
      input.journey,
      input.callback,
      input.expectedCpf,
    );
    return new PatientAccess(
      this.ctx,
      {
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.expiresAt,
        consentExpiresAt,
        consentId: input.journey.consentId,
        issuer: input.journey.issuer,
        patientFhirId,
        providerId: this.providerId,
        refreshToken: tokens.refreshToken,
        scopes: [...input.journey.scopes],
      },
      { onTokensUpdated: input.onTokensUpdated },
    );
  }

  /** Cria um consentimento. A criação não identifica o paciente. */
  async createConsent(input: CreateConsentInput): Promise<ConsentRecord> {
    const body = buildConsentBody(input, this.ctx.now());
    return createConsent(this.ctx, await resolveProvider(this.ctx, this.providerId), body);
  }

  /** Lê o estado de um consentimento com um token de provedor. */
  async getConsent(consentId: string): Promise<ConsentRecord> {
    return readConsent(this.ctx, await resolveProvider(this.ctx, this.providerId), consentId);
  }

  /** Retoma um acesso de paciente a partir do estado guardado pelo aplicativo. */
  resumePatientAccess(
    state: PatientAccessState,
    options: PatientAccessOptions = {},
  ): PatientAccess {
    if (state?.providerId !== this.providerId) {
      throw new LabAccessConfigError('O estado guardado pertence a outro provedor.');
    }
    const provider = this.ctx.registry().getProvider(this.providerId);
    if (state.issuer !== provider.provider.issuer) {
      throw new IssuerMismatchError(
        'registry',
        'O issuer do provedor mudou: os tokens do servidor de autorização anterior não migram.',
      );
    }
    return new PatientAccess(this.ctx, state, options);
  }

  /**
   * Revoga um consentimento pelo lado do receptor, com até três tentativas
   * automáticas. 404 `CONSENT_NOT_FOUND` e 422 `CONSENT_INVALID_STATE` contam
   * como revogação concluída. Sem confirmação, a revogação fica pendente e o
   * método lança `RevocationPendingError` com a pendência.
   *
   * `consentExpiresAt`, quando informado, encerra a pendência ao passar.
   */
  async revokeConsent(
    consentId: string,
    reason: RevocationReason = 'PATIENT_REQUEST',
    options: { consentExpiresAt?: string } = {},
  ): Promise<void> {
    const result = await revokeConsent(this.ctx, {
      consentExpiresAt: options.consentExpiresAt,
      consentId,
      providerId: this.providerId,
      reason,
    });
    if (result.outcome === 'pending') {
      throw new RevocationPendingError(consentId, this.providerId, result.pending, {
        cause: result.error,
      });
    }
  }

  /** Abre a jornada: envia a requisição por PAR e devolve a URL de autorização. */
  async startAuthorization(input: StartAuthorizationInput): Promise<AuthorizationJourney> {
    return startAuthorization(this.ctx, await resolveProvider(this.ctx, this.providerId), input);
  }

  // ── catalog.read ───────────────────────────────────────────────

  async readActivityDefinition(id: string): Promise<ReadResult<FHIRActivityDefinition>> {
    return fhirRead(await this.env('catalog.read'), 'ActivityDefinition', id);
  }

  async readChargeItemDefinition(id: string): Promise<ReadResult<FHIRChargeItemDefinition>> {
    return fhirRead(await this.env('catalog.read'), 'ChargeItemDefinition', id);
  }

  async searchActivityDefinitions(
    params: ActivityDefinitionSearch = {},
  ): Promise<SearchPage<FHIRActivityDefinition>> {
    const query: SearchParam[] = [
      ['status', params.status],
      ['url', params.url],
      ['title', params.title],
      ...commonParams(params),
    ];
    return fhirSearch(await this.env('catalog.read'), 'ActivityDefinition', query);
  }

  async searchChargeItemDefinitions(
    params: ChargeItemDefinitionSearch = {},
  ): Promise<SearchPage<FHIRChargeItemDefinition>> {
    const query: SearchParam[] = [
      ['status', params.status],
      ['url', params.url],
      ['jurisdiction', params.jurisdiction],
      ...repeated('effective', params.effective),
      ...commonParams(params),
    ];
    return fhirSearch(await this.env('catalog.read'), 'ChargeItemDefinition', query);
  }

  // ── locations.read ─────────────────────────────────────────────

  async readHealthcareService(id: string): Promise<ReadResult<FHIRHealthcareService>> {
    return fhirRead(await this.env('locations.read'), 'HealthcareService', id);
  }

  async readLocation(id: string): Promise<ReadResult<FHIRLocation>> {
    return fhirRead(await this.env('locations.read'), 'Location', id);
  }

  async searchHealthcareServices(
    params: HealthcareServiceSearch,
  ): Promise<SearchPage<FHIRHealthcareService>> {
    const query: SearchParam[] = [
      ['location', toReference('Location', params?.location)],
      ['active', params.active],
      ...commonParams(params),
    ];
    return fhirSearch(await this.env('locations.read'), 'HealthcareService', query);
  }

  async searchLocations(params: LocationSearch = {}): Promise<SearchPage<FHIRLocation>> {
    const query: SearchParam[] = [
      ['status', params.status],
      ['address-city', params.addressCity],
      ['address-state', params.addressState],
      ['address-postalcode', params.addressPostalCode],
      ['near', params.near],
      ...commonParams(params),
    ];
    return fhirSearch(await this.env('locations.read'), 'Location', query);
  }

  // ── schedule.read ──────────────────────────────────────────────

  async readSchedule(id: string): Promise<ReadResult<FHIRSchedule>> {
    return fhirRead(await this.env('schedule.read'), 'Schedule', id);
  }

  async readSlot(id: string): Promise<ReadResult<FHIRSlot>> {
    return fhirRead(await this.env('schedule.read'), 'Slot', id);
  }

  async searchSchedules(params: ScheduleSearch): Promise<SearchPage<FHIRSchedule>> {
    const query: SearchParam[] = [
      ['actor', toReference('Location', params?.location)],
      ['active', params.active],
      ...commonParams(params),
    ];
    return fhirSearch(await this.env('schedule.read'), 'Schedule', query);
  }

  /**
   * Busca horários. A busca não leva dado de paciente: só agenda, janela,
   * estado e os códigos dos exames da cesta.
   */
  async searchSlots(params: SlotSearch): Promise<SearchPage<FHIRSlot>> {
    const serviceTypes = (params?.serviceTypes ?? []).map(({ code, system }) => {
      if (!code || !system) {
        throw new LabAccessConfigError('Cada exame da cesta deveria ter system e code.');
      }
      return `${system}|${code}`;
    });
    const query: SearchParam[] = [
      ['schedule', toReference('Schedule', params?.schedule)],
      ...slotWindow(params.start),
      ['status', params.status],
      ...repeated('service-type', serviceTypes),
      ...commonParams(params),
    ];
    return fhirSearch(await this.env('schedule.read'), 'Slot', query);
  }

  // ── Capacidades ────────────────────────────────────────────────

  /** `GET /metadata`. Exige mTLS e não exige token. */
  async getCapabilityStatement(): Promise<FHIRCapabilityStatement> {
    const resolved = await resolveProvider(this.ctx, this.providerId);
    const env: FhirEnv = { ctx: this.ctx, resolved, run: (call) => call('') };
    const response = await withRetry(this.ctx, true, () =>
      apiRequest(this.ctx, {
        accept: 'fhir',
        method: 'GET',
        okStatuses: [200],
        providerId: this.providerId,
        url: `${fhirBase(env)}/metadata`,
      }),
    );
    return asResource<FHIRCapabilityStatement>(response, 'CapabilityStatement').resource;
  }

  private async env(scope: ProviderScope): Promise<FhirEnv> {
    const resolved = await resolveProvider(this.ctx, this.providerId);
    return {
      ctx: this.ctx,
      resolved,
      run: (call) => withProviderToken(this.ctx, resolved, scope, call),
    };
  }
}
