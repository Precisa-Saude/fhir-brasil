/**
 * @fhir-brasil/calculators
 *
 * Clinical calculators — PhenoAge, BrDMrisc, derived biomarkers.
 */

// PhenoAge — namespaced to avoid collisions with BrDMrisc
export * as phenoage from './phenoage';

// BrDMrisc — namespaced to avoid collisions with PhenoAge
export * as brdmrisc from './brdmrisc';

// Derived biomarkers (HOMA-IR, VLDL, BMI)
export { computeDerivedBiomarkers } from './derived';
export type { BiomarkerInput, DerivedBiomarker, DerivedOptions } from './derived';
