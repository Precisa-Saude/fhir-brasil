#!/usr/bin/env node

/**
 * Sincroniza a versão do `package.json` raiz com todos os pacotes publicáveis.
 *
 * Chamado pelo semantic-release, via `@semantic-release/exec`, antes do commit
 * de release.
 *
 * A lista **não é digitada**. Ela sai de `packages/*` descartando o que tem
 * `private: true`, porque lista digitada à mão é como o `@precisa-saude/fhir-pdf`
 * nasceu em 0.0.0 e nunca foi publicado: ninguém lembrou de acrescentar, o
 * release passou verde, e o pacote ficou parado sem nada reclamar. O
 * `rnds-sandbox` tinha o problema espelhado, presente na lista de publish e
 * ausente daqui, então era publicado sempre na mesma versão.
 *
 * `--check` compara a lista derivada com a que o `ci.yml` passa para o
 * workflow de publish e falha na diferença. O workflow é reutilizável e recebe
 * a lista como entrada, então ela precisa continuar escrita lá; o que dá para
 * garantir é que as duas não se separem em silêncio.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES_DIR = 'packages';
const CI_FILE = '.github/workflows/ci.yml';

/** Os pacotes publicáveis, em ordem estável, como `packages/<nome>`. */
function publishablePackages() {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PACKAGES_DIR, entry.name))
    .filter((dir) => {
      try {
        return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')).private !== true;
      } catch {
        // Diretório sem `package.json` é resto de build, não pacote.
        return false;
      }
    })
    .sort();
}

/** A lista que o `ci.yml` entrega ao workflow de publish. */
function packagesDeclaredInCi() {
  const linhas = readFileSync(CI_FILE, 'utf-8').split('\n');
  const inicio = linhas.findIndex((l) => l.trim() === 'packages: |');
  if (inicio === -1) throw new Error(`Bloco \`packages: |\` não achado em ${CI_FILE}`);

  const declarados = [];
  for (const linha of linhas.slice(inicio + 1)) {
    const valor = linha.trim();
    if (!valor.startsWith('packages/')) break;
    declarados.push(valor);
  }
  return declarados.sort();
}

const derivados = publishablePackages();

if (process.argv.includes('--check')) {
  const declarados = packagesDeclaredInCi();
  const faltando = derivados.filter((d) => !declarados.includes(d));
  const sobrando = declarados.filter((d) => !derivados.includes(d));

  if (faltando.length > 0 || sobrando.length > 0) {
    if (faltando.length > 0) {
      console.error(`Pacote publicável fora do ${CI_FILE}: ${faltando.join(', ')}`);
      console.error('Sem isso ele recebe versão nova e nunca chega ao npm.');
    }
    if (sobrando.length > 0) {
      console.error(`Listado no ${CI_FILE} e não publicável: ${sobrando.join(', ')}`);
    }
    process.exit(1);
  }

  console.log(`Lista de publish em dia: ${derivados.join(', ')}`);
  process.exit(0);
}

const { version } = JSON.parse(readFileSync('package.json', 'utf-8'));

for (const dir of derivados) {
  const pkgPath = join(dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`${pkg.name}@${version}`);
}
