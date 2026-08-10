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
 * ## O que este check garante, e o que não garante
 *
 * Garante duas coisas:
 *
 *   1. **Existência** — o código resolve no servidor oficial. Pega erro de
 *      digitação e código aposentado.
 *   2. **Deriva** — o nome oficial ou o status mudaram no LOINC desde que
 *      mapeamos. Transforma uma edição silenciosa de terceiro em check
 *      vermelho.
 *
 * **Não** garante adequação semântica: se `43583-4` é o código *certo* para
 * Lipoproteína (a) é revisão humana, e nenhum check verde diz que os
 * mapeamentos estão corretos.
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(__dirname, 'loinc-snapshot.json');

const LOINC_USER = process.env.LOINC_USER;
const LOINC_PASSWORD = process.env.LOINC_PASSWORD;
const LOOKUP_URL = 'https://fhir.loinc.org/CodeSystem/$lookup';

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

interface LookupResult {
  /** Código respondeu que não existe. Diferente de não ter dado para perguntar. */
  ausente?: boolean;
  display?: string;
  /** Falha de rede, auth ou 5xx: não dá para concluir nada sobre o código. */
  indisponivel?: string;
  status?: string;
  version?: string;
}

/** Parâmetro `property` do $lookup vem como par code/value dentro de `part`. */
function lerPropriedade(parameters: unknown[], nome: string): string | undefined {
  for (const p of parameters) {
    const param = p as { name?: string; part?: { name?: string; [k: string]: unknown }[] };
    if (param.name !== 'property' || !Array.isArray(param.part)) continue;
    const code = param.part.find((x) => x.name === 'code');
    if ((code?.valueCode ?? code?.valueString) !== nome) continue;
    const value = param.part.find((x) => x.name === 'value');
    const v = value?.valueString ?? value?.valueCode ?? value?.valueBoolean;
    if (v != null) return String(v);
  }
  return undefined;
}

async function lookup(code: string): Promise<LookupResult> {
  if (!LOINC_USER || !LOINC_PASSWORD) {
    return { indisponivel: 'LOINC_USER/LOINC_PASSWORD ausentes no ambiente' };
  }
  const auth = Buffer.from(`${LOINC_USER}:${LOINC_PASSWORD}`).toString('base64');
  const url = `${LOOKUP_URL}?system=http://loinc.org&code=${encodeURIComponent(code)}`;

  const ATTEMPTS = 4;
  let ultimoErro = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/fhir+json', Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(30_000),
      });

      // 401/403 é configuração errada, não código inexistente. Não adianta repetir.
      if (res.status === 401 || res.status === 403) {
        return { indisponivel: `autenticação recusada (HTTP ${res.status})` };
      }
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`LOINC respondeu ${res.status}`);
      }

      const data = (await res.json()) as {
        resourceType?: string;
        issue?: { severity?: string }[];
        parameter?: unknown[];
      };

      if (data.resourceType === 'OperationOutcome') {
        const erro = data.issue?.some((i) => i.severity === 'error');
        // Resposta legítima do servidor: o código não existe.
        if (erro) return { ausente: true };
        return { indisponivel: 'OperationOutcome sem issue de erro' };
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

      return {
        display: displayParam?.valueString,
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
  _checkedAt: string;
  _loincVersion: string | null;
  _notice: string;
  codes: Record<string, { display: string; status: string | null }>;
}

function lerSnapshot(): Snapshot | null {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as Snapshot;
}

async function main() {
  const comLoinc = BIOMARKER_DEFINITIONS.filter((b) => b.loinc).sort((a, b) =>
    String(a.loinc).localeCompare(String(b.loinc)),
  );

  console.error(`Consultando ${comLoinc.length} códigos LOINC…`);

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
    const semNome: string[] = [];
    for (const [code, r] of [...vivos].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (r.ausente || !r.display) {
        semNome.push(code);
        continue;
      }
      codes[code] = { display: r.display, status: r.status ?? null };
    }
    if (semNome.length) {
      console.error(`\nNão dá para gravar snapshot: ${semNome.length} código(s) sem nome oficial.`);
      for (const c of semNome) console.error(`  - ${c}`);
      console.error('A licença (10.3) exige o display name junto do código.');
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
    if (r.status && STATUS_PROIBIDOS.has(r.status.toUpperCase())) {
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
  for (const c of novos) console.error(`FORA DO SNAP  ${c} — rode o modo update`);
  console.error(
    '\nAceitar mudança de nome ou status é PR revisado: rode o workflow em modo update.',
  );
  process.exitCode = EXIT_FINDINGS;
}

await main();
