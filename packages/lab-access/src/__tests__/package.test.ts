import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SPEC_VERSION } from '../constants';

const read = (path: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf-8')) as Record<
    string,
    any
  >;

describe('package.json', () => {
  const pkg = read('../../package.json');
  const rnds = read('../../../rnds/package.json');

  it('é privado enquanto a especificação não é pública', () => {
    expect(pkg.name).toBe('@precisa-saude/fhir-lab-access');
    expect(pkg.private).toBe(true);
    expect(pkg.publishConfig).toBeUndefined();
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

  it('declara a versão da especificação que implementa', () => {
    expect(SPEC_VERSION).toBe('0.2.0');
  });
});
