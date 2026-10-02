/**
 * OCR Anchor — Biomarker text anchoring
 *
 * Scans OCR text for biomarker names BEFORE sending to LLM.
 * This prevents hallucination by constraining what biomarkers
 * the LLM is allowed to extract.
 *
 * Matching is deliberately conservative: a name only anchors when it appears
 * as a whole token, is not swallowed by a longer biomarker name, is not inside
 * a genetic report line, and — for generic single-word names — sits on a line
 * that actually carries a value.
 */

import {
  type BiomarkerSearchPattern,
  generateFilteredLLMReference,
  getAllSearchPatterns,
  UNIT_TO_UCUM,
} from '@precisa-saude/fhir';

import {
  CONTEXT_REQUIRED_NAMES,
  QUALITATIVE_VALUE_TERMS,
  UNAMBIGUOUS_SHORT_NAMES,
} from './anchor-lexicon';
import { followedByPercent, qualifiedByBodyRegion } from './body-region';

export interface AnchorMatch {
  code: string;
  confidence: number;
  loinc?: string;
  matchedName: string;
  position: number;
}

export interface AnchorResult {
  filteredReference: string;
  matches: AnchorMatch[];
  stats: {
    totalPatterns: number;
    matchedCount: number;
    scanTimeMs: number;
  };
}

/**
 * Confidence assigned to a specific biomarker name found on a line that also
 * carries a value (a number, a unit, or an expected qualitative term).
 */
export const CONFIDENCE_VALUE_ADJACENT = 1.0;

/**
 * Confidence assigned to a specific biomarker name with no value evidence
 * nearby — a section heading, or a mention in prose.
 */
export const CONFIDENCE_NAME_ONLY = 0.7;

/**
 * Confidence assigned to a generic/ambiguous name (`Color`, `Protein`,
 * `Blood`, …) that only anchored because a value was found next to it.
 */
export const CONFIDENCE_AMBIGUOUS = 0.4;

/** Cap on how many occurrences of the same name are inspected per document. */
const MAX_OCCURRENCES_PER_NAME = 5;

/**
 * Normalize text for comparison:
 * - Removes diacritics (ã→a, ç→c, é→e)
 * - Converts to lowercase
 * - Treats a hyphen that joins words as a space
 * - Collapses horizontal whitespace, but KEEPS line breaks — the line is the
 *   context window used to decide whether a match is a real biomarker mention
 *
 * O hífen entre palavras vira espaço porque o catálogo e o laboratório
 * discordam sobre ele o tempo todo: o catálogo escreve "Proteína C-Reativa" e
 * "High-Density Lipoprotein", e os laudos imprimem "Proteína C Reativa" e
 * "High Density Lipoprotein". Sem essa equivalência, 82 dos 159 nomes com
 * hífen deixam de ancorar na grafia que o documento usa.
 *
 * Não era teórico: um GGT de verdade foi descartado como alucinação em 27
 * laudos porque o documento escrevia "Gama glutamil transferase" e o catálogo
 * "Gama-Glutamil Transferase". Um caractere derrubava o valor antes de
 * qualquer validação.
 *
 * A troca exige **letra antes** do hífen, e por isso não toca em número:
 * o `-2.5` de um T-score e o `0-5` de uma faixa de urina seguem intactos.
 * Trocar sem essa guarda apagaria o sinal de um valor negativo, que é bem
 * pior que o problema original.
 *
 * O pré-filtro de substring do `collectCandidates` compara a chave com o texto
 * já normalizado, então a equivalência precisa nascer aqui: aplicada só na
 * regex, o `includes` descartaria o nome antes de ela rodar.
 *
 * A vírgula entre palavras é tratada à parte, em `foldCommas`.
 */
function normalizeBase(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/(?<=\p{L})-(?=[\p{L}\p{N}])/gu, ' ')
    .replace(/[^\S\n]+/g, ' ');
}

function normalize(text: string): string {
  return foldCommas(normalizeBase(text));
}

