import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION, SPEC_VERSION } from '../constants';

const read = (path: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf-8')) as Record<
    string,
    any
  >;

describe('package.json', () => {
  const pkg = read('../../package.json');
  const rnds = read('../../../rnds/package.json');

  it('é público no npm, com o publishConfig do pacote rnds e a versão do monorepo', () => {
    expect(pkg.name).toBe('@precisa-saude/fhir-lab-access');
    expect(pkg.private).toBeUndefined();
    expect(pkg.publishConfig).toEqual(rnds.publishConfig);
    expect(pkg.version).toBe(read('../../../../package.json').version);
  });

  it('está nas duas listas de publicação, a do CI e a do .precisa.json', () => {
    const ci = readFileSync(
      fileURLToPath(new URL('../../../../.github/workflows/ci.yml', import.meta.url)),
      'utf-8',
    );
    expect(ci).toMatch(/^\s+packages\/lab-access$/m);
    expect(read('../../../../.precisa.json').publishPackages).toContain('packages/lab-access');
  });

  it('só depende de @precisa-saude/fhir e de jose em runtime', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['@precisa-saude/fhir', 'jose']);
    expect(pkg.peerDependencies).toBeUndefined();
    expect(pkg.optionalDependencies).toBeUndefined();
  });

  it('tem os mesmos scripts e a mesma forma de exports do pacote rnds', () => {
    expect(pkg.scripts).toEqual(rnds.scripts);
    expect(pkg.exports).toEqual(rnds.exports);
    expect(pkg.devDependencies).toEqual(rnds.devDependencies);
  });

  it('declara a versão da especificação e a versão de protocolo que implementa', () => {
    expect(SPEC_VERSION).toBe('0.2.2');
    expect(PROTOCOL_VERSION).toBe('0.2');
  });
});
