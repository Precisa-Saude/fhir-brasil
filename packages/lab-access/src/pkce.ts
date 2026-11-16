/**
 * PKCE (RFC 7636) e `state` da jornada de autorização.
 */

import { createHash, randomBytes } from 'node:crypto';

/** `code_verifier` novo: 32 bytes aleatórios, 43 caracteres em base64url. */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/** `code_challenge` do método `S256`: BASE64URL(SHA256(code_verifier)). */
export function codeChallengeS256(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier, 'ascii').digest('base64url');
}

/** `state` aleatório que liga o retorno à jornada aberta. */
export function generateState(): string {
  return randomBytes(32).toString('base64url');
}
