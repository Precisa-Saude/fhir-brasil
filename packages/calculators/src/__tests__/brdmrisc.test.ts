import { describe, expect, it } from 'vitest';

import {
  calculateBrDMrisc,
  classifyRisk,
  selectModel,
  validateBiomarkers,
} from '../brdmrisc/calculator';
import {
  BIOMARKER_NAMES_PT,
  BIOMARKER_RANGES,
  BIOMARKER_UNITS,
  BRDMRISC_BIOMARKER_CODES,
  BRDMRISC_MODELS,
  FHIR_CODE_TO_BRDMRISC,
  FOLLOW_UP_YEARS,
  LAB_MODEL_PRIORITY,
  LAB_ONLY_MODELS,
  RISK_THRESHOLDS,
} from '../brdmrisc/constants';
import type { BrDMriscInput } from '../brdmrisc/types';
import {
  autoConvertToTarget,
  CONVERSION_FACTORS,
  convertToTargetUnit,
  TARGET_UNITS,
} from '../brdmrisc/unit-converters';

describe('selectModel', () => {
  it('should select model 6 when all 4 biomarkers are present', () => {
    const input: BrDMriscInput = { fpg: 90, hba1c: 5.5, hdlc: 55, triglycerides: 150 };
    const model = selectModel(input);
    expect(model?.id).toBe(6);
  });

  it('should select model 1 when only FPG is present', () => {
    const input: BrDMriscInput = { fpg: 90 };
    const model = selectModel(input);
    expect(model?.id).toBe(1);
  });

  it('should select model 2 when only HbA1c is present', () => {
    const input: BrDMriscInput = { hba1c: 5.5 };
    const model = selectModel(input);
    expect(model?.id).toBe(2);
  });

  it('should select model 3 when FPG + HbA1c are present', () => {
    const input: BrDMriscInput = { fpg: 90, hba1c: 5.5 };
    const model = selectModel(input);
    expect(model?.id).toBe(3);
  });

  it('should return null when no biomarkers present', () => {
    const model = selectModel({});
    expect(model).toBeNull();
  });

  it('should ignore NaN values', () => {
    const model = selectModel({ fpg: NaN });
    expect(model).toBeNull();
  });

  it('should select model 5 when FPG + lipids present', () => {
    const input: BrDMriscInput = { fpg: 90, hdlc: 55, triglycerides: 150 };
    const model = selectModel(input);
    expect(model?.id).toBe(5);
  });

  it('should select model 4 when FPG + triglycerides present', () => {
    const input: BrDMriscInput = { fpg: 90, triglycerides: 150 };
    const model = selectModel(input);
    expect(model?.id).toBe(4);
  });
});

describe('calculateBrDMrisc', () => {
  it('should return a valid result with all biomarkers', () => {
    const input: BrDMriscInput = { fpg: 90, hba1c: 5.5, hdlc: 55, triglycerides: 150 };
    const result = calculateBrDMrisc(input);

    expect(result.risk10y).toBeGreaterThan(0);
    expect(result.risk10y).toBeLessThan(1);
    expect(result.riskPercent).toBeGreaterThan(0);
    expect(result.riskPercent).toBeLessThan(100);
    expect(result.riskCategory).toBeTypeOf('string');
    expect(result.modelUsed.id).toBe(6);
    expect(result.calculatedAt).toBeTruthy();
  });

  it('should produce higher risk for elevated glucose', () => {
    const normal = calculateBrDMrisc({ fpg: 85 });
    const elevated = calculateBrDMrisc({ fpg: 120 });
    expect(elevated.riskPercent).toBeGreaterThan(normal.riskPercent);
  });

  it('should include breakdown with intercept', () => {
    const result = calculateBrDMrisc({ fpg: 90 });
    expect(result.breakdown.some((b) => b.key === 'intercept')).toBe(true);
    expect(result.breakdown.some((b) => b.key === 'fpg')).toBe(true);
  });

  it('should throw when no model can be selected', () => {
    expect(() => calculateBrDMrisc({})).toThrow('No suitable model');
  });

  it('should accept an explicit model', () => {
    const model = BRDMRISC_MODELS[0]!;
    const result = calculateBrDMrisc({ fpg: 90 }, model);
    expect(result.modelUsed.id).toBe(model.id);
  });
});

describe('classifyRisk', () => {
  it('should classify low risk', () => {
    expect(classifyRisk(5)).toBe('low');
  });

  it('should classify moderate risk', () => {
    expect(classifyRisk(15)).toBe('moderate');
  });

  it('should classify high risk', () => {
    expect(classifyRisk(25)).toBe('high');
  });

  it('should classify very high risk', () => {
    expect(classifyRisk(40)).toBe('very-high');
  });
});

describe('validateBiomarkers', () => {
  it('should pass for valid values', () => {
    const result = validateBiomarkers({ fpg: 90, hba1c: 5.5 });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for FPG out of range', () => {
    const result = validateBiomarkers({ fpg: 600 });
    expect(result.isValid).toBe(false);
  });

  it('should skip undefined values', () => {
    const result = validateBiomarkers({ fpg: 90 });
    expect(result.isValid).toBe(true);
  });

  it('should report multiple errors', () => {
    const result = validateBiomarkers({ fpg: 10, hba1c: 50 });
    expect(result.errors.length).toBe(2);
  });
});

