/* eslint-disable no-console, max-lines -- script de CLI: a saída é o produto; a tabela de unidades e o pipeline inteiro ficam num arquivo só, como os outros scripts */
/**
 * Experimento PRE-488: propor o código LOINC de um exame a partir do nome e da
 * unidade, do jeito que um codificador humano faz no SearchLOINC.
 *
 * Para cada biomarcador do catálogo que tem código, esconde o código e tenta
 * recuperá-lo em três passos:
 *
 *   1. Busca na LOINC Search API oficial (`loinc.regenstrief.org/searchapi`):
 *      nome em inglês com cláusulas de eixo (`system:"Ser/Plas" property:MCnc
 *      status:ACTIVE`), nome em inglês solto, nome em português
 *      (`language=11`), e, quando sobra pouco, busca por Part de componente.
 *   2. Filtro e ordenação determinísticos: status ACTIVE, sistema que a
 *      categoria implica, propriedade que a unidade implica, e a política de
 *      método de PRE-473 quando o laudo não imprime método: padrão da classe
 *      (hemograma: Automated count; urina: Test strip, sedimento:
 *      microscopia; coagulação: Coag; demais classes: conceito base). O
 *      `COMMON_TEST_RANK` só informa: a irmã mais usada ganha uma marca que
 *      vai ao prompt e ao registro, sem reordenar a lista.
 *   3. Escolha entre os 15 primeiros: uma regra (conceito base) e, se houver
 *      `OPENROUTER_API_KEY`, o modelo de decisão Jev 1.13 (System One), que
 *      devolve a alternativa e o vetor de probabilidades sem gerar texto.
 *
 * Mede quantas vezes o código do catálogo entra na lista (recall) e quantas
 * vezes cada escolhedor acerta. Os resultados de 08/10/2026 e a leitura deles
 * estão em `docs/development/experimento-loinc-drilldown.md`.
 *
 * Uso:
 *   node --env-file-if-exists=.env --experimental-strip-types scripts/loinc-drilldown.ts
 *   node ... scripts/loinc-drilldown.ts --sem-jev --limite 20 --saida /tmp/drilldown.json
 *   node ... scripts/loinc-drilldown.ts --apenas Platelets,Reticulocytes
 *   node ... scripts/loinc-drilldown.ts --testes-locais testes-locais.json --sem-jev
 *   node ... scripts/loinc-drilldown.ts --testes-locais testes-locais.json --com-aliases
 *
 * Com `--testes-locais`, a entrada é a saída agregada de
 * `audit-testes-locais.ts --json` da platform (PRE-486): um registro por teste
 * local por laboratório, com o nome impresso no laudo, a unidade, o espécime
 * quando o laudo imprime um, e o código guardado. Os registros são agrupados
 * por nome, unidade, espécime e código, e cada grupo vira um alvo cuja única
 * pista é o que o laboratório imprimiu, em português. Com `--com-aliases`, o
 * alvo recebe também os nomes em inglês do biomarcador âncora, como no caminho
 * de produção, onde a ancoragem acontece antes de qualquer código.
 *
 * Precisa de `LOINC_USER` e `LOINC_PASSWORD` (conta gratuita do LOINC). Sem
 * `OPENROUTER_API_KEY`, roda só a busca e a regra. Envia ao LOINC e ao
 * OpenRouter apenas nomes e unidades do catálogo ou do laudo; nenhum dado de
 * paciente (a auditoria já sai agregada por laboratório, sem pacientes).
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { BIOMARKER_DEFINITIONS } from '../packages/core/src/biomarkers.ts';

const args = process.argv.slice(2);
const flag = (name: string): boolean => args.includes(name);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const LOINC_USER = process.env.LOINC_USER;
const LOINC_PASSWORD = process.env.LOINC_PASSWORD;
const OPENROUTER_API_KEY = flag('--sem-jev') ? undefined : process.env.OPENROUTER_API_KEY;
if (!LOINC_USER || !LOINC_PASSWORD) {
  console.error('LOINC_USER e LOINC_PASSWORD ausentes no ambiente (conta gratuita em loinc.org).');
  process.exit(1);
}
const LIMITE = Number(opt('--limite') ?? Infinity);
const APENAS = opt('--apenas')
  ?.split(',')
  .map((c) => c.trim());
const SAIDA = opt('--saida') ?? 'loinc-drilldown.resultados.json';
const TESTES_LOCAIS = opt('--testes-locais');
const COM_ALIASES = flag('--com-aliases');
const CONCORRENCIA = Number(opt('--concorrencia') ?? 2);
/** Pares de rótulo de eixo pt-BR → en aprendidos em corridas anteriores; lido e regravado. */
const ROTULOS = opt('--rotulos');
/**
 * Saída de uma corrida anterior cujas listas de candidatos são reaproveitadas
 * no lugar da busca: isola a variância do escolhedor da variância da Search
 * API, cuja ordem no corte de linhas não é estável.
 */
const REPLAY = opt('--replay');
/** Quantas vezes perguntar ao Jev sobre a mesma lista (consistência da escolha). */
const REPETIR = Math.max(1, Number(opt('--repetir') ?? 1));

const SEARCH = 'https://loinc.regenstrief.org/searchapi/loincs';
const PARTS = 'https://loinc.regenstrief.org/searchapi/parts';
const AUTH = `Basic ${Buffer.from(`${LOINC_USER}:${LOINC_PASSWORD}`).toString('base64')}`;
const JEV_MODEL = 'typesafe/jev-1.13-20260917';
const PT_BR_LANGUAGE = 11;

interface Candidato {
  cls: string;
  code: string;
  display: string;
  lang: 'en' | 'pt';
  /** Irmã mais usada do grupo pelo COMMON_TEST_RANK; informativo (PRE-473). */
  maisComum?: string;
  method: string;
  /** Vem gravado numa corrida anterior (`--replay`), onde a classe não é salva. */
  padraoDaClasse?: boolean;
  property: string;
  propertyDesconhecida?: boolean;
  rank: number;
  status: string;
  system: string;
  systemDesconhecido?: boolean;
}

interface Ocorrencia {
  biomarcador: string;
  laboratorio: string;
  observacoes: number;
}

interface Alvo {
  category: string;
  code: string;
  en: string[];
  loinc: string;
  /** Método impresso no laudo ("Quimioluminescência"), quando há. */
  metodoImpresso?: string;
  /** Nome impresso no laudo, quando o alvo vem de `--testes-locais`. */
  nomeImpresso?: string;
  ocorrencias?: Ocorrencia[];
  pt: string[];
  unit: string | null;
}

