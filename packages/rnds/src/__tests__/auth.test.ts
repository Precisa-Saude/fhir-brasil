import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RNDSAuth } from '../auth';
import { RNDSAuthError } from '../errors';
import * as httpModule from '../http';

vi.mock('../http');

const PFX = Buffer.from('fake-pfx');
const PASSPHRASE = 'senha123';
const AUTH_URL = 'https://ehr-auth-hmg.saude.gov.br';

function createTokenResponse(accessToken: string, expiresIn = 1_800_000) {
  return {
    body: JSON.stringify({
      access_token: accessToken,
      expires_in: expiresIn,
      scope: 'read write',
      token_type: 'JWT',
    }),
    headers: {},
    statusCode: 200,
  };
}

describe('RNDSAuth', () => {
  let auth: RNDSAuth;

  beforeEach(() => {
    auth = new RNDSAuth(PFX, PASSPHRASE, AUTH_URL);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('obtém token com sucesso', async () => {
    vi.mocked(httpModule.httpsRequestWithCert).mockResolvedValue(
      createTokenResponse('jwt-token-abc'),
    );

    const token = await auth.getToken();
    expect(token).toBe('jwt-token-abc');
  });

  it('cacheia o token em chamadas subsequentes', async () => {
    vi.mocked(httpModule.httpsRequestWithCert).mockResolvedValue(createTokenResponse('jwt-cached'));

    await auth.getToken();
    await auth.getToken();
    await auth.getToken();

    expect(httpModule.httpsRequestWithCert).toHaveBeenCalledTimes(1);
  });

  it('renova token quando expirado', async () => {
    vi.mocked(httpModule.httpsRequestWithCert)
      .mockResolvedValueOnce(createTokenResponse('token-1', 120_000))
      .mockResolvedValueOnce(createTokenResponse('token-2', 1_800_000));

    const token1 = await auth.getToken();
    expect(token1).toBe('token-1');

    // Avança além da expiração (120_000ms - 60_000ms margem = 60_000ms)
    vi.advanceTimersByTime(61_000);

    const token2 = await auth.getToken();
    expect(token2).toBe('token-2');
    expect(httpModule.httpsRequestWithCert).toHaveBeenCalledTimes(2);
  });

  it('não renova token antes da margem de expiração', async () => {
    vi.mocked(httpModule.httpsRequestWithCert).mockResolvedValue(
      createTokenResponse('token-valid', 1_800_000),
    );

    await auth.getToken();

    // Avança 10 minutos (bem antes da margem de 60s antes de 30min)
    vi.advanceTimersByTime(600_000);

    await auth.getToken();
    expect(httpModule.httpsRequestWithCert).toHaveBeenCalledTimes(1);
  });

  it('evita requests duplicados concorrentes', async () => {
    vi.useRealTimers();

    vi.mocked(httpModule.httpsRequestWithCert).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(createTokenResponse('concurrent-token')), 10);
        }),
    );

    const [t1, t2, t3] = await Promise.all([auth.getToken(), auth.getToken(), auth.getToken()]);

    expect(t1).toBe('concurrent-token');
    expect(t2).toBe('concurrent-token');
    expect(t3).toBe('concurrent-token');
    expect(httpModule.httpsRequestWithCert).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
  });

  it('lança RNDSAuthError quando status não é 200', async () => {
    vi.mocked(httpModule.httpsRequestWithCert).mockResolvedValue({
      body: 'Unauthorized',
      headers: {},
      statusCode: 401,
    });

    await expect(auth.getToken()).rejects.toThrow(RNDSAuthError);
  });

  it('lança RNDSAuthError quando resposta é JSON inválido', async () => {
    vi.mocked(httpModule.httpsRequestWithCert).mockResolvedValue({
      body: 'not json',
      headers: {},
      statusCode: 200,
    });

    await expect(auth.getToken()).rejects.toThrow('JSON malformado');
  });

  it('lança RNDSAuthError quando access_token está ausente', async () => {
    vi.mocked(httpModule.httpsRequestWithCert).mockResolvedValue({
      body: JSON.stringify({ token_type: 'JWT' }),
      headers: {},
      statusCode: 200,
    });

    await expect(auth.getToken()).rejects.toThrow('access_token');
  });

  it('lança RNDSAuthError quando a conexão falha', async () => {
    vi.mocked(httpModule.httpsRequestWithCert).mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(auth.getToken()).rejects.toThrow(RNDSAuthError);
    await expect(auth.getToken()).rejects.toThrow('ECONNREFUSED');
  });

  it('isTokenValid retorna false antes de obter token', () => {
    expect(auth.isTokenValid()).toBe(false);
  });

  it('isTokenValid retorna true após obter token', async () => {
    vi.mocked(httpModule.httpsRequestWithCert).mockResolvedValue(
      createTokenResponse('valid-token'),
    );

    await auth.getToken();
    expect(auth.isTokenValid()).toBe(true);
  });

  it('refreshToken força renovação mesmo com token válido', async () => {
    vi.mocked(httpModule.httpsRequestWithCert)
      .mockResolvedValueOnce(createTokenResponse('token-old'))
      .mockResolvedValueOnce(createTokenResponse('token-new'));

    await auth.getToken();
    const newToken = await auth.refreshToken();

    expect(newToken).toBe('token-new');
    expect(httpModule.httpsRequestWithCert).toHaveBeenCalledTimes(2);
  });

  it('envia pfx e passphrase na requisição', async () => {
    vi.mocked(httpModule.httpsRequestWithCert).mockResolvedValue(createTokenResponse('token'));

    await auth.getToken();

    expect(httpModule.httpsRequestWithCert).toHaveBeenCalledWith(`${AUTH_URL}/api/token`, {
      passphrase: PASSPHRASE,
      pfx: PFX,
    });
  });
});
