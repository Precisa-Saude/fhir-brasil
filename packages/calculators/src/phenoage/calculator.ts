/**
 * PhenoAge Calculator
 *
 * Implements the Levine PhenoAge algorithm from:
 * "An epigenetic biomarker of aging for lifespan and healthspan" (Aging, 2018)
 */

import {
  BIOMARKER_NAMES_PT,
  BIOMARKER_RANGES,
  GOMPERTZ_PARAMS,
  PHENOAGE_COEFFICIENTS,
} from './constants';
import type { ComponentBreakdown, PhenoAgeInput, PhenoAgeResult } from './types';

/**
 * Calculates the linear predictor (xb) from biomarkers
 * @returns Object with xb value and breakdown of each component
 */
const calculateLinearPredictor = (
  input: PhenoAgeInput,
): { xb: number; breakdown: ComponentBreakdown[] } => {
  const logCrp = Math.log(Math.max(input.crp, 0.1)); // Avoid log(0)

  const components: Array<{
    key: string;
    value: number;
    coefficient: number;
    unit: string;
    displayValue?: string;
  }> = [
    {
      coefficient: PHENOAGE_COEFFICIENTS.albumin,
      key: 'albumin',
      unit: BIOMARKER_RANGES.albumin.unit,
      value: input.albumin,
    },
    {
      coefficient: PHENOAGE_COEFFICIENTS.creatinine,
      key: 'creatinine',
      unit: BIOMARKER_RANGES.creatinine.unit,
      value: input.creatinine,
    },
    {
      coefficient: PHENOAGE_COEFFICIENTS.glucose,
      key: 'glucose',
      unit: BIOMARKER_RANGES.glucose.unit,
      value: input.glucose,
    },
    {
      coefficient: PHENOAGE_COEFFICIENTS.logCrp,
      displayValue: `ln(${input.crp.toFixed(2)})`,
      key: 'crp',
      unit: 'ln(mg/L)',
      value: logCrp,
    },
    {
      coefficient: PHENOAGE_COEFFICIENTS.lymphocytePercent,
      key: 'lymphocytePercent',
      unit: BIOMARKER_RANGES.lymphocytePercent.unit,
      value: input.lymphocytePercent,
    },
    {
      coefficient: PHENOAGE_COEFFICIENTS.mcv,
      key: 'mcv',
      unit: BIOMARKER_RANGES.mcv.unit,
      value: input.mcv,
    },
    {
      coefficient: PHENOAGE_COEFFICIENTS.rdw,
      key: 'rdw',
      unit: BIOMARKER_RANGES.rdw.unit,
      value: input.rdw,
    },
    {
      coefficient: PHENOAGE_COEFFICIENTS.alkalinePhosphatase,
      key: 'alkalinePhosphatase',
      unit: BIOMARKER_RANGES.alkalinePhosphatase.unit,
      value: input.alkalinePhosphatase,
    },
    {
      coefficient: PHENOAGE_COEFFICIENTS.wbc,
      key: 'wbc',
      unit: BIOMARKER_RANGES.wbc.unit,
      value: input.wbc,
    },
    {
      coefficient: PHENOAGE_COEFFICIENTS.age,
      displayValue: `${Math.round(input.chronologicalAge)} anos`,
      key: 'age',
      unit: 'anos',
      value: input.chronologicalAge,
    },
  ];

  const breakdown: ComponentBreakdown[] = components.map((c) => ({
    coefficient: c.coefficient,
    contribution: Math.round(c.coefficient * c.value * 10000) / 10000,
    key: c.key,
    name: BIOMARKER_NAMES_PT[c.key] ?? c.key,
    valueWithUnit: c.displayValue ? `${c.displayValue}` : `${c.value.toFixed(2)} ${c.unit}`,
  }));

  // Add intercept
  breakdown.push({
    coefficient: PHENOAGE_COEFFICIENTS.intercept,
    contribution: PHENOAGE_COEFFICIENTS.intercept,
    key: 'intercept',
    name: BIOMARKER_NAMES_PT['intercept'] ?? 'Intercepto',
    valueWithUnit: '-',
  });

  const xb =
    PHENOAGE_COEFFICIENTS.intercept +
    components.reduce((sum, c) => sum + c.coefficient * c.value, 0);

  return { breakdown, xb };
};

