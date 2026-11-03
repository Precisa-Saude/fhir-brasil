/**
 * FHIR Validators
 *
 * Validation functions for FHIR R4 resources.
 */

import { LOINC_SYSTEM, UCUM_SYSTEM } from './code-systems';
import { FHIR_ID_PATTERN } from './export-helpers';
import type {
  FHIRBundle,
  FHIRCodeableConcept,
  FHIRDiagnosticReport,
  FHIRObservation,
  FHIRQuantity,
  FHIRResource,
} from './fhir-types';
import type { ImportError } from './importer';
import { isUcumCode } from './units';

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

  // Um painel (pressão arterial, variante genética) carrega o resultado nos
  // componentes e pode não ter valor próprio; é o que o R4 permite. Sem valor
  // e sem componente, a Observation não diz nada.
  const hasComponent = (observation.component?.length ?? 0) > 0;
  if (
    !observation.valueQuantity &&
    !observation.valueString &&
    !observation.valueCodeableConcept &&
    !hasComponent
  ) {
    errors.push('Missing value (valueQuantity, valueString, valueCodeableConcept or component)');
  }

  errors.push(...codedValueErrors(observation.valueCodeableConcept));

  errors.push(...ucumErrors(observation.valueQuantity, 'valueQuantity'));
  for (const [i, component] of (observation.component ?? []).entries()) {
    errors.push(...codedValueErrors(component.valueCodeableConcept));
    errors.push(...ucumErrors(component.valueQuantity, `component[${i}].valueQuantity`));
  }
  for (const [i, range] of (observation.referenceRange ?? []).entries()) {
    errors.push(...ucumErrors(range.low, `referenceRange[${i}].low`));
    errors.push(...ucumErrors(range.high, `referenceRange[${i}].high`));
  }

  return errors;
}

/** Se o texto é um `id` de recurso válido no R4. */
export function isValidFhirId(id: string): boolean {
  return FHIR_ID_PATTERN.test(id);
}

/** Elementos obrigatórios por tipo, além de `resourceType`. */
const REQUIRED_BY_TYPE: Record<FHIRResource['resourceType'], readonly string[]> = {
  AllergyIntolerance: ['patient'],
  CarePlan: ['intent', 'status', 'subject'],
  Communication: ['status'],
  Condition: ['subject'],
  Consent: ['category', 'scope', 'status'],
  Device: [],
  DiagnosticReport: ['code', 'status'],
  DocumentReference: ['content', 'status'],
  MedicationStatement: ['status', 'subject'],
  Observation: ['code', 'status'],
  Patient: [],
  RelatedPerson: ['patient'],
  RiskAssessment: ['status', 'subject'],
  Specimen: [],
};

/**
 * Validação estrutural de qualquer recurso que a exportação emite: tipo
 * conhecido, elementos obrigatórios presentes e, para `Observation` e
 * `DiagnosticReport`, as regras específicas de cada um.
 */
export function validateFHIRResource(resource: FHIRResource): string[] {
  const required = REQUIRED_BY_TYPE[resource.resourceType] as readonly string[] | undefined;
  if (!required) return [`Unknown resourceType "${String(resource.resourceType)}"`];
  if (resource.resourceType === 'Observation') return validateFHIRObservation(resource);
  if (resource.resourceType === 'DiagnosticReport') return validateFHIRDiagnosticReport(resource);

  const errors: string[] = [];
  const record = resource as unknown as Record<string, unknown>;
  for (const field of required) {
    const value = record[field];
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      errors.push(`${resource.resourceType}: missing ${field}`);
    }
  }
  return errors;
}

/** Toda `reference` relativa (`Tipo/id`) encontrada num recurso, em qualquer profundidade. */
function collectReferences(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, found);
    return found;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'reference' && typeof nested === 'string') found.push(nested);
      else collectReferences(nested, found);
    }
  }
  return found;
}

/**
 * Confere o que o validador oficial confere sobre um Bundle de coleção e que
 * uma montagem errada quebra em silêncio: todo recurso tem id válido, toda
 * entrada tem `fullUrl` terminando em `Tipo/id`, e toda referência relativa
 * aponta para uma entrada do próprio Bundle. Referências absolutas (`http…`,
 * `urn:`) ficam fora: apontam para fora do arquivo por definição.
 */
export function validateBundleReferences(bundle: FHIRBundle): string[] {
  const errors: string[] = [];
  const addresses = new Set<string>();

  for (const [i, entry] of bundle.entry.entries()) {
    const { fullUrl, resource } = entry;
    const where = `entry[${i}] (${resource.resourceType})`;
    const id = resource.id;
    if (!id) {
      errors.push(`${where}: missing id`);
    } else if (!isValidFhirId(id)) {
      errors.push(`${where}: id "${id}" is not a valid FHIR id`);
    }
    if (!fullUrl) {
      errors.push(`${where}: missing fullUrl`);
    } else if (id && !fullUrl.endsWith(`/${resource.resourceType}/${id}`)) {
      errors.push(`${where}: fullUrl "${fullUrl}" does not end in ${resource.resourceType}/${id}`);
    }
    if (id) addresses.add(`${resource.resourceType}/${id}`);
  }

  for (const [i, entry] of bundle.entry.entries()) {
    for (const reference of collectReferences(entry.resource)) {
      if (/^(https?:|urn:)/.test(reference)) continue;
      if (!addresses.has(reference)) {
        errors.push(
          `entry[${i}] (${entry.resource.resourceType}): reference "${reference}" does not resolve to an entry`,
        );
      }
    }
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
