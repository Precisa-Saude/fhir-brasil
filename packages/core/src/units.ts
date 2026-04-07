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

/** Percentage biomarkers — canonical and SI both use %. */
const PERCENTAGE_ALIASES: Record<string, string> = { '%': '%', pct: '%', percent: '%' };
const PERCENTAGE: Omit<BiomarkerUnitConfig, 'aliases'> = {
  canonicalUcum: '%',
  canonicalUnit: '%',
  siUcum: '%',
  siUnit: '%',
};

/** Enzyme activity — canonical and SI both use U/L. */
const ENZYME_ALIASES: Record<string, string> = { 'iu/l': 'U/L', 'u/l': 'U/L' };
const ENZYME: Omit<BiomarkerUnitConfig, 'aliases'> = {
  canonicalUcum: 'U/L',
  canonicalUnit: 'U/L',
  siUcum: 'U/L',
  siUnit: 'U/L',
};

/** Monovalent electrolytes — mEq/L ↔ mmol/L (1:1). */
const ELECTROLYTE_MONO_ALIASES: Record<string, string> = { 'meq/l': 'mEq/L', 'mmol/l': 'mmol/L' };
const ELECTROLYTE_MONO: Omit<BiomarkerUnitConfig, 'aliases'> = {
  canonicalUcum: 'meq/L',
  canonicalUnit: 'mEq/L',
  siUcum: 'mmol/L',
  siUnit: 'mmol/L',
};

/** CAC scores — Agatston Units (AU), dimensionless. */
const CAC_ALIASES: Record<string, string> = { au: 'AU' };
const CAC: Omit<BiomarkerUnitConfig, 'aliases'> = {
  canonicalUcum: '{score}',
  canonicalUnit: 'AU',
  siUcum: '{score}',
  siUnit: 'AU',
};

/** nmol/L biomarkers — same unit for canonical and SI. */
const NMOL_L_ALIASES: Record<string, string> = { 'nmol/l': 'nmol/L' };
const NMOL_L: Omit<BiomarkerUnitConfig, 'aliases'> = {
  canonicalUcum: 'nmol/L',
  canonicalUnit: 'nmol/L',
  siUcum: 'nmol/L',
  siUnit: 'nmol/L',
};

