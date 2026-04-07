import { describe, expect, it } from 'vitest';

import type { BiomarkerInput } from '../derived';
import { computeDerivedBiomarkers } from '../derived';

describe('computeDerivedBiomarkers', () => {
  describe('HOMA-IR', () => {
    it('should calculate HOMA-IR from glucose and insulin', () => {
      const biomarkers: BiomarkerInput[] = [
        { code: 'Glucose', value: 90 },
        { code: 'Insulin', value: 10 },
      ];

      const derived = computeDerivedBiomarkers(biomarkers);
      const homaIr = derived.find((b) => b.code === 'HOMA_IR');

      expect(homaIr).toBeDefined();
      // HOMA-IR = (90 × 10) / 405 ≈ 2.222
      expect(homaIr!.value).toBeCloseTo(2.222, 2);
      expect(homaIr!.unit).toBe('index');
    });

    it('should not calculate HOMA-IR if glucose is missing', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'Insulin', value: 10 }];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'HOMA_IR')).toBeUndefined();
    });

    it('should not calculate HOMA-IR if already present', () => {
      const biomarkers: BiomarkerInput[] = [
        { code: 'Glucose', value: 90 },
        { code: 'Insulin', value: 10 },
        { code: 'HOMA_IR', value: 2.5 },
      ];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'HOMA_IR')).toBeUndefined();
    });
  });

  describe('VLDL', () => {
    it('should calculate VLDL from triglycerides', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'Triglycerides', value: 150 }];
      const derived = computeDerivedBiomarkers(biomarkers);
      const vldl = derived.find((b) => b.code === 'VLDL');

      expect(vldl).toBeDefined();
      // VLDL = 150 / 5 = 30
      expect(vldl!.value).toBe(30);
      expect(vldl!.unit).toBe('mg/dL');
    });
  });

  describe('eAG', () => {
    it('should calculate eAG from HbA1c', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'HbA1c', value: 5.4 }];
      const derived = computeDerivedBiomarkers(biomarkers);
      const eag = derived.find((b) => b.code === 'eAG');

      expect(eag).toBeDefined();
      // eAG = 28.7 × 5.4 − 46.7 = 108.28
      expect(eag!.value).toBeCloseTo(108.28, 1);
      expect(eag!.unit).toBe('mg/dL');
    });

    it('should not calculate eAG if HbA1c is missing', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'Glucose', value: 90 }];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'eAG')).toBeUndefined();
    });

    it('should not calculate eAG if already present', () => {
      const biomarkers: BiomarkerInput[] = [
        { code: 'HbA1c', value: 5.4 },
        { code: 'eAG', value: 110 },
      ];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'eAG')).toBeUndefined();
    });
  });

  describe('BMI', () => {
    it('should calculate BMI from TotalMass and user height', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'TotalMass', value: 80 }];
      const derived = computeDerivedBiomarkers(biomarkers, {
        userContext: { heightCm: 175 },
      });
      const bmi = derived.find((b) => b.code === 'BMI');

      expect(bmi).toBeDefined();
      // BMI = 80 / (1.75)^2 ≈ 26.12
      expect(bmi!.value).toBeCloseTo(26.12, 1);
      expect(bmi!.unit).toBe('kg/m2');
    });

    it('should not calculate BMI without user height', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'TotalMass', value: 80 }];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'BMI')).toBeUndefined();
    });

    it('should not calculate BMI with invalid height', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'TotalMass', value: 80 }];
      const derived = computeDerivedBiomarkers(biomarkers, {
        userContext: { heightCm: 10 },
      });
      expect(derived.find((b) => b.code === 'BMI')).toBeUndefined();
    });
  });

  describe('multiple derived biomarkers', () => {
    it('should calculate all available derived biomarkers at once', () => {
      const biomarkers: BiomarkerInput[] = [
        { code: 'Glucose', value: 100 },
        { code: 'Insulin', value: 12 },
        { code: 'Triglycerides', value: 200 },
        { code: 'HbA1c', value: 5.4 },
        { code: 'TotalMass', value: 70 },
      ];
      const derived = computeDerivedBiomarkers(biomarkers, {
        userContext: { heightCm: 170 },
      });

      expect(derived.find((b) => b.code === 'HOMA_IR')).toBeDefined();
      expect(derived.find((b) => b.code === 'VLDL')).toBeDefined();
      expect(derived.find((b) => b.code === 'eAG')).toBeDefined();
      expect(derived.find((b) => b.code === 'BMI')).toBeDefined();
      expect(derived.length).toBe(4);
    });
  });

  describe('input validation', () => {
    it('should not calculate HOMA-IR with zero glucose', () => {
      const biomarkers: BiomarkerInput[] = [
        { code: 'Glucose', value: 0 },
        { code: 'Insulin', value: 10 },
      ];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'HOMA_IR')).toBeUndefined();
    });

    it('should not calculate HOMA-IR with negative insulin', () => {
      const biomarkers: BiomarkerInput[] = [
        { code: 'Glucose', value: 90 },
        { code: 'Insulin', value: -5 },
      ];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'HOMA_IR')).toBeUndefined();
    });

    it('should not calculate VLDL with zero triglycerides', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'Triglycerides', value: 0 }];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'VLDL')).toBeUndefined();
    });

    it('should not calculate eAG with zero HbA1c', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'HbA1c', value: 0 }];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'eAG')).toBeUndefined();
    });

    it('should not calculate BMI with zero weight', () => {
      const biomarkers: BiomarkerInput[] = [{ code: 'TotalMass', value: 0 }];
      const derived = computeDerivedBiomarkers(biomarkers, {
        userContext: { heightCm: 175 },
      });
      expect(derived.find((b) => b.code === 'BMI')).toBeUndefined();
    });
  });

  describe('string values', () => {
    it('should skip biomarkers with string values', () => {
      const biomarkers: BiomarkerInput[] = [
        { code: 'Glucose', value: 'positive' },
        { code: 'Insulin', value: 10 },
      ];
      const derived = computeDerivedBiomarkers(biomarkers);
      expect(derived.find((b) => b.code === 'HOMA_IR')).toBeUndefined();
    });
  });
});
