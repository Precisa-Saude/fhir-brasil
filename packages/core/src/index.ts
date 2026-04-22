/**
 * @precisa-saude/fhir
 *
 * Brazilian FHIR R4 toolkit — biomarker definitions, reference ranges, and converters.
 */

// Export generic lab result types
export type {
  Flag,
  Gender,
  InterventionData,
  LabObservationData,
  LabReportData,
  OverallStatus,
  UserProfileData,
} from './types';

// Export biomarker definitions (single source of truth)
export * from './biomarkers';

// Export 10-group taxonomy over the 20 biomarker subcategories
export * from './category-groups';

// Export unit mappings and configurations
export * from './units';

// Export FHIR converter
export * from './converter';

// Export FHIR intervention converter
export * from './intervention-converter';

// Export FHIR importer
export * from './importer';

// Export validators
export * from './validators';

// Export reference ranges
export * from './reference-ranges';

// Export DEXA zone data for charts
export * from './dexa-zone-data';

// Export screening intervals configuration
export * from './screening-intervals';

// Export i18n utilities
export * from './i18n';

// Export Brazilian identifier helpers (CPF, CNS)
export * from './identifiers';