/** Registro da auditoria `audit-testes-locais.ts --json` (platform, PRE-486). */
interface TesteLocal {
  biomarkerCode: string;
  laboratory: string;
  loincCode: string;
  method: string;
  observations: number;
  printedName: string;
  specimen: string;
  unit: string;
}

const uniq = <T>(a: (T | null | undefined)[]): T[] => [
  ...new Set(a.filter((x): x is T => Boolean(x))),
];

// Repete com espera exponencial (2 s, 4 s, 8 s, 16 s, 32 s) e respeita o
// `Retry-After` quando o servidor manda um. Erro 4xx que não é limite de taxa
// não é repetido: a falha é do pedido, não do servidor.
async function rfetch(url: string | URL, init: RequestInit, tentativas = 6): Promise<Response> {
  for (let i = 0; ; i++) {
    let espera = 2000 * 2 ** i;
    try {
      const r = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
      if (r.status < 500 && r.status !== 429) return r;
      const retryAfter = Number(r.headers.get('retry-after'));
      if (retryAfter > 0) espera = Math.max(espera, retryAfter * 1000);
      throw new Error(`http ${r.status}`);
    } catch (e) {
      if (i === tentativas - 1) throw e;
      await new Promise((res) => setTimeout(res, Math.min(espera, 60_000)));
    }
  }
}

// Uma consulta que falha mesmo depois das repetições (a Search API devolve
// 500 para alguns nomes com barra) não derruba o item: fica registrada em
// `passos` e as outras consultas seguem.
async function buscarOuVazio(
  query: string,
  passos: string[],
  language?: number,
  rows = 100,
): Promise<Candidato[]> {
  try {
    return await buscar(query, language, rows);
  } catch (e) {
    const motivo = String(e).slice(0, 60);
    passos.push(`falhou "${query}": ${motivo}`);
    console.error(`consulta falhou depois das repetições: "${query}" (${motivo})`);
    return [];
  }
}

async function buscar(query: string, language?: number, rows = 100): Promise<Candidato[]> {
  const u = new URL(SEARCH);
  // Uma barra solta entre espaços ("Colesterol Total / HDL") faz a Search API
  // responder 400 ou 500; a barra colada ("HDL/LDL") é aceita.
  u.searchParams.set('query', query.replace(/\s\/\s/g, ' '));
  u.searchParams.set('rows', String(rows));
  if (language) u.searchParams.set('language', String(language));
  const r = await rfetch(u, { headers: { Accept: 'application/json', Authorization: AUTH } });
  const j = (await r.json()) as { Results?: Record<string, string>[] };
  return (j.Results ?? []).map((x) => ({
    cls: x.CLASS,
    code: x.LOINC_NUM,
    component: x.COMPONENT,
    display: x.LONG_COMMON_NAME,
    lang: language ? 'pt' : 'en',
    method: x.METHOD_TYP,
    property: x.PROPERTY,
    rank: Number(x.COMMON_TEST_RANK) || 0,
    status: x.STATUS,
    system: x.SYSTEM,
  }));
}

async function buscarParts(query: string): Promise<string[]> {
  const u = new URL(PARTS);
  u.searchParams.set('query', query);
  u.searchParams.set('rows', '6');
  const r = await rfetch(u, { headers: { Accept: 'application/json', Authorization: AUTH } });
  const j = (await r.json()) as { Results?: Record<string, string>[] };
  return (j.Results ?? [])
    .filter((p) => p.PartTypeName === 'COMPONENT' && p.Status !== 'DEPRECATED')
    .map((p) => p.PartName);
}

// Propriedade que a unidade implica (mesma leitura do loinc-axes.test.ts).
const UNIDADE_PROPRIEDADE: Record<string, string[]> = {
  '%': ['MFr', 'NFr', 'VFr', 'MFr.DF'],
  fL: ['EntMeanVol', 'EntVol'],
  'g/dL': ['MCnc', 'EntMCnc'],
  'IU/mL': ['ACnc'],
  'K/uL': ['NCnc'],
  'kU/L': ['ACnc'],
  'M/uL': ['NCnc'],
  'mcg/dL': ['MCnc'],
  'mcg/L': ['MCnc'],
  'mcg/mL': ['MCnc'],
  'mEq/L': ['SCnc'],
  'mg/dL': ['MCnc'],
  'mg/g': ['MRto'],
  'mg/L': ['MCnc'],
  'mIU/mL': ['ACnc'],
  'mm/hr': ['Vel', 'SedRate', 'Sedimentation Rate'],
  'mmol/L': ['SCnc'],
  'ng/dL': ['MCnc'],
  'ng/L': ['MCnc'],
  'ng/mL': ['MCnc'],
  'nmol/L': ['SCnc'],
  pg: ['EntMass'],
  'pg/mL': ['MCnc'],
  'pmol/L': ['SCnc'],
  segundos: ['Time'],
  'U/L': ['CCnc'],
  'U/mL': ['ACnc'],
  'ug/dL': ['MCnc'],
  'uIU/mL': ['ACnc'],
  'umol/L': ['SCnc'],
  'µg/L': ['MCnc'],
};

// Grafia canônica de unidade: minúsculas, sem espaço nem acento, µ/micro/mc
// viram "u", UI vira IU, expoentes viram dígito. "µUI/mL", "mcUI/mL" e
// "microUI/mL" caem todas em "uiu/ml".
function grafiaDeUnidade(u: string): string {
  return u
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[µμ]/g, 'u')
    .replace(/micro(?=[gu])/g, 'u')
    .replace(/mc(?=[gu])/g, 'u')
    .replace(/ui/g, 'iu')
    .replace(/³/g, '3')
    .replace(/²/g, '2')
    .replace(/,/g, '.');
}

