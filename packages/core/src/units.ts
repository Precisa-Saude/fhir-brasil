/**
 * Unit Mappings and Biomarker Unit Definitions
 *
 * Maps units to UCUM format, provides default units for biomarkers,
 * and defines canonical/SI unit configurations with aliases.
 */

// ─── UCUM Mappings ───────────────────────────────────────────────────────────

/**
 * Map units to UCUM (Unified Code for Units of Measure)
 * See: https://ucum.org/
 */
export const UNIT_TO_UCUM: Record<string, string> = {
  // Dimensionless / special measurements
  '[pH]': '[pH]',
  '{ratio}': '{ratio}',
  '{specific gravity}': '{specific gravity}',

  '/µL': '/uL',
  // Percentage
  '%': '%',
  // Count units
  '10³/µL': '10*3/uL',
  '10⁶/µL': '10*6/uL',
  // Volume
  fL: 'fL',
  g: 'g',

  // Mass concentration
  'g/dL': 'g/dL',
  L: 'L',
  // Molar concentration
  'mEq/L': 'meq/L',

  mg: 'mg',
  'mg/dL': 'mg/dL',
  mL: 'mL',
  'mmol/L': 'mmol/L',
  'mUI/mL': 'm[IU]/mL',

  ng: 'ng',

  'ng/dL': 'ng/dL',
  'ng/mL': 'ng/mL',
  'nmol/L': 'nmol/L',
  // Mass
  pg: 'pg',

  'pg/mL': 'pg/mL',
  pH: '[pH]',
  // Enzyme activity
  'U/L': 'U/L',
  // Special units
  'U/mL': 'U/mL',
  'UI/L': '[IU]/L',

  'UI/mL': '[IU]/mL',

  µg: 'ug',
  'µg/dL': 'ug/dL',
  'µmol/L': 'umol/L',
  'µUI/mL': 'u[IU]/mL',
};

/**
 * Default units for biomarkers when source data doesn't provide one
 * These are the most common units used in Brazilian labs
 */
export const BIOMARKER_DEFAULT_UNIT: Record<string, string> = {
  // Proteins
  Albumin: 'g/dL',
  AlkalinePhosphatase: 'U/L',
  // Liver
  ALT: 'U/L',
  AST: 'U/L',

  Calcium: 'mg/dL',
  Chloride: 'mEq/L',
  // Lipids
  Cholesterol: 'mg/dL',
  // Kidney
  Creatinine: 'mg/dL',
  eAG: 'mg/dL',
  Ferritin: 'ng/mL',

  FolicAcid: 'ng/mL',
  GGT: 'U/L',
  // Glucose/Diabetes
  Glucose: 'mg/dL',

  HbA1c: '%',
  Hct: '%',

  HDL: 'mg/dL',
  // Hematology
  Hgb: 'g/dL',
  Insulin: 'µUI/mL',

  // Iron studies
  Iron: 'µg/dL',
  LDL: 'mg/dL',
  Magnesium: 'mg/dL',
  NonHDL_Cholesterol: 'mg/dL',

  // Urinalysis - dimensionless
  pH_Urine: '[pH]',
  Potassium: 'mEq/L',
  RDW: '%',
  // Electrolytes
  Sodium: 'mEq/L',
  SpecificGravity_Urine: '{specific gravity}',

  T3Free: 'pg/mL',
  T4Free: 'ng/dL',
  TIBC: 'µg/dL',
  TotalProtein: 'g/dL',

  TransferrinSaturation: '%',
  Triglycerides: 'mg/dL',
  // Thyroid
  TSH: 'µUI/mL',

  Urea: 'mg/dL',
  UricAcid: 'mg/dL',

  // Vitamins
  VitaminB12: 'pg/mL',
  VitaminD: 'ng/mL',
  VLDL: 'mg/dL',
};

/**
 * Convert unit to UCUM format
 */
export function unitToUCUM(unit: string): string {
  return UNIT_TO_UCUM[unit] || unit;
}

/**
 * Get default unit for a biomarker code
 * @param biomarkerCode - The biomarker code (e.g., "Glucose", "HbA1c")
 * @returns The default unit or empty string if not found
 */
export function getDefaultUnit(biomarkerCode: string): string {
  return BIOMARKER_DEFAULT_UNIT[biomarkerCode] || '';
}

// ─── Biomarker Unit Configurations ───────────────────────────────────────────

/** Biomarker unit definitions — canonical units match reference-ranges.ts (BR conventional). */

export interface BiomarkerUnitConfig {
  aliases: Record<string, string>;
  canonicalUcum: string;
  canonicalUnit: string;
  molecularWeight?: number;
  siUcum: string;
  siUnit: string;
}

