/**
 * Generic Lab Result Types
 *
 * Type definitions for lab results that work with any laboratory format.
 * Used by the FHIR converter to transform internal data to FHIR R4 resources.
 */

export type OverallStatus = 'NORMAL' | 'ANORMAL';
export type Flag = 'H' | 'L' | '';
export type Gender = 'male' | 'female' | 'other' | 'unknown';

/**
 * Lab report data for FHIR conversion
 */
export interface LabReportData {
  collectionDate: string;
  createdAt: string;
  laboratoryName?: string;
  overallStatus: OverallStatus;
  processingStatus?: 'complete' | 'partial' | 'pending_review';
  reportId: string;
  userId: string;
}

/**
 * Individual biomarker observation for FHIR conversion
 */
/**
 * Uma faixa impressa no laudo, com a quem ela se aplica.
 *
 * Existe para o laudo que publica uma coluna de referência por sexo. Sem esta
 * forma só há duas saídas, e as duas perdem: escolher uma coluna sem saber de
 * quem é o exame, ou descartar as duas. Ambas já aconteceram no corpo real e
 * estão registradas na PRE-424 e na PRE-425.
 *
 * `appliesTo` ausente significa "vale para todo mundo", que é o caso comum.
 */
export interface PrintedReferenceRange {
  appliesTo?: 'female' | 'male';
  high?: number;
  low?: number;
}

export interface LabObservationData {
  biomarkerCode: string;
  biomarkerName: string;
  collectionDate?: string;
  flag: Flag;
  isQualitative?: boolean;
  referenceMax?: number;
  referenceMin?: number;
  /**
   * As faixas impressas, quando o laudo publica mais de uma.
   *
   * Tem precedência sobre `referenceMin` e `referenceMax`, que continuam sendo
   * a forma simples e seguem valendo para o laudo de coluna única. As duas
   * existem porque converter todo chamador de uma vez trocaria um problema real
   * por uma migração grande sem ganho para quem tem uma faixa só.
   */
  referenceRanges?: PrintedReferenceRange[];
  reportId: string;
  unit: string;
  value: number | string;
}

/**
 * Intervention data for FHIR conversion
 */
export interface InterventionData {
  endDate?: string;
  interventionId: string;
  name: string;
  notes?: string;
  startDate: string;
  type: 'medication' | 'diet' | 'exercise' | 'sleep' | 'supplement';
}

/**
 * User profile data for FHIR Patient resource
 */
export interface UserProfileData {
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  birthDate?: string;
  cpf?: string;
  email?: string;
  gender?: Gender;
  name: string;
  phone?: string;
  userId: string;
}
