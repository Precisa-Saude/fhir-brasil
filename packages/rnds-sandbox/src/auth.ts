/**
 * Emissor simples de token JWT para o sandbox.
 *
 * Não há chave privada nem assinatura criptográfica real — o token é
 * estruturalmente um JWT (header.payload.signature) mas a "assinatura"
 * é um placeholder. O cliente RNDS apenas valida estrutura e expiry.
 */

const SIGNATURE_PLACEHOLDER = 'sandbox-signature-not-cryptographically-valid';
const TOKEN_TTL_MS = 30 * 60 * 1000;

export interface TokenPayload {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export function issueToken(now: number = Date.now()): TokenPayload {
  const header = base64UrlJson({ alg: 'RS256', typ: 'JWT' });
  const payload = base64UrlJson({
    aud: 'rnds-sandbox',
    exp: Math.floor((now + TOKEN_TTL_MS) / 1000),
    iat: Math.floor(now / 1000),
    iss: 'https://rnds-sandbox.local',
    sub: 'sandbox',
  });
  const signature = Buffer.from(SIGNATURE_PLACEHOLDER).toString('base64url');

  return {
    access_token: `${header}.${payload}.${signature}`,
    expires_in: TOKEN_TTL_MS,
    scope: 'rnds:read rnds:write',
    token_type: 'Bearer',
  };
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
