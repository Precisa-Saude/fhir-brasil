import { describe, expect, it } from 'vitest';

import { codeToLoinc, isValidLoinc, loincToCode, loincToCodeAt } from '../biomarkers';
import { BIOMARKER_CODE_SYSTEM, LOINC_SYSTEM } from '../code-systems';
import { labObservationToFHIR } from '../converter';
import type { FHIRObservation } from '../fhir-types';
import { mapFHIRObservationToInternal } from '../importer';
import { SNOMED_SYSTEM } from '../ordinal-answers';

/**
 * Densidade óssea por DXA: oito regiões do corpo inteiro no mesmo LOINC
 * (46383-6, sítio não especificado), com a região em `Observation.bodySite`
 * (PRE-494). O código sozinho nunca escolhe a região.
 */
describe('densidade óssea por região', () => {
  it('o LOINC é válido e cada região volta para o 46383-6', () => {
    expect(isValidLoinc('46383-6')).toBe(true);
    expect(codeToLoinc('BMD_Arms')).toBe('46383-6');
    expect(codeToLoinc('BMD_Spine')).toBe('46383-6');
  });

  it('sem região, o LOINC não resolve para nenhuma', () => {
    expect(loincToCode('46383-6')).toBeUndefined();
    expect(loincToCodeAt('46383-6')).toBeUndefined();
    expect(loincToCodeAt('46383-6', '00000000')).toBeUndefined();
  });

  it('com a região, resolve para a entrada daquela região', () => {
    expect(loincToCodeAt('46383-6', '371195002')).toBe('BMD_Arms');
    expect(loincToCodeAt('46383-6', '51282000')).toBe('BMD_Spine');
    expect(loincToCodeAt('2345-7')).toBe('Glucose');
  });

  it('o conversor leva a região em bodySite', () => {
    const observation = labObservationToFHIR(
      {
        biomarkerCode: 'BMD_Legs',
        biomarkerName: 'DMO Pernas',
        flag: '',
        reportId: 'r1',
        unit: 'g/cm²',
        value: 1.21,
      },
      'p1',
    );
    expect(observation.bodySite?.coding).toEqual([
      { code: '72001000', display: 'Bone structure of lower limb', system: SNOMED_SYSTEM },
    ]);
    expect(observation.code.coding?.find((c) => c.system === LOINC_SYSTEM)?.code).toBe('46383-6');
  });

  const imported = (coding: FHIRObservation['code']['coding'], bodySite?: string) =>
    mapFHIRObservationToInternal(
      {
        ...(bodySite && { bodySite: { coding: [{ code: bodySite, system: SNOMED_SYSTEM }] } }),
        code: { coding },
        effectiveDateTime: '2026-10-01',
        resourceType: 'Observation',
        status: 'final',
        valueQuantity: { unit: 'g/cm²', value: 1.1 },
      },
      0,
    );

  it('o importador resolve pelo LOINC com a região', () => {
    const result = imported([{ code: '46383-6', system: LOINC_SYSTEM }], '113197003');
    expect('observation' in result && result.observation.biomarkerCode).toBe('BMD_Ribs');
  });

  it('o importador usa o código do catálogo quando ele vem junto', () => {
    const result = imported([
      { code: '46383-6', system: LOINC_SYSTEM },
      { code: 'BMD_Pelvis', system: BIOMARKER_CODE_SYSTEM },
    ]);
    expect('observation' in result && result.observation.biomarkerCode).toBe('BMD_Pelvis');
  });

  it('sem região nem código do catálogo, o importador descarta em vez de chutar', () => {
    const result = imported([{ code: '46383-6', system: LOINC_SYSTEM }]);
    expect('skipped' in result).toBe(true);
  });
});
