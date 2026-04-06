import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock process.exit to prevent test runner from exiting
vi.spyOn(process, 'exit').mockImplementation((() => {
  throw new Error('process.exit called');
}) as never);

// Capture stdout/stderr
let stdoutOutput: string;
let stderrOutput: string;

beforeEach(() => {
  stdoutOutput = '';
  stderrOutput = '';
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stdoutOutput += typeof chunk === 'string' ? chunk : chunk.toString();
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stderrOutput += typeof chunk === 'string' ? chunk : chunk.toString();
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  // Re-apply exit mock after restoreAllMocks
  vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit called');
  }) as never);
});

// ─── lookup ────────────────────────────────────────────────────────────────────

describe('cli: lookup', () => {
  it('should display biomarker info by code', async () => {
    const { lookup } = await import('../../cli/commands/lookup');
    await lookup(['Glucose'], false);
    expect(stdoutOutput).toContain('Biomarcador: Glucose');
    expect(stdoutOutput).toContain('LOINC:');
  });

  it('should output JSON when --json flag is used', async () => {
    const { lookup } = await import('../../cli/commands/lookup');
    await lookup(['Glucose'], true);
    const data = JSON.parse(stdoutOutput);
    expect(data.code).toBe('Glucose');
  });

  it('should error when no code is provided', async () => {
    const { lookup } = await import('../../cli/commands/lookup');
    await expect(lookup([], false)).rejects.toThrow('process.exit called');
    expect(stderrOutput).toContain('Uso:');
  });

  it('should error for unknown biomarker', async () => {
    const { lookup } = await import('../../cli/commands/lookup');
    await expect(lookup(['NonExistent'], false)).rejects.toThrow('process.exit called');
    expect(stderrOutput).toContain('não encontrado');
  });
});

// ─── lookup-loinc ──────────────────────────────────────────────────────────────

describe('cli: lookup-loinc', () => {
  it('should find biomarker by LOINC code', async () => {
    const { lookupLoinc } = await import('../../cli/commands/lookup');
    await lookupLoinc(['2345-7'], false); // Glucose LOINC
    expect(stdoutOutput).toContain('Biomarcador: Glucose');
  });

  it('should output JSON for LOINC lookup', async () => {
    const { lookupLoinc } = await import('../../cli/commands/lookup');
    await lookupLoinc(['2345-7'], true);
    const data = JSON.parse(stdoutOutput);
    expect(data.loinc).toBe('2345-7');
  });

  it('should error when no LOINC is provided', async () => {
    const { lookupLoinc } = await import('../../cli/commands/lookup');
    await expect(lookupLoinc([], false)).rejects.toThrow('process.exit called');
    expect(stderrOutput).toContain('Uso:');
  });
});

// ─── list ──────────────────────────────────────────────────────────────────────

describe('cli: list', () => {
  it('should list all biomarkers as table', async () => {
    const { list } = await import('../../cli/commands/list');
    await list([], false);
    expect(stdoutOutput).toContain('Código');
    expect(stdoutOutput).toContain('LOINC');
    expect(stdoutOutput).toContain('Total:');
  });

  it('should output JSON list', async () => {
    const { list } = await import('../../cli/commands/list');
    await list([], true);
    const data = JSON.parse(stdoutOutput);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(100);
  });

  it('should filter by category', async () => {
    const { list } = await import('../../cli/commands/list');
    await list(['--category', 'metabolico'], true);
    const data = JSON.parse(stdoutOutput);
    expect(data.length).toBeGreaterThan(0);
    for (const d of data) {
      const cats = Array.isArray(d.category) ? d.category : [d.category];
      expect(cats).toContain('metabolico');
    }
  });

  it('should filter visible-only biomarkers', async () => {
    const { list } = await import('../../cli/commands/list');
    await list(['--visible'], true);
    const data = JSON.parse(stdoutOutput);
    for (const d of data) {
      expect(d.hidden).not.toBe(true);
    }
  });

  it('should error on invalid category', async () => {
    const { list } = await import('../../cli/commands/list');
    await expect(list(['--category', 'nonexistent'], false)).rejects.toThrow('process.exit called');
    expect(stderrOutput).toContain('não encontrada');
  });
});

// ─── categories ────────────────────────────────────────────────────────────────

describe('cli: categories', () => {
  it('should list categories with biomarker counts', async () => {
    const { categories } = await import('../../cli/commands/categories');
    await categories([], false);
    expect(stdoutOutput).toContain('metabolico');
    expect(stdoutOutput).toContain('tireoide');
  });

  it('should output JSON grouped by category', async () => {
    const { categories } = await import('../../cli/commands/categories');
    await categories([], true);
    const data = JSON.parse(stdoutOutput);
    expect(data).toHaveProperty('metabolico');
    expect(Array.isArray(data.metabolico)).toBe(true);
  });
});

// ─── range ─────────────────────────────────────────────────────────────────────

describe('cli: range', () => {
  it('should display reference range for a biomarker', async () => {
    const { range } = await import('../../cli/commands/range');
    await range(['Glucose'], false);
    expect(stdoutOutput).toContain('Faixa de Referência: Glucose');
    expect(stdoutOutput).toContain('Mínimo:');
    expect(stdoutOutput).toContain('Máximo:');
  });

  it('should output JSON range', async () => {
    const { range } = await import('../../cli/commands/range');
    await range(['Glucose'], true);
    const data = JSON.parse(stdoutOutput);
    expect(data.referenceRange).toBeDefined();
    expect(data.referenceRange.unit).toBe('mg/dL');
  });

  it('should accept sex and age filters', async () => {
    const { range } = await import('../../cli/commands/range');
    await range(['Hgb', '--sex', 'M', '--age', '30'], true);
    const data = JSON.parse(stdoutOutput);
    expect(data.context.biologicalSex).toBe('M');
    expect(data.context.age).toBe(30);
  });

  it('should error when no code is provided', async () => {
    const { range } = await import('../../cli/commands/range');
    await expect(range([], false)).rejects.toThrow('process.exit called');
    expect(stderrOutput).toContain('Uso:');
  });
});

