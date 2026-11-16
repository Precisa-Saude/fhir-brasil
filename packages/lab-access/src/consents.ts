/**
 * Endpoints de consentimento (seção 5.4): criar, consultar e revogar.
 */

import {
  CONSENT_STATUSES,
  type ConsentDataPeriod,
  type ConsentRecord,
  type ConsentStatus,
  type CreateConsentInput,
  REVOCATION_REASONS,
  type RevocationReason,
} from './consent-types';
import { CONSENT_MAX_MONTHS, PATIENT_SCOPES } from './constants';
import type { ClientContext, ResolvedProvider } from './context';
import { LabAccessApiError, LabAccessConfigError, LabAccessProtocolError } from './errors';
import { apiRequest, withRetry } from './http';
import { assertScopeUsable, withProviderToken } from './resolve';
import { assertConsentId, baseUrl, isConsentId } from './validation';

const UTC_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function consentUrl(resolved: ResolvedProvider, consentId?: string): string {
  const base = `${baseUrl(resolved.provider.provider.api_base_url)}/consents`;
  return consentId === undefined ? base : `${base}/${encodeURIComponent(consentId)}`;
}

/** Data e hora em UTC, com sufixo `Z` e sem fração de segundo. */
function protocolDateTime(value: Date | string): { instant: number; text: string } {
  const date = value instanceof Date ? value : undefined;
  if (date === undefined && (typeof value !== 'string' || !UTC_DATE_TIME.test(value))) {
    throw new LabAccessConfigError(
      'A data de expiração deveria ser um Date ou um texto como 2027-05-15T03:00:00Z.',
    );
  }
  const instant = date ? date.getTime() : Date.parse(value as string);
  if (Number.isNaN(instant)) {
    throw new LabAccessConfigError('A data de expiração não é uma data válida.');
  }
  return { instant, text: new Date(instant).toISOString().replace(/\.\d{3}Z$/, 'Z') };
}

function addMonths(date: Date, months: number): number {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result.getTime();
}

function dataPeriodBody(period: ConsentDataPeriod | undefined): ConsentDataPeriod | undefined {
  if (period === undefined) return undefined;
  const body: ConsentDataPeriod = {};
  for (const key of ['start', 'end'] as const) {
    const value = period[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !DATE.test(value)) {
      throw new LabAccessConfigError(`data_period.${key} deveria ser uma data AAAA-MM-DD.`);
    }
    body[key] = value;
  }
  if (body.start !== undefined && body.end !== undefined && body.end < body.start) {
    throw new LabAccessConfigError('data_period.end não pode ser anterior a data_period.start.');
  }
  return body;
}

/**
 * Monta o corpo de `POST /consents` campo a campo.
 *
 * Só os quatro campos da seção 5.4.1 saem daqui. Qualquer outra propriedade
 * do objeto recebido é ignorada, o que garante que a criação não identifica o
 * paciente.
 */
export function buildConsentBody(input: CreateConsentInput, now: Date): Record<string, unknown> {
  const scopes = Array.isArray(input.scopes) ? [...input.scopes] : [];
  const patientScopes: readonly string[] = PATIENT_SCOPES;
  if (
    scopes.length === 0 ||
    new Set(scopes).size !== scopes.length ||
    !scopes.every((scope) => patientScopes.includes(scope))
  ) {
    throw new LabAccessConfigError(
      'scopes deveria listar um ou mais escopos de paciente, sem repetição.',
    );
  }
  if (
    typeof input.purpose !== 'string' ||
    input.purpose.length < 10 ||
    input.purpose.length > 300
  ) {
    throw new LabAccessConfigError('purpose deveria ter de 10 a 300 caracteres.');
  }
  const expiration = protocolDateTime(input.expirationDateTime);
  if (expiration.instant <= now.getTime()) {
    throw new LabAccessConfigError('A data de expiração deveria estar no futuro.');
  }
  if (expiration.instant > addMonths(now, CONSENT_MAX_MONTHS)) {
    throw new LabAccessConfigError('A data de expiração deveria ficar a no máximo 12 meses.');
  }

  const body: Record<string, unknown> = {
    expiration_date_time: expiration.text,
    purpose: input.purpose,
    scopes,
  };
  const dataPeriod = dataPeriodBody(input.dataPeriod);
  if (dataPeriod !== undefined) body.data_period = dataPeriod;
  return body;
}

function requireText(source: Record<string, unknown>, field: string): string {
  const value = source[field];
  if (typeof value !== 'string') {
    throw new LabAccessProtocolError(`O consentimento devolvido não traz ${field}.`);
  }
  return value;
}

/**
 * Converte a resposta do provedor. Campos desconhecidos são ignorados, e o
 * bloco `patient` nunca passa daqui.
 */
