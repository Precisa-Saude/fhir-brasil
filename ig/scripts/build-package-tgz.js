#!/usr/bin/env node

/**
 * Monta um pacote FHIR NPM (.tgz) a partir do output do SUSHI.
 *
 * Entrada: ig/output/fsh-generated/resources/*.json + ig/sushi-config.yaml
 * Saída:   ig/output/package.tgz
 *
 * Segue a FHIR NPM Package Spec:
 * https://confluence.hl7.org/display/FHIR/NPM+Package+Specification
 */

import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  rmSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const RESOURCES_DIR = join(ROOT, 'output', 'fsh-generated', 'resources');
const PACKAGE_DIR = join(ROOT, 'output', 'package');
const OUTPUT_TGZ = join(ROOT, 'output', 'package.tgz');

// ---------------------------------------------------------------------------
// 1. Ler sushi-config.yaml (parsing minimalista — sem dep de YAML parser)
// ---------------------------------------------------------------------------

const configPath = join(ROOT, 'sushi-config.yaml');
const configText = readFileSync(configPath, 'utf8');

function yamlValue(key) {
  // Ancorar em início de linha sem indentação para não capturar chaves nested
  const re = new RegExp(`^(?!\\s)${key}:\\s+(.+)$`, 'm');
  const m = configText.match(re);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : undefined;
}

const id = yamlValue('id');
const version = yamlValue('version');
const canonical = yamlValue('canonical');
const fhirVersion = yamlValue('fhirVersion');
const license = yamlValue('license');
const name = yamlValue('name');
const title = yamlValue('title');

// Extrair description (multiline >-)
// Termina na próxima chave top-level (sem indentação) ou no fim do arquivo
const descMatch = configText.match(/^description:\s*>-\n([\s\S]*?)(?=^[^\s]|\z)/m);
const description = descMatch
  ? descMatch[1]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
  : '';

if (!id || !version || !canonical || !fhirVersion) {
  console.error(
    'Campos obrigatórios faltando em sushi-config.yaml (id, version, canonical, fhirVersion)',
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Preparar diretório package/
// ---------------------------------------------------------------------------

if (existsSync(PACKAGE_DIR)) {
  rmSync(PACKAGE_DIR, { recursive: true });
}
mkdirSync(PACKAGE_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 3. Copiar recursos JSON
// ---------------------------------------------------------------------------

if (!existsSync(RESOURCES_DIR)) {
  console.error(`Diretório de recursos não encontrado: ${RESOURCES_DIR}`);
  console.error('Execute "pnpm exec sushi ig/ -o ig/output" antes deste script.');
  process.exit(1);
}

const jsonFiles = readdirSync(RESOURCES_DIR).filter((f) => f.endsWith('.json'));

for (const file of jsonFiles) {
  cpSync(join(RESOURCES_DIR, file), join(PACKAGE_DIR, file));
}

console.log(`Copiados ${jsonFiles.length} recursos para package/`);

// ---------------------------------------------------------------------------
// 4. Gerar package.json (FHIR NPM Package Spec)
// ---------------------------------------------------------------------------

const packageJson = {
  name: id,
  version,
  canonical,
  url: canonical,
  title: title || name,
  description,
  fhirVersions: [fhirVersion],
  dependencies: {
    'hl7.fhir.r4.core': fhirVersion,
  },
  license,
  author: 'Precisa Saúde',
  type: 'fhir.ig',
};

writeFileSync(join(PACKAGE_DIR, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
console.log('Gerado package/package.json');

// ---------------------------------------------------------------------------
// 5. Gerar .index.json
// ---------------------------------------------------------------------------

const index = { 'index-version': 1, files: [] };

for (const file of jsonFiles) {
  const content = JSON.parse(readFileSync(join(PACKAGE_DIR, file), 'utf8'));
  if (content.resourceType) {
    index.files.push({
      filename: file,
      resourceType: content.resourceType,
      id: content.id,
      url: content.url,
      version: content.version,
    });
  }
}

writeFileSync(join(PACKAGE_DIR, '.index.json'), JSON.stringify(index, null, 2) + '\n');
console.log(`Gerado package/.index.json com ${index.files.length} entradas`);

// ---------------------------------------------------------------------------
// 6. Criar tarball
// ---------------------------------------------------------------------------

execSync(`tar czf package.tgz package`, {
  cwd: join(ROOT, 'output'),
  stdio: 'inherit',
});

console.log(`\nPacote criado: ${OUTPUT_TGZ}`);
