import { describe, expect, it } from 'vitest';

import { codeToLoinc, findCodeByName, loincToCode } from '../biomarkers';
import { labObservationToFHIR } from '../converter';
import { mapFHIRObservationToInternal } from '../importer';
import { getMappingSheet } from '../mapping-sheet';

// Valores sintéticos; o laudo usado na auditoria não integra os fixtures.
function exportMass(biomarkerCode: string, biomarkerName: string, value: number) {
  return labObservationToFHIR(
    {
      biomarkerCode,
      biomarkerName,
      collectionDate: '2026-10-09',
      flag: '',
      isQualitative: false,
      reportId: 'r1',
      unit: 'kg',
      value,
    },
    'patient-1',
  );
}

describe('massa livre de gordura inclui mineral ósseo', () => {
  it('exporta e importa 91557-9 sem depender do nome ou código local', () => {
    const observation = exportMass('FatFreeMass', 'Fat Free', 60);
    expect(observation.code.coding).toContainEqual(
      expect.objectContaining({ system: 'http://loinc.org', code: '91557-9' }),
    );
    expect(observation.valueQuantity).toMatchObject({ code: 'kg', value: 60 });
    expect(
      mapFHIRObservationToInternal(
        {
          ...observation,
          code: { coding: [{ system: 'http://loinc.org', code: '91557-9' }] },
        },
        0,
      ),
    ).toMatchObject({
      observation: { biomarkerCode: 'FatFreeMass', loincCode: '91557-9', unit: 'kg', value: 60 },
    });
  });

  it('mantém tecido magro e BMC separados da massa livre de gordura no FHIR', () => {
    expect(findCodeByName('Fat Free')).toBe('FatFreeMass');
    expect(findCodeByName('Total Lean')).toBe('LeanMass');
    expect(loincToCode('91557-9')).toBe('FatFreeMass');
    for (const [code, name, value] of [
      ['LeanMass', 'Total Lean', 57],
      ['BMC', 'Bone Mineral Content', 3],
    ] as const) {
      expect(codeToLoinc(code)).toBeUndefined();
      const observation = exportMass(code, name, value);
      expect(observation.code.coding.some((c) => c.system === 'http://loinc.org')).toBe(false);
      expect(observation.valueQuantity?.value).toBe(value);
    }
  });

  it('registra a definição e mantém o canônico sem método e sem revisão independente', () => {
    const sheet = getMappingSheet('FatFreeMass');
    expect(sheet?.noLoinc).toBeUndefined();
    expect(sheet?.candidates.find((c) => c.role === 'chosen')?.axes).toMatchObject({
      component: 'Lean body weight',
      property: 'Mass',
      system: '^Patient',
      scale: 'Qn',
      time: 'Pt',
      method: null,
      status: 'ACTIVE',
    });
    expect(sheet?.candidates.find((c) => c.loinc === '88334-8')?.axes?.method).toBe('Calculated');
    expect(sheet?.decision?.settledBy).toBe('method-line');
    expect(sheet?.decision?.reviewer).toBeUndefined();
  });
});
