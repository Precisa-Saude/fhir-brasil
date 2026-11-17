/**
 * Testes dos artefatos do IG publicados pelo site.
 *
 * Rodam depois do build do site (o `turbo.json` garante a ordem) e conferem
 * `site/dist`: cada recurso com URL canônica no domínio do site está no
 * caminho da própria URL, o `_headers` dá o tipo FHIR JSON a esses caminhos,
 * o pacote está em `/ig/package.tgz` e o índice lista tudo.
 *
 * O que se espera sai de dentro do `package.tgz` publicado, e não de
 * `ig/output`, para o teste valer também com o build restaurado do cache.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// @ts-expect-error script em JS, sem declaração de tipos
import { writeSiteArtifacts } from '../../../ig/scripts/build-site-artifacts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const DIST = join(REPO_ROOT, 'site', 'dist');
const ORIGIN = 'https://fhir-brasil.dev.br';
const FHIR_JSON = 'application/fhir+json; charset=utf-8';

// URLs que a especificação Open Labs Brasil manda os laboratórios usarem.
const OPEN_LABS_URLS = [
  `${ORIGIN}/ig/StructureDefinition/br-lab-appointment`,
  `${ORIGIN}/ig/StructureDefinition/payment-link`,
  `${ORIGIN}/CodeSystem/lab-access-scope`,
];

interface Resource {
  resourceType: string;
  url?: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function yamlValue(key: string): string {
  const config = readFileSync(join(REPO_ROOT, 'ig', 'sushi-config.yaml'), 'utf8');
  const match = config.match(new RegExp(`^${key}:\\s+(.+)$`, 'm'));
  if (!match?.[1]) throw new Error(`${key} não encontrado no sushi-config.yaml`);
  return match[1].trim();
}

/** Caminhos do `_headers` que recebem o tipo FHIR JSON. */
function fhirJsonHeaderPatterns(): string[] {
  const patterns: string[] = [];
  let current: string | undefined;
  for (const line of readFileSync(join(DIST, '_headers'), 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    if (!/^\s/.test(line)) {
      current = line.trim();
    } else if (current && line.trim() === `Content-Type: ${FHIR_JSON}`) {
      patterns.push(current);
    }
  }
  return patterns;
}

function matchesPattern(pattern: string, path: string): boolean {
  return pattern.endsWith('*') ? path.startsWith(pattern.slice(0, -1)) : path === pattern;
}

describe('artefatos do IG em site/dist', () => {
  let extracted: string;
  let served: Array<{ path: string; url: string }>;

  beforeAll(() => {
    extracted = mkdtempSync(join(tmpdir(), 'ig-package-'));
    execFileSync('tar', ['xzf', join(DIST, 'ig', 'package.tgz'), '-C', extracted]);
    const packageDir = join(extracted, 'package');
    served = readdirSync(packageDir)
      .filter((file) => file.endsWith('.json') && !file.startsWith('.') && file !== 'package.json')
      .map((file) => readJson<Resource>(join(packageDir, file)).url)
      .filter((url): url is string => url?.startsWith(`${ORIGIN}/`) === true)
      .map((url) => ({ path: new URL(url).pathname, url }));
  });

  afterAll(() => {
    rmSync(extracted, { force: true, recursive: true });
  });

  it('o pacote está em /ig/package.tgz', () => {
    const manifest = readJson<{ name: string; version: string }>(
      join(extracted, 'package', 'package.json'),
    );
    expect(manifest.name).toBe('br.dev.fhir-brasil.core');
    expect(manifest.version).toBe(yamlValue('version'));
  });

  it('cada recurso responde na própria URL', () => {
    expect(served.length).toBeGreaterThan(0);
    for (const { path, url } of served) {
      const file = join(DIST, path);
      expect(existsSync(file), `falta ${path} em site/dist`).toBe(true);
      expect(readJson<Resource>(file).url).toBe(url);
    }
  });

  it('as URLs citadas na Open Labs Brasil estão entre os recursos servidos', () => {
    const urls = served.map((resource) => resource.url);
    for (const url of OPEN_LABS_URLS) {
      expect(urls).toContain(url);
    }
  });

  it('o _headers cobre todo caminho servido', () => {
    const patterns = fhirJsonHeaderPatterns();
    for (const { path } of served) {
      expect(
        patterns.some((pattern) => matchesPattern(pattern, path)),
        `nenhuma regra do _headers dá ${FHIR_JSON} a ${path}`,
      ).toBe(true);
    }
  });

  it('o _headers não dá o tipo FHIR JSON ao índice nem ao pacote', () => {
    const patterns = fhirJsonHeaderPatterns();
    for (const path of ['/', '/ig/', '/ig/package.tgz', '/ig/nao-existe']) {
      expect(patterns.some((pattern) => matchesPattern(pattern, path))).toBe(false);
    }
  });

  it('o índice lista todo recurso servido', () => {
    const index = readFileSync(join(DIST, 'ig', 'index.html'), 'utf8');
    for (const { path } of served) {
      expect(index).toContain(`href="${path}"`);
    }
    expect(index).toContain('href="/ig/package.tgz"');
  });

  it('caminho desconhecido tem 404 próprio em /ig/ e em cada diretório de recurso', () => {
    expect(readFileSync(join(DIST, 'ig', '404.html'), 'utf8')).toContain('<html');
    for (const dir of new Set(served.map((resource) => dirname(resource.path)))) {
      const outcome = readJson<Resource>(join(DIST, dir, '404.html'));
      expect(outcome.resourceType).toBe('OperationOutcome');
    }
  });
});

describe('writeSiteArtifacts', () => {
  let work: string;

  function setup(): { distDir: string; packageDir: string; tgzPath: string } {
    const packageDir = join(work, 'package');
    const distDir = join(work, 'dist');
    mkdirSync(packageDir, { recursive: true });
    mkdirSync(distDir, { recursive: true });
    writeFileSync(
      join(packageDir, 'package.json'),
      JSON.stringify({ name: 'br.dev.fhir-brasil.core', version: '0.0.0' }),
    );
    writeFileSync(
      join(packageDir, 'StructureDefinition-a.json'),
      JSON.stringify({
        resourceType: 'StructureDefinition',
        url: `${ORIGIN}/ig/StructureDefinition/a`,
      }),
    );
    writeFileSync(
      join(packageDir, 'CodeSystem-externo.json'),
      JSON.stringify({ resourceType: 'CodeSystem', url: 'http://hl7.org/fhir/sid/icd-10' }),
    );
    writeFileSync(
      join(packageDir, 'Observation-exemplo.json'),
      JSON.stringify({ resourceType: 'Observation' }),
    );
    const tgzPath = join(work, 'package.tgz');
    writeFileSync(tgzPath, 'tgz');
    return { distDir, packageDir, tgzPath };
  }

  beforeAll(() => {
    work = mkdtempSync(join(tmpdir(), 'ig-site-'));
  });

  afterAll(() => {
    rmSync(work, { force: true, recursive: true });
  });

  it('serve só o recurso com URL no domínio do site', () => {
    const dirs = setup();
    const written = writeSiteArtifacts({ ...dirs, origin: ORIGIN });
    expect(written).toEqual(['/ig/StructureDefinition/a']);
    expect(existsSync(join(dirs.distDir, 'ig', 'StructureDefinition', 'a'))).toBe(true);
    expect(existsSync(join(dirs.distDir, 'ig', 'package.tgz'))).toBe(true);
  });

  it('colisão interrompe a publicação', () => {
    // Segunda gravação sobre o mesmo dist: o caminho do recurso já existe.
    const dirs = setup();
    expect(() => writeSiteArtifacts({ ...dirs, origin: ORIGIN })).toThrow(
      /\/ig\/StructureDefinition\/a/,
    );
  });
});
