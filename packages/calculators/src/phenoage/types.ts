/**
 * PhenoAge Calculator Types
 *
 * Based on Levine et al. (2018) - "An epigenetic biomarker of aging for lifespan and healthspan"
 */

/**
 * The 9 biomarkers required for PhenoAge calculation (in SI units)
 */
export interface PhenoAgeBiomarkers {
  albumin: number;
  alkalinePhosphatase: number;
  creatinine: number;
  crp: number;
  glucose: number;
  lymphocytePercent: number;
  mcv: number;
  rdw: number;
  wbc: number;
}

/**
 * Full input for PhenoAge calculation
 */
export interface PhenoAgeInput extends PhenoAgeBiomarkers {
  chronologicalAge: number;
}

/**
 * Individual component contribution to the linear predictor
 */
export interface ComponentBreakdown {
  coefficient: number;
  contribution: number;
  key?: string;
  name: string;
  valueWithUnit: string;
}

/**
 * Complete PhenoAge calculation result
 */
export interface PhenoAgeResult {
  ageDifference: number;
  breakdown: ComponentBreakdown[];
  calculatedAt: string;
  chronologicalAge: number;
  labResultDate?: string;
  linearPredictor: number;
  mortalityScore: number;
  phenoAge: number;
}

/**
 * Biomarker availability check result
 */
export interface BiomarkerAvailability {
  available: string[];
  isComplete: boolean;
  missing: string[];
  values?: PhenoAgeBiomarkers;
}
