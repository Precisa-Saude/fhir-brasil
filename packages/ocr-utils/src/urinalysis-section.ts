import type { BiomarkerSearchPattern } from '@precisa-saude/fhir';

/**
 * Contexto de seção da urinálise.
 *
 * O exame de urina imprime o analito pelo nome nu: "GLUCOSE", "PH", "WBC",
 * "RBC", "PROTEIN". Fora de contexto esses nomes são do sangue (a glicose do
 * soro, o leucograma, o eritrograma), e o catálogo os guarda assim, então a
 * linha "GLUCOSE NEGATIVE" de um painel de urina ancorava a glicose do soro, e
 * a glicose da urina que o modelo devolvia era recusada como não ancorada.
 * Trocar o sentido do nome no catálogo quebraria o soro. O que decide é a
 * seção: debaixo do cabeçalho da urinálise, o nome nu é da urina.
 *
 * Separado do `anchor.ts` pelo mesmo motivo do `body-region.ts`: manter o
 * arquivo do algoritmo legível. O `anchor.ts` injeta o casamento de nomes e a
 * resolução de sobreposição (`SectionDeps`); aqui ficam o vocabulário, a
 * máquina de estados que delimita a seção e a troca dos candidatos.
 */

/**
 * Cabeçalhos que abrem uma seção de urinálise, normalizados (sem acento,
 * minúsculos). Só grafias que o repositório já mostra: "URINALYSIS" é o nome
 * do painel no laudo da Quest; "Urina tipo I" está nos testes de material do
 * `core`; "Rotina de urina" e "EAS" estão no ValueSet TUSS do IG
 * (`BRTUSSProcedimentosLabVS.fsh`); "Urinálise" é o nome do grupo no mesmo
 * ValueSet. O cabeçalho precisa abrir a linha, e o resto da linha é
 * qualificador ("URINALYSIS, COMPLETE W/REFLEX TO CULTURE").
 */
const HEADER_NAMES = String.raw`(?:urinalysis|urinalise|urina tipo i|rotina de urina|eas)(?![\p{L}\p{N}])`;
const URINALYSIS_HEADER = new RegExp(`^${HEADER_NAMES}`, 'u');
const ANY_HEADER = new RegExp(String.raw`(?:^|\n)[^\S\n]*` + HEADER_NAMES, 'u');

/** Atalho barato: sem cabeçalho de urinálise no texto, não há seção. */
export function mentionsUrinalysisHeader(normalizedText: string): boolean {
  return ANY_HEADER.test(normalizedText);
}

/**
 * Nomes nus que, dentro da seção, são o analito da urina. Normalizados; o
 * plural impresso ("Cetonas", "Bactérias") vem do `s?` do casamento.
 *
 * As grafias em português são os mesmos analitos nos laudos brasileiros
 * ("Glicose", "Leucócitos", "Hemácias"), que o catálogo também guarda como
 * nomes do sangue. Os que já são nomes da urina no catálogo (`Color`,
 * `Ketones`, …) entram para ancorar mesmo sem valor na linha, que é o caso do
 * texto em colunas, em que o nome e o resultado não dividem a linha.
 */
export const URINALYSIS_SECTION_NAMES: ReadonlyMap<string, string> = new Map([
  ['bacteria', 'Bacteria_Urine'],
  ['bacterias', 'Bacteria_Urine'],
  ['bilirrubina', 'Bilirubin_Urine'],
  ['bilirubin', 'Bilirubin_Urine'],
  ['cetonas', 'Ketones_Urine'],
  ['color', 'Color_Urine'],
  ['cor', 'Color_Urine'],
  ['glicose', 'Glucose_Urine'],
  ['glucose', 'Glucose_Urine'],
  ['hemacias', 'RBC_Urine'],
  ['ketones', 'Ketones_Urine'],
  ['leucocitos', 'Leukocytes_Urine'],
  ['nitrite', 'Nitrite_Urine'],
  ['nitrito', 'Nitrite_Urine'],
  ['ph', 'pH_Urine'],
  ['protein', 'Protein_Urine'],
  ['proteina', 'Protein_Urine'],
  ['rbc', 'RBC_Urine'],
  ['wbc', 'Leukocytes_Urine'],
]);

/** O nome casado (talvez no plural) é um nome nu da seção? */
export function isSectionName(matched: string): boolean {
  return (
    URINALYSIS_SECTION_NAMES.has(matched) || URINALYSIS_SECTION_NAMES.has(matched.replace(/s$/, ''))
  );
}

