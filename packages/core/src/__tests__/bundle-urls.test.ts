import { describe, expect, it } from 'vitest';

import { BUNDLE_BASE_URL, entryFullUrl } from '../bundle-urls';

describe('entryFullUrl', () => {
  it('monta o endereço a partir do tipo e do id do próprio recurso', () => {
    expect(entryFullUrl({ id: 'laudo-1-glucose', resourceType: 'Observation' })).toBe(
      `${BUNDLE_BASE_URL}/Observation/laudo-1-glucose`,
    );
  });

  it('atende recurso fora da união que este pacote converte', () => {
    // Um `Specimen` chega ao Bundle vindo da extração, e precisa do mesmo
    // endereço das entradas montadas aqui.
    expect(entryFullUrl({ id: 'laudo-1-specimen-1', resourceType: 'Specimen' })).toBe(
      `${BUNDLE_BASE_URL}/Specimen/laudo-1-specimen-1`,
    );
  });

  it('devolve um URI absoluto, que é o que o fullUrl exige', () => {
    const url = entryFullUrl({ id: 'p1', resourceType: 'Patient' });

    expect(() => new URL(url)).not.toThrow();
  });
});
