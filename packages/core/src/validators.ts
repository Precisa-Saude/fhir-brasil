/**
 * FHIR Validators
 *
 * Validation functions for FHIR R4 resources.
 */

import { LOINC_SYSTEM } from './code-systems';
import type {
  FHIRCodeableConcept,
  FHIRDiagnosticReport,
  FHIRObservation,
  FHIRQuantity,
} from './fhir-types';
import type { ImportError } from './importer';
import { isUcumCode } from './units';

const UCUM_SYSTEM = 'http://unitsofmeasure.org';

/**
 * Um `Quantity` que afirma o system do UCUM precisa de um `code` que seja
 * UCUM. Sem `code` a afirmação está vazia; com `code` que não é UCUM ela está
 * errada, e foi o caso durante meses: `uIU/mL`, `K/uL` e `razão` saíam sob
 * `http://unitsofmeasure.org` porque o conversor devolvia a grafia do laudo
 * intacta quando não a conhecia.
 *
 * `Quantity` sem `system` passa: unidade só em texto é legítima, e é o que o
 * conversor emite quando não sabe traduzir.
 */
function ucumErrors(quantity: FHIRQuantity | undefined, where: string): string[] {
  if (!quantity || quantity.system !== UCUM_SYSTEM) return [];
  if (!quantity.code) return [`${where}: UCUM system declared without a code`];
  if (!isUcumCode(quantity.code)) {
    return [`${where}: "${quantity.code}" is not a UCUM code`];
  }
  return [];
}

/**
 * Um `valueCodeableConcept` precisa dizer alguma coisa: um coding com `code`
 * ou, pelo menos, o texto. E um coding sob `http://loinc.org` no lugar do
 * valor é resposta, então o código tem a forma `LA…`; um código de exame ali
 * (`2514-8`) é o erro de pôr o `code` da Observation no valor.
 */
function codedValueErrors(value: FHIRCodeableConcept | undefined): string[] {
  if (!value) return [];
  const errors: string[] = [];
  const codings = value.coding ?? [];
  if (codings.length === 0 && !value.text) {
    errors.push('valueCodeableConcept: neither coding nor text');
  }
  for (const [i, coding] of codings.entries()) {
    if (!coding.code) {
      errors.push(`valueCodeableConcept.coding[${i}]: missing code`);
    } else if (coding.system === LOINC_SYSTEM && !/^LA\d+-\d$/.test(coding.code)) {
      errors.push(
        `valueCodeableConcept.coding[${i}]: "${coding.code}" is not a LOINC answer code (LA…)`,
      );
    }
  }
  return errors;
}

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

  if (!observation.valueQuantity && !observation.valueString && !observation.valueCodeableConcept) {
    errors.push('Missing value (valueQuantity, valueString or valueCodeableConcept)');
  }

  errors.push(...codedValueErrors(observation.valueCodeableConcept));

  errors.push(...ucumErrors(observation.valueQuantity, 'valueQuantity'));
  for (const [i, range] of (observation.referenceRange ?? []).entries()) {
    errors.push(...ucumErrors(range.low, `referenceRange[${i}].low`));
    errors.push(...ucumErrors(range.high, `referenceRange[${i}].high`));
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