/** O que se sabe de cada linha do texto normalizado. */
export interface SectionLine {
  /**
   * A linha casa um exame que não é da urina nem nome nu da seção
   * ("CREATININE", "WHITE BLOOD CELL COUNT"): é outro painel.
   */
  foreign: boolean;
  hasValue: boolean;
  /** A linha casa algum nome do catálogo ou algum nome nu da seção. */
  known: boolean;
  text: string;
  /**
   * A linha só pode ser da urina: casa um código da categoria urina ("OCCULT
   * BLOOD", "COLOR"), fala de urina, ou traz a unidade de campo do sedimento
   * (/HPF, /LPF).
   */
  urine: boolean;
}

const MENTIONS_URINE = /(?<![\p{L}\p{N}])urin[ae](?![\p{L}\p{N}])/u;
const SEDIMENT_FIELD_UNIT = /\/(?:hpf|lpf)(?![\p{L}\p{N}])/u;

/** Indício de urina que não depende de casar nome: a palavra, ou a unidade de campo. */
export function hasUrineCue(line: string): boolean {
  return MENTIONS_URINE.test(line) || SEDIMENT_FIELD_UNIT.test(line);
}

type LineKind = 'blank' | 'foreign' | 'header' | 'neutral' | 'unknown' | 'urine';

function kindOf(line: SectionLine): LineKind {
  const text = line.text.trim();
  if (!text) return 'blank';
  if (URINALYSIS_HEADER.test(text) && !/\d/.test(text)) return 'header';
  if (line.foreign) return 'foreign';
  if (line.urine) return 'urine';
  return line.known || line.hasValue ? 'neutral' : 'unknown';
}

/**
 * Índices das linhas que estão dentro de uma seção de urinálise. A linha do
 * cabeçalho não entra.
 *
 * A seção começa no cabeçalho. Laudo não marca o fim de seção, então o fim é
 * inferido, e o erro é empurrado para o lado barato: na dúvida a seção acaba,
 * e o nome nu volta ao sentido do sangue, que é o comportamento de antes desta
 * regra. Acaba em:
 *
 * - uma linha com exame de outro painel (`foreign`);
 * - o cabeçalho de outro painel;
 * - o fim do texto.
 *
 * O difícil é o segundo item. Pela forma, o cabeçalho de outro painel
 * ("COMPREHENSIVE METABOLIC PANEL", "Bioquímica") e uma linha do sedimento
 * que o catálogo não tem ("MUCUS", sozinho no texto em colunas) são a mesma
 * coisa: uma linha sem valor e sem nome conhecido. Quem separa os dois é o que
 * vem depois. Se a próxima linha decisiva é da urina, a linha era do
 * sedimento e a seção segue; se é exame de outro painel, era cabeçalho, e a
 * seção acaba nela, antes da "GLUCOSE" do painel seguinte. Linha decisiva é a
 * que casa exame de outro painel, a que só pode ser da urina (`urine`) ou um
 * novo cabeçalho de urinálise. Nomes nus da seção ("GLUCOSE", "WBC"), linhas
 * só com valor e outras linhas desconhecidas não decidem, e se o texto acaba
 * sem nada decisivo a seção acaba na linha desconhecida.
 *
 * Linha em branco não encerra nem conta.
 */
export function urinalysisLineIndexes(lines: readonly SectionLine[]): Set<number> {
  const kinds = lines.map(kindOf);
  const continuesAsUrine = (from: number): boolean => {
    const next = kinds.findIndex(
      (kind, index) =>
        index > from && (kind === 'urine' || kind === 'foreign' || kind === 'header'),
    );
    return next !== -1 && kinds[next] === 'urine';
  };
  const inside = new Set<number>();
  let open = false;
  kinds.forEach((kind, index) => {
    if (kind === 'header') {
      open = true;
      return;
    }
    if (!open || kind === 'blank') {
      return;
    }
    if (kind === 'foreign' || (kind === 'unknown' && !continuesAsUrine(index))) {
      open = false;
      return;
    }
    inside.add(index);
  });
  return inside;
}

/** A entrada de um nome casado, com a mesma forma da `PatternEntry` do `anchor.ts`. */
export interface SectionEntry {
  ambiguous: boolean;
  code: string;
  loinc?: string;
  original: string;
}

/** Um casamento de nome: o trecho no texto normalizado e as entradas dele. */
export interface SectionCandidate {
  end: number;
  entries: SectionEntry[];
  start: number;
}

