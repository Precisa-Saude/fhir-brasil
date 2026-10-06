import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS } from '../biomarkers';
import { LOINC_SNAPSHOT } from '../loinc-axes';
import { MAPPING_DECISIONS, NO_LOINC_DECISIONS } from '../mapping-decisions';
import { getMappingSheet } from '../mapping-sheet';

/**
 * O registro de decisão é o que uma revisão de mapeamento lê. Estes testes
 * garantem que ele acompanha o catálogo: código novo ou trocado sem registro
 * falha aqui, e o registro não pode afirmar o que não se sustenta (decidir
 * por uma evidência que não está na lista, rejeitar um código que não existe).
 */

const snapshotJson = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../../scripts/loinc-snapshot.json', import.meta.url)),
    'utf8',
  ),
) as unknown;

const coded = BIOMARKER_DEFINITIONS.filter(
  (b): b is typeof b & { loinc: string } => typeof b.loinc === 'string',
);
const semCodigo = BIOMARKER_DEFINITIONS.filter((b) => !b.loinc);

describe('o módulo publicado é cópia do snapshot', () => {
  it('loinc-snapshot.generated.ts bate com scripts/loinc-snapshot.json', () => {
    // Divergiu: rode `node --experimental-strip-types scripts/generate-loinc-snapshot-module.ts`.
    expect(LOINC_SNAPSHOT).toEqual(snapshotJson);
  });
});

describe('todo mapeamento tem registro de decisão', () => {
  it('cada biomarcador com LOINC tem registro', () => {
    const faltando = coded.filter((b) => !MAPPING_DECISIONS[b.code]).map((b) => b.code);
    expect(faltando).toEqual([]);
  });

  // Trocar o código no catálogo sem tocar no registro deixa o registro
  // justificando o código antigo. Falhar aqui põe a troca e o porquê no mesmo diff.
  it('o código do registro é o código do catálogo', () => {
    const divergentes = coded
      .filter((b) => MAPPING_DECISIONS[b.code] && MAPPING_DECISIONS[b.code]!.loinc !== b.loinc)
      .map((b) => `${b.code}: catálogo ${b.loinc}, registro ${MAPPING_DECISIONS[b.code]!.loinc}`);
    expect(divergentes).toEqual([]);
  });

  it('nenhum registro sobra para biomarcador que não existe ou não tem código', () => {
    const codigos = new Set(coded.map((b) => b.code));
    expect(Object.keys(MAPPING_DECISIONS).filter((c) => !codigos.has(c))).toEqual([]);
  });

  it('a evidência que decidiu está na lista de evidências, sem repetição', () => {
    const ruins = Object.entries(MAPPING_DECISIONS)
      .filter(
        ([, d]) =>
          !d.evidence.length ||
          !d.evidence.includes(d.settledBy) ||
          new Set(d.evidence).size !== d.evidence.length,
      )
      .map(([c]) => c);
    expect(ruins).toEqual([]);
  });

  it('revisor, data e versão do LOINC vêm juntos', () => {
    const incompletos = Object.entries(MAPPING_DECISIONS)
      .filter(([, d]) => {
        const campos = [d.reviewer, d.reviewedAt, d.loincVersion].filter(Boolean).length;
        return campos !== 0 && campos !== 3;
      })
      .map(([c]) => c);
    expect(incompletos).toEqual([]);
  });
});

describe('irmãos rejeitados', () => {
  const rejeicoes = coded.flatMap((b) =>
    (MAPPING_DECISIONS[b.code]?.siblingsRejected ?? []).map((s) => ({ b, s })),
  );

  it('existem no snapshot, que confere a existência todo mês', () => {
    const fora = rejeicoes
      .filter(({ s }) => !LOINC_SNAPSHOT.codes[s.loinc])
      .map(({ b, s }) => `${b.code}: ${s.loinc}`);
    expect(fora).toEqual([]);
  });

  it('não são o código escolhido nem uma variante dele, e trazem motivo', () => {
    const ruins = rejeicoes
      .filter(
        ({ b, s }) =>
          s.loinc === b.loinc ||
          (b.methodVariants ?? []).some((v) => v.loinc === s.loinc) ||
          !s.reason.trim(),
      )
      .map(({ b, s }) => `${b.code}: ${s.loinc}`);
    expect(ruins).toEqual([]);
  });
});

describe('toda entrada sem LOINC diz por quê', () => {
  it('cada biomarcador sem código tem motivo e nota', () => {
    const faltando = semCodigo
      .filter((b) => !NO_LOINC_DECISIONS[b.code]?.note.trim())
      .map((b) => b.code);
    expect(faltando).toEqual([]);
  });

  it('nenhum motivo sobra para biomarcador que ganhou código', () => {
    const sem = new Set(semCodigo.map((b) => b.code));
    expect(Object.keys(NO_LOINC_DECISIONS).filter((c) => !sem.has(c))).toEqual([]);
  });
});

describe('ficha de decisão', () => {
  it('resolve pelo LOINC e mostra o escolhido, as variantes e os grupos', () => {
    const ficha = getMappingSheet('2089-1');
    expect(ficha?.code).toBe('LDL');
    expect(ficha?.specimen).toBe('Ser/Plas');
    expect(ficha?.method).toBeNull();
    expect(ficha?.candidates.map((c) => c.role)).toEqual([
      'chosen',
      'method-variant',
      'method-variant',
      'method-variant',
    ]);
    expect(Object.keys(ficha?.groups ?? {}).length).toBeGreaterThan(0);
  });

  it('traz o rejeitado com os eixos dele', () => {
    const rejeitado = getMappingSheet('BetaHydroxybutyrate')?.candidates.find(
      (c) => c.role === 'rejected',
    );
    expect(rejeitado?.loinc).toBe('53060-0');
    expect(rejeitado?.axes?.system).toBe('Amnio fld');
  });

  it('entrada sem LOINC traz o motivo em vez de candidatos', () => {
    const ficha = getMappingSheet('Estrone');
    expect(ficha?.noLoinc?.reason).toBe('no-concept');
    expect(ficha?.candidates).toEqual([]);
  });
});
