import { describe, expect, it } from 'vitest';

import { healthKitDailyToFHIRObservations } from '../activity-converter';
import { FHIR_BRASIL_LOCAL_CODE_SYSTEM, LOINC_SYSTEM } from '../code-systems';
import { isUcumCode } from '../units';
import { validateFHIRResource } from '../validators';

const patientId = 'user-1';

describe('healthKitDailyToFHIRObservations', () => {
  it('um dia completo vira seis Observation, cada métrica com seu código e unidade', () => {
    const observations = healthKitDailyToFHIRObservations(
      {
        activeCalories: 540,
        date: '2026-01-15',
        exerciseMinutes: 35,
        restingHeartRate: 58,
        sleepConsistency: 0.82,
        sleepHours: 7.5,
        source: 'Apple Watch',
        steps: 9870,
      },
      patientId,
    );
    const byId = Object.fromEntries(observations.map((o) => [o.id, o]));
    expect(Object.keys(byId).sort()).toEqual([
      'healthkit-2026-01-15-active-calories',
      'healthkit-2026-01-15-exercise',
      'healthkit-2026-01-15-resting-heart-rate',
      'healthkit-2026-01-15-sleep',
      'healthkit-2026-01-15-sleep-consistency',
      'healthkit-2026-01-15-steps',
    ]);

    expect(byId['healthkit-2026-01-15-steps']?.code.coding?.[0]).toMatchObject({
      code: '41950-7',
      system: LOINC_SYSTEM,
    });
    expect(byId['healthkit-2026-01-15-steps']?.valueQuantity).toMatchObject({
      code: '{steps}',
      unit: 'passos',
      value: 9870,
    });
    expect(byId['healthkit-2026-01-15-active-calories']?.code.coding?.[0]).toMatchObject({
      code: 'active-energy-burned',
      system: FHIR_BRASIL_LOCAL_CODE_SYSTEM,
    });
    expect(byId['healthkit-2026-01-15-resting-heart-rate']?.category?.[0]?.coding?.[0]?.code).toBe(
      'vital-signs',
    );
    expect(byId['healthkit-2026-01-15-sleep']?.category?.[0]?.coding?.[0]?.code).toBe('activity');

    for (const observation of observations) {
      expect(observation.effectiveDateTime).toBe('2026-01-15');
      expect(observation.device).toEqual({ display: 'Apple Watch' });
      expect(isUcumCode(observation.valueQuantity?.code ?? '')).toBe(true);
      expect(validateFHIRResource(observation)).toEqual([]);
    }
  });

  it('só sai métrica informada, e sem origem não há device', () => {
    const observations = healthKitDailyToFHIRObservations(
      { date: '2026-01-16', steps: 100 },
      patientId,
    );
    expect(observations).toHaveLength(1);
    expect(observations[0]?.device).toBeUndefined();
  });

  it('dia sem métrica nenhuma não emite nada', () => {
    expect(healthKitDailyToFHIRObservations({ date: '2026-01-17' }, patientId)).toEqual([]);
  });
});