// Grafias que os laudos imprimem e a tabela acima não tem, pela mesma leitura.
const UNIDADE_LAUDO: Record<string, string[]> = {
  '·103/ul': ['NCnc'],
  '/hpf': ['Naric'],
  '/lpf': ['Naric'],
  '/ml': ['NCnc'],
  '/mm3': ['NCnc'],
  '/ul': ['NCnc'],
  '103/ul': ['NCnc'],
  'g/l': ['MCnc'],
  'iu/l': ['CCnc', 'ACnc'],
  'kiua/l': ['ACnc'],
  'kua/l': ['ACnc'],
  'mg/gcreat': ['MRto'],
  'mil/mm3': ['NCnc'],
  'mil/ul': ['NCnc'],
  'milh./mm3': ['NCnc'],
  'milhoes/mm3': ['NCnc'],
  'milhoes/ul': ['NCnc'],
  'million/mm3': ['NCnc'],
  'million/ul': ['NCnc'],
  'miu/l': ['ACnc'],
  'ml/min/1.73m2': ['ArVRat'],
  'mm/1hora': ['Vel', 'SedRate'],
  'mm/h': ['Vel', 'SedRate'],
  'mu/l': ['ACnc'],
  seconds: ['Time'],
  seg: ['Time'],
  'thousand/ul': ['NCnc'],
  'uu/ml': ['ACnc'],
};
const UNIDADE_CANONICA = new Map<string, string[]>([
  ...Object.entries(UNIDADE_PROPRIEDADE).map(([k, v]) => [grafiaDeUnidade(k), v] as const),
  ...Object.entries(UNIDADE_LAUDO),
]);

function propriedades(alvo: Alvo): string[] | undefined {
  if (!alvo.unit) return undefined;
  return UNIDADE_PROPRIEDADE[alvo.unit] ?? UNIDADE_CANONICA.get(grafiaDeUnidade(alvo.unit));
}

const HEMATOLOGIA =
  /^(Basophils|Eosinophils|Lymphocytes|Monocytes|Neutrophils|WBC|RBC|Hgb|Hct|MCV|MCH|MCHC|MPV|RDW|Platelets|Reticulocytes|INR|ProthrombinTime|DDimer|ESR|Fibrinogen)/i;

// Sistemas (espécimes) que a categoria e o nome implicam, em texto do LOINC.
function sistemas(alvo: Alvo): string[] | null {
  const nome = (alvo.pt[0] ?? '').toLowerCase();
  if (alvo.category === 'urina' || /_urine$/i.test(alvo.code) || /urin|\beas\b/.test(nome)) {
    return ['Urine', 'Urine sed', 'Urine+Ser/Plas'];
  }
  // "Magnésio eritrocitário" é dosagem na hemácia; "Eritrócitos" é contagem no sangue.
  // "RBC" sozinho é a contagem de hemácias, não um analito dosado na hemácia.
  if (
    /_rbc$/i.test(alvo.code) ||
    /eritrocit[aá]ri/.test(nome) ||
    (/\brbc\b/.test(nome) && !/^rbc$|count|contagem/.test(nome.trim()))
  ) {
    return ['RBC', 'RBC.lysate'];
  }
  // Coagulação é dosada em plasma pobre em plaquetas; o sangue total vem depois.
  if (
    /^(INR|ProthrombinTime|DDimer|Fibrinogen|aPTT|PTT)/i.test(alvo.code) ||
    /protrombina|tromboplastina|d[ií]mero|fibrinog|\b(tap|ttpa?|inr|rni|kptt)\b/.test(nome)
  ) {
    return ['PPP', 'Bld', 'Plas', 'Bld/Plas'];
  }
  if (alvo.category === 'sangue' || HEMATOLOGIA.test(alvo.code)) {
    return ['Bld', 'RBC', 'PPP', 'Plas', 'Bld/Plas'];
  }
  if (alvo.category === 'composicao-corporal') return null;
  if (alvo.category === 'toxinas-ambientais') return ['Bld', 'BldV', 'Ser/Plas', 'Ser', 'Plas'];
  return ['Ser/Plas', 'Ser', 'Plas', 'Ser/Plas/Bld', 'Bld', 'RBC.lysate'];
}

// Método padrão da classe quando o laudo não imprime método (PRE-473).
function metodoPadrao(c: Candidato): string | null {
  if (/^HEM\/BC/.test(c.cls)) return 'Automated count';
  if (/^UA/.test(c.cls)) return /sed/i.test(c.system) ? 'Microscopy.light.HPF' : 'Test strip';
  // Analito de tira fora da classe UA (cetonas é CHEM no LOINC): mesma regra.
  if (c.system === 'Urine' && c.property === 'PrThr' && /^Test strip/.test(c.method))
    return 'Test strip';
  if (/^COAG/.test(c.cls)) return 'Coag';
  return null;
}

// Política de PRE-473 (08/10/2026): quando o laudo não imprime método, a
// ordenação segue o padrão da classe. O `COMMON_TEST_RANK` é informativo:
// entre irmãs do mesmo componente, sistema e propriedade, a mais usada ganha
// a marca `maisComum`, que vai ao prompt e ao registro de decisão, mas não
// reordena a lista. A regra que reordena não pode contradizer o catálogo, que
// é o único padrão-ouro que temos; o rank vira fila de revisão, não decisão.
function marcarMaisComum(cands: Candidato[]): void {
  const grupos = new Map<string, Candidato[]>();
  for (const c of cands) {
    const chave = `${c.component}|${c.system}|${c.property}`;
    grupos.set(chave, [...(grupos.get(chave) ?? []), c]);
  }
  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const comRank = grupo.filter((c) => c.rank > 0).sort((a, b) => a.rank - b.rank);
    if (comRank[0])
      comRank[0].maisComum = `variante mais comum nos laudos (rank ${comRank[0].rank})`;
  }
}

function ehPadraoDaClasse(c: Candidato): boolean {
  if (c.padraoDaClasse !== undefined) return c.padraoDaClasse;
  const d = metodoPadrao(c);
  return d !== null && Boolean(c.method?.startsWith(d));
}

// Método impresso no laudo, em português de bancada, casado com o METHOD_TYP
// do LOINC. Só os pares que aparecem nos laudos auditados; grafia sem par não
// pontua e segue só no estado do escolhedor.
const METODO_IMPRESSO: [RegExp, RegExp][] = [
  [/c[aá]lcul/i, /^Calc/i],
  [/hplc|cromatografia l[ií]quida/i, /HPLC/i],
  [/icp|espectrometria de massas/i, /ICP|\bMS\b/i],
  [
    /quimioluminesc|eletroquimio|imunoens|elisa|cmia|eclia|imunom[eé]tric/i,
    /^IA\b|Immunoassay|Chemilum/i,
  ],
  [/turbidim/i, /turbidim/i],
  [/nefelom/i, /Nephelometry/i],
  [/imunofluoresc|\bifi\b|\bifa\b/i, /Immunofluorescence|^IF\b/i],
  [/westergren/i, /Westergren/i],
  [/contagem autom|automatizad/i, /^Automated count/i],
  [/tira|fita/i, /^Test strip/i],
];
function casaMetodoImpresso(metodoLoinc: string, impresso: string | undefined): boolean {
  if (!impresso || !metodoLoinc) return false;
  return METODO_IMPRESSO.some(([pt, en]) => pt.test(impresso) && en.test(metodoLoinc));
}

