/**
 * Generic Lab Result Types
 *
 * Type definitions for lab results that work with any laboratory format.
 * Used by the FHIR converter to transform internal data to FHIR R4 resources.
 */

import type { RangeKind } from './reference-ranges';

export type OverallStatus = 'NORMAL' | 'ANORMAL';
/**
 * A marcação de um resultado contra a faixa.
 *
 * `N` é afirmação: alguém (o laudo, ou quem comparou o valor com a faixa)
 * determinou que o resultado está dentro do esperado. A string vazia é
 * ausência: ninguém determinou nada. As duas coisas não são a mesma, e o
 * conversor só escreve `Observation.interpretation` quando há afirmação.
 */
export type Flag = 'H' | 'L' | 'N' | '';
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
  /**
   * Código LOINC de resposta (`LA…`) de um resultado em texto, quando quem
   * chama já o tem, como no Bundle que o importador leu. Só sai se for uma das
   * respostas conferidas em `ORDINAL_ANSWERS`; sem ele, o conversor procura a
   * resposta pela grafia impressa.
   */
  answerCode?: string;
  biomarkerCode: string;
  biomarkerName: string;
  collectionDate?: string;
  flag: Flag;
  isQualitative?: boolean;
  /**
   * O LOINC por método, quando o laudo afirmou o método por escrito. Só vale
   * se for uma das `methodVariants` declaradas para o biomarcador; qualquer
   * outro valor é ignorado e sai o código sem método.
   */
  methodLoinc?: string;
  /**
   * Tipo da faixa simples (`referenceMin`/`referenceMax`), quando quem chama
   * sabe. Sai como `referenceRange.type`. Faixa impressa pelo laboratório
   * costuma ficar sem: o laudo não diz de onde tirou o intervalo.
   */
  referenceKind?: RangeKind;
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
 * Os tipos abaixo são as entradas dos conversores da exportação do prontuário
 * (ver `export-bundle.ts`). São o mínimo que cada conversor consome; a forma
 * como a plataforma guarda cada dado fica do lado de quem chama.
 */

/** Pressão arterial medida pela pessoa ou lida de um laudo. */
export interface BloodPressureData {
  diastolic: number;
  measuredAt?: string;
  systolic: number;
}

/** Medidas corporais do perfil. Datas em ISO 8601. */
export interface VitalsData {
  bloodPressure?: BloodPressureData;
  heightCm?: number;
  measuredAt?: string;
  waistCm?: number;
  weightKg?: number;
}

/** Condições de saúde declaradas no perfil. */
export interface HealthConditionsData {
  bpTreatment?: boolean;
  diabetes?: boolean;
  recordedAt?: string;
  smoking?: boolean;
}

/** Perfil alimentar declarado no perfil. */
export interface DietaryProfileData {
  allergies?: string[];
  dietType?: string;
  recordedAt?: string;
  restrictions?: string[];
}

/** Um dia de métricas do Apple Health ou equivalente. */
export interface HealthKitDailyMetricsData {
  activeCalories?: number;
  /** Dia no formato `AAAA-MM-DD`. */
  date: string;
  exerciseMinutes?: number;
  restingHeartRate?: number;
  /** Regularidade do sono, de 0 a 1, como o fornecedor a define. */
  sleepConsistency?: number;
  sleepHours?: number;
  source?: string;
  steps?: number;
}

/** Resultado do cálculo de idade fenotípica. */
export interface PhenoAgeResultData {
  ageDifference: number;
  calculatedAt: string;
  chronologicalAge: number;
  mortalityScore: number;
  phenoAge: number;
  resultId: string;
}

/** Resultado do modelo BRDMRISC de risco de diabetes tipo 2. */
export interface BrDMriscResultData {
  /** Ids das `Observation` laboratoriais que alimentaram o cálculo. */
  basisObservationIds?: string[];
  calculatedAt: string;
  modelUsed?: string;
  resultId: string;
  /** Probabilidade em 10 anos, de 0 a 1. */
  risk10y: number;
  riskCategory: string;
}

/** Cabeçalho de um arquivo genético importado. */
export interface GeneticProfileData {
  fileName?: string;
  format?: string;
  genomeBuild?: string;
  markerCount?: number;
  profileId: string;
  uploadedAt: string;
}

/** Uma variante lida do arquivo genético, com a interpretação do catálogo. */
export interface GeneticSnpData {
  category?: string;
  gene?: string;
  /** Genótipo como está no arquivo (`AG`, `TT`). */
  genotype: string;
  implication?: string;
  profileId: string;
  recommendation?: string;
  riskLevel?: string;
  rsId: string;
}

export type ConsentKind = 'lgpd' | 'precisa-ia-deep' | 'sharing' | 'whatsapp';

/** Um consentimento registrado pela pessoa. */
export interface ConsentData {
  consentId: string;
  grantedAt: string;
  kind: ConsentKind;
  policyText?: string;
  policyUri?: string;
  /** Com quem a pessoa compartilhou, no consentimento de compartilhamento. */
  recipientDisplay?: string;
  revokedAt?: string;
}

export type ExportDocumentKind = 'genetic-raw-file' | 'lab-report-pdf' | 'shared-pdf';

/** Um arquivo que viaja junto do Bundle (PDF do laudo, arquivo genético). */
export interface ExportDocumentData {
  /** Hash SHA-256 em hexadecimal, quando quem chama o tem. */
  contentHash?: string;
  contentType: string;
  createdAt?: string;
  documentId: string;
  kind: ExportDocumentKind;
  /** Laudo a que o arquivo pertence, quando há um. */
  relatedReportId?: string;
  title?: string;
  /** Caminho relativo dentro do pacote exportado. */
  url: string;
}

export type CommunicationChannel = 'precisa-ia' | 'sharing' | 'support';
export type CommunicationSender = 'agent' | 'assistant' | 'patient' | 'system';

/** Uma mensagem de chat ou um envio de resultados. */
export interface CommunicationData {
  channel: CommunicationChannel;
  conversationId: string;
  messageId: string;
  /** Id do `ExportDocumentData` enviado, quando a mensagem leva um arquivo. */
  payloadDocumentId?: string;
  recipientDisplay?: string;
  sender: CommunicationSender;
  sentAt: string;
  text?: string;
}

/** Um contato salvo para compartilhar resultados. */
export interface SharingContactData {
  contactId: string;
  email?: string;
  name?: string;
}

/** Uma recomendação do plano de ação gerado por IA. */
export interface RecommendationData {
  category?: string;
  description?: string;
  recommendationId: string;
  title: string;
}

/** O plano de ação em cache, quando existe. */
export interface ActionPlanData {
  generatedAt: string;
  planId: string;
  recommendations: RecommendationData[];
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