/** Nomes do catálogo já normalizados, indexados pela primeira palavra. */
let cachedNamesByHead: Map<string, string[]> | null = null;

function isIndexedName(normalized: string): boolean {
  return normalized.length >= 3 || UNAMBIGUOUS_SHORT_NAMES.has(normalized);
}

function getNamesByHead(): Map<string, string[]> {
  if (!cachedNamesByHead) {
    const map = new Map<string, string[]>();
    for (const pattern of getPatterns()) {
      for (const name of pattern.names) {
        const normalized = normalizeBase(name).trim();
        if (!normalized || !isIndexedName(normalized)) {
          continue;
        }
        const head = normalized.split(' ')[0]!;
        map.set(head, [...(map.get(head) ?? []), normalized]);
      }
    }
    cachedNamesByHead = map;
  }
  return cachedNamesByHead;
}

/** Algum nome do catálogo começa, como palavra inteira, no início de `text`? */
function startsWithCatalogName(text: string): boolean {
  const head = /^[\p{L}\p{N}]+/u.exec(text)?.[0];
  if (!head) {
    return false;
  }
  return (getNamesByHead().get(head) ?? []).some((name) => {
    if (!text.startsWith(name)) {
      return false;
    }
    const after = text.slice(name.length).replace(/^s/, '');
    return !/^[\p{L}\p{N}]/u.test(after);
  });
}

/**
 * A vírgula entre palavras vira espaço quando o que vem depois dela não é,
 * sozinho, um nome do catálogo.
 *
 * A Quest imprime o exame no formato "EXAME, QUALIFICADOR" ("PSA, FREE"), e o
 * catálogo nem sempre traz a grafia com vírgula. Sem a troca, "psa, free" não
 * casava "PSA Free" e o PSA total ancorava pelo "psa" solto.
 *
 * A guarda é a mesma da quebra de linha: numa lista "Colesterol, HDL, LDL",
 * cada item depois da vírgula é um exame próprio, e juntar daria "Colesterol
 * HDL" e perderia o colesterol total. Quando o catálogo precisa da vírgula
 * mesmo assim, ele lista a grafia com vírgula ("Magnesium, RBC"), e ela casa
 * literalmente, porque o nome do catálogo passa pela mesma regra.
 *
 * Só vale com letra dos dois lados, então a vírgula decimal ("0,4") fica
 * intacta.
 */
function foldCommas(text: string): string {
  return text.replace(/(?<=\p{L}),([^\S\n]*)(?=\p{L})/gu, (comma, space: string, offset: number) =>
    startsWithCatalogName(text.slice(offset + 1 + space.length)) ? comma : ' ',
  );
}

/**
 * Signals that a line comes from a genetic/molecular report rather than from a
 * panel of measured values. Gene symbols collide with biomarker names (`APOB`
 * the gene vs. `ApoB` the lipoprotein), so the context — not a static HGNC
 * blocklist — is what tells them apart. Blocking the token itself would break
 * real lipid panels.
 */
const GENETIC_CONTEXT_PATTERNS: RegExp[] = [
  /\b[nx][mrpc]_\d{6,}/, // RefSeq: NM_000384.2, NP_, NR_, XM_
  /\bens[gtp]\d{6,}/, // Ensembl: ENSG00000084674
  /\bp\.[a-z]{3}\d/, // HGVS proteína: p.Trp448*
  /\bc\.\d+[acgt]?[>_+-]/, // HGVS codificante: c.1234A>G, c.76_78del
  /\brs\d{4,}\b/, // dbSNP
  /\bgenes?\b/,
  /\bvariante?s?\b/,
  /\bexons?\b/,
  /\bzygosity\b/,
  /\bzigosidade\b/,
  /\balleles?\b/,
  /\balelos?\b/,
  /\bmutations?\b/,
  /\bmutac(ao|oes)\b/,
  /\bpathogenic/,
  /\bpatogenic/,
  /\bheterozyg/,
  /\bhomozyg/,
  /\bheterozigot/,
  /\bhomozigot/,
  /\bsequence change\b/,
];

