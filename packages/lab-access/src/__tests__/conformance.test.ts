import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = new URL('./', import.meta.url);
const README = readFileSync(fileURLToPath(new URL('../../README.md', HERE)), 'utf-8');

/**
 * Requisitos do receptor e os de registro, que valem para os dois papéis, na
 * versão 0.2.2 da especificação.
 */
const REQUIRED = [
  ...Array.from({ length: 13 }, (_, i) => `REG-${String(i + 1).padStart(3, '0')}`),
  ...Array.from({ length: 49 }, (_, i) => `RCP-${String(i + 1).padStart(3, '0')}`),
];

/** Retirados na 0.2.1: ficam na tabela, marcados, e sem teste. */
const RETIRED = ['REG-006', 'RCP-014'];

interface Row {
  id: string;
  status: string;
  tests: string[];
}

function conformanceRows(): Row[] {
  const start = README.indexOf('<!-- conformidade:início -->');
  const end = README.indexOf('<!-- conformidade:fim -->');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return README.slice(start, end)
    .split('\n')
    .filter((line) => /^\| (REG|RCP)-\d{3} /.test(line))
    .map((line) => {
      const [, id, status, detail] = line.split('|').map((cell) => cell.trim());
      const tests = [...detail!.matchAll(/`((?:REG|RCP)-\d{3}: [^`]+)`/g)].map((m) => m[1]!);
      return { id: id!, status: status!, tests };
    });
}

/** Títulos de teste que começam com um identificador de requisito. */
function testTitles(): Set<string> {
  const titles = new Set<string>();
  for (const file of readdirSync(fileURLToPath(HERE))) {
    if (!file.endsWith('.test.ts') || file === 'conformance.test.ts') continue;
    const source = readFileSync(fileURLToPath(new URL(file, HERE)), 'utf-8');
    for (const match of source.matchAll(/(?:it|describe)\(\s*'((?:REG|RCP)-\d{3}: [^']+)'/g)) {
      titles.add(match[1]!);
    }
  }
  return titles;
}

describe('mapa de conformidade do README', () => {
  const rows = conformanceRows();
  const titles = testTitles();

  it('tem uma linha para cada requisito do receptor e de registro, sem repetição', () => {
    expect(rows.map((row) => row.id).sort()).toEqual([...REQUIRED].sort());
  });

  it('usa só as situações previstas, e Retirado só para os requisitos retirados', () => {
    for (const row of rows) {
      const allowed = RETIRED.includes(row.id)
        ? ['Retirado']
        : ['Coberto', 'Parcial', 'Fora do alcance'];
      expect(allowed, row.id).toContain(row.status);
    }
  });

  it('todo requisito coberto ou parcial aponta ao menos um teste, e nenhum retirado aponta', () => {
    for (const row of rows) {
      if (row.status === 'Coberto' || row.status === 'Parcial') {
        expect(row.tests.length, row.id).toBeGreaterThan(0);
      }
      if (row.status === 'Retirado') expect(row.tests, row.id).toEqual([]);
    }
  });

  it('todo teste citado existe, com o mesmo nome, e pertence ao requisito da linha', () => {
    for (const row of rows) {
      for (const test of row.tests) {
        expect(titles.has(test), `${row.id}: "${test}" não existe nos testes`).toBe(true);
        expect(test.startsWith(`${row.id}: `), `${test} está na linha de ${row.id}`).toBe(true);
      }
    }
  });

  it('todo teste com identificador de requisito é de um requisito em vigor da tabela', () => {
    expect(titles.size).toBeGreaterThan(80);
    for (const title of titles) {
      expect(REQUIRED, title).toContain(title.slice(0, 7));
      expect(RETIRED, title).not.toContain(title.slice(0, 7));
    }
  });
});
