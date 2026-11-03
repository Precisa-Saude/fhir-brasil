/* eslint-disable no-console -- script de CLI: a saída é o produto */
/**
 * Acrescenta ao `loinc-snapshot.json` só os códigos que faltam, sem tocar nas
 * entradas existentes. É a metade de escrita do `verify-loinc.ts
 * --merge-missing`; vive aqui para o verificador caber no limite de linhas.
 */

import { writeFileSync } from 'node:fs';

import { gerarModuloDoSnapshot } from './generate-loinc-snapshot-module.ts';

export interface SnapshotAxes {
  class: string | null;
  component: string | null;
  method: string | null;
  property: string | null;
  scale: string | null;
  system: string | null;
  time: string | null;
}

export interface SnapshotEntry extends SnapshotAxes {
  display: string;
  groups?: Record<string, string>;
  status: string | null;
}

/** O que um `$lookup` bem-sucedido devolve, no mínimo, para virar entrada. */
export type LookupComNome = Partial<SnapshotAxes> & {
  display: string;
  groups?: Record<string, string>;
  status?: string;
};

/** A entrada do snapshot de um resultado de `$lookup`, com os eixos ausentes em `null`. */
export function entradaDoSnapshot(r: LookupComNome): SnapshotEntry {
  return {
    class: r.class ?? null,
    component: r.component ?? null,
    display: r.display,
    ...(r.groups && { groups: r.groups }),
    method: r.method ?? null,
    property: r.property ?? null,
    scale: r.scale ?? null,
    status: r.status ?? null,
    system: r.system ?? null,
    time: r.time ?? null,
  };
}

/** O resultado de um `$lookup` como o verificador o guarda, antes de saber se tem nome. */
export interface LookupBruto extends Partial<SnapshotAxes> {
  ausente?: boolean;
  display?: string;
  groups?: Record<string, string>;
  status?: string;
}

/**
 * Acrescenta ao snapshot o que `vivos` trouxe e devolve o código de saída do
 * processo: 0 quando gravou ou não havia nada a acrescentar, 1 quando algum
 * código veio sem nome oficial (a licença do LOINC, 10.3, exige o display).
 *
 * `_checkedAt` e `_loincVersion` ficam como estão: dizem respeito à
 * conferência completa no servidor oficial, que o workflow mensal refaz e que
 * então cobre também o que entrou por aqui.
 */
export async function mesclarFaltantes(opcoes: {
  rotuloDe: (code: string) => string;
  snapshotAtual: { codes: Record<string, SnapshotEntry> } & Record<string, unknown>;
  snapshotPath: string;
  vivos: ReadonlyMap<string, LookupBruto>;
}): Promise<number> {
  const { rotuloDe, snapshotAtual, snapshotPath, vivos } = opcoes;
  const faltantes = [...vivos].sort((a, b) => a[0].localeCompare(b[0]));
  if (faltantes.length === 0) {
    console.error('\nNada a acrescentar: todos os códigos emitidos já estão no snapshot.');
    return 0;
  }
  const semNome = faltantes.filter(([, r]) => r.ausente || !r.display).map(([code]) => code);
  if (semNome.length) {
    console.error(`\nNão dá para acrescentar ${semNome.length} código(s) sem nome oficial:`);
    for (const c of semNome) console.error(`  - ${c}  (${rotuloDe(c)})`);
    return 1;
  }
  const codes = { ...snapshotAtual.codes };
  for (const [code, r] of faltantes) codes[code] = entradaDoSnapshot(r as LookupComNome);
  const ordenado = Object.fromEntries(Object.entries(codes).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(
    snapshotPath,
    `${JSON.stringify({ ...snapshotAtual, codes: ordenado }, null, 2)}\n`,
    'utf8',
  );
  await gerarModuloDoSnapshot();
  console.error(`\nAcrescentados ${faltantes.length} código(s) ao snapshot:`);
  for (const [code, r] of faltantes)
    console.error(`  + ${code}  ${r.display}  (${rotuloDe(code)})`);
}