/**
 * Sítios de dobra cutânea cujo nome nu também nomeia uma circunferência:
 * "Coxa" aparece tanto em "Dobra Cutânea Coxa" quanto em "Circunferência da
 * Coxa". O termo nu precisa existir como alias, porque há laudo que imprime
 * só o sítio na coluna, então a desambiguação tem que vir do contexto da
 * linha, como já se faz com laudo genético.
 */
const SKINFOLD_SITE_CODES = new Set([
  'SkinfoldAbdominal',
  'SkinfoldChest',
  'SkinfoldMidaxillary',
  'SkinfoldSubscapular',
  'SkinfoldSuprailiac',
  'SkinfoldThigh',
  'SkinfoldTriceps',
]);

/** Uma linha de circunferência ou perímetro não mede dobra. */
const GIRTH_CONTEXT_PATTERNS: RegExp[] = [
  /\bcircumference\b/,
  /\bcircunferencias?\b/,
  /\bperimetros?\b/,
  /\bgirth\b/,
];

/**
 * Só bloqueia quando a linha fala de circunferência e não fala de dobra:
 * "Dobra Cutânea Coxa" e "Thigh Skinfold" continuam ancorando normalmente,
 * e uma linha que traga as duas palavras é ambígua demais para descartar.
 */
const SKINFOLD_CONTEXT_PATTERNS: RegExp[] = [/\bdobras?\b/, /\bskin ?folds?\b/, /\bpregas?\b/];

/**
 * Medida em centímetros numa linha de sítio corporal.
 *
 * Dobra cutânea é em milímetros, sempre: um valor em cm no mesmo sítio é
 * circunferência. É o desambiguador mais forte que existe aqui, porque não
 * depende de a folha escrever a palavra "circunferência", e num laudo de
 * antropometria a coluna costuma trazer só o sítio e o número.
 *
 * Rejeita cm em vez de exigir mm: há folha que imprime a unidade no cabeçalho
 * da coluna e não em cada linha, e exigir mm perderia essas.
 */
const CENTIMETRE_VALUE = /\d\s*(?:,\d+\s*)?cm\b/;

function hasGirthContext(line: string): boolean {
  if (SKINFOLD_CONTEXT_PATTERNS.some((re) => re.test(line))) {
    return false;
  }
  return GIRTH_CONTEXT_PATTERNS.some((re) => re.test(line)) || CENTIMETRE_VALUE.test(line);
}

const DIGIT_PATTERN = /\d/;

/** Unit tokens reused from the core catalog instead of a parallel list. */
let cachedUnitTokens: Set<string> | null = null;

function getUnitTokens(): Set<string> {
  if (!cachedUnitTokens) {
    cachedUnitTokens = new Set(
      Object.keys(UNIT_TO_UCUM)
        .map((unit) => normalize(unit).trim())
        .filter(Boolean),
    );
  }
  return cachedUnitTokens;
}

interface PatternEntry {
  ambiguous: boolean;
  code: string;
  loinc?: string;
  original: string;
}

interface NamePattern {
  entries: PatternEntry[];
  /** Built on first use — most names never match a given document. */
  regex: RegExp | null;
}

interface Candidate {
  end: number;
  entries: PatternEntry[];
  start: number;
}

let cachedPatterns: BiomarkerSearchPattern[] | null = null;
let cachedNamePatterns: Map<string, NamePattern> | null = null;

