/**
 * Emissor e verificador de tokens JWT (RS256) para o sandbox.
 *
 * A RNDS real assina seus tokens com RS256 e expõe a chave pública
 * para validação. O sandbox faz o mesmo: gera (ou carrega) um par
 * RSA-2048, assina com a privada e expõe a pública via JWKS em
 * `/.well-known/jwks.json`.
 *
 * Claims seguem o formato observado em respostas da RNDS:
 * `iss`, `sub`, `aud`, `iat`, `exp`, e — quando o cliente apresenta
 * certificado mTLS — `cn`/`cnes` extraídos do certificado.
 */

import { createSign, createVerify } from 'node:crypto';

import type { SigningKeys } from './keys';

const TOKEN_TTL_MS = 30 * 60 * 1000;

export interface TokenPayload {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface JwtClaims {
  /** Audience — identifica quem deve consumir o token */
  aud: string;
  /** CNES extraído do certificado mTLS apresentado, se houver */
  cnes?: string;
  /** Common Name do certificado mTLS, se houver */
  cn?: string;
  /** Expiração (epoch seconds) */
  exp: number;
  /** Issued at (epoch seconds) */
  iat: number;
  /** Issuer */
  iss: string;
  /** Subject — identidade do cliente (CN ou 'sandbox') */
  sub: string;
}

export interface IssueTokenOptions {
  /** Identidade extraída do certificado mTLS, se aplicável */
  identity?: { cn?: string; cnes?: string };
  /** Audience — padrão 'rnds-sandbox' */
  audience?: string;
  /** Issuer — padrão 'https://rnds-sandbox.local' */
  issuer?: string;
  /** Override de tempo (testes) */
  now?: number;
}

export function issueToken(keys: SigningKeys, options: IssueTokenOptions = {}): TokenPayload {
  const now = options.now ?? Date.now();
  const audience = options.audience ?? 'rnds-sandbox';
  const issuer = options.issuer ?? 'https://rnds-sandbox.local';

  const claims: JwtClaims = {
    aud: audience,
    exp: Math.floor((now + TOKEN_TTL_MS) / 1000),
    iat: Math.floor(now / 1000),
    iss: issuer,
    sub: options.identity?.cn ?? 'sandbox',
    ...(options.identity?.cn ? { cn: options.identity.cn } : {}),
    ...(options.identity?.cnes ? { cnes: options.identity.cnes } : {}),
  };

  const accessToken = signJwt(claims, keys);

  return {
    access_token: accessToken,
    expires_in: TOKEN_TTL_MS,
    scope: 'rnds:read rnds:write',
    token_type: 'Bearer',
  };
}

export type VerifyResult =
  | { valid: true; claims: JwtClaims }
  | { valid: false; reason: 'malformed' | 'bad-signature' | 'expired' | 'wrong-key' };

export function verifyToken(
  token: string,
  keys: SigningKeys,
  now: number = Date.now(),
): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { reason: 'malformed', valid: false };
  }
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  let header: { alg?: string; kid?: string; typ?: string };
  let payload: JwtClaims;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf-8')) as typeof header;
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as JwtClaims;
  } catch {
    return { reason: 'malformed', valid: false };
  }

  if (header.alg !== 'RS256') {
    return { reason: 'malformed', valid: false };
  }
  if (header.kid && header.kid !== keys.keyId) {
    return { reason: 'wrong-key', valid: false };
  }

  const signingInput = `${headerB64}.${payloadB64}`;
  const verifier = createVerify('RSA-SHA256').update(signingInput);
  const signatureValid = verifier.verify(keys.publicKey, Buffer.from(signatureB64, 'base64url'));
  if (!signatureValid) {
    return { reason: 'bad-signature', valid: false };
  }

  if (payload.exp * 1000 < now) {
    return { reason: 'expired', valid: false };
  }

  return { claims: payload, valid: true };
}

function signJwt(claims: JwtClaims, keys: SigningKeys): string {
  const header = { alg: 'RS256', kid: keys.keyId, typ: 'JWT' };
  const headerB64 = base64UrlJson(header);
  const payloadB64 = base64UrlJson(claims);
  const signingInput = `${headerB64}.${payloadB64}`;
  const signer = createSign('RSA-SHA256').update(signingInput);
  const signature = signer.sign(keys.privateKey).toString('base64url');
  return `${signingInput}.${signature}`;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
