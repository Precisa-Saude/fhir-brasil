/**
 * O método impresso no laudo escolhe o código LOINC (PRE-465).
 *
 * Roda depois da ancoragem, sobre o melhor casamento de cada código. Só os
 * biomarcadores com `methodVariants` de pista declarada são examinados, e a
 * decisão é da varredura: o modelo não escolhe método.
 */
import { getDefinitionByCode } from '@precisa-saude/fhir';

import type { AnchorMatch } from './anchor';

/** Quantas linhas depois do exame a pista de método ainda pertence a ele. */
const METHOD_CUE_LINES_BELOW = 6;

/** `true` quando `cue` aparece em `text` por token inteiro, como os nomes. */
export type CueMatcher = (text: string, cue: string) => boolean;

interface Line {
  end: number;
  start: number;
}

/**
 * A variante por método que o texto afirma para um exame ancorado.
 *
 * Lê a linha do exame, a de cima e as seguintes até o próximo exame ancorado,
 * no máximo `METHOD_CUE_LINES_BELOW` linhas. As seguintes contam porque a pista
 * que existe em laudo real é rodapé: um laboratório imprime, abaixo do LDL, que
 * o valor foi calculado por Martin-Hopkins. Parar no próximo exame impede que o
 * método de um vire o do outro.
 *
 * Pistas de duas variantes no mesmo trecho deixam o exame sem método, porque
 * escolher uma seria chute.
 */
function findMethodVariant(
  code: string,
  position: number,
  lines: Line[],
  otherAnchorLines: Set<number>,
  normalizedText: string,
  matchesCue: CueMatcher,
): { cue: string; loinc: string } | undefined {
  const variants = getDefinitionByCode(code)?.methodVariants?.filter(
    (v) => v.cues.en.length > 0 || v.cues.pt.length > 0,
  );
  if (!variants || variants.length === 0) return undefined;

  const index = lines.findIndex((l) => l.start <= position && position <= l.end);
  if (index === -1) return undefined;
  const window: number[] = [];
  if (index > 0 && !otherAnchorLines.has(index - 1)) window.push(index - 1);
  window.push(index);
  for (let i = index + 1; i < lines.length && i <= index + METHOD_CUE_LINES_BELOW; i += 1) {
    if (otherAnchorLines.has(i)) break;
    window.push(i);
  }
  const text = window.map((i) => normalizedText.slice(lines[i]!.start, lines[i]!.end)).join('\n');

  const found = variants.flatMap((variant) => {
    const cue = [...variant.cues.pt, ...variant.cues.en].find((c) => matchesCue(text, c));
    return cue ? [{ cue, loinc: variant.loinc }] : [];
  });
  return found.length === 1 ? found[0] : undefined;
}

/** Registra os códigos que ancoraram na linha que começa em `lineStart`. */
export function recordAnchorLine(
  anchoredLineStarts: Map<number, Set<string>>,
  lineStart: number,
  entries: { code: string }[],
): void {
  const codes = anchoredLineStarts.get(lineStart) ?? new Set<string>();
  for (const entry of entries) codes.add(entry.code);
  anchoredLineStarts.set(lineStart, codes);
}

/**
 * Preenche `methodLoinc` e `methodCue` nos casamentos cujo texto afirma o método.
 *
 * `anchoredLineStarts` diz em que linha cada código ancorou, para a pista não
 * atravessar de um exame para o seguinte.
 */
export function attachMethodVariants(
  matches: Iterable<AnchorMatch>,
  normalizedText: string,
  anchoredLineStarts: Map<number, Set<string>>,
  matchesCue: CueMatcher,
): void {
  const lines: Line[] = [];
  for (let start = 0; start <= normalizedText.length; ) {
    const end = normalizedText.indexOf('\n', start);
    lines.push({ end: end === -1 ? normalizedText.length : end, start });
    if (end === -1) break;
    start = end + 1;
  }
  for (const match of matches) {
    const otherAnchorLines = new Set<number>();
    lines.forEach((line, i) => {
      const codes = anchoredLineStarts.get(line.start);
      if (codes && [...codes].some((c) => c !== match.code)) otherAnchorLines.add(i);
    });
    const variant = findMethodVariant(
      match.code,
      match.position,
      lines,
      otherAnchorLines,
      normalizedText,
      matchesCue,
    );
    if (variant) {
      match.methodLoinc = variant.loinc;
      match.methodCue = variant.cue;
    }
  }
}
