/**
 * @precisa-saude/fhir
 *
 * Brazilian FHIR R4 toolkit — biomarker definitions, reference ranges, and converters.
 */

// Export generic lab result types
export type {
  ActionPlanData,
  BloodPressureData,
  BrDMriscResultData,
  CommunicationChannel,
  CommunicationData,
  CommunicationSender,
  ConsentData,
  ConsentKind,
  DietaryProfileData,
  ExportDocumentData,
  ExportDocumentKind,
  Flag,
  Gender,
  GeneticProfileData,
  GeneticSnpData,
  HealthConditionsData,
  HealthKitDailyMetricsData,
  InterventionData,
  LabObservationData,
  LabReportData,
  OverallStatus,
  PhenoAgeResultData,
  RecommendationData,
  SharingContactData,
  UserProfileData,
  VitalsData,
} from './types';

// Export biomarker definitions (single source of truth)
export * from './biomarkers';

// Export code system identifiers shared by converter and importer
export * from './code-systems';

// Export 10-group taxonomy over the 20 biomarker subcategories

// Export unit mappings and configurations
export * from './units';

// Export FHIR converter
export * from './converter';
export * from './diagnostic-sections';
export * from './llm-reference';

// Export FHIR intervention converter
export * from './intervention-converter';

// Exportação do prontuário (LGPD art. 18): Bundle de coleção e conversores
export * from './activity-converter';
export * from './care-plan-converter';
export * from './communication-converter';
export * from './consent-converter';
export * from './document-converter';
export * from './export-bundle';
export * from './export-codes';
export * from './export-helpers';
export * from './genomics-converter';
export * from './risk-converter';
export * from './vitals-converter';

// Export LOINC answer codes for ordinal results (Negativo, Traços, ++)
export * from './ordinal-answers';

// Export FHIR importer
export * from './importer';

// Export validators
export * from './validators';

// Export reference ranges
export * from './reference-ranges';

// Export DEXA zone data for charts
export * from './dexa-zone-data';

// Export screening intervals configuration

// Export i18n utilities
export * from './i18n';

// Export Brazilian identifier helpers (CPF, CNS)
export * from './identifiers';

// Export Bundle entry addressing (fullUrl)
export * from './bundle-urls';

// Export IG extension URLs (proveniência da extração, OCR, histórico)
export * from './extension-urls';

// Export specimen type coding (RNDS BRTipoAmostra)
export * from './specimen-types';

// Export the bibliographic registry behind every reference range `source` key
export * from './sources';

// Eixos e grupos LOINC de cada código, o registro de decisão de cada mapeamento e a ficha
export * from './loinc-axes';
export * from './mapping-decisions';
export * from './mapping-sheet';

// Material impresso contra o eixo System do código: barra soro em seção de urina e o inverso
export * from './specimen-gate';