interface ContextoDePontuacao {
  /** Método impresso no laudo: candidato com esse método vence. */
  metodoImpresso?: string;
  /** Posição de cada sistema na lista que a categoria implica (soro: Ser/Plas antes de Bld). */
  ordemSistema?: Map<string, number>;
  /** Resultado sem unidade em urina tipo I: a propriedade é [Presence] (PrThr). */
  qualitativo?: boolean;
  /** Componentes que só existem com método "Calculated" na lista: o cálculo não é penalizado. */
  soCalculados?: Set<string>;
}

// Sem `ordemSistema`, "Glucose in Blood" ganhava de "Glucose in Serum or
// Plasma" só por ter o nome mais curto. Sem `soCalculados`, VLDL e TFG
// estimada caíam para o fim da lista pela penalidade de método, embora o
// conceito não exista sem cálculo (PRE-473, rodada 11).
function pontuacao(c: Candidato, ctx: ContextoDePontuacao = {}): number {
  const d = c.display;
  let s = 0;
  if (/--/.test(d)) s += 100;
  if (/\^/.test(d)) s += 50;
  const padrao = metodoPadrao(c);
  const calculoObrigatorio = /^Calc/i.test(c.method) && ctx.soCalculados?.has(c.component);
  if (casaMetodoImpresso(c.method, ctx.metodoImpresso)) s -= 40;
  else if (calculoObrigatorio) s -= 25;
  else if (ctx.soCalculados?.has(c.component) && !c.method) s += 20;
  else if (ctx.qualitativo && /^(MCnc|SCnc|ACnc)$/.test(c.property) && /^Urine$/.test(c.system))
    s += 25;
  else if (padrao) s += ehPadraoDaClasse(c) ? -25 : c.method ? 20 : 0;
  else if (c.method) s += 20;
  if (/panel|study|maximum|minimum|mean|goal|father|mother|fetal|cord/i.test(d)) s += 30;
  s += c.rank > 0 ? Math.min(c.rank, 5000) / 1000 : 10;
  if (c.systemDesconhecido || c.propertyDesconhecida) s += 15;
  if (ctx.ordemSistema?.size) {
    s += 3 * (ctx.ordemSistema.get(c.system) ?? ctx.ordemSistema.size);
  }
  return s + d.length / 10;
}

// Componentes cuja lista só tem variantes calculadas (nenhuma irmã sem método).
// Conceitos que o laboratório de rotina só obtém por cálculo, mesmo quando o
// LOINC também tem a variante medida (VLDL por ultracentrifugação existe, mas
// nenhum laudo de rotina a faz). Lista explícita: a presença ou ausência da
// irmã base no pool não diz nada sobre como o laudo chegou ao número.
const CALCULO_OBRIGATORIO: [RegExp, RegExp][] = [
  [/^Cholesterol\.in VLDL$/i, /vldl/i],
  [/^Glomerular filtration rate/i, /\b(e?gfr|tfg|rfg)\b|filtra[cç][aã]o glomerular|glomerular/i],
];
// Só vale quando o próprio alvo é o conceito calculado: o VLDL calculado não
// pode subir na lista do LDL.
function componentesSoCalculados(cands: Candidato[], alvo: Alvo): Set<string> {
  const nomes = [...alvo.en, ...alvo.pt, alvo.nomeImpresso ?? ''].join(' ');
  return new Set(
    cands
      .map((c) => c.component)
      .filter((comp) => CALCULO_OBRIGATORIO.some(([c, n]) => c.test(comp ?? '') && n.test(nomes))),
  );
}

// Rótulos de eixo que a busca em português devolve traduzidos ("SgTotal",
// "Urina"): aprendidos dos códigos que aparecem nas duas línguas.
const ROTULO = {
  method: new Map<string, string>(),
  property: new Map<string, string>(),
  system: new Map<string, string>(),
};
if (ROTULOS && existsSync(ROTULOS)) {
  const m = JSON.parse(readFileSync(ROTULOS, 'utf8')) as Record<string, [string, string][]>;
  // Sistema e método: a busca em português devolve a propriedade já em inglês.
  for (const [pt, en] of m.SYSTEM ?? []) ROTULO.system.set(pt, en);
  for (const [pt, en] of m.METHOD ?? []) ROTULO.method.set(pt, en);
}
// Rótulos em inglês que o filtro conhece: um rótulo "português" igual a um
// deles é inglês de fato e não precisa de tradução.
const SISTEMAS_EN = new Set([
  'Bld',
  'Bld/Plas',
  'BldV',
  'PPP',
  'Plas',
  'RBC',
  'RBC.lysate',
  'Ser',
  'Ser/Plas',
  'Ser/Plas/Bld',
  'Urine',
  'Urine sed',
  'Urine+Ser/Plas',
]);
const PROPRIEDADES_EN = new Set([
  ...Object.values(UNIDADE_PROPRIEDADE).flat(),
  ...Object.values(UNIDADE_LAUDO).flat(),
]);
// Rótulo em português que a busca com `language=11` entende numa cláusula
// `system:"..."` (a propriedade continua em inglês nessa busca).
function rotuloPt(en: string): string | undefined {
  for (const [pt, e] of ROTULO.system) if (e === en) return pt;
  return undefined;
}
// Um rótulo que já é inglês conhecido nunca vira chave: a variante pt-BR do
// LOINC tem linhas com eixo trocado, e um par "MCnc → PrThr" aprendido de uma
// linha dessas retraduzia todos os MCnc corretos e os tirava do filtro.
const CONHECIDO = { method: new Set<string>(), property: PROPRIEDADES_EN, system: SISTEMAS_EN };
function aprender(en: Candidato, pt: Candidato): void {
  for (const eixo of ['system', 'property', 'method'] as const) {
    if (!en[eixo] || !pt[eixo] || en[eixo] === pt[eixo] || CONHECIDO[eixo].has(pt[eixo])) continue;
    ROTULO[eixo].set(pt[eixo], en[eixo]);
  }
}
function normalizar(c: Candidato): Candidato {
  if (c.lang === 'en') return c;
  const out = { ...c };
  const sys = SISTEMAS_EN.has(c.system) ? c.system : ROTULO.system.get(c.system);
  if (sys) out.system = sys;
  else out.systemDesconhecido = true;
  const prop = PROPRIEDADES_EN.has(c.property) ? c.property : ROTULO.property.get(c.property);
  if (prop) out.property = prop;
  else out.propertyDesconhecida = true;
  // Método traduzido ("Contagem automática") sem par conhecido fica como está:
  // a regra de método padrão da classe só casa com o rótulo em inglês.
  out.method = ROTULO.method.get(c.method) ?? c.method;
  return out;
}

