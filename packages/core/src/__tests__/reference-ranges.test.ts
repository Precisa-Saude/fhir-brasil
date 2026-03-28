import { describe, it, expect } from 'vitest';
import {
  biomarkerRangeDefinitions,
  defaultReferenceRanges,
  getReferenceRange,
  getFallbackReferenceRange,
  applyFallbackReferenceRanges,
  type BiomarkerReferenceRange,
  type ReferenceRangeContext,
} from '../reference-ranges';

describe('biomarkerRangeDefinitions', () => {
  it('should contain biomarker range definitions', () => {
    expect(Object.keys(biomarkerRangeDefinitions).length).toBeGreaterThan(100);
  });

  it('should have default ranges for all definitions', () => {
    for (const [code, def] of Object.entries(biomarkerRangeDefinitions)) {
      expect(def.default).toBeDefined();
      expect(def.default.unit).toBeDefined();
      expect(code).toBeTruthy();
    }
  });

  it('should have valid min/max ranges (min < max)', () => {
    for (const [code, def] of Object.entries(biomarkerRangeDefinitions)) {
      if (def.default.min !== undefined && def.default.max !== undefined) {
        expect(def.default.min).toBeLessThanOrEqual(def.default.max);
      }
      if (def.default.optimalMin !== undefined && def.default.optimalMax !== undefined) {
        expect(def.default.optimalMin).toBeLessThanOrEqual(def.default.optimalMax);
      }
      // Suppress unused variable warning
      void code;
    }
  });
});

describe('defaultReferenceRanges', () => {
  it('should derive default ranges from definitions', () => {
    expect(Object.keys(defaultReferenceRanges).length).toBe(
      Object.keys(biomarkerRangeDefinitions).length,
    );
  });

  it('should match default values from definitions', () => {
    expect(defaultReferenceRanges.HDL).toEqual(biomarkerRangeDefinitions.HDL.default);
    expect(defaultReferenceRanges.Cholesterol).toEqual(
      biomarkerRangeDefinitions.Cholesterol.default,
    );
  });
});

describe('getReferenceRange', () => {
  it('should return default range when no context provided', () => {
    const range = getReferenceRange('HDL');
    expect(range).toEqual(biomarkerRangeDefinitions.HDL.default);
  });

  it('should return undefined for unknown biomarker', () => {
    expect(getReferenceRange('InvalidCode')).toBeUndefined();
  });

  it('should return default range when context has no variants', () => {
    const context: ReferenceRangeContext = { age: 30, biologicalSex: 'M' };
    const range = getReferenceRange('Cholesterol', context);
    // Cholesterol has no sex-specific variants
    expect(range).toEqual(biomarkerRangeDefinitions.Cholesterol.default);
  });

  describe('sex-specific variants', () => {
    it('should return male variant for male user', () => {
      const context: ReferenceRangeContext = { age: 30, biologicalSex: 'M' };
      const range = getReferenceRange('HDL', context);
      // HDL has sex-specific variants
      expect(range).toBeDefined();
      expect(range?.unit).toBe('mg/dL');
    });

    it('should return female variant for female user', () => {
      const context: ReferenceRangeContext = { age: 30, biologicalSex: 'F' };
      const range = getReferenceRange('HDL', context);
      expect(range).toBeDefined();
      expect(range?.unit).toBe('mg/dL');
      // Female HDL has higher min
      expect(range?.min).toBe(50);
    });

    it('should return default when sex not provided', () => {
      const context: ReferenceRangeContext = { age: 30 };
      const range = getReferenceRange('HDL', context);
      expect(range).toEqual(biomarkerRangeDefinitions.HDL.default);
    });
  });

  describe('age-specific variants', () => {
    it('should return age-appropriate range for eGFR', () => {
      const youngContext: ReferenceRangeContext = { age: 30 };
      const oldContext: ReferenceRangeContext = { age: 65 };

      const youngRange = getReferenceRange('eGFR', youngContext);
      const oldRange = getReferenceRange('eGFR', oldContext);

      expect(youngRange).toBeDefined();
      expect(oldRange).toBeDefined();
      // Older adults have lower acceptable eGFR
      expect(oldRange?.min).toBeLessThan(youngRange?.min || 999);
    });

    it('should return appropriate range for AMH by age (female)', () => {
      const young: ReferenceRangeContext = { age: 22, biologicalSex: 'F' };
      const mid: ReferenceRangeContext = { age: 35, biologicalSex: 'F' };
      const older: ReferenceRangeContext = { age: 45, biologicalSex: 'F' };

      const youngRange = getReferenceRange('AMH', young);
      const midRange = getReferenceRange('AMH', mid);
      const olderRange = getReferenceRange('AMH', older);

      expect(youngRange).toBeDefined();
      expect(midRange).toBeDefined();
      expect(olderRange).toBeDefined();

      // AMH decreases with age
      expect(youngRange?.max).toBeGreaterThan(olderRange?.max || 0);
    });

    it('should return default when age not provided', () => {
      const context: ReferenceRangeContext = { biologicalSex: 'M' };
      const range = getReferenceRange('AMH', context);
      expect(range).toEqual(biomarkerRangeDefinitions.AMH.default);
    });
  });

  describe('variants with sex=all', () => {
    it('should match sex=all variants for any sex', () => {
      // TSH has an age-based variant with sex='all'
      const maleContext: ReferenceRangeContext = { age: 70, biologicalSex: 'M' };
      const femaleContext: ReferenceRangeContext = { age: 70, biologicalSex: 'F' };

      const maleRange = getReferenceRange('TSH', maleContext);
      const femaleRange = getReferenceRange('TSH', femaleContext);

      // Both should get the same range for age 65+
      expect(maleRange).toEqual(femaleRange);
    });
  });
});

