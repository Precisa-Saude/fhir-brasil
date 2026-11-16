import { decodeJwt, decodeProtectedHeader, jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

import { createClientAssertion } from '../client-assertion';
import { LabAccessConfigError } from '../errors';
import { CLIENT_ID, ISSUER, testKey } from './helpers';

describe('createClientAssertion', () => {
  const now = new Date('2026-11-16T14:00:00Z');

  it('RCP-007: o aud da asserção é o issuer do provedor, em texto e não em lista', async () => {
    const key = await testKey('assinatura');
    const jwt = await createClientAssertion({
      clientId: CLIENT_ID,
      issuer: ISSUER,
      now,
      signingKey: { key: key.privateKey, kid: key.kid },
    });

    const claims = decodeJwt(jwt);
    expect(claims.aud).toBe(ISSUER);
    expect(Array.isArray(claims.aud)).toBe(false);
  });

  it('assina com PS256 e preenche kid, iss, sub, jti, iat e exp de 60 segundos', async () => {
    const key = await testKey('assinatura');
    const jwt = await createClientAssertion({
      clientId: CLIENT_ID,
      issuer: ISSUER,
      now,
      signingKey: { key: key.privateKey, kid: key.kid },
    });

    expect(decodeProtectedHeader(jwt)).toEqual({ alg: 'PS256', kid: key.kid });
    const { payload } = await jwtVerify(jwt, key.publicKey, {
      algorithms: ['PS256'],
      audience: ISSUER,
      currentDate: now,
      issuer: CLIENT_ID,
      subject: CLIENT_ID,
    });
    expect(payload.iat).toBe(now.getTime() / 1000);
    expect(payload.exp! - payload.iat!).toBe(60);
    expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.keys(payload).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'jti', 'sub']);
  });

  it('usa jti novo em cada asserção', async () => {
    const key = await testKey('assinatura');
    const options = {
      clientId: CLIENT_ID,
      issuer: ISSUER,
      now,
      signingKey: { key: key.privateKey, kid: key.kid },
    };
    const a = decodeJwt(await createClientAssertion(options));
    const b = decodeJwt(await createClientAssertion(options));
    expect(a.jti).not.toBe(b.jti);
  });

  it('recusa chave que não serve para PS256', async () => {
    const { generateKeyPairSync } = await import('node:crypto');
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    await expect(
      createClientAssertion({
        clientId: CLIENT_ID,
        issuer: ISSUER,
        now,
        signingKey: { key: privateKey, kid: 'ec' },
      }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
  });
});