describe('constants', () => {
  it('BRDMRISC_MODELS has 14 models', () => {
    expect(BRDMRISC_MODELS.length).toBe(14);
  });

  it('LAB_ONLY_MODELS has 6 models', () => {
    expect(LAB_ONLY_MODELS.length).toBe(6);
  });

  it('LAB_MODEL_PRIORITY orders by highest AUC', () => {
    expect(LAB_MODEL_PRIORITY[0]).toBe(6); // Model 6 has AUC 0.813
  });

  it('FOLLOW_UP_YEARS is 7.4', () => {
    expect(FOLLOW_UP_YEARS).toBe(7.4);
  });

  it('FHIR_CODE_TO_BRDMRISC maps 4 biomarkers', () => {
    expect(FHIR_CODE_TO_BRDMRISC['Glucose']).toBe('fpg');
    expect(FHIR_CODE_TO_BRDMRISC['HbA1c']).toBe('hba1c');
    expect(FHIR_CODE_TO_BRDMRISC['HDL']).toBe('hdlc');
    expect(FHIR_CODE_TO_BRDMRISC['Triglycerides']).toBe('triglycerides');
  });

  it('BRDMRISC_BIOMARKER_CODES has 4 entries', () => {
    expect(BRDMRISC_BIOMARKER_CODES.length).toBe(4);
  });

  it('BIOMARKER_NAMES_PT has Portuguese names', () => {
    expect(BIOMARKER_NAMES_PT['fpg']).toBe('Glicemia de Jejum');
  });

  it('BIOMARKER_UNITS has expected units', () => {
    expect(BIOMARKER_UNITS['fpg']).toBe('mg/dL');
    expect(BIOMARKER_UNITS['hba1c']).toBe('%');
  });

  it('BIOMARKER_RANGES has plausible ranges', () => {
    expect(BIOMARKER_RANGES['fpg']!.min).toBeLessThan(BIOMARKER_RANGES['fpg']!.max);
  });

  it('RISK_THRESHOLDS are ordered', () => {
    expect(RISK_THRESHOLDS.moderate).toBeLessThan(RISK_THRESHOLDS.high);
    expect(RISK_THRESHOLDS.high).toBeLessThan(RISK_THRESHOLDS.veryHigh);
  });
});

describe('unit converters', () => {
  it('convertToTargetUnit passes through mg/dL for fpg', () => {
    expect(convertToTargetUnit('fpg', 90, 'mg/dL')).toBe(90);
  });

  it('convertToTargetUnit converts mmol/L to mg/dL for fpg', () => {
    expect(convertToTargetUnit('fpg', 5.0, 'mmol/L')).toBeCloseTo(90.09, 0);
  });

  it('convertToTargetUnit converts IFCC mmol/mol to NGSP % for HbA1c', () => {
    // 42 mmol/mol ≈ 6.0%
    expect(convertToTargetUnit('hba1c', 42, 'mmol/mol')).toBeCloseTo(6.0, 0);
  });

  it('convertToTargetUnit handles case-insensitive units', () => {
    expect(convertToTargetUnit('fpg', 5.0, 'MMOL/L')).toBeCloseTo(90.09, 0);
  });

  it('convertToTargetUnit returns value unchanged for unknown biomarker', () => {
    expect(convertToTargetUnit('unknown', 42, 'mg/dL')).toBe(42);
  });

  it('convertToTargetUnit returns value for unknown unit', () => {
    expect(convertToTargetUnit('fpg', 90, 'oz/qt')).toBe(90);
  });

  it('autoConvertToTarget passes through when unit matches target', () => {
    const result = autoConvertToTarget('fpg', 90, 'mg/dL');
    expect(result.value).toBe(90);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToTarget detects glucose mmol/L heuristically', () => {
    const result = autoConvertToTarget('fpg', 5.0);
    expect(result.value).toBeCloseTo(90.09, 0);
    expect(result.wasConverted).toBe(true);
  });

  it('autoConvertToTarget detects HbA1c IFCC heuristically', () => {
    const result = autoConvertToTarget('hba1c', 42);
    expect(result.value).toBeCloseTo(6.0, 0);
    expect(result.wasConverted).toBe(true);
  });

  it('autoConvertToTarget detects triglycerides mmol/L', () => {
    const result = autoConvertToTarget('triglycerides', 1.7);
    expect(result.value).toBeCloseTo(150.57, 0);
    expect(result.wasConverted).toBe(true);
  });

  it('autoConvertToTarget detects HDL mmol/L', () => {
    const result = autoConvertToTarget('hdlc', 1.4);
    expect(result.value).toBeCloseTo(54.14, 0);
    expect(result.wasConverted).toBe(true);
  });

  it('autoConvertToTarget defaults for unknown biomarker', () => {
    const result = autoConvertToTarget('unknown', 42);
    expect(result.value).toBe(42);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToTarget returns unchanged for fpg already in mg/dL range', () => {
    const result = autoConvertToTarget('fpg', 90);
    expect(result.value).toBe(90);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToTarget returns unchanged for hba1c already in % range', () => {
    const result = autoConvertToTarget('hba1c', 5.5);
    expect(result.value).toBe(5.5);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToTarget returns unchanged for triglycerides already in mg/dL range', () => {
    const result = autoConvertToTarget('triglycerides', 150);
    expect(result.value).toBe(150);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToTarget returns unchanged for hdlc already in mg/dL range', () => {
    const result = autoConvertToTarget('hdlc', 55);
    expect(result.value).toBe(55);
    expect(result.wasConverted).toBe(false);
  });

  it('autoConvertToTarget converts with provided unit', () => {
    const result = autoConvertToTarget('fpg', 5.0, 'mmol/L');
    expect(result.wasConverted).toBe(true);
    expect(result.value).toBeCloseTo(90.09, 0);
  });

  it('CONVERSION_FACTORS has entries for 4 biomarkers', () => {
    expect(Object.keys(CONVERSION_FACTORS).length).toBe(4);
  });

  it('TARGET_UNITS has expected targets', () => {
    expect(TARGET_UNITS['fpg']).toBe('mg/dL');
    expect(TARGET_UNITS['hba1c']).toBe('%');
  });
});
