import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { FHIR_BRASIL_EXTENSIONS, IG_CANONICAL } from '../extension-urls';

const IG = join(__dirname, '..', '..', '..', '..', 'ig');
const EXTENSIONS_DIR = join(IG, 'input', 'fsh', 'extensions');

/** O `Id:` de cada extensão declarada no FSH. */
const fshExtensionIds = (): string[] =>
  readdirSync(EXTENSIONS_DIR)
    .filter((file) => file.endsWith('.fsh'))
    .flatMap((file) => {
      const fsh = readFileSync(join(EXTENSIONS_DIR, file), 'utf8');
      return [...fsh.matchAll(/^Extension:[^\n]*\nId:\s*(\S+)/gm)].map((m) => m[1]!);
    });

describe('FHIR_BRASIL_EXTENSIONS', () => {
  it('usa o canonical do sushi-config.yaml', () => {
    const config = readFileSync(join(IG, 'sushi-config.yaml'), 'utf8');
    expect(config).toMatch(new RegExp(`^canonical: ${IG_CANONICAL}$`, 'm'));
  });

  it('tem uma URL para cada extensão do IG, e nenhuma a mais', () => {
    const expected = fshExtensionIds()
      .map((id) => `${IG_CANONICAL}/StructureDefinition/${id}`)
      .sort();
    expect(expected.length).toBeGreaterThan(0);
    expect(Object.values(FHIR_BRASIL_EXTENSIONS).sort()).toEqual(expected);
  });
});
