/**
 * Conferências locais do certificado de transporte contra o registro.
 */

import { createHash, createPublicKey, KeyObject, X509Certificate } from 'node:crypto';

import type { SigningKey } from './client-assertion';
import { LabAccessConfigError } from './errors';
import type { RegistryReceiver } from './registry-types';

/** SHA-256 do certificado em DER, em base64url (`x5t#S256`, RFC 8705, seção 3.1). */
export function certificateThumbprint(der: Uint8Array): string {
  return createHash('sha256').update(der).digest('base64url');
}

/**
 * O provedor só aceita a conexão quando o certificado é um dos
 * `transport_certificates` do receptor e está dentro da validade. Conferir
 * aqui antecipa uma recusa que viria no handshake TLS.
 */
export function assertCertificateRegistered(
  receiver: RegistryReceiver,
  der: Uint8Array,
  now: Date,
): void {
  const thumbprint = certificateThumbprint(der);
  const entry = receiver.receiver.transport_certificates.find(
    (certificate) => certificate['x5t#S256'] === thumbprint,
  );
  if (!entry) {
    throw new LabAccessConfigError(
      'O certificado de cliente não está em transport_certificates do receptor no registro.',
    );
  }
  const time = now.getTime();
  if (time < Date.parse(entry.not_before) || time > Date.parse(entry.not_after)) {
    throw new LabAccessConfigError('O certificado de cliente está fora da validade do registro.');
  }
}

export function samePublicKey(a: KeyObject, b: KeyObject): boolean {
  const spki = (key: KeyObject) =>
    (key.type === 'private' ? createPublicKey(key) : key).export({ format: 'der', type: 'spki' });
  return spki(a).equals(spki(b));
}

/** A chave de assinatura e a chave do certificado de transporte precisam ser distintas (seção 7.6). */
export function assertDistinctKeys(signingKey: SigningKey, der: Uint8Array): void {
  const signing =
    signingKey.key instanceof KeyObject ? signingKey.key : KeyObject.from(signingKey.key);
  if (samePublicKey(signing, new X509Certificate(Buffer.from(der)).publicKey)) {
    throw new LabAccessConfigError(
      'A chave de assinatura e a chave do certificado de transporte deveriam ser distintas.',
    );
  }
}
