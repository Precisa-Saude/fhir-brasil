/**
 * Gera o CodeSystem BRIBGEMunicipioCS completo a partir do JSON da API do IBGE.
 *
 * Uso: npx tsx ig/scripts/generate-ibge-municipios-cs.ts
 *
 * Pré-requisito: rodar ig/scripts/fetch-terminologies.sh para baixar o JSON.
 *
 * Lê municipios.json (API IBGE view=nivelado) e gera
 * ig/input/fsh/codesystems/BRIBGEMunicipioCS.fsh com todos os municípios.
 *
 * NOTA: O CodeSystem gerado usa content = #complete (5570+ códigos).
 * Isso produz um arquivo FSH grande (~200 KB). Se a compilação SUSHI
 * ficar lenta, considere manter o stub #not-present e mover os códigos
 * para um JSON resource em ig/input/resources/.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, 'data', 'ibge');
const OUTPUT_PATH = resolve(
  __dirname,
  '..',
  'input',
  'fsh',
  'codesystems',
  'BRIBGEMunicipioCS.fsh',
);

interface MunicipioNivelado {
  'municipio-id': number;
  'municipio-nome': string;
  'UF-nome': string;
  'UF-sigla': string;
}

// ── Main ──────────────────────────────────────────────────────

const jsonPath = resolve(DATA_DIR, 'municipios.json');

try {
  readFileSync(jsonPath);
} catch {
  // eslint-disable-next-line no-console
  console.error(
    'Erro: municipios.json não encontrado. Rode primeiro:\n  bash ig/scripts/fetch-terminologies.sh',
  );
  process.exit(1);
}

const raw = readFileSync(jsonPath, 'utf-8');
const parsed: unknown = JSON.parse(raw);

if (!Array.isArray(parsed) || parsed.length === 0) {
  // eslint-disable-next-line no-console
  console.error('Erro: JSON do IBGE está vazio ou não é um array.');
  process.exit(1);
}

// Validar estrutura do primeiro registro
const first = parsed[0] as Record<string, unknown>;
if (
  typeof first['municipio-id'] !== 'number' ||
  typeof first['municipio-nome'] !== 'string' ||
  typeof first['UF-sigla'] !== 'string' ||
  typeof first['UF-nome'] !== 'string'
) {
  // eslint-disable-next-line no-console
  console.error(
    'Erro: formato inesperado do JSON do IBGE. Campos esperados: municipio-id, municipio-nome, UF-sigla, UF-nome',
  );
  process.exit(1);
}

const municipios = parsed as MunicipioNivelado[];

// Ordenar por código IBGE
municipios.sort((a, b) => a['municipio-id'] - b['municipio-id']);

const lines: string[] = [
  'CodeSystem: BRIBGEMunicipioCS',
  'Id: ibge-municipio',
  'Title: "IBGE — Códigos de Município"',
  `Description: "Códigos de município do IBGE. Gerado automaticamente a partir de ${municipios.length} municípios da API servicodados.ibge.gov.br."`,
  '* ^url = "https://fhir-brasil.dev.br/CodeSystem/ibge-municipio"',
  '* ^status = #active',
  '* ^content = #complete',
  '* ^caseSensitive = true',
  '* ^publisher = "Instituto Brasileiro de Geografia e Estatística (IBGE)"',
  '* ^copyright = "Dados governamentais federais de domínio público."',
  '',
];

let currentUf = '';
for (const m of municipios) {
  const uf = m['UF-sigla'];
  if (uf !== currentUf) {
    currentUf = uf;
    lines.push(`// ${m['UF-nome']} (${uf})`);
  }
  const code = String(m['municipio-id']);
  const name = m['municipio-nome'].replace(/"/g, "'");
  lines.push(`* #${code} "${name}"`);
}

lines.push('');

writeFileSync(OUTPUT_PATH, lines.join('\n'), 'utf-8');

// eslint-disable-next-line no-console
console.log(`Gerado BRIBGEMunicipioCS.fsh com ${municipios.length} municípios em ${OUTPUT_PATH}`);
