import { describe, expect, it } from 'vitest';

import { codeToLoinc, loincToCode } from '../biomarkers';
import { labObservationToFHIR } from '../converter';
import { mapFHIRObservationToInternal } from '../importer';
import { getMappingSheet } from '../mapping-sheet';

describe('estrona sem fração especificada', () => {
  it('exporta 2258-2 e importa uma observação externa só com esse LOINC', () => {
    const observation = labObservationToFHIR(
      {
        biomarkerCode: 'Estrone',
        biomarkerName: 'Estrona',
        collectionDate: '2026-10-09',
        flag: '',
        isQualitative: false,
        reportId: 'r1',
        unit: 'pg/mL',
        value: 42,
      },
      'patient-1',
    );
    const loinc = observation.code.coding.find((c) => c.system === 'http://loinc.org');
    expect(loinc?.code).toBe('2258-2');
    expect(observation.valueQuantity).toMatchObject({ code: 'pg/mL', value: 42 });

    // Sem código local ou texto: a importação precisa resolver pelo LOINC.
    const imported = mapFHIRObservationToInternal(
      {
        ...observation,
        code: { coding: [{ system: 'http://loinc.org', code: '2258-2' }] },
      },
      0,
    );
    expect(imported).toMatchObject({
      observation: { biomarkerCode: 'Estrone', loincCode: '2258-2', unit: 'pg/mL', value: 42 },
    });
  });

  it('não trata frações específicas ou concentração molar como aliases', () => {
    expect(codeToLoinc('Estrone')).toBe('2258-2');
    for (const code of ['2261-6', '15355-1', '22663-9']) {
      expect(loincToCode(code)).toBeUndefined();
    }
  });

  it('expõe os eixos que distinguem os candidatos e retira a justificativa de ausência', () => {
    const sheet = getMappingSheet('2258-2');
    expect(sheet?.noLoinc).toBeUndefined();
    expect(sheet?.candidates.find((c) => c.role === 'chosen')?.axes).toMatchObject({
      component: 'Estrone',
      property: 'MCnc',
      system: 'Ser/Plas',
      scale: 'Qn',
      time: 'Pt',
      method: null,
      status: 'ACTIVE',
    });
    expect(sheet?.candidates.find((c) => c.loinc === '2261-6')?.axes?.component).toBe(
      'Estrone.unconjugated',
    );
    expect(sheet?.decision?.reviewer).toBeUndefined();
  });
});
