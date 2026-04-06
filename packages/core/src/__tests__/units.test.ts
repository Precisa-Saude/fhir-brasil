import { describe, expect, it } from 'vitest';

import {
  BIOMARKER_DEFAULT_UNIT,
  BIOMARKER_UNITS,
  convertUnit,
  getCanonicalUnit,
  getDefaultUnit,
  getSIUnit,
  UNIT_TO_UCUM,
  unitToUCUM,
} from '../units';

describe('UNIT_TO_UCUM', () => {
  it('should contain unit mappings', () => {
    expect(Object.keys(UNIT_TO_UCUM).length).toBeGreaterThan(0);
  });

  it('should map percentage correctly', () => {
    expect(UNIT_TO_UCUM['%']).toBe('%');
  });

  it('should map mass concentration units', () => {
    expect(UNIT_TO_UCUM['mg/dL']).toBe('mg/dL');
    expect(UNIT_TO_UCUM['g/dL']).toBe('g/dL');
  });

  it('should map molar concentration units', () => {
    expect(UNIT_TO_UCUM['mmol/L']).toBe('mmol/L');
    expect(UNIT_TO_UCUM['mEq/L']).toBe('meq/L');
  });

  it('should map enzyme activity units', () => {
    expect(UNIT_TO_UCUM['U/L']).toBe('U/L');
    expect(UNIT_TO_UCUM['U/mL']).toBe('U/mL');
  });

  it('should map special units', () => {
    expect(UNIT_TO_UCUM['µUI/mL']).toBe('u[IU]/mL');
    expect(UNIT_TO_UCUM['UI/L']).toBe('[IU]/L');
    expect(UNIT_TO_UCUM['pH']).toBe('[pH]');
  });

  it('should map count units', () => {
    expect(UNIT_TO_UCUM['10³/µL']).toBe('10*3/uL');
    expect(UNIT_TO_UCUM['10⁶/µL']).toBe('10*6/uL');
  });
});

describe('BIOMARKER_DEFAULT_UNIT', () => {
  it('should contain default units for common biomarkers', () => {
    expect(BIOMARKER_DEFAULT_UNIT.Glucose).toBe('mg/dL');
    expect(BIOMARKER_DEFAULT_UNIT.HbA1c).toBe('%');
    expect(BIOMARKER_DEFAULT_UNIT.TSH).toBe('µUI/mL');
  });

  it('should have units for lipid panel', () => {
    expect(BIOMARKER_DEFAULT_UNIT.Cholesterol).toBe('mg/dL');
    expect(BIOMARKER_DEFAULT_UNIT.HDL).toBe('mg/dL');
    expect(BIOMARKER_DEFAULT_UNIT.LDL).toBe('mg/dL');
    expect(BIOMARKER_DEFAULT_UNIT.Triglycerides).toBe('mg/dL');
  });

  it('should have units for liver function', () => {
    expect(BIOMARKER_DEFAULT_UNIT.ALT).toBe('U/L');
    expect(BIOMARKER_DEFAULT_UNIT.AST).toBe('U/L');
    expect(BIOMARKER_DEFAULT_UNIT.GGT).toBe('U/L');
  });

  it('should have units for thyroid panel', () => {
    expect(BIOMARKER_DEFAULT_UNIT.T3Free).toBe('pg/mL');
    expect(BIOMARKER_DEFAULT_UNIT.T4Free).toBe('ng/dL');
  });

  it('should have units for electrolytes', () => {
    expect(BIOMARKER_DEFAULT_UNIT.Sodium).toBe('mEq/L');
    expect(BIOMARKER_DEFAULT_UNIT.Potassium).toBe('mEq/L');
    expect(BIOMARKER_DEFAULT_UNIT.Chloride).toBe('mEq/L');
  });
});

describe('unitToUCUM', () => {
  it('should convert known units to UCUM format', () => {
    expect(unitToUCUM('mg/dL')).toBe('mg/dL');
    expect(unitToUCUM('%')).toBe('%');
    expect(unitToUCUM('U/L')).toBe('U/L');
    expect(unitToUCUM('µUI/mL')).toBe('u[IU]/mL');
  });

  it('should return original unit for unknown units', () => {
    expect(unitToUCUM('unknown')).toBe('unknown');
    expect(unitToUCUM('custom/unit')).toBe('custom/unit');
  });

  it('should handle empty string', () => {
    expect(unitToUCUM('')).toBe('');
  });

  it('should preserve pH conversion', () => {
    expect(unitToUCUM('pH')).toBe('[pH]');
    expect(unitToUCUM('[pH]')).toBe('[pH]');
  });

  it('should convert mEq/L to meq/L (lowercase)', () => {
    expect(unitToUCUM('mEq/L')).toBe('meq/L');
  });
});

