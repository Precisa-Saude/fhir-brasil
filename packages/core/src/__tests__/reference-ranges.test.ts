import { describe, expect, it } from 'vitest';

import {
  applyFallbackReferenceRanges,
  biomarkerRangeDefinitions,
  type BiomarkerReferenceRange,
  defaultReferenceRanges,
  getFallbackReferenceRange,
  getReferenceRange,
  type ReferenceRangeContext,
} from '../reference-ranges';
import { SOURCE_REGISTRY } from '../sources';

/**
 * Expected default range with the definition's source key propagated —
 * mirrors what `getReferenceRange` returns.
 */
function expectedDefault(code: keyof typeof biomarkerRangeDefinitions): BiomarkerReferenceRange {
  const def = biomarkerRangeDefinitions[code];
  return def.source ? { ...def.default, source: def.source } : def.default;
}

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

  // Faixa sem fonte é um corte clínico que ninguém publicou, e ele decide o que
  // a pessoa vê como "alterado". O `ApoCIII_ApoA1_Ratio` foi a última assim
  // (issue #3): o corte de 0.15 era derivado das faixas individuais, sem
  // validação, e seis buscas no PubMed não acharam publicação nenhuma.
  //
  // Com o catálogo em 100% de cobertura, este teste trava a regressão — é mais
  // fácil impedir a primeira entrada sem fonte do que caçá-la depois.
  it('should cite a source for every range definition', () => {
    const semFonte = Object.entries(biomarkerRangeDefinitions)
      .filter(([, def]) => !def.source)
      .map(([code]) => code);

    expect(semFonte).toEqual([]);
  });

  // `source` é `'chave'` ou `'chave:localizador'` (ver sources.ts). O teste
  // valida a chave e a forma:
  //
  // - `Object.hasOwn` em vez de `in`, que enxerga a cadeia de protótipos: com
  //   `in`, um `source: 'toString'` passaria como se existisse no registro.
  // - chave vazia (`':p15'`, ou `source` só com espaços) é malformada e precisa
  //   falhar, em vez de sumir num filtro de falsy.
  it('should only cite sources that exist in the registry', () => {
    const problemas = Object.entries(biomarkerRangeDefinitions)
      .filter(([, def]) => def.source)
      .map(([code, def]) => {
        const chave = String(def.source).split(':')[0]?.trim() ?? '';
        if (!chave) return `${code} -> fonte malformada: ${JSON.stringify(def.source)}`;
        if (!Object.hasOwn(SOURCE_REGISTRY, chave))
          return `${code} -> chave desconhecida: ${chave}`;
        return null;
      })
      .filter((x): x is string => x !== null);

    expect(problemas).toEqual([]);
  });
});

describe('defaultReferenceRanges', () => {
  it('should derive default ranges from definitions', () => {
    expect(Object.keys(defaultReferenceRanges).length).toBe(
      Object.keys(biomarkerRangeDefinitions).length,
    );
  });

  it('should match default values from definitions', () => {
    expect(defaultReferenceRanges.HDL).toEqual(expectedDefault('HDL'));
    expect(defaultReferenceRanges.Cholesterol).toEqual(expectedDefault('Cholesterol'));
  });
});

