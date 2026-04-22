/**
 * Store em memória dos cenários carregados no sandbox.
 *
 * Indexa pacientes por CPF e CNS, organizações por CNES e
 * profissionais por CNS. Bundles submetidos via POST /Bundle
 * são acumulados em memória (acessíveis via getSubmittedBundles).
 */

import type {
  SandboxBundle,
  SandboxOrganization,
  SandboxPatient,
  SandboxPractitioner,
  SandboxResource,
  Scenario,
} from './types';

const NS = {
  cnes: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes',
  cns: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
  cpf: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
} as const;

export class SandboxStore {
  private patientsByCpf = new Map<string, SandboxPatient>();
  private patientsByCns = new Map<string, SandboxPatient>();
  private organizationsByCnes = new Map<string, SandboxOrganization>();
  private practitionersByCns = new Map<string, SandboxPractitioner>();
  private submittedBundles: SandboxBundle[] = [];

  load(scenario: Scenario): void {
    this.reset();
    for (const patient of scenario.data.patients) {
      this.indexPatient(patient);
    }
    for (const org of scenario.data.organizations) {
      this.indexOrganization(org);
    }
    for (const pract of scenario.data.practitioners) {
      this.indexPractitioner(pract);
    }
    for (const bundle of scenario.data.submittedBundles ?? []) {
      this.submittedBundles.push(bundle);
    }
  }

  reset(): void {
    this.patientsByCpf.clear();
    this.patientsByCns.clear();
    this.organizationsByCnes.clear();
    this.practitionersByCns.clear();
    this.submittedBundles = [];
  }

  findPatientByCpf(cpf: string): SandboxPatient | undefined {
    return this.patientsByCpf.get(stripFormatting(cpf));
  }

  findPatientByCns(cns: string): SandboxPatient | undefined {
    return this.patientsByCns.get(stripFormatting(cns));
  }

  findOrganizationByCnes(cnes: string): SandboxOrganization | undefined {
    return this.organizationsByCnes.get(stripFormatting(cnes));
  }

  findPractitionerByCns(cns: string): SandboxPractitioner | undefined {
    return this.practitionersByCns.get(stripFormatting(cns));
  }

  recordBundle(bundle: SandboxBundle): void {
    this.submittedBundles.push(bundle);
  }

  getSubmittedBundles(): readonly SandboxBundle[] {
    return this.submittedBundles;
  }

  /**
   * Lista todos os recursos de um tipo presentes nos bundles submetidos
   * (incluindo os pré-carregados pelo cenário). Usado pelos endpoints
   * de busca FHIR (`GET /Observation?subject=...`, etc.).
   */
  listResourcesByType(resourceType: string): SandboxResource[] {
    const out: SandboxResource[] = [];
    for (const bundle of this.submittedBundles) {
      for (const entry of bundle.entry ?? []) {
        if (entry.resource && entry.resource.resourceType === resourceType) {
          out.push(entry.resource);
        }
      }
    }
    return out;
  }

  /**
   * Filtra recursos cujo `subject.reference` ou `patient.reference`
   * aponta para o paciente indicado (aceita tanto `Patient/{cns}` quanto
   * apenas o CNS sem prefixo).
   */
  searchResourcesByPatient(resourceType: string, patientCns: string): SandboxResource[] {
    const cns = stripFormatting(patientCns);
    const candidates = [`Patient/${cns}`, cns];
    return this.listResourcesByType(resourceType).filter((resource) => {
      const subjectRef = readReference(resource.subject);
      const patientRef = readReference(resource.patient);
      return (
        (subjectRef && referenceMatches(subjectRef, candidates)) ||
        (patientRef && referenceMatches(patientRef, candidates))
      );
    });
  }

  private indexPatient(patient: SandboxPatient): void {
    const cns = patient.id ?? findIdentifier(patient.identifier, NS.cns);
    if (cns) {
      this.patientsByCns.set(stripFormatting(cns), patient);
    }
    const cpf = findIdentifier(patient.identifier, NS.cpf);
    if (cpf) {
      this.patientsByCpf.set(stripFormatting(cpf), patient);
    }
  }

  private indexOrganization(org: SandboxOrganization): void {
    const cnes = org.id ?? findIdentifier(org.identifier, NS.cnes);
    if (cnes) {
      this.organizationsByCnes.set(stripFormatting(cnes), org);
    }
  }

  private indexPractitioner(pract: SandboxPractitioner): void {
    const cns = pract.id ?? findIdentifier(pract.identifier, NS.cns);
    if (cns) {
      this.practitionersByCns.set(stripFormatting(cns), pract);
    }
  }
}

function findIdentifier(
  ids: { system?: string; value?: string }[] | undefined,
  system: string,
): string | undefined {
  return ids?.find((id) => id.system === system)?.value;
}

function stripFormatting(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, '');
}

function readReference(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const ref = (value as { reference?: unknown }).reference;
  return typeof ref === 'string' ? ref : undefined;
}

function referenceMatches(ref: string, candidates: readonly string[]): boolean {
  // Aceita "Patient/{cns}" exato OU apenas o CNS no final do reference.
  for (const candidate of candidates) {
    if (ref === candidate) return true;
    if (ref.endsWith(`/${candidate}`)) return true;
  }
  return false;
}
