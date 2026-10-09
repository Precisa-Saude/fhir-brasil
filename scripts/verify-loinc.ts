/* eslint-disable no-console -- script de CLI: a saída é o produto */
/**
 * Confere os códigos LOINC do catálogo contra o servidor oficial.
 *
 * Uso:
 *   pnpm loinc:check     — compara o vivo com o snapshot versionado
 *   pnpm loinc:update    — regrava o snapshot a partir do vivo
 *
 * Precisa de LOINC_USER e LOINC_PASSWORD (conta gratuita em
 * https://loinc.org/get-started/). No CI vêm dos secrets do repo.
 *
 * Sem credencial, LOINC_LOOKUP_URL aponta para outro servidor de terminologia
 * que sirva o LOINC sem login, como o `https://tx.fhir.org/r4/CodeSystem/$lookup`
 * da HL7. Serve para quem adiciona um código e precisa gravar os eixos dele
 * no snapshot antes de abrir o PR, já que `loinc-axes.test.ts` recusa código
 * sem entrada. O servidor oficial continua sendo a referência: o workflow
 * mensal regrava tudo a partir dele.
 *
 * ## O que este check garante, e o que não garante
 *
 * Garante duas coisas:
 *
 *   1. **Existência** — o código resolve no servidor oficial. Pega erro de
 *      digitação e código aposentado.
 *   2. **Deriva** — o nome oficial, o status ou um dos seis eixos
 *      (componente, propriedade, tempo, sistema, escala, método) mudaram no
 *      LOINC desde que mapeamos.
 *      Transforma uma edição silenciosa de terceiro em check vermelho.
 *
 * **Não** garante adequação semântica: se `43583-4` é o código *certo* para
 * Lipoproteína (a) é revisão humana, e nenhum check verde diz que os
 * mapeamentos estão corretos. O que chega perto disso é
 * `packages/core/src/__tests__/loinc-axes.test.ts`, que lê os eixos gravados
 * aqui e confere, sem rede, se a propriedade do código combina com a unidade
 * declarada e se o sistema cabe na categoria: um código de líquido amniótico
 * num catálogo de soro falha ali, e passou por aqui durante seis meses.
 *
 * ## Por que o snapshot guarda o nome oficial
 *
 * Não é só para diagnosticar deriva. A licença do LOINC, seção 10.3, exige que
 * informação extraída do material licenciado venha sempre acompanhada do
 * identificador LOINC **e do display name correspondente** — um entre nome
 * totalmente especificado, SHORTNAME, LONG_COMMON_NAME ou DisplayName.
 *
 * Guardar só um hash do nome seria menor e suficiente para detectar mudança,
 * mas descumpriria essa cláusula. O snapshot carrega o aviso exigido pela
 * seção 10.1 junto dos dados, para viajar com eles.
 *
 * @see https://loinc.org/kb/license
 * @see https://fhir.loinc.org/
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BIOMARKER_DEFINITIONS } from '../packages/core/src/biomarkers.ts';
import { MAPPING_DECISIONS } from '../packages/core/src/mapping-decisions.ts';
import { gerarModuloDoSnapshot } from './generate-loinc-snapshot-module.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(__dirname, 'loinc-snapshot.json');

const LOINC_USER = process.env.LOINC_USER;
const LOINC_PASSWORD = process.env.LOINC_PASSWORD;
const LOOKUP_URL = process.env.LOINC_LOOKUP_URL ?? 'https://fhir.loinc.org/CodeSystem/$lookup';
/** O servidor oficial exige login; um alternativo em LOINC_LOOKUP_URL, não. */
const EXIGE_CREDENCIAL = !process.env.LOINC_LOOKUP_URL;

const UPDATE = process.argv.includes('--update');

// Exigido pela seção 10.1 da licença. Texto verbatim — não reescrever.
const LOINC_NOTICE =
  'This material contains content from LOINC (http://loinc.org). LOINC is ' +
  'copyright © Regenstrief Institute, Inc. and the Logical Observation ' +
  'Identifiers Names and Codes (LOINC) Committee and is available at no cost ' +
  'under the license at http://loinc.org/license. LOINC® is a registered ' +
  'United States trademark of Regenstrief Institute, Inc.';

