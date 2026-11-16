/**
 * Asserção `private_key_jwt` do receptor (seção 5.3.1).
 */

import { type KeyObject, randomUUID, type webcrypto } from 'node:crypto';

import { SignJWT } from 'jose';

import { CLIENT_ASSERTION_LIFETIME_SECONDS } from './constants';
import { LabAccessConfigError } from './errors';

export interface SigningKey {
  /** Chave privada RSA de assinatura, de 2048 bits ou mais. */
  key: KeyObject | webcrypto.CryptoKey;
  /** Identificador da chave no `jwks_uri` do receptor. */
  kid: string;
}

export interface ClientAssertionOptions {
  clientId: string;
  /** `issuer` do servidor de autorização, como está no registro. */
  issuer: string;
  now?: Date;
  signingKey: SigningKey;
}

/**
 * Cria a asserção do cliente, assinada com PS256.
 *
 * O `aud` é o `issuer` do provedor como texto simples, nunca uma lista nem a
 * URL do endpoint. Cada asserção leva `jti` novo e vale 60 segundos.
 */
export async function createClientAssertion(options: ClientAssertionOptions): Promise<string> {
  const issuedAt = Math.floor((options.now ?? new Date()).getTime() / 1000);
  try {
    return await new SignJWT({})
      .setProtectedHeader({ alg: 'PS256', kid: options.signingKey.kid })
      .setIssuer(options.clientId)
      .setSubject(options.clientId)
      .setAudience(options.issuer)
      .setJti(randomUUID())
      .setIssuedAt(issuedAt)
      .setExpirationTime(issuedAt + CLIENT_ASSERTION_LIFETIME_SECONDS)
      .sign(options.signingKey.key);
  } catch (cause) {
    throw new LabAccessConfigError(
      'Não foi possível assinar a asserção do cliente. A chave de assinatura precisa ser RSA de 2048 bits ou mais, para PS256.',
      { cause },
    );
  }
}
