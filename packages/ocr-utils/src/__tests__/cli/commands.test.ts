import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock process.exit to prevent test runner from exiting
vi.spyOn(process, 'exit').mockImplementation((() => {
  throw new Error('process.exit called');
}) as never);

let stdoutOutput: string;

beforeEach(() => {
  stdoutOutput = '';
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    stdoutOutput += typeof chunk === 'string' ? chunk : chunk.toString();
    return true;
  });
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(process, 'exit').mockImplementation((() => {
    throw new Error('process.exit called');
  }) as never);
});

const SAMPLE_OCR_TEXT = `
RESULTADOS DE EXAMES LABORATORIAIS
Paciente: Maria Silva

Glicose: 95 mg/dL
Hemoglobina Glicada (HbA1c): 5.4%
Colesterol Total: 190 mg/dL
HDL: 55 mg/dL
LDL: 110 mg/dL
Triglicerídeos: 120 mg/dL
`;

function writeTmpFile(content: string): string {
  const path = join(tmpdir(), `fhir-ocr-test-${Date.now()}.txt`);
  writeFileSync(path, content, 'utf-8');
  return path;
}

// ─── find ──────────────────────────────────────────────────────────────────────

describe('cli: find', () => {
  it('should find biomarkers in OCR text', async () => {
    const { find } = await import('../../cli/commands/find');
    const file = writeTmpFile(SAMPLE_OCR_TEXT);
    await find([file], false);
    expect(stdoutOutput).toContain('Código');
    expect(stdoutOutput).toContain('Encontrados:');
  });

  it('should output JSON results', async () => {
    const { find } = await import('../../cli/commands/find');
    const file = writeTmpFile(SAMPLE_OCR_TEXT);
    await find([file], true);
    const data = JSON.parse(stdoutOutput);
    expect(data).toHaveProperty('matches');
    expect(data).toHaveProperty('stats');
    expect(data.matches.length).toBeGreaterThan(0);
  });

  it('should report no matches for irrelevant text', async () => {
    const { find } = await import('../../cli/commands/find');
    const file = writeTmpFile('Este texto não contém nenhum biomarcador.');
    await find([file], false);
    expect(stdoutOutput).toContain('Nenhum biomarcador');
  });
});

// ─── codes ─────────────────────────────────────────────────────────────────────

describe('cli: codes', () => {
  it('should extract biomarker codes from text', async () => {
    const { codes } = await import('../../cli/commands/codes');
    const file = writeTmpFile(SAMPLE_OCR_TEXT);
    await codes([file], false);
    expect(stdoutOutput).toContain('Total:');
  });

  it('should output JSON codes array', async () => {
    const { codes } = await import('../../cli/commands/codes');
    const file = writeTmpFile(SAMPLE_OCR_TEXT);
    await codes([file], true);
    const data = JSON.parse(stdoutOutput);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('should report no matches for irrelevant text', async () => {
    const { codes } = await import('../../cli/commands/codes');
    const file = writeTmpFile('Nada relevante aqui.');
    await codes([file], false);
    expect(stdoutOutput).toContain('Nenhum biomarcador');
  });
});
