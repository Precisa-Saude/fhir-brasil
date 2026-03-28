/**
 * FHIR Validators
 *
 * Validation functions for FHIR R4 resources.
 */

import type { FHIRDiagnosticReport, FHIRObservation } from './fhir-types';
import type { ImportError } from './importer';

/**
 * Validate FHIR DiagnosticReport
 */
export function validateFHIRDiagnosticReport(report: FHIRDiagnosticReport): string[] {
  const errors: string[] = [];

  if (!report.resourceType || report.resourceType !== 'DiagnosticReport') {
    errors.push('Invalid resourceType');
  }

  if (!report.status) {
    errors.push('Missing status');
  }

  if (!report.code || !report.code.coding || report.code.coding.length === 0) {
    errors.push('Missing or invalid code');
  }

  if (!report.subject || !report.subject.reference) {
    errors.push('Missing subject reference');
  }

  return errors;
}

/**
 * Validate FHIR Observation
 */
export function validateFHIRObservation(observation: FHIRObservation): string[] {
  const errors: string[] = [];

  if (!observation.resourceType || observation.resourceType !== 'Observation') {
    errors.push('Invalid resourceType');
  }

  if (!observation.status) {
    errors.push('Missing status');
  }

  if (!observation.code || !observation.code.coding || observation.code.coding.length === 0) {
    errors.push('Missing or invalid code');
  }

  if (!observation.subject || !observation.subject.reference) {
    errors.push('Missing subject reference');
  }

  if (!observation.valueQuantity && !observation.valueString) {
    errors.push('Missing value (valueQuantity or valueString)');
  }

  return errors;
}

/**
 * Validate that the input is a structurally valid FHIR Bundle
 */
export function validateFHIRImportBundle(data: unknown): ImportError[] {
  const errors: ImportError[] = [];

  if (!data || typeof data !== 'object') {
    errors.push({ details: 'Input must be a JSON object', field: 'root' });
    return errors;
  }

  const bundle = data as Record<string, unknown>;

  if (bundle.resourceType !== 'Bundle') {
    errors.push({
      details: `Expected resourceType "Bundle", got "${String(bundle.resourceType)}"`,
      field: 'resourceType',
    });
  }

  if (!Array.isArray(bundle.entry)) {
    errors.push({ details: 'Bundle must contain an "entry" array', field: 'entry' });
  } else if (bundle.entry.length === 0) {
    errors.push({ details: 'Bundle entry array is empty', field: 'entry' });
  }

  return errors;
}
