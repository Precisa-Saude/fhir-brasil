import { describe, expect, it } from 'vitest';

import { calculatePhenoAge, validateBiomarkers } from '../phenoage/calculator';
import {
  BIOMARKER_LAB_INFO,
  BIOMARKER_NAMES_PT,
  BIOMARKER_RANGES,
  FHIR_CODE_TO_PHENOAGE,
  GOMPERTZ_PARAMS,
  PHENOAGE_COEFFICIENTS,
  REQUIRED_BIOMARKERS,
} from '../phenoage/constants';
import type { PhenoAgeInput } from '../phenoage/types';
import {
  autoConvertToSI,
  CONVERSION_FACTORS,
  convertToSI,
  needsConversion,
  TARGET_UNITS,
} from '../phenoage/unit-converters';

// Typical healthy 40-year-old values in SI units
const healthyInput: PhenoAgeInput = {
  albumin: 42, // g/L
  alkalinePhosphatase: 60, // U/L
  chronologicalAge: 40,
  creatinine: 80, // μmol/L
  crp: 1.0, // mg/L
  glucose: 5.0, // mmol/L
  lymphocytePercent: 30,
  mcv: 88, // fL
  rdw: 13, // %
  wbc: 6.0, // 10^9/L
};

describe('calculatePhenoAge', () => {
  it('should return a valid PhenoAge result', () => {
    const result = calculatePhenoAge(healthyInput);

    expect(result.phenoAge).toBeTypeOf('number');
    expect(result.ageDifference).toBeTypeOf('number');
    expect(result.mortalityScore).toBeGreaterThan(0);
    expect(result.mortalityScore).toBeLessThan(1);
    expect(result.linearPredictor).toBeTypeOf('number');
    expect(result.calculatedAt).toBeTruthy();
    expect(result.chronologicalAge).toBe(40);
  });

  it('should produce PhenoAge close to chronological age for healthy values', () => {
    const result = calculatePhenoAge(healthyInput);
    // Healthy person should have PhenoAge within ~10 years of chronological
    expect(Math.abs(result.ageDifference)).toBeLessThan(10);
  });

  it('should produce higher PhenoAge for unhealthy values', () => {
    const unhealthyInput: PhenoAgeInput = {
      ...healthyInput,
      crp: 10.0, // high inflammation
      glucose: 8.0, // high glucose
      rdw: 18, // high RDW
    };
    const healthy = calculatePhenoAge(healthyInput);
    const unhealthy = calculatePhenoAge(unhealthyInput);

    expect(unhealthy.phenoAge).toBeGreaterThan(healthy.phenoAge);
  });

  it('should include breakdown with all components', () => {
    const result = calculatePhenoAge(healthyInput);
    // 9 biomarkers + age + intercept = 11 items
    expect(result.breakdown.length).toBe(11);
    expect(result.breakdown.some((b) => b.key === 'intercept')).toBe(true);
    expect(result.breakdown.some((b) => b.key === 'albumin')).toBe(true);
    expect(result.breakdown.some((b) => b.key === 'age')).toBe(true);
  });

  it('should throw for NaN input', () => {
    expect(() => calculatePhenoAge({ ...healthyInput, albumin: NaN })).toThrow(
      'Invalid input value',
    );
  });
});

