/* eslint-disable no-console -- script de CLI: a saída é o produto */
/**
 * Copia o `loinc-snapshot.json` para um módulo do core, para que os eixos e os
 * grupos de cada código viajem no pacote publicado: a ficha de decisão do
 * `fhir-bio decision` precisa deles, e o JSON em `scripts/` não vai para o npm.
 *
 * Uso: node --experimental-strip-types scripts/generate-loinc-snapshot-module.ts
 *
 * O `verify-loinc.ts --update` chama a mesma função depois de gravar o JSON, e
 * `mapping-decisions.test.ts` falha se o módulo divergir do snapshot. O módulo
 * leva o snapshot inteiro, com o display de cada código e o aviso da seção
 * 10.1 da licença, que a seção 10.3 exige junto de qualquer dado extraído.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format, resolveConfig } from 'prettier';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = resolve(__dirname, 'loinc-snapshot.json');
const MODULE_PATH = resolve(__dirname, '../packages/core/src/loinc-snapshot.generated.ts');

export async function gerarModuloDoSnapshot(): Promise<void> {
  const snapshot: unknown = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
  const fonte = [
    '// Gerado por scripts/generate-loinc-snapshot-module.ts a partir de',
    '// scripts/loinc-snapshot.json. Não editar à mão: rode o gerador.',
    "import type { LoincSnapshot } from './loinc-axes';",
    '',
    `export const LOINC_SNAPSHOT: LoincSnapshot = ${JSON.stringify(snapshot, null, 2)};`,
    '',
  ].join('\n');
  const config = await resolveConfig(MODULE_PATH);
  writeFileSync(MODULE_PATH, await format(fonte, { ...config, filepath: MODULE_PATH }), 'utf8');
  console.error(`Módulo gravado: ${MODULE_PATH}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await gerarModuloDoSnapshot();
}
