import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS } from '../biomarkers';
import { applyFallbackReferenceRanges, biomarkerRangeDefinitions } from '../reference-ranges';
import { BIOMARKER_UNITS, convertUnit, getCanonicalUnit, getSIUnit } from '../units';

/**
 * A unidade de um biomarcador aparece em três lugares que precisam concordar:
 *
 * - `BIOMARKER_UNITS[code].canonicalUnit` (units.ts): a extração converte
 *   todo valor para esta unidade antes de gravar;
 * - `unit` da definição (biomarkers.ts);
 * - `unit` de cada faixa, padrão e variantes (reference-ranges.ts).
 *
 * Quando divergem, o valor gravado é comparado contra uma faixa em outra
 * escala. Foi o que aconteceu com IgA: canônica em g/L e faixa em mg/dL, de
 * modo que 373 mg/dL virou 3,73 e caiu "dentro" de 70–400.
 *
 * Grafias diferentes da mesma unidade só são equiparadas pelos `aliases` que
 * o próprio código já declara em `BIOMARKER_UNITS`. Nenhuma equivalência nova
 * é criada aqui.
 */

/**
 * Códigos que ficam de fora, com o motivo. Nenhum deles tem risco de escala:
 * a divergência é só de rótulo de unidade adimensional ou de grafia de
 * segundos, e não há alias no catálogo que permita equipará-las. Uniformizar
 * esses rótulos é decisão separada, porque `unit` da definição aparece na
 * interface em pt-BR.
 */
const KNOWN_LABEL_MISMATCHES: Record<string, string> = {
  AA_EPA_Ratio: "razão adimensional: definição 'razão', faixa ''",
  Albumin_Globulin_Ratio: "razão adimensional: definição 'razão', faixa ''",
  AndroidGynoidRatio: "razão adimensional: definição 'razão', faixa ''",
  BUN_Creatinine_Ratio: "razão adimensional: definição 'razão', faixa ''",
  Cholesterol_HDL_Ratio: "razão adimensional: definição 'razão', faixa ''",
  HOMA_IR: "índice adimensional: definição 'índice', faixa ''",
  INR: "razão adimensional: canônica '{ratio}', definição 'razão', faixa 'ratio'",
  Omega6_Omega3_Ratio: "razão adimensional: definição 'razão', faixa ''",
  ProthrombinTime: "segundos nas três: canônica 's', definição 'segundos', faixa 'seconds'",
  TScore_Total: "escore adimensional: definição 'score', faixa ''",
  ZScore_Total: "escore adimensional: definição 'score', faixa ''",
};

interface UnitSource {
  place: string;
  unit: string;
}

function collectUnitSources(code: string): UnitSource[] {
  const sources: UnitSource[] = [];
  const config = BIOMARKER_UNITS[code];
  if (config) sources.push({ place: 'BIOMARKER_UNITS.canonicalUnit', unit: config.canonicalUnit });

  const definition = BIOMARKER_DEFINITIONS.find((d) => d.code === code);
  if (definition?.unit !== undefined) {
    sources.push({ place: 'definition.unit', unit: definition.unit });
  }

  const ranges = biomarkerRangeDefinitions[code];
  if (ranges) {
    sources.push({ place: 'range.default', unit: ranges.default.unit });
    ranges.variants?.forEach((variant, index) => {
      sources.push({ place: `range.variants[${index}]`, unit: variant.range.unit });
    });
  }
  return sources;
}

/** Normaliza a grafia pelos aliases que o próprio código declara. */
function normalizeForCode(code: string, unit: string): string {
  const aliases = BIOMARKER_UNITS[code]?.aliases;
  if (!aliases) return unit;
  return aliases[unit.toLowerCase()] ?? aliases[unit] ?? unit;
}

function distinctUnits(code: string): string[] {
  return [...new Set(collectUnitSources(code).map((s) => normalizeForCode(code, s.unit)))];
}

const ALL_CODES = [
  ...new Set([
    ...BIOMARKER_DEFINITIONS.map((d) => d.code),
    ...Object.keys(BIOMARKER_UNITS),
    ...Object.keys(biomarkerRangeDefinitions),
  ]),
].sort();

const CHECKED_CODES = ALL_CODES.filter((code) => !(code in KNOWN_LABEL_MISMATCHES));

describe('catalog unit consistency', () => {
  it.each(CHECKED_CODES)('%s uses at most one unit across units, definition and ranges', (code) => {
    const units = distinctUnits(code);
    const detail = collectUnitSources(code)
      .map((s) => `${s.place}=${JSON.stringify(s.unit)}`)
      .join(', ');
    // Exames qualitativos (tipo sanguíneo, tiras de urina) não declaram unidade
    // em lugar nenhum; para eles não há o que comparar.
    expect(units.length, `${code}: ${detail}`).toBeLessThanOrEqual(1);
  });

  it.each(Object.keys(KNOWN_LABEL_MISMATCHES))(
    '%s is still a known label mismatch (remove it from the list once fixed)',
    (code) => {
      expect(ALL_CODES).toContain(code);
      expect(distinctUnits(code).length).toBeGreaterThan(1);
    },
  );
});

describe('immunoglobulins in mg/dL', () => {
  it.each(['IgA', 'IgG'])('%s has canonical mg/dL and SI g/L', (code) => {
    expect(getCanonicalUnit(code)).toBe('mg/dL');
    expect(getSIUnit(code)).toBe('g/L');
  });

  it('converts IgA in g/L to the canonical mg/dL (× 100)', () => {
    const result = convertUnit(3.73, 'g/L', getCanonicalUnit('IgA') ?? '', 'IgA');
    expect(result?.unit).toBe('mg/dL');
    expect(result?.value).toBeCloseTo(373, 10);
  });

  it('converts IgG from canonical mg/dL to SI g/L (× 0.01)', () => {
    const result = convertUnit(1200, 'mg/dL', getSIUnit('IgG') ?? '', 'IgG');
    expect(result?.unit).toBe('g/L');
    expect(result?.value).toBeCloseTo(12, 10);
  });

  it('does not apply the mg/dL fallback range to an IgA value in g/L', () => {
    const biomarkers = [{ code: 'IgA', unit: 'g/L', value: 3.73 }];
    expect(applyFallbackReferenceRanges(biomarkers)).toBe(0);
  });
});
