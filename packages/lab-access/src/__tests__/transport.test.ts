import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import https from 'node:https';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { certificateThumbprint } from '../certificate';
import { LabAccessConfigError, LabAccessTransportError } from '../errors';
import { createMtlsTransport, header } from '../transport';
import { exampleRegistryDocument } from './helpers';

vi.mock('node:https');

/** Certificado de exemplo da especificação (sintético), em PEM. */
function exampleCertificatePem(): string {
  const [der] = exampleRegistryDocument().participants[1]!.receiver!.transport_certificates[0]!.x5c;
  return `-----BEGIN CERTIFICATE-----\n${der!.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`;
}

function mockRequest() {
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

function mockResponse(status: number, body: string): IncomingMessage {
  const res = new EventEmitter() as IncomingMessage;
  res.statusCode = status;
  res.headers = { etag: 'W/"1"', 'x-fapi-interaction-id': 'abc' };
  setTimeout(() => {
    res.emit('data', Buffer.from(body));
    res.emit('end');
  }, 0);
  return res;
}

function respondWith(res: IncomingMessage) {
  const req = mockRequest();
  let options: Record<string, unknown> = {};
  vi.mocked(https.request).mockImplementation(((
    opts: Record<string, unknown>,
    callback: (r: IncomingMessage) => void,
  ) => {
    options = opts;
    callback(res);
    return req;
  }) as never);
  return { options: () => options, req };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createMtlsTransport', () => {
  const options = { cert: exampleCertificatePem(), key: 'chave-de-teste' };

  it('apresenta o certificado de cliente e exige TLS 1.2 com conferência do servidor', async () => {
    const { options: sent, req } = respondWith(mockResponse(200, '{"ok":true}'));
    const transport = createMtlsTransport({ ...options, ca: 'ca-de-teste', passphrase: 'frase' });

    const response = await transport.request({
      body: 'a=1',
      headers: { Accept: 'application/json' },
      method: 'POST',
      url: 'https://mtls.auth.laboratorio.example:8443/token?x=1',
    });

    expect(sent()).toMatchObject({
      ca: 'ca-de-teste',
      cert: options.cert,
      headers: { Accept: 'application/json' },
      hostname: 'mtls.auth.laboratorio.example',
      key: 'chave-de-teste',
      method: 'POST',
      minVersion: 'TLSv1.2',
      passphrase: 'frase',
      path: '/token?x=1',
      port: 8443,
      rejectUnauthorized: true,
      timeout: 30_000,
    });
    expect(req.write).toHaveBeenCalledWith('a=1');
    expect(req.end).toHaveBeenCalled();
    expect(response).toMatchObject({ body: '{"ok":true}', status: 200 });
    expect(header(response, 'ETag')).toBe('W/"1"');
    expect(header(response, 'ausente')).toBeUndefined();
  });

  it('no TLS 1.2, oferece só as quatro suítes admitidas entre servidores', async () => {
    const { options: sent } = respondWith(mockResponse(200, ''));
    await createMtlsTransport(options).request({
      headers: {},
      method: 'GET',
      url: 'https://api.laboratorio.example/fhir/r4/metadata',
    });

    const tls12 = (sent().ciphers as string).split(':').filter((name) => !name.startsWith('TLS_'));
    expect(tls12.sort()).toEqual([
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
    ]);
    expect(sent().port).toBe(443);
  });

  it('expõe o certificado em DER, com o thumbprint do registro', () => {
    const transport = createMtlsTransport(options);
    expect(certificateThumbprint(transport.clientCertificate!)).toBe(
      '5dqIfHirlno9crnlNeEkswfSxPsW9-Rm1k8wgbBVcU8',
    );
  });

  it('não tem opção para desligar a conferência do certificado do servidor', async () => {
    const { options: sent } = respondWith(mockResponse(200, ''));
    const transport = createMtlsTransport({
      ...options,
      ...({ rejectUnauthorized: false } as object),
    });
    await transport.request({ headers: {}, method: 'GET', url: 'https://x.example/' });
    expect(sent().rejectUnauthorized).toBe(true);
  });

  it('recusa certificado inválido e URL que não é https', async () => {
    expect(() => createMtlsTransport({ cert: 'não é PEM', key: 'k' })).toThrowError(
      LabAccessConfigError,
    );
    await expect(
      createMtlsTransport(options).request({
        headers: {},
        method: 'GET',
        url: 'http://x.example/',
      }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    expect(https.request).not.toHaveBeenCalled();
  });

  it('converte erro de rede, de resposta e tempo limite em erro de transporte', async () => {
    const transport = createMtlsTransport({ ...options, timeoutMs: 50 });
    const request = { headers: {}, method: 'GET' as const, url: 'https://x.example/' };

    for (const event of ['error', 'timeout']) {
      const req = mockRequest();
      vi.mocked(https.request).mockImplementation((() => {
        setTimeout(() => req.emit(event, new Error('ECONNREFUSED')), 0);
        return req;
      }) as never);
      const error = await transport.request(request).catch((err: unknown) => err);
      expect(error).toBeInstanceOf(LabAccessTransportError);
      expect(error).toMatchObject({ retryable: true });
      if (event === 'timeout') expect(req.destroy).toHaveBeenCalled();
    }

    const res = new EventEmitter() as IncomingMessage;
    res.statusCode = 200;
    res.headers = {};
    setTimeout(() => res.emit('error', new Error('reset')), 0);
    respondWith(res);
    await expect(transport.request(request)).rejects.toBeInstanceOf(LabAccessTransportError);
  });

  it('sem status na resposta, devolve 0', async () => {
    const res = mockResponse(200, '');
    res.statusCode = undefined;
    respondWith(res);
    const response = await createMtlsTransport(options).request({
      headers: {},
      method: 'GET',
      url: 'https://x.example/',
    });
    expect(response.status).toBe(0);
  });
});