describe('calculatePhenoAge — CRP unit handling (mg/L input → mg/dL in formula)', () => {
  // Reference case verified against the published Liu et al. 2018 (corrected)
  // formula and the longevity-tools.com calculator. Conventional-unit inputs
  // from the source URL, converted to the SI units this calculator expects.
  // hs-CRP stays in mg/L (0.3) — the calculator divides by 10 internally.
  // Source of truth: NHANES IV `LBXCRP` is mg/dL; `0.0954·ln(CRP[mg/dL])`.
  const referenceInput: PhenoAgeInput = {
    albumin: 4.4 * 10, // 4.4 g/dL → 44 g/L
    alkalinePhosphatase: 59, // U/L
    chronologicalAge: 46,
    creatinine: 1.13 * 88.4, // 1.13 mg/dL → 99.892 μmol/L
    crp: 0.3, // mg/L
    glucose: 85 / 18.0182, // 85 mg/dL → 4.717 mmol/L
    lymphocytePercent: 33.6,
    mcv: 99.8, // fL
    rdw: 12, // %
    wbc: 4.5, // 10^9/L
  };

  it('matches the published / longevity-tools reference value (36.5)', () => {
    // Before the unit fix this returned 39.0 (CRP wrongly used in mg/L).
    expect(calculatePhenoAge(referenceInput).phenoAge).toBeCloseTo(36.5, 1);
  });

  it('logs CRP in mg/dL, not mg/L (0.3 mg/L → ln(0.03 mg/dL))', () => {
    const crp = calculatePhenoAge(referenceInput).breakdown.find((b) => b.key === 'crp');
    expect(crp?.valueWithUnit).toBe('ln(0.030)');
    // 0.0954 × ln(0.3 / 10), rounded to 4 dp
    expect(crp?.contribution).toBeCloseTo(0.0954 * Math.log(0.03), 4);
  });

  it('clamps CRP below the limit of detection (0.1 mg/L)', () => {
    const belowLod = calculatePhenoAge({ ...referenceInput, crp: 0.02 });
    const atLod = calculatePhenoAge({ ...referenceInput, crp: 0.1 });
    expect(belowLod.phenoAge).toBe(atLod.phenoAge);
  });

  it('higher CRP raises PhenoAge monotonically', () => {
    const low = calculatePhenoAge({ ...referenceInput, crp: 0.5 }).phenoAge;
    const high = calculatePhenoAge({ ...referenceInput, crp: 5 }).phenoAge;
    expect(high).toBeGreaterThan(low);
  });
});