const CBC_DIFF_ALIASES: Record<string, string> = {
  '/ul': '/uL',
  '/µl': '/uL',
  '10*3/ul': 'K/uL',
  'cells/ul': '/uL',
  'cells/µl': '/uL',
  'k/ul': 'K/uL',
  'x10e3/ul': 'K/uL',
};
const CBC_DIFF: Omit<BiomarkerUnitConfig, 'aliases'> = {
  canonicalUcum: '10*3/uL',
  canonicalUnit: 'K/uL',
  siUcum: '10*3/uL',
  siUnit: 'K/uL',
};
const DEXA_KG_ALIASES: Record<string, string> = {
  kg: 'kg',
  lb: '[lb_av]',
  lbs: '[lb_av]',
};
const DEXA_KG: Omit<BiomarkerUnitConfig, 'aliases'> = {
  canonicalUcum: 'kg',
  canonicalUnit: 'kg',
  siUcum: 'kg',
  siUnit: 'kg',
};

/**
 * Urine sediment units — Brazilian automated analyzers (Sysmex UF-series)
 * report in /mL while manual microscopy uses /HPF. Canonical unit is /HPF.
 */
const URINE_SEDIMENT_ALIASES: Record<string, string> = {
  '/hpf': '/HPF',
  '/ml': '/mL',
};
const URINE_SEDIMENT: Omit<BiomarkerUnitConfig, 'aliases'> = {
  canonicalUcum: '/[HPF]',
  canonicalUnit: '/HPF',
  siUcum: '/[HPF]',
  siUnit: '/HPF',
};