// Status que o LOINC usa para código que não deve mais ser adotado.
const STATUS_PROIBIDOS = new Set(['DEPRECATED', 'DISCOURAGED']);

const EXIT_OK = 0;
const EXIT_FINDINGS = 1;
const EXIT_UNVERIFIABLE = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Os eixos do LOINC que o teste de adequação lê. Guardados como o LOINC os
 * exibe (`SCnc`, `Ser/Plas`, `Qn`), e não como código de parte (`LP6860-3`),
 * porque é assim que uma pessoa confere um achado e assim que o LOINC os
 * imprime na página do código.
 */
interface Axes {
  /** Classe do LOINC (`CHEM`, `HEM/BC`, `UA`): dela sai a seção de serviço do laudo. */
  class: string | null;
  component: string | null;
  method: string | null;
  property: string | null;
  scale: string | null;
  system: string | null;
  time: string | null;
}

/**
 * LOINC Groups (`LG…`) a que o código pertence, com o nome de cada um. O grupo
 * junta códigos que medem a mesma coisa e diferem num eixo que o agrupamento
 * ignora (método, sistema equivalente), e é onde se procura o irmão de um
 * código antes de trocar o mapeamento.
 */
type Groups = Record<string, string>;

interface LookupResult extends Partial<Axes> {
  /** Código respondeu que não existe. Diferente de não ter dado para perguntar. */
  ausente?: boolean;
  display?: string;
  /** Ausente quando o servidor não publica grupos, como o tx.fhir.org. */
  groups?: Groups;
  /** Falha de rede, auth ou 5xx: não dá para concluir nada sobre o código. */
  indisponivel?: string;
  status?: string;
  version?: string;
}

/** Nome das propriedades no `$lookup`, na ordem em que o snapshot as grava. */
const EIXOS: ReadonlyArray<[keyof Axes, string]> = [
  ['class', 'CLASS'],
  ['property', 'PROPERTY'],
  ['system', 'SYSTEM'],
  ['scale', 'SCALE_TYP'],
  ['method', 'METHOD_TYP'],
  ['time', 'TIME_ASPCT'],
  ['component', 'COMPONENT'],
];

/**
 * O servidor pode devolver um eixo como `valueCoding` com display, como
 * `valueString`, ou como `valueCode` com o código da parte (`LP6860-3`). No
 * último caso o display vem de um `$lookup` da própria parte, com cache,
 * porque as partes se repetem muito: 101 códigos do catálogo são Ser/Plas.
 */
const displayDePartes = new Map<string, string>();

/**
 * `Retry-After` tem duas formas na RFC 9110: segundos, ou HTTP-date. Só tratar
 * a primeira faz o servidor mandar a data e a gente cair no backoff genérico
 * sem perceber.
 *
 * Devolve `null` para valor ausente, malformado, ou data já passada — nesses
 * casos quem chama volta para o backoff exponencial, que é o comportamento
 * seguro.
 */
function segundosDeRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const bruto = header.trim();

  const segundos = Number(bruto);
  if (Number.isFinite(segundos)) return segundos > 0 ? segundos : null;

  const quando = Date.parse(bruto);
  if (Number.isNaN(quando)) {
    console.error(`  (Retry-After em formato inesperado: ${JSON.stringify(bruto)})`);
    return null;
  }
  const delta = Math.ceil((quando - Date.now()) / 1000);
  return delta > 0 ? delta : null;
}

/** Parâmetro `property` do $lookup vem como par code/value dentro de `part`. */
function lerPropriedade(parameters: unknown[], nome: string): string | undefined {
  for (const p of parameters) {
    const param = p as { name?: string; part?: { name?: string; [k: string]: unknown }[] };
    if (param.name !== 'property' || !Array.isArray(param.part)) continue;
    const code = param.part.find((x) => x.name === 'code');
    if ((code?.valueCode ?? code?.valueString) !== nome) continue;
    const value = param.part.find((x) => x.name === 'value');
    const coding = value?.valueCoding as { code?: string; display?: string } | undefined;
    const v =
      coding?.display ??
      coding?.code ??
      value?.valueString ??
      value?.valueCode ??
      value?.valueBoolean;
    if (v != null) return String(v);
  }
  return undefined;
}

