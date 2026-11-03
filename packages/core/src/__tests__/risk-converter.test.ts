import { describe, expect, it } from 'vitest';

import { FHIR_BRASIL_LOCAL_CODE_SYSTEM, ICD10_SYSTEM } from '../code-systems';
import { brDMriscToFHIRRiskAssessment, phenoAgeToFHIRObservation } from '../risk-converter';
import { validateFHIRResource } from '../validators';

const patientId = 'user-1';

describe('phenoAgeToFHIRObservation', () => {
  it('idade fenotípica em anos, com cronológica, diferença e escore em componentes', () => {
    const observation = phenoAgeToFHIRObservation(
      {
        ageDifference: -3.2,
        calculatedAt: '2026-01-15T12:00:00Z',
        chronologicalAge: 41,
        mortalityScore: 0.012,
        phenoAge: 37.8,
        resultId: 'res-1',
      },
      patientId,
    );
    expect(observation.id).toBe('phenoage-res-1');
    expect(observation.category?.[0]?.coding?.[0]?.code).toBe('survey');
    expect(observation.code.coding?.[0]).toMatchObject({
      code: 'phenoage',
      system: FHIR_BRASIL_LOCAL_CODE_SYSTEM,
    });
    expect(observation.valueQuantity).toEqual({
      code: 'a',
      system: 'http://unitsofmeasure.org',
      unit: 'anos',
      value: 37.8,
    });
    expect(
      observation.component?.map((c) => [c.code.coding?.[0]?.code, c.valueQuantity?.value]),
    ).toEqual([
      ['30525-0', 41],
      ['phenoage-difference', -3.2],
      ['phenoage-mortality-score', 0.012],
    ]);
    expect(observation.effectiveDateTime).toBe('2026-01-15T12:00:00Z');
    expect(validateFHIRResource(observation)).toEqual([]);
  });
});

describe('brDMriscToFHIRRiskAssessment', () => {
  it('previsão de diabetes tipo 2 em 10 anos, com base nas Observation informadas', () => {
    const assessment = brDMriscToFHIRRiskAssessment(
      {
        basisObservationIds: ['rep-1-Glucose', 'rep-1-HbA1c'],
        calculatedAt: '2026-01-15T12:00:00Z',
        modelUsed: 'BRDMRISC v2',
        resultId: 'risk-1',
        risk10y: 0.18,
        riskCategory: 'moderado',
      },
      patientId,
    );
    expect(assessment).toMatchObject({
      basis: [{ reference: 'Observation/rep-1-Glucose' }, { reference: 'Observation/rep-1-HbA1c' }],
      id: 'brdmrisc-risk-1',
      method: { text: 'BRDMRISC v2' },
      occurrenceDateTime: '2026-01-15T12:00:00Z',
      status: 'final',
      subject: { reference: 'Patient/user-1' },
    });
    const [prediction] = assessment.prediction ?? [];
    expect(prediction?.outcome?.coding?.[0]).toEqual({
      code: 'E11',
      display: 'Diabetes mellitus não-insulino-dependente',
      system: ICD10_SYSTEM,
    });
    expect(prediction?.probabilityDecimal).toBe(0.18);
    expect(prediction?.qualitativeRisk).toEqual({ text: 'moderado' });
    expect(prediction?.whenRange?.high).toMatchObject({ code: 'a', value: 10 });
    expect(validateFHIRResource(assessment)).toEqual([]);
  });

  it('sem base nem modelo, os campos ficam de fora em vez de vazios', () => {
    const assessment = brDMriscToFHIRRiskAssessment(
      {
        calculatedAt: '2026-01-15T12:00:00Z',
        resultId: 'risk-2',
        risk10y: 0.05,
        riskCategory: 'baixo',
      },
      patientId,
    );
    expect(assessment.basis).toBeUndefined();
    expect(assessment.method).toBeUndefined();
  });
});