describe('validateBiomarkers', () => {
  it('should pass for healthy values', () => {
    const result = validateBiomarkers(healthyInput);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for out-of-range values', () => {
    const result = validateBiomarkers({ ...healthyInput, albumin: 1 });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should fail for CRP <= 0', () => {
    const result = validateBiomarkers({ ...healthyInput, crp: 0 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('PCR deve ser maior que 0');
  });

  it('should fail for age out of range', () => {
    const result = validateBiomarkers({ ...healthyInput, chronologicalAge: 10 });
    expect(result.isValid).toBe(false);
  });
});

describe('constants', () => {
  it('PHENOAGE_COEFFICIENTS has all expected keys', () => {
    expect(PHENOAGE_COEFFICIENTS.intercept).toBeTypeOf('number');
    expect(PHENOAGE_COEFFICIENTS.albumin).toBeTypeOf('number');
    expect(PHENOAGE_COEFFICIENTS.glucose).toBeTypeOf('number');
    expect(PHENOAGE_COEFFICIENTS.age).toBeTypeOf('number');
  });

  it('GOMPERTZ_PARAMS has expected keys', () => {
    expect(GOMPERTZ_PARAMS.gamma).toBeTypeOf('number');
    expect(GOMPERTZ_PARAMS.baseAge).toBeTypeOf('number');
  });

  it('BIOMARKER_RANGES has ranges for all 9 biomarkers + age', () => {
    expect(Object.keys(BIOMARKER_RANGES).length).toBe(10);
    for (const range of Object.values(BIOMARKER_RANGES)) {
      expect(range.min).toBeLessThan(range.max);
    }
  });

  it('FHIR_CODE_TO_PHENOAGE maps 9 biomarkers', () => {
    expect(Object.keys(FHIR_CODE_TO_PHENOAGE).length).toBe(9);
    expect(FHIR_CODE_TO_PHENOAGE['Glucose']).toBe('glucose');
    expect(FHIR_CODE_TO_PHENOAGE['Albumin']).toBe('albumin');
  });

  it('REQUIRED_BIOMARKERS has 9 entries', () => {
    expect(REQUIRED_BIOMARKERS.length).toBe(9);
  });

  it('BIOMARKER_NAMES_PT has Portuguese names', () => {
    expect(BIOMARKER_NAMES_PT['albumin']).toBe('Albumina');
    expect(BIOMARKER_NAMES_PT['glucose']).toBe('Glicose');
  });

  it('BIOMARKER_LAB_INFO has LOINC codes', () => {
    expect(BIOMARKER_LAB_INFO['Glucose']?.loincCode).toBe('2345-7');
    expect(BIOMARKER_LAB_INFO['Albumin']?.loincCode).toBe('1751-7');
  });
});

describe('unit converters', () => {
  it('convertToSI converts albumin g/dL to g/L', () => {
    expect(convertToSI('albumin', 4.2, 'g/dL')).toBeCloseTo(42, 1);
  });

  it('convertToSI converts glucose mg/dL to mmol/L', () => {
    expect(convertToSI('glucose', 90, 'mg/dL')).toBeCloseTo(4.996, 2);
  });

  it('convertToSI converts creatinine mg/dL to μmol/L', () => {
    expect(convertToSI('creatinine', 1.0, 'mg/dL')).toBeCloseTo(88.4, 1);
  });

  it('convertToSI passes through SI units unchanged', () => {
    expect(convertToSI('albumin', 42, 'g/L')).toBe(42);
  });

  it('convertToSI throws for unknown biomarker', () => {
    expect(() => convertToSI('unknown', 1, 'mg/dL')).toThrow('Unknown biomarker');
  });

  it('convertToSI throws for unknown unit', () => {
    expect(() => convertToSI('albumin', 1, 'oz/qt')).toThrow('Unknown unit');
  });

  it('convertToSI handles case-insensitive matching', () => {
    expect(convertToSI('albumin', 4.2, 'G/DL')).toBeCloseTo(42, 1);
  });

  it('needsConversion returns true when units differ', () => {
    expect(needsConversion('albumin', 'g/dL')).toBe(true);
    expect(needsConversion('albumin', 'g/L')).toBe(false);
  });

  it('needsConversion returns false for unknown biomarker', () => {
    expect(needsConversion('unknown', 'g/dL')).toBe(false);
  });

  it('autoConvertToSI detects albumin g/dL heuristically', () => {
    const result = autoConvertToSI('albumin', 4.2);
    expect(result.value).toBeCloseTo(42, 1);
    expect(result.wasConverted).toBe(true);
  });

  it('autoConvertToSI detects glucose mg/dL heuristically', () => {
    const result = autoConvertToSI('glucose', 90);
    expect(result.value).toBeCloseTo(4.996, 2);
    expect(result.wasConverted).toBe(true);
  });

  it('autoConvertToSI uses provided unit when available', () => {
    const result = autoConvertToSI('albumin', 42, 'g/L');
    expect(result.value).toBe(42);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToSI detects WBC in cells/µL', () => {
    const result = autoConvertToSI('wbc', 6500);
    expect(result.value).toBeCloseTo(6.5, 1);
    expect(result.wasConverted).toBe(true);
  });

  it('autoConvertToSI detects creatinine mg/dL', () => {
    const result = autoConvertToSI('creatinine', 1.0);
    expect(result.value).toBeCloseTo(88.4, 1);
    expect(result.wasConverted).toBe(true);
  });

  it('autoConvertToSI falls through for unknown unit gracefully', () => {
    const result = autoConvertToSI('albumin', 42, 'bananas/cup');
    // Falls through to heuristic since unit conversion throws
    expect(result.value).toBe(42);
  });

  it('autoConvertToSI returns SI value unchanged for albumin already in g/L range', () => {
    const result = autoConvertToSI('albumin', 42);
    expect(result.value).toBe(42);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToSI returns SI value unchanged for creatinine already in µmol/L range', () => {
    const result = autoConvertToSI('creatinine', 80);
    expect(result.value).toBe(80);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToSI returns SI value unchanged for glucose already in mmol/L range', () => {
    const result = autoConvertToSI('glucose', 5.0);
    expect(result.value).toBe(5.0);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToSI returns SI value unchanged for WBC already in 10^9/L range', () => {
    const result = autoConvertToSI('wbc', 6.5);
    expect(result.value).toBe(6.5);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToSI handles default case for non-heuristic biomarkers', () => {
    const result = autoConvertToSI('rdw', 13.5);
    expect(result.value).toBe(13.5);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToSI handles mcv without unit', () => {
    const result = autoConvertToSI('mcv', 88);
    expect(result.value).toBe(88);
    expect(result.wasConverted).toBe(false);
  });

  it('CONVERSION_FACTORS has entries for all biomarkers', () => {
    expect(Object.keys(CONVERSION_FACTORS).length).toBeGreaterThanOrEqual(9);
  });

  it('TARGET_UNITS has entries for all biomarkers', () => {
    expect(TARGET_UNITS['albumin']).toBe('g/L');
    expect(TARGET_UNITS['glucose']).toBe('mmol/L');
  });

  it('convertToSI handles WBC partial unit matching', () => {
    // "Thousand/uL" should match via partial matching
    expect(convertToSI('wbc', 6.5, 'Thousand/uL')).toBe(6.5);
  });
});