const PARTE_LOINC = /^LP\d+-\d$/;
const GRUPO_LOINC = /^LG\d+-\d$/;

/**
 * O fhir.loinc.org publica os grupos como `parent` do código, ao lado dos
 * pais da hierarquia multiaxial (`LP…`). Só os `LG…` interessam aqui.
 */
function lerGrupos(parameters: unknown[]): Groups | undefined {
  const grupos: Groups = {};
  for (const p of parameters) {
    const param = p as { name?: string; part?: { name?: string; [k: string]: unknown }[] };
    if (param.name !== 'property' || !Array.isArray(param.part)) continue;
    const code = param.part.find((x) => x.name === 'code');
    if ((code?.valueCode ?? code?.valueString) !== 'parent') continue;
    const value = param.part.find((x) => x.name === 'value');
    const coding = value?.valueCoding as { code?: string; display?: string } | undefined;
    if (coding?.code && GRUPO_LOINC.test(coding.code)) {
      grupos[coding.code] = coding.display ?? coding.code;
    }
  }
  if (!Object.keys(grupos).length) return undefined;
  return Object.fromEntries(Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b)));
}

/** Display de uma parte do LOINC (`LP6860-3` → `SCnc`), com cache. */
async function displayDaParte(parte: string): Promise<string | LookupResult> {
  const emCache = displayDePartes.get(parte);
  if (emCache) return emCache;
  const r = await lookup(parte);
  if (r.indisponivel) return r;
  // Parte que não resolve ou vem sem nome: fica o código, que ainda é
  // comparável entre execuções, e o teste de eixos não o reconhece em nenhuma
  // classe, o que é a leitura certa para "não sei o que é".
  const display = r.display ?? parte;
  displayDePartes.set(parte, display);
  return display;
}

/** Os seis eixos de um código, já com as partes resolvidas em display. */
async function lerEixos(parameters: unknown[]): Promise<Axes | LookupResult> {
  const eixos: Axes = {
    class: null,
    component: null,
    method: null,
    property: null,
    scale: null,
    system: null,
    time: null,
  };
  for (const [campo, nome] of EIXOS) {
    const bruto = lerPropriedade(parameters, nome);
    if (bruto === undefined) continue;
    if (!PARTE_LOINC.test(bruto)) {
      eixos[campo] = bruto;
      continue;
    }
    const display = await displayDaParte(bruto);
    if (typeof display !== 'string') return display;
    eixos[campo] = display;
  }
  return eixos;
}

