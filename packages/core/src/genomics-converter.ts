/**
 * Painel nutrigenômico em FHIR, no padrão de componentes do Genomics
 * Reporting IG do HL7: uma `Observation` por variante, com o gene, o `rs…` do
 * dbSNP e o estado alélico em componentes, e um `DiagnosticReport` do painel
 * apontando para elas.
 *
 * O genótipo bruto (`AG`) e o nível de risco do catálogo saem em componentes
 * com código local, porque o IG não tem lugar para eles e inventar um LOINC
 * seria pior. `MolecularSequence` não entra: o arquivo bruto vai inteiro como
 * `DocumentReference` (ver `document-converter.ts`).
 */

import { type Addressable } from './bundle-urls';
import { DBSNP_SYSTEM } from './code-systems';
import { V2_0074_SYSTEM } from './diagnostic-sections';
import { exportLoincAnswerCoding, localCoding, requireExportLoinc } from './export-codes';
import { fhirResourceId, patientReference } from './export-helpers';
import type {
  FHIRCodeableConcept,
  FHIRDiagnosticReport,
  FHIRObservation,
  FHIRObservationComponent,
} from './fhir-types';
import type { GeneticProfileData, GeneticSnpData } from './types';

/** `GE` da v2-0074, a seção de genética, usada como categoria dos dois recursos. */
const GENETICS_CATEGORY: FHIRCodeableConcept[] = [
  { coding: [{ code: 'GE', display: 'Genetics', system: V2_0074_SYSTEM }] },
];

/**
 * Estado alélico a partir do genótipo: dois alelos iguais, homozigoto; dois
 * diferentes, heterozigoto. Genótipo fora do padrão de duas bases (`--`, `I/D`)
 * fica sem estado, em vez de um chute.
 */
function allelicState(genotype: string): FHIRObservationComponent | undefined {
  const bases = genotype.toUpperCase();
  if (!/^[ACGT]{2}$/.test(bases)) return undefined;
  const use = bases[0] === bases[1] ? 'allelicHomozygous' : 'allelicHeterozygous';
  return {
    code: requireExportLoinc('allelicState'),
    valueCodeableConcept: { coding: [exportLoincAnswerCoding(use)] },
  };
}

/** Uma variante como `Observation` de avaliação de variante genética. */
export function geneticSnpToFHIRObservation(
  snp: GeneticSnpData,
  patientId: string,
  options: { issuedAt?: string } = {},
): Addressable<FHIRObservation> {
  const component: FHIRObservationComponent[] = [];
  if (snp.gene) {
    component.push({
      code: requireExportLoinc('geneStudied'),
      valueCodeableConcept: { text: snp.gene },
    });
  }
  component.push({
    code: requireExportLoinc('discreteGeneticVariant'),
    valueCodeableConcept: { coding: [{ code: snp.rsId, system: DBSNP_SYSTEM }], text: snp.rsId },
  });
  const state = allelicState(snp.genotype);
  if (state) component.push(state);
  component.push({ code: { coding: [localCoding('genotype')] }, valueString: snp.genotype });
  if (snp.riskLevel) {
    component.push({
      code: { coding: [localCoding('geneticRiskLevel')] },
      valueString: snp.riskLevel,
    });
  }

  const note = [snp.implication, snp.recommendation]
    .filter((text): text is string => Boolean(text))
    .map((text) => ({ text }));

  return {
    category: GENETICS_CATEGORY,
    code: requireExportLoinc('geneticVariantAssessment'),
    component,
    id: fhirResourceId('snp', snp.profileId, snp.rsId),
    ...(options.issuedAt ? { issued: options.issuedAt } : {}),
    ...(note.length > 0 ? { note } : {}),
    resourceType: 'Observation',
    status: 'final',
    subject: patientReference(patientId),
    // O arquivo traz o genótipo, não um resultado com valor próprio: o conteúdo
    // está nos componentes, e `valueString` repete o genótipo para o recurso
    // não sair sem valor, como o validador deste pacote exige.
    valueString: snp.genotype,
  };
}

/**
 * O painel genético como `DiagnosticReport`, com o arquivo de origem descrito
 * na conclusão: nome, formato, build do genoma e contagem de marcadores.
 */
export function geneticProfileToFHIRDiagnosticReport(
  profile: GeneticProfileData,
  observationIds: readonly string[],
  patientId: string,
): Addressable<FHIRDiagnosticReport> {
  const details = [
    profile.fileName && `arquivo ${profile.fileName}`,
    profile.format && `formato ${profile.format}`,
    profile.genomeBuild && `build ${profile.genomeBuild}`,
    profile.markerCount !== undefined && `${profile.markerCount} marcadores`,
  ].filter((part): part is string => typeof part === 'string');

  return {
    category: GENETICS_CATEGORY,
    code: requireExportLoinc('geneticReportPanel'),
    ...(details.length > 0 ? { conclusion: `Painel nutrigenômico: ${details.join(', ')}.` } : {}),
    effectiveDateTime: profile.uploadedAt,
    id: fhirResourceId('genetic-report', profile.profileId),
    identifier: [{ system: 'urn:precisa-saude:genetic-profile', value: profile.profileId }],
    issued: profile.uploadedAt,
    resourceType: 'DiagnosticReport',
    result: observationIds.map((id) => ({ reference: `Observation/${id}` })),
    status: 'final',
    subject: patientReference(patientId),
  };
}