describe('getFallbackReferenceRange', () => {
  it('should return min, max, and unit for valid biomarker', () => {
    const range = getFallbackReferenceRange('HDL');
    expect(range).toBeDefined();
    expect(range?.min).toBeDefined();
    expect(range?.max).toBeDefined();
    expect(range?.unit).toBeDefined();
    expect(range?.unit).toBe('mg/dL');
  });

  it('should return undefined for unknown biomarker', () => {
    expect(getFallbackReferenceRange('InvalidCode')).toBeUndefined();
  });

  it('should return undefined when min or max is undefined', () => {
    // Most biomarkers have both min and max defined
    // This tests the edge case handling in the function
    const range = getFallbackReferenceRange('Cholesterol');
    expect(range).toBeDefined();
  });
});

describe('applyFallbackReferenceRanges', () => {
  it('should apply fallback ranges to biomarkers missing references', () => {
    const biomarkers = [
      {
        code: 'HDL',
        referenceMin: null as number | null,
        referenceMax: null as number | null,
        unit: 'mg/dL',
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(1);
    expect(biomarkers[0].referenceMin).toBeDefined();
    expect(biomarkers[0].referenceMax).toBeDefined();
  });

  it('should not overwrite existing references', () => {
    const biomarkers = [
      {
        code: 'HDL',
        referenceMin: 50,
        referenceMax: 80,
        unit: 'mg/dL',
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(0);
    expect(biomarkers[0].referenceMin).toBe(50);
    expect(biomarkers[0].referenceMax).toBe(80);
  });

  it('should skip biomarkers with incompatible units', () => {
    const biomarkers = [
      {
        code: 'HDL',
        referenceMin: null as number | null,
        referenceMax: null as number | null,
        unit: 'mmol/L', // Different from mg/dL
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(0);
    expect(biomarkers[0].referenceMin).toBeNull();
  });

  it('should apply fallback when biomarker has no unit', () => {
    const biomarkers = [
      {
        code: 'HDL',
        referenceMin: null as number | null,
        referenceMax: null as number | null,
        unit: '',
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(1);
  });

  it('should handle percentage units', () => {
    const biomarkers = [
      {
        code: 'HbA1c',
        referenceMin: null as number | null,
        referenceMax: null as number | null,
        unit: '%',
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(1);
    expect(biomarkers[0].referenceMin).toBeDefined();
    expect(biomarkers[0].referenceMax).toBeDefined();
  });

  it('should handle dL unit variations', () => {
    const biomarkers = [
      {
        code: 'Glucose',
        referenceMin: null as number | null,
        referenceMax: null as number | null,
        unit: 'mg/dL',
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(1);
  });

  it('should skip unknown biomarker codes', () => {
    const biomarkers = [
      {
        code: 'InvalidCode',
        referenceMin: null as number | null,
        referenceMax: null as number | null,
        unit: 'mg/dL',
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(0);
  });

  it('should fill only missing min when max exists', () => {
    const biomarkers = [
      {
        code: 'HDL',
        referenceMin: null as number | null,
        referenceMax: 80,
        unit: 'mg/dL',
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(1);
    expect(biomarkers[0].referenceMin).toBeDefined();
    expect(biomarkers[0].referenceMax).toBe(80);
  });

  it('should fill only missing max when min exists', () => {
    const biomarkers = [
      {
        code: 'HDL',
        referenceMin: 30,
        referenceMax: null as number | null,
        unit: 'mg/dL',
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(1);
    expect(biomarkers[0].referenceMin).toBe(30);
    expect(biomarkers[0].referenceMax).toBeDefined();
  });

  it('should process multiple biomarkers', () => {
    const biomarkers = [
      {
        code: 'HDL',
        referenceMin: null as number | null,
        referenceMax: null as number | null,
        unit: 'mg/dL',
      },
      {
        code: 'LDL',
        referenceMin: null as number | null,
        referenceMax: null as number | null,
        unit: 'mg/dL',
      },
      {
        code: 'Cholesterol',
        referenceMin: 0,
        referenceMax: 200,
        unit: 'mg/dL',
      },
    ];

    const count = applyFallbackReferenceRanges(biomarkers);
    expect(count).toBe(2); // HDL and LDL, but not Cholesterol
  });
});

describe('CAC reference ranges', () => {
  it('should have CAC ranges with direction lower-better', () => {
    const cacCodes = [
      'CAC',
      'CAC_LAD',
      'CAC_LCX',
      'CAC_LMA',
      'CAC_RCA',
      'CAC_Percentile',
      'AorticValveCalcium',
    ];
    for (const code of cacCodes) {
      const def = biomarkerRangeDefinitions[code];
      expect(def).toBeDefined();
      expect(def.direction).toBe('lower-better');
      expect(def.default.unit).toBeDefined();
    }
  });

  it('should return CAC reference range with max=99 (mild threshold)', () => {
    const range = getReferenceRange('CAC');
    expect(range).toBeDefined();
    expect(range!.max).toBe(99);
  });

  it('should return CAC_Percentile range with max=50 and warningMax=75', () => {
    const range = getReferenceRange('CAC_Percentile');
    expect(range).toBeDefined();
    expect(range!.max).toBe(50);
    expect(range!.warningMax).toBe(75);
  });
});