function filtrar(
  pool: Candidato[],
  alvo: Alvo,
  relax: { sys?: boolean; prop?: boolean },
): Candidato[] {
  const props = propriedades(alvo);
  const S = relax.sys === false ? null : sistemas(alvo);
  return pool.filter(
    (r) =>
      r.status === 'ACTIVE' &&
      !/^(CHAL$|PANEL\.|SURVEY|HEDIS|ATTACH)/.test(r.cls) &&
      (!S || r.systemDesconhecido || S.includes(r.system)) &&
      (relax.prop === false || !props || r.propertyDesconhecida || props.includes(r.property)),
  );
}

async function recuperar(
  alvo: Alvo,
): Promise<{ candidatos: Candidato[]; passos: string[]; posicaoBruta: number }> {
  const passos: string[] = [];
  let pool: Candidato[] = [];
  const juntar = (rows: Candidato[]) => {
    for (const r of rows) {
      const ex = pool.find((x) => x.code === r.code);
      if (!ex) pool.push(r);
      else if (ex.lang === 'en' && r.lang === 'pt') aprender(ex, r);
      else if (ex.lang === 'pt' && r.lang === 'en') {
        aprender(r, ex);
        Object.assign(ex, r);
      }
    }
  };
  const props = propriedades(alvo) ?? [];
  const S = sistemas(alvo) ?? [];
  const variantes = (a: string) =>
    uniq([a, a.replace(/-/g, ' '), a.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim()]);
  const en = uniq(alvo.en.slice(0, 4).flatMap(variantes)).slice(0, 8);
  const pt = uniq(alvo.pt.slice(0, 4).flatMap(variantes)).slice(0, 6);

  // Sem nome em inglês (teste local só com o nome impresso), as cláusulas de
  // eixo vão com o nome em português e `language=11`. Nessa busca a cláusula
  // `system:` só casa com o rótulo traduzido ("SgTotal", não "Bld"); a
  // propriedade e o status continuam em inglês. Sem rótulo traduzido
  // conhecido, a cláusula de sistema sai e o filtro faz o trabalho depois.
  const emPortugues = en.length === 0;
  const sistemaDaClausula = emPortugues ? rotuloPt(S[0] ?? '') : S[0];
  // Em português não há consulta solta em inglês para compensar uma cláusula
  // errada: unidade ambígua ("%": MFr, NFr, VFr) fica sem cláusula de propriedade.
  const propriedadeDaClausula = emPortugues && props.length > 1 ? undefined : props[0];
  const clausulas = [
    sistemaDaClausula ? `system:"${sistemaDaClausula}"` : '',
    propriedadeDaClausula ? `property:${propriedadeDaClausula}` : '',
    'status:ACTIVE',
  ]
    .filter(Boolean)
    .join(' ');
  const linguaDaClausula = emPortugues ? PT_BR_LANGUAGE : undefined;
  for (const a of emPortugues ? pt : en) {
    const q = await buscarOuVazio(`${a} ${clausulas}`, passos, linguaDaClausula);
    passos.push(`cláusulas "${a}" → ${q.length}`);
    juntar(q);
  }
  juntar(await buscarOuVazio(alvo.en[0] ?? alvo.pt[0] ?? alvo.code, passos, linguaDaClausula, 300));
  for (const a of en.slice(1)) juntar(await buscarOuVazio(a, passos, undefined, 100));
  for (const a of pt) {
    juntar(await buscarOuVazio(a, passos, PT_BR_LANGUAGE));
    if (pool.length >= 20) break;
  }
  if (pool.length < 10) {
    for (const a of [...en, ...pt]) {
      const parts = await buscarParts(a);
      if (!parts.length) continue;
      passos.push(`parts "${a}" → ${parts.slice(0, 3).join(' | ')}`);
      for (const pn of parts.slice(0, 3)) {
        const base = pn.split('^')[0] ?? pn;
        const q = await buscarOuVazio(`${base} ${clausulas}`, passos);
        juntar(q.length ? q : await buscarOuVazio(base, passos, undefined, 100));
      }
      if (pool.length >= 10) break;
    }
  }
  pool = pool.map(normalizar);
  const posicaoBruta = pool.findIndex((r) => r.code === alvo.loinc) + 1;
  for (const relax of [{}, { prop: false }, { sys: false }, { prop: false, sys: false }]) {
    let f = filtrar(pool, alvo, relax);
    if (!f.length) continue;
    if (emPortugues) {
      // Os rótulos traduzidos passaram no filtro por desconhecidos; o registro
      // em inglês decide de verdade, e ensina os pares para os próximos alvos.
      f = filtrar(await resolverEmIngles(f, passos), alvo, relax);
      if (!f.length) continue;
    }
    passos.push(`filtro ${JSON.stringify(relax)} → ${f.length}`);
    return { candidatos: f, passos, posicaoBruta };
  }
  return { candidatos: [], passos, posicaoBruta };
}

