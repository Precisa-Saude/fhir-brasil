/**
 * Unit Converters for BrDMrisc Calculator
 *
 * BrDMrisc expects: FPG (mg/dL), HbA1c (%), triglycerides (mg/dL), HDL-c (mg/dL)
 * Brazilian labs typically report in these units already, but some may
 * use mmol/L for glucose or mmol/mol for HbA1c (IFCC standard).
 */

/**
 * Conversion factors for each biomarker
 * Key: source unit, Value: multiplier to get target unit
 */
export const CONVERSION_FACTORS: Record<string, Record<string, number>> = {
  fpg: {
    'mg/dL': 1,
    'mmol/L': 18.0182, // mmol/L → mg/dL
  },
  hba1c: {
    '%': 1,
    // IFCC mmol/mol → NGSP %: HbA1c(%) = 0.0915 × HbA1c(mmol/mol) + 2.15
    // Handled as special case in convertToTargetUnit
  },
  hdlc: {
    'mg/dL': 1,
    'mmol/L': 38.67, // mmol/L → mg/dL
  },
  triglycerides: {
    'mg/dL': 1,
    'mmol/L': 88.57, // mmol/L → mg/dL
  },
};

/**
 * Target units for BrDMrisc calculation
 */
export const TARGET_UNITS: Record<string, string> = {
  fpg: 'mg/dL',
  hba1c: '%',
  hdlc: 'mg/dL',
  triglycerides: 'mg/dL',
};

/**
 * Convert a biomarker value to the target unit expected by BrDMrisc
 */
export const convertToTargetUnit = (
  biomarker: string,
  value: number,
  sourceUnit: string,
): number => {
  const normalizedUnit = sourceUnit.trim();

  // Special case: HbA1c IFCC (mmol/mol) → NGSP (%)
  if (biomarker === 'hba1c' && normalizedUnit.includes('mmol/mol')) {
    return 0.0915 * value + 2.15;
  }

  const factors = CONVERSION_FACTORS[biomarker];
  if (!factors) return value;

  // Try exact match first
  const factor = factors[normalizedUnit];
  if (factor !== undefined) return value * factor;

  // Case-insensitive match
  const match = Object.keys(factors).find((k) => k.toLowerCase() === normalizedUnit.toLowerCase());
  if (match) return value * factors[match]!;

  return value;
};

/**
 * Auto-detect unit and convert to target if needed.
 * Uses heuristics based on typical value ranges.
 */
export const autoConvertToTarget = (
  biomarker: string,
  value: number,
  unit?: string,
): { value: number; unit: string; wasConverted: boolean } => {
  const targetUnit = TARGET_UNITS[biomarker] || '';

  if (unit) {
    const normalizedUnit = unit.trim().toLowerCase();
    const normalizedTarget = targetUnit.toLowerCase();

    if (normalizedUnit === normalizedTarget) {
      return { unit: targetUnit, value, wasConverted: false };
    }

    const converted = convertToTargetUnit(biomarker, value, unit);
    return {
      unit: targetUnit,
      value: converted,
      wasConverted: normalizedUnit !== normalizedTarget,
    };
  }

  // Heuristic-based detection
  switch (biomarker) {
    case 'fpg':
      // mmol/L typically 3-20, mg/dL typically 60-500
      if (value < 30) {
        return { unit: 'mg/dL', value: value * 18.0182, wasConverted: true };
      }
      return { unit: 'mg/dL', value, wasConverted: false };

    case 'hba1c':
      // IFCC mmol/mol typically 20-120, NGSP % typically 4-15
      if (value > 20) {
        return { unit: '%', value: 0.0915 * value + 2.15, wasConverted: true };
      }
      return { unit: '%', value, wasConverted: false };

    case 'triglycerides':
      // mmol/L typically 0.5-10, mg/dL typically 50-2000
      if (value < 15) {
        return { unit: 'mg/dL', value: value * 88.57, wasConverted: true };
      }
      return { unit: 'mg/dL', value, wasConverted: false };

    case 'hdlc':
      // mmol/L typically 0.5-3, mg/dL typically 20-100
      if (value < 5) {
        return { unit: 'mg/dL', value: value * 38.67, wasConverted: true };
      }
      return { unit: 'mg/dL', value, wasConverted: false };

    default:
      return { unit: targetUnit, value, wasConverted: false };
  }
};
