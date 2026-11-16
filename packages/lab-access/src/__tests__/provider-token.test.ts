import { describe, expect, it } from 'vitest';

import {
  LabAccessConfigError,
  LabAccessProtocolError,
  OAuthError,
  ProviderUnavailableError,
  ReceiverStatusError,
  RegistryExpiredError,
  ScopeError,
} from '../errors';
import { bundle, createHarness, TOKEN_ENDPOINT } from './fake-lab';
import {
  CLIENT_ID,
  FHIR_BASE,
  ISSUER,
  jsonResponse,
  operationOutcome,
  PROVIDER_ID,
} from './helpers';

const isToken = (call: { url: string }) => call.url.startsWith('https://mtls');
const tokenCalls = (calls: { form?: URLSearchParams; url: string }[]) =>
  calls.filter((call) => call.form?.has('grant_type'));

describe('token de provedor', () => {
  it('pede client_credentials com private_key_jwt no endpoint dos metadados', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    await client.provider(PROVIDER_ID).searchLocations();

    const [request] = tokenCalls(lab.calls);
    expect(request!.url).toBe(TOKEN_ENDPOINT);
    expect(request!.method).toBe('POST');
    expect(request!.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect([...request!.form!.keys()].sort()).toEqual([
      'client_assertion',
      'client_assertion_type',
      'grant_type',
      'scope',
    ]);
    expect(request!.form!.get('grant_type')).toBe('client_credentials');
    expect(request!.form!.get('scope')).toBe('locations.read');
    expect(request!.form!.get('client_assertion_type')).toBe(
      'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    );
  });

  it('RCP-007: o provedor de teste recebe a asserção com aud igual ao issuer', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    await client.provider(PROVIDER_ID).searchLocations();

    expect(lab.assertions).toHaveLength(1);
    expect(lab.assertions[0]).toMatchObject({ aud: ISSUER, iss: CLIENT_ID, sub: CLIENT_ID });
  });

  it('RCP-009: o pedido de token vai para o alias mTLS anunciado', async () => {
    const { client, lab } = await createHarness();
    const alias = 'https://mtls2.laboratorio.example/token';
    lab.metadata = {
      ...lab.metadata,
      mtls_endpoint_aliases: { token_endpoint: alias },
      token_endpoint: alias,
    };
    lab.metadata.token_endpoint = `${ISSUER}/token-sem-mtls`;
    lab.fhir = () => jsonResponse(200, bundle([]));
    lab.failNext(
      (call) => call.url === alias,
      jsonResponse(200, { access_token: 'via-alias', expires_in: 600, token_type: 'Bearer' }),
    );
    lab.tokens.set('via-alias', { kind: 'provider', scope: 'locations.read' });

    await client.provider(PROVIDER_ID).searchLocations();
    expect(tokenCalls(lab.calls).map((call) => call.url)).toEqual([alias]);
  });

  it('guarda o token em cache e o reusa enquanto vale', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    const provider = client.provider(PROVIDER_ID);
    await provider.searchLocations();
    await provider.searchLocations();
    await client.provider(PROVIDER_ID).searchLocations();

    expect(tokenCalls(lab.calls)).toHaveLength(1);
  });

  it('chamadas concorrentes compartilham um único pedido de token', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    const provider = client.provider(PROVIDER_ID);
    await Promise.all(Array.from({ length: 6 }, () => provider.searchLocations()));

    expect(tokenCalls(lab.calls)).toHaveLength(1);
    expect(lab.fhirCalls).toHaveLength(6);
  });

  it('pede um token por escopo, sem misturar escopos', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    const provider = client.provider(PROVIDER_ID);
    await provider.searchLocations();
    await provider.searchActivityDefinitions();

    expect(tokenCalls(lab.calls).map((call) => call.form!.get('scope'))).toEqual([
      'locations.read',
      'catalog.read',
    ]);
  });

  it('renova o token 60 segundos antes de expirar', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    const provider = client.provider(PROVIDER_ID);
    await provider.searchLocations();

    lab.now = new Date(lab.now.getTime() + 539_000);
    await provider.searchLocations();
    expect(tokenCalls(lab.calls)).toHaveLength(1);

    lab.now = new Date(lab.now.getTime() + 2_000);
    await provider.searchLocations();
    expect(tokenCalls(lab.calls)).toHaveLength(2);
  });

  it('não confia em expires_in acima do teto de 900 segundos', async () => {
    const { client, lab } = await createHarness();
    lab.expiresIn = 86_400;
    lab.fhir = () => jsonResponse(200, bundle([]));
    const provider = client.provider(PROVIDER_ID);
    await provider.searchLocations();
    lab.now = new Date(lab.now.getTime() + 900_000);
    await provider.searchLocations();

    expect(tokenCalls(lab.calls)).toHaveLength(2);
  });

  it('diante de 401 TOKEN_INVALID, pede token novo uma vez e repete a chamada', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    const provider = client.provider(PROVIDER_ID);
    await provider.searchLocations();
    lab.expireAccessTokens('provider');

    await provider.searchLocations();
    expect(tokenCalls(lab.calls)).toHaveLength(2);
    expect(lab.fhirCalls).toHaveLength(3);
  });

  it('não insiste quando o 401 se repete com o token novo', async () => {
    const { client, lab } = await createHarness();
    const denied = jsonResponse(401, operationOutcome('TOKEN_INVALID', 'login'));
    lab.failNext((call) => call.url.startsWith(FHIR_BASE), denied);
    lab.failNext((call) => call.url.startsWith(FHIR_BASE), denied);

    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
      status: 401,
    });
    expect(tokenCalls(lab.calls)).toHaveLength(2);
    expect(lab.fhirCalls).toHaveLength(2);
  });

  it('não repete 401 de certificado nem 403', async () => {
    const { client, lab } = await createHarness();
    lab.failNext(
      (call) => call.url.startsWith(FHIR_BASE),
      jsonResponse(401, operationOutcome('TOKEN_CERTIFICATE_MISMATCH', 'security')),
    );
    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toMatchObject({
      code: 'TOKEN_CERTIFICATE_MISMATCH',
    });
    lab.failNext(
      (call) => call.url.startsWith(FHIR_BASE),
      jsonResponse(403, operationOutcome('RECEIVER_NOT_ALLOWED', 'forbidden')),
    );
    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toMatchObject({
      code: 'RECEIVER_NOT_ALLOWED',
      retryable: false,
    });
    expect(lab.fhirCalls).toHaveLength(2);
  });

  it('recusa escopo que o registro não permite ao receptor, sem chamar o provedor', async () => {
    const { client, lab } = await createHarness({
      registry: (doc) => {
        doc.participants[1]!.receiver!.scopes_allowed = ['catalog.read', 'consent.manage'];
      },
    });
    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toBeInstanceOf(ScopeError);
    expect(tokenCalls(lab.calls)).toHaveLength(0);
  });

  it('recusa escopo que o provedor não anuncia no registro', async () => {
    const { client } = await createHarness({
      registry: (doc) => {
        doc.participants[0]!.provider!.scopes_supported = ['catalog.read'];
      },
    });
    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toBeInstanceOf(ScopeError);
  });

  it('REG-006: com o registro expirado, não pede novo token client_credentials', async () => {
    const { client, lab } = await createHarness({
      registry: (doc) => {
        doc.issued_at = '2026-11-16T11:00:00Z';
        doc.expires_at = '2026-11-16T12:05:00Z';
      },
    });
    lab.fhir = () => jsonResponse(200, bundle([]));
    const provider = client.provider(PROVIDER_ID);
    await provider.searchLocations();

    lab.now = new Date('2026-11-16T12:06:00Z');
    // Token já emitido segue até expirar.
    await provider.searchLocations();
    await expect(provider.searchActivityDefinitions()).rejects.toBeInstanceOf(RegistryExpiredError);
    expect(tokenCalls(lab.calls)).toHaveLength(1);
  });

  it('REG-005: provedor suspenso em um registro novo deixa de ser chamado', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    await client.provider(PROVIDER_ID).searchLocations();

    const suspended = await createHarness({
      registry: (doc) => {
        doc.sequence = 8;
        doc.participants[0]!.status = 'suspended';
      },
    });
    client.updateRegistry(suspended.client.registry);
    const before = lab.calls.length;
    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toBeInstanceOf(
      ProviderUnavailableError,
    );
    expect(lab.calls).toHaveLength(before);
    expect(() => client.updateRegistry({} as never)).toThrowError(LabAccessConfigError);
  });

  it('receptor suspenso ou retirado no registro não chama provedor nenhum', async () => {
    const { client, lab } = await createHarness({
      registry: (doc) => {
        doc.participants[1]!.status = 'suspended';
      },
    });
    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toBeInstanceOf(
      ReceiverStatusError,
    );
    expect(lab.calls).toHaveLength(0);
  });

  it('sem versão MAJOR em comum, não há comunicação', async () => {
    const { client, lab } = await createHarness({
      registry: (doc) => {
        doc.participants[0]!.protocol_versions = ['2.0'];
      },
    });
    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toMatchObject({
      reason: 'no-common-version',
    });
    expect(lab.calls).toHaveLength(0);
  });

  it('busca os metadados uma vez e de novo depois de 24 horas', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    const provider = client.provider(PROVIDER_ID);
    const discoveries = () => lab.calls.filter((call) => call.url.includes('.well-known')).length;

    await Promise.all([provider.searchLocations(), provider.searchActivityDefinitions()]);
    expect(discoveries()).toBe(1);

    lab.now = new Date(lab.now.getTime() + 24 * 60 * 60 * 1000 + 1);
    await provider.searchLocations();
    expect(discoveries()).toBe(2);
  });

  it('invalid_client não se repete', async () => {
    const { client, lab, sleeps } = await createHarness();
    lab.failNext(isToken, jsonResponse(401, { error: 'invalid_client', error_description: 'x' }));

    const error = await client
      .provider(PROVIDER_ID)
      .searchLocations()
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(OAuthError);
    expect(error).toMatchObject({ error: 'invalid_client', retryable: false, status: 401 });
    expect(sleeps).toEqual([]);
    expect(tokenCalls(lab.calls)).toHaveLength(1);
  });

  it('server_error no token se repete com recuo exponencial, até 3 tentativas', async () => {
    const { client, lab, sleeps } = await createHarness();
    for (let i = 0; i < 3; i += 1)
      lab.failNext(isToken, jsonResponse(500, { error: 'server_error' }));

    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toMatchObject({
      error: 'server_error',
      retry: 'backoff',
    });
    expect(sleeps).toEqual([1000, 2000]);
    expect(tokenCalls(lab.calls)).toHaveLength(3);
    // Cada tentativa leva uma asserção nova: o jti não se repete.
    const jtis = tokenCalls(lab.calls).map((call) => call.form!.get('client_assertion'));
    expect(new Set(jtis).size).toBe(3);
  });

  it('temporarily_unavailable espera o Retry-After', async () => {
    const { client, lab, sleeps } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    lab.failNext(
      isToken,
      jsonResponse(503, { error: 'temporarily_unavailable' }, { 'Retry-After': '7' }),
    );
    await client.provider(PROVIDER_ID).searchLocations();
    expect(sleeps).toEqual([7000]);
  });

  it('recusa resposta de token fora do formato', async () => {
    const bad = [
      { expires_in: 600, token_type: 'Bearer' },
      { access_token: 'x', expires_in: 600, token_type: 'MAC' },
      { access_token: 'x', token_type: 'Bearer' },
      { access_token: 'x', expires_in: -1, token_type: 'Bearer' },
    ];
    for (const body of bad) {
      const { client, lab } = await createHarness();
      lab.failNext(isToken, jsonResponse(200, body));
      await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toBeInstanceOf(
        LabAccessProtocolError,
      );
    }
    const { client, lab } = await createHarness();
    lab.failNext(isToken, { body: 'não é JSON', headers: {}, status: 200 });
    await expect(client.provider(PROVIDER_ID).searchLocations()).rejects.toBeInstanceOf(
      LabAccessProtocolError,
    );
  });

  it('ignora refresh_token indevido em client_credentials', async () => {
    const { client, lab } = await createHarness();
    lab.fhir = () => jsonResponse(200, bundle([]));
    lab.failNext(
      isToken,
      jsonResponse(200, {
        access_token: 'com-refresh',
        expires_in: 600,
        refresh_token: 'indevido',
        token_type: 'bearer',
      }),
    );
    lab.tokens.set('com-refresh', { kind: 'provider', scope: 'locations.read' });
    await client.provider(PROVIDER_ID).searchLocations();
    expect(lab.calls.some((call) => call.body?.includes('indevido'))).toBe(false);
  });
});
