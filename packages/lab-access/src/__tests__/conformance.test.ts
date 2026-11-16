import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = new URL('./', import.meta.url);
const README = readFileSync(fileURLToPath(new URL('../../README.md', HERE)), 'utf-8');

/** Requisitos do receptor e os de registro, que valem para os dois papéis. */
const REQUIRED = [
  ...Array.from({ length: 6 }, (_, i) => `REG-${String(i + 1).padStart(3, '0')}`),
  ...Array.from({ length: 26 }, (_, i) => `RCP-${String(i + 1).padStart(3, '0')}`),
];

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

  it('usa só as três situações previstas', () => {
    for (const row of rows) {
      expect(['Coberto', 'Parcial', 'Fora do alcance'], row.id).toContain(row.status);
    }
  });

  it('todo requisito coberto ou parcial aponta ao menos um teste', () => {
    for (const row of rows) {
      if (row.status !== 'Fora do alcance') {
        expect(row.tests.length, row.id).toBeGreaterThan(0);
      }
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

  it('todo teste com identificador de requisito é de um requisito da tabela', () => {
    expect(titles.size).toBeGreaterThan(40);
    for (const title of titles) {
      expect(REQUIRED, title).toContain(title.slice(0, 7));
    }
  });
});
