/**
 * BrDMrisc Calculator Constants
 *
 * All 14 model definitions with coefficients extracted from:
 * Bracco et al. (2023) Table 2 & Supplementary Material
 * DOI: 10.3389/fendo.2023.1166147
 *
 * Models 1-6 are lab-only (MVP scope).
 * Models 7-14 include clinical variables (Phase 2).
 *
 * Follow-up period: 7.4 years (ELSA-Brasil median)
 * Units expected: FPG (mg/dL), HbA1c (%), triglycerides (mg/dL), HDL-c (mg/dL)
 */

import type { BrDMriscInput, BrDMriscModelDefinition } from './types';

/**
 * ELSA-Brasil median follow-up in years.
 * Used to extrapolate the logistic regression probability to 10-year risk.
 */
export const FOLLOW_UP_YEARS = 7.4;

/**
 * All 14 BrDMrisc models.
 * Models ordered by ID. Lab-only models (1-6) are the MVP.
 *
 * Coefficients from Supplementary Table S2 of the paper,
 * verified against the Shiny app demo at:
 * https://paulabracco.shinyapps.io/BrDMrisc_pt/
 */
export const BRDMRISC_MODELS: BrDMriscModelDefinition[] = [
  // === Lab-only models (MVP) ===
  {
    auc: 0.776,
    coefficients: {
      fpg: 0.0352,
    },
    id: 1,
    intercept: -5.8282,
    isLabOnly: true,
    name: 'FPG only',
    namePt: 'Apenas Glicemia de Jejum',
    requiredBiomarkers: ['fpg'],
  },
  {
    auc: 0.668,
    coefficients: {
      hba1c: 0.731,
    },
    id: 2,
    intercept: -6.3199,
    isLabOnly: true,
    name: 'HbA1c only',
    namePt: 'Apenas HbA1c',
    requiredBiomarkers: ['hba1c'],
  },
  {
    auc: 0.793,
    coefficients: {
      fpg: 0.029,
      hba1c: 0.4427,
    },
    id: 3,
    intercept: -7.37,
    isLabOnly: true,
    name: 'FPG + HbA1c',
    namePt: 'Glicemia + HbA1c',
    requiredBiomarkers: ['fpg', 'hba1c'],
  },
  {
    auc: 0.79,
    coefficients: {
      fpg: 0.0345,
      triglycerides: 0.0017,
    },
    id: 4,
    intercept: -5.9706,
    isLabOnly: true,
    name: 'FPG + Triglycerides',
    namePt: 'Glicemia + Triglicerídeos',
    requiredBiomarkers: ['fpg', 'triglycerides'],
  },
  {
    auc: 0.796,
    coefficients: {
      fpg: 0.0338,
      hdlc: -0.0161,
      triglycerides: 0.0011,
    },
    id: 5,
    intercept: -5.3879,
    isLabOnly: true,
    name: 'FPG + Lipids',
    namePt: 'Glicemia + Lipídios',
    requiredBiomarkers: ['fpg', 'triglycerides', 'hdlc'],
  },
  {
    auc: 0.813,
    coefficients: {
      fpg: 0.0267,
      hba1c: 0.3943,
      hdlc: -0.0149,
      triglycerides: 0.0009,
    },
    id: 6,
    intercept: -6.9195,
    isLabOnly: true,
    name: 'FPG + HbA1c + Lipids',
    namePt: 'Glicemia + HbA1c + Lipídios',
    requiredBiomarkers: ['fpg', 'hba1c', 'triglycerides', 'hdlc'],
  },

  // === Clinical models (Phase 2 — require user input) ===
  {
    auc: 0.744,
    coefficients: {
      bmi: 0.0642,
      familyHistory: 0.5915,
      waist: 0.0111,
    },
    id: 7,
    intercept: -6.5023,
    isLabOnly: false,
    name: 'Clinical only',
    namePt: 'Apenas Clínico',
    requiredBiomarkers: ['bmi', 'waist', 'familyHistory'],
  },
  {
    auc: 0.8,
    coefficients: {
      bmi: 0.0454,
      familyHistory: 0.475,
      fpg: 0.0305,
      waist: 0.0047,
    },
    id: 8,
    intercept: -7.3297,
    isLabOnly: false,
    name: 'Clinical + FPG',
    namePt: 'Clínico + Glicemia',
    requiredBiomarkers: ['bmi', 'waist', 'familyHistory', 'fpg'],
  },
  {
    auc: 0.725,
    coefficients: {
      bmi: 0.0471,
      familyHistory: 0.5284,
      hba1c: 0.6001,
      waist: 0.0063,
    },
    id: 9,
    intercept: -8.0917,
    isLabOnly: false,
    name: 'Clinical + HbA1c',
    namePt: 'Clínico + HbA1c',
    requiredBiomarkers: ['bmi', 'waist', 'familyHistory', 'hba1c'],
  },
  {
    auc: 0.814,
    coefficients: {
      bmi: 0.0373,
      familyHistory: 0.4393,
      fpg: 0.0253,
      hba1c: 0.3688,
      waist: 0.0029,
    },
    id: 10,
    intercept: -8.5817,
    isLabOnly: false,
    name: 'Clinical + FPG + HbA1c',
    namePt: 'Clínico + Glicemia + HbA1c',
    requiredBiomarkers: ['bmi', 'waist', 'familyHistory', 'fpg', 'hba1c'],
  },
  {
    auc: 0.808,
    coefficients: {
      bmi: 0.0427,
      familyHistory: 0.4532,
      fpg: 0.0299,
      triglycerides: 0.0015,
      waist: 0.0031,
    },
    id: 11,
    intercept: -7.5028,
    isLabOnly: false,
    name: 'Clinical + FPG + Triglycerides',
    namePt: 'Clínico + Glicemia + Triglicerídeos',
    requiredBiomarkers: ['bmi', 'waist', 'familyHistory', 'fpg', 'triglycerides'],
  },
  {
    auc: 0.813,
    coefficients: {
      bmi: 0.0408,
      familyHistory: 0.4396,
      fpg: 0.0293,
      hdlc: -0.0128,
      triglycerides: 0.0009,
      waist: 0.0019,
    },
    id: 12,
    intercept: -6.9757,
    isLabOnly: false,
    name: 'Clinical + FPG + Lipids',
    namePt: 'Clínico + Glicemia + Lipídios',
    requiredBiomarkers: ['bmi', 'waist', 'familyHistory', 'fpg', 'triglycerides', 'hdlc'],
  },
  {
    auc: 0.822,
    coefficients: {
      bmi: 0.0334,
      familyHistory: 0.4107,
      fpg: 0.0238,
      hba1c: 0.3266,
      hdlc: -0.0117,
      triglycerides: 0.0006,
      waist: 0.0015,
    },
    id: 13,
    intercept: -8.2,
    isLabOnly: false,
    name: 'Clinical + FPG + HbA1c + Lipids',
    namePt: 'Clínico + Glicemia + HbA1c + Lipídios',
    requiredBiomarkers: ['bmi', 'waist', 'familyHistory', 'fpg', 'hba1c', 'triglycerides', 'hdlc'],
  },
  {
    auc: 0.699,
    coefficients: {
      bmi: 0.0494,
      ethnicity: 0.2901,
      familyHistory: 0.557,
      hypertension: 0.3653,
      waist: 0.0071,
    },
    id: 14,
    intercept: -7.244,
    isLabOnly: false,
    name: 'Clinical extended',
    namePt: 'Clínico Estendido',
    requiredBiomarkers: ['bmi', 'waist', 'familyHistory', 'ethnicity', 'hypertension'],
  },
];