export function toConsentRecord(json: unknown): ConsentRecord {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) {
    throw new LabAccessProtocolError('O consentimento devolvido não é um objeto JSON.');
  }
  const source = json as Record<string, unknown>;
  if (!isConsentId(source.consent_id)) {
    throw new LabAccessProtocolError('O consentimento devolvido não traz consent_id válido.');
  }
  if (!CONSENT_STATUSES.includes(source.status as ConsentStatus)) {
    throw new LabAccessProtocolError('O consentimento devolvido traz um estado desconhecido.');
  }
  if (!Array.isArray(source.scopes) || !source.scopes.every((s) => typeof s === 'string')) {
    throw new LabAccessProtocolError('O consentimento devolvido não traz scopes.');
  }

  const record: ConsentRecord = {
    consentId: source.consent_id,
    creationDateTime: requireText(source, 'creation_date_time'),
    expirationDateTime: requireText(source, 'expiration_date_time'),
    purpose: requireText(source, 'purpose'),
    scopes: [...(source.scopes as string[])],
    status: source.status as ConsentStatus,
    statusUpdateDateTime: requireText(source, 'status_update_date_time'),
  };

  const period = source.data_period as Record<string, unknown> | undefined;
  if (typeof period === 'object' && period !== null) {
    record.dataPeriod = {};
    if (typeof period.start === 'string') record.dataPeriod.start = period.start;
    if (typeof period.end === 'string') record.dataPeriod.end = period.end;
  }
  const reason = source.status_reason as Record<string, unknown> | undefined;
  if (typeof reason === 'object' && reason !== null && typeof reason.code === 'string') {
    record.statusReason = {
      code: reason.code,
      endedVia: typeof reason.ended_via === 'string' ? reason.ended_via : '',
    };
    if (typeof reason.additional_information === 'string') {
      record.statusReason.additionalInformation = reason.additional_information;
    }
  }
  return record;
}

/**
 * Cria o consentimento a partir do corpo montado por `buildConsentBody`. A
 * criação não é repetida sozinha: ela não é idempotente.
 */
export async function createConsent(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  body: Record<string, unknown>,
): Promise<ConsentRecord> {
  for (const scope of body.scopes as string[]) assertScopeUsable(resolved, scope);

  const { json } = await withProviderToken(ctx, resolved, 'consent.manage', (token) =>
    apiRequest(ctx, {
      accept: 'json',
      body,
      method: 'POST',
      okStatuses: [201],
      providerId: resolved.provider.participant_id,
      token,
      url: consentUrl(resolved),
    }),
  );
  const record = toConsentRecord(json);
  if (record.status !== 'AWAITING_AUTHORISATION') {
    throw new LabAccessProtocolError(
      'O consentimento criado deveria estar em AWAITING_AUTHORISATION.',
    );
  }
  return record;
}

/** Lê o estado do consentimento com um token de provedor. */
export async function readConsent(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  consentId: string,
): Promise<ConsentRecord> {
  assertConsentId(consentId);
  const { json } = await withProviderToken(ctx, resolved, 'consent.manage', (token) =>
    withRetry(ctx, true, () =>
      apiRequest(ctx, {
        accept: 'json',
        consentId,
        method: 'GET',
        okStatuses: [200],
        providerId: resolved.provider.participant_id,
        token,
        url: consentUrl(resolved, consentId),
      }),
    ),
  );
  return toConsentRecord(json);
}

export interface PatientConsentRead {
  interactionId: string;
  /** Bloco `patient` cru. Só a conferência do titular o lê. */
  patient: unknown;
  record: ConsentRecord;
}

/** Lê o consentimento com o token de paciente ligado a ele. */
export async function readConsentAsPatient(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  consentId: string,
  token: string,
): Promise<PatientConsentRead> {
  const { interactionId, json } = await withRetry(ctx, true, () =>
    apiRequest(ctx, {
      accept: 'json',
      consentId,
      method: 'GET',
      okStatuses: [200],
      providerId: resolved.provider.participant_id,
      token,
      url: consentUrl(resolved, consentId),
    }),
  );
  const record = toConsentRecord(json);
  return { interactionId, patient: (json as { patient?: unknown }).patient, record };
}

/** Revoga o consentimento. `DELETE` de consentimento pode ser repetido. */
export async function deleteConsent(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  consentId: string,
  reason: RevocationReason,
): Promise<void> {
  assertConsentId(consentId);
  if (!REVOCATION_REASONS.includes(reason)) {
    throw new LabAccessConfigError('Motivo de revogação desconhecido.');
  }
  await withProviderToken(ctx, resolved, 'consent.manage', (token) =>
    withRetry(ctx, true, () =>
      apiRequest(ctx, {
        accept: 'json',
        consentId,
        method: 'DELETE',
        okStatuses: [204],
        providerId: resolved.provider.participant_id,
        token,
        url: `${consentUrl(resolved, consentId)}?reason=${reason}`,
      }),
    ),
  );
}

/**
 * Revoga e diz se o provedor confirmou. Um consentimento que já está em
 * estado final conta como confirmado: não há mais o que encerrar.
 */
export async function revokeAndReport(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  consentId: string,
  reason: RevocationReason,
): Promise<{ error?: unknown; outcome: 'confirmed' | 'pending' }> {
  try {
    await deleteConsent(ctx, resolved, consentId, reason);
    return { outcome: 'confirmed' };
  } catch (error) {
    if (error instanceof LabAccessApiError && error.code === 'CONSENT_INVALID_STATE') {
      return { outcome: 'confirmed' };
    }
    return { error, outcome: 'pending' };
  }
}
