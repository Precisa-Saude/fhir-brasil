import { afterEach, describe, expect, it, vi } from 'vitest';

import { extractWithModel } from '../llm-client.js';

const okResponse = (): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content: '{"biomarkers":[]}' } }] }), {
    status: 200,
  });

const sentHeaders = (mock: ReturnType<typeof vi.fn>): Record<string, string> =>
  (mock.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;

describe('extractWithModel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia os cabeçalhos extras junto com os do cliente', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    await extractWithModel('Glicose 90 mg/dL', {
      apiKey: 'chave',
      baseUrl: 'https://modelo.exemplo/v1',
      headers: { 'CF-Access-Client-Id': 'id', 'CF-Access-Client-Secret': 'segredo' },
      model: 'qualquer',
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://modelo.exemplo/v1/chat/completions');
    expect(sentHeaders(fetchMock)).toEqual({
      'CF-Access-Client-Id': 'id',
      'CF-Access-Client-Secret': 'segredo',
      authorization: 'Bearer chave',
      'content-type': 'application/json',
    });
  });

  it('não deixa um cabeçalho extra trocar content-type nem authorization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);

    await extractWithModel('Glicose 90 mg/dL', {
      baseUrl: 'https://modelo.exemplo/v1',
      headers: { Authorization: 'Bearer outra', 'Content-Type': 'text/plain', 'X-Extra': '1' },
      model: 'qualquer',
    });

    expect(sentHeaders(fetchMock)).toEqual({
      'X-Extra': '1',
      'content-type': 'application/json',
    });
  });
});