interface SectionPattern {
  entry: SectionEntry;
  name: string;
  regex: RegExp;
}

/**
 * O que a regra precisa do `anchor.ts`, injetado para este arquivo não
 * depender do algoritmo de casamento (e o `anchor.ts` não crescer).
 */
export interface SectionDeps {
  hasValue: (line: string) => boolean;
  patterns: SectionPattern[];
  resolve: (candidates: SectionCandidate[]) => SectionCandidate[];
  urineCodes: ReadonlySet<string>;
}

/** Monta as dependências a partir do catálogo: os códigos da urina saem da categoria. */
export function sectionDepsFrom(
  catalog: readonly BiomarkerSearchPattern[],
  buildPattern: (normalizedName: string) => RegExp,
  hasValue: SectionDeps['hasValue'],
  resolve: SectionDeps['resolve'],
): SectionDeps {
  const loincByCode = new Map(catalog.map((p) => [p.code, p.loinc]));
  const isUrine = (p: BiomarkerSearchPattern) =>
    (Array.isArray(p.category) ? p.category : [p.category]).includes('urina');
  return {
    hasValue,
    patterns: [...URINALYSIS_SECTION_NAMES].map(([name, code]) => {
      const loinc = loincByCode.get(code);
      const entry = { ambiguous: false, code, ...(loinc && { loinc }), original: name };
      return { entry, name, regex: buildPattern(name) };
    }),
    resolve,
    urineCodes: new Set(catalog.filter(isUrine).map((p) => p.code)),
  };
}

function* matchesIn(text: string, name: string, regex: RegExp): Generator<RegExpExecArray> {
  if (!text.includes(name)) return;
  regex.lastIndex = 0;
  for (let match = regex.exec(text); match !== null; match = regex.exec(text)) {
    yield match;
  }
}

/**
 * Resolve os candidatos, aplicando a regra de seção quando há cabeçalho de
 * urinálise no texto.
 *
 * O candidato da seção entra no lugar do candidato comum de mesmo trecho, e
 * não ao lado dele: "GLUCOSE" na urinálise ancora `Glucose_Urine`, e a glicose
 * do soro não ancora pela mesma linha. Um nome mais longo continua ganhando
 * ("URINE GLUCOSE", "OCCULT BLOOD"), porque o resultado passa de novo pelo
 * `resolve`. Sem cabeçalho, é só o `resolve`, e nada muda.
 */
export function applyUrinalysisSection(
  normalizedText: string,
  candidates: SectionCandidate[],
  deps: SectionDeps,
): SectionCandidate[] {
  const resolved = deps.resolve(candidates);
  if (!mentionsUrinalysisHeader(normalizedText)) {
    return resolved;
  }
  const lineStarts = [0];
  for (let i = normalizedText.indexOf('\n'); i !== -1; i = normalizedText.indexOf('\n', i + 1)) {
    lineStarts.push(i + 1);
  }
  const lines: SectionLine[] = lineStarts.map((start, index) => {
    const end = index + 1 < lineStarts.length ? lineStarts[index + 1]! - 1 : normalizedText.length;
    const text = normalizedText.slice(start, end);
    const known = deps.patterns.some(
      ({ name, regex }) => !matchesIn(text, name, regex).next().done,
    );
    return { foreign: false, hasValue: deps.hasValue(text), known, text, urine: hasUrineCue(text) };
  });
  for (const candidate of resolved) {
    let index = lineStarts.length - 1;
    while (lineStarts[index]! > candidate.start) index -= 1;
    const line = lines[index]!;
    line.known = true;
    const matched = normalizedText.slice(candidate.start, candidate.end);
    if (candidate.entries.some((e) => deps.urineCodes.has(e.code))) {
      line.urine = true;
    } else if (!isSectionName(matched)) {
      line.foreign = true;
    }
  }
  const inside = urinalysisLineIndexes(lines);
  if (!inside.size) {
    return resolved;
  }

  const sectionCandidates: SectionCandidate[] = [];
  for (const index of inside) {
    const start = lineStarts[index]!;
    for (const { entry, name, regex } of deps.patterns) {
      for (const match of matchesIn(lines[index]!.text, name, regex)) {
        const at = start + match.index;
        sectionCandidates.push({ end: at + match[0].length, entries: [entry], start: at });
      }
    }
  }
  const replaced = (c: SectionCandidate) =>
    sectionCandidates.some((s) => s.start === c.start && s.end === c.end);
  return deps.resolve([...candidates.filter((c) => !replaced(c)), ...sectionCandidates]);
}