export const BIOMARKER_UNITS: Record<string, BiomarkerUnitConfig> = {
  AFP: {
    aliases: { 'ng/ml': 'ng/mL' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    siUcum: 'ng/mL',
    siUnit: 'ng/mL',
  },
  Albumin: {
    aliases: { 'g/dl': 'g/dL', 'g/l': 'g/L' },
    canonicalUcum: 'g/dL',
    canonicalUnit: 'g/dL',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  AlkalinePhosphatase: { aliases: ENZYME_ALIASES, ...ENZYME },
  ALT: { aliases: ENZYME_ALIASES, ...ENZYME },
  AMH: {
    aliases: { 'ng/ml': 'ng/mL', 'pmol/l': 'pmol/L' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    molecularWeight: 12_500,
    siUcum: 'pmol/L',
    siUnit: 'pmol/L',
  },
  Amylase: { aliases: ENZYME_ALIASES, ...ENZYME },
  AntiThyroglobulin: {
    aliases: { 'iu/ml': 'IU/mL', 'ui/ml': 'IU/mL' },
    canonicalUcum: '[iU]/mL',
    canonicalUnit: 'IU/mL',
    siUcum: '[iU]/mL',
    siUnit: 'IU/mL',
  },
  AntiTPO: {
    aliases: { 'iu/ml': 'IU/mL', 'ui/ml': 'IU/mL' },
    canonicalUcum: '[iU]/mL',
    canonicalUnit: 'IU/mL',
    siUcum: '[iU]/mL',
    siUnit: 'IU/mL',
  },
  AoA1: {
    aliases: { 'mg/dl': 'mg/dL' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    siUcum: 'mg/dL',
    siUnit: 'mg/dL',
  },
  AorticValveCalcium: { aliases: CAC_ALIASES, ...CAC },
  ApoB: {
    aliases: { 'mg/dl': 'mg/dL' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    siUcum: 'mg/dL',
    siUnit: 'mg/dL',
  },
  AST: { aliases: ENZYME_ALIASES, ...ENZYME },
  Basophils: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Basophils_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  BilirubinDirect: {
    aliases: { 'mg/dl': 'mg/dL', 'µmol/l': 'µmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 584.66,
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
  },
  BilirubinIndirect: {
    aliases: { 'mg/dl': 'mg/dL', 'µmol/l': 'µmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 584.66,
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
  },
  BilirubinTotal: {
    aliases: { 'mg/dl': 'mg/dL', 'µmol/l': 'µmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 584.66,
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
  },
  BMC: { aliases: DEXA_KG_ALIASES, ...DEXA_KG },
  BMI: {
    aliases: { 'kg/m2': 'kg/m²', 'kg/m²': 'kg/m²' },
    canonicalUcum: 'kg/m2',
    canonicalUnit: 'kg/m²',
    siUcum: 'kg/m2',
    siUnit: 'kg/m²',
  },
  BNP: {
    aliases: { 'pg/ml': 'pg/mL' },
    canonicalUcum: 'pg/mL',
    canonicalUnit: 'pg/mL',
    siUcum: 'pg/mL',
    siUnit: 'pg/mL',
  },
  CA125: {
    aliases: { 'u/ml': 'U/mL' },
    canonicalUcum: 'U/mL',
    canonicalUnit: 'U/mL',
    siUcum: 'U/mL',
    siUnit: 'U/mL',
  },
  CAC_LAD: { aliases: CAC_ALIASES, ...CAC },
  CAC_LCX: { aliases: CAC_ALIASES, ...CAC },
  CAC_LMA: { aliases: CAC_ALIASES, ...CAC },
  CAC_RCA: { aliases: CAC_ALIASES, ...CAC },
  Calcium: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 40.08,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  CEA: {
    aliases: { 'ng/ml': 'ng/mL' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    siUcum: 'ng/mL',
    siUnit: 'ng/mL',
  },
  Chloride: { aliases: ELECTROLYTE_MONO_ALIASES, ...ELECTROLYTE_MONO },
  Cholesterol: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 386.65,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  CK: { aliases: ENZYME_ALIASES, ...ENZYME },
  CO2: { aliases: ELECTROLYTE_MONO_ALIASES, ...ELECTROLYTE_MONO },
  Cortisol: {
    aliases: { 'mcg/dl': 'µg/dL', 'nmol/l': 'nmol/L', 'ug/dl': 'µg/dL', 'µg/dl': 'µg/dL' },
    canonicalUcum: 'ug/dL',
    canonicalUnit: 'µg/dL',
    molecularWeight: 362.46,
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
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
  DHEAS: {
    aliases: { 'mcg/dl': 'µg/dL', 'ug/dl': 'µg/dL', 'µg/dl': 'µg/dL', 'µmol/l': 'µmol/L' },
    canonicalUcum: 'ug/dL',
    canonicalUnit: 'µg/dL',
    molecularWeight: 368.49,
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
  },
  DHT: {
    aliases: { 'ng/dl': 'ng/dL', 'nmol/l': 'nmol/L' },
    canonicalUcum: 'ng/dL',
    canonicalUnit: 'ng/dL',
    molecularWeight: 290.44,
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
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
  Eosinophils: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Eosinophils_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  EPADPADHA: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  ESR: {
    aliases: { 'mm/h': 'mm/h', 'mm/hr': 'mm/h' },
    canonicalUcum: 'mm/h',
    canonicalUnit: 'mm/h',
    siUcum: 'mm/h',
    siUnit: 'mm/h',
  },
  Estradiol: {
    aliases: { 'ng/dl': 'ng/dL', 'pg/ml': 'pg/mL' },
    canonicalUcum: 'pg/mL',
    canonicalUnit: 'pg/mL',
    molecularWeight: 272.38,
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
  Folate: {
    aliases: { 'ng/ml': 'ng/mL', 'nmol/l': 'nmol/L' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    molecularWeight: 441.4,
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
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
  GGT: { aliases: ENZYME_ALIASES, ...ENZYME },
  Globulin: {
    aliases: { 'g/dl': 'g/dL', 'g/l': 'g/L' },
    canonicalUcum: 'g/dL',
    canonicalUnit: 'g/dL',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  Glucose: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 180.156,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  HbA1c: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Hct: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  HDL: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 386.65,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  HDL_Large: { aliases: NMOL_L_ALIASES, ...NMOL_L },
  Hgb: {
    aliases: { 'g/dl': 'g/dL', 'g/l': 'g/L' },
    canonicalUcum: 'g/dL',
    canonicalUnit: 'g/dL',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  Homocysteine: {
    aliases: { 'umol/l': 'µmol/L', 'µmol/l': 'µmol/L' },
    canonicalUcum: 'umol/L',
    canonicalUnit: 'µmol/L',
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
  },
  IgA: {
    aliases: { 'g/l': 'g/L', 'mg/dl': 'mg/dL' },
    canonicalUcum: 'g/L',
    canonicalUnit: 'g/L',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  IgG: {
    aliases: { 'g/l': 'g/L', 'mg/dl': 'mg/dL' },
    canonicalUcum: 'g/L',
    canonicalUnit: 'g/L',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  INR: {
    aliases: { '{ratio}': '{ratio}' },
    canonicalUcum: '{ratio}',
    canonicalUnit: '{ratio}',
    siUcum: '{ratio}',
    siUnit: '{ratio}',
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
  LDL_Medium: { aliases: NMOL_L_ALIASES, ...NMOL_L },
  LDL_ParticleNumber: { aliases: NMOL_L_ALIASES, ...NMOL_L },
  LDL_Peak_Size: {
    aliases: { å: 'Ao', angstrom: 'Ao', ao: 'Ao', nm: 'nm' },
    canonicalUcum: 'Ao',
    canonicalUnit: 'Angstrom',
    siUcum: 'nm',
    siUnit: 'nm',
  },
  LDL_Small: { aliases: NMOL_L_ALIASES, ...NMOL_L },
  Lead: {
    aliases: { 'mcg/dl': 'µg/dL', 'ug/dl': 'µg/dL', 'µg/dl': 'µg/dL', 'µmol/l': 'µmol/L' },
    canonicalUcum: 'ug/dL',
    canonicalUnit: 'µg/dL',
    molecularWeight: 207.2,
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
  },
  LeanMass: { aliases: DEXA_KG_ALIASES, ...DEXA_KG },
  Leptin: {
    aliases: { 'ng/ml': 'ng/mL' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    siUcum: 'ng/mL',
    siUnit: 'ng/mL',
  },
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
  Lipase: { aliases: ENZYME_ALIASES, ...ENZYME },
  Lipoprotein_a: {
    aliases: { 'mg/dl': 'mg/dL', 'nmol/l': 'nmol/L' },
    canonicalUcum: 'nmol/L',
    canonicalUnit: 'nmol/L',
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
  },
  Lymphocytes: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Lymphocytes_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  MCH: {
    aliases: { pg: 'pg' },
    canonicalUcum: 'pg',
    canonicalUnit: 'pg',
    siUcum: 'pg',
    siUnit: 'pg',
  },
  MCHC: {
    aliases: { 'g/dl': 'g/dL', 'g/l': 'g/L' },
    canonicalUcum: 'g/dL',
    canonicalUnit: 'g/dL',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  MCV: {
    aliases: { fl: 'fL' },
    canonicalUcum: 'fL',
    canonicalUnit: 'fL',
    siUcum: 'fL',
    siUnit: 'fL',
  },
  Mercury: {
    aliases: { 'mcg/l': 'µg/L', 'nmol/l': 'nmol/L', 'ug/l': 'µg/L', 'µg/l': 'µg/L' },
    canonicalUcum: 'ug/L',
    canonicalUnit: 'µg/L',
    molecularWeight: 200.59,
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
  },
  Microalbumin_Urine: {
    aliases: { 'mg/l': 'mg/L' },
    canonicalUcum: 'mg/L',
    canonicalUnit: 'mg/L',
    siUcum: 'mg/L',
    siUnit: 'mg/L',
  },
  MMA: { aliases: NMOL_L_ALIASES, ...NMOL_L },
  Monocytes: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Monocytes_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  MPV: {
    aliases: { fl: 'fL' },
    canonicalUcum: 'fL',
    canonicalUnit: 'fL',
    siUcum: 'fL',
    siUnit: 'fL',
  },
  Myeloperoxidase: {
    aliases: { 'pmol/l': 'pmol/L' },
    canonicalUcum: 'pmol/L',
    canonicalUnit: 'pmol/L',
    siUcum: 'pmol/L',
    siUnit: 'pmol/L',
  },
  Neutrophils: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Neutrophils_Abs: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  // MW 386.65 = colesterol livre. Frações lipoproteicas são heterogêneas,
  // mas a conversão mg/dL→mmol/L usa MW do colesterol por convenção clínica.
  NonHDL_Cholesterol: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 386.65,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  NTproBNP: {
    aliases: { 'pg/ml': 'pg/mL' },
    canonicalUcum: 'pg/mL',
    canonicalUnit: 'pg/mL',
    siUcum: 'pg/mL',
    siUnit: 'pg/mL',
  },
  Omega3_DHA: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Omega3_DPA: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Omega3_EPA: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Omega3_Total: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Omega6_AA: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Omega6_LA: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Omega6_Total: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Platelets: { aliases: CBC_DIFF_ALIASES, ...CBC_DIFF },
  Potassium: { aliases: ELECTROLYTE_MONO_ALIASES, ...ELECTROLYTE_MONO },
  Progesterone: {
    aliases: { 'ng/ml': 'ng/mL', 'nmol/l': 'nmol/L' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    molecularWeight: 314.46,
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
  },
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
  ProthrombinTime: {
    aliases: { s: 's', sec: 's' },
    canonicalUcum: 's',
    canonicalUnit: 's',
    siUcum: 's',
    siUnit: 's',
  },
  PSA: {
    aliases: { 'ng/ml': 'ng/mL' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    siUcum: 'ng/mL',
    siUnit: 'ng/mL',
  },
  PSA_Free: {
    aliases: { 'ng/ml': 'ng/mL' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    siUcum: 'ng/mL',
    siUnit: 'ng/mL',
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
  RDW: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  Reticulocytes: { aliases: PERCENTAGE_ALIASES, ...PERCENTAGE },
  RheumatoidFactor: {
    aliases: { 'iu/ml': 'IU/mL', 'ui/ml': 'IU/mL' },
    canonicalUcum: '[iU]/mL',
    canonicalUnit: 'IU/mL',
    siUcum: '[iU]/mL',
    siUnit: 'IU/mL',
  },
  SHBG: { aliases: NMOL_L_ALIASES, ...NMOL_L },
  Sodium: { aliases: ELECTROLYTE_MONO_ALIASES, ...ELECTROLYTE_MONO },
  T3Free: {
    aliases: { 'pg/ml': 'pg/mL', 'pmol/l': 'pmol/L' },
    canonicalUcum: 'pg/mL',
    canonicalUnit: 'pg/mL',
    molecularWeight: 650.98,
    siUcum: 'pmol/L',
    siUnit: 'pmol/L',
  },
  T4Free: {
    aliases: { 'ng/dl': 'ng/dL', 'pmol/l': 'pmol/L' },
    canonicalUcum: 'ng/dL',
    canonicalUnit: 'ng/dL',
    molecularWeight: 776.87,
    siUcum: 'pmol/L',
    siUnit: 'pmol/L',
  },
  T4Total: {
    aliases: { 'mcg/dl': 'µg/dL', 'nmol/l': 'nmol/L', 'ug/dl': 'µg/dL', 'µg/dl': 'µg/dL' },
    canonicalUcum: 'ug/dL',
    canonicalUnit: 'µg/dL',
    molecularWeight: 776.87,
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
  },
  Testosterone: {
    aliases: { 'ng/dl': 'ng/dL', 'nmol/l': 'nmol/L' },
    canonicalUcum: 'ng/dL',
    canonicalUnit: 'ng/dL',
    molecularWeight: 288.42,
    siUcum: 'nmol/L',
    siUnit: 'nmol/L',
  },
  TestosteroneFree: {
    aliases: { 'pg/ml': 'pg/mL', 'pmol/l': 'pmol/L' },
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
  TotalProtein: {
    aliases: { 'g/dl': 'g/dL', 'g/l': 'g/L' },
    canonicalUcum: 'g/dL',
    canonicalUnit: 'g/dL',
    siUcum: 'g/L',
    siUnit: 'g/L',
  },
  Triglycerides: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 885.4,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
  },
  TroponinI: {
    aliases: { 'ng/ml': 'ng/mL' },
    canonicalUcum: 'ng/mL',
    canonicalUnit: 'ng/mL',
    siUcum: 'ng/mL',
    siUnit: 'ng/mL',
  },
  TroponinT: {
    aliases: { 'ng/l': 'ng/L' },
    canonicalUcum: 'ng/L',
    canonicalUnit: 'ng/L',
    siUcum: 'ng/L',
    siUnit: 'ng/L',
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
  UricAcid: {
    aliases: { 'mg/dl': 'mg/dL', 'µmol/l': 'µmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 168.11,
    siUcum: 'umol/L',
    siUnit: 'µmol/L',
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
  VLDL: {
    aliases: { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L' },
    canonicalUcum: 'mg/dL',
    canonicalUnit: 'mg/dL',
    molecularWeight: 386.65,
    siUcum: 'mmol/L',
    siUnit: 'mmol/L',
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

// ─── Unit Conversion ────────────────────────────────────────────────────────────

/**
 * Normalize a unit string to its canonical display form for a given biomarker.
 * Returns the input unchanged if no alias is found.
 */
function normalizeUnit(unit: string, config: BiomarkerUnitConfig): string {
  return config.aliases[unit.toLowerCase()] ?? config.aliases[unit] ?? unit;
}

/**
 * Conversion factor tables for unit pairs that don't require molecular weight.
 * Key format: "fromUnit -> toUnit" (using canonical display forms).
 * Both directions must be listed explicitly — there is no auto-inversion.
 */
const FIXED_FACTORS: Record<string, number> = {
  'g/dL -> g/L': 10,
  'g/L -> g/dL': 0.1,
  'g/L -> mg/dL': 100,
  'mEq/L -> mmol/L': 1,
  'mg/dL -> g/L': 0.01,
  'mmol/L -> mEq/L': 1,
  'ng/dL -> pg/mL': 10,
  'ng/mL -> µg/L': 1,
  'pg/mL -> ng/dL': 0.1,
  'µg/L -> ng/mL': 1,
};

/**
 * MW-based conversion definitions.
 * Each entry maps a (fromUnit, toUnit) pair to the formula:
 *   result = value × numerator / (MW × denominator)
 *
 * Common patterns:
 *   mg/dL  → mmol/L:  value × 10   / MW
 *   mg/dL  → µmol/L:  value × 10000 / MW  (or equivalently × 10 / MW × 1000)
 *   ng/mL  → nmol/L:  value × 1000 / MW
 *   pg/mL  → pmol/L:  value × 1000 / MW
 *   ng/dL  → nmol/L:  value × 10   / MW
 */
/**
 * MW conversion entries. Each direction is explicit to avoid fragile inversion logic.
 * Formula: result = value × scale / MW  (when divideByMW is true)
 *          result = value × MW / scale  (when divideByMW is false)
 */
interface MWConversion {
  divideByMW: boolean;
  scale: number;
}

const MW_CONVERSIONS: Record<string, MWConversion> = {
  'mg/dL -> mmol/L': { divideByMW: true, scale: 10 },
  'mg/dL -> µmol/L': { divideByMW: true, scale: 10_000 },
  'mmol/L -> mg/dL': { divideByMW: false, scale: 10 },
  'ng/dL -> nmol/L': { divideByMW: true, scale: 10 },
  'ng/dL -> pmol/L': { divideByMW: true, scale: 10_000 },
  'ng/mL -> nmol/L': { divideByMW: true, scale: 1000 },
  'ng/mL -> pmol/L': { divideByMW: true, scale: 1_000_000 },
  'nmol/L -> ng/dL': { divideByMW: false, scale: 10 },
  'nmol/L -> ng/mL': { divideByMW: false, scale: 1000 },
  'nmol/L -> µg/dL': { divideByMW: false, scale: 10_000 },
  'nmol/L -> µg/L': { divideByMW: false, scale: 1000 },
  'pg/mL -> pmol/L': { divideByMW: true, scale: 1000 },
  'pmol/L -> ng/dL': { divideByMW: false, scale: 10_000 },
  'pmol/L -> ng/mL': { divideByMW: false, scale: 1_000_000 },
  'pmol/L -> pg/mL': { divideByMW: false, scale: 1000 },
  'µg/dL -> nmol/L': { divideByMW: true, scale: 10_000 },
  'µg/dL -> µmol/L': { divideByMW: true, scale: 10 },
  'µg/L -> nmol/L': { divideByMW: true, scale: 1000 },
  'µmol/L -> mg/dL': { divideByMW: false, scale: 10_000 },
  'µmol/L -> µg/dL': { divideByMW: false, scale: 10 },
};

export interface ConversionResult {
  unit: string;
  value: number;
}

/**
 * Convert a biomarker value between units.
 *
 * Supports:
 * - Fixed-factor conversions (e.g. ng/dL ↔ pg/mL, g/dL ↔ g/L)
 * - Molecular-weight-based conversions (e.g. mg/dL ↔ mmol/L, pg/mL ↔ pmol/L)
 *
 * @returns The converted value and target unit, or null if conversion is not possible.
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  biomarkerCode: string,
): ConversionResult | null {
  const config = BIOMARKER_UNITS[biomarkerCode];
  if (!config) return null;

  const normFrom = normalizeUnit(fromUnit, config);
  const normTo = normalizeUnit(toUnit, config);

  if (normFrom === normTo) {
    return { unit: normTo, value };
  }

  const key = `${normFrom} -> ${normTo}`;

  const fixedFactor = FIXED_FACTORS[key];
  if (fixedFactor !== undefined) {
    return { unit: normTo, value: value * fixedFactor };
  }

  const mwConv = MW_CONVERSIONS[key];
  if (mwConv && config.molecularWeight) {
    const result = mwConv.divideByMW
      ? (value * mwConv.scale) / config.molecularWeight
      : (value * config.molecularWeight) / mwConv.scale;
    return { unit: normTo, value: result };
  }

  return null;
}