// ─── units ─────────────────────────────────────────────────────────────────────

describe('cli: units', () => {
  it('should display unit info for a biomarker', async () => {
    const { units } = await import('../../cli/commands/units');
    await units(['Glucose'], false);
    expect(stdoutOutput).toContain('Unidades: Glucose');
    expect(stdoutOutput).toContain('Padrão:');
    expect(stdoutOutput).toContain('mg/dL');
  });

  it('should output JSON unit details', async () => {
    const { units } = await import('../../cli/commands/units');
    await units(['Glucose'], true);
    const data = JSON.parse(stdoutOutput);
    expect(data.defaultUnit).toBe('mg/dL');
  });

  it('should error when no code is provided', async () => {
    const { units } = await import('../../cli/commands/units');
    await expect(units([], false)).rejects.toThrow('process.exit called');
    expect(stderrOutput).toContain('Uso:');
  });
});

// ─── loinc-map ─────────────────────────────────────────────────────────────────

describe('cli: loinc-map', () => {
  it('should display LOINC mapping table', async () => {
    const { loincMap } = await import('../../cli/commands/loinc-map');
    await loincMap([], false);
    expect(stdoutOutput).toContain('LOINC');
    expect(stdoutOutput).toContain('Código');
    expect(stdoutOutput).toContain('Total:');
  });

  it('should output JSON LOINC map', async () => {
    const { loincMap } = await import('../../cli/commands/loinc-map');
    await loincMap([], true);
    const data = JSON.parse(stdoutOutput);
    expect(data['2345-7']).toBe('Glucose');
  });
});

// ─── convert ───────────────────────────────────────────────────────────────────

describe('cli: convert', () => {
  it('should convert lab JSON to FHIR Bundle', async () => {
    const { convert } = await import('../../cli/commands/convert');
    const fixture = join(__dirname, 'fixtures', 'convert-input.json');
    await convert([fixture], true);
    const data = JSON.parse(stdoutOutput);
    expect(data.resourceType).toBe('Bundle');
  });

  it('should error on invalid JSON', async () => {
    const { convert } = await import('../../cli/commands/convert');
    const fixture = join(__dirname, 'fixtures', 'invalid.txt');
    await expect(convert([fixture], false)).rejects.toThrow('process.exit called');
  });
});

// ─── validate ──────────────────────────────────────────────────────────────────

describe('cli: validate', () => {
  it('should validate a valid FHIR Bundle', async () => {
    const { validate } = await import('../../cli/commands/validate');
    const fixture = join(__dirname, 'fixtures', 'valid-bundle.json');
    await validate([fixture], false);
    expect(stdoutOutput).toContain('válido');
  });

  it('should output JSON validation result', async () => {
    const { validate } = await import('../../cli/commands/validate');
    const fixture = join(__dirname, 'fixtures', 'valid-bundle.json');
    await validate([fixture], true);
    const data = JSON.parse(stdoutOutput);
    expect(data.valid).toBe(true);
    expect(data.errors).toEqual([]);
  });
});

// ─── import ────────────────────────────────────────────────────────────────────

describe('cli: import', () => {
  it('should import a FHIR Bundle and extract observations', async () => {
    const { importBundle } = await import('../../cli/commands/import');
    const fixture = join(__dirname, 'fixtures', 'valid-bundle.json');
    await importBundle([fixture], false);
    expect(stdoutOutput).toContain('Processados:');
    expect(stdoutOutput).toContain('Importados:');
  });

  it('should output JSON import result', async () => {
    const { importBundle } = await import('../../cli/commands/import');
    const fixture = join(__dirname, 'fixtures', 'valid-bundle.json');
    await importBundle([fixture], true);
    const data = JSON.parse(stdoutOutput);
    expect(data).toHaveProperty('totalProcessed');
    expect(data).toHaveProperty('imported');
    expect(data).toHaveProperty('skipped');
  });
});

// ─── cli-utils ─────────────────────────────────────────────────────────────────

describe('cli-utils', () => {
  it('formatTable should format headers and rows', async () => {
    const { formatTable } = await import('../../cli-utils');
    const result = formatTable(
      ['A', 'B'],
      [
        ['1', '22'],
        ['333', '4'],
      ],
    );
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toContain('---');
    expect(result).toContain('333');
  });

  it('outputJson should write JSON to stdout', async () => {
    const { outputJson } = await import('../../cli-utils');
    outputJson({ test: true });
    expect(stdoutOutput).toContain('"test": true');
  });

  it('outputText should write text to stdout', async () => {
    const { outputText } = await import('../../cli-utils');
    outputText('hello world');
    expect(stdoutOutput).toBe('hello world\n');
  });

  it('parseJson should parse valid JSON', async () => {
    const { parseJson } = await import('../../cli-utils');
    const result = parseJson<{ x: number }>('{"x": 1}', 'fail');
    expect(result.x).toBe(1);
  });

  it('parseJson should exit on invalid JSON', async () => {
    const { parseJson } = await import('../../cli-utils');
    expect(() => parseJson('not json', 'invalid')).toThrow('process.exit called');
    expect(stderrOutput).toContain('invalid');
  });

  it('exitWithError should write to stderr and exit', async () => {
    const { exitWithError } = await import('../../cli-utils');
    expect(() => exitWithError('something broke')).toThrow('process.exit called');
    expect(stderrOutput).toContain('something broke');
  });
});
