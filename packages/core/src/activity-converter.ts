/**
 * Métricas diárias do Apple Health (ou equivalente) em FHIR: uma
 * `Observation` por métrica por dia.
 *
 * Passos, minutos de exercício, frequência cardíaca em repouso e duração do
 * sono têm LOINC e saem com ele. Calorias ativas e regularidade do sono são
 * definições do fabricante, sem LOINC equivalente, e saem com código local:
 * um LOINC de "calorias queimadas" afirmaria outra coisa.
 */

import { type Addressable } from './bundle-urls';
import {
  exportLoincCoding,
  type ExportLoincUse,
  type LocalCodeUse,
  localCoding,
} from './export-codes';
import {
  fhirResourceId,
  observationCategory,
  type ObservationCategoryCode,
  patientReference,
  ucumQuantity,
} from './export-helpers';
import type { FHIRCodeableConcept, FHIRObservation, FHIRQuantity } from './fhir-types';
import type { HealthKitDailyMetricsData } from './types';

type MetricKey = Exclude<keyof HealthKitDailyMetricsData, 'date' | 'source'>;

interface MetricSpec {
  category: ObservationCategoryCode;
  code: { local: LocalCodeUse } | { loinc: ExportLoincUse };
  slug: string;
  ucum: string;
  unit: string;
}

const METRICS: Record<MetricKey, MetricSpec> = {
  activeCalories: {
    category: 'activity',
    code: { local: 'activeEnergyBurned' },
    slug: 'active-calories',
    ucum: 'kcal',
    unit: 'kcal',
  },
  exerciseMinutes: {
    category: 'activity',
    code: { loinc: 'exerciseDuration' },
    slug: 'exercise',
    ucum: 'min',
    unit: 'min',
  },
  restingHeartRate: {
    category: 'vital-signs',
    code: { loinc: 'restingHeartRate' },
    slug: 'resting-heart-rate',
    ucum: '/min',
    unit: 'bpm',
  },
  sleepConsistency: {
    category: 'activity',
    code: { local: 'sleepConsistency' },
    slug: 'sleep-consistency',
    ucum: '1',
    unit: 'índice',
  },
  sleepHours: {
    category: 'activity',
    code: { loinc: 'sleepDuration' },
    slug: 'sleep',
    ucum: 'h',
    unit: 'h',
  },
  steps: {
    category: 'activity',
    code: { loinc: 'steps24h' },
    slug: 'steps',
    ucum: '{steps}',
    unit: 'passos',
  },
};

const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

function metricCode(spec: MetricSpec): FHIRCodeableConcept {
  if ('local' in spec.code) return { coding: [localCoding(spec.code.local)] };
  const coding = exportLoincCoding(spec.code.loinc);
  if (!coding) {
    throw new Error(`LOINC de ${spec.slug} não está no snapshot: rode scripts/verify-loinc.ts`);
  }
  return { coding: [coding] };
}

/**
 * As `Observation` de um dia. Só sai métrica informada; o dia vai em
 * `effectiveDateTime` como data, e a origem (`Apple Watch`, `iPhone`) em
 * `device.display`, que é o lugar do R4 para o aparelho que mediu.
 */
export function healthKitDailyToFHIRObservations(
  day: HealthKitDailyMetricsData,
  patientId: string,
): Addressable<FHIRObservation>[] {
  const observations: Addressable<FHIRObservation>[] = [];
  for (const key of METRIC_KEYS) {
    const value = day[key];
    if (value === undefined) continue;
    const spec = METRICS[key];
    const valueQuantity: FHIRQuantity = ucumQuantity(value, spec.ucum, spec.unit);
    observations.push({
      category: observationCategory(spec.category),
      code: metricCode(spec),
      ...(day.source ? { device: { display: day.source } } : {}),
      effectiveDateTime: day.date,
      id: fhirResourceId('healthkit', day.date, spec.slug),
      resourceType: 'Observation',
      status: 'final',
      subject: patientReference(patientId),
      valueQuantity,
    });
  }
  return observations;
}