/**
 * Lab-only models for MVP, ordered by priority (highest AUC first)
 */
export const LAB_ONLY_MODELS = BRDMRISC_MODELS.filter((m) => m.isLabOnly);

/**
 * Model selection priority for lab-only models (highest AUC first)
 */
export const LAB_MODEL_PRIORITY = [6, 5, 3, 4, 1, 2] as const;

/**
 * FHIR biomarker code → BrDMrisc input field mapping
 */
export const FHIR_CODE_TO_BRDMRISC: Record<string, keyof BrDMriscInput> = {
  Glucose: 'fpg',
  HbA1c: 'hba1c',
  HDL: 'hdlc',
  Triglycerides: 'triglycerides',
};

/**
 * Required FHIR biomarker codes (all 4 lab biomarkers)
 */
export const BRDMRISC_BIOMARKER_CODES = ['Glucose', 'HbA1c', 'Triglycerides', 'HDL'] as const;

/**
 * Portuguese names for biomarkers
 */
export const BIOMARKER_NAMES_PT: Record<string, string> = {
  fpg: 'Glicemia de Jejum',
  hba1c: 'Hemoglobina Glicada',
  hdlc: 'HDL-colesterol',
  intercept: 'Intercepto',
  triglycerides: 'Triglicerídeos',
};

/**
 * Biomarker units used by the model
 */
export const BIOMARKER_UNITS: Record<string, string> = {
  fpg: 'mg/dL',
  hba1c: '%',
  hdlc: 'mg/dL',
  triglycerides: 'mg/dL',
};

/**
 * Biomarker validation ranges (plausible values)
 */
export const BIOMARKER_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  fpg: { max: 500, min: 40, unit: 'mg/dL' },
  hba1c: { max: 20, min: 3, unit: '%' },
  hdlc: { max: 150, min: 10, unit: 'mg/dL' },
  triglycerides: { max: 2000, min: 20, unit: 'mg/dL' },
};

/**
 * Risk category thresholds based on clinical recommendations
 * from Bracco et al. (2023). The paper notes that 20% triggers
 * intensive prevention.
 */
export const RISK_THRESHOLDS = {
  high: 0.2, // 20-35% — high risk
  moderate: 0.1, // 10-20% — moderate risk
  veryHigh: 0.35, // >= 35% — very high risk
} as const;
