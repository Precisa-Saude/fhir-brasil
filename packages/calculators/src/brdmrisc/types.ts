/**
 * BrDMrisc Calculator Types
 *
 * Based on Bracco et al. (2023) - "BrDMrisc: a Brazilian diabetes risk score
 * for screening of type 2 diabetes mellitus"
 * DOI: 10.3389/fendo.2023.1166147
 */

export type RiskCategory = 'low' | 'moderate' | 'high' | 'very-high';

export interface BrDMriscModelDefinition {
  auc: number;
  coefficients: Record<string, number>;
  id: number;
  intercept: number;
  isLabOnly: boolean;
  name: string;
  namePt: string;
  requiredBiomarkers: string[];
}

export interface BrDMriscInput {
  fpg?: number; // Fasting plasma glucose (mg/dL)
  hba1c?: number; // HbA1c (%)
  hdlc?: number; // HDL-cholesterol (mg/dL)
  triglycerides?: number; // Triglycerides (mg/dL)
}

export interface BrDMriscResult {
  breakdown: ComponentBreakdown[];
  calculatedAt: string;
  labResultDate?: string;
  modelUsed: BrDMriscModelDefinition;
  risk10y: number; // 10-year risk (0-1)
  riskCategory: RiskCategory;
  riskPercent: number; // 10-year risk as percentage
}

export interface ComponentBreakdown {
  coefficient: number;
  contribution: number;
  key: string;
  name: string;
  value: number;
  valueWithUnit: string;
}

export interface BiomarkerAvailability {
  available: string[];
  bestModelId: number | null;
  hasFpg: boolean;
  hasHba1c: boolean;
  hasHdlc: boolean;
  hasTriglycerides: boolean;
  missing: string[];
}
