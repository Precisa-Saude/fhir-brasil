import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS, codeToLoinc, isValidLoinc } from '../biomarkers';
import { biomarkerRangeDefinitions } from '../reference-ranges';
import { BIOMARKER_UNITS, isUcumCode, resolveUcum } from '../units';

/**
 * Os seis eixos do LOINC contra o que o catálogo declara.
 *
 * `scripts/verify-loinc.ts` garante que cada código existe e não mudou. Não
 * garante que é o código *certo*, e durante seis meses não foi:
 * `BetaHydroxybutyrate` apontava para butirilcarnitina em líquido amniótico,
 * `Bacteria_Urine` para urocultura, `EPADPADHA` para uma interpretação
 * ordinal, e os ácidos graxos para quantidade por hemácia enquanto o laudo
 * imprime %. Todos existiam, todos ACTIVE, todos verdes.
 *
 * Este teste lê os eixos que o snapshot guarda (propriedade, sistema, escala,
 * método) e confere, sem rede, o que dá para conferir por regra:
 *
 * - a **propriedade** do código tem que combinar com a dimensão da unidade
 *   declarada: % é fração, mg/dL é massa/volume, /HPF é número/área;
 * - o **sistema** tem que caber no catálogo: urina para `_Urine`, sangue e
 *   derivados para o resto, e líquido amniótico para ninguém;
 * - a **escala** de quem tem unidade é quantitativa.
 *
 * O que escapa da regra está em `KNOWN_AXIS_MISMATCHES`, com o motivo. Essa
 * lista é o lugar onde um compromisso vira visível em vez de ficar enterrado
 * num comentário: quem acrescentar um item aqui está dizendo que procurou o
 * código certo e ele não existe.
 */

