/**
 * Geração do documento JWKS (`/.well-known/jwks.json`).
 *
 * Permite que clientes (incluindo jwt.io) busquem a chave pública do
 * sandbox e validem a assinatura do token sem nenhuma configuração
 * fora-de-banda.
 */

import type { SigningKeys } from './keys';

export interface Jwk {
  alg: 'RS256';
  e: string;
  kid: string;
  kty: 'RSA';
  n: string;
  use: 'sig';
}

export interface JwksDocument {
  keys: Jwk[];
}

export function buildJwks(keys: SigningKeys): JwksDocument {
  const exported = keys.publicKey.export({ format: 'jwk' });
  if (typeof exported !== 'object' || exported === null || exported.kty !== 'RSA') {
    throw new Error('Chave pública não é RSA — JWKS só suporta RS256 no sandbox');
  }
  if (typeof exported.n !== 'string' || typeof exported.e !== 'string') {
    throw new Error('Chave pública RSA exportada está incompleta (n/e ausentes)');
  }
  return {
    keys: [
      {
        alg: 'RS256',
        e: exported.e,
        kid: keys.keyId,
        kty: 'RSA',
        n: exported.n,
        use: 'sig',
      },
    ],
  };
}
