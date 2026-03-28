/**
 * Derived Biomarker Calculator
 *
 * Derives biomarkers from existing extracted values when the lab report
 * doesn't include them directly.
 *
 * Currently supports:
 * - HOMA-IR = (Fasting Glucose × Fasting Insulin) / 405
 * - VLDL = Triglycerides / 5
 * - BMI = weight_kg / (height_m)² (requires UserContext with height)
 */

import { codeToLoinc } from '@precisa-saude/fhir';

export interface BiomarkerInput {
  code: string;
  value: number | string;
  unit?: string;
}

export interface DerivedBiomarker {
  code: string;
  loincCode?: string;
  name: string;
  unit: string;
  value: number;
}

export interface DerivedOptions {
  codeToLoinc?: (code: string) => string | undefined;
  userContext?: { heightCm?: number };
}

interface CalculationDef {
  calculate: (values: Map<string, number>) => number;
  code: string;
  inputs: string[];
  unit: string;
}

interface ContextCalculationDef {
  calculate: (values: Map<string, number>, ctx: { heightCm?: number }) => number;
  canCalculate: (ctx: { heightCm?: number }) => boolean;
  code: string;
  inputs: string[];
  unit: string;
}

const CALCULATIONS: CalculationDef[] = [
  {
    calculate: (v) => (v.get('Glucose')! * v.get('Insulin')!) / 405,
    code: 'HOMA_IR',
    inputs: ['Glucose', 'Insulin'],
    unit: 'index',
  },
  {
    calculate: (v) => v.get('Triglycerides')! / 5,
    code: 'VLDL',
    inputs: ['Triglycerides'],
    unit: 'mg/dL',
  },
];

const CONTEXT_CALCULATIONS: ContextCalculationDef[] = [
  {
    calculate: (v, ctx) => {
      const weightKg = v.get('TotalMass')!;
      const heightM = ctx.heightCm! / 100;
      return weightKg / (heightM * heightM);
    },
    canCalculate: (ctx) =>
      typeof ctx.heightCm === 'number' && ctx.heightCm >= 50 && ctx.heightCm <= 250,
    code: 'BMI',
    inputs: ['TotalMass'],
    unit: 'kg/m2',
  },
];

/**
 * Compute derived biomarkers from existing extracted values.
 * Only adds a calculated biomarker if:
 * - All required inputs are present with numeric values
 * - The biomarker isn't already present in the results
 */
export function computeDerivedBiomarkers(
  biomarkers: BiomarkerInput[],
  options?: DerivedOptions,
): DerivedBiomarker[] {
  const lookupLoinc = options?.codeToLoinc ?? codeToLoinc;
  const byCode = new Map<string, BiomarkerInput>();
  for (const b of biomarkers) {
    byCode.set(b.code, b);
  }

  const added: DerivedBiomarker[] = [];

  for (const calc of CALCULATIONS) {
    if (byCode.has(calc.code)) continue;

    const values = new Map<string, number>();
    let allPresent = true;

    for (const input of calc.inputs) {
      const b = byCode.get(input);
      if (!b || typeof b.value !== 'number') {
        allPresent = false;
        break;
      }
      values.set(input, b.value);
    }

    if (!allPresent) continue;

    const rawValue = calc.calculate(values);
    const value = parseFloat(rawValue.toPrecision(10));
    const loinc = lookupLoinc(calc.code);

    added.push({
      code: calc.code,
      loincCode: loinc ?? undefined,
      name: calc.code,
      unit: calc.unit,
      value,
    });
  }

  if (options?.userContext) {
    for (const calc of CONTEXT_CALCULATIONS) {
      if (byCode.has(calc.code)) continue;
      if (!calc.canCalculate(options.userContext)) continue;

      const values = new Map<string, number>();
      let allPresent = true;

      for (const input of calc.inputs) {
        const b = byCode.get(input);
        if (!b || typeof b.value !== 'number') {
          allPresent = false;
          break;
        }
        values.set(input, b.value);
      }

      if (!allPresent) continue;

      const rawValue = calc.calculate(values, options.userContext);
      const value = parseFloat(rawValue.toPrecision(10));
      const loinc = lookupLoinc(calc.code);

      added.push({
        code: calc.code,
        loincCode: loinc ?? undefined,
        name: calc.code,
        unit: calc.unit,
        value,
      });
    }
  }

  return added;
}
