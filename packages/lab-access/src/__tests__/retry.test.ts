import { describe, expect, it } from 'vitest';

import { LabAccessClient } from '../client';
import { LabAccessConfigError } from '../errors';
import { bundle, createHarness } from './fake-lab';
import {
  CLIENT_ID,
  FHIR_BASE,
  jsonResponse,
  operationOutcome,
  PROVIDER_ID,
  testKey,
} from './helpers';

const isFhir = (call: { url: string }) => call.url.startsWith(FHIR_BASE);

async function setup(config = {}) {
  const harness = await createHarness({ config });
  harness.lab.fhir = () => jsonResponse(200, bundle([]));
  return { ...harness, provider: harness.client.provider(PROVIDER_ID) };
}

describe('repetição de chamadas', () => {
  it('RCP-020: em 429 e 503, espera o tempo de Retry-After antes de tentar de novo', async () => {
    const { lab, provider, sleeps } = await setup();
    lab.failNext(
      isFhir,
      jsonResponse(429, operationOutcome('RATE_LIMITED', 'throttled'), { 'Retry-After': '5' }),
    );
    lab.failNext(
      isFhir,
      jsonResponse(503, operationOutcome('PROVIDER_UNAVAILABLE', 'transient'), {
        'Retry-After': '12',
      }),
    );
    await provider.searchLocations();

    expect(sleeps).toEqual([5000, 12000]);
    expect(lab.fhirCalls).toHaveLength(3);
  });

  it('RCP-020: resposta 4xx encerra a chamada na primeira tentativa', async () => {
    for (const [status, code] of [
      [400, 'INVALID_REQUEST'],
      [403, 'SCOPE_INSUFFICIENT'],
      [404, 'RESOURCE_NOT_FOUND'],
      [409, 'SLOT_UNAVAILABLE'],
      [422, 'APPOINTMENT_NOT_MODIFIABLE'],
      [418, 'CODIGO_DESCONHECIDO'],
    ] as const) {
      const { lab, provider, sleeps } = await setup();
      lab.failNext(isFhir, jsonResponse(status, operationOutcome(code)));
      await expect(provider.searchLocations()).rejects.toMatchObject({ code, status });
      expect(sleeps).toEqual([]);
      expect(lab.fhirCalls).toHaveLength(1);
    }
  });

  it('RCP-020: Retry-After acima da espera máxima volta para quem chamou, sem repetir', async () => {
    const { lab, provider, sleeps } = await setup();
    lab.failNext(
      isFhir,
      jsonResponse(429, operationOutcome('RATE_LIMITED', 'throttled'), { 'Retry-After': '3600' }),
    );
    await expect(provider.searchLocations()).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryAfterSeconds: 3600,
      retryable: true,
    });
    expect(sleeps).toEqual([]);
    expect(lab.fhirCalls).toHaveLength(1);
  });

  it('429 sem Retry-After usa o recuo exponencial', async () => {
    const { lab, provider, sleeps } = await setup();
    lab.failNext(isFhir, jsonResponse(429, operationOutcome('RATE_LIMITED', 'throttled')));
    await provider.searchLocations();
    expect(sleeps).toEqual([1000]);
  });

  it('500 INTERNAL_ERROR se repete com recuo de 1 s dobrando, no máximo 3 tentativas', async () => {
    const { lab, provider, sleeps } = await setup();
    for (let i = 0; i < 3; i += 1) {
      lab.failNext(isFhir, jsonResponse(500, operationOutcome('INTERNAL_ERROR', 'exception')));
    }
    await expect(provider.searchLocations()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(sleeps).toEqual([1000, 2000]);
    expect(lab.fhirCalls).toHaveLength(3);
  });

  it('504 e 5xx com código desconhecido se repetem com recuo', async () => {
    const { lab, provider, sleeps } = await setup();
    lab.failNext(isFhir, jsonResponse(504, operationOutcome('UPSTREAM_TIMEOUT', 'timeout')));
    lab.failNext(isFhir, { body: 'Bad Gateway', headers: {}, status: 502 });
    await provider.searchLocations();
    expect(sleeps).toEqual([1000, 2000]);
  });

  it('falha de rede em leitura se repete', async () => {
    const { lab, provider, sleeps } = await setup();
    lab.failNext(isFhir, 'network');
    await provider.searchLocations();
    expect(sleeps).toEqual([1000]);
  });

  it('erro que não vem do transporte como LabAccessError também vira erro de transporte', async () => {
    const { client, lab } = await setup({ retry: { maxAttempts: 1 } });
    const original = lab.transport.request.bind(lab.transport);
    lab.transport.request = async (request) => {
      if (isFhir(request)) throw new Error('ECONNRESET');
      return original(request);
    };
    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toMatchObject({
      name: 'LabAccessTransportError',
      retryable: true,
    });
  });

  it('maxAttempts igual a 1 desliga a repetição', async () => {
    const { lab, provider, sleeps } = await setup({ retry: { maxAttempts: 1 } });
    lab.failNext(isFhir, jsonResponse(500, operationOutcome('INTERNAL_ERROR', 'exception')));
    await expect(provider.searchLocations()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(sleeps).toEqual([]);
  });

  it('recusa política de repetição fora do que a especificação admite', async () => {
    const harness = await createHarness();
    const key = await testKey('assinatura');
    const build = (retry: object) =>
      new LabAccessClient({
        clientId: CLIENT_ID,
        registry: harness.client.registry,
        retry,
        signingKey: { key: key.privateKey, kid: key.kid },
        transport: harness.lab.transport,
      });
    expect(() => build({ maxAttempts: 4 })).toThrowError(LabAccessConfigError);
    expect(() => build({ maxAttempts: 0 })).toThrowError(LabAccessConfigError);
    expect(() => build({ baseDelayMs: 100 })).toThrowError(LabAccessConfigError);
    expect(() => build({ baseDelayMs: 5000, maxDelayMs: 1000 })).toThrowError(LabAccessConfigError);
    expect(() => build({ baseDelayMs: 2000 })).not.toThrow();
  });
});
