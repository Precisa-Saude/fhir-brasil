/**
 * FHIR Importer
 *
 * Parses FHIR R4 Bundles and extracts Observation resources with known LOINC codes,
 * mapping them to internal biomarker codes for storage as lab results.
 */

import { codeToLoinc, getDefinitionByCode, isValidCode, loincToCode } from './biomarkers';
import { BIOMARKER_CODE_SYSTEM, LOINC_SYSTEM } from './code-systems';
import type { FHIRBundle, FHIRObservation } from './fhir-types';
import { validateFHIRImportBundle } from './validators';

export interface ImportedObservation {
  biomarkerCode: string;
  biomarkerName: string;
  collectionDate: string;
  flag: 'H' | 'L' | '';
  isQualitative: boolean;
  /** Ausente nos biomarcadores sem LOINC publicado, como composição corporal. */
  loincCode?: string;
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

/**
 * Limites de importação.
 *
 * Uma Observation exportada ocupa cerca de 1,25KB em JSON compacto e 2,75KB
 * quando o arquivo vem indentado, medido sobre um histórico real de 998
 * Observations em 61 laudos. Nesse tamanho, 5000 Observations dão 6,0MB
 * compactos ou 13,1MB indentados, e por isso o teto de arquivo é 15MB: cobre
 * as duas formas com folga.
 *
 * Na densidade desse mesmo histórico (16 Observations por laudo), 5000
 * equivalem a cerca de 300 laudos.
 */
const MAX_OBSERVATIONS = 5000;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

/**
 * Resolve o código interno do biomarcador a partir do `code.coding`.
 *
 * LOINC primeiro, que é o vocabulário que arquivos de terceiros usam. Quando
 * não resolve, cai para o coding de códigos internos, presente nos arquivos
 * exportados pela própria plataforma.
 *
 * O fallback cobre dois casos: biomarcadores sem LOINC publicado (composição
 * corporal, densidade óssea, escore de cálcio) e arquivos antigos, exportados
 * quando esses biomarcadores saíam com o placeholder `99999-9`, que não
 * resolve para nada.
 */
function resolveBiomarkerCode(observation: FHIRObservation): {
  internalCode?: string;
  loincCode?: string;
  seenCodes: string[];
} {
  const coding = observation.code?.coding ?? [];
  const loincCode = coding.find((c) => c.system === LOINC_SYSTEM)?.code;
  const declaredCode = coding.find((c) => c.system === BIOMARKER_CODE_SYSTEM)?.code;

  const seenCodes = [
    ...(loincCode ? [`LOINC ${loincCode}`] : []),
    ...(declaredCode ? [`biomarker code ${declaredCode}`] : []),
  ];

  const fromLoinc = loincCode ? loincToCode(loincCode) : undefined;
  if (fromLoinc) return { internalCode: fromLoinc, loincCode, seenCodes };

  if (declaredCode && isValidCode(declaredCode)) {
    // `codeToLoinc` devolve undefined para quem não tem LOINC, que é o caso
    // esperado aqui. O campo fica de fora em vez de receber um valor inventado.
    return { internalCode: declaredCode, loincCode: codeToLoinc(declaredCode), seenCodes };
  }

  return { loincCode, seenCodes };
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
  const { internalCode, loincCode, seenCodes } = resolveBiomarkerCode(observation);

  if (!internalCode) {
    return {
      skipped: {
        index,
        loincCode,
        reason: seenCodes.length
          ? `Unknown code: ${seenCodes.join(', ')}`
          : 'No code found in observation coding',
        resourceType: 'Observation',
      },
    };
  }

  const definition = getDefinitionByCode(internalCode);

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
