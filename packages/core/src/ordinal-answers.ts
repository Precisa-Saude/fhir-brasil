/**
 * Respostas codificadas para resultados ordinais e nominais.
 *
 * Um laudo imprime "Negativo", "Neg.", "-", "Traços" ou "++" para o mesmo tipo
 * de resultado, e quem consome um `valueString` precisa reconhecer cada grafia
 * para comparar dois exames. Com a resposta codificada em
 * `valueCodeableConcept`, a comparação é pelo código, e o texto impresso segue
 * em `valueCodeableConcept.text`.
 *
 * **Dois sistemas no mesmo valor.** Cada resposta sai com dois codings, a
 * resposta LOINC (`LA…`) e o qualificador SNOMED CT equivalente, e quem
 * consome lê o sistema que já usa. O LOINC vem primeiro porque é o sistema dos
 * códigos de exame deste pacote e circula sob a mesma licença que ele já
 * cumpre.
 *
 * **Licença do SNOMED CT.** O Brasil é membro da SNOMED International desde
 * abril de 2018, e a SNOMED não cobra pelo uso em país membro, mas pede que o
 * uso seja registrado no centro nacional de distribuição. Fora dos países
 * membros, usar SNOMED CT depende de licença de afiliado. O pacote só publica
 * o identificador e o termo preferido de 12 conceitos; o que o consumidor faz
 * com eles fica sob a licença dele.
 *
 * Todo código e todo display abaixo foram conferidos em
 * `https://tx.fhir.org/r4/CodeSystem/$lookup`: LOINC 2.82 e SNOMED CT
 * International Edition 20250201, todos ativos. Negativo, Traços e as
 * gradações da fita, no LOINC, vêm da answer list LL733-7, a do 2514-8 (corpos
 * cetônicos na urina por fita).
 */

import { LOINC_SYSTEM } from './code-systems';
import type { FHIRCodeableConcept, FHIRCoding } from './fhir-types';

/** O system do SNOMED CT nos recursos FHIR. */
export const SNOMED_SYSTEM = 'http://snomed.info/sct';

/** Um código e o nome oficial dele no sistema, que vai no `display`. */
export interface AnswerCode {
  code: string;
  display: string;
}

/** A mesma resposta nos dois sistemas. */
export interface OrdinalAnswer {
  loinc: AnswerCode;
  snomed: AnswerCode;
}

/**
 * As respostas que o conversor emite. O display é o nome oficial em inglês de
 * cada sistema; o texto do laudo vai em `text`.
 */
export const ORDINAL_ANSWERS = {
  absent: {
    loinc: { code: 'LA9634-2', display: 'Absent' },
    snomed: { code: '2667000', display: 'Absent' },
  },
  negative: {
    loinc: { code: 'LA6577-6', display: 'Negative' },
    snomed: { code: '260385009', display: 'Negative' },
  },
  nonreactive: {
    loinc: { code: 'LA15256-3', display: 'Nonreactive' },
    snomed: { code: '131194007', display: 'Non-Reactive' },
  },
  normal: {
    loinc: { code: 'LA6626-1', display: 'Normal' },
    snomed: { code: '17621005', display: 'Normal' },
  },
  plus1: {
    loinc: { code: 'LA11841-6', display: '1+' },
    snomed: { code: '260347006', display: '+' },
  },
  plus2: {
    loinc: { code: 'LA11842-4', display: '2+' },
    snomed: { code: '260348001', display: '++' },
  },
  plus3: {
    loinc: { code: 'LA11843-2', display: '3+' },
    snomed: { code: '260349009', display: '+++' },
  },
  plus4: {
    loinc: { code: 'LA11844-0', display: '4+' },
    snomed: { code: '260350009', display: '++++' },
  },
  positive: {
    loinc: { code: 'LA6576-8', display: 'Positive' },
    snomed: { code: '10828004', display: 'Positive' },
  },
  present: {
    loinc: { code: 'LA9633-4', display: 'Present' },
    snomed: { code: '52101004', display: 'Present' },
  },
  reactive: {
    loinc: { code: 'LA15255-5', display: 'Reactive' },
    snomed: { code: '11214006', display: 'Reactive' },
  },
  trace: {
    loinc: { code: 'LA11832-5', display: 'Trace' },
    snomed: { code: '260405006', display: 'Trace' },
  },
} as const satisfies Record<string, OrdinalAnswer>;

