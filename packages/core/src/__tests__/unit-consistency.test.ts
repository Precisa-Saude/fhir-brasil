import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS } from '../biomarkers';
import {
  applyFallbackReferenceRanges,
  biomarkerRangeDefinitions,
  getReferenceRange,
} from '../reference-ranges';
import {
  BIOMARKER_UNITS,
  convertUnit,
  getCanonicalUnit,
  getSIUnit,
  standardUnitSpelling,
  UNIT_TO_UCUM,
} from '../units';

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
 * a divergência é só de rótulo de unidade adimensional, e não há alias no
 * catálogo que permita equipará-las. Uniformizar esses rótulos é decisão
 * separada, porque `unit` da definição aparece na interface em pt-BR.
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
  TScore_Total: "escore adimensional: definição 'score', faixa ''",
  ZScore_Total: "escore adimensional: definição 'score', faixa ''",
};

/**
 * Códigos UCUM que o catálogo ainda traz com duas grafias, à espera da decisão
 * registrada em `docs/unidades.md`. O INR usa `{ratio}` como canônica e as
 * outras razões usam `razão`. `AU` (escore de Agatston) e `score` (T-score e
 * Z-score) não são a mesma unidade: só dividem a anotação `{score}`.
 */
const KNOWN_DOUBLE_SPELLINGS: Record<string, string[]> = {
  '{ratio}': ['razão', '{ratio}'],
  '{score}': ['AU', 'score'],
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

describe('troponin T reported in ng/mL', () => {
  it.each(['ng/mL', 'ng/ml', 'µg/L', 'ug/L', 'mcg/L'])(
    'converts 0.012 %s to 12 ng/L (× 1000)',
    (unit) => {
      const result = convertUnit(0.012, unit, 'ng/L', 'TroponinT');
      expect(result?.unit).toBe('ng/L');
      expect(result?.value).toBeCloseTo(12, 10);
    },
  );

  it.each(['pg/mL', 'pg/ml'])('reads 12 %s as 12 ng/L (same unit)', (unit) => {
    const result = convertUnit(12, unit, 'ng/L', 'TroponinT');
    expect(result).toEqual({ unit: 'ng/L', value: 12 });
  });

  it('converts the canonical ng/L back to ng/mL (× 0.001)', () => {
    const result = convertUnit(12, 'ng/L', 'ng/mL', 'TroponinT');
    expect(result?.unit).toBe('ng/mL');
    expect(result?.value).toBeCloseTo(0.012, 10);
  });

  it('compares the converted value against the 14 ng/L range in the same unit', () => {
    const range = getReferenceRange('TroponinT');
    expect(range).toBeDefined();
    expect(range?.unit).toBe('ng/L');
    expect(range?.max).toBe(14);

    const within = convertUnit(0.012, 'ng/mL', getCanonicalUnit('TroponinT') ?? '', 'TroponinT');
    expect(within?.unit).toBe(range?.unit);
    expect(within?.value).toBeLessThanOrEqual(range?.max ?? Number.NaN);

    const above = convertUnit(0.03, 'ng/mL', getCanonicalUnit('TroponinT') ?? '', 'TroponinT');
    expect(above?.value).toBeGreaterThan(range?.max ?? Number.NaN);
  });

  it('applies the fallback range only once the value is in ng/L', () => {
    const raw = [{ code: 'TroponinT', unit: 'ng/mL', value: 0.012 }];
    expect(applyFallbackReferenceRanges(raw)).toBe(0);

    const converted = [{ code: 'TroponinT', unit: 'ng/L', value: 12 }];
    expect(applyFallbackReferenceRanges(converted)).toBe(1);
  });
});

describe('BUN e ureia em mmol/L', () => {
  // As duas saem em mmol/L de ureia, mas o BUN conta só o nitrogênio: a massa
  // da conversão é a de N2 (28,01), e não a da ureia (60,06).
  it('converte BUN de mg/dL para mmol/L pela massa do nitrogênio', () => {
    const result = convertUnit(14, 'mg/dL', getSIUnit('BUN') ?? '', 'BUN');
    expect(result?.unit).toBe('mmol/L');
    expect(result?.value).toBeCloseTo(4.998, 3);
  });

  it('o mesmo paciente dá o mesmo mmol/L pela ureia e pelo BUN', () => {
    const bun = convertUnit(14, 'mg/dL', 'mmol/L', 'BUN')?.value ?? NaN;
    const urea = convertUnit(14 * (60.06 / 28.0134), 'mg/dL', 'mmol/L', 'Urea')?.value ?? NaN;
    expect(bun).toBeCloseTo(urea, 10);
  });
});

describe('grafia das unidades do catálogo', () => {
  // Toda unidade que o catálogo declara, com os códigos que a usam.
  const declared = new Map<string, Set<string>>();
  const declare = (code: string, unit: string | undefined): void => {
    if (!unit) return;
    declared.set(unit, (declared.get(unit) ?? new Set()).add(code));
  };
  for (const code of ALL_CODES) {
    collectUnitSources(code).forEach((s) => declare(code, s.unit));
    declare(code, BIOMARKER_UNITS[code]?.siUnit);
  }

  it.each([...declared.keys()].sort())('%s já está na grafia padrão', (unit) => {
    expect(standardUnitSpelling(unit)).toBe(unit);
  });

  it('nenhum código UCUM tem duas grafias no catálogo', () => {
    const byUcum = new Map<string, string[]>();
    for (const unit of declared.keys()) {
      const ucum = UNIT_TO_UCUM[unit];
      if (ucum === undefined) continue;
      byUcum.set(ucum, [...(byUcum.get(ucum) ?? []), unit]);
    }
    const doubled = [...byUcum].filter(([, units]) => units.length > 1);
    expect(Object.fromEntries(doubled)).toEqual(KNOWN_DOUBLE_SPELLINGS);
  });

  it('não sobra micro escrito sem µ', () => {
    const offenders = [...declared.keys()].filter((unit) => /^(mcg|microg|ug|umol)/i.test(unit));
    expect(offenders).toEqual([]);
  });
});

describe('standardUnitSpelling', () => {
  it.each([
    ['mcg/dL', 'µg/dL'],
    ['ug/dL', 'µg/dL'],
    ['microg/dL', 'µg/dL'],
    ['mcg/L', 'µg/L'],
    ['ug/mL', 'µg/mL'],
    ['umol/L', 'µmol/L'],
    ['μg/dL', 'µg/dL'],
    ['mm/hr', 'mm/h'],
    ['kg/m2', 'kg/m²'],
    ['segundos', 's'],
    ['seconds', 's'],
    ['mL/min/1.73m²', 'mL/min/1,73 m²'],
    ['mL/min/1.73m2', 'mL/min/1,73 m²'],
    ['ml/min/1,73 m2', 'mL/min/1,73 m²'],
    ['K/uL', 'mil/mm³'],
    ['10³/µL', 'mil/mm³'],
    ['mil/mm3', 'mil/mm³'],
    ['M/uL', 'milhões/mm³'],
    ['milhões/mm3', 'milhões/mm³'],
    ['IU/mL', 'UI/mL'],
    ['mIU/mL', 'mUI/mL'],
    ['IU/L', 'UI/L'],
    ['mIU/L', 'mUI/L'],
    ['uIU/mL', 'µUI/mL'],
    ['/HPF', '/campo'],
    ['titer', 'título'],
    ['/100 WBC', '/100 leucócitos'],
  ])('%s vira %s', (printed, standard) => {
    expect(standardUnitSpelling(printed)).toBe(standard);
  });

  it.each(['mg/dL', 'µg/dL', 'mUI/L', 'mil/mm³', 'U/L', '/LPF', '%', 'mL/min/1,73 m²'])(
    'deixa %s como está',
    (unit) => {
      expect(standardUnitSpelling(unit)).toBe(unit);
    },
  );

  it('não muda a escala: a grafia antiga converte para a nova com o mesmo número', () => {
    expect(convertUnit(80, 'mcg/dL', 'µg/dL', 'Iron')).toEqual({ unit: 'µg/dL', value: 80 });
    expect(convertUnit(90, 'mL/min/1.73m²', 'mL/min/1,73 m²', 'eGFR')).toEqual({
      unit: 'mL/min/1,73 m²',
      value: 90,
    });
    expect(convertUnit(12, 'mm/hr', 'mm/h', 'ESR')).toEqual({ unit: 'mm/h', value: 12 });
    expect(convertUnit(6.2, 'K/uL', 'mil/mm³', 'WBC')).toEqual({ unit: 'mil/mm³', value: 6.2 });
    expect(convertUnit(4.8, 'M/uL', 'milhões/mm³', 'RBC')).toEqual({
      unit: 'milhões/mm³',
      value: 4.8,
    });
    expect(convertUnit(2.1, 'uIU/mL', 'mUI/L', 'TSH')).toEqual({ unit: 'mUI/L', value: 2.1 });
    expect(convertUnit(7, 'uIU/mL', 'µUI/mL', 'Insulin')).toEqual({ unit: 'µUI/mL', value: 7 });
  });

  it('a faixa de reserva ainda alcança um valor gravado na grafia antiga', () => {
    const stored = [
      { code: 'Iron', unit: 'mcg/dL', value: 80 },
      { code: 'WBC', unit: 'K/uL', value: 6.2 },
      { code: 'TSH', unit: 'uIU/mL', value: 2.1 },
    ];
    expect(applyFallbackReferenceRanges(stored)).toBe(3);
  });
});
