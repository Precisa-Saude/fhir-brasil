/**
 * Geração e carregamento de chaves RSA para assinatura RS256 do JWT.
 *
 * Em produção a RNDS usa chaves estáveis (com `kid` publicado em JWKS).
 * No sandbox, geramos um par RSA-2048 efêmero no boot por padrão; quem
 * precisa de tokens estáveis entre reinícios passa `--jwt-private-key`
 * (PEM) — útil em CI ou em demos onde o token é capturado e reutilizado.
 */

import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  type KeyObject,
} from 'node:crypto';
import fs from 'node:fs';

export interface SigningKeys {
  /** Identificador da chave (claim `kid` no JWT, `kid` no JWKS) */
  keyId: string;
  /** Chave privada — usada para assinar */
  privateKey: KeyObject;
  /** Chave pública — exposta via JWKS */
  publicKey: KeyObject;
}

export interface KeyOptions {
  /** Identificador da chave. Padrão: 'rnds-sandbox-1' */
  keyId?: string;
  /** PEM da chave privada (Buffer ou caminho). Se omitido, gera-se um par novo. */
  privateKey?: Buffer | string;
  /** PEM da chave pública (Buffer ou caminho). Opcional — derivada da privada quando omitida. */
  publicKey?: Buffer | string;
}

const DEFAULT_KEY_ID = 'rnds-sandbox-1';

// Singleton lazy do par RSA gerado — caro (~50ms) e não-determinístico.
// Cacheamos pra que múltiplos `resolveSigningKeys()` sem opções (caso
// típico de testes que rodam à parte) compartilhem o mesmo par e o
// `kid`. Quem precisar de chaves distintas passa `keyId` ou `privateKey`
// diferentes.
let cachedDefaultKeys: SigningKeys | undefined;

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

  // Cache atinge somente o caminho default (sem PEM, com keyId padrão).
  // Qualquer override de keyId exige par novo (testes podem querer kids distintos).
  if (keyId === DEFAULT_KEY_ID && cachedDefaultKeys) {
    return cachedDefaultKeys;
  }

  const generated = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const result: SigningKeys = {
    keyId,
    privateKey: generated.privateKey,
    publicKey: generated.publicKey,
  };
  if (keyId === DEFAULT_KEY_ID) {
    cachedDefaultKeys = result;
  }
  return result;
}

/** Limpa o cache do par default — útil em testes que precisam reset. */
export function resetSigningKeysCache(): void {
  cachedDefaultKeys = undefined;
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
