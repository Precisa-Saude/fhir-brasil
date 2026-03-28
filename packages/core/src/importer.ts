/**
 * FHIR Importer
 *
 * Parses FHIR R4 Bundles and extracts Observation resources with known LOINC codes,
 * mapping them to internal biomarker codes for storage as lab results.
 */

import { getDefinitionByLoinc, loincToCode } from './biomarkers';
import type { FHIRBundle, FHIRObservation } from './fhir-types';
import { validateFHIRImportBundle } from './validators';

export interface ImportedObservation {
  biomarkerCode: string;
  biomarkerName: string;
  collectionDate: string;
  flag: 'H' | 'L' | '';
  isQualitative: boolean;
  loincCode: string;
  referenceMax?: number;
  referenceMin?: number;
  unit: string;
  value: number | string;
}

export interface SkippedEntry {
  index: number;
  loincCode?: string;
  reason: string;
  resourceType?: string;
}

export interface ImportError {
  details: string;
  field: string;
}

export interface FHIRImportResult {
  errors: ImportError[];
  imported: ImportedObservation[];
  skipped: SkippedEntry[];
  totalProcessed: number;
}

const MAX_OBSERVATIONS = 1000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Extract LOINC code from an Observation's code.coding array
 */
function extractLoincCode(observation: FHIRObservation): string | undefined {
  if (!observation.code?.coding) return undefined;
  const loincCoding = observation.code.coding.find((c) => c.system === 'http://loinc.org');
  return loincCoding?.code;
}

/**
 * Extract interpretation flag from Observation
 */
function extractFlag(observation: FHIRObservation): 'H' | 'L' | '' {
  const code = observation.interpretation?.[0]?.coding?.[0]?.code;
  if (code === 'H' || code === 'HH') return 'H';
  if (code === 'L' || code === 'LL') return 'L';
  return '';
}

/**
 * Extract Observation resources from a FHIR Bundle
 */
export function extractObservationsFromBundle(bundle: FHIRBundle): {
  observations: FHIRObservation[];
  skipped: SkippedEntry[];
} {
  const observations: FHIRObservation[] = [];
  const skipped: SkippedEntry[] = [];

  for (let i = 0; i < bundle.entry.length; i++) {
    const entry = bundle.entry[i]!;
    if (!entry.resource) {
      skipped.push({ index: i, reason: 'Entry has no resource' });
      continue;
    }

    if (entry.resource.resourceType !== 'Observation') {
      // Non-observation resources are silently skipped (Patient, DiagnosticReport, etc.)
      continue;
    }

    if (observations.length >= MAX_OBSERVATIONS) {
      skipped.push({ index: i, reason: `Maximum of ${MAX_OBSERVATIONS} observations exceeded` });
      continue;
    }

    observations.push(entry.resource as FHIRObservation);
  }

  return { observations, skipped };
}

/**
 * Map a FHIR Observation to internal format using LOINC→biomarker code lookup
 */
export function mapFHIRObservationToInternal(
  observation: FHIRObservation,
  index: number,
): { observation: ImportedObservation } | { skipped: SkippedEntry } {
  const loincCode = extractLoincCode(observation);

  if (!loincCode) {
    return {
      skipped: {
        index,
        reason: 'No LOINC code found in observation coding',
        resourceType: 'Observation',
      },
    };
  }

  const internalCode = loincToCode(loincCode);
  if (!internalCode) {
    return {
      skipped: {
        index,
        loincCode,
        reason: `Unknown LOINC code: ${loincCode}`,
        resourceType: 'Observation',
      },
    };
  }

  const definition = getDefinitionByLoinc(loincCode);

  // Extract value
  let value: number | string;
  let unit = '';
  let isQualitative = false;

  if (observation.valueQuantity?.value !== undefined) {
    value = observation.valueQuantity.value;
    unit = observation.valueQuantity.unit || observation.valueQuantity.code || '';
  } else if (observation.valueString) {
    value = observation.valueString;
    isQualitative = true;
  } else {
    return {
      skipped: {
        index,
        loincCode,
        reason: 'Observation has no value (valueQuantity or valueString)',
        resourceType: 'Observation',
      },
    };
  }

  // Extract collection date (effectiveDateTime or effectivePeriod.start)
  const collectionDate = observation.effectiveDateTime || observation.effectivePeriod?.start || '';
  if (!collectionDate) {
    return {
      skipped: {
        index,
        loincCode,
        reason: 'Observation has no effectiveDateTime or effectivePeriod.start',
        resourceType: 'Observation',
      },
    };
  }

  // Extract reference ranges
  let referenceMin: number | undefined;
  let referenceMax: number | undefined;
  if (observation.referenceRange?.[0]) {
    referenceMin = observation.referenceRange[0].low?.value;
    referenceMax = observation.referenceRange[0].high?.value;
  }

  const imported: ImportedObservation = {
    biomarkerCode: internalCode,
    biomarkerName:
      definition?.names.pt[0] || definition?.names.en[0] || observation.code.text || internalCode,
    collectionDate,
    flag: extractFlag(observation),
    isQualitative,
    loincCode,
    referenceMax,
    referenceMin,
    unit: unit || definition?.unit || '',
    value,
  };

  return { observation: imported };
}

/**
 * Process a complete FHIR Bundle for import
 */
export function processImportBundle(data: unknown): FHIRImportResult {
  // Structural validation
  const validationErrors = validateFHIRImportBundle(data);
  if (validationErrors.length > 0) {
    return {
      errors: validationErrors,
      imported: [],
      skipped: [],
      totalProcessed: 0,
    };
  }

  const bundle = data as FHIRBundle;

  // Extract observations
  const { observations, skipped } = extractObservationsFromBundle(bundle);

  // Map each observation to internal format
  const imported: ImportedObservation[] = [];
  const allSkipped: SkippedEntry[] = [...skipped];

  for (let i = 0; i < observations.length; i++) {
    const result = mapFHIRObservationToInternal(observations[i]!, i);

    if ('observation' in result) {
      imported.push(result.observation);
    } else {
      allSkipped.push(result.skipped);
    }
  }

  return {
    errors: [],
    imported,
    skipped: allSkipped,
    totalProcessed: observations.length,
  };
}

export { MAX_FILE_SIZE, MAX_OBSERVATIONS };
