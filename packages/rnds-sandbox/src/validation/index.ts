/**
 * Validação de Bundles FHIR contra os perfis do IG fhir-brasil.
 *
 * O sandbox roteia cada `Bundle.entry[i].resource` para o validador do
 * perfil correspondente baseado no `meta.profile` declarado OU no
 * `resourceType` quando ausente. Resultado é uma lista plana de
 * `ValidationIssue` com `expression`/`location` no formato FHIR.
 *
 * Não cobre o spec inteiro de FHIR validation — foca no subset que a
 * RNDS rejeita na prática (cardinalidade, identifiers brasileiros,
 * coding LOINC/UCUM, value sets de status).
 */

import {
  validateBRDiagnosticReport,
  validateBRLabObservation,
  validateBRPatient,
} from './profiles';
import type { ValidationIssue, ValidationResult } from './types';

const PROFILE_URI = {
  diagnosticReport: 'https://fhir-brasil.dev.br/ig/StructureDefinition/br-diagnostic-report',
  labObservation: 'https://fhir-brasil.dev.br/ig/StructureDefinition/br-lab-observation',
  patient: 'https://fhir-brasil.dev.br/ig/StructureDefinition/br-patient',
} as const;

interface ResourceLike {
  meta?: { profile?: string[] };
  resourceType?: string;
}

interface BundleLike {
  entry?: Array<{ resource?: ResourceLike }>;
  resourceType?: string;
}

export function validateBundle(bundle: unknown, basePath = 'Bundle'): ValidationResult {
  const issues: ValidationIssue[] = [];
  const b = bundle as BundleLike | undefined;
  const entries = b?.entry ?? [];

  entries.forEach((entry, index) => {
    const resource = entry?.resource;
    if (!resource) return;
    const entryPath = `${basePath}.entry[${index}].resource`;
    issues.push(...validateResource(resource, entryPath));
  });

  return { issues, valid: !issues.some((i) => i.severity === 'error' || i.severity === 'fatal') };
}

export function validateResource(resource: ResourceLike, path: string): ValidationIssue[] {
  const declaredProfiles = resource?.meta?.profile ?? [];

  // Quando o cliente declara explicitamente um perfil do IG, validamos contra ele.
  if (declaredProfiles.includes(PROFILE_URI.patient)) {
    return validateBRPatient(resource, path);
  }
  if (declaredProfiles.includes(PROFILE_URI.labObservation)) {
    return validateBRLabObservation(resource, path);
  }
  if (declaredProfiles.includes(PROFILE_URI.diagnosticReport)) {
    return validateBRDiagnosticReport(resource, path);
  }

  // Sem `meta.profile`, fallback por resourceType para os tipos cobertos.
  switch (resource?.resourceType) {
    case 'Patient':
      return validateBRPatient(resource, path);
    case 'Observation':
      // BRLabObservation só se aplica a observações laboratoriais. Vital-signs,
      // social-history etc. usam outros perfis e seriam rejeitados injustamente
      // se forçados ao perfil BR.
      //
      // Heurística: aplicar BR apenas quando `category.coding` contém o código
      // `laboratory`. Caso contrário (categoria diferente, OU sem categoria
      // alguma — possível em dados legados), o recurso passa sem checagem de
      // perfil. Esse silêncio é deliberado: rejeitar Observations sem
      // category implicaria adivinhar a intenção do cliente.
      //
      // Para garantir conformidade estrita em ambos os casos, declare
      // `meta.profile` apontando para `br-lab-observation`.
      return looksLikeLabObservation(resource) ? validateBRLabObservation(resource, path) : [];
    case 'DiagnosticReport':
      return validateBRDiagnosticReport(resource, path);
    default:
      // Outros tipos passam sem validação de perfil — é responsabilidade do
      // chamador declarar `meta.profile` se quiser conformidade estrita.
      return [];
  }
}

const SYS_OBS_CATEGORY = 'http://terminology.hl7.org/CodeSystem/observation-category';

function looksLikeLabObservation(resource: unknown): boolean {
  const r = resource as { category?: { coding?: { system?: string; code?: string }[] }[] };
  const cats = r?.category;
  if (!Array.isArray(cats)) return false;
  return cats.some((cat) =>
    (cat?.coding ?? []).some((c) => c?.system === SYS_OBS_CATEGORY && c?.code === 'laboratory'),
  );
}

export {
  validateBRDiagnosticReport,
  validateBRLabObservation,
  validateBRPatient,
} from './profiles';
export type { IssueSeverity, ValidationIssue, ValidationResult } from './types';