describe('getDefaultUnit', () => {
  it('should return default unit for known biomarkers', () => {
    expect(getDefaultUnit('Glucose')).toBe('mg/dL');
    expect(getDefaultUnit('HbA1c')).toBe('%');
    expect(getDefaultUnit('TSH')).toBe('µUI/mL');
  });

  it('should return empty string for unknown biomarkers', () => {
    expect(getDefaultUnit('UnknownBiomarker')).toBe('');
    expect(getDefaultUnit('')).toBe('');
  });

  it('should return correct units for iron studies', () => {
    expect(getDefaultUnit('Iron')).toBe('µg/dL');
    expect(getDefaultUnit('Ferritin')).toBe('ng/mL');
    expect(getDefaultUnit('TIBC')).toBe('µg/dL');
    expect(getDefaultUnit('TransferrinSaturation')).toBe('%');
  });
});

describe('BIOMARKER_UNITS', () => {
  it('contains expected biomarker codes', () => {
    expect(BIOMARKER_UNITS).toHaveProperty('Glucose');
    expect(BIOMARKER_UNITS).toHaveProperty('LDL_Peak_Size');
    expect(BIOMARKER_UNITS).toHaveProperty('Albumin');
    expect(BIOMARKER_UNITS).toHaveProperty('Creatinine');
  });

  it('contains CBC absolute count biomarker codes', () => {
    expect(BIOMARKER_UNITS).toHaveProperty('Neutrophils_Abs');
    expect(BIOMARKER_UNITS).toHaveProperty('Lymphocytes_Abs');
    expect(BIOMARKER_UNITS).toHaveProperty('Monocytes_Abs');
    expect(BIOMARKER_UNITS).toHaveProperty('Eosinophils_Abs');
    expect(BIOMARKER_UNITS).toHaveProperty('Basophils_Abs');
    expect(BIOMARKER_UNITS).toHaveProperty('WBC');
    expect(BIOMARKER_UNITS).toHaveProperty('RBC');
    expect(BIOMARKER_UNITS).toHaveProperty('Platelets');
  });

  it('each entry has required fields', () => {
    for (const [code, config] of Object.entries(BIOMARKER_UNITS)) {
      expect(config.canonicalUnit, `${code}.canonicalUnit`).toBeTruthy();
      expect(config.canonicalUcum, `${code}.canonicalUcum`).toBeTruthy();
      expect(config.siUnit, `${code}.siUnit`).toBeTruthy();
      expect(config.siUcum, `${code}.siUcum`).toBeTruthy();
      expect(config.aliases, `${code}.aliases`).toBeDefined();
    }
  });
});

describe('getCanonicalUnit', () => {
  it('returns canonical unit for known biomarker', () => {
    expect(getCanonicalUnit('Glucose')).toBe('mg/dL');
    expect(getCanonicalUnit('LDL_Peak_Size')).toBe('Angstrom');
    expect(getCanonicalUnit('Albumin')).toBe('g/dL');
  });

  it('returns null for unknown biomarker', () => {
    expect(getCanonicalUnit('Unknown')).toBeNull();
  });
});

describe('getSIUnit', () => {
  it('returns SI unit for known biomarker', () => {
    expect(getSIUnit('Glucose')).toBe('mmol/L');
    expect(getSIUnit('Albumin')).toBe('g/L');
  });

  it('returns null for unknown biomarker', () => {
    expect(getSIUnit('Unknown')).toBeNull();
  });
});

