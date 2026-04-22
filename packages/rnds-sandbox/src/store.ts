/**
 * Store em memória dos cenários carregados no sandbox.
 *
 * Indexa pacientes por CPF e CNS, organizações por CNES e
 * profissionais por CNS. Bundles submetidos via POST /Bundle
 * são acumulados em memória (acessíveis via getSubmittedBundles).
 */

import type {
  Scenario,
  SandboxBundle,
  SandboxOrganization,
  SandboxPatient,
  SandboxPractitioner,
} from './types';

const NS = {
  cns: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
  cnes: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes',
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
