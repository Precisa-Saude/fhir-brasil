/**
 * Validadores de perfil para os recursos cobertos pelo IG do fhir-brasil
 * (BRPatient, BRLabObservation, BRDiagnosticReport).
 *
 * As regras espelham as restrições do FSH em `ig/input/fsh/profiles/`.
 * Não pretendem ser uma implementação completa de FHIR validation —
 * cobrem o que a RNDS real rejeita na prática para esses três perfis.
 */

import { get, issue, requireField, requireMinCardinality, requireOneOf } from './helpers';
import type { ValidationIssue } from './types';

// ============================================================================
// Constantes do IG (alinhadas com aliases.fsh / sushi-config.yaml)
// ============================================================================

const NS_CPF = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf';
const NS_CNS = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns';
const SYS_LOINC = 'http://loinc.org';
const SYS_UCUM = 'http://unitsofmeasure.org';
const SYS_OBS_CATEGORY = 'http://terminology.hl7.org/CodeSystem/observation-category';
const SYS_V2_0074 = 'http://terminology.hl7.org/CodeSystem/v2-0074';

const PATIENT_GENDERS = ['male', 'female', 'other', 'unknown'] as const;
const LAB_OBS_STATUS = ['final', 'amended', 'corrected'] as const;
const DIAG_REPORT_STATUS = ['final', 'amended', 'corrected'] as const;

// ============================================================================
// BRPatient
// ============================================================================

export function validateBRPatient(resource: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const identifiers = get<unknown[]>(resource, 'identifier');
  issues.push(...requireMinCardinality(identifiers, 1, 'Patient.identifier', `${path}.identifier`));

  if (Array.isArray(identifiers)) {
    const hasBrazilianId = identifiers.some((id) => {
      const sys = get<string>(id, 'system');
      return sys === NS_CPF || sys === NS_CNS;
    });
    if (!hasBrazilianId) {
      issues.push(
        issue(
          'error',
          'invariant',
          'Patient deve ter pelo menos um identificador CPF ou CNS (br-patient-identifier)',
          `${path}.identifier`,
        ),
      );
    }
  }

  const names = get<unknown[]>(resource, 'name');
  issues.push(...requireMinCardinality(names, 1, 'Patient.name', `${path}.name`));

  issues.push(
    ...requireField(get(resource, 'birthDate'), 'Patient.birthDate', `${path}.birthDate`),
  );
  const gender = get(resource, 'gender');
  issues.push(...requireField(gender, 'Patient.gender', `${path}.gender`));
  if (gender !== undefined) {
    issues.push(...requireOneOf(gender, PATIENT_GENDERS, 'Patient.gender', `${path}.gender`));
  }

  return issues;
}

// ============================================================================
// BRLabObservation
// ============================================================================

export function validateBRLabObservation(resource: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const status = get(resource, 'status');
  issues.push(...requireField(status, 'Observation.status', `${path}.status`));
  if (status !== undefined) {
    issues.push(...requireOneOf(status, LAB_OBS_STATUS, 'Observation.status', `${path}.status`));
  }

  const categories = get<unknown[]>(resource, 'category');
  issues.push(...requireMinCardinality(categories, 1, 'Observation.category', `${path}.category`));
  if (Array.isArray(categories)) {
    const hasLab = categories.some((cat) => {
      const codings = get<unknown[]>(cat, 'coding');
      return (
        Array.isArray(codings) &&
        codings.some(
          (c) =>
            get<string>(c, 'system') === SYS_OBS_CATEGORY &&
            get<string>(c, 'code') === 'laboratory',
        )
      );
    });
    if (!hasLab) {
      issues.push(
        issue(
          'error',
          'invalid',
          'Observation.category deve incluir { system: observation-category, code: laboratory }',
          `${path}.category`,
        ),
      );
    }
  }

  const code = get(resource, 'code');
  issues.push(...requireField(code, 'Observation.code', `${path}.code`));
  if (code) {
    const codings = get<unknown[]>(code, 'coding');
    const hasLoinc =
      Array.isArray(codings) && codings.some((c) => get<string>(c, 'system') === SYS_LOINC);
    if (!hasLoinc) {
      issues.push(
        issue(
          'error',
          'required',
          'Observation.code.coding deve incluir um coding com system http://loinc.org',
          `${path}.code.coding`,
        ),
      );
    }
  }

  const value = get(resource, 'valueQuantity');
  issues.push(...requireField(value, 'Observation.valueQuantity', `${path}.valueQuantity`));
  if (value) {
    issues.push(
      ...requireField(get(value, 'value'), 'valueQuantity.value', `${path}.valueQuantity.value`),
    );
    issues.push(
      ...requireField(get(value, 'unit'), 'valueQuantity.unit', `${path}.valueQuantity.unit`),
    );
    const sys = get(value, 'system');
    if (sys !== undefined && sys !== SYS_UCUM) {
      issues.push(
        issue(
          'error',
          'invalid',
          `valueQuantity.system deve ser ${SYS_UCUM}; recebido "${String(sys)}"`,
          `${path}.valueQuantity.system`,
        ),
      );
    }
  }

  issues.push(...requireField(get(resource, 'subject'), 'Observation.subject', `${path}.subject`));
  issues.push(
    ...requireField(
      get(resource, 'effectiveDateTime'),
      'Observation.effectiveDateTime',
      `${path}.effectiveDateTime`,
    ),
  );

  return issues;
}

// ============================================================================
// BRDiagnosticReport
// ============================================================================

export function validateBRDiagnosticReport(resource: unknown, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const status = get(resource, 'status');
  issues.push(...requireField(status, 'DiagnosticReport.status', `${path}.status`));
  if (status !== undefined) {
    issues.push(
      ...requireOneOf(status, DIAG_REPORT_STATUS, 'DiagnosticReport.status', `${path}.status`),
    );
  }

  const categories = get<unknown[]>(resource, 'category');
  issues.push(
    ...requireMinCardinality(categories, 1, 'DiagnosticReport.category', `${path}.category`),
  );
  if (Array.isArray(categories)) {
    const hasLab = categories.some((cat) => {
      const codings = get<unknown[]>(cat, 'coding');
      return (
        Array.isArray(codings) &&
        codings.some(
          (c) => get<string>(c, 'system') === SYS_V2_0074 && get<string>(c, 'code') === 'LAB',
        )
      );
    });
    if (!hasLab) {
      issues.push(
        issue(
          'error',
          'invalid',
          'DiagnosticReport.category deve incluir { system: v2-0074, code: LAB }',
          `${path}.category`,
        ),
      );
    }
  }

  issues.push(...requireField(get(resource, 'code'), 'DiagnosticReport.code', `${path}.code`));
  issues.push(
    ...requireField(get(resource, 'subject'), 'DiagnosticReport.subject', `${path}.subject`),
  );
  issues.push(
    ...requireField(
      get(resource, 'effectiveDateTime'),
      'DiagnosticReport.effectiveDateTime',
      `${path}.effectiveDateTime`,
    ),
  );
  const results = get<unknown[]>(resource, 'result');
  issues.push(...requireMinCardinality(results, 1, 'DiagnosticReport.result', `${path}.result`));
  const performers = get<unknown[]>(resource, 'performer');
  issues.push(
    ...requireMinCardinality(performers, 1, 'DiagnosticReport.performer', `${path}.performer`),
  );

  return issues;
}