async function lookup(code: string): Promise<LookupResult> {
  if (EXIGE_CREDENCIAL && (!LOINC_USER || !LOINC_PASSWORD)) {
    return { indisponivel: 'LOINC_USER/LOINC_PASSWORD ausentes no ambiente' };
  }
  const auth =
    LOINC_USER && LOINC_PASSWORD
      ? {
          Authorization: `Basic ${Buffer.from(`${LOINC_USER}:${LOINC_PASSWORD}`).toString('base64')}`,
        }
      : {};
  const url = `${LOOKUP_URL}?system=http://loinc.org&code=${encodeURIComponent(code)}`;

  const ATTEMPTS = 4;
  let ultimoErro = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/fhir+json', ...auth },
        signal: AbortSignal.timeout(30_000),
      });

      // 401/403 é configuração errada, não código inexistente. Não adianta repetir.
      if (res.status === 401 || res.status === 403) {
        return { indisponivel: `autenticação recusada (HTTP ${res.status})` };
      }
      if (res.status === 429 || res.status >= 500) {
        // Se o servidor disser quanto esperar, obedecer é melhor que chutar
        // backoff: evita tanto voltar cedo demais quanto dormir à toa.
        const espera = segundosDeRetryAfter(res.headers.get('retry-after'));
        if (espera != null && attempt < ATTEMPTS) {
          await sleep(Math.min(espera, 60) * 1000);
          continue;
        }
        throw new Error(`LOINC respondeu ${res.status}`);
      }

      const data = (await res.json()) as {
        resourceType?: string;
        issue?: { severity?: string }[];
        parameter?: unknown[];
      };

      if (data.resourceType === 'OperationOutcome') {
        // FHIR define fatal | error | warning | information. As duas primeiras
        // são o servidor dizendo que a consulta não resolveu.
        const erro = data.issue?.some((i) => i.severity === 'error' || i.severity === 'fatal');
        // Resposta legítima do servidor: o código não existe.
        if (erro) return { ausente: true };
        // OperationOutcome só com warning/information é forma inesperada.
        // Tratar como ausente acusaria o código de inexistente e derrubaria o
        // build sobre um dado que talvez esteja certo; "não deu para conferir"
        // é a leitura honesta.
        return { indisponivel: 'OperationOutcome sem issue de erro nem fatal' };
      }

      if (!Array.isArray(data.parameter)) {
        return { indisponivel: 'resposta sem `parameter`' };
      }

      const displayParam = data.parameter.find(
        (p) => (p as { name?: string }).name === 'display',
      ) as { valueString?: string } | undefined;
      const versionParam = data.parameter.find(
        (p) => (p as { name?: string }).name === 'version',
      ) as { valueString?: string } | undefined;

      // Parte do LOINC (`LP…`) não tem eixos, e perguntá-los recursivamente
      // só gastaria chamadas.
      const eixos = PARTE_LOINC.test(code) ? {} : await lerEixos(data.parameter);
      if ('indisponivel' in eixos) return eixos;

      return {
        ...eixos,
        display: displayParam?.valueString,
        groups: lerGrupos(data.parameter),
        status: lerPropriedade(data.parameter, 'STATUS'),
        version: versionParam?.valueString,
      };
    } catch (err) {
      ultimoErro = err instanceof Error ? err.message : String(err);
      if (attempt < ATTEMPTS) await sleep(500 * 2 ** (attempt - 1));
    }
  }
  return { indisponivel: ultimoErro || 'tentativas esgotadas' };
}

interface Snapshot {
  /**
   * Presente só enquanto os eixos vieram de outra fonte que o display: em
   * out/2026 eles foram preenchidos a partir do tx.fhir.org (LOINC 2.82),
   * porque o fhir.loinc.org exige credencial e a conta fica no CI. Some na
   * próxima gravação pelo workflow, que escreve tudo da mesma consulta.
   */
  _axesNote?: string;
  _checkedAt: string;
  _loincVersion: string | null;
  _notice: string;
  codes: Record<string, { display: string; groups?: Groups; status: string | null } & Axes>;
}

function lerSnapshot(): Snapshot | null {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot;
}

