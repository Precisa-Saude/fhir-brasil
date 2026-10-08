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
 *
 * Precisa de `LOINC_USER` e `LOINC_PASSWORD` (conta gratuita do LOINC). Sem
 * `OPENROUTER_API_KEY`, roda só a busca e a regra. Envia ao LOINC e ao
 * OpenRouter apenas nomes e unidades do catálogo; nenhum dado de paciente.
 */

import { writeFileSync } from 'node:fs';

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
  property: string;
  propertyDesconhecida?: boolean;
  rank: number;
  status: string;
  system: string;
  systemDesconhecido?: boolean;
}

interface Alvo {
  category: string;
  code: string;
  en: string[];
  loinc: string;
  pt: string[];
  unit: string | null;
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
    passos.push(`falhou "${query}": ${String(e).slice(0, 60)}`);
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

const HEMATOLOGIA =
  /^(Basophils|Eosinophils|Lymphocytes|Monocytes|Neutrophils|WBC|RBC|Hgb|Hct|MCV|MCH|MCHC|MPV|RDW|Platelets|Reticulocytes|INR|ProthrombinTime|DDimer|ESR|Fibrinogen)/i;

// Sistemas (espécimes) que a categoria e o nome implicam, em texto do LOINC.
function sistemas(alvo: Alvo): string[] | null {
  const nome = (alvo.pt[0] ?? '').toLowerCase();
  if (alvo.category === 'urina' || /_urine$/i.test(alvo.code) || /urin/.test(nome)) {
    return ['Urine', 'Urine sed', 'Urine+Ser/Plas'];
  }
  if (/_rbc$/i.test(alvo.code) || /rbc|eritrocit/.test(nome)) return ['RBC', 'RBC.lysate'];
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
  const d = metodoPadrao(c);
  return d !== null && Boolean(c.method?.startsWith(d));
}

function pontuacao(c: Candidato): number {
  const d = c.display;
  let s = 0;
  if (/--/.test(d)) s += 100;
  if (/\^/.test(d)) s += 50;
  const padrao = metodoPadrao(c);
  if (padrao) s += ehPadraoDaClasse(c) ? -25 : c.method ? 20 : 0;
  else if (c.method) s += 20;
  if (/panel|study|maximum|minimum|mean|goal|father|mother|fetal|cord/i.test(d)) s += 30;
  s += c.rank > 0 ? Math.min(c.rank, 5000) / 1000 : 10;
  if (c.systemDesconhecido || c.propertyDesconhecida) s += 15;
  return s + d.length / 10;
}

// Rótulos de eixo que a busca em português devolve traduzidos ("SgTotal",
// "Urina"): aprendidos dos códigos que aparecem nas duas línguas.
const ROTULO = { property: new Map<string, string>(), system: new Map<string, string>() };
function aprender(en: Candidato, pt: Candidato): void {
  for (const eixo of ['system', 'property'] as const) {
    if (en[eixo] && pt[eixo] && en[eixo] !== pt[eixo]) ROTULO[eixo].set(pt[eixo], en[eixo]);
  }
}
function normalizar(c: Candidato): Candidato {
  if (c.lang === 'en') return c;
  const out = { ...c };
  const sys = ROTULO.system.get(c.system);
  if (sys) out.system = sys;
  else out.systemDesconhecido = true;
  const prop = ROTULO.property.get(c.property);
  if (prop) out.property = prop;
  else out.propertyDesconhecida = true;
  return out;
}

function filtrar(
  pool: Candidato[],
  alvo: Alvo,
  relax: { sys?: boolean; prop?: boolean },
): Candidato[] {
  const props = UNIDADE_PROPRIEDADE[alvo.unit ?? ''];
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
  const props = UNIDADE_PROPRIEDADE[alvo.unit ?? ''] ?? [];
  const S = sistemas(alvo) ?? [];
  const clausulas = [
    S[0] ? `system:"${S[0]}"` : '',
    props[0] ? `property:${props[0]}` : '',
    'status:ACTIVE',
  ]
    .filter(Boolean)
    .join(' ');
  const variantes = (a: string) =>
    uniq([a, a.replace(/-/g, ' '), a.replace(/[-/]/g, ' ').replace(/\s+/g, ' ').trim()]);
  const en = uniq(alvo.en.slice(0, 4).flatMap(variantes)).slice(0, 8);
  const pt = uniq(alvo.pt.slice(0, 4).flatMap(variantes)).slice(0, 6);

  for (const a of en) {
    const q = await buscarOuVazio(`${a} ${clausulas}`, passos);
    passos.push(`cláusulas "${a}" → ${q.length}`);
    juntar(q);
  }
  juntar(await buscarOuVazio(alvo.en[0] ?? alvo.code, passos, undefined, 300));
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
    const f = filtrar(pool, alvo, relax);
    if (f.length) {
      passos.push(`filtro ${JSON.stringify(relax)} → ${f.length}`);
      return { candidatos: f, passos, posicaoBruta };
    }
  }
  return { candidatos: [], passos, posicaoBruta };
}

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
interface Decisao {
  codigo: string | null;
  confianca: number | null;
  custoUsd: number | null;
  escolha: string | null;
  probabilidades: Record<string, number> | null;
}
async function escolherComJev(alvo: Alvo, cands: Candidato[]): Promise<Decisao> {
  const criteria: Record<string, string> = {};
  cands.forEach((c, i) => {
    const tags = [
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
          'Escolha o código LOINC cujo componente, propriedade, sistema (espécime), escala e método descrevem exatamente este exame como ele aparece em laudos brasileiros de rotina. Quando o laudo não indica método: para hemograma (classe HEM/BC) a variante padrão é "by Automated count", para urina tipo I (UA) é "by Test strip" (sedimento: microscopia), para coagulação é "by Coagulation assay"; nas demais classes prefira o conceito base sem método. A marca "mais comum nos laudos" é só informativa e não muda a regra. Evite qualificadores de tempo ou desafio que o laudo não indica. Escolha NONE se nenhum candidato servir.',
        type: 'choice',
      },
    },
    state: [
      'Exame de laudo laboratorial brasileiro.',
      `Nome no laudo: ${alvo.pt.join(' / ')}`,
      `Nome em inglês: ${alvo.en.join(' / ')}`,
      `Unidade: ${alvo.unit ?? '(sem unidade)'}`,
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

const alvos: Alvo[] = BIOMARKER_DEFINITIONS.filter(
  (d) => d.loinc && (!APENAS || APENAS.includes(d.code)),
)
  .slice(0, LIMITE)
  .map((d) => ({
    category: String(d.category),
    code: d.code,
    en: d.names.en,
    loinc: d.loinc!,
    pt: d.names.pt,
    unit: d.unit ?? null,
  }));

const saida: Record<string, unknown>[] = [];
let proximo = 0;
async function trabalhador(): Promise<void> {
  while (proximo < alvos.length) {
    const alvo = alvos[proximo++]!;
    try {
      const r = await recuperar(alvo);
      marcarMaisComum(r.candidatos);
      const cands = [...r.candidatos].sort((a, b) => pontuacao(a) - pontuacao(b)).slice(0, 15);
      const posicao = cands.findIndex((c) => c.code === alvo.loinc) + 1;
      const regra = cands[0]?.code ?? null;
      const jev = OPENROUTER_API_KEY && cands.length ? await escolherComJev(alvo, cands) : null;
      saida.push({
        biomarcador: alvo.code,
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
        jevCustoUsd: jev?.custoUsd ?? null,
        jevProbabilidades: jev?.probabilidades ?? null,
        loinc: alvo.loinc,
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

await Promise.all([trabalhador(), trabalhador()]);
saida.sort((a, b) => String(a.biomarcador).localeCompare(String(b.biomarcador)));
writeFileSync(
  SAIDA,
  `${JSON.stringify({ geradoEm: new Date().toISOString(), itens: saida, modelo: OPENROUTER_API_KEY ? JEV_MODEL : null }, null, 1)}\n`,
);

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
}
console.log(`resultados em ${SAIDA}`);