function getPatterns(): BiomarkerSearchPattern[] {
  if (!cachedPatterns) {
    cachedPatterns = getAllSearchPatterns();
  }
  return cachedPatterns;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a whole-token matcher for a normalized name.
 *
 * Lookarounds instead of `\b` because names may start or end with a non-word
 * character (`Lp(a)`), where `\b` asserts the wrong thing.
 *
 * A multi-word name must sit on a single line: in the column layouts labs
 * print, consecutive lines are separate biomarkers, and allowing a line break
 * inside a name turns "Colesterol\nHDL" into the name "Colesterol HDL".
 * A wrapped name still anchors through its head token when that token is a
 * name of its own ("Colesterol\nTotal" → `Cholesterol`). A name whose head is
 * not a name of its own is recovered by `collectWrappedCandidates`.
 *
 * The trailing optional `s` keeps the plurals labs actually print
 * ("Proteínas", "Cetonas") anchored to the singular catalog name — without
 * letting `proteína` match inside `proteinúria`.
 */
function buildNamePattern(normalizedName: string): RegExp {
  const body = normalizedName.split(' ').map(escapeRegExp).join('[^\\S\\n]+');
  const plural = /\p{L}$/u.test(normalizedName) ? 's?' : '';
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}${plural}(?![\\p{L}\\p{N}])`, 'gu');
}

function isQualitativeUrine(pattern: BiomarkerSearchPattern): boolean {
  const categories = Array.isArray(pattern.category) ? pattern.category : [pattern.category];
  return categories.includes('urina') && !pattern.unit;
}

/**
 * A name is ambiguous when it is a single token that also reads as ordinary
 * text. Multi-word names (`Occult Blood`, `Urine Protein`) are specific enough
 * on their own.
 */
function isAmbiguousName(normalizedName: string, pattern: BiomarkerSearchPattern): boolean {
  if (normalizedName.includes(' ')) {
    return false;
  }
  return CONTEXT_REQUIRED_NAMES.has(normalizedName) || isQualitativeUrine(pattern);
}

function getNamePatterns(): Map<string, NamePattern> {
  if (!cachedNamePatterns) {
    const map = new Map<string, NamePattern>();
    for (const pattern of getPatterns()) {
      for (const name of pattern.names) {
        const normalized = normalize(name).trim();
        if (!normalized || !isIndexedName(normalized)) {
          continue;
        }
        let slot = map.get(normalized);
        if (!slot) {
          slot = { entries: [], regex: null };
          map.set(normalized, slot);
        }
        slot.entries.push({
          ambiguous: isAmbiguousName(normalized, pattern),
          code: pattern.code,
          ...(pattern.loinc && { loinc: pattern.loinc }),
          original: name,
        });
      }
    }
    cachedNamePatterns = map;
  }
  return cachedNamePatterns;
}

function getLineBounds(text: string, position: number): { end: number; start: number } {
  const start = text.lastIndexOf('\n', position) + 1;
  const nextBreak = text.indexOf('\n', position);
  return { end: nextBreak === -1 ? text.length : nextBreak, start };
}

function hasGeneticContext(line: string): boolean {
  return GENETIC_CONTEXT_PATTERNS.some((pattern) => pattern.test(line));
}

/**
 * Does this line carry something that looks like a measured result?
 * A digit, a known unit, or an expected qualitative term.
 */
function hasValueEvidence(line: string): boolean {
  if (DIGIT_PATTERN.test(line)) {
    return true;
  }
  const unitTokens = getUnitTokens();
  for (const token of line.split(/[^\p{L}\p{N}%/]+/u)) {
    if (token && (unitTokens.has(token) || QUALITATIVE_VALUE_TERMS.has(token))) {
      return true;
    }
  }
  return false;
}

/**
 * Cheap pre-filter before the (much costlier) boundary regex.
 *
 * Sound because `normalize` collapses horizontal whitespace to a single space
 * and a name never spans a line break: whenever the pattern can match, the
 * literal name is a substring of the text.
 */
function collectCandidates(normalizedText: string): Candidate[] {
  const candidates: Candidate[] = [];
  for (const [name, slot] of getNamePatterns()) {
    if (!normalizedText.includes(name)) {
      continue;
    }
    const { entries } = slot;
    const regex = (slot.regex ??= buildNamePattern(name));
    regex.lastIndex = 0;
    let occurrences = 0;
    let match = regex.exec(normalizedText);
    while (match !== null && occurrences < MAX_OCCURRENCES_PER_NAME) {
      candidates.push({ end: match.index + match[0].length, entries, start: match.index });
      occurrences += 1;
      match = regex.exec(normalizedText);
    }
  }
  return candidates;
}

/**
 * Junta cada quebra de linha, com o espaço em volta, num espaço só, e guarda
 * para cada caractere do texto juntado a posição dele no texto original.
 */
function joinLines(text: string): { joined: string; offsets: number[] } {
  const parts: string[] = [];
  const offsets: number[] = [];
  let cursor = 0;
  for (const lineBreak of text.matchAll(/[^\S\n]*\n[^\S\n]*/g)) {
    for (let i = cursor; i < lineBreak.index; i += 1) {
      offsets.push(i);
    }
    parts.push(text.slice(cursor, lineBreak.index), ' ');
    offsets.push(lineBreak.index + lineBreak[0].indexOf('\n'));
    cursor = lineBreak.index + lineBreak[0].length;
  }
  for (let i = cursor; i < text.length; i += 1) {
    offsets.push(i);
  }
  parts.push(text.slice(cursor));
  return { joined: parts.join(''), offsets };
}

/**
 * Nomes quebrados em duas linhas.
 *
 * A Quest imprime "TISSUE TRANSGLUTAMINASE" numa linha e "AB, IGA <1.0 U/mL"
 * na seguinte. Linha a linha, nenhum nome do tTG aparece inteiro, e o "IGA"
 * solto da segunda linha ancorava a IgA total. Aqui o texto é lido também com
 * cada linha emendada na seguinte, e o casamento que atravessa a quebra entra
 * como candidato normal: o `resolveOverlaps` faz o nome longo engolir o
 * "IGA" que está dentro dele.
 *
 * Emendar linhas é o que a regra de uma linha por nome evita, então só vale
 * com três guardas. O nome atravessa exatamente uma quebra. O pedaço antes da
 * quebra não é, sozinho, um nome do catálogo: "Colesterol\nHDL" são dois
 * exames na coluna, não "Colesterol HDL". E a primeira linha não traz valor,
 * porque uma linha com resultado já é uma linha completa.
 */
function collectWrappedCandidates(normalizedText: string): Candidate[] {
  if (!normalizedText.includes('\n')) {
    return [];
  }
  const { joined, offsets } = joinLines(normalizedText);
  const namePatterns = getNamePatterns();
  const candidates: Candidate[] = [];
  for (const [name, slot] of namePatterns) {
    if (!name.includes(' ') || !joined.includes(name)) {
      continue;
    }
    const regex = (slot.regex ??= buildNamePattern(name));
    regex.lastIndex = 0;
    let occurrences = 0;
    let match = regex.exec(joined);
    while (match !== null && occurrences < MAX_OCCURRENCES_PER_NAME) {
      const start = offsets[match.index]!;
      const end = offsets[match.index + match[0].length - 1]! + 1;
      const lineBreak = normalizedText.indexOf('\n', start);
      const nextBreak = normalizedText.indexOf('\n', lineBreak + 1);
      const wrapped = lineBreak !== -1 && lineBreak < end && (nextBreak === -1 || nextBreak >= end);
      if (
        wrapped &&
        !namePatterns.has(normalizedText.slice(start, lineBreak).trim()) &&
        !hasValueEvidence(
          normalizedText.slice(getLineBounds(normalizedText, start).start, lineBreak),
        )
      ) {
        candidates.push({ end, entries: slot.entries, start });
        occurrences += 1;
      }
      match = regex.exec(joined);
    }
  }
  return candidates;
}

/**
 * Longest match wins: drop a match fully contained in a longer one, so
 * `Cholesterol` doesn't anchor inside `HDL Cholesterol` and `Blood` doesn't
 * anchor inside `Blood Glucose`.
 *
 * Strictly longer, not longer-or-equal: containment plus equal length means an
 * identical span, which only happens when two distinct catalog names match the
 * same text (a singular and its plural form, say). Dropping one of those by
 * catalog order would silently lose a code, and losing an anchor is worse than
 * keeping both — `findBiomarkersInText` dedups per code anyway.
 */
function resolveOverlaps(candidates: Candidate[]): Candidate[] {
  const sorted = [...candidates].sort(
    (a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start,
  );
  const accepted: Candidate[] = [];
  for (const candidate of sorted) {
    const length = candidate.end - candidate.start;
    const swallowed = accepted.some(
      (other) =>
        other.start <= candidate.start &&
        candidate.end <= other.end &&
        other.end - other.start > length,
    );
    if (!swallowed) {
      accepted.push(candidate);
    }
  }
  return accepted;
}

interface LineContext {
  genetic: boolean;
  girth: boolean;
  hasValue: boolean;
}

/**
 * Find all biomarker names present in OCR text.
 *
 * Matching is whole-token, longest-match-wins, and context-aware: matches
 * inside genetic report lines are discarded, and generic names only anchor
 * when a value sits on the same line. Returns one match per biomarker code —
 * the highest-confidence occurrence.
 */
export function findBiomarkersInText(ocrText: string): AnchorResult {
  const startTime = Date.now();
  const normalizedText = normalize(ocrText);
  const bestByCode = new Map<string, AnchorMatch>();
  const contexts = new Map<string, LineContext>();
  const candidates = [
    ...collectCandidates(normalizedText),
    ...collectWrappedCandidates(normalizedText),
  ];

  for (const candidate of resolveOverlaps(candidates)) {
    // O contexto é a linha do nome, ou as duas linhas de um nome quebrado.
    const lineStart = getLineBounds(normalizedText, candidate.start).start;
    const lineEnd = getLineBounds(normalizedText, candidate.end - 1).end;
    const key = `${lineStart}:${lineEnd}`;
    let context = contexts.get(key);
    if (!context) {
      const line = normalizedText.slice(lineStart, lineEnd);
      context = {
        genetic: hasGeneticContext(line),
        girth: hasGirthContext(line),
        hasValue: hasValueEvidence(line),
      };
      contexts.set(key, context);
    }
    const { genetic, girth, hasValue } = context;
    if (genetic) {
      continue;
    }

    const before = normalizedText.slice(lineStart, candidate.start);
    const after = normalizedText.slice(candidate.end, lineEnd);
    for (const entry of candidate.entries) {
      if (entry.ambiguous && !hasValue) {
        continue;
      }

      if (qualifiedByBodyRegion(entry.code, before) || followedByPercent(entry.code, after)) {
        continue;
      }

      if (girth && SKINFOLD_SITE_CODES.has(entry.code)) {
        continue;
      }

      let confidence = CONFIDENCE_NAME_ONLY;
      if (entry.ambiguous) {
        confidence = CONFIDENCE_AMBIGUOUS;
      } else if (hasValue) {
        confidence = CONFIDENCE_VALUE_ADJACENT;
      }

      const existing = bestByCode.get(entry.code);
      const better =
        !existing ||
        confidence > existing.confidence ||
        (confidence === existing.confidence && candidate.start < existing.position);
      if (better) {
        bestByCode.set(entry.code, {
          code: entry.code,
          confidence,
          loinc: entry.loinc,
          matchedName: entry.original,
          position: candidate.start,
        });
      }
    }
  }

  const matches = Array.from(bestByCode.values()).sort((a, b) => a.position - b.position);
  const scanTimeMs = Date.now() - startTime;

  return {
    filteredReference: generateFilteredLLMReference(matches.map((m) => m.code)),
    matches,
    stats: {
      matchedCount: matches.length,
      scanTimeMs,
      totalPatterns: getPatterns().length,
    },
  };
}

/**
 * Get the list of matched biomarker codes from an anchor result.
 */
export function getMatchedCodes(result: AnchorResult): string[] {
  return result.matches.map((m) => m.code);
}
