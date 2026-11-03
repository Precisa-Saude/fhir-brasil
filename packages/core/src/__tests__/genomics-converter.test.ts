import { describe, expect, it } from 'vitest';

import { DBSNP_SYSTEM, FHIR_BRASIL_LOCAL_CODE_SYSTEM } from '../code-systems';
import { V2_0074_SYSTEM } from '../diagnostic-sections';
import {
  geneticProfileToFHIRDiagnosticReport,
  geneticSnpToFHIRObservation,
} from '../genomics-converter';
import type { GeneticSnpData } from '../types';
import { validateFHIRResource } from '../validators';

const patientId = 'user-1';

const snp: GeneticSnpData = {
  category: 'metabolismo',
  gene: 'MTHFR',
  genotype: 'AG',
  implication: 'Atividade enzimática reduzida.',
  profileId: 'prof-1',
  recommendation: 'Conferir folato e B12.',
  riskLevel: 'moderate',
  rsId: 'rs1801133',
};

describe('geneticSnpToFHIRObservation', () => {
  it('gene, variante dbSNP, estado alélico, genótipo e risco em componentes', () => {
    const observation = geneticSnpToFHIRObservation(snp, patientId, {
      issuedAt: '2026-01-10T00:00:00Z',
    });
    expect(observation.id).toBe('snp-prof-1-rs1801133');
    expect(observation.code.coding?.[0]?.code).toBe('69548-6');
    expect(observation.category?.[0]?.coding?.[0]).toMatchObject({
      code: 'GE',
      system: V2_0074_SYSTEM,
    });
    const components = Object.fromEntries(
      (observation.component ?? []).map((c) => [
        c.code.coding?.[0]?.code,
        c.valueCodeableConcept ?? c.valueString,
      ]),
    );
    expect(components['48018-6']).toEqual({ text: 'MTHFR' });
    expect(components['81252-9']).toEqual({
      coding: [{ code: 'rs1801133', system: DBSNP_SYSTEM }],
      text: 'rs1801133',
    });
    expect(components['53034-5']).toMatchObject({
      coding: [{ code: 'LA6706-1', display: 'Heterozygous' }],
    });
    expect(components.genotype).toBe('AG');
    expect(components['genetic-risk-level']).toBe('moderate');
    expect(observation.note?.map((n) => n.text)).toEqual([
      'Atividade enzimática reduzida.',
      'Conferir folato e B12.',
    ]);
    expect(observation.issued).toBe('2026-01-10T00:00:00Z');
    expect(observation.valueString).toBe('AG');
    expect(validateFHIRResource(observation)).toEqual([]);
  });

  it('genótipo com duas bases iguais é homozigoto; fora do padrão fica sem estado alélico', () => {
    const homo = geneticSnpToFHIRObservation({ ...snp, genotype: 'tt' }, patientId);
    expect(
      homo.component?.find((c) => c.code.coding?.[0]?.code === '53034-5')?.valueCodeableConcept
        ?.coding?.[0]?.code,
    ).toBe('LA6705-3');

    const indel = geneticSnpToFHIRObservation({ ...snp, genotype: 'I/D' }, patientId);
    expect(indel.component?.some((c) => c.code.coding?.[0]?.code === '53034-5')).toBe(false);
  });

  it('sem gene, risco nem notas, só variante e genótipo saem', () => {
    const minimal = geneticSnpToFHIRObservation(
      { genotype: 'CC', profileId: 'prof-1', rsId: 'rs429358' },
      patientId,
    );
    expect(minimal.component?.map((c) => c.code.coding?.[0]?.code)).toEqual([
      '81252-9',
      '53034-5',
      'genotype',
    ]);
    expect(minimal.note).toBeUndefined();
    expect(minimal.component?.[2]?.code.coding?.[0]?.system).toBe(FHIR_BRASIL_LOCAL_CODE_SYSTEM);
  });
});

describe('geneticProfileToFHIRDiagnosticReport', () => {
  it('painel com as variantes em result e o arquivo descrito na conclusão', () => {
    const report = geneticProfileToFHIRDiagnosticReport(
      {
        fileName: 'genome.txt',
        format: '23andMe',
        genomeBuild: 'GRCh37',
        markerCount: 600000,
        profileId: 'prof-1',
        uploadedAt: '2026-01-10T00:00:00Z',
      },
      ['snp-prof-1-rs1801133', 'snp-prof-1-rs429358'],
      patientId,
    );
    expect(report.id).toBe('genetic-report-prof-1');
    expect(report.code.coding?.[0]?.code).toBe('81247-9');
    expect(report.conclusion).toBe(
      'Painel nutrigenômico: arquivo genome.txt, formato 23andMe, build GRCh37, 600000 marcadores.',
    );
    expect(report.result).toEqual([
      { reference: 'Observation/snp-prof-1-rs1801133' },
      { reference: 'Observation/snp-prof-1-rs429358' },
    ]);
    expect(report.identifier?.[0]?.value).toBe('prof-1');
    expect(validateFHIRResource(report)).toEqual([]);
  });

  it('sem detalhes do arquivo, não há conclusão', () => {
    const report = geneticProfileToFHIRDiagnosticReport(
      { profileId: 'prof-2', uploadedAt: '2026-01-10T00:00:00Z' },
      [],
      patientId,
    );
    expect(report.conclusion).toBeUndefined();
    expect(report.result).toEqual([]);
  });
});