async function main() {
  // As variantes por método entram como entradas próprias, com o código do
  // biomarcador ao lado: são códigos que o catálogo emite, e precisam do mesmo
  // check de existência e deriva que o código sem método.
  const comLoinc = [
    ...BIOMARKER_DEFINITIONS.filter((b) => b.loinc),
    ...BIOMARKER_DEFINITIONS.flatMap((b) =>
      (b.methodVariants ?? []).map((v) => ({ code: b.code, loinc: v.loinc })),
    ),
  ];
  const emitidos = new Set(comLoinc.map((b) => String(b.loinc)));
  // Os irmãos rejeitados no registro de decisão também entram: a rejeição só
  // vale como evidência se o código existe, e a ficha mostra os eixos dele ao
  // lado do escolhido. Não são emitidos, então status DEPRECATED não falha.
  for (const [code, d] of Object.entries(MAPPING_DECISIONS)) {
    for (const s of d.siblingsRejected) {
      if (!emitidos.has(s.loinc)) comLoinc.push({ code: `${code} (rejeitado)`, loinc: s.loinc });
    }
  }
  comLoinc.sort((a, b) => String(a.loinc).localeCompare(String(b.loinc)));

  const unicosDoCatalogo = new Set(comLoinc.map((b) => String(b.loinc)));

  // Código sozinho não diz nada a quem for consertar: o catálogo é indexado por
  // biomarcador, não por LOINC.
  const biomarcadoresDe = (loinc: string) =>
    comLoinc
      .filter((b) => String(b.loinc) === loinc)
      .map((b) => b.code)
      .join(', ') || '?';

  console.error(
    `Consultando ${unicosDoCatalogo.size} códigos LOINC únicos (${comLoinc.length} biomarcadores)…`,
  );

  const vivos = new Map<string, LookupResult>();
  let indisponibilidade: string | null = null;

  for (const b of comLoinc) {
    const code = String(b.loinc);
    if (vivos.has(code)) continue;
    const r = await lookup(code);
    if (r.indisponivel) {
      // Não dá para distinguir "mudou" de "não perguntei". Para tudo.
      indisponibilidade = `${code}: ${r.indisponivel}`;
      break;
    }
    vivos.set(code, r);
    await sleep(120);
  }

  if (indisponibilidade) {
    console.error(`\nNÃO VERIFICADO — ${indisponibilidade}`);
    console.error('Nenhuma conclusão sobre os códigos nesta execução.');
    process.exitCode = EXIT_UNVERIFIABLE;
    return;
  }

  if (UPDATE) {
    const codes: Snapshot['codes'] = {};
    // Os dois casos pedem ações opostas e não podem sair no mesmo balde:
    // código que não resolve é dado errado nosso, e vai para PR corrigindo o
    // catálogo. Código que resolve sem display é resposta inesperada do
    // servidor, e vai para investigação do lado deles.
    const naoResolvem: string[] = [];
    const semDisplay: string[] = [];
    for (const [code, r] of [...vivos].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (r.ausente) {
        naoResolvem.push(code);
        continue;
      }
      if (!r.display) {
        semDisplay.push(code);
        continue;
      }
      codes[code] = {
        class: r.class ?? null,
        component: r.component ?? null,
        display: r.display,
        ...(r.groups && { groups: r.groups }),
        method: r.method ?? null,
        property: r.property ?? null,
        scale: r.scale ?? null,
        status: r.status ?? null,
        system: r.system ?? null,
        time: r.time ?? null,
      };
    }
    const semNome = [...naoResolvem, ...semDisplay];
    if (semNome.length) {
      console.error(`\nNão dá para gravar snapshot: ${semNome.length} código(s) sem nome oficial.`);
      if (naoResolvem.length) {
        console.error(`\nNÃO RESOLVEM no LOINC (${naoResolvem.length}) — dado errado no catálogo:`);
        for (const c of naoResolvem) console.error(`  - ${c}  (${biomarcadoresDe(c)})`);
        console.error('  Conferir o código na fonte e corrigir o catálogo.');
      }
      if (semDisplay.length) {
        console.error(
          `\nRESOLVEM mas sem display name (${semDisplay.length}) — resposta inesperada:`,
        );
        for (const c of semDisplay) console.error(`  - ${c}  (${biomarcadoresDe(c)})`);
        console.error('  O código existe; o servidor é que não devolveu nome.');
      }
      console.error('\nA licença (10.3) exige o display name junto do código.');
      process.exitCode = EXIT_FINDINGS;
      return;
    }
    // A invariante que importa é contra o catálogo, não contra `vivos`: toda
    // entrada de `vivos` já cai em `codes` ou em `semNome`, e `semNome` sai
    // antes daqui, então comparar com `vivos.size` seria sempre verdadeiro.
    //
    // Snapshot cobrindo menos códigos do que o catálogo declara é pior que
    // snapshot nenhum: o check seguinte passaria verde sem conferir o que ficou
    // de fora.
    if (Object.keys(codes).length !== unicosDoCatalogo.size) {
      console.error(
        `\nNão dá para gravar snapshot: o catálogo declara ${unicosDoCatalogo.size} códigos únicos e eu montei ${Object.keys(codes).length}.`,
      );
      process.exitCode = EXIT_FINDINGS;
      return;
    }
    const versao = [...vivos.values()].find((r) => r.version)?.version ?? null;
    const snapshot: Snapshot = {
      _checkedAt: new Date().toISOString().slice(0, 10),
      _loincVersion: versao,
      _notice: LOINC_NOTICE,
      codes,
    };
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    // O core publica uma cópia do snapshot; sem regravar aqui, o PR do
    // workflow sairia com o módulo defasado e o teste de sincronia vermelho.
    await gerarModuloDoSnapshot();
    console.error(
      `\nSnapshot gravado: ${Object.keys(codes).length} códigos, LOINC ${versao ?? '?'}`,
    );
    process.exitCode = EXIT_OK;
    return;
  }

  const snapshot = lerSnapshot();
  if (!snapshot) {
    console.error(`\nSnapshot ausente em ${SNAPSHOT_PATH}. Rode o workflow em modo update.`);
    process.exitCode = EXIT_FINDINGS;
    return;
  }

  const ausentes: string[] = [];
  const proibidos: { code: string; status: string }[] = [];
  const derivas: { code: string; de: string; para: string; campo: string }[] = [];
  const novos: string[] = [];

  for (const [code, r] of vivos) {
    if (r.ausente) {
      ausentes.push(code);
      continue;
    }
    if (emitidos.has(code) && r.status && STATUS_PROIBIDOS.has(r.status.toUpperCase())) {
      proibidos.push({ code, status: r.status });
    }
    const antigo = snapshot.codes[code];
    if (!antigo) {
      novos.push(code);
      continue;
    }
    if (r.display && r.display !== antigo.display) {
      derivas.push({ campo: 'display', code, de: antigo.display, para: r.display });
    }
    const statusVivo = r.status ?? null;
    if (statusVivo !== antigo.status) {
      derivas.push({
        campo: 'status',
        code,
        de: String(antigo.status),
        para: String(statusVivo),
      });
    }
    // Eixo que muda é deriva do mesmo peso que nome: um código que troca de
    // propriedade deixou de medir o que o catálogo declara.
    for (const [campo] of EIXOS) {
      const vivo = r[campo] ?? null;
      if (vivo !== antigo[campo]) {
        derivas.push({ campo, code, de: String(antigo[campo]), para: String(vivo) });
      }
    }
    // Grupo só é comparável quando os dois lados vieram de servidor que o
    // publica; o tx.fhir.org não publica, e isso não é deriva.
    if (r.groups && antigo.groups) {
      const de = Object.keys(antigo.groups).join(', ');
      const para = Object.keys(r.groups).join(', ');
      if (de !== para) derivas.push({ campo: 'groups', code, de, para });
    }
  }

  const problemas = ausentes.length + proibidos.length + derivas.length + novos.length;
  if (!problemas) {
    console.error(`\nOK — ${vivos.size} códigos conferem com o snapshot.`);
    process.exitCode = EXIT_OK;
    return;
  }

  console.error('');
  for (const c of ausentes) console.error(`NÃO RESOLVE   ${c} — não existe no LOINC`);
  for (const p of proibidos) console.error(`STATUS        ${p.code} — ${p.status}`);
  for (const d of derivas) {
    console.error(`DERIVA        ${d.code} ${d.campo}: "${d.de}" → "${d.para}"`);
  }
  for (const c of novos) {
    console.error(`FORA DO SNAP  ${c} — resolveu agora, mas não está no snapshot`);
  }
  console.error(
    '\nAceitar qualquer uma destas mudanças é PR revisado: rode o workflow LOINC em' +
      '\nworkflow_dispatch com update: true.' +
      '\n\nCódigo fora do snapshot aparece aqui de propósito. Ele resolveu nesta execução,' +
      '\nentão existe — o que falta é ter passado por revisão humana: entrou no catálogo' +
      '\nsem ninguém conferir se serve para o analito que medimos, e existir no LOINC não' +
      '\nquer dizer ser o código certo. O PR do snapshot é onde esse olhar acontece.',
  );
  process.exitCode = EXIT_FINDINGS;
}

await main();