// Troca candidatos vindos só da busca em português pelo registro em inglês,
// em lotes de 30 códigos por chamada (`713-8 OR 26450-7 OR ...`).
async function resolverEmIngles(cands: Candidato[], passos: string[]): Promise<Candidato[]> {
  const pendentes = cands.filter((c) => c.lang === 'pt').slice(0, 90);
  if (!pendentes.length) return cands;
  const emIngles = new Map<string, Candidato>();
  for (let i = 0; i < pendentes.length; i += 30) {
    const lote = pendentes.slice(i, i + 30);
    const q = await buscarOuVazio(lote.map((c) => c.code).join(' OR '), passos, undefined, 30);
    for (const r of q) emIngles.set(r.code, r);
  }
  passos.push(`inglês para ${pendentes.length} candidatos → ${emIngles.size}`);
  return cands.map((c) => {
    const en = c.lang === 'pt' ? emIngles.get(c.code) : undefined;
    if (!en) return c;
    aprender(en, c);
    return en;
  });
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
interface Decisao {
  codigo: string | null;
  confianca: number | null;
  custoUsd: number | null;
  escolha: string | null;
  probabilidades: Record<string, number> | null;
}
async function escolherComJev(
  alvo: Alvo,
  cands: Candidato[],
  soCalculados: Set<string> = new Set(),
): Promise<Decisao> {
  const criteria: Record<string, string> = {};
  cands.forEach((c, i) => {
    const tags = [
      casaMetodoImpresso(c.method, alvo.metodoImpresso) ? 'método igual ao impresso no laudo' : '',
      /^Calc/i.test(c.method) && soCalculados.has(c.component)
        ? 'conceito que só existe como cálculo'
        : '',
      ehPadraoDaClasse(c) ? 'padrão da classe quando o laudo não imprime método' : '',
      c.maisComum ?? '',
    ].filter(Boolean);
    criteria[LETRAS[i]!] = `${c.code} ${c.display}${tags.length ? ` [${tags.join('; ')}]` : ''}`;
  });
  criteria.NONE = 'Nenhum dos candidatos descreve exatamente este exame';
  const body = {
    model: JEV_MODEL,
    questions: {
      resposta: {
        criteria,
        instructions:
          'Escolha o código LOINC cujo componente, propriedade, sistema (espécime), escala e método descrevem exatamente este exame como ele aparece em laudos brasileiros de rotina. Se o laudo imprime um método e um candidato traz esse método (marca "método igual ao impresso no laudo"), esse candidato é o certo. Se o conceito só existe como cálculo (VLDL, globulina, LDL calculado, TFG estimada; marca "conceito que só existe como cálculo"), o código calculado é o certo. Quando o laudo não indica método: para hemograma (classe HEM/BC) a variante padrão é "by Automated count", para urina tipo I (UA) é "by Test strip" (sedimento: microscopia), para coagulação é "by Coagulation assay"; nas demais classes prefira o conceito base sem método. Resultado qualitativo (sem unidade; Negativo, Traços, cruzes) é propriedade [Presence]; resultado com unidade é a propriedade que a unidade implica. A marca "mais comum nos laudos" é só informativa e não muda a regra. Evite qualificadores de tempo ou desafio que o laudo não indica. Escolha NONE se nenhum candidato servir.',
        type: 'choice',
      },
    },
    state: [
      'Exame de laudo laboratorial brasileiro.',
      `Nome no laudo: ${alvo.pt.join(' / ')}`,
      `Nome em inglês: ${alvo.en.join(' / ')}`,
      `Unidade: ${alvo.unit ?? '(sem unidade)'}`,
      `Método impresso: ${alvo.metodoImpresso ?? '(o laudo não imprime método)'}`,
      `Categoria clínica: ${alvo.category}`,
    ].join('\n'),
  };
  const r = await rfetch('https://openrouter.ai/api/alpha/decisions', {
    body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const j = (await r.json()) as {
    answers?: {
      resposta?: { choice: string; confidence: number; probabilities: Record<string, number> };
    };
    usage?: { cost?: number };
  };
  const a = j.answers?.resposta;
  if (!a)
    return { codigo: null, confianca: null, custoUsd: null, escolha: null, probabilidades: null };
  const codigo = a.choice === 'NONE' ? null : (cands[LETRAS.indexOf(a.choice)]?.code ?? null);
  return {
    codigo,
    confianca: a.confidence,
    custoUsd: j.usage?.cost ?? null,
    escolha: a.choice,
    probabilidades: a.probabilities,
  };
}

const HEMATOLOGIA_PT =
  /hem[aá]cias|eritr[oó]cit|leuc[oó]cit|plaquet|hemat[oó]crit|hemoglobin|\b(vcm|hcm|chcm|rdw|vpm|mpv|vhs|tap|ttpa?|inr|rni|kptt)\b|neutr[oó]f|linf[oó]c|mon[oó]c|eosin[oó]f|bas[oó]f|segmentad|bastonet|reticul[oó]c|d[ií]mero|fibrinog|protrombina|tromboplastina|hemograma|miel[oó]cit|metamiel|blastos|promiel/i;
const COMPOSICAO_CORPORAL_PT =
  /\b(dexa|imc|massa|gordura|magra|corporal|peso|altura|densidade|[oó]ssea|t-?score|z-?score|tronco|visceral|android|gin[oó]ide|braço|perna|cabeça|pelve|costelas)\b/i;
const UNIDADE_CORPORAL = /^(cm|m|kg|lbs|g\/cm2|kg\/m2|%bywt|cm2|cm3|in3|kcal.*|bpm|°|angstrom)$/;

// Categoria que o laudo implica, só pelo que ele imprime: espécime, nome e unidade.
function categoriaDoLaudo(nome: string, unidade: string | null, especime: string): string {
  const n = nome.toLowerCase();
  const e = especime.toLowerCase();
  if (/urin/.test(e) || /urin|\beas\b|sediment|urocult|\/24\s?h/.test(n)) return 'urina';
  if (UNIDADE_CORPORAL.test(grafiaDeUnidade(unidade ?? '')) || COMPOSICAO_CORPORAL_PT.test(n)) {
    return 'composicao-corporal';
  }
  if (/sangue/.test(e) || HEMATOLOGIA_PT.test(n)) return 'sangue';
  return 'soro';
}

// "Tiroxina livre (T4 livre)" vira três pistas: inteira, sem parênteses, só o parêntese.
function variantesDoNome(nome: string): string[] {
  const parenteses = [...nome.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]!.trim());
  const semParenteses = nome.replace(/\s*\([^)]*\)/g, '').trim();
  return uniq([nome, semParenteses, ...parenteses, ...semParenteses.split(/\s+[-–]\s+/)])
    .filter((v) => v.length >= 2)
    .slice(0, 4);
}

function alvosDosTestesLocais(arquivo: string): Alvo[] {
  const registros = JSON.parse(readFileSync(arquivo, 'utf8')) as TesteLocal[];
  const grupos = new Map<string, Alvo>();
  for (const t of registros) {
    if (APENAS && !APENAS.includes(t.biomarkerCode)) continue;
    const nome = t.printedName.trim();
    const unidade = t.unit.trim() || null;
    const especime = t.specimen.trim();
    const metodo = (t.method ?? '').trim() || undefined;
    const chave = [nome, unidade ?? '', especime, metodo ?? '', t.loincCode]
      .join('|')
      .toLowerCase();
    let alvo = grupos.get(chave);
    if (!alvo) {
      const def = COM_ALIASES
        ? BIOMARKER_DEFINITIONS.find((d) => d.code === t.biomarkerCode)
        : undefined;
      alvo = {
        category: def ? String(def.category) : categoriaDoLaudo(nome, unidade, especime),
        code: def?.code ?? nome,
        en: def?.names.en ?? [],
        loinc: t.loincCode,
        metodoImpresso: metodo,
        nomeImpresso: nome,
        ocorrencias: [],
        pt: variantesDoNome(nome),
        unit: unidade,
      };
      grupos.set(chave, alvo);
    }
    alvo.ocorrencias!.push({
      biomarcador: t.biomarkerCode,
      laboratorio: t.laboratory,
      observacoes: t.observations,
    });
  }
  return [...grupos.values()];
}

const alvos: Alvo[] = (
  TESTES_LOCAIS
    ? alvosDosTestesLocais(TESTES_LOCAIS)
    : BIOMARKER_DEFINITIONS.filter((d) => d.loinc && (!APENAS || APENAS.includes(d.code))).map(
        (d) => ({
          category: String(d.category),
          code: d.code,
          en: d.names.en,
          loinc: d.loinc!,
          pt: d.names.pt,
          unit: d.unit ?? null,
        }),
      )
).slice(0, LIMITE);
console.error(`${alvos.length} alvos${TESTES_LOCAIS ? ` de ${TESTES_LOCAIS}` : ' do catálogo'}`);

// Listas de candidatos gravadas por uma corrida anterior, indexadas pela chave
// do alvo (nome impresso, unidade e código nos testes locais; código do
// biomarcador no catálogo).
interface ItemGravado {
  biomarcador: string;
  candidatos: (Omit<Candidato, 'cls' | 'lang' | 'status'> & { maisComum: string | null })[];
  loinc: string;
  nomeImpresso: string | null;
  posicaoNoPool: number;
  unidade: string | null;
}
const chaveDoAlvo = (a: {
  code?: string;
  biomarcador?: string;
  loinc: string;
  nomeImpresso?: string | null;
  unit?: string | null;
  unidade?: string | null;
}) =>
  a.nomeImpresso
    ? `${a.nomeImpresso}|${a.unit ?? a.unidade ?? ''}|${a.loinc}`.toLowerCase()
    : `${a.code ?? a.biomarcador}|${a.loinc}`;
const GRAVADOS = new Map<string, ItemGravado>();
if (REPLAY) {
  const g = JSON.parse(readFileSync(REPLAY, 'utf8')) as { itens: ItemGravado[] };
  for (const it of g.itens) if (it.candidatos) GRAVADOS.set(chaveDoAlvo(it), it);
  console.error(`${GRAVADOS.size} listas gravadas em ${REPLAY}`);
}

async function recuperarOuReproduzir(
  alvo: Alvo,
): Promise<{ candidatos: Candidato[]; passos: string[]; posicaoBruta: number }> {
  const gravado = REPLAY ? GRAVADOS.get(chaveDoAlvo(alvo)) : undefined;
  if (!gravado) return recuperar(alvo);
  return {
    candidatos: gravado.candidatos.map((c) => ({
      ...c,
      cls: '',
      lang: 'en' as const,
      maisComum: c.maisComum ?? undefined,
      status: 'ACTIVE',
    })),
    passos: [`replay de ${REPLAY}`],
    posicaoBruta: gravado.posicaoNoPool,
  };
}

// Pergunta REPETIR vezes sobre a mesma lista e resume: a escolha mais
// frequente (moda), a fração de repetições que concordam com ela e a faixa de
// confiança. O primeiro resultado continua sendo "a" decisão, como antes.
async function escolherRepetindo(
  alvo: Alvo,
  cands: Candidato[],
  soCalculados: Set<string>,
): Promise<{ primeira: Decisao; repeticoes: Decisao[] }> {
  const repeticoes: Decisao[] = [];
  for (let i = 0; i < REPETIR; i++) {
    repeticoes.push(await escolherComJev(alvo, cands, soCalculados));
  }
  return { primeira: repeticoes[0]!, repeticoes };
}
function resumoDasRepeticoes(reps: Decisao[]) {
  const contagem = new Map<string, number>();
  for (const r of reps) {
    const k = r.escolha === 'NONE' ? 'NONE' : (r.codigo ?? '?');
    contagem.set(k, (contagem.get(k) ?? 0) + 1);
  }
  const [moda, n] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['?', 0];
  const confs = reps.map((r) => r.confianca ?? 0);
  return {
    confiancaMax: Math.max(...confs),
    confiancaMin: Math.min(...confs),
    consistencia: n / Math.max(reps.length, 1),
    distribuicao: Object.fromEntries(contagem),
    moda,
  };
}

const saida: Record<string, unknown>[] = [];
let proximo = 0;
async function trabalhador(): Promise<void> {
  while (proximo < alvos.length) {
    const alvo = alvos[proximo++]!;
    try {
      const r = await recuperarOuReproduzir(alvo);
      if (!REPLAY) marcarMaisComum(r.candidatos);
      const ctx: ContextoDePontuacao = {
        metodoImpresso: alvo.metodoImpresso,
        ordemSistema: new Map((sistemas(alvo) ?? []).map((s, i) => [s, i] as const)),
        qualitativo: !alvo.unit && alvo.category === 'urina',
        soCalculados: componentesSoCalculados(r.candidatos, alvo),
      };
      const cands = REPLAY
        ? r.candidatos
        : [...r.candidatos].sort((a, b) => pontuacao(a, ctx) - pontuacao(b, ctx)).slice(0, 15);
      const posicao = cands.findIndex((c) => c.code === alvo.loinc) + 1;
      const regra = cands[0]?.code ?? null;
      const decisao =
        OPENROUTER_API_KEY && cands.length
          ? await escolherRepetindo(alvo, cands, ctx.soCalculados!)
          : null;
      const jev = decisao?.primeira ?? null;
      const reps = decisao && REPETIR > 1 ? resumoDasRepeticoes(decisao.repeticoes) : null;
      saida.push({
        biomarcador: alvo.ocorrencias
          ? uniq(alvo.ocorrencias.map((o) => o.biomarcador)).join(',')
          : alvo.code,
        candidatos: cands.map((c) => ({
          code: c.code,
          component: c.component,
          display: c.display,
          maisComum: c.maisComum ?? null,
          method: c.method,
          padraoDaClasse: ehPadraoDaClasse(c),
          property: c.property,
          rank: c.rank,
          system: c.system,
        })),
        categoria: alvo.category,
        jev: jev?.escolha ?? null,
        jevAcertou: jev ? jev.codigo === alvo.loinc : null,
        jevCodigo: jev?.codigo ?? null,
        jevConfianca: jev?.confianca ?? null,
        jevConfiancaMax: reps?.confiancaMax ?? null,
        jevConfiancaMin: reps?.confiancaMin ?? null,
        jevConsistencia: reps?.consistencia ?? null,
        jevCustoUsd: decisao ? decisao.repeticoes.reduce((a, d) => a + (d.custoUsd ?? 0), 0) : null,
        jevDistribuicao: reps?.distribuicao ?? null,
        jevModa: reps?.moda ?? null,
        jevModaAcertou: reps ? reps.moda === alvo.loinc : null,
        jevProbabilidades: jev?.probabilidades ?? null,
        laboratorios: alvo.ocorrencias
          ? uniq(alvo.ocorrencias.map((o) => o.laboratorio)).length
          : null,
        loinc: alvo.loinc,
        nomeImpresso: alvo.nomeImpresso ?? null,
        ocorrencias: alvo.ocorrencias ?? null,
        passos: r.passos,
        posicao,
        posicaoNoPool: r.posicaoBruta,
        regra,
        regraAcertou: regra === alvo.loinc,
        unidade: alvo.unit,
      });
    } catch (e) {
      saida.push({ biomarcador: alvo.code, erro: String(e).slice(0, 160), loinc: alvo.loinc });
    }
    if (saida.length % 10 === 0) console.error(`${saida.length}/${alvos.length}`);
  }
}

await Promise.all(Array.from({ length: CONCORRENCIA }, trabalhador));
saida.sort((a, b) => String(a.biomarcador).localeCompare(String(b.biomarcador)));
writeFileSync(
  SAIDA,
  `${JSON.stringify({ geradoEm: new Date().toISOString(), itens: saida, modelo: OPENROUTER_API_KEY ? JEV_MODEL : null }, null, 1)}\n`,
);

if (ROTULOS) {
  writeFileSync(
    ROTULOS,
    `${JSON.stringify({ METHOD: [...ROTULO.method], PROPERTY: [...ROTULO.property], SYSTEM: [...ROTULO.system] }, null, 1)}\n`,
  );
}

const ok = saida.filter((o) => !o.erro);
const presentes = ok.filter((o) => Number(o.posicao) > 0);
const pct = (a: number, b: number) => `${a}/${b} (${((100 * a) / Math.max(b, 1)).toFixed(1)}%)`;
console.log(`itens: ${ok.length} | erros: ${saida.length - ok.length}`);
console.log(
  `código no pool bruto: ${pct(ok.filter((o) => Number(o.posicaoNoPool) > 0).length, ok.length)}`,
);
console.log(
  `código entre os 15 candidatos: ${pct(presentes.length, ok.length)} | @1: ${pct(ok.filter((o) => o.posicao === 1).length, ok.length)} | @5: ${pct(ok.filter((o) => Number(o.posicao) > 0 && Number(o.posicao) <= 5).length, ok.length)}`,
);
console.log(
  `regra acerta (código presente): ${pct(presentes.filter((o) => o.regraAcertou).length, presentes.length)}`,
);
if (TESTES_LOCAIS) {
  // Cada alvo pesa o número de testes locais (laboratórios) que ele agrupa.
  const peso = (o: Record<string, unknown>) => (o.ocorrencias as Ocorrencia[] | null)?.length ?? 1;
  const soma = (xs: Record<string, unknown>[]) => xs.reduce((a, o) => a + peso(o), 0);
  console.log(
    `ponderado por teste local: entre os 15: ${pct(soma(presentes), soma(ok))} | regra @1: ${pct(soma(ok.filter((o) => o.regraAcertou)), soma(ok))} | sem candidato: ${pct(soma(ok.filter((o) => !(o.candidatos as unknown[]).length)), soma(ok))}`,
  );
}
if (OPENROUTER_API_KEY) {
  console.log(
    `Jev acerta (código presente): ${pct(presentes.filter((o) => o.jevAcertou).length, presentes.length)}`,
  );
  console.log(`Jev acerta (todos): ${pct(ok.filter((o) => o.jevAcertou).length, ok.length)}`);
  const altos = ok.filter((o) => Number(o.jevConfianca) >= 0.95 && o.jev !== 'NONE');
  console.log(
    `propostas com confiança >= 0,95: ${altos.length}, exatas: ${altos.filter((o) => o.jevAcertou).length}`,
  );
  console.log(
    `custo Jev: US$ ${ok.reduce((a, o) => a + Number(o.jevCustoUsd ?? 0), 0).toFixed(4)}`,
  );
  if (REPETIR > 1) {
    const comReps = ok.filter((o) => o.jevConsistencia !== null);
    const unanimes = comReps.filter((o) => o.jevConsistencia === 1);
    console.log(
      `repetições: ${REPETIR} por alvo | escolha unânime em ${pct(unanimes.length, comReps.length)} | moda acerta: ${pct(comReps.filter((o) => o.jevModaAcertou).length, comReps.length)} (primeira: ${pct(comReps.filter((o) => o.jevAcertou).length, comReps.length)})`,
    );
    for (const [lo, hi] of [
      [0.95, 1.01],
      [0.85, 0.95],
      [0, 0.85],
    ] as const) {
      const f = comReps.filter(
        (o) => o.jev !== 'NONE' && Number(o.jevConfianca) >= lo && Number(o.jevConfianca) < hi,
      );
      console.log(
        `  primeira confiança em [${lo}, ${hi}): ${f.length} alvos, unânimes ${pct(f.filter((o) => o.jevConsistencia === 1).length, f.length)}, consistência média ${(f.reduce((a, o) => a + Number(o.jevConsistencia), 0) / Math.max(f.length, 1)).toFixed(3)}`,
      );
    }
  }
}
console.log(`resultados em ${SAIDA}`);