/**
 * Calculates mortality score from linear predictor using Gompertz model
 */
const calculateMortalityScore = (xb: number): number => {
  const { gamma } = GOMPERTZ_PARAMS;

  // exp(xb) represents the hazard ratio
  const hazardRatio = Math.exp(xb);

  // Cumulative hazard over 120 months (10 years)
  const cumulativeHazard = (hazardRatio * (Math.exp(120 * gamma) - 1)) / gamma;

  // Convert to probability
  return 1 - Math.exp(-cumulativeHazard);
};

/**
 * Converts mortality score to PhenoAge
 */
const mortalityScoreToPhenoAge = (mortalityScore: number): number => {
  const { ageCoefficient, baseAge, mortalityConstant } = GOMPERTZ_PARAMS;

  // Inverse transformation to get biological age
  const innerLog = Math.log(1 - mortalityScore);
  const outerLog = Math.log(-mortalityConstant * innerLog);

  return baseAge + outerLog / ageCoefficient;
};

/**
 * Main PhenoAge calculation function
 *
 * @param input - Biomarker values in SI units plus chronological age
 * @returns Complete PhenoAge result with breakdown
 */
export const calculatePhenoAge = (input: PhenoAgeInput): PhenoAgeResult => {
  // Validate all inputs are valid numbers (not NaN)
  const inputValues = {
    albumin: input.albumin,
    alkalinePhosphatase: input.alkalinePhosphatase,
    chronologicalAge: input.chronologicalAge,
    creatinine: input.creatinine,
    crp: input.crp,
    glucose: input.glucose,
    lymphocytePercent: input.lymphocytePercent,
    mcv: input.mcv,
    rdw: input.rdw,
    wbc: input.wbc,
  };

  for (const [key, value] of Object.entries(inputValues)) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new Error(`Invalid input value for ${key}: ${value}`);
    }
  }

  // Calculate linear predictor with breakdown
  const { breakdown, xb } = calculateLinearPredictor(input);

  // Calculate mortality score
  const mortalityScore = calculateMortalityScore(xb);

  // Convert to PhenoAge
  const phenoAge = mortalityScoreToPhenoAge(mortalityScore);

  // Calculate age difference
  const ageDifference = phenoAge - input.chronologicalAge;

  return {
    ageDifference: Math.round(ageDifference * 10) / 10,
    breakdown,
    calculatedAt: new Date().toISOString(),
    chronologicalAge: input.chronologicalAge,
    linearPredictor: Math.round(xb * 10000) / 10000,
    mortalityScore: Math.round(mortalityScore * 10000) / 10000,
    phenoAge: Math.round(phenoAge * 10) / 10,
  };
};

/**
 * Validates biomarker values are within acceptable ranges
 */
export const validateBiomarkers = (
  input: PhenoAgeInput,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  const checkRange = (value: number, key: keyof typeof BIOMARKER_RANGES, name: string) => {
    const range = BIOMARKER_RANGES[key];
    if (value < range.min || value > range.max) {
      errors.push(`${name} (${value}) fora do intervalo esperado [${range.min}-${range.max}]`);
    }
  };

  checkRange(input.albumin, 'albumin', 'Albumina');
  checkRange(input.creatinine, 'creatinine', 'Creatinina');
  checkRange(input.glucose, 'glucose', 'Glicose');
  checkRange(input.crp, 'crp', 'PCR');
  checkRange(input.lymphocytePercent, 'lymphocytePercent', 'Linfócitos');
  checkRange(input.mcv, 'mcv', 'VCM');
  checkRange(input.rdw, 'rdw', 'RDW');
  checkRange(input.alkalinePhosphatase, 'alkalinePhosphatase', 'Fosfatase Alcalina');
  checkRange(input.wbc, 'wbc', 'Leucócitos');
  checkRange(input.chronologicalAge, 'chronologicalAge', 'Idade');

  // Special validation for CRP (must be positive for log transform)
  if (input.crp <= 0) {
    errors.push('PCR deve ser maior que 0');
  }

  return {
    errors,
    isValid: errors.length === 0,
  };
};
