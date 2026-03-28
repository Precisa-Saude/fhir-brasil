/**
 * BrDMrisc Calculator
 *
 * Implements the BrDMrisc algorithm from:
 * Bracco et al. (2023) - "BrDMrisc: a Brazilian diabetes risk score
 * for screening of type 2 diabetes mellitus"
 * Frontiers in Endocrinology, DOI: 10.3389/fendo.2023.1166147
 *
 * Formula:
 *   x = intercept + Σ(coeff_i × value_i)
 *   p = 1 / (1 + exp(-x))          — logistic regression probability (~7.4 years)
 *   risk10y = 1 - (1 - p)^(10/7.4)  — extrapolated to 10-year risk
 */

import {
  BIOMARKER_NAMES_PT,
  BIOMARKER_RANGES,
  BIOMARKER_UNITS,
  BRDMRISC_MODELS,
  FOLLOW_UP_YEARS,
  LAB_MODEL_PRIORITY,
  RISK_THRESHOLDS,
} from './constants';
import type {
  BrDMriscInput,
  BrDMriscModelDefinition,
  BrDMriscResult,
  ComponentBreakdown,
  RiskCategory,
} from './types';

/**
 * Select the best available model based on which biomarkers are present.
 * Iterates through models in priority order (highest AUC first) and
 * returns the first one whose requirements are fully met.
 */
export const selectModel = (
  input: BrDMriscInput,
  labOnly = true,
): BrDMriscModelDefinition | null => {
  const available = new Set<string>();
  if (input.fpg !== undefined && !Number.isNaN(input.fpg)) available.add('fpg');
  if (input.hba1c !== undefined && !Number.isNaN(input.hba1c)) available.add('hba1c');
  if (input.triglycerides !== undefined && !Number.isNaN(input.triglycerides))
    available.add('triglycerides');
  if (input.hdlc !== undefined && !Number.isNaN(input.hdlc)) available.add('hdlc');

  if (available.size === 0) return null;

  const priority = labOnly ? LAB_MODEL_PRIORITY : BRDMRISC_MODELS.map((m) => m.id);

  for (const modelId of priority) {
    const model = BRDMRISC_MODELS.find((m) => m.id === modelId);
    if (!model) continue;
    if (labOnly && !model.isLabOnly) continue;

    const hasAll = model.requiredBiomarkers.every((b) => available.has(b));
    if (hasAll) return model;
  }

  return null;
};

/**
 * Classify risk percentage into a category
 */
export const classifyRisk = (riskPercent: number): RiskCategory => {
  const risk = riskPercent / 100;
  if (risk >= RISK_THRESHOLDS.veryHigh) return 'very-high';
  if (risk >= RISK_THRESHOLDS.high) return 'high';
  if (risk >= RISK_THRESHOLDS.moderate) return 'moderate';
  return 'low';
};

/**
 * Calculate BrDMrisc 10-year diabetes risk
 */
export const calculateBrDMrisc = (
  input: BrDMriscInput,
  model?: BrDMriscModelDefinition,
): BrDMriscResult => {
  const selectedModel = model ?? selectModel(input);
  if (!selectedModel) {
    throw new Error('No suitable model found for the available biomarkers');
  }

  // Build breakdown and compute linear predictor
  const breakdown: ComponentBreakdown[] = [];
  let x = selectedModel.intercept;

  for (const [key, coeff] of Object.entries(selectedModel.coefficients)) {
    const value = input[key as keyof BrDMriscInput];
    if (value === undefined) {
      throw new Error(`Missing required biomarker: ${key}`);
    }

    const contribution = coeff * value;
    x += contribution;

    breakdown.push({
      coefficient: coeff,
      contribution: Math.round(contribution * 10000) / 10000,
      key,
      name: BIOMARKER_NAMES_PT[key] ?? key,
      value,
      valueWithUnit: `${value.toFixed(1)} ${BIOMARKER_UNITS[key] ?? ''}`.trim(),
    });
  }

  // Add intercept to breakdown
  breakdown.push({
    coefficient: selectedModel.intercept,
    contribution: selectedModel.intercept,
    key: 'intercept',
    name: BIOMARKER_NAMES_PT['intercept'] ?? 'Intercepto',
    value: 1,
    valueWithUnit: '-',
  });

  // Logistic regression → probability at ~7.4 years
  const p = 1 / (1 + Math.exp(-x));

  // Extrapolate to 10-year risk
  // risk10y = 1 - (1 - p)^(10/followUp)
  const risk10y = 1 - Math.pow(1 - p, 10 / FOLLOW_UP_YEARS);

  const riskPercent = Math.round(risk10y * 1000) / 10; // One decimal place

  return {
    breakdown,
    calculatedAt: new Date().toISOString(),
    modelUsed: selectedModel,
    risk10y: Math.round(risk10y * 10000) / 10000,
    riskCategory: classifyRisk(riskPercent),
    riskPercent,
  };
};

/**
 * Validate biomarker values are within plausible ranges
 */
export const validateBiomarkers = (
  input: BrDMriscInput,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  const checkRange = (value: number | undefined, key: string, name: string) => {
    if (value === undefined) return;
    const range = BIOMARKER_RANGES[key];
    if (!range) return;
    if (value < range.min || value > range.max) {
      errors.push(
        `${name} (${value}) fora do intervalo esperado [${range.min}-${range.max} ${range.unit}]`,
      );
    }
  };

  checkRange(input.fpg, 'fpg', 'Glicemia de Jejum');
  checkRange(input.hba1c, 'hba1c', 'HbA1c');
  checkRange(input.triglycerides, 'triglycerides', 'Triglicerídeos');
  checkRange(input.hdlc, 'hdlc', 'HDL-colesterol');

  return {
    errors,
    isValid: errors.length === 0,
  };
};
