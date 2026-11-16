import { describe, expect, it } from 'vitest';

import { codeChallengeS256, generateCodeVerifier, generateState } from '../pkce';

describe('PKCE', () => {
  it('RCP-004: calcula o code_challenge S256 do exemplo do RFC 7636, apêndice B', () => {
    expect(codeChallengeS256('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('RCP-004: gera code_verifier novo a cada chamada, de 43 a 128 caracteres', () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });

  it('gera state aleatório', () => {
    expect(generateState()).not.toBe(generateState());
    expect(generateState()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