describe('getReferenceRange', () => {
  it('should return default range when no context provided', () => {
    const range = getReferenceRange('HDL');
    expect(range).toEqual(expectedDefault('HDL'));
  });

  it('should return undefined for unknown biomarker', () => {
    expect(getReferenceRange('InvalidCode')).toBeUndefined();
  });

  it('should return default range when context has no variants', () => {
    const context: ReferenceRangeContext = { age: 30, biologicalSex: 'M' };
    const range = getReferenceRange('Cholesterol', context);
    // Cholesterol has no sex-specific variants
    expect(range).toEqual(expectedDefault('Cholesterol'));
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
      expect(range).toEqual(expectedDefault('HDL'));
    });

    it('HDL has no false upper bound at 60 mg/dL (SBC 2025)', () => {
      // Revisão clínica (issue fhir-brasil#41): HDL alto é cardioprotetor;
      // não deve marcar valores > 60 mg/dL como anormais.
      const maleRange = getReferenceRange('HDL', { age: 30, biologicalSex: 'M' });
      const femaleRange = getReferenceRange('HDL', { age: 30, biologicalSex: 'F' });
      expect(maleRange?.max ?? 0).toBeGreaterThanOrEqual(100);
      expect(femaleRange?.max ?? 0).toBeGreaterThanOrEqual(100);
    });

    it('Progesterone female reproductive-age variant covers luteal phase', () => {
      // Revisão clínica (issue fhir-brasil#41): faixa feminina ampliada
      // para abranger fase lútea (até ~20 ng/mL).
      const range = getReferenceRange('Progesterone', { age: 30, biologicalSex: 'F' });
      expect(range?.max ?? 0).toBeGreaterThanOrEqual(15);
      const maleRange = getReferenceRange('Progesterone', { age: 30, biologicalSex: 'M' });
      expect(maleRange?.max).toBeLessThan(2);
    });
  });

  describe('age-specific variants', () => {
    it('should use the same eGFR floor at every age (KDIGO 2024)', () => {
      const youngContext: ReferenceRangeContext = { age: 30 };
      const oldContext: ReferenceRangeContext = { age: 65 };

      const youngRange = getReferenceRange('eGFR', youngContext);
      const oldRange = getReferenceRange('eGFR', oldContext);

      expect(youngRange).toBeDefined();
      expect(oldRange).toBeDefined();
      // KDIGO 2024: G2 (60-89) sem marcador de lesão renal não é DRC, e isso
      // não varia com a idade. O piso é 60 para todo mundo.
      expect(youngRange?.min).toBe(60);
      expect(oldRange?.min).toBe(60);
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
      expect(range).toEqual(expectedDefault('AMH'));
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

  describe('pregnancy variants', () => {
    it('returns 1st trimester TSH variant for pregnant context', () => {
      const context: ReferenceRangeContext = {
        age: 32,
        biologicalSex: 'F',
        pregnancyTrimester: 1,
        pregnant: true,
      };
      const range = getReferenceRange('TSH', context);
      expect(range?.max).toBe(2.5);
      expect(range?.min).toBe(0.1);
    });

    it('returns 2nd trimester TSH variant for pregnant context', () => {
      const context: ReferenceRangeContext = {
        age: 32,
        biologicalSex: 'F',
        pregnancyTrimester: 2,
        pregnant: true,
      };
      const range = getReferenceRange('TSH', context);
      expect(range?.max).toBe(3.0);
      expect(range?.min).toBe(0.2);
    });

    it('returns pregnancy creatinine variant with reduced upper bound', () => {
      const context: ReferenceRangeContext = {
        age: 30,
        biologicalSex: 'F',
        pregnant: true,
      };
      const range = getReferenceRange('Creatinine', context);
      expect(range?.max).toBe(0.8);
      expect(range?.min).toBe(0.4);
    });

    it('returns pregnancy glucose variant with DMG cutoff', () => {
      const context: ReferenceRangeContext = {
        age: 30,
        biologicalSex: 'F',
        pregnant: true,
      };
      const range = getReferenceRange('Glucose', context);
      expect(range?.max).toBe(91);
    });

    it('returns non-pregnancy variant when pregnant=false', () => {
      const context: ReferenceRangeContext = {
        age: 30,
        biologicalSex: 'F',
        pregnant: false,
      };
      const range = getReferenceRange('Creatinine', context);
      // Female adult variant (non-pregnant)
      expect(range?.max).toBe(1.1);
      expect(range?.min).toBe(0.5);
    });

    it('falls through to sex/age variant when pregnant but biomarker has no pregnancy variant', () => {
      const context: ReferenceRangeContext = {
        age: 30,
        biologicalSex: 'F',
        pregnant: true,
      };
      // HDL has no pregnancy variant — a pregnant woman should still get the
      // female sex-specific cutoff (min: 50), not the generic unisex default.
      // Non-pregnancy variants are only skipped when at least one pregnancy
      // variant exists on the biomarker.
      const range = getReferenceRange('HDL', context);
      expect(range?.min).toBe(50);
    });

    it('matches catch-all pregnancy variant for TSH when trimester is unknown', () => {
      const context: ReferenceRangeContext = {
        age: 32,
        biologicalSex: 'F',
        pregnant: true,
      };
      const range = getReferenceRange('TSH', context);
      // Catch-all gestacional adota faixa conservadora (2º/3º trimestre).
      expect(range?.max).toBe(3.0);
      expect(range?.min).toBe(0.2);
    });

    it('returns pregnancy hemoglobin variant with reduced floor for 2nd trimester', () => {
      const context: ReferenceRangeContext = {
        age: 28,
        biologicalSex: 'F',
        pregnancyTrimester: 2,
        pregnant: true,
      };
      const range = getReferenceRange('Hgb', context);
      expect(range?.min).toBe(10.5);
    });

    it('pregnancy variants supersede age variants (pregnant 65+ gets pregnancy TSH, not elderly)', () => {
      const context: ReferenceRangeContext = {
        age: 67,
        biologicalSex: 'F',
        pregnant: true,
      };
      // Pregnancy catch-all (max 3.0) beats the ageMin=65 variant (max 6.0).
      const range = getReferenceRange('TSH', context);
      expect(range?.max).toBe(3.0);
    });

    it('male context with pregnant=true on TSH falls through to default (sex filter still applies)', () => {
      const context: ReferenceRangeContext = {
        age: 40,
        biologicalSex: 'M',
        pregnancyTrimester: 1,
        pregnant: true,
      };
      // All TSH pregnancy variants have sex='F'. Male context skips them;
      // hasPregnancyVariant is true, so non-pregnancy variants are also
      // skipped → default.
      const range = getReferenceRange('TSH', context);
      expect(range).toEqual(expectedDefault('TSH'));
    });

    it('pregnant=undefined is treated as non-pregnant (conservative fallback)', () => {
      const context: ReferenceRangeContext = {
        age: 30,
        biologicalSex: 'F',
        // pregnant intentionally omitted
      };
      const range = getReferenceRange('Creatinine', context);
      // Should get the female sex-specific variant, not the pregnancy one.
      expect(range?.max).toBe(1.1);
      expect(range?.min).toBe(0.5);
    });
  });

  describe('fastingRequired metadata', () => {
    it('marks Glucose as strict fasting', () => {
      expect(biomarkerRangeDefinitions.Glucose.default.fastingRequired).toBe('strict');
    });

    it('marks Triglycerides as preferred fasting (non-fasting acceptable per SBC)', () => {
      expect(biomarkerRangeDefinitions.Triglycerides.default.fastingRequired).toBe('preferred');
    });

    it('leaves HbA1c without fasting requirement', () => {
      expect(biomarkerRangeDefinitions.HbA1c.default.fastingRequired).toBeUndefined();
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
