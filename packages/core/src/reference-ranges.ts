/**
 * Biomarker Reference Ranges
 *
 * Single source of truth for biomarker reference ranges used by both
 * web app (for display) and API (for fallback when LLM doesn't extract ranges).
 *
 * Data sources (priority order):
 * 1. Brazilian Government - SBPC/ML (Sociedade Brasileira de Patologia Clínica) guidelines
 * 2. International Standards - WHO, clinical laboratory guidelines
 * 3. Specific Labs - Fleury, Weinmann, Quest, LabCorp (when above unavailable)
 */

import { getCanonicalUnit as getCanonicalUnitForCode } from './units';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Sex-specific key for reference ranges
 */
export type SexKey = 'M' | 'F' | 'all';

/**
 * Reference range configuration for a biomarker
 */
export interface BiomarkerReferenceRange {
  max?: number;
  min?: number;
  optimalMax?: number;
  optimalMin?: number;
  unit: string;
  warningMax?: number;
}

/**
 * A variant of a reference range that applies to a specific sex and/or age group
 */
export interface RangeVariant {
  ageMax?: number;
  ageMin?: number;
  range: BiomarkerReferenceRange;
  sex: SexKey;
}

/**
 * Extended biomarker range definition with sex/age-specific variants
 */
/**
 * Direction indicates whether exceeding the reference range on one side is benign.
 * - 'range': both above-max and below-min are abnormal (default)
 * - 'higher-better': above-max is normal (e.g., BMC, HDL)
 * - 'lower-better': below-min is normal (e.g., LDL, CRP)
 */
export type RangeDirection = 'range' | 'higher-better' | 'lower-better';

export interface BiomarkerRangeDefinition {
  default: BiomarkerReferenceRange;
  direction?: RangeDirection;
  /**
   * Chave de fonte bibliográfica, opcionalmente com localizador.
   *
   * Formato: `'chave'` ou `'chave:localizador'`
   *
   * Exemplos:
   * - `'sbc-lipids-2017'` — fonte sem localização específica
   * - `'sbc-lipids-2017:p15'` — página 15
   * - `'sbpc-ml-2021:t4.1'` — tabela 4.1
   *
   * As chaves devem corresponder a entradas em `SOURCE_REGISTRY` (sources.ts).
   * Consulte `docs/fontes-referencia.md` para a bibliografia completa em formato ABNT.
   */
  source?: string;
  variants?: RangeVariant[];
}

/**
 * User context for personalized reference range lookup
 */
export interface ReferenceRangeContext {
  age?: number;
  biologicalSex?: 'M' | 'F';
}

// =============================================================================
// BIOMARKER RANGE DEFINITIONS
// =============================================================================

/**
 * Comprehensive biomarker reference range definitions with sex/age-specific variants
 *
 * Each marker has a default range (used as fallback) and optional variants
 * for sex/age-specific ranges.
 */
