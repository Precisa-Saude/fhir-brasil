/**
 * Material impresso contra o sistema LOINC do código.
 *
 * O laudo imprime o material de cada exame ("Material: Urina de 24 horas",
 * "Material: Soro"), e o código LOINC carrega o dele no eixo System. Quando os
 * dois discordam, o código está errado para aquele resultado: "Sódio" numa
 * seção de urina casa pelo nome com o sódio sérico, e sair com o código de soro
 * afirma uma grandeza que o laboratório não mediu.
 *
 * A comparação é por classe, sangue ou urina, e não por código de material. O
 * `specimenTypeCoding` não casa "Urina de 24 horas", de propósito, porque não
 * inventa sinônimo para codificar `Specimen.type`. Para barrar um código basta
 * saber que é urina, e a primeira palavra diz isso sem afirmar mais nada.
 *
 * Material que não começa por uma palavra conhecida, e sistema fora das duas
 * classes (antropometria, `Bld/Tiss`), não barram nada: sem classe dos dois
 * lados não há conflito a afirmar.
 */
import { getLoincEntry } from './loinc-axes';

export type SpecimenClass = 'blood' | 'urine';

/** Palavra inicial do material impresso, já sem acento e em minúsculas. */
const CLASSE_DO_MATERIAL: Record<string, SpecimenClass> = {
  plasma: 'blood',
  sangue: 'blood',
  soro: 'blood',
  urina: 'urine',
};

/** Sistemas do LOINC por classe. `Bld/Tiss` fica de fora: não é só sangue. */
const CLASSE_DO_SISTEMA: Record<string, SpecimenClass> = {
  Bld: 'blood',
  BldV: 'blood',
  Plas: 'blood',
  PPP: 'blood',
  RBC: 'blood',
  'RBC.lysate': 'blood',
  Ser: 'blood',
  'Ser/Plas': 'blood',
  'Ser/Plas/Bld': 'blood',
  Urine: 'urine',
  'Urine sed': 'urine',
};

const primeiraPalavra = (texto: string): string =>
  texto
    .replace(/\p{Cf}/gu, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .split(/[^a-z]+/)[0] ?? '';

/** Classe do material impresso, ou `undefined` quando a palavra inicial não diz. */
export function specimenClassOf(material: string): SpecimenClass | undefined {
  return CLASSE_DO_MATERIAL[primeiraPalavra(material)];
}

/** Classe do eixo System do código, ou `undefined` fora do snapshot ou das duas classes. */
export function loincSpecimenClass(loinc: string): SpecimenClass | undefined {
  const system = getLoincEntry(loinc)?.system;
  return system ? CLASSE_DO_SISTEMA[system] : undefined;
}

export interface SpecimenMismatch {
  /** Classe do eixo System do código. */
  code: SpecimenClass;
  loinc: string;
  /** Classe do material impresso. */
  material: SpecimenClass;
  reason: 'specimen-mismatch';
  system: string;
}

/**
 * O conflito entre o material impresso e o código, ou `null` sem conflito
 * afirmável. Quem chama decide o que fazer com o resultado, e a decisão que não
 * existe é trocar o código por um palpite: conflito é lacuna, e sai como tal.
 */
export function specimenMismatch(material: string, loinc: string): SpecimenMismatch | null {
  const doMaterial = specimenClassOf(material);
  const doCodigo = loincSpecimenClass(loinc);
  if (!doMaterial || !doCodigo || doMaterial === doCodigo) return null;
  return {
    code: doCodigo,
    loinc,
    material: doMaterial,
    reason: 'specimen-mismatch',
    system: getLoincEntry(loinc)?.system ?? '',
  };
}
