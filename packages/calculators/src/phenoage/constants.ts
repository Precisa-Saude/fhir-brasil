/**
 * PhenoAge Calculator Constants
 *
 * Coefficients from Levine et al. (2018) Table 1
 * Units: albumin (g/L), creatinine (μmol/L), glucose (mmol/L),
 *        CRP (mg/dL inside the log term — see note below), lymphocyte (%),
 *        MCV (fL), RDW (%), ALP (U/L), WBC (10^9/L), age (years)
 *
 * CRP unit note: the original model was fit on NHANES IV CRP, which is reported
 * in **mg/dL** (variable `LBXCRP`). The `logCrp` coefficient therefore expects
 * `ln(CRP in mg/dL)`. Our public input (`PhenoAgeInput.crp`) stays in **mg/L**
 * — the unit Brazilian hs-CRP assays report — and the calculator converts
 * mg/L → mg/dL right before the log. See `CRP_LOD_MG_L` / `MG_L_PER_MG_DL`.
 */

/** Milligrams per litre in one milligram per decilitre (1 mg/dL = 10 mg/L). */
export const MG_L_PER_MG_DL = 10;

/**
 * hs-CRP limit of detection used to clamp CRP before the log transform (mg/L).
 * Matches the NHANES hs-CRP lower limit of detection (~0.11 mg/L); values below
 * it are not meaningfully measurable and would otherwise push `ln(CRP)` toward
 * −∞. Expressed in mg/L because that is the unit of the public input.
 */
export const CRP_LOD_MG_L = 0.1;

/**
 * Regression coefficients from the Cox proportional hazards model
 */
export const PHENOAGE_COEFFICIENTS = {
  age: 0.0804,
  albumin: -0.0336,
  alkalinePhosphatase: 0.0019,
  creatinine: 0.0095,
  glucose: 0.1953,
  intercept: -19.9067,
  logCrp: 0.0954,
  lymphocytePercent: -0.012,
  mcv: 0.0268,
  rdw: 0.3306,
  wbc: 0.0554,
} as const;

/**
 * Gompertz mortality model parameters
 */
export const GOMPERTZ_PARAMS = {
  ageCoefficient: 0.090165,
  baseAge: 141.50225,
  gamma: 0.0076927,
  mortalityConstant: 0.00553,
} as const;

/**
 * Biomarker reference ranges for validation
 */
export const BIOMARKER_RANGES = {
  albumin: { max: 60, min: 10, typical: { max: 50, min: 35 }, unit: 'g/L' },
  alkalinePhosphatase: { max: 500, min: 10, typical: { max: 130, min: 40 }, unit: 'U/L' },
  chronologicalAge: { max: 120, min: 18, typical: { max: 100, min: 18 }, unit: 'anos' },
  creatinine: { max: 500, min: 20, typical: { max: 110, min: 60 }, unit: 'μmol/L' },
  crp: { max: 200, min: 0.01, typical: { max: 3, min: 0 }, unit: 'mg/L' },
  glucose: { max: 30, min: 2, typical: { max: 6.0, min: 4.0 }, unit: 'mmol/L' },
  lymphocytePercent: { max: 80, min: 1, typical: { max: 40, min: 20 }, unit: '%' },
  mcv: { max: 150, min: 50, typical: { max: 100, min: 80 }, unit: 'fL' },
  rdw: { max: 25, min: 8, typical: { max: 15, min: 11 }, unit: '%' },
  wbc: { max: 30, min: 1, typical: { max: 11.0, min: 4.0 }, unit: '10^9/L' },
} as const;

/**
 * Mapping from FHIR biomarker codes to PhenoAge input fields
 */
export const FHIR_CODE_TO_PHENOAGE: Record<string, keyof typeof BIOMARKER_RANGES> = {
  Albumin: 'albumin',
  AlkalinePhosphatase: 'alkalinePhosphatase',
  Creatinine: 'creatinine',
  CRP: 'crp',
  Glucose: 'glucose',
  Lymphocytes: 'lymphocytePercent',
  MCV: 'mcv',
  RDW: 'rdw',
  WBC: 'wbc',
};

