/* eslint-disable no-console -- script de CLI: a saída é o produto */
/**
 * Fonte única dos números do catálogo: quantos biomarcadores existem, quantos
 * têm código LOINC, quantas faixas de referência, quantas seções de serviço.
 *
 * Uso: pnpm catalog:counts          # regrava o bloco gerado no README.md
 *      pnpm catalog:counts --json   # imprime os números, não escreve nada
 *      pnpm catalog:check           # regrava e falha se o versionado divergir
 *
 * Existe porque os mesmos números circulavam em quatro formulações diferentes,
 * e nenhuma batia com o pacote publicado. O README dizia "200+ biomarcadores
 * com códigos LOINC" quando 38 dos 225 não têm código nenhum, "580+ testes",
 * e um deck herdou "153 de 164, 93,3%", que era o escopo de um crosswalk de
 * abril de 2026 no datasus-sdk e não o catálogo. Um número sem denominador não
 * dá para conferir, e a plateia de uma conferência de terminologia confere.
 *
 * O bloco gerado no README é a formulação canônica. Quem for montar deck cita
 * dali, e o `catalog:check` no CI quebra quando o catálogo anda e o texto não.
 *
 * Lê o source direto, como o generate-valueset.ts: é ferramenta de build, não
 * código de runtime. A extensão .ts explícita deixa o type stripping nativo do
 * Node dar conta sem runner de TypeScript.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// O reference-ranges.ts importa './units' sem extensão, que o bundler resolve e
// o Node cru não. Em vez de mexer no source por causa de um script de
// manutenção, o hook tenta o mesmo caminho com .ts antes de desistir.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts') && context.parentURL) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return { shortCircuit: true, url: candidate.href };
      }
    }
    return next(specifier, context);
  },
});

// Import dinâmico, e não estático, porque import estático é içado para antes do
// registerHooks acima e o hook não pegaria a resolução.
const { BIOMARKER_DEFINITIONS, getAllLoincCodes } =
  await import('../packages/core/src/biomarkers.ts');
const { diagnosticSectionOf } = await import('../packages/core/src/diagnostic-sections.ts');
const { defaultReferenceRanges } = await import('../packages/core/src/reference-ranges.ts');
const { MAPPING_DECISIONS, NO_LOINC_DECISIONS } =
  await import('../packages/core/src/mapping-decisions.ts');

const __dirname = dirname(fileURLToPath(import.meta.url));
const README = resolve(__dirname, '../README.md');
// O site repetia os mesmos números à mão e chegou a divergir do README em três
// campos ao mesmo tempo. Agora consome este JSON, que sai do mesmo gerador.
const SITE_JSON = resolve(__dirname, '../site/src/data/catalog-counts.json');
const START = '<!-- catalog:counts:start -->';
const END = '<!-- catalog:counts:end -->';

const version = JSON.parse(
  readFileSync(resolve(__dirname, '../packages/core/package.json'), 'utf8'),
).version as string;

const total = BIOMARKER_DEFINITIONS.length;
const withLoinc = BIOMARKER_DEFINITIONS.filter((d) => d.loinc).length;
const withoutLoinc = total - withLoinc;
// Uma casa decimal: com duas o número muda a cada biomarcador acrescentado e
// o bloco fica sujando diff sem que nada de relevante tenha mudado.
const loincPct = ((withLoinc / total) * 100).toFixed(1).replace('.', ',');
const ranges = Object.keys(defaultReferenceRanges).length;
// Inclui os aliases e as variantes por método: o LDH carrega o 2532-0 antigo,
// que o LOINC marca como DISCOURAGED, e o LDL os três códigos por método (ver
// `methodVariants`), além do código canônico. Por isso a contagem de códigos
// aceitos é maior que a de biomarcadores com código.
const acceptedLoincCodes = getAllLoincCodes().length;

// O registro de decisão diz quanto do catálogo tem justificativa além do nome.
// "Só nome" é a maioria, e é o número honesto: o código foi escolhido pelo nome
// do exame, sem unidade, material, método ou bula registrados.
const decisions = Object.values(MAPPING_DECISIONS);
const nameOnly = decisions.filter(
  (d) => d.evidence.length === 1 && d.evidence[0] === 'name',
).length;
const withEvidence = decisions.length - nameOnly;
const reviewed = decisions.filter((d) => d.reviewer).length;

const NO_LOINC_LABEL: Record<string, string> = {
  ambiguous: 'há candidatos, e nenhum é a mesma grandeza',
  'no-concept': 'procurado, e o LOINC não tem o conceito',
  'not-lab': 'fora do escopo de exame laboratorial',
  'pending-review': 'ninguém registrou a busca',
};
const gaps = BIOMARKER_DEFINITIONS.filter((d) => !d.loinc).map((d) => ({
  code: d.code,
  note: NO_LOINC_DECISIONS[d.code]?.note ?? '',
  reason: NO_LOINC_DECISIONS[d.code]?.reason ?? 'pending-review',
}));
const gapsByReason = Object.keys(NO_LOINC_LABEL)
  .map((reason) => ({ reason, rows: gaps.filter((g) => g.reason === reason) }))
  .filter((g) => g.rows.length);

// Seção de serviço diagnóstico (HL7 v2-0074), a que vai em
// `DiagnosticReport.category`. Nome em pt-BR só aqui, para o README.
const SECTION_PT: Record<string, string> = {
  BLB: 'Banco de sangue',
  CH: 'Bioquímica',
  CT: 'Tomografia',
  GE: 'Genética',
  HM: 'Hematologia',
  IMM: 'Imunologia',
  LAB: 'Laboratório',
  MB: 'Microbiologia',
  OTH: 'Outros (medida corporal)',
  RAD: 'Radiologia (densitometria)',
  SR: 'Sorologia',
  TX: 'Toxicologia',
  URN: 'Urinálise',
};
const bySection = new Map<string, (typeof BIOMARKER_DEFINITIONS)[number][]>();
for (const d of BIOMARKER_DEFINITIONS) {
  const section = diagnosticSectionOf(d.code) ?? '—';
  bySection.set(section, [...(bySection.get(section) ?? []), d]);
}
const rows = [...bySection]
  .map(([section, matched]) => ({
    count: matched.length,
    examples: matched.slice(0, 5).map((d) => d.code),
    pt: SECTION_PT[section] ?? section,
    section,
    withLoinc: matched.filter((d) => d.loinc).length,
  }))
  .sort((a, b) => b.count - a.count || a.section.localeCompare(b.section));

const block = [
  START,
  '',
  `Medido no \`@precisa-saude/fhir@${version}\`, gerado por \`pnpm catalog:counts\`.`,
  '',
  `- **${total} biomarcadores** definidos, dos quais **${withLoinc} têm código LOINC** (${loincPct}%) e ${withoutLoinc} não têm.`,
  `- **${acceptedLoincCodes} códigos LOINC aceitos** na busca por código: os ${withLoinc} canônicos, as variantes por método e os aliases de códigos que o LOINC aposentou.`,
  `- **${ranges} faixas de referência**, com variantes por sexo e idade.`,
  `- **${rows.length} seções de serviço** (HL7 v2-0074), a categoria que sai no \`DiagnosticReport\`: da classe do LOINC, ou declarada no exame sem LOINC.`,
  `- **Registro de decisão** dos ${withLoinc} mapeamentos: ${withEvidence} com evidência além do nome (unidade, material, método ou bula), ${nameOnly} escolhidos só pelo nome, ${reviewed} com revisão independente. A ficha de cada um sai em \`fhir-bio decision <código>\`.`,
  '',
  '| Seção | Biomarcadores | Com LOINC | Exemplos |',
  '| ----- | ------------: | --------: | -------- |',
  ...rows.map(
    (r) =>
      `| ${r.pt} (\`${r.section}\`) | ${r.count} | ${r.withLoinc} | ${r.examples.join(', ')} |`,
  ),
  `| **Total** | **${total}** | **${withLoinc}** | |`,
  '',
  `### Os ${withoutLoinc} sem LOINC, e por quê`,
  '',
  ...gapsByReason.flatMap((g) => [
    `**${g.reason}** (${g.rows.length}): ${NO_LOINC_LABEL[g.reason]}.`,
    '',
    '| Biomarcador | Motivo |',
    '| ----------- | ------ |',
    ...g.rows.map((row) => `| \`${row.code}\` | ${row.note} |`),
    '',
  ]),
  END,
].join('\n');

const counts = {
  acceptedLoincCodes,
  biomarkers: total,
  bySection: rows,
  decisions: { nameOnly, reviewed, withEvidence },
  loincCoveragePct: Number(((withLoinc / total) * 100).toFixed(1)),
  referenceRanges: ranges,
  sections: rows.length,
  version,
  withLoinc,
  withoutLoinc,
  withoutLoincByReason: Object.fromEntries(gapsByReason.map((g) => [g.reason, g.rows.length])),
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(counts, null, 2));
  process.exit(0);
}

// Passa a saída pelo prettier antes de escrever. Sem isso os dois checks brigam:
// o `format` realinha a tabela markdown e reindenta o JSON, o gerador reescreve
// no formato cru, e cada um reprova depois que o outro roda.
const prettier = await import('prettier');
const format = async (source: string, filepath: string): Promise<string> =>
  prettier.format(source, {
    ...(await prettier.resolveConfig(filepath)),
    filepath,
  });

const readme = readFileSync(README, 'utf8');
const startAt = readme.indexOf(START);
const endAt = readme.indexOf(END);

if (startAt === -1 || endAt === -1) {
  console.error(`Marcadores ${START} / ${END} não encontrados em README.md.`);
  process.exit(1);
}

const updated = await format(
  readme.slice(0, startAt) + block + readme.slice(endAt + END.length),
  README,
);

const written: string[] = [];

if (updated !== readme) {
  writeFileSync(README, updated, 'utf8');
  written.push('README.md');
}

const siteJson = await format(JSON.stringify(counts), SITE_JSON);
if (!existsSync(SITE_JSON) || readFileSync(SITE_JSON, 'utf8') !== siteJson) {
  writeFileSync(SITE_JSON, siteJson, 'utf8');
  written.push('site/src/data/catalog-counts.json');
}

console.log(
  written.length === 0
    ? `Tudo sincronizado com o catálogo (${total} biomarcadores).`
    : `Regravado a partir do catálogo (${total} biomarcadores): ${written.join(', ')}.`,
);
