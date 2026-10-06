import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS, codeToLoinc, loincToCode, methodVariantOf } from '../biomarkers';
import { LOINC_SYSTEM } from '../code-systems';
import { labObservationToFHIR } from '../converter';
import { mapFHIRObservationToInternal } from '../importer';
import type { LabObservationData } from '../types';

interface SnapshotEntry {
  method: string | null;
  property: string | null;
  scale: string | null;
  status: string | null;
  system: string | null;
}

const snapshot = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../../scripts/loinc-snapshot.json', import.meta.url)),
    'utf8',
  ),
) as { codes: Record<string, SnapshotEntry> };

const valueSet = readFileSync(
  fileURLToPath(new URL('../../../../ig/input/fsh/valuesets/BRLabTestVS.fsh', import.meta.url)),
  'utf8',
);

const variantes = BIOMARKER_DEFINITIONS.flatMap((b) =>
  (b.methodVariants ?? []).map((v) => ({ base: b.loinc, code: b.code, ...v })),
);

describe('variantes por método no catálogo', () => {
  it('o código por método resolve para o biomarcador, e o inverso continua sem método', () => {
    expect(loincToCode('96259-7')).toBe('LDL');
    expect(loincToCode('13457-7')).toBe('LDL');
    expect(loincToCode('18262-6')).toBe('LDL');
    expect(codeToLoinc('LDL')).toBe('2089-1');
  });

  it('methodVariantOf só reconhece variante declarada do próprio biomarcador', () => {
    expect(methodVariantOf('LDL', '96259-7')?.method).toBe('Calculated.Martin-Hopkins');
    expect(methodVariantOf('LDL', '2089-1')).toBeUndefined();
    expect(methodVariantOf('HDL', '96259-7')).toBeUndefined();
  });

  // O snapshot é o que o `verify-loinc.ts` confere todo mês contra o servidor
  // oficial. Variante fora dele seria código que ninguém confere.
  it('toda variante está no snapshot, ativa, e difere do código base só no método', () => {
    for (const v of variantes) {
      const entry = snapshot.codes[v.loinc];
      const base = snapshot.codes[v.base!];
      expect(entry, v.loinc).toBeDefined();
      expect(entry?.status, v.loinc).toBe('ACTIVE');
      expect(entry?.method, v.loinc).toBe(v.method);
      expect([entry?.property, entry?.system, entry?.scale], `${v.loinc} contra ${v.base}`).toEqual(
        [base?.property, base?.system, base?.scale],
      );
    }
  });

  // Variante repetida, ou igual a um código que já resolve para outro
  // biomarcador, faria o `loincToCode` responder pelo último que escreveu no
  // mapa, em silêncio.
  it('código de variante é único e não colide com nenhum outro código do catálogo', () => {
    const outros = BIOMARKER_DEFINITIONS.flatMap((b) => [
      ...(b.loinc ? [b.loinc] : []),
      ...(b.loincAliases ?? []),
    ]);
    const codigos = variantes.map((v) => v.loinc);
    expect(new Set(codigos).size).toBe(codigos.length);
    expect(codigos.filter((c) => outros.includes(c))).toEqual([]);
  });

  it('toda pista é texto não vazio, e variante sem pista diz por quê', () => {
    for (const v of variantes) {
      for (const cue of [...v.cues.pt, ...v.cues.en])
        expect(cue.trim().length, v.loinc).toBeGreaterThan(0);
      if (v.cues.pt.length + v.cues.en.length === 0) expect(v.note, v.loinc).toBeTruthy();
    }
  });

  it('toda variante está no BRLabTestVS', () => {
    for (const v of variantes) expect(valueSet, v.loinc).toContain(`$LOINC#${v.loinc} `);
  });
});

describe('o código por método no FHIR', () => {
  const ldl: LabObservationData = {
    biomarkerCode: 'LDL',
    biomarkerName: 'Colesterol LDL',
    collectionDate: '2026-10-01',
    flag: '',
    reportId: 'r1',
    unit: 'mg/dL',
    value: 87,
  };
  const loincOf = (obs: LabObservationData) =>
    labObservationToFHIR(obs, 'p1').code.coding?.find((c) => c.system === LOINC_SYSTEM)?.code;

  it('variante declarada sai no coding LOINC', () => {
    expect(loincOf({ ...ldl, methodLoinc: '96259-7' })).toBe('96259-7');
  });

  it('sem methodLoinc, ou com um que não é variante, sai o código sem método', () => {
    expect(loincOf(ldl)).toBe('2089-1');
    expect(loincOf({ ...ldl, methodLoinc: '2085-9' })).toBe('2089-1');
  });

  it('ida e volta preserva o código por método', () => {
    const fhir = labObservationToFHIR({ ...ldl, methodLoinc: '96259-7' }, 'p1');
    const result = mapFHIRObservationToInternal(fhir, 0);
    expect('observation' in result && result.observation).toMatchObject({
      biomarkerCode: 'LDL',
      loincCode: '96259-7',
      methodLoinc: '96259-7',
    });
  });

  it('ida e volta sem método não inventa methodLoinc', () => {
    const result = mapFHIRObservationToInternal(labObservationToFHIR(ldl, 'p1'), 0);
    expect('observation' in result && result.observation).not.toHaveProperty('methodLoinc');
  });
});