/**
 * Required biomarker codes for PhenoAge calculation
 */
export const REQUIRED_BIOMARKERS = [
  'Albumin',
  'Creatinine',
  'Glucose',
  'CRP',
  'Lymphocytes',
  'MCV',
  'RDW',
  'AlkalinePhosphatase',
  'WBC',
] as const;

/**
 * Portuguese names for biomarkers (for display)
 */
export const BIOMARKER_NAMES_PT: Record<string, string> = {
  age: 'Idade',
  albumin: 'Albumina',
  alkalinePhosphatase: 'Fosfatase Alcalina',
  creatinine: 'Creatinina',
  crp: 'PCR',
  glucose: 'Glicose',
  intercept: 'Intercepto',
  lymphocytePercent: 'Linfócitos',
  mcv: 'VCM',
  rdw: 'RDW',
  wbc: 'Leucócitos',
};

/**
 * Short descriptions for biomarkers (for tooltips)
 * Explains what each biomarker indicates in the context of aging
 */
export const BIOMARKER_DESCRIPTIONS_PT: Record<string, string> = {
  age: 'Sua idade cronológica em anos',
  albumin: 'Proteína do fígado que indica estado nutricional e função hepática',
  alkalinePhosphatase: 'Enzima que reflete saúde do fígado e dos ossos',
  creatinine: 'Marcador de função renal produzido pelos músculos',
  crp: 'Proteína C-reativa, indica inflamação no corpo',
  glucose: 'Nível de açúcar no sangue, relacionado ao metabolismo',
  intercept: 'Constante da fórmula de regressão',
  lymphocytePercent: 'Células de defesa do sistema imunológico',
  mcv: 'Volume médio das hemácias, indica saúde das células vermelhas',
  rdw: 'Variação no tamanho das hemácias, marcador de inflamação',
  wbc: 'Total de células brancas, indica estado imunológico',
};

/**
 * Biomarker information for lab order requests
 * Includes LOINC codes and English names for lab requisitions
 */
export interface BiomarkerLabInfo {
  loincCode: string;
  nameEn: string;
  namePt: string;
}

/**
 * Lab order information for PhenoAge biomarkers
 * Mapped by FHIR code
 */
export const BIOMARKER_LAB_INFO: Record<string, BiomarkerLabInfo> = {
  Albumin: {
    loincCode: '1751-7',
    nameEn: 'Albumin [Mass/volume] in Serum or Plasma',
    namePt: 'Albumina',
  },
  AlkalinePhosphatase: {
    loincCode: '6768-6',
    nameEn: 'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma',
    namePt: 'Fosfatase Alcalina',
  },
  Creatinine: {
    loincCode: '2160-0',
    nameEn: 'Creatinine [Mass/volume] in Serum or Plasma',
    namePt: 'Creatinina',
  },
  CRP: {
    loincCode: '1988-5',
    nameEn: 'C reactive protein [Mass/volume] in Serum or Plasma',
    namePt: 'Proteína C-Reativa (PCR)',
  },
  Glucose: {
    loincCode: '2345-7',
    nameEn: 'Glucose [Mass/volume] in Serum or Plasma',
    namePt: 'Glicose',
  },
  Lymphocytes: {
    loincCode: '736-9',
    nameEn: 'Lymphocytes/100 leukocytes in Blood by Automated count',
    namePt: 'Linfócitos (%)',
  },
  MCV: {
    loincCode: '787-2',
    nameEn: 'MCV [Entitic volume] by Automated count',
    namePt: 'Volume Corpuscular Médio (VCM)',
  },
  RDW: {
    loincCode: '788-0',
    nameEn: 'Erythrocyte distribution width [Ratio] by Automated count',
    namePt: 'Amplitude de Distribuição dos Eritrócitos (RDW)',
  },
  WBC: {
    loincCode: '6690-2',
    nameEn: 'Leukocytes [#/volume] in Blood by Automated count',
    namePt: 'Contagem de Leucócitos',
  },
};
