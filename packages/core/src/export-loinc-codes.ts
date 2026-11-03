/**
 * Os códigos LOINC que a exportação do prontuário emite fora do catálogo de
 * biomarcadores. Módulo sem importações de propósito: `scripts/verify-loinc.ts`
 * o carrega direto, como faz com `biomarkers.ts`, para pôr estes códigos no
 * mesmo snapshot verificado. O display de cada um sai do snapshot, nunca daqui.
 */

/**
 * Códigos LOINC emitidos pela exportação, indexados pelo uso. O valor é só o
 * código: o display vem do snapshot, que é a cópia conferida do LOINC.
 */
export const EXPORT_LOINC_CODES = {
  /** Idade cronológica, componente do PhenoAge. */
  age: '30525-0',
  /** Estado alélico, componente da variante genética. */
  allelicState: '53034-5',
  /** Painel de pressão arterial, com sistólica e diastólica em componentes. */
  bloodPressurePanel: '85354-9',
  bodyHeight: '8302-2',
  bodyWeight: '29463-7',
  diastolicBloodPressure: '8462-4',
  /** Variante genética discreta, componente que leva o `rs…` do dbSNP. */
  discreteGeneticVariant: '81252-9',
  exerciseDuration: '55411-3',
  /** Gene estudado, componente da variante genética. */
  geneStudied: '48018-6',
  /** Código do `DiagnosticReport` do painel genético. */
  geneticReportPanel: '81247-9',
  /** Código de cada `Observation` de variante genética. */
  geneticVariantAssessment: '69548-6',
  /** Código do `DiagnosticReport` de laudo laboratorial. */
  laboratoryReport: '11502-2',
  /** Categoria do `Consent`: consentimento do paciente. */
  patientConsent: '59284-0',
  restingHeartRate: '40443-4',
  sleepDuration: '93832-4',
  /** Passos em 24 horas, medidos. */
  steps24h: '41950-7',
  systolicBloodPressure: '8480-6',
  tobaccoSmokingStatus: '72166-2',
  waistCircumference: '8280-0',
} as const;

export type ExportLoincUse = keyof typeof EXPORT_LOINC_CODES;

/**
 * Respostas LOINC (`LA…`) que a exportação emite em `valueCodeableConcept`.
 *
 * Resposta não tem os seis eixos de um código de exame, então não cabe no
 * snapshot de eixos; fica aqui com o display oficial, como `ordinal-answers.ts`
 * faz. Conferidas em 03/11/2026 por `$lookup` no LOINC 2.83.
 */
export const EXPORT_LOINC_ANSWERS = {
  /** Estado alélico heterozigoto. */
  allelicHeterozygous: { code: 'LA6706-1', display: 'Heterozygous' },
  /** Estado alélico homozigoto. */
  allelicHomozygous: { code: 'LA6705-3', display: 'Homozygous' },
  /** Fumante, sem detalhe de frequência. */
  smokerCurrentStatusUnknown: { code: 'LA18979-7', display: 'Smoker, current status unknown' },
} as const;

export type ExportLoincAnswerUse = keyof typeof EXPORT_LOINC_ANSWERS;
