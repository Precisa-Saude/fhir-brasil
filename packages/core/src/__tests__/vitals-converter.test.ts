import { describe, expect, it } from 'vitest';

import { FHIR_BRASIL_LOCAL_CODE_SYSTEM, ICD10_SYSTEM, LOINC_SYSTEM } from '../code-systems';
import type { FHIRCondition, FHIRMedicationStatement, FHIRObservation } from '../fhir-types';
import { isUcumCode } from '../units';
import { validateFHIRResource } from '../validators';
import {
  dietaryProfileToFHIR,
  healthConditionsToFHIR,
  ICD10_CODES,
  vitalsToFHIRObservations,
} from '../vitals-converter';

const patientId = 'user-1';

describe('vitalsToFHIRObservations', () => {
  it('emite uma Observation por medida informada, com LOINC e UCUM', () => {
    const observations = vitalsToFHIRObservations(
      {
        bloodPressure: { diastolic: 80, systolic: 120 },
        heightCm: 175,
        measuredAt: '2026-01-15T10:00:00Z',
        waistCm: 90,
        weightKg: 72.5,
      },
      patientId,
    );
    expect(observations.map((o) => o.code.coding?.[0]?.code)).toEqual([
      '8302-2',
      '29463-7',
      '8280-0',
      '85354-9',
    ]);
    for (const observation of observations) {
      expect(observation.category?.[0]?.coding?.[0]?.code).toBe('vital-signs');
      expect(observation.subject).toEqual({ reference: 'Patient/user-1' });
      expect(observation.effectiveDateTime).toBe('2026-01-15T10:00:00Z');
      expect(validateFHIRResource(observation)).toEqual([]);
    }
    expect(observations[0]?.valueQuantity).toMatchObject({ code: 'cm', value: 175 });
    expect(observations[1]?.valueQuantity).toMatchObject({ code: 'kg', value: 72.5 });
  });

  it('a pressão arterial vai num painel com sistólica e diastólica em componentes', () => {
    const [panel] = vitalsToFHIRObservations(
      { bloodPressure: { diastolic: 85, measuredAt: '2026-02-01T08:00:00Z', systolic: 130 } },
      patientId,
    );
    expect(panel?.effectiveDateTime).toBe('2026-02-01T08:00:00Z');
    expect(
      panel?.component?.map((c) => [c.code.coding?.[0]?.code, c.valueQuantity?.value]),
    ).toEqual([
      ['8480-6', 130],
      ['8462-4', 85],
    ]);
    expect(isUcumCode(panel?.component?.[0]?.valueQuantity?.code ?? '')).toBe(true);
    expect(panel?.id).toBe('vitals-blood-pressure-2026-02-01');
  });

  it('perfil sem medida nenhuma não emite nada', () => {
    expect(vitalsToFHIRObservations({}, patientId)).toEqual([]);
  });

  it('sem data, o id termina em "perfil" e não há effectiveDateTime', () => {
    const [height] = vitalsToFHIRObservations({ heightCm: 170 }, patientId);
    expect(height?.id).toBe('vitals-height-perfil');
    expect(height?.effectiveDateTime).toBeUndefined();
  });
});

describe('healthConditionsToFHIR', () => {
  it('diabetes vira Condition E14 declarada e não confirmada', () => {
    const [condition] = healthConditionsToFHIR(
      { diabetes: true, recordedAt: '2026-01-01T00:00:00Z' },
      patientId,
    ) as FHIRCondition[];
    expect(condition?.resourceType).toBe('Condition');
    expect(condition?.code?.coding?.[0]).toEqual({
      ...ICD10_CODES.diabetesUnspecified,
      system: ICD10_SYSTEM,
    });
    expect(condition?.verificationStatus?.coding?.[0]?.code).toBe('unconfirmed');
    expect(condition?.recordedDate).toBe('2026-01-01T00:00:00Z');
    expect(validateFHIRResource(condition!)).toEqual([]);
  });

  it('tratamento de pressão vira Condition I10 e MedicationStatement só com texto', () => {
    const resources = healthConditionsToFHIR({ bpTreatment: true }, patientId);
    expect(resources.map((r) => r.resourceType)).toEqual(['Condition', 'MedicationStatement']);
    const statement = resources[1] as FHIRMedicationStatement;
    expect(statement.medicationCodeableConcept?.coding).toBeUndefined();
    expect(statement.medicationCodeableConcept?.text).toMatch(/anti-hipertensivo/);
    expect(statement.reasonCode?.[0]?.coding?.[0]?.code).toBe('I10');
    expect(statement.status).toBe('active');
    expect(validateFHIRResource(statement)).toEqual([]);
  });

  it('fumante declarado leva a resposta LOINC; não fumante, só o texto', () => {
    const [smoker] = healthConditionsToFHIR({ smoking: true }, patientId) as FHIRObservation[];
    expect(smoker?.code.coding?.[0]?.code).toBe('72166-2');
    expect(smoker?.category?.[0]?.coding?.[0]?.code).toBe('social-history');
    expect(smoker?.valueCodeableConcept?.coding?.[0]).toEqual({
      code: 'LA18979-7',
      display: 'Smoker, current status unknown',
      system: LOINC_SYSTEM,
    });
    expect(validateFHIRResource(smoker!)).toEqual([]);

    const [nonSmoker] = healthConditionsToFHIR({ smoking: false }, patientId) as FHIRObservation[];
    expect(nonSmoker?.valueCodeableConcept).toEqual({ text: 'Não fuma (declarado)' });
    expect(validateFHIRResource(nonSmoker!)).toEqual([]);
  });

  it('flag ausente ou falsa de condição não vira recurso', () => {
    expect(healthConditionsToFHIR({ bpTreatment: false, diabetes: false }, patientId)).toEqual([]);
    expect(healthConditionsToFHIR({}, patientId)).toEqual([]);
  });
});

describe('dietaryProfileToFHIR', () => {
  it('alergias viram AllergyIntolerance alimentar; dieta e restrições, Observation com código local', () => {
    const resources = dietaryProfileToFHIR(
      {
        allergies: ['amendoim', 'camarão'],
        dietType: 'vegetariana',
        recordedAt: '2026-03-01T00:00:00Z',
        restrictions: ['sem glúten'],
      },
      patientId,
    );
    expect(resources.map((r) => r.resourceType)).toEqual([
      'AllergyIntolerance',
      'AllergyIntolerance',
      'Observation',
      'Observation',
    ]);
    const [allergy] = resources;
    expect(allergy).toMatchObject({
      category: ['food'],
      code: { text: 'amendoim' },
      id: 'allergy-amendoim',
      patient: { reference: 'Patient/user-1' },
      recordedDate: '2026-03-01T00:00:00Z',
      type: 'allergy',
    });
    const diet = resources[2] as FHIRObservation;
    expect(diet.code.coding?.[0]).toMatchObject({
      code: 'diet-type',
      system: FHIR_BRASIL_LOCAL_CODE_SYSTEM,
    });
    expect(diet.valueCodeableConcept).toEqual({ text: 'vegetariana' });
    const restriction = resources[3] as FHIRObservation;
    expect(restriction.id).toBe('diet-restriction-sem-gl-ten');
    expect(restriction.code.coding?.[0]?.code).toBe('dietary-restriction');
    for (const resource of resources) expect(validateFHIRResource(resource)).toEqual([]);
  });

  it('perfil alimentar vazio não emite nada', () => {
    expect(dietaryProfileToFHIR({}, patientId)).toEqual([]);
  });
});
