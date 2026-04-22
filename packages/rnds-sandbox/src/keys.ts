/**
 * Geração e carregamento de chaves RSA para assinatura RS256 do JWT.
 *
 * Em produção a RNDS usa chaves estáveis (com `kid` publicado em JWKS).
 * No sandbox, geramos um par RSA-2048 efêmero no boot por padrão; quem
 * precisa de tokens estáveis entre reinícios passa `--jwt-private-key`
 * (PEM) — útil em CI ou em demos onde o token é capturado e reutilizado.
 */

import fs from 'node:fs';
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  type KeyObject,
} from 'node:crypto';

export interface SigningKeys {
  /** Identificador da chave (claim `kid` no JWT, `kid` no JWKS) */
  keyId: string;
  /** Chave privada — usada para assinar */
  privateKey: KeyObject;
  /** Chave pública — exposta via JWKS */
  publicKey: KeyObject;
}

export interface KeyOptions {
  /** PEM da chave privada (Buffer ou caminho). Se omitido, gera-se um par novo. */
  privateKey?: Buffer | string;
  /** PEM da chave pública (Buffer ou caminho). Opcional — derivada da privada quando omitida. */
  publicKey?: Buffer | string;
  /** Identificador da chave. Padrão: 'rnds-sandbox-1' */
  keyId?: string;
}

const DEFAULT_KEY_ID = 'rnds-sandbox-1';

export function resolveSigningKeys(options: KeyOptions = {}): SigningKeys {
  const keyId = options.keyId ?? DEFAULT_KEY_ID;

  if (options.privateKey) {
    const privatePem = readPem(options.privateKey);
    const privateKey = createPrivateKey(privatePem);
    const publicKey = options.publicKey
      ? createPublicKey(readPem(options.publicKey))
      : createPublicKey(privateKey);
    return { keyId, privateKey, publicKey };
  }

  const generated = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    keyId,
    privateKey: generated.privateKey,
    publicKey: generated.publicKey,
  };
}

function readPem(value: Buffer | string): Buffer | string {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.includes('-----BEGIN')) {
    return value;
  }
  return fs.readFileSync(value);
}
