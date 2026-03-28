import { describe, expect, it } from 'vitest';

import {
  BIOMARKER_DEFAULT_UNIT,
  BIOMARKER_UNITS,
  getCanonicalUnit,
  getDefaultUnit,
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