export const BIOMARKER_UNITS: Record<string, BiomarkerUnitConfig> = {
  Albumin: {
    aliases: { 'g/dl': 'g/dL', 'g/l': 'g/L' },
    canonicalUcum: 'g/dL',
    canonicalUnit: 'g/dL',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  AntiThyroglobulin: {
    aliases: { 'iu/ml': 'IU/mL', 'ui/ml': 'IU/mL' },
    canonicalUcum: '[iU]/mL',
    canonicalUnit: 'IU/mL',
    siUcum: '[iU]/mL',
    siUnit: 'IU/mL',
  },
  Basophils_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  BMC: { aliases: DEXA_KG_ALIASES, ...DEXA_KG },
  Cholesterol: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 386.65,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  Creatinine: {
    aliases: { 'mg/dl': 'mg/dL', 'umol/l': 'µmol/L', 'µmol/l': 'µmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 113.12,
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
  },
  CRP: {
    aliases: { 'mg/dl': 'mg/dL', 'mg/l': 'mg/L' },
    canonicalUcum: 'mg/L',
    canonicalUnit: 'mg/L',
    siUcum: 'mg/L',
    siUnit: 'mg/L',
  },
  eGFR: {
    aliases: {
      'ml/min/1,73 m2': 'mL/min/1.73m²',
      'ml/min/1.73m2': 'mL/min/1.73m²',
      'ml/min/1.73m²': 'mL/min/1.73m²',
    },
    canonicalUcum: 'mL/min/{1.73_m2}',
    canonicalUnit: 'mL/min/1.73m²',
    siUcum: 'mL/min/{1.73_m2}',
    siUnit: 'mL/min/1.73m²',
  },
  Eosinophils_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  Estradiol: {
    // TODO: ng/dL ≠ pg/mL (1 ng/dL = 10 pg/mL) — display-only alias for now
    aliases: { 'ng/dl': 'pg/mL', 'pg/ml': 'pg/mL' },
    canonicalUcum: 'pg/mL',
    canonicalUnit: 'pg/mL',
    siUcum: 'pmol/L',
    siUnit: 'pmol/L',
  },
  FatFreeMass: { aliases: DEXA_KG_ALIASES, ...DEXA_KG },
  FatMass: { aliases: DEXA_KG_ALIASES, ...DEXA_KG },
  Ferritin: {
    aliases: {
      'mcg/l': 'ng/mL',
      'microg/l': 'ng/mL',
      'ng/ml': 'ng/mL',
      'µg/l': 'ng/mL',
    },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    siUcum: 'ug/L',
    siUnit: 'µg/L',
  },
  FSH: {
    aliases: {
      'iu/l': 'mIU/mL',
      'miu/ml': 'mIU/mL',
      'ui/l': 'mIU/mL',
    },
    canonicalUcum: 'mIU/mL',
    canonicalUnit: 'mIU/mL',
    siUcum: '[iU]/L',
    siUnit: 'IU/L',
  },
  Glucose: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 180.156,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  HDL: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 386.65,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  Hgb: {
    aliases: { 'g/dl': 'g/dL', 'g/l': 'g/L' },
    canonicalUcum: 'g/dL',
    canonicalUnit: 'g/dL',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  Insulin: {
    aliases: {
      'mu/l': 'uIU/mL',
      'uiu/ml': 'uIU/mL',
      'µu/ml': 'uIU/mL',
      'µui/ml': 'uIU/mL',
    },
    canonicalUcum: 'u[iU]/mL',
    canonicalUnit: 'uIU/mL',
    siUcum: 'pmol/L',
    siUnit: 'pmol/L',
  },
  Iron: {
    aliases: {
      'mcg/dl': 'mcg/dL',
      'microg/dl': 'mcg/dL',
      'ug/dl': 'mcg/dL',
      'µg/dl': 'mcg/dL',
    },
    canonicalUcum: 'ug/dL',
    canonicalUnit: 'mcg/dL',
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
  },
  LDL: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 386.65,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  LDL_Peak_Size: {
    aliases: { å: 'Ao', angstrom: 'Ao', ao: 'Ao', nm: 'nm' },
    canonicalUcum: 'Ao',
    canonicalUnit: 'Angstrom',
    siUcum: 'nm',
    siUnit: 'nm',
  },
  LeanMass: { aliases: DEXA_KG_ALIASES, ...DEXA_KG },
  Leukocytes_Urine: { aliases: URINE_SEDIMENT_ALIASES, ...URINE_SEDIMENT },
  LH: {
    aliases: {
      'iu/l': 'mIU/mL',
      'miu/ml': 'mIU/mL',
      'ui/l': 'mIU/mL',
    },
    canonicalUcum: 'mIU/mL',
    canonicalUnit: 'mIU/mL',
    siUcum: '[iU]/L',
    siUnit: 'IU/L',
  },
  Lipoprotein_a: {
    aliases: { 'mg/dl': 'mg/dL', 'nmol/l': 'nmol/L' },
    canonicalUcum: 'nmol/L',
    canonicalUnit: 'nmol/L',
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
  },
  Lymphocytes_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  MCHC: {
    aliases: { 'g/dl': 'g/dL', 'g/l': 'g/L' },
    canonicalUcum: 'g/dL',
    canonicalUnit: 'g/dL',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  Monocytes_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  Neutrophils_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  Platelets: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  Prolactin: {
    aliases: {
      'microg/l': 'ng/mL',
      'ng/ml': 'ng/mL',
      'µg/l': 'ng/mL',
    },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    siUcum: 'ug/L',
    siUnit: 'µg/L',
  },
  RBC: {
    aliases: {
      '/ul': '/uL',
      '/µl': '/uL',
      '10*6/ul': 'M/uL',
      'cells/ul': '/uL',
      'm/ul': 'M/uL',
      'milhões/mm3': 'M/uL',
      'milhões/mm³': 'M/uL',
      'x10e6/ul': 'M/uL',
    },
    canonicalUcum: '10*6/uL',
    canonicalUnit: 'M/uL',
    siUcum: '10*6/uL',
    siUnit: 'M/uL',
  },
  RBC_Urine: { aliases: URINE_SEDIMENT_ALIASES, ...URINE_SEDIMENT },
  TestosteroneFree: {
    // TODO: pmol/L ≠ pg/mL (needs MW conversion) — display-only alias for now
    aliases: { 'pg/ml': 'pg/mL', 'pmol/l': 'pg/mL' },
    canonicalUcum: 'pg/mL',
    canonicalUnit: 'pg/mL',
    molecularWeight: 288.42,
    siUcum: 'pmol/L',
    siUnit: 'pmol/L',
  },
  TIBC: {
    aliases: {
      'mcg/dl': 'mcg/dL',
      'microg/dl': 'mcg/dL',
      'ug/dl': 'mcg/dL',
      'µg/dl': 'mcg/dL',
    },
    canonicalUcum: 'ug/dL',
    canonicalUnit: 'mcg/dL',
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
  },
  TotalMass: { aliases: DEXA_KG_ALIASES, ...DEXA_KG },
  Triglycerides: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 885.4,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  TSH: {
    aliases: {
      'miu/l': 'uIU/mL',
      'mui/l': 'uIU/mL',
      'uiu/ml': 'uIU/mL',
      'µui/ml': 'uIU/mL',
    },
    canonicalUcum: 'u[iU]/mL',
    canonicalUnit: 'uIU/mL',
    siUcum: 'mIU/L',
    siUnit: 'mIU/L',
  },
  Urea: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 60.06,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  VATMass: { aliases: DEXA_KG_ALIASES, ...DEXA_KG },
  VATVolume: {
    aliases: { cm3: 'cm3', 'cm³': 'cm3', in3: '[in_i]3', 'in³': '[in_i]3' },
    canonicalUcum: 'cm3',
    canonicalUnit: 'cm³',
    siUcum: 'cm3',
    siUnit: 'cm³',
  },
  VitaminB12: {
    aliases: { 'ng/l': 'pg/mL', 'pg/ml': 'pg/mL' },
    canonicalUcum: 'pg/mL',
    canonicalUnit: 'pg/mL',
    siUcum: 'pmol/L',
    siUnit: 'pmol/L',
  },
  VitaminD: {
    aliases: { 'ng/ml': 'ng/mL', 'nmol/l': 'nmol/L' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    molecularWeight: 384.64,
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
  },
  WBC: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
};

/**
 * Get the canonical unit for a biomarker code.
 */
export function getCanonicalUnit(code: string): string | null {
  return BIOMARKER_UNITS[code]?.canonicalUnit ?? null;
}

/**
 * Get the SI unit for a biomarker code.
 */
export function getSIUnit(code: string): string | null {
  return BIOMARKER_UNITS[code]?.siUnit ?? null;
}
