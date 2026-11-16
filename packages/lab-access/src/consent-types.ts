/**
 * Tipos dos endpoints de consentimento (seção 5.4).
 */

import type { PatientScope } from './constants';

export type ConsentStatus =
  | 'AUTHORISED'
  | 'AWAITING_AUTHORISATION'
  | 'EXPIRED'
  | 'REJECTED'
  | 'REVOKED';

export const CONSENT_STATUSES: readonly ConsentStatus[] = [
  'AUTHORISED',
  'AWAITING_AUTHORISATION',
  'EXPIRED',
  'REJECTED',
  'REVOKED',
];

export type ConsentStatusReasonCode =
  | 'AUTHORISATION_TIMEOUT'
  | 'MAX_DATE_REACHED'
  | 'PATIENT_MISMATCH'
  | 'PATIENT_REJECTED'
  | 'PATIENT_REQUEST'
  | 'PATIENT_WITHOUT_CPF'
  | 'PROVIDER_SECURITY'
  | 'RECEIVER_TERMINATION'
  | 'RECEIVER_WITHDRAWN'
  | 'TECHNICAL_ISSUE';

export type ConsentEndedVia = 'PROVIDER' | 'RECEIVER' | 'SYSTEM';

/** Motivos que o receptor pode enviar ao revogar. */
export type RevocationReason = 'PATIENT_MISMATCH' | 'PATIENT_REQUEST' | 'RECEIVER_TERMINATION';

export const REVOCATION_REASONS: readonly RevocationReason[] = [
  'PATIENT_MISMATCH',
  'PATIENT_REQUEST',
  'RECEIVER_TERMINATION',
];

export interface ConsentDataPeriod {
  /** Data (AAAA-MM-DD) até a qual os resultados entram. */
  end?: string;
  /** Data (AAAA-MM-DD) a partir da qual os resultados entram. */
  start?: string;
}

/**
 * O que o receptor informa ao criar um consentimento.
 *
 * Não há campo para identificar o paciente: a criação não leva CPF, nome nem
 * qualquer outro identificador.
 */
export interface CreateConsentInput {
  dataPeriod?: ConsentDataPeriod;
  /** Instante de expiração, no futuro e a no máximo 12 meses. */
  expirationDateTime: Date | string;
  /** Finalidade em português, de 10 a 300 caracteres, mostrada ao paciente. */
  purpose: string;
  scopes: readonly PatientScope[];
}

export interface ConsentStatusReason {
  additionalInformation?: string;
  code: ConsentStatusReasonCode | string;
  endedVia: ConsentEndedVia | string;
}

/**
 * Consentimento como o provedor o devolve.
 *
 * O bloco `patient` da leitura com token de paciente não aparece aqui: o CPF
 * recebido serve só para a conferência do titular e é descartado em seguida.
 */
export interface ConsentRecord {
  consentId: string;
  creationDateTime: string;
  dataPeriod?: ConsentDataPeriod;
  expirationDateTime: string;
  purpose: string;
  scopes: string[];
  status: ConsentStatus;
  statusReason?: ConsentStatusReason;
  statusUpdateDateTime: string;
}