export const biomarkerRangeDefinitions: Record<string, BiomarkerRangeDefinition> = {
  // =============================================================================
  // LIPIDS
  // =============================================================================

  Albumin_Creatinine_Ratio: {
    default: { max: 30, min: 0, optimalMax: 20, optimalMin: 0, unit: 'mg/g' },
  },

  Adiponectin: {
    default: { max: 26, min: 4, optimalMax: 20, optimalMin: 8, unit: 'mcg/mL' },
  },

  ADMA: {
    default: { max: 0.7, min: 0.3, optimalMax: 0.55, optimalMin: 0.3, unit: 'umol/L' },
    source: 'schlesinger-adma-2017',
  },

  AFP: {
    default: { max: 10, min: 0, optimalMax: 8, optimalMin: 0, unit: 'ng/mL' },
  },

  Albumin_Globulin_Ratio: {
    default: { max: 2.5, min: 1.0, optimalMax: 2.2, optimalMin: 1.2, unit: '' },
  },

  Albumin: {
    default: { max: 5.0, min: 3.5, optimalMax: 4.8, optimalMin: 4.0, unit: 'g/dL' },
    source: 'sbpc-ml-2021',
  },

  AlkalinePhosphatase: {
    default: { max: 147, min: 44, optimalMax: 120, optimalMin: 50, unit: 'U/L' },
    variants: [
      {
        ageMin: 18,
        range: { max: 147, min: 44, optimalMax: 120, optimalMin: 50, unit: 'U/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 104, min: 35, optimalMax: 90, optimalMin: 40, unit: 'U/L' },
        sex: 'F',
      },
    ],
  },

  ALT: {
    default: { max: 35, min: 0, optimalMax: 25, optimalMin: 0, unit: 'U/L' },
    source: 'sbpc-ml-2021',
    variants: [
      {
        ageMin: 18,
        range: { max: 56, min: 7, optimalMax: 35, optimalMin: 10, unit: 'U/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 45, min: 7, optimalMax: 30, optimalMin: 10, unit: 'U/L' },
        sex: 'F',
      },
    ],
  },

  AMH: {
    default: { max: 10.0, min: 1.0, optimalMax: 6.9, optimalMin: 2.0, unit: 'ng/mL' },
    variants: [
      {
        ageMax: 24,
        ageMin: 18,
        range: { max: 13.0, min: 1.5, optimalMax: 10.0, optimalMin: 3.0, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMax: 30,
        ageMin: 25,
        range: { max: 10.0, min: 1.5, optimalMax: 8.0, optimalMin: 2.5, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMax: 35,
        ageMin: 31,
        range: { max: 8.0, min: 1.0, optimalMax: 6.0, optimalMin: 2.0, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMax: 40,
        ageMin: 36,
        range: { max: 6.0, min: 0.5, optimalMax: 4.0, optimalMin: 1.0, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMin: 41,
        range: { max: 3.0, min: 0.1, optimalMax: 2.0, optimalMin: 0.5, unit: 'ng/mL' },
        sex: 'F',
      },
    ],
  },

  Ammonia: {
    default: { max: 45, min: 15, optimalMax: 40, optimalMin: 20, unit: 'umol/L' },
  },

  AntiThyroglobulin: {
    default: { max: 115, min: 0, optimalMax: 40, optimalMin: 0, unit: 'IU/mL' },
  },

  AntiTPO: {
    default: { max: 34, min: 0, optimalMax: 9, optimalMin: 0, unit: 'IU/mL' },
  },

  // Aortic valve calcium — no standardized clinical threshold; use mild cutoff
  // Cálcio de válvula aórtica — usa mesma classificação Agatston
  AorticValveCalcium: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  ApoA1: {
    default: { max: 200, min: 100, optimalMax: 180, optimalMin: 120, unit: 'mg/dL' },
    source: 'contois-apoa1-1996',
  },

  ApoB: {
    default: { max: 90, min: 0, optimalMax: 70, optimalMin: 0, unit: 'mg/dL' },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  ApoCIII: {
    default: { max: 10, min: 0, optimalMax: 7, optimalMin: 0, unit: 'mg/dL' },
    source: 'khetarpal-apociii-2016',
  },

  // ApoCIII/ApoA1 Ratio: derivado de ApoCIII (~10 mg/dL) e ApoA1 (~100-150 mg/dL)
  // Nota: o corte de 0.15 não tem fonte publicada identificada
  ApoCIII_ApoA1_Ratio: {
    default: { max: 0.15, min: 0, optimalMax: 0.1, optimalMin: 0, unit: '' },
    source: 'khetarpal-apociii-2016',
  },

  // =============================================================================
  // THYROID
  // =============================================================================

  Omega6_AA: {
    default: { max: 15.0, min: 5.0, optimalMax: 12.0, optimalMin: 7.0, unit: '%' },
  },

  AA_EPA_Ratio: {
    default: { max: 15.0, min: 1.0, optimalMax: 5.0, optimalMin: 1.5, unit: '' },
    direction: 'lower-better',
  },

  Arsenic: {
    default: { max: 35, min: 0, optimalMax: 20, optimalMin: 0, unit: 'mcg/L' },
  },

  AST: {
    default: { max: 35, min: 0, optimalMax: 25, optimalMin: 0, unit: 'U/L' },
    source: 'sbpc-ml-2021',
    variants: [
      {
        ageMin: 18,
        range: { max: 40, min: 10, optimalMax: 30, optimalMin: 10, unit: 'U/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 32, min: 9, optimalMax: 25, optimalMin: 10, unit: 'U/L' },
        sex: 'F',
      },
    ],
  },

  Basophils: {
    default: { max: 1, min: 0, optimalMax: 0.5, optimalMin: 0, unit: '%' },
  },

  Basophils_Abs: {
    default: { max: 0.1, min: 0, optimalMax: 0.05, optimalMin: 0, unit: 'K/uL' },
  },

  // =============================================================================
  // HEMATOLOGY - CBC
  // =============================================================================

  Bicarbonate: {
    default: { max: 29, min: 23, optimalMax: 28, optimalMin: 24, unit: 'mEq/L' },
  },

  BilirubinDirect: {
    default: { max: 0.3, min: 0, optimalMax: 0.2, optimalMin: 0, unit: 'mg/dL' },
  },

  BilirubinIndirect: {
    default: { max: 0.8, min: 0, optimalMax: 0.6, optimalMin: 0, unit: 'mg/dL' },
  },

  BilirubinTotal: {
    default: { max: 1.2, min: 0.1, optimalMax: 0.9, optimalMin: 0.2, unit: 'mg/dL' },
  },

  BNP: {
    default: { max: 100, min: 0, optimalMax: 50, optimalMin: 0, unit: 'pg/mL' },
    source: 'maisel-bnp-2002',
  },

  BUN_Creatinine_Ratio: {
    default: { max: 20, min: 10, optimalMax: 18, optimalMin: 12, unit: '' },
  },

  CA125: {
    default: { max: 35, min: 0, optimalMax: 25, optimalMin: 0, unit: 'U/mL' },
  },

  CA199: {
    default: { max: 37, min: 0, optimalMax: 30, optimalMin: 0, unit: 'U/mL' },
  },

  // CAC: Agatston classification — 0=none, 1-99=mild, 100-399=moderate, 400+=severe
  // max=99 so only moderate+ scores (≥100) flag as ANORMAL; optimalMax=0 (zero is ideal)
  CAC: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  // Per-vessel scores — same Agatston classification applied per vessel
  CAC_LAD: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  CAC_LCX: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  CAC_LMA: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  CAC_Percentile: {
    default: { max: 50, min: 0, optimalMax: 25, optimalMin: 0, unit: '%', warningMax: 75 },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  CAC_RCA: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  Cadmium: {
    default: { max: 1.2, min: 0, optimalMax: 0.5, optimalMin: 0, unit: 'mcg/L' },
  },

  Calcium: {
    default: { max: 10.5, min: 8.5, optimalMax: 10.0, optimalMin: 9.0, unit: 'mg/dL' },
  },

  CEA: {
    default: { max: 3.0, min: 0, optimalMax: 2.5, optimalMin: 0, unit: 'ng/mL' },
  },

  // CK: valores conservadores baseados em faixas laboratoriais típicas
  CK: {
    default: { max: 190, min: 30, optimalMax: 170, optimalMin: 40, unit: 'U/L' },
    source: 'tietz-7ed-2015',
    variants: [
      { sex: 'F', range: { max: 170, min: 30, optimalMax: 150, optimalMin: 40, unit: 'U/L' } },
    ],
  },

  Chloride: {
    default: { max: 106, min: 98, optimalMax: 105, optimalMin: 100, unit: 'mEq/L' },
  },

  Cholesterol: {
    default: { max: 200, min: 0, optimalMax: 180, optimalMin: 0, unit: 'mg/dL' },
    source: 'sbc-lipids-2025',
  },

  // Índice de Castelli I (CT/HDL-c)
  Cholesterol_HDL_Ratio: {
    // Índice de Castelli I — SBC 2017 usa M <4.9, F <4.3
    default: { max: 5.0, min: 0, optimalMax: 3.5, optimalMin: 0, unit: '' },
    direction: 'lower-better',
    source: 'castelli-ratio-1992',
    variants: [
      {
        ageMin: 18,
        range: { max: 5.0, min: 0, optimalMax: 4.0, optimalMin: 0, unit: '' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 4.5, min: 0, optimalMax: 3.5, optimalMin: 0, unit: '' },
        sex: 'F',
      },
    ],
  },

  CO2: {
    default: { max: 29, min: 23, optimalMax: 28, optimalMin: 24, unit: 'mEq/L' },
  },

  Copper: {
    default: { max: 175, min: 70, optimalMax: 150, optimalMin: 85, unit: 'mcg/dL' },
  },

  CoQ10: {
    default: { max: 1.5, min: 0.5, optimalMax: 1.3, optimalMin: 0.7, unit: 'mg/L' },
  },

  Cortisol: {
    default: { max: 25, min: 5, optimalMax: 20, optimalMin: 10, unit: 'mcg/dL' },
  },

  CortisolFree: {
    default: { max: 2.5, min: 0.5, optimalMax: 2.0, optimalMin: 0.8, unit: 'mcg/dL' },
  },

  CPeptide: {
    default: { max: 3.9, min: 0.8, optimalMax: 3.0, optimalMin: 1.0, unit: 'ng/mL' },
  },

  Creatinine: {
    default: { max: 1.2, min: 0.6, optimalMax: 1.0, optimalMin: 0.7, unit: 'mg/dL' },
    source: 'sbpc-ml-2021',
    variants: [
      {
        ageMin: 18,
        range: { max: 1.3, min: 0.7, optimalMax: 1.1, optimalMin: 0.8, unit: 'mg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 1.1, min: 0.5, optimalMax: 0.9, optimalMin: 0.6, unit: 'mg/dL' },
        sex: 'F',
      },
    ],
  },

  CRP: {
    default: { max: 3.0, min: 0, optimalMax: 1.0, optimalMin: 0, unit: 'mg/L' },
    direction: 'lower-better',
  },

  CystatinC: {
    default: { max: 1.0, min: 0.5, optimalMax: 0.9, optimalMin: 0.6, unit: 'mg/L' },
  },

  // D-Dímero: 500 ng/mL é o corte clínico padrão para exclusão de TEV
  DDimer: {
    default: { max: 500, min: 0, optimalMax: 250, optimalMin: 0, unit: 'ng/mL' },
    source: 'wells-ddimer-2003',
  },

  // =============================================================================
  // METABOLIC PANEL
  // =============================================================================

  Omega3_DHA: {
    default: { max: 8.0, min: 2.0, optimalMax: 6.5, optimalMin: 3.5, unit: '%' },
  },

  DHEAS: {
    default: { max: 500, min: 100, optimalMax: 400, optimalMin: 150, unit: 'mcg/dL' },
    variants: [
      {
        ageMax: 39,
        ageMin: 18,
        range: { max: 640, min: 280, optimalMax: 500, optimalMin: 300, unit: 'mcg/dL' },
        sex: 'M',
      },
      {
        ageMax: 59,
        ageMin: 40,
        range: { max: 520, min: 120, optimalMax: 400, optimalMin: 150, unit: 'mcg/dL' },
        sex: 'M',
      },
      {
        ageMin: 60,
        range: { max: 290, min: 42, optimalMax: 220, optimalMin: 80, unit: 'mcg/dL' },
        sex: 'M',
      },
      {
        ageMax: 39,
        ageMin: 18,
        range: { max: 380, min: 65, optimalMax: 300, optimalMin: 100, unit: 'mcg/dL' },
        sex: 'F',
      },
      {
        ageMax: 59,
        ageMin: 40,
        range: { max: 240, min: 32, optimalMax: 180, optimalMin: 60, unit: 'mcg/dL' },
        sex: 'F',
      },
      {
        ageMin: 60,
        range: { max: 140, min: 18, optimalMax: 100, optimalMin: 30, unit: 'mcg/dL' },
        sex: 'F',
      },
    ],
  },

  Omega3_DPA: {
    default: { max: 2.0, min: 0.3, optimalMax: 1.5, optimalMin: 0.5, unit: '%' },
  },

  eGFR: {
    default: { max: 120, min: 90, optimalMax: 120, optimalMin: 90, unit: 'mL/min/1.73m²' },
    variants: [
      {
        ageMin: 60,
        range: { max: 90, min: 60, optimalMax: 90, optimalMin: 60, unit: 'mL/min/1.73m²' },
        sex: 'all',
      },
    ],
  },

  Eosinophils: {
    default: { max: 5, min: 0, optimalMax: 4, optimalMin: 1, unit: '%' },
    direction: 'lower-better',
  },

  Eosinophils_Abs: {
    default: { max: 0.5, min: 0, optimalMax: 0.3, optimalMin: 0, unit: 'K/uL' },
  },

  Omega3_EPA: {
    default: { max: 3.5, min: 0.5, optimalMax: 2.5, optimalMin: 1.0, unit: '%' },
  },

  EPADPADHA: {
    default: { max: 10.0, min: 3.0, optimalMax: 9.0, optimalMin: 5.0, unit: '%' },
  },

  ESR: {
    default: { max: 20, min: 0, optimalMax: 10, optimalMin: 0, unit: 'mm/hr' },
  },

  Estradiol: {
    default: { max: 40, min: 10, optimalMax: 35, optimalMin: 15, unit: 'pg/mL' },
    variants: [
      {
        ageMin: 18,
        range: { max: 40, min: 10, optimalMax: 30, optimalMin: 15, unit: 'pg/mL' },
        sex: 'M',
      },
      {
        ageMax: 50,
        ageMin: 18,
        range: { max: 400, min: 30, optimalMax: 300, optimalMin: 50, unit: 'pg/mL' },
        sex: 'F',
      },
      {
        ageMin: 51,
        range: { max: 30, min: 0, optimalMax: 20, optimalMin: 0, unit: 'pg/mL' },
        sex: 'F',
      },
    ],
  },

  F2Isoprostanes: {
    default: { max: 86, min: 0, optimalMax: 60, optimalMin: 0, unit: 'pg/mL' },
  },

  Ferritin: {
    default: { max: 300, min: 20, optimalMax: 150, optimalMin: 50, unit: 'ng/mL' },
    source: 'sbpc-ml-2021',
    variants: [
      {
        ageMin: 18,
        range: { max: 400, min: 30, optimalMax: 200, optimalMin: 50, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMax: 50,
        ageMin: 18,
        range: { max: 150, min: 15, optimalMax: 100, optimalMin: 30, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMin: 51,
        range: { max: 300, min: 30, optimalMax: 150, optimalMin: 50, unit: 'ng/mL' },
        sex: 'F',
      },
    ],
  },

  // Fibrinogênio: 200-400 mg/dL — faixa de referência padrão (método de Clauss)
  Fibrinogen: {
    default: { max: 400, min: 200, optimalMax: 350, optimalMin: 250, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  FolicAcid: {
    default: { max: 20, min: 3, optimalMax: 15, optimalMin: 5, unit: 'ng/mL' },
  },

  // =============================================================================
  // LIVER FUNCTION
  // =============================================================================

  FSH: {
    default: { max: 12.4, min: 1.5, optimalMax: 10.0, optimalMin: 3.0, unit: 'mIU/mL' },
    variants: [
      {
        ageMin: 18,
        range: { max: 12.4, min: 1.5, optimalMax: 8.0, optimalMin: 1.5, unit: 'mIU/mL' },
        sex: 'M',
      },
      {
        ageMax: 50,
        ageMin: 18,
        range: { max: 12.5, min: 3.5, optimalMax: 10.0, optimalMin: 3.5, unit: 'mIU/mL' },
        sex: 'F',
      },
      {
        ageMin: 51,
        range: { max: 134.8, min: 25.8, optimalMax: 80.0, optimalMin: 25.8, unit: 'mIU/mL' },
        sex: 'F',
      },
    ],
  },

  GGT: {
    default: { max: 55, min: 0, optimalMax: 30, optimalMin: 0, unit: 'U/L' },
    direction: 'lower-better',
    source: 'sbpc-ml-2021',
    variants: [
      {
        ageMin: 18,
        range: { max: 61, min: 8, optimalMax: 40, optimalMin: 10, unit: 'U/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 36, min: 5, optimalMax: 25, optimalMin: 8, unit: 'U/L' },
        sex: 'F',
      },
    ],
  },

  Ghrelin: {
    default: { max: 1000, min: 300, optimalMax: 800, optimalMin: 400, unit: 'pg/mL' },
  },

  Globulin: {
    default: { max: 3.5, min: 2.0, optimalMax: 3.2, optimalMin: 2.3, unit: 'g/dL' },
  },

  Glucose: {
    default: { max: 100, min: 70, optimalMax: 90, optimalMin: 70, unit: 'mg/dL' },
    source: 'sbd-diabetes-2024',
  },

  GlycoMark: {
    default: { max: 40, min: 10, optimalMax: 35, optimalMin: 15, unit: 'mcg/mL' },
  },

  GrowthHormone: {
    default: { max: 5, min: 0, optimalMax: 3, optimalMin: 0, unit: 'ng/mL' },
  },

  HbA1c: {
    default: { max: 5.7, min: 4.0, optimalMax: 5.3, optimalMin: 4.5, unit: '%' },
    source: 'sbd-diabetes-2024',
  },

  Hct: {
    default: { max: 50, min: 36, optimalMax: 48, optimalMin: 40, unit: '%' },
    variants: [
      {
        ageMin: 18,
        range: { max: 54, min: 40, optimalMax: 50, optimalMin: 42, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 48, min: 36, optimalMax: 45, optimalMin: 38, unit: '%' },
        sex: 'F',
      },
    ],
  },

  HDL: {
    default: { max: 60, min: 40, optimalMax: 60, optimalMin: 50, unit: 'mg/dL' },
    direction: 'higher-better',
    source: 'sbc-lipids-2025',
    variants: [
      {
        ageMin: 18,
        range: { max: 60, min: 40, optimalMax: 60, optimalMin: 45, unit: 'mg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 60, min: 50, optimalMax: 60, optimalMin: 55, unit: 'mg/dL' },
        sex: 'F',
      },
    ],
  },

  HDL_Large: {
    // HDL Large: higher is better
    // Quest Ion Mobility reference: Male 4334-10815, Female 5038-17886 nmol/L, optimal >6729
    default: { max: 17886, min: 4334, optimalMax: 17886, optimalMin: 6729, unit: 'nmol/L' },
    direction: 'higher-better',
    source: 'caulfield-ionmobility-2008',
  },

  // =============================================================================
  // INFLAMMATION
  // =============================================================================

  Hgb: {
    default: { max: 17.5, min: 12.0, optimalMax: 16.0, optimalMin: 13.5, unit: 'g/dL' },
    variants: [
      {
        ageMin: 18,
        range: { max: 17.5, min: 13.5, optimalMax: 16.5, optimalMin: 14.0, unit: 'g/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 15.5, min: 12.0, optimalMax: 14.5, optimalMin: 12.5, unit: 'g/dL' },
        sex: 'F',
      },
    ],
  },

  HOMA_IR: {
    default: { max: 2.5, min: 0, optimalMax: 1.5, optimalMin: 0, unit: '' },
    direction: 'lower-better',
  },

  Homocysteine: {
    default: { max: 15, min: 4, optimalMax: 10, optimalMin: 5, unit: 'umol/L' },
    direction: 'lower-better',
    source: 'selhub-homocysteine-1999',
  },

  IGF1: {
    default: { max: 350, min: 100, optimalMax: 300, optimalMin: 150, unit: 'ng/mL' },
  },

  // =============================================================================
  // METABOLIC
  // =============================================================================

  ImmatureGranulocytes: {
    default: { max: 1.0, min: 0, optimalMax: 0.5, optimalMin: 0, unit: '%' },
  },

  Insulin: {
    default: { max: 25, min: 2, optimalMax: 8, optimalMin: 3, unit: 'µIU/mL' },
  },

  Iron: {
    default: { max: 170, min: 60, optimalMax: 140, optimalMin: 80, unit: 'mcg/dL' },
    source: 'sbpc-ml-2021',
    variants: [
      {
        ageMin: 18,
        range: { max: 175, min: 65, optimalMax: 150, optimalMin: 80, unit: 'mcg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 170, min: 50, optimalMax: 130, optimalMin: 60, unit: 'mcg/dL' },
        sex: 'F',
      },
    ],
  },

  Lactate: {
    default: { max: 2.2, min: 0.5, optimalMax: 1.8, optimalMin: 0.7, unit: 'mmol/L' },
  },

  LDL: {
    default: { max: 100, min: 0, optimalMax: 70, optimalMin: 0, unit: 'mg/dL' },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  LDL_Medium: {
    // LDL Medium (LDL Média): lower is better
    // Quest Ion Mobility reference: Male 167-485, Female 121-397 nmol/L, optimal <215
    default: { max: 485, min: 121, optimalMax: 215, optimalMin: 121, unit: 'nmol/L' },
    direction: 'lower-better',
    source: 'caulfield-ionmobility-2008',
  },

  LDL_ParticleNumber: {
    // LDL Particle Number: lower is better
    // Quest Ion Mobility reference: 1016-2185 nmol/L, optimal <1138
    default: { max: 2185, min: 1016, optimalMax: 1138, optimalMin: 1016, unit: 'nmol/L' },
    direction: 'lower-better',
    source: 'caulfield-ionmobility-2008',
  },

  LDL_Peak_Size: {
    // LDL Peak Size: higher is better (larger particles less atherogenic)
    // Quest Ion Mobility reference: optimal >222.9 Å (22.29 nm)
    default: { max: 250.0, min: 217.4, optimalMax: 250.0, optimalMin: 222.9, unit: 'Å' },
    direction: 'higher-better',
    source: 'caulfield-ionmobility-2008',
  },

  // =============================================================================
  // IRON STUDIES
  // =============================================================================

  LDL_Small: {
    // LDL Small (LDL Pequena): lower is better (small dense LDL is most atherogenic)
    // Quest Ion Mobility reference: Male 123-441, Female 126-382 nmol/L, optimal <142
    default: { max: 441, min: 123, optimalMax: 142, optimalMin: 123, unit: 'nmol/L' },
    direction: 'lower-better',
    source: 'caulfield-ionmobility-2008',
  },

  Lead: {
    default: { max: 5, min: 0, optimalMax: 2, optimalMin: 0, unit: 'mcg/dL' },
  },

  Leptin: {
    default: { max: 15, min: 2, optimalMax: 12, optimalMin: 3, unit: 'ng/mL' },
    direction: 'lower-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 10, min: 1, optimalMax: 8, optimalMin: 2, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 25, min: 4, optimalMax: 18, optimalMin: 5, unit: 'ng/mL' },
        sex: 'F',
      },
    ],
  },

  LH: {
    default: { max: 8.6, min: 1.7, optimalMax: 8.0, optimalMin: 2.0, unit: 'mIU/mL' },
    variants: [
      {
        ageMin: 18,
        range: { max: 8.6, min: 1.7, optimalMax: 6.0, optimalMin: 1.7, unit: 'mIU/mL' },
        sex: 'M',
      },
      {
        ageMax: 50,
        ageMin: 18,
        range: { max: 12.6, min: 2.4, optimalMax: 10.0, optimalMin: 2.4, unit: 'mIU/mL' },
        sex: 'F',
      },
      {
        ageMin: 51,
        range: { max: 58.5, min: 7.7, optimalMax: 40.0, optimalMin: 10.0, unit: 'mIU/mL' },
        sex: 'F',
      },
    ],
  },

  Omega6_LA: {
    default: { max: 35.0, min: 15.0, optimalMax: 28.0, optimalMin: 18.0, unit: '%' },
  },

  // =============================================================================
  // VITAMINS
  // =============================================================================

  Lipoprotein_a: {
    default: { max: 75, min: 0, optimalMax: 30, optimalMin: 0, unit: 'nmol/L' },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  Lymphocytes: {
    default: { max: 40, min: 20, optimalMax: 35, optimalMin: 25, unit: '%' },
  },

  Lymphocytes_Abs: {
    default: { max: 4.0, min: 1.0, optimalMax: 3.0, optimalMin: 1.5, unit: 'K/uL' },
  },

  Magnesium: {
    default: { max: 2.2, min: 1.7, optimalMax: 2.1, optimalMin: 1.9, unit: 'mg/dL' },
  },

  Magnesium_RBC: {
    default: { max: 6.8, min: 4.0, optimalMax: 6.0, optimalMin: 4.5, unit: 'mg/dL' },
  },

  MCH: {
    default: { max: 33, min: 27, optimalMax: 32, optimalMin: 28, unit: 'pg' },
  },

  MCHC: {
    default: { max: 36, min: 32, optimalMax: 35, optimalMin: 33, unit: 'g/dL' },
  },

  MCV: {
    default: { max: 100, min: 80, optimalMax: 98, optimalMin: 82, unit: 'fL' },
  },

  Mercury: {
    default: { max: 10, min: 0, optimalMax: 5, optimalMin: 0, unit: 'mcg/L' },
  },

  Microalbumin: {
    default: { max: 30, min: 0, optimalMax: 20, optimalMin: 0, unit: 'mg/L' },
  },

  // =============================================================================
  // HORMONES
  // =============================================================================

  MMA: {
    default: { max: 378, min: 0, optimalMax: 270, optimalMin: 0, unit: 'nmol/L' },
  },

  Monocytes: {
    default: { max: 8, min: 2, optimalMax: 7, optimalMin: 3, unit: '%' },
  },

  Monocytes_Abs: {
    default: { max: 0.8, min: 0.2, optimalMax: 0.7, optimalMin: 0.3, unit: 'K/uL' },
  },

  MPV: {
    default: { max: 11.5, min: 7.5, optimalMax: 10.5, optimalMin: 8.0, unit: 'fL' },
  },

  // MPO: 420 pmol/L — valor conservador entre Meuwese 2007 (322) e Cleveland HeartLab (470)
  Myeloperoxidase: {
    default: { max: 420, min: 0, optimalMax: 300, optimalMin: 0, unit: 'pmol/L' },
    source: 'meuwese-mpo-2007',
  },

  // WBC Differential (%)
  Neutrophils: {
    default: { max: 70, min: 40, optimalMax: 65, optimalMin: 50, unit: '%' },
  },

  // WBC Differential (Absolute)
  Neutrophils_Abs: {
    default: { max: 8.0, min: 1.5, optimalMax: 6.0, optimalMin: 2.0, unit: 'K/uL' },
  },

  NonHDL_Cholesterol: {
    default: { max: 130, min: 0, optimalMax: 100, optimalMin: 0, unit: 'mg/dL' },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  NRBC: {
    default: { max: 0, min: 0, optimalMax: 0, optimalMin: 0, unit: '/100WBC' },
  },

  NTproBNP: {
    default: { max: 125, min: 0, optimalMax: 75, optimalMin: 0, unit: 'pg/mL' },
    source: 'sbc-ic-2018',
  },

  Oleic_Acid: {
    default: { max: 25.0, min: 15.0, optimalMax: 22.0, optimalMin: 18.0, unit: '%' },
  },

  Omega3_Index: {
    default: { max: 8.0, min: 4.0, optimalMax: 8.0, optimalMin: 5.5, unit: '%' },
  },

  Omega3_Total: {
    default: { max: 12.0, min: 3.0, optimalMax: 10.0, optimalMin: 5.5, unit: '%' },
  },

  Omega6_Total: {
    default: { max: 40.0, min: 20.0, optimalMax: 35.0, optimalMin: 25.0, unit: '%' },
  },

  Omega6_Omega3_Ratio: {
    default: { max: 10.0, min: 1.0, optimalMax: 4.0, optimalMin: 1.0, unit: '' },
    direction: 'lower-better',
  },

  // =============================================================================
  // TUMOR MARKERS
  // =============================================================================

  OmegaCheck: {
    default: { max: 8.0, min: 4.0, optimalMax: 8.0, optimalMin: 5.5, unit: '%' },
  },

  Palmitic_Acid: {
    default: { max: 30.0, min: 20.0, optimalMax: 27.0, optimalMin: 22.0, unit: '%' },
  },

  Phosphorus: {
    default: { max: 4.5, min: 2.5, optimalMax: 4.0, optimalMin: 3.0, unit: 'mg/dL' },
  },

  Platelets: {
    default: { max: 400, min: 150, optimalMax: 350, optimalMin: 180, unit: 'K/uL' },
  },

  Potassium: {
    default: { max: 5.0, min: 3.5, optimalMax: 4.6, optimalMin: 3.8, unit: 'mEq/L' },
  },

  // =============================================================================
  // CARDIAC MARKERS
  // =============================================================================

  Prealbumin: {
    default: { max: 38, min: 18, optimalMax: 35, optimalMin: 20, unit: 'mg/dL' },
  },

  Progesterone: {
    default: { max: 0.9, min: 0.1, optimalMax: 0.7, optimalMin: 0.2, unit: 'ng/mL' },
  },

  Prolactin: {
    default: { max: 18, min: 2, optimalMax: 15, optimalMin: 4, unit: 'ng/mL' },
    variants: [
      {
        ageMin: 18,
        range: { max: 18, min: 2, optimalMax: 15, optimalMin: 4, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 29, min: 2, optimalMax: 23, optimalMin: 4, unit: 'ng/mL' },
        sex: 'F',
      },
    ],
  },

  PSA: {
    default: { max: 4.0, min: 0, optimalMax: 2.5, optimalMin: 0, unit: 'ng/mL' },
    variants: [
      {
        ageMax: 49,
        ageMin: 18,
        range: { max: 2.5, min: 0, optimalMax: 1.5, optimalMin: 0, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMax: 59,
        ageMin: 50,
        range: { max: 3.5, min: 0, optimalMax: 2.5, optimalMin: 0, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMax: 69,
        ageMin: 60,
        range: { max: 4.5, min: 0, optimalMax: 3.0, optimalMin: 0, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMin: 70,
        range: { max: 6.5, min: 0, optimalMax: 4.0, optimalMin: 0, unit: 'ng/mL' },
        sex: 'M',
      },
    ],
  },

  RBC: {
    default: { max: 5.5, min: 4.0, optimalMax: 5.2, optimalMin: 4.3, unit: 'M/uL' },
    variants: [
      {
        ageMin: 18,
        range: { max: 5.9, min: 4.5, optimalMax: 5.5, optimalMin: 4.7, unit: 'M/uL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 5.2, min: 4.0, optimalMax: 5.0, optimalMin: 4.2, unit: 'M/uL' },
        sex: 'F',
      },
    ],
  },

  // =============================================================================
  // URINALYSIS
  // =============================================================================

  RDW: {
    default: { max: 14.5, min: 11.5, optimalMax: 14.0, optimalMin: 12.0, unit: '%' },
  },

  Reticulocytes: {
    default: { max: 2.5, min: 0.5, optimalMax: 2.0, optimalMin: 0.8, unit: '%' },
  },

  SDMA: {
    default: { max: 0.6, min: 0.3, optimalMax: 0.5, optimalMin: 0.3, unit: 'umol/L' },
    source: 'schwedhelm-sdma-2011',
  },

  Selenium: {
    default: { max: 150, min: 70, optimalMax: 125, optimalMin: 85, unit: 'mcg/L' },
  },

  SHBG: {
    default: { max: 54, min: 18, optimalMax: 50, optimalMin: 20, unit: 'nmol/L' },
    variants: [
      {
        ageMin: 18,
        range: { max: 54, min: 18, optimalMax: 45, optimalMin: 20, unit: 'nmol/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 122, min: 24, optimalMax: 90, optimalMin: 30, unit: 'nmol/L' },
        sex: 'F',
      },
    ],
  },

  Sodium: {
    default: { max: 145, min: 136, optimalMax: 143, optimalMin: 138, unit: 'mEq/L' },
  },

  // =============================================================================
  // KIDNEY FUNCTION
  // =============================================================================

  SpecificGravity_Urine: {
    default: { max: 1.03, min: 1.005, optimalMax: 1.025, optimalMin: 1.01, unit: 'SG' },
  },

  Stearic_Acid: {
    default: { max: 14.0, min: 8.0, optimalMax: 12.0, optimalMin: 10.0, unit: '%' },
  },

  T3Free: {
    default: { max: 4.2, min: 2.3, optimalMax: 3.8, optimalMin: 2.8, unit: 'pg/mL' },
  },

  // =============================================================================
  // OMEGA FATTY ACIDS
  // =============================================================================

  T3Reverse: {
    default: { max: 27, min: 9, optimalMax: 22, optimalMin: 12, unit: 'ng/dL' },
  },

  T4Free: {
    default: { max: 1.8, min: 0.8, optimalMax: 1.5, optimalMin: 1.0, unit: 'ng/dL' },
  },

  T4Total: {
    default: { max: 12.0, min: 4.5, optimalMax: 10.0, optimalMin: 6.0, unit: 'ug/dL' },
  },

  Testosterone: {
    default: { max: 1000, min: 300, optimalMax: 800, optimalMin: 500, unit: 'ng/dL' },
    variants: [
      {
        ageMax: 49,
        ageMin: 18,
        range: { max: 1000, min: 300, optimalMax: 800, optimalMin: 500, unit: 'ng/dL' },
        sex: 'M',
      },
      {
        ageMin: 50,
        range: { max: 800, min: 200, optimalMax: 650, optimalMin: 400, unit: 'ng/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 70, min: 15, optimalMax: 50, optimalMin: 20, unit: 'ng/dL' },
        sex: 'F',
      },
    ],
  },

  TestosteroneBioavailable: {
    default: { max: 200, min: 50, optimalMax: 150, optimalMin: 80, unit: 'ng/dL' },
  },

  // TestosteroneFree - using direct immunoassay ranges (Quest/LabCorp standard)
  // Previous values (9.3-26.5 pg/mL) were based on equilibrium dialysis method
  TestosteroneFree: {
    default: { max: 155, min: 35, optimalMax: 120, optimalMin: 50, unit: 'pg/mL' },
    variants: [
      {
        ageMax: 49,
        ageMin: 18,
        range: { max: 155, min: 35, optimalMax: 120, optimalMin: 50, unit: 'pg/mL' },
        sex: 'M',
      },
      {
        ageMin: 50,
        range: { max: 130, min: 30, optimalMax: 100, optimalMin: 40, unit: 'pg/mL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 5.0, min: 0.2, optimalMax: 3.0, optimalMin: 0.5, unit: 'pg/mL' },
        sex: 'F',
      },
    ],
  },

  TIBC: {
    default: { max: 400, min: 250, optimalMax: 370, optimalMin: 280, unit: 'mcg/dL' },
  },

  TotalProtein: {
    default: { max: 8.3, min: 6.0, optimalMax: 7.8, optimalMin: 6.5, unit: 'g/dL' },
  },

  Trans_Fat_Index: {
    default: { max: 1.0, min: 0, optimalMax: 0.5, optimalMin: 0, unit: '%' },
  },

  Transferrin: {
    default: { max: 360, min: 200, optimalMax: 340, optimalMin: 220, unit: 'mg/dL' },
  },

  TransferrinSaturation: {
    default: { max: 50, min: 20, optimalMax: 45, optimalMin: 25, unit: '%' },
    variants: [
      {
        ageMin: 18,
        range: { max: 55, min: 20, optimalMax: 45, optimalMin: 25, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 50, min: 15, optimalMax: 40, optimalMin: 20, unit: '%' },
        sex: 'F',
      },
    ],
  },

  Triglycerides: {
    default: { max: 150, min: 0, optimalMax: 100, optimalMin: 0, unit: 'mg/dL' },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  // TroponinI: 0.04 ng/mL = percentil 99 (ensaio Siemens TnI-Ultra)
  TroponinI: {
    default: { max: 0.04, min: 0, optimalMax: 0.02, optimalMin: 0, unit: 'ng/mL' },
    source: 'schnabel-tni-2012',
  },

  // TroponinT: 14 ng/L = percentil 99 hs-cTnT (ensaio Roche Elecsys 5ª geração)
  TroponinT: {
    default: { max: 14, min: 0, optimalMax: 10, optimalMin: 0, unit: 'ng/L' },
    source: 'giannitsis-hstnt-2010',
  },

  TSH: {
    default: { max: 4.0, min: 0.4, optimalMax: 2.5, optimalMin: 1.0, unit: 'µIU/mL' },
    source: 'sbem-thyroid-2013',
    variants: [
      {
        ageMin: 65,
        range: { max: 6.0, min: 0.4, optimalMax: 4.0, optimalMin: 1.0, unit: 'µIU/mL' },
        sex: 'all',
      },
    ],
  },

  Urea: {
    default: { max: 20, min: 7, optimalMax: 16, optimalMin: 10, unit: 'mg/dL' },
  },

  UricAcid: {
    default: { max: 7.0, min: 2.5, optimalMax: 5.5, optimalMin: 3.0, unit: 'mg/dL' },
    variants: [
      {
        ageMin: 18,
        range: { max: 7.0, min: 3.4, optimalMax: 6.0, optimalMin: 4.0, unit: 'mg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 6.0, min: 2.4, optimalMax: 5.0, optimalMin: 3.0, unit: 'mg/dL' },
        sex: 'F',
      },
    ],
  },

  Urobilinogen_Urine: {
    default: { max: 1.0, min: 0.1, optimalMax: 1.0, optimalMin: 0.1, unit: 'mg/dL' },
  },

  // =============================================================================
  // ADVANCED CARDIOVASCULAR
  // =============================================================================

  pH_Urine: {
    default: { max: 8.0, min: 4.5, optimalMax: 7.0, optimalMin: 5.5, unit: 'pH' },
  },

  HyalineCasts_Urine: {
    default: { max: 2, min: 0, optimalMax: 1, optimalMin: 0, unit: '/LPF' },
  },

  RBC_Urine: {
    default: { max: 3, min: 0, optimalMax: 1, optimalMin: 0, unit: '/HPF' },
  },

  SquamousEpithelial_Urine: {
    default: { max: 15, min: 0, optimalMax: 5, optimalMin: 0, unit: '/HPF' },
  },

  Leukocytes_Urine: {
    default: { max: 5, min: 0, optimalMax: 2, optimalMin: 0, unit: '/HPF' },
  },

  Folate: {
    default: { max: 20, min: 3.9, optimalMax: 17, optimalMin: 5, unit: 'ng/mL' },
  },

  VitaminA: {
    default: { max: 100, min: 20, optimalMax: 80, optimalMin: 30, unit: 'mcg/dL' },
  },

  // =============================================================================
  // MINERALS
  // =============================================================================

  VitaminB1: {
    default: { max: 180, min: 70, optimalMax: 150, optimalMin: 80, unit: 'nmol/L' },
  },

  VitaminB12: {
    default: { max: 900, min: 200, optimalMax: 800, optimalMin: 400, unit: 'pg/mL' },
    source: 'sbpc-ml-2021',
  },

  VitaminB6: {
    default: { max: 50, min: 5, optimalMax: 40, optimalMin: 10, unit: 'ng/mL' },
  },

  VitaminC: {
    default: { max: 2.0, min: 0.4, optimalMax: 1.5, optimalMin: 0.6, unit: 'mg/dL' },
  },

  // =============================================================================
  // HEAVY METALS
  // =============================================================================

  VitaminD: {
    default: { max: 100, min: 30, optimalMax: 70, optimalMin: 40, unit: 'ng/mL' },
    source: 'sbem-thyroid-2013',
  },

  VitaminD_1_25: {
    default: { max: 72, min: 18, optimalMax: 60, optimalMin: 25, unit: 'pg/mL' },
  },

  VitaminE: {
    default: { max: 17, min: 5.5, optimalMax: 14, optimalMin: 7, unit: 'mg/L' },
  },

  // VLDL: estimado via fórmula de Friedewald (TG/5). Faixa padrão: 2-30 mg/dL.
  // Código usa 5-40 — max acima do padrão (30); considerar ajustar.
  VLDL: {
    default: { max: 40, min: 5, optimalMax: 30, optimalMin: 10, unit: 'mg/dL' },
    source: 'friedewald-1972',
  },

  // =============================================================================
  // OTHER
  // =============================================================================

  WBC: {
    default: { max: 11.0, min: 4.0, optimalMax: 8.0, optimalMin: 5.0, unit: 'K/uL' },
  },

  Zinc: {
    default: { max: 120, min: 60, optimalMax: 100, optimalMin: 70, unit: 'mcg/dL' },
  },

  // =============================================================================
  // BODY COMPOSITION (DXA)
  // =============================================================================

  AndroidFatPct: {
    default: { max: 35, min: 10, optimalMax: 25, optimalMin: 15, unit: '%' },
    direction: 'lower-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 30, min: 10, optimalMax: 22, optimalMin: 12, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 42, min: 15, optimalMax: 32, optimalMin: 20, unit: '%' },
        sex: 'F',
      },
    ],
  },

  AndroidGynoidRatio: {
    default: { max: 1.2, min: 0.5, optimalMax: 1.0, optimalMin: 0.6, unit: '' },
    direction: 'lower-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 1.2, min: 0.6, optimalMax: 1.0, optimalMin: 0.7, unit: '' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 1.0, min: 0.4, optimalMax: 0.8, optimalMin: 0.5, unit: '' },
        sex: 'F',
      },
    ],
  },

  BMC: {
    default: { max: 3.5, min: 2.0, optimalMax: 3.2, optimalMin: 2.3, unit: 'kg' },
    direction: 'higher-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 4.0, min: 2.5, optimalMax: 3.5, optimalMin: 2.8, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 3.0, min: 1.8, optimalMax: 2.7, optimalMin: 2.0, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  // BodyFatPct — Age-bracketed ranges from Gallagher et al. Am J Clin Nutr 2000;72:694-701
  // (PMID: 10966886) and ACSM Guidelines for Exercise Testing, 11th Ed (2021)
  BodyFatPct: {
    default: { max: 30, min: 10, optimalMax: 25, optimalMin: 15, unit: '%' },
    direction: 'lower-better',
    variants: [
      // Men — age brackets
      {
        ageMax: 25,
        ageMin: 18,
        range: { max: 25, min: 5, optimalMax: 20, optimalMin: 10, unit: '%' },
        sex: 'M',
      },
      {
        ageMax: 35,
        ageMin: 26,
        range: { max: 26, min: 5, optimalMax: 21, optimalMin: 11, unit: '%' },
        sex: 'M',
      },
      {
        ageMax: 45,
        ageMin: 36,
        range: { max: 27, min: 5, optimalMax: 22, optimalMin: 12, unit: '%' },
        sex: 'M',
      },
      {
        ageMax: 55,
        ageMin: 46,
        range: { max: 28, min: 5, optimalMax: 23, optimalMin: 13, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 56,
        range: { max: 29, min: 5, optimalMax: 24, optimalMin: 14, unit: '%' },
        sex: 'M',
      },
      // Women — age brackets
      {
        ageMax: 25,
        ageMin: 18,
        range: { max: 32, min: 13, optimalMax: 28, optimalMin: 18, unit: '%' },
        sex: 'F',
      },
      {
        ageMax: 35,
        ageMin: 26,
        range: { max: 33, min: 13, optimalMax: 29, optimalMin: 18, unit: '%' },
        sex: 'F',
      },
      {
        ageMax: 45,
        ageMin: 36,
        range: { max: 34, min: 13, optimalMax: 30, optimalMin: 19, unit: '%' },
        sex: 'F',
      },
      {
        ageMax: 55,
        ageMin: 46,
        range: { max: 35, min: 13, optimalMax: 31, optimalMin: 20, unit: '%' },
        sex: 'F',
      },
      {
        ageMin: 56,
        range: { max: 36, min: 13, optimalMax: 32, optimalMin: 20, unit: '%' },
        sex: 'F',
      },
    ],
  },

  FatFreeMass: {
    default: { max: 80, min: 40, optimalMax: 70, optimalMin: 45, unit: 'kg' },
    direction: 'higher-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 90, min: 50, optimalMax: 80, optimalMin: 55, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 60, min: 35, optimalMax: 52, optimalMin: 38, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  FatMass: {
    default: { max: 30, min: 5, optimalMax: 20, optimalMin: 8, unit: 'kg' },
    direction: 'lower-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 25, min: 5, optimalMax: 18, optimalMin: 7, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 30, min: 8, optimalMax: 22, optimalMin: 10, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  GynoidFatPct: {
    default: { max: 45, min: 15, optimalMax: 35, optimalMin: 20, unit: '%' },
    direction: 'lower-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 35, min: 12, optimalMax: 28, optimalMin: 15, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 50, min: 20, optimalMax: 40, optimalMin: 25, unit: '%' },
        sex: 'F',
      },
    ],
  },

  LeanMass: {
    default: { max: 75, min: 35, optimalMax: 65, optimalMin: 40, unit: 'kg' },
    direction: 'higher-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 85, min: 45, optimalMax: 75, optimalMin: 50, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 55, min: 30, optimalMax: 48, optimalMin: 35, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  TotalMass: {
    default: { max: 100, min: 50, optimalMax: 85, optimalMin: 55, unit: 'kg' },
    variants: [
      {
        ageMin: 18,
        range: { max: 100, min: 55, optimalMax: 90, optimalMin: 60, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 85, min: 45, optimalMax: 75, optimalMin: 50, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  VATMass: {
    default: { max: 1.5, min: 0, optimalMax: 0.8, optimalMin: 0, unit: 'kg' },
    direction: 'lower-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 1.5, min: 0, optimalMax: 1.0, optimalMin: 0, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 1.0, min: 0, optimalMax: 0.5, optimalMin: 0, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  VATVolume: {
    default: { max: 1500, min: 0, optimalMax: 800, optimalMin: 0, unit: 'cm³' },
    direction: 'lower-better',
    variants: [
      {
        ageMin: 18,
        range: { max: 1500, min: 0, optimalMax: 1000, optimalMin: 0, unit: 'cm³' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 1000, min: 0, optimalMax: 500, optimalMin: 0, unit: 'cm³' },
        sex: 'F',
      },
    ],
  },

  // =============================================================================
  // BONE DENSITOMETRY (DXA)
  // =============================================================================

  BMD_Total: {
    default: { max: 1.4, min: 0.9, optimalMax: 1.3, optimalMin: 1.0, unit: 'g/cm²' },
    direction: 'higher-better',
  },

  TScore_Total: {
    default: { max: 4.0, min: -1.0, optimalMax: 2.0, optimalMin: -0.5, unit: '' },
    direction: 'higher-better',
  },

  ZScore_Total: {
    default: { max: 2.0, min: -2.0, optimalMax: 1.0, optimalMin: -1.0, unit: '' },
    direction: 'higher-better',
  },

  // =============================================================================
  // MISSING LAB RANGES
  // =============================================================================

  Amylase: {
    default: { max: 100, min: 28, optimalMax: 90, optimalMin: 35, unit: 'U/L' },
  },

  Creatinine_Urine: {
    default: { max: 300, min: 20, optimalMax: 250, optimalMin: 40, unit: 'mg/dL' },
    variants: [
      {
        ageMin: 18,
        range: { max: 300, min: 40, optimalMax: 260, optimalMin: 60, unit: 'mg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 220, min: 20, optimalMax: 180, optimalMin: 40, unit: 'mg/dL' },
        sex: 'F',
      },
    ],
  },

  IgA: {
    default: { max: 400, min: 70, optimalMax: 350, optimalMin: 100, unit: 'mg/dL' },
  },

  Lipase: {
    default: { max: 60, min: 0, optimalMax: 50, optimalMin: 10, unit: 'U/L' },
  },

  Microalbumin_Urine: {
    default: { max: 30, min: 0, optimalMax: 20, optimalMin: 0, unit: 'mg/L' },
  },

  PSA_Free: {
    default: { max: 1.5, min: 0, optimalMax: 1.0, optimalMin: 0, unit: 'ng/mL' },
  },

  PSA_FreeRatio: {
    default: { max: 100, min: 25, optimalMax: 100, optimalMin: 30, unit: '%' },
  },

  // BMI - WHO classification: 18.5–24.9 normal, 25–29.9 overweight, ≥30 obese
  BMI: {
    default: { max: 30, min: 18.5, optimalMax: 24.9, optimalMin: 18.5, unit: 'kg/m2' },
  },

  // eAG - Estimated Average Glucose, derived from HbA1c (ADAG study)
  eAG: {
    default: { max: 154, min: 70, optimalMax: 126, optimalMin: 70, unit: 'mg/dL' },
  },

  // INR - International Normalized Ratio (non-anticoagulated patients)
  INR: {
    default: { max: 1.2, min: 0.8, optimalMax: 1.1, optimalMin: 0.9, unit: 'ratio' },
  },

  // Prothrombin Time
  ProthrombinTime: {
    default: { max: 13.5, min: 11, optimalMax: 13, optimalMin: 11, unit: 'seconds' },
  },

  // DHT - Dihydrotestosterone (adult male reference; female values are much lower)
  DHT: {
    default: { max: 85, min: 30, optimalMax: 85, optimalMin: 30, unit: 'ng/dL' },
    variants: [
      {
        ageMin: 18,
        range: { max: 85, min: 30, optimalMax: 85, optimalMin: 30, unit: 'ng/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 22, min: 4, optimalMax: 22, optimalMin: 4, unit: 'ng/dL' },
        sex: 'F',
      },
    ],
  },

  // Total IgE - higher values suggest atopy/allergic sensitization
  IgE_Total: {
    default: { max: 100, min: 0, optimalMax: 100, optimalMin: 0, unit: 'IU/mL' },
    direction: 'lower-better',
  },

  // IgG - Immunoglobulin G
  IgG: {
    default: { max: 1600, min: 700, optimalMax: 1600, optimalMin: 700, unit: 'mg/dL' },
  },

  // IgE E1 Cat Dander - Class 0 (≤0.35 kU/L) = negative
  IgE_E1_CatDander: {
    default: { max: 0.35, min: 0, optimalMax: 0.35, optimalMin: 0, unit: 'kU/L' },
    direction: 'lower-better',
  },

  // IgE GX1 Grasses - Class 0 (≤0.35 kU/L) = negative
  IgE_GX1_Grasses: {
    default: { max: 0.35, min: 0, optimalMax: 0.35, optimalMin: 0, unit: 'kU/L' },
    direction: 'lower-better',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Legacy flat reference ranges for backward compatibility
 * This is derived from biomarkerRangeDefinitions defaults
 */
export const defaultReferenceRanges: Record<string, BiomarkerReferenceRange> = Object.fromEntries(
  Object.entries(biomarkerRangeDefinitions).map(([code, def]) => [code, def.default]),
);

/**
 * Get the reference range for a biomarker code, optionally personalized for user context
 * @param testCode - The biomarker code (e.g., "HDL", "Testosterone")
 * @param context - Optional user context for personalized ranges
 * @returns Reference range or undefined if not found
 */
export function getReferenceRange(
  testCode: string,
  context?: ReferenceRangeContext,
): BiomarkerReferenceRange | undefined {
  const definition = biomarkerRangeDefinitions[testCode];
  if (!definition) return undefined;

  // If no context or no variants, return default
  if (!context || !definition.variants || definition.variants.length === 0) {
    return definition.default;
  }

  const { age, biologicalSex } = context;

  // Find matching variant (first match wins - more specific variants should be listed first)
  for (const variant of definition.variants) {
    // Check sex match ('all' matches everyone)
    if (variant.sex !== 'all' && variant.sex !== biologicalSex) {
      continue;
    }

    // Check age range
    if (variant.ageMin !== undefined && (age === undefined || age < variant.ageMin)) {
      continue;
    }
    if (variant.ageMax !== undefined && (age === undefined || age > variant.ageMax)) {
      continue;
    }

    return variant.range;
  }

  // No matching variant found - return default
  return definition.default;
}

/**
 * Get the range direction for a biomarker code.
 * Returns 'range' (default) if not specified.
 */
export function getRangeDirection(testCode: string): RangeDirection {
  return biomarkerRangeDefinitions[testCode]?.direction ?? 'range';
}

/**
 * Get fallback reference range for a biomarker code (default only, no personalization)
 * Used by API when LLM doesn't extract reference values
 * @param biomarkerCode - The biomarker code
 * @returns Reference range with min/max/unit or undefined
 */
export function getFallbackReferenceRange(
  biomarkerCode: string,
): { min: number; max: number; unit: string } | undefined {
  const definition = biomarkerRangeDefinitions[biomarkerCode];
  if (!definition || definition.default.min === undefined || definition.default.max === undefined) {
    return undefined;
  }
  return {
    max: definition.default.max,
    min: definition.default.min,
    unit: definition.default.unit,
  };
}

/**
 * Apply fallback reference ranges to biomarkers that are missing them
 * @param biomarkers - Array of parsed biomarkers
 * @returns Count of biomarkers that received fallback references
 */
export function applyFallbackReferenceRanges<
  T extends {
    code: string;
    referenceMin?: number | null;
    referenceMax?: number | null;
    unit?: string;
  },
>(biomarkers: T[]): number {
  let fallbackCount = 0;

  for (const biomarker of biomarkers) {
    // Skip if already has reference values
    if (biomarker.referenceMin != null && biomarker.referenceMax != null) {
      continue;
    }

    const fallback = getFallbackReferenceRange(biomarker.code);
    if (fallback) {
      // Only apply if units are compatible or biomarker has no unit
      const canonicalUnit = getCanonicalUnitForCode(biomarker.code);
      const unitsMatch =
        !biomarker.unit ||
        biomarker.unit.toLowerCase() === fallback.unit.toLowerCase() ||
        (canonicalUnit && biomarker.unit.toLowerCase() === canonicalUnit.toLowerCase()) ||
        // Handle common unit variations
        (biomarker.unit === '%' && fallback.unit === '%');

      if (unitsMatch) {
        if (biomarker.referenceMin == null) {
          biomarker.referenceMin = fallback.min;
        }
        if (biomarker.referenceMax == null) {
          biomarker.referenceMax = fallback.max;
        }
        fallbackCount++;
      }
    }
  }

  return fallbackCount;
}
