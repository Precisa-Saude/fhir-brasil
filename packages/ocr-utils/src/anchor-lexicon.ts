/**
 * Vocabulário do pré-scan de âncoras: listas de termos que decidem se um nome
 * curto ou genérico pode ancorar sozinho. Separado do `anchor.ts` só para
 * manter o arquivo do algoritmo legível.
 */

/** Siglas curtas liberadas do corte de tamanho mínimo do `getNamePatterns`. */
export const UNAMBIGUOUS_SHORT_NAMES = new Set([
  'hdl',
  'ldl',
  'lh',
  'tsh',
  'crp',
  'pcr',
  'ggt',
  'alt',
  'ast',
  'bun',
  // Creatina quinase: Fleury e a Quest imprimem só "CK", e sem a sigla o
  // modelo ficava sem âncora e encaixava o valor em outro exame (PRE-486).
  'ck',
  'wbc',
  'rbc',
  'mcv',
  'mch',
  'rdw',
  'mpv',
  'psa',
  'fsh',
  'hba1c',
  'egfr',
  'acr',
  'esr',
  'vhs',
  'bmc',
  'bmd',
  'vat',
  'dxa',
  'dmo',
  'cmo',
  'ffm',
  'lbm',
  'mlg',
  'tav',
]);

/**
 * Single-word catalog names that are ordinary words in EN/PT, so seeing them
 * proves nothing on its own. They only anchor when the line also carries a
 * value. Qualitative urine markers (`Color`, `Protein`, `Blood`, …) are
 * detected automatically — see `isQualitativeUrine` — and don't belong here.
 */
export const CONTEXT_REQUIRED_NAMES = new Set([
  'bacteria', // Bacteria_Urine — tem unidade, escapa da regra automática
  'bacterias', // Bacteria_Urine
  'lead', // Lead — verbo/substantivo comuníssimo em inglês
  'peso', // TotalMass
  'saturation', // TransferrinSaturation — "oxygen saturation", "saturation index"
  'tap', // ProthrombinTime — "tap" em inglês
  'volume', // VATVolume
  'weight', // TotalMass
  // Sítios de dobra pelo nome nu. São partes do corpo antes de serem medidas,
  // e aparecem em prosa: num laudo de DEXA real, "hips and thighs" e
  // "abdominal region" ancoravam dobra cutânea que o documento não tem.
  // Exigir valor na linha separa a tabela do parágrafo.
  'abdominal',
  'chest',
  'coxa',
  'peitoral',
  'subescapular',
  'subscapular',
  'suprailiac',
  'thigh',
  'triceps',
  'tricipital',
]);

/**
 * Qualitative results expected next to a non-numeric biomarker
 * (urine dipstick, sediment, appearance). Normalized, single tokens —
 * "não reagente" is covered by `reagente`, "não detectado" by `detectado`.
 */
export const QUALITATIVE_VALUE_TERMS = new Set([
  'absent',
  'alguns',
  'amarela',
  'amarelo',
  'anormal',
  'ausencia',
  'ausente',
  'ausentes',
  'citrino',
  'claro',
  'clear',
  'cloudy',
  'colorless',
  'detectado',
  'detected',
  'escuro',
  'incolor',
  'indetectavel',
  'limpido',
  'moderada',
  'moderado',
  'negativa',
  'negative',
  'negativo',
  'normais',
  'normal',
  'numerosos',
  'ocasional',
  'positiva',
  'positive',
  'positivo',
  'present',
  'presente',
  'presentes',
  'raras',
  'raro',
  'raros',
  'reagente',
  'trace',
  'traces',
  'tracos',
  'turvo',
  'undetectable',
  'yellow',
]);

/**
 * Signals that a line comes from a genetic/molecular report rather than from a
 * panel of measured values. Gene symbols collide with biomarker names (`APOB`
 * the gene vs. `ApoB` the lipoprotein), so the context — not a static HGNC
 * blocklist — is what tells them apart. Blocking the token itself would break
 * real lipid panels.
 */
export const GENETIC_CONTEXT_PATTERNS: RegExp[] = [
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
 * Subtipo que vem logo depois do nome e muda o exame. "CK" sozinho é a
 * creatina quinase total, e "CK-MB" é a fração MB, que o catálogo não tem: sem
 * esta trava, a sigla curta ancorava `CK` dentro de "CK-MB" (PRE-486).
 */
export const SUBTYPE_AFTER: Record<string, RegExp> = {
  CK: /^[\s-]*mb\b/i,
};