describe('convertUnit', () => {
  it('returns null for unknown biomarker', () => {
    expect(convertUnit(100, 'mg/dL', 'mmol/L', 'NonExistent')).toBeNull();
  });

  it('returns same value when units are identical', () => {
    const result = convertUnit(85, 'mg/dL', 'mg/dL', 'Glucose');
    expect(result).toEqual({ unit: 'mg/dL', value: 85 });
  });

  it('normalizes aliases before comparing', () => {
    const result = convertUnit(85, 'mg/dl', 'mg/dL', 'Glucose');
    expect(result).toEqual({ unit: 'mg/dL', value: 85 });
  });

  // ─── Fixed-factor conversions ──────────────────────────────────────────────

  it('converts Estradiol ng/dL → pg/mL (× 10)', () => {
    const result = convertUnit(5, 'ng/dL', 'pg/mL', 'Estradiol');
    expect(result).not.toBeNull();
    expect(result!.unit).toBe('pg/mL');
    expect(result!.value).toBeCloseTo(50, 5);
  });

  it('converts Estradiol pg/mL → ng/dL (÷ 10)', () => {
    const result = convertUnit(50, 'pg/mL', 'ng/dL', 'Estradiol');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(5, 5);
  });

  it('converts Albumin g/dL → g/L (× 10)', () => {
    const result = convertUnit(4.5, 'g/dL', 'g/L', 'Albumin');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(45, 5);
  });

  it('converts Ferritin ng/mL → µg/L (× 1)', () => {
    const result = convertUnit(150, 'ng/mL', 'µg/L', 'Ferritin');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(150, 5);
  });

  // ─── MW-based conversions ─────────────────────────────────────────────────

  it('converts Glucose mg/dL → mmol/L', () => {
    // 100 mg/dL × 10 / 180.156 ≈ 5.551
    const result = convertUnit(100, 'mg/dL', 'mmol/L', 'Glucose');
    expect(result).not.toBeNull();
    expect(result!.unit).toBe('mmol/L');
    expect(result!.value).toBeCloseTo(5.551, 2);
  });

  it('converts Glucose mmol/L → mg/dL', () => {
    // 5.551 mmol/L × 180.156 / 10 ≈ 100
    const result = convertUnit(5.551, 'mmol/L', 'mg/dL', 'Glucose');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(100, 0);
  });

  it('converts Creatinine mg/dL → µmol/L', () => {
    // 1.0 mg/dL × 10000 / 113.12 ≈ 88.4
    const result = convertUnit(1.0, 'mg/dL', 'µmol/L', 'Creatinine');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(88.4, 0);
  });

  it('converts Cholesterol mg/dL → mmol/L', () => {
    // 200 mg/dL × 10 / 386.65 ≈ 5.172
    const result = convertUnit(200, 'mg/dL', 'mmol/L', 'Cholesterol');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(5.172, 2);
  });

  it('converts VitaminD ng/mL → nmol/L', () => {
    // 30 ng/mL × 1000 / 384.64 ≈ 78.0
    const result = convertUnit(30, 'ng/mL', 'nmol/L', 'VitaminD');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(78.0, 0);
  });

  it('converts TestosteroneFree pg/mL → pmol/L', () => {
    // 10 pg/mL × 1000 / 288.42 ≈ 34.67
    const result = convertUnit(10, 'pg/mL', 'pmol/L', 'TestosteroneFree');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(34.67, 1);
  });

  it('converts TestosteroneFree pmol/L → pg/mL', () => {
    // 34.67 pmol/L × 288.42 / 1000 ≈ 10
    const result = convertUnit(34.67, 'pmol/L', 'pg/mL', 'TestosteroneFree');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(10, 0);
  });

  it('converts Estradiol pg/mL → pmol/L (MW-based)', () => {
    // 50 pg/mL × 1000 / 272.38 ≈ 183.56
    const result = convertUnit(50, 'pg/mL', 'pmol/L', 'Estradiol');
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(183.56, 0);
  });

  // ─── Roundtrip ────────────────────────────────────────────────────────────

  it('roundtrip: Glucose mg/dL → mmol/L → mg/dL', () => {
    const forward = convertUnit(100, 'mg/dL', 'mmol/L', 'Glucose')!;
    const back = convertUnit(forward.value, 'mmol/L', 'mg/dL', 'Glucose')!;
    expect(back.value).toBeCloseTo(100, 1);
  });

  it('roundtrip: TestosteroneFree pg/mL → pmol/L → pg/mL', () => {
    const forward = convertUnit(15, 'pg/mL', 'pmol/L', 'TestosteroneFree')!;
    const back = convertUnit(forward.value, 'pmol/L', 'pg/mL', 'TestosteroneFree')!;
    expect(back.value).toBeCloseTo(15, 1);
  });

  // ─── Unsupported conversions ──────────────────────────────────────────────

  it('returns null for unsupported conversion pair', () => {
    expect(convertUnit(100, 'mg/dL', 'kg', 'Glucose')).toBeNull();
  });
});
