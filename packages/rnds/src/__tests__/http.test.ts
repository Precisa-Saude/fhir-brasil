import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { httpsRequestWithCert } from '../http';

vi.mock('node:https');

function createMockResponse(statusCode: number, body: string): IncomingMessage {
  const res = new EventEmitter() as IncomingMessage;
  res.statusCode = statusCode;
  res.headers = { 'content-type': 'application/json' };

  setTimeout(() => {
    res.emit('data', Buffer.from(body));
    res.emit('end');
  }, 0);

  return res;
}

function createMockRequest(): EventEmitter & {
  write: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
} {
  const req = new EventEmitter() as EventEmitter & {
    destroy: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
  };
  req.write = vi.fn();
  req.end = vi.fn();
  req.destroy = vi.fn();
  return req;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('httpsRequestWithCert', () => {
  const certOptions = {
    passphrase: 'senha',
    pfx: Buffer.from('fake-pfx'),
  };

  it('faz requisição GET com certificado e retorna resposta', async () => {
    const mockReq = createMockRequest();
    const mockRes = createMockResponse(200, '{"access_token":"abc"}');

    vi.mocked(https.request).mockImplementation((_opts, callback) => {
      (callback as (res: IncomingMessage) => void)(mockRes);
      return mockReq as unknown as ReturnType<typeof https.request>;
    });

    const result = await httpsRequestWithCert('https://auth.example.com/api/token', certOptions);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('{"access_token":"abc"}');
    expect(mockReq.end).toHaveBeenCalled();
  });

  it('passa headers e body na requisição', async () => {
    const mockReq = createMockRequest();
    const mockRes = createMockResponse(200, 'ok');

    vi.mocked(https.request).mockImplementation((opts, callback) => {
      (callback as (res: IncomingMessage) => void)(mockRes);
      return mockReq as unknown as ReturnType<typeof https.request>;
    });

    await httpsRequestWithCert('https://auth.example.com/api', certOptions, {
      body: '{"data":true}',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    expect(mockReq.write).toHaveBeenCalledWith('{"data":true}');

    const opts = vi.mocked(https.request).mock.calls[0]![0] as Record<string, unknown>;
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('rejeita com erro quando a conexão falha', async () => {
    const mockReq = createMockRequest();

    vi.mocked(https.request).mockImplementation((_opts, _callback) => {
      setTimeout(() => {
        mockReq.emit('error', new Error('ECONNREFUSED'));
      }, 0);
      return mockReq as unknown as ReturnType<typeof https.request>;
    });

    await expect(
      httpsRequestWithCert('https://auth.example.com/api/token', certOptions),
    ).rejects.toThrow('Erro na requisição HTTPS: ECONNREFUSED');
  });

  it('rejeita com erro de timeout', async () => {
    const mockReq = createMockRequest();

    vi.mocked(https.request).mockImplementation((_opts, _callback) => {
      setTimeout(() => {
        mockReq.emit('timeout');
      }, 0);
      return mockReq as unknown as ReturnType<typeof https.request>;
    });

    await expect(
      httpsRequestWithCert('https://auth.example.com/api/token', certOptions),
    ).rejects.toThrow('Timeout na requisição HTTPS');

    expect(mockReq.destroy).toHaveBeenCalled();
  });

  it('configura hostname, path e pfx corretamente', async () => {
    const mockReq = createMockRequest();
    const mockRes = createMockResponse(200, '{}');

    vi.mocked(https.request).mockImplementation((opts, callback) => {
      (callback as (res: IncomingMessage) => void)(mockRes);
      return mockReq as unknown as ReturnType<typeof https.request>;
    });

    await httpsRequestWithCert('https://ehr-auth-hmg.saude.gov.br/api/token?test=1', certOptions);

    const opts = vi.mocked(https.request).mock.calls[0]![0] as Record<string, unknown>;
    expect(opts.hostname).toBe('ehr-auth-hmg.saude.gov.br');
    expect(opts.path).toBe('/api/token?test=1');
    expect(opts.pfx).toBe(certOptions.pfx);
    expect(opts.passphrase).toBe(certOptions.passphrase);
  });
});