type AnswerKey = keyof typeof ORDINAL_ANSWERS;

/**
 * Grafias impressas, já normalizadas por `normalizePrinted`, para a resposta.
 *
 * "Não reagente" vai para Nonreactive e não para Negative: são respostas
 * distintas nos dois sistemas, e o laudo de sorologia escolheu uma delas. O
 * mesmo vale para "Ausente", que é Absent e não Negative.
 *
 * Um "+" sozinho é a primeira gradação da fita, 1+. Grafia que não está aqui
 * não ganha código: o resultado sai em `valueString`, como antes.
 */
const PRINTED_FORMS: Record<string, AnswerKey> = {
  '-': 'negative',
  '(-)': 'negative',
  '(+)': 'plus1',
  '(++)': 'plus2',
  '(+++)': 'plus3',
  '(++++)': 'plus4',
  '+': 'plus1',
  '++': 'plus2',
  '+++': 'plus3',
  '++++': 'plus4',
  '1+': 'plus1',
  '2+': 'plus2',
  '3+': 'plus3',
  '4+': 'plus4',
  ausente: 'absent',
  ausentes: 'absent',
  'nao reagente': 'nonreactive',
  neg: 'negative',
  negativo: 'negative',
  normal: 'normal',
  pos: 'positive',
  positivo: 'positive',
  presente: 'present',
  presentes: 'present',
  reagente: 'reactive',
  traco: 'trace',
  tracos: 'trace',
};

/**
 * Caixa, acentos, espaços repetidos e ponto final não mudam a resposta:
 * "Não Reagente", "nao reagente" e "Neg." são a mesma coisa que o laudo quis
 * dizer.
 */
function normalizePrinted(printed: string): string {
  return printed
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '');
}

/** Os dois codings da resposta, LOINC primeiro. */
function codingsOf(answer: OrdinalAnswer): FHIRCoding[] {
  return [
    { ...answer.loinc, system: LOINC_SYSTEM },
    { ...answer.snomed, system: SNOMED_SYSTEM },
  ];
}

/** A resposta da grafia impressa, ou `undefined` se a grafia não é conhecida. */
export function ordinalAnswerFor(printed: string): OrdinalAnswer | undefined {
  const key = PRINTED_FORMS[normalizePrinted(printed)];
  return key && ORDINAL_ANSWERS[key];
}

/**
 * A resposta de um código LOINC (`LA…`) ou SNOMED CT, só se ele for um dos
 * que conferimos. Código desconhecido devolve `undefined`: publicar um código
 * que ninguém conferiu seria afirmar o que não sabemos.
 *
 * É também a tradução entre os dois sistemas: um Bundle que só traz o SNOMED
 * volta a sair com o LOINC ao lado.
 */
export function ordinalAnswerByCode(code: string, system: string): OrdinalAnswer | undefined {
  const field = system === LOINC_SYSTEM ? 'loinc' : system === SNOMED_SYSTEM ? 'snomed' : undefined;
  if (!field) return undefined;
  return Object.values(ORDINAL_ANSWERS).find((a) => a[field].code === code);
}

/**
 * O `valueCodeableConcept` de um resultado em texto, ou `undefined` quando
 * não há código para ele.
 *
 * `answerCode` é o código LOINC de resposta vindo de um Bundle importado e tem
 * precedência sobre a grafia: um arquivo de terceiro com "Neg (fita)" e
 * `LA6577-6` deve sair com o mesmo código, mesmo que a grafia não esteja na
 * tabela.
 */
export function ordinalValueFor(
  printed: string,
  answerCode?: string,
): FHIRCodeableConcept | undefined {
  const answer =
    (answerCode && ordinalAnswerByCode(answerCode, LOINC_SYSTEM)) || ordinalAnswerFor(printed);
  return answer && { coding: codingsOf(answer), text: printed };
}
