#!/usr/bin/env node

/**
 * Publica os artefatos do IG dentro do build do site.
 *
 * Entrada: ig/input/fsh (compilado aqui com o SUSHI) + site/dist (do Vite)
 * Saída:   em site/dist,
 *   - cada recurso com `url` no domínio do site, no caminho da própria URL,
 *     em arquivo sem extensão (o tipo vem de site/public/_headers);
 *   - ig/package.tgz, o pacote FHIR NPM;
 *   - ig/index.html, o índice dos artefatos;
 *   - 404.html em ig/ e em cada diretório de recurso.
 *
 * Roda no fim do `build` do site, depois do `vite build`. Nada do que sai
 * daqui é versionado.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const IG_ROOT = resolve(import.meta.dirname, '..');
const REPO_ROOT = resolve(IG_ROOT, '..');

const TYPE_TITLES = {
  StructureDefinition: 'Perfis e extensões',
  ValueSet: 'ValueSets',
  CodeSystem: 'CodeSystems',
  ImplementationGuide: 'ImplementationGuide',
};

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(title, body) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; line-height: 1.5; margin: 2rem auto; max-width: 60rem; padding: 0 1rem; }
      code { font-family: ui-monospace, monospace; }
      li { margin: 0.25rem 0; }
    </style>
  </head>
  <body>
${body}
  </body>
</html>
`;
}

function indexHtml(manifest, served) {
  const types = [...new Set(served.map((r) => r.resourceType))].sort(
    (a, b) => Object.keys(TYPE_TITLES).indexOf(a) - Object.keys(TYPE_TITLES).indexOf(b),
  );
  const sections = types
    .map((type) => {
      const items = served
        .filter((r) => r.resourceType === type)
        .map(
          (r) =>
            `      <li><a href="${escapeHtml(r.path)}"><code>${escapeHtml(r.url)}</code></a>${
              r.title ? ` ${escapeHtml(r.title)}` : ''
            }</li>`,
        )
        .join('\n');
      return `    <h2>${escapeHtml(TYPE_TITLES[type] ?? type)}</h2>\n    <ul>\n${items}\n    </ul>`;
    })
    .join('\n');

  return page(
    `${manifest.title ?? manifest.name} ${manifest.version}`,
    `    <h1>${escapeHtml(manifest.title ?? manifest.name)}</h1>
    <p>
      Pacote <code>${escapeHtml(manifest.name)}</code>, versão
      <code>${escapeHtml(manifest.version)}</code>, FHIR
      <code>${escapeHtml((manifest.fhirVersions ?? []).join(', '))}</code>. Rascunho: o pacote não
      está publicado em registro nenhum.
    </p>
    <p>
      Cada recurso abaixo responde em JSON na própria URL canônica. O pacote completo, com os
      exemplos, está em <a href="/ig/package.tgz"><code>/ig/package.tgz</code></a>.
    </p>
${sections}
    <p><a href="/">fhir-brasil</a></p>`,
  );
}

const NOT_FOUND_HTML = page(
  'Não encontrado',
  `    <h1>Não encontrado</h1>
    <p>Não há artefato do IG neste endereço. Veja o <a href="/ig/">índice dos artefatos</a>.</p>`,
);

// Vai em 404.html dos diretórios de recurso. O _headers dá o tipo FHIR JSON a
// tudo o que sai desses diretórios, inclusive à resposta 404, então o corpo
// precisa ser JSON apesar do nome do arquivo.
const NOT_FOUND_OUTCOME = {
  resourceType: 'OperationOutcome',
  issue: [
    {
      severity: 'error',
      code: 'not-found',
      diagnostics: 'Não há recurso do IG com esta URL canônica.',
    },
  ],
};

function writeNew(distDir, path, write) {
  const target = join(distDir, path);
  if (existsSync(target)) {
    throw new Error(
      `Colisão: ${path} já existe em ${distDir}. O caminho de um artefato do IG não pode coincidir com um arquivo do site.`,
    );
  }
  mkdirSync(dirname(target), { recursive: true });
  write(target);
}

/**
 * Grava os artefatos em `distDir` e devolve os caminhos dos recursos servidos.
 * Falha, sem sobrescrever, se algum caminho já existir.
 */
export function writeSiteArtifacts({ distDir, origin, packageDir, tgzPath }) {
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));

  const served = readdirSync(packageDir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('.') && f !== 'package.json')
    .map((file) => ({ file, resource: JSON.parse(readFileSync(join(packageDir, file), 'utf8')) }))
    .filter(({ resource }) => resource.url?.startsWith(`${origin}/`))
    .map(({ file, resource }) => ({
      file,
      path: new URL(resource.url).pathname,
      resourceType: resource.resourceType,
      title: resource.title,
      url: resource.url,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const r of served) {
    writeNew(distDir, r.path, (target) => cpSync(join(packageDir, r.file), target));
  }

  writeNew(distDir, '/ig/package.tgz', (target) => cpSync(tgzPath, target));
  writeNew(distDir, '/ig/index.html', (target) =>
    writeFileSync(target, indexHtml(manifest, served)),
  );
  writeNew(distDir, '/ig/404.html', (target) => writeFileSync(target, NOT_FOUND_HTML));
  for (const dir of new Set(served.map((r) => dirname(r.path)))) {
    writeNew(distDir, `${dir}/404.html`, (target) =>
      writeFileSync(target, JSON.stringify(NOT_FOUND_OUTCOME, null, 2) + '\n'),
    );
  }

  return served.map((r) => r.path);
}

function main() {
  const distDir = join(REPO_ROOT, 'site', 'dist');
  if (!existsSync(join(distDir, 'index.html'))) {
    console.error(`Build do site não encontrado em ${distDir}. Rode o build do site inteiro.`);
    process.exit(1);
  }

  const canonical = readFileSync(join(IG_ROOT, 'sushi-config.yaml'), 'utf8').match(
    /^canonical:\s+(\S+)$/m,
  )?.[1];
  if (!canonical) {
    console.error('canonical não encontrado em sushi-config.yaml');
    process.exit(1);
  }

  execFileSync('pnpm', ['exec', 'sushi', 'ig', '-o', 'ig/output'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  execFileSync(process.execPath, [join(IG_ROOT, 'scripts', 'build-package-tgz.js')], {
    stdio: 'inherit',
  });

  const paths = writeSiteArtifacts({
    distDir,
    origin: new URL(canonical).origin,
    packageDir: join(IG_ROOT, 'output', 'package'),
    tgzPath: join(IG_ROOT, 'output', 'package.tgz'),
  });
  console.log(`\nPublicados ${paths.length} recursos do IG em ${distDir}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