interface SnapshotEntry {
  display: string;
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

/**
 * Propriedades do LOINC aceitas para cada unidade que o catálogo declara, na
 * grafia em que o LOINC as exibe. A lista é a do catálogo de hoje, e uma
 * unidade nova precisa entrar aqui com a sua classe.
 */
const PROPERTIES_BY_UNIT: Record<string, string[]> = {
  // Fração: massa, substância, número, volume. `DistWidth` é o RDW.
  '%': ['MFr', 'SFr', 'NFr', 'VFr', 'DistWidth'],
  '/HPF': ['Naric'],
  '/LPF': ['Naric'],
  Angstrom: ['EntLen'],
  // Unidades arbitrárias por volume, dos imunoensaios.
  'IU/mL': ['ACnc'],
  'K/uL': ['NCnc'],
  'kU/L': ['ACnc'],
  L: ['Vol'],
  'M/uL': ['NCnc'],
  'mEq/L': ['SCnc'],
  'mIU/mL': ['ACnc'],
  'mL/min/1.73m²': ['ArVRat'],
  'mcg/L': ['MCnc'],
  'mcg/dL': ['MCnc'],
  'mcg/mL': ['MCnc'],
  'mg/L': ['MCnc'],
  'mg/dL': ['MCnc'],
  'mg/g': ['MRto'],
  'mm/hr': ['Sedimentation Rate'],
  'mmol/L': ['SCnc'],
  'ng/L': ['MCnc'],
  'ng/dL': ['MCnc'],
  'ng/mL': ['MCnc'],
  'nmol/L': ['SCnc'],
  'pg/mL': ['MCnc'],
  'U/L': ['CCnc'],
  'U/mL': ['ACnc'],
  'uIU/mL': ['ACnc'],
  'ug/dL': ['MCnc'],
  'umol/L': ['SCnc'],
  cm: ['Len'],
  deg: ['Angle'],
  fL: ['EntVol', 'EntMeanVol'],
  // MCHC é massa/volume *por hemácia* (EntMCnc).
  'g/dL': ['MCnc', 'EntMCnc'],
  kg: ['Mass'],
  'kg/m2': ['Ratio'],
  mm: ['Len'],
  pg: ['EntMass'],
  // O LOINC classifica o HOMA (47214-2) como concentração arbitrária.
  índice: ['ACnc', 'Ratio'],
  // INR é tempo relativo (RelTime) no LOINC, e não razão de massa.
  razão: ['MRto', 'SRto', 'Ratio', 'RelTime'],
  segundos: ['Time'],
  'µg/L': ['MCnc'],
};

/**
 * Compromissos declarados: o código existe, o componente confere, e o LOINC
 * não tem a variante com a propriedade ou a escala que o laudo imprime. Cada
 * entrada aponta o código e o que foi procurado. A mesma justificativa está
 * no comentário da definição em `biomarkers.ts`.
 */
const KNOWN_AXIS_MISMATCHES: Record<string, string> = {
  CalfCircumference:
    '107112-5 é o item ordinal do MNA ("Calf circumference in cm", Find/Ord). ' +
    'O LOINC 2.82 só tem a medida quantitativa por lado (8282-6, 8283-4).',
  Omega3_Total:
    '99620-7 é moles/volume em RBC.lysate; o laudo imprime % e não há fração para o total.',
  Omega6_Total:
    '99621-5 é moles/volume em RBC.lysate; o laudo imprime % e não há fração para o total.',
  PhaseAngle: '107160-4 é [Ratio] (Xc/R); o aparelho imprime graus e é o único código.',
  TotalBodyWater: '101683-1 é massa (kg); o aparelho imprime litros e é o único código de total.',
};

/** Sistemas que um catálogo de laudo de rotina e antropometria pode usar. */
const ALLOWED_SYSTEMS = new Set([
  'Ser/Plas',
  'Ser',
  'Plas',
  'Ser/Plas/Bld',
  'Bld',
  'BldV',
  'Bld/Tiss',
  'PPP',
  'RBC',
  'RBC.lysate',
  'Urine',
  'Urine sed',
  '^Patient',
  'Abdomen.mid',
  'Thigh',
  'Triceps',
  'Waist',
]);

/** Biomarcadores de urina cujo código não termina em `_Urine`. */
const URINE_WITHOUT_SUFFIX = new Set(['Albumin_Creatinine_Ratio']);

const coded = BIOMARKER_DEFINITIONS.filter(
  (b): b is typeof b & { loinc: string } => typeof b.loinc === 'string',
);

const entryOf = (loinc: string): SnapshotEntry => {
  const entry = snapshot.codes[loinc];
  if (!entry) throw new Error(`${loinc} não está no snapshot`);
  return entry;
};

describe('snapshot cobre o catálogo', () => {
  it('todo código canônico do catálogo tem entrada no snapshot', () => {
    const faltando = coded
      .filter((b) => !snapshot.codes[b.loinc])
      .map((b) => `${b.code} ${b.loinc}`);
    expect(faltando).toEqual([]);
  });

  it('toda entrada do snapshot traz os quatro eixos', () => {
    const semEixo = Object.entries(snapshot.codes)
      .filter(([, e]) => !e.property || !e.system || !e.scale)
      .map(([c]) => c);
    expect(semEixo).toEqual([]);
  });

  it('nenhum código está DEPRECATED ou DISCOURAGED', () => {
    const proibidos = coded
      .map((b) => [b.code, entryOf(b.loinc).status] as const)
      .filter(([, s]) => s === 'DEPRECATED' || s === 'DISCOURAGED');
    expect(proibidos).toEqual([]);
  });

  it('toda exceção listada ainda existe no catálogo', () => {
    const codes = new Set(coded.map((b) => b.code));
    for (const code of Object.keys(KNOWN_AXIS_MISMATCHES)) expect(codes.has(code), code).toBe(true);
  });
});

describe('propriedade do LOINC combina com a unidade declarada', () => {
  for (const b of coded) {
    if (!b.unit) continue;
    const unit = b.unit;
    it(`${b.code} (${b.loinc}) em ${unit}`, () => {
      const { property } = entryOf(b.loinc);
      const allowed = PROPERTIES_BY_UNIT[unit];
      expect(allowed, `unidade ${unit} sem classe em PROPERTIES_BY_UNIT`).toBeDefined();
      const ok = allowed?.includes(property ?? '') ?? false;
      if (b.code in KNOWN_AXIS_MISMATCHES) {
        expect(ok, `${b.code} já combina; tire da lista de exceções`).toBe(false);
        return;
      }
      expect(ok, `${property} não serve para ${unit}`).toBe(true);
    });
  }
});

describe('sistema do LOINC cabe no catálogo', () => {
  for (const b of coded) {
    it(`${b.code} (${b.loinc})`, () => {
      const { system } = entryOf(b.loinc);
      expect(system && ALLOWED_SYSTEMS.has(system), `sistema ${system}`).toBe(true);
      const isUrineCode = b.code.includes('_Urine') || URINE_WITHOUT_SUFFIX.has(b.code);
      expect(system?.startsWith('Urine') ?? false, `${b.code} em ${system}`).toBe(isUrineCode);
    });
  }
});

describe('escala de quem tem unidade é quantitativa', () => {
  for (const b of coded) {
    if (!b.unit) continue;
    it(`${b.code} (${b.loinc})`, () => {
      const { scale } = entryOf(b.loinc);
      const ok = scale === 'Qn' || scale === 'SemiQn';
      if (b.code in KNOWN_AXIS_MISMATCHES) return;
      expect(ok, `escala ${scale}`).toBe(true);
    });
  }
});

describe('toda unidade declarada resolve em UCUM', () => {
  const units = [...new Set(BIOMARKER_DEFINITIONS.map((b) => b.unit).filter(Boolean))] as string[];
  for (const unit of units) {
    it(unit, () => {
      const ucum = resolveUcum(unit);
      expect(ucum, `${unit} não tem entrada em UNIT_TO_UCUM`).toBeDefined();
      expect(isUcumCode(ucum as string), `${ucum} não é UCUM`).toBe(true);
    });
  }

  it('canonicalUcum e siUcum de BIOMARKER_UNITS são UCUM', () => {
    const ruins = Object.entries(BIOMARKER_UNITS)
      .flatMap(([code, c]) => [
        [code, c.canonicalUcum],
        [code, c.siUcum],
      ])
      .filter(([, u]) => !isUcumCode(u as string));
    expect(ruins).toEqual([]);
  });
});

// O código e a unidade do D-dímero concordavam entre si, e nenhum teste de eixo
// pegava o erro: ele estava entre o código (DDU) e a fonte da faixa (FEU), que
// diferem por um fator de 2. Faixa numa convenção pede código na mesma.
describe('a convenção da faixa e a do código', () => {
  const declaradas = Object.entries(biomarkerRangeDefinitions).filter(
    (entry): entry is [string, (typeof entry)[1] & { loinc: string }] => !!entry[1].loinc,
  );

  it('toda faixa que declara o código vale para o código do catálogo', () => {
    // Sem declaração nenhuma, o teste passaria no vazio.
    expect(declaradas.length).toBeGreaterThan(0);
    const malformados = declaradas.filter(([, def]) => !isValidLoinc(def.loinc));
    expect(malformados.map(([code, def]) => `${code}: ${def.loinc}`)).toEqual([]);
    const fora = declaradas
      .filter(([code, def]) => codeToLoinc(code) !== def.loinc)
      .map(([code, def]) => `${code}: faixa de ${def.loinc}, catálogo em ${codeToLoinc(code)}`);
    expect(fora).toEqual([]);
  });

  it('D-dímero: a faixa é FEU, e o código também', () => {
    const ddimer = coded.find((b) => b.code === 'DDimer');
    expect(ddimer).toBeDefined();
    expect(entryOf(ddimer!.loinc).method).toBe('FEU');
  });
});
