/**
 * Gera o ValueSet BRCID10MetabolicoVS a partir dos CSVs do DATASUS.
 *
 * Uso: npx tsx ig/scripts/generate-cid10-valueset.ts
 *
 * Pré-requisito: rodar ig/scripts/fetch-terminologies.sh para baixar os CSVs.
 *
 * Lê CID-10-CATEGORIAS.CSV e CID-10-SUBCATEGORIAS.CSV (ISO-8859-1, separador ;),
 * filtra as categorias metabólicas relevantes e gera
 * ig/input/fsh/valuesets/BRCID10MetabolicoVS.fsh.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, 'data', 'cid10');
const OUTPUT_PATH = resolve(
  __dirname,
  '..',
  'input',
  'fsh',
  'valuesets',
  'BRCID10MetabolicoVS.fsh',
);

// Prefixos CID-10 relevantes para diagnósticos metabólicos
const CATEGORY_PREFIXES = [
  'D50', // Anemia por deficiência de ferro
  'D51', // Anemia por deficiência de vitamina B12
  'D52', // Anemia por deficiência de folato
  'E01', // Doenças tireoidianas — deficiência de iodo
  'E02', // Hipotireoidismo subclínico
  'E03', // Outro hipotireoidismo
  'E05', // Tireotoxicose
  'E06', // Tireoidite
  'E10', // DM tipo 1
  'E11', // DM tipo 2
  'E13', // Outros DM especificados
  'E14', // DM não especificado
  'E53', // Deficiência de vitaminas do grupo B
  'E55', // Deficiência de vitamina D
  'E56', // Outras deficiências vitamínicas
  'E61', // Deficiência de outros elementos nutrientes
  'E66', // Obesidade
  'E78', // Distúrbios do metabolismo de lipoproteínas
  'E79', // Distúrbios do metabolismo de purina e pirimidina
  'M10', // Gota
];

interface CidEntry {
  code: string;
  description: string;
}

function readCsv(filename: string): CidEntry[] {
  const filePath = resolve(DATA_DIR, filename);
  const buffer = readFileSync(filePath);
  // DATASUS distribui em ISO-8859-1
  const content = new TextDecoder('iso-8859-1').decode(buffer);

  const entries: CidEntry[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Formato: CÓDIGO;DESCRIÇÃO (pode haver mais campos)
    const parts = trimmed.split(';');
    const code = parts[0]?.trim();
    const description = parts[1]?.trim();

    if (!code || !description) continue;
    // Ignorar cabeçalho
    if (code === 'CAT' || code === 'SUBCAT') continue;

    entries.push({ code, description });
  }

  return entries;
}

function matchesPrefix(code: string): boolean {
  return CATEGORY_PREFIXES.some((prefix) => code.startsWith(prefix));
}

function generateFsh(entries: CidEntry[]): string {
  const lines: string[] = [
    'ValueSet: BRCID10MetabolicoVS',
    'Id: cid10-metabolico-vs',
    'Title: "CID-10 Diagnósticos Metabólicos ValueSet"',
    `Description: "Subconjunto de códigos CID-10 para diagnósticos metabólicos comumente associados a exames laboratoriais. Gerado automaticamente a partir de ${entries.length} códigos CID-10 do DATASUS."`,
    '* ^copyright = "Os direitos de publicação e distribuição da CID-10 em português pertencem à Edusp - Editora da Universidade de São Paulo. Os arquivos eletrônicos elaborados pelo CBCD podem ser utilizados livremente em instalações de usuários e por desenvolvedores de sistemas, desde que sejam dados os devidos créditos e não seja cobrado pelo seu uso."',
    '',
  ];

  let currentPrefix = '';
  for (const entry of entries) {
    const prefix = entry.code.substring(0, 3);
    if (prefix !== currentPrefix) {
      currentPrefix = prefix;
      lines.push(`// ${prefix}`);
    }
    // Escapar aspas duplas na descrição
    const desc = entry.description.replace(/"/g, "'");
    lines.push(`* $ICD10#${entry.code} "${desc}"`);
  }

  lines.push('');
  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────

try {
  readFileSync(resolve(DATA_DIR, 'CID-10-CATEGORIAS.CSV'));
} catch {
  // eslint-disable-next-line no-console
  console.error(
    'Erro: CSVs do CID-10 não encontrados. Rode primeiro:\n  bash ig/scripts/fetch-terminologies.sh',
  );
  process.exit(1);
}

const categories = readCsv('CID-10-CATEGORIAS.CSV');
const subcategories = readCsv('CID-10-SUBCATEGORIAS.CSV');

const allEntries = [...categories, ...subcategories]
  .filter((e) => matchesPrefix(e.code))
  .sort((a, b) => a.code.localeCompare(b.code));

// Remover duplicatas (categorias podem aparecer em ambos os arquivos)
const seen = new Set<string>();
const unique = allEntries.filter((e) => {
  if (seen.has(e.code)) return false;
  seen.add(e.code);
  return true;
});

const fsh = generateFsh(unique);
writeFileSync(OUTPUT_PATH, fsh, 'utf-8');

// eslint-disable-next-line no-console
console.log(`Gerado BRCID10MetabolicoVS.fsh com ${unique.length} códigos CID-10 em ${OUTPUT_PATH}`);
