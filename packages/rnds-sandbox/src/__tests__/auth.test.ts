import { describe, expect, it } from 'vitest';

import { issueToken, verifyToken } from '../auth';
import { resolveSigningKeys } from '../keys';

const KEYS = resolveSigningKeys({ keyId: 'test-key' });

describe('auth — issueToken / verifyToken (RS256)', () => {
  it('assina com a chave privada e a verificação passa com a pública', () => {
    const { access_token } = issueToken(KEYS);
    const result = verifyToken(access_token, KEYS);
    expect(result.valid).toBe(true);
  });

  it('inclui kid no header e claims básicas no payload', () => {
    const { access_token } = issueToken(KEYS);
    const [headerB64, payloadB64] = access_token.split('.');
    const header = JSON.parse(Buffer.from(headerB64!, 'base64url').toString()) as {
      alg: string;
      kid: string;
      typ: string;
    };
    const payload = JSON.parse(Buffer.from(payloadB64!, 'base64url').toString()) as {
      aud: string;
      exp: number;
      iat: number;
      iss: string;
      sub: string;
    };
    expect(header).toMatchObject({ alg: 'RS256', kid: 'test-key', typ: 'JWT' });
    expect(payload.aud).toBe('rnds-sandbox');
    expect(payload.iss).toBe('https://rnds-sandbox.local');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('embute identidade do mTLS (cn/cnes) quando fornecida', () => {
    const { access_token } = issueToken(KEYS, {
      identity: { cn: 'PRECISA SAUDE LTDA:1234567', cnes: '1234567' },
    });
    const [, payloadB64] = access_token.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64!, 'base64url').toString()) as {
      cn: string;
      cnes: string;
      sub: string;
    };
    expect(payload.cn).toBe('PRECISA SAUDE LTDA:1234567');
    expect(payload.cnes).toBe('1234567');
    expect(payload.sub).toBe('PRECISA SAUDE LTDA:1234567');
  });

  it('detecta token expirado', () => {
    const past = Date.now() - 60 * 60 * 1000;
    const { access_token } = issueToken(KEYS, { now: past });
    const result = verifyToken(access_token, KEYS);
    expect(result).toEqual({ reason: 'expired', valid: false });
  });

  it('detecta assinatura corrompida', () => {
    const { access_token } = issueToken(KEYS);
    const [h, p] = access_token.split('.');
    const tampered = `${h}.${p}.dGFtcGVyZWQ`;
    const result = verifyToken(tampered, KEYS);
    expect(result).toEqual({ reason: 'bad-signature', valid: false });
  });

  it('rejeita JWTs malformados', () => {
    expect(verifyToken('foo', KEYS)).toEqual({ reason: 'malformed', valid: false });
    expect(verifyToken('a.b', KEYS)).toEqual({ reason: 'malformed', valid: false });
  });

  it('detecta kid de chave diferente', () => {
    const otherKeys = resolveSigningKeys({ keyId: 'outra-chave' });
    const { access_token } = issueToken(otherKeys);
    const result = verifyToken(access_token, KEYS);
    expect(result).toEqual({ reason: 'wrong-key', valid: false });
  });
});
