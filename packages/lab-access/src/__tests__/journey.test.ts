import { describe, expect, it } from 'vitest';

import {
  AuthorizationDeniedError,
  AuthorizationResponseError,
  IssuerMismatchError,
  LabAccessConfigError,
  LabAccessProtocolError,
  RegistryExpiredError,
  ScopeError,
  StateMismatchError,
} from '../errors';
import { codeChallengeS256 } from '../pkce';
import {
  AUTHORIZATION_ENDPOINT,
  connect,
  createHarness,
  type Harness,
  openJourney,
  PAR_ENDPOINT,
  PATIENT,
  PURPOSE,
} from './fake-lab';
import {
  API_BASE,
  CLIENT_ID,
  CPF_PATIENT,
  ISSUER,
  jsonResponse,
  PROVIDER_ID,
  REDIRECT_URI,
} from './helpers';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const consentCalls = (harness: Harness) =>
  harness.lab.calls.filter((call) => call.url.startsWith(`${API_BASE}/consents`));
const tokenGrants = (harness: Harness) =>
  harness.lab.calls.map((call) => call.form?.get('grant_type')).filter(Boolean);

describe('createConsent', () => {
  it('cria o consentimento com token de provedor e devolve AWAITING_AUTHORISATION', async () => {
    const harness = await createHarness();
    const consent = await harness.client.provider(PROVIDER_ID).createConsent(
      {
        dataPeriod: { start: '2022-01-01' },
        expirationDateTime: new Date('2027-05-15T03:00:00.000Z'),
        purpose: PURPOSE,
        scopes: ['results.read', 'consent.read'],
      },
      { expectedCpf: CPF_PATIENT },
    );

    const [call] = consentCalls(harness);
    expect(call!.method).toBe('POST');
    expect(call!.url).toBe(`${API_BASE}/consents`);
    expect(call!.json).toEqual({
      data_period: { start: '2022-01-01' },
      expiration_date_time: '2027-05-15T03:00:00Z',
      purpose: PURPOSE,
      scopes: ['results.read', 'consent.read'],
    });
    expect(call!.headers.Accept).toBe('application/json');
    expect(call!.headers['Content-Type']).toBe('application/json');
    expect(call!.headers['x-fapi-interaction-id']).toMatch(UUID);
    const token = call!.headers.Authorization!.slice('Bearer '.length);
    expect(harness.lab.tokens.get(token)).toEqual({ kind: 'provider', scope: 'consent.manage' });

    expect(consent).toEqual({
      consentId: expect.stringMatching(UUID),
      creationDateTime: '2026-11-16T12:00:00Z',
      dataPeriod: { start: '2022-01-01' },
      expirationDateTime: '2027-05-15T03:00:00Z',
      purpose: PURPOSE,
      scopes: ['results.read', 'consent.read'],
      status: 'AWAITING_AUTHORISATION',
      statusUpdateDateTime: '2026-11-16T12:00:00Z',
    });
  });

  it('RCP-011: a criação do consentimento envia só finalidade, escopos, expiração e período, sem dado de paciente', async () => {
    const harness = await createHarness();
    await harness.client.provider(PROVIDER_ID).createConsent(
      {
        // Campos a mais são descartados: o corpo é montado campo a campo.
        ...({ cpf: CPF_PATIENT, patient: { cpf: CPF_PATIENT } } as object),
        expirationDateTime: '2027-05-15T03:00:00Z',
        purpose: PURPOSE,
        scopes: ['results.read'],
      },
      { expectedCpf: CPF_PATIENT },
    );

    const [call] = consentCalls(harness);
    expect(Object.keys(call!.json as object).sort()).toEqual([
      'expiration_date_time',
      'purpose',
      'scopes',
    ]);
    expect(call!.body).not.toContain(CPF_PATIENT);
  });

  const invalid: [string, Record<string, unknown>][] = [
    ['lista de escopos vazia', { scopes: [] }],
    ['escopo de provedor', { scopes: ['schedule.read'] }],
    ['escopo repetido', { scopes: ['results.read', 'results.read'] }],
    ['finalidade curta', { purpose: 'curta' }],
    ['finalidade longa', { purpose: 'x'.repeat(301) }],
    ['expiração no passado', { expirationDateTime: '2026-11-16T11:59:59Z' }],
    ['expiração a mais de 12 meses', { expirationDateTime: '2027-11-16T12:00:01Z' }],
    ['expiração fora do formato', { expirationDateTime: '15/05/2027' }],
    ['expiração com data inválida', { expirationDateTime: new Date('x') }],
    ['período com data malformada', { dataPeriod: { start: '2022-1-1' } }],
    ['período invertido', { dataPeriod: { end: '2022-01-01', start: '2023-01-01' } }],
  ];

  it.each(invalid)('recusa %s antes de chamar o provedor', async (_name, change) => {
    const harness = await createHarness();
    await expect(
      harness.client.provider(PROVIDER_ID).createConsent(
        {
          expirationDateTime: '2027-05-15T03:00:00Z',
          purpose: PURPOSE,
          scopes: ['results.read'],
          ...change,
        } as never,
        { expectedCpf: CPF_PATIENT },
      ),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    expect(harness.lab.calls).toHaveLength(0);
  });

  it('aceita expiração a exatamente 12 meses', async () => {
    const harness = await createHarness();
    const consent = await harness.client.provider(PROVIDER_ID).createConsent(
      {
        expirationDateTime: '2027-11-16T12:00:00Z',
        purpose: PURPOSE,
        scopes: ['results.read'],
      },
      { expectedCpf: CPF_PATIENT },
    );
    expect(consent.expirationDateTime).toBe('2027-11-16T12:00:00Z');
  });

  it('recusa escopo de paciente fora de scopes_allowed do receptor', async () => {
    const harness = await createHarness({
      registry: (doc) => {
        doc.participants[1]!.receiver!.scopes_allowed = ['consent.manage', 'results.read'];
      },
    });
    await expect(
      harness.client.provider(PROVIDER_ID).createConsent(
        {
          expirationDateTime: '2027-05-15T03:00:00Z',
          purpose: PURPOSE,
          scopes: ['appointment.write'],
        },
        { expectedCpf: CPF_PATIENT },
      ),
    ).rejects.toBeInstanceOf(ScopeError);
  });

  it('recusa resposta sem consent_id utilizável ou fora de AWAITING_AUTHORISATION', async () => {
    for (const body of [
      { consent_id: 'tem espaço', status: 'AWAITING_AUTHORISATION' },
      { consent_id: 'ok', status: 'AUTHORISED' },
      { consent_id: 'ok', status: 'INVENTADO' },
      [],
    ]) {
      const harness = await createHarness();
      harness.lab.failNext(
        (call) => call.method === 'POST' && call.url.endsWith('/consents'),
        jsonResponse(201, body),
      );
      await expect(
        harness.client.provider(PROVIDER_ID).createConsent(
          {
            expirationDateTime: '2027-05-15T03:00:00Z',
            purpose: PURPOSE,
            scopes: ['results.read'],
          },
          { expectedCpf: CPF_PATIENT },
        ),
      ).rejects.toBeInstanceOf(LabAccessProtocolError);
    }
  });

  it('não repete sozinho a criação depois de falha de rede', async () => {
    const harness = await createHarness();
    harness.lab.failNext((call) => call.url.endsWith('/consents'), 'network');
    await expect(
      harness.client.provider(PROVIDER_ID).createConsent(
        {
          expirationDateTime: '2027-05-15T03:00:00Z',
          purpose: PURPOSE,
          scopes: ['results.read'],
        },
        { expectedCpf: CPF_PATIENT },
      ),
    ).rejects.toMatchObject({ name: 'LabAccessTransportError', retryable: true });
    expect(consentCalls(harness)).toHaveLength(1);
  });
});

describe('startAuthorization', () => {
  it('envia por PAR exatamente os parâmetros do perfil de segurança', async () => {
    const harness = await createHarness();
    const { consent, journey } = await openJourney(harness);

    const par = harness.lab.calls.find((call) => call.url === PAR_ENDPOINT)!;
    expect(par.method).toBe('POST');
    expect([...par.form!.keys()].sort()).toEqual([
      'client_assertion',
      'client_assertion_type',
      'client_id',
      'code_challenge',
      'code_challenge_method',
      'redirect_uri',
      'response_type',
      'scope',
      'state',
    ]);
    expect(par.form!.get('client_id')).toBe(CLIENT_ID);
    expect(par.form!.get('response_type')).toBe('code');
    expect(par.form!.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(par.form!.get('scope')).toBe(
      `consent:${consent.consentId} appointment.write results.read consent.read`,
    );
    expect(par.form!.get('state')).toBe(journey.state);
    expect(journey).toMatchObject({
      consentId: consent.consentId,
      issuer: ISSUER,
      providerId: PROVIDER_ID,
      redirectUri: REDIRECT_URI,
      requestUriExpiresAt: '2026-11-16T12:05:00.000Z',
      scopes: ['appointment.write', 'results.read', 'consent.read'],
    });
  });

  it('RCP-004: cada jornada tem o próprio code_verifier, com desafio S256', async () => {
    const harness = await createHarness();
    const first = await openJourney(harness);
    const second = await openJourney(harness);

    const pars = harness.lab.calls.filter((call) => call.url === PAR_ENDPOINT);
    expect(pars[0]!.form!.get('code_challenge_method')).toBe('S256');
    expect(pars[0]!.form!.get('code_challenge')).toBe(
      codeChallengeS256(first.journey.codeVerifier),
    );
    expect(pars[1]!.form!.get('code_challenge')).toBe(
      codeChallengeS256(second.journey.codeVerifier),
    );
    expect(first.journey.codeVerifier).not.toBe(second.journey.codeVerifier);
    expect(first.journey.state).not.toBe(second.journey.state);
    // O code_verifier não sai do backend antes da troca do código.
    expect(pars[0]!.body).not.toContain(first.journey.codeVerifier);
  });

  it('RCP-003: a URL aberta no navegador tem dois parâmetros, client_id e request_uri', async () => {
    const harness = await createHarness();
    const { journey } = await openJourney(harness);

    const url = new URL(journey.authorizationUrl);
    expect(`${url.origin}${url.pathname}`).toBe(AUTHORIZATION_ENDPOINT);
    expect([...url.searchParams.keys()].sort()).toEqual(['client_id', 'request_uri']);
    expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(url.searchParams.get('request_uri')).toMatch(/^urn:ietf:params:oauth:request_uri:/);
  });

  it('RCP-011: nenhum campo do PAR identifica o paciente', async () => {
    const harness = await createHarness();
    const { provider, consent } = await openJourney(harness);
    await provider.startAuthorization({
      expectedCpf: CPF_PATIENT,
      ...({ cpf: CPF_PATIENT, login_hint: CPF_PATIENT } as object),
      consent,
      redirectUri: REDIRECT_URI,
    });

    for (const par of harness.lab.calls.filter((call) => call.url === PAR_ENDPOINT)) {
      expect(par.body).not.toContain(CPF_PATIENT);
      expect(par.form!.has('login_hint')).toBe(false);
    }
  });

  it('aceita pedir um subconjunto dos escopos do consentimento', async () => {
    const harness = await createHarness();
    const { consent, provider } = await openJourney(harness);
    const journey = await provider.startAuthorization({
      expectedCpf: CPF_PATIENT,
      consent,
      redirectUri: REDIRECT_URI,
      scopes: ['results.read'],
    });
    expect(journey.scopes).toEqual(['results.read']);
  });

  it('recusa jornada inválida antes de chamar o PAR', async () => {
    const harness = await createHarness();
    const { consent, provider } = await openJourney(harness);
    const before = harness.lab.calls.length;

    const attempts = [
      { consent, redirectUri: 'https://app-paciente.example/conexoes/retorno/' },
      { consent, redirectUri: 'https://outro.example/retorno' },
      { consent, redirectUri: REDIRECT_URI, scopes: [] },
      { consent, redirectUri: REDIRECT_URI, scopes: ['catalog.read'] },
      {
        consent: { ...consent, scopes: ['results.read'] },
        redirectUri: REDIRECT_URI,
        scopes: ['consent.read'],
      },
      { consent: { ...consent, status: 'AUTHORISED' }, redirectUri: REDIRECT_URI },
      { consent: { ...consent, consentId: 'a b' }, redirectUri: REDIRECT_URI },
    ];
    for (const attempt of attempts) {
      await expect(
        provider.startAuthorization({ ...attempt, expectedCpf: CPF_PATIENT } as never),
      ).rejects.toBeInstanceOf(LabAccessConfigError);
    }
    expect(harness.lab.calls).toHaveLength(before);
  });

  it('RCP-033: com o registro expirado, não abre nova autorização', async () => {
    const harness = await createHarness();
    const { consent, provider } = await openJourney(harness);
    harness.lab.now = new Date('2026-12-16T12:00:01Z');
    await expect(
      provider.startAuthorization({ expectedCpf: CPF_PATIENT, consent, redirectUri: REDIRECT_URI }),
    ).rejects.toBeInstanceOf(RegistryExpiredError);
  });

  it('recusa resposta do PAR fora do formato', async () => {
    for (const response of [
      jsonResponse(201, { expires_in: 300 }),
      jsonResponse(201, { expires_in: 'x', request_uri: 'urn:x' }),
      jsonResponse(200, { expires_in: 300, request_uri: 'urn:x' }),
    ]) {
      const harness = await createHarness();
      harness.lab.failNext((call) => call.url === PAR_ENDPOINT, response);
      await expect(openJourney(harness)).rejects.toBeInstanceOf(LabAccessProtocolError);
    }
  });

  it('erro do PAR vira OAuthError', async () => {
    const harness = await createHarness();
    harness.lab.failNext(
      (call) => call.url === PAR_ENDPOINT,
      jsonResponse(400, { error: 'invalid_request' }),
    );
    await expect(openJourney(harness)).rejects.toMatchObject({
      error: 'invalid_request',
      name: 'OAuthError',
      retryable: false,
    });
  });
});

describe('completeAuthorization: retorno', () => {
  async function complete(harness: Harness, change: (params: URLSearchParams) => void) {
    const { journey, provider } = await openJourney(harness);
    const callback = harness.lab.authorize(journey.authorizationUrl, PATIENT, change);
    return provider.completeAuthorization({ callback, expectedCpf: CPF_PATIENT, journey });
  }

  it('RCP-005: retorno com state trocado ou ausente é recusado antes da troca do código', async () => {
    const harness = await createHarness();
    await expect(complete(harness, (p) => p.set('state', 'outro'))).rejects.toBeInstanceOf(
      StateMismatchError,
    );
    await expect(complete(harness, (p) => p.delete('state'))).rejects.toBeInstanceOf(
      StateMismatchError,
    );
    expect(tokenGrants(harness)).not.toContain('authorization_code');
  });

  it('RCP-006: retorno sem iss, ou com iss de outro servidor, é recusado e o código fica sem troca', async () => {
    const harness = await createHarness();
    const errors = await Promise.all([
      complete(harness, (p) => p.delete('iss')).catch((err: unknown) => err),
      complete(harness, (p) => p.set('iss', 'https://auth.atacante.example')).catch(
        (e: unknown) => e,
      ),
      complete(harness, (p) => p.set('iss', `${ISSUER}/`)).catch((err: unknown) => err),
    ]);
    for (const error of errors) {
      expect(error).toBeInstanceOf(IssuerMismatchError);
      expect(error).toMatchObject({ context: 'authorization-response' });
    }
    expect(tokenGrants(harness)).not.toContain('authorization_code');
  });

  it('RCP-006: o iss é conferido mesmo quando o retorno traz error', async () => {
    const harness = await createHarness();
    await expect(
      complete(harness, (p) => {
        p.delete('code');
        p.set('error', 'access_denied');
        p.set('iss', 'https://auth.atacante.example');
      }),
    ).rejects.toBeInstanceOf(IssuerMismatchError);
  });

  it('access_denied vira erro tipado e pede novo consentimento', async () => {
    const harness = await createHarness();
    const error = await complete(harness, (p) => {
      p.delete('code');
      p.set('error', 'access_denied');
      p.set('error_description', 'recusado');
    }).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(AuthorizationDeniedError);
    expect(error).toMatchObject({
      error: 'access_denied',
      errorDescription: 'recusado',
      sameConsentReusable: false,
    });
    expect(tokenGrants(harness)).not.toContain('authorization_code');
  });

  it('server_error no retorno permite novo PAR com o mesmo consentimento', async () => {
    const harness = await createHarness();
    await expect(
      complete(harness, (p) => {
        p.delete('code');
        p.set('error', 'server_error');
      }),
    ).rejects.toMatchObject({ sameConsentReusable: true });
  });

  it('recusa retorno sem code, com parâmetro repetido ou em outro endereço', async () => {
    const harness = await createHarness();
    await expect(complete(harness, (p) => p.delete('code'))).rejects.toBeInstanceOf(
      AuthorizationResponseError,
    );
    await expect(complete(harness, (p) => p.append('code', 'segundo'))).rejects.toBeInstanceOf(
      AuthorizationResponseError,
    );
    await expect(complete(harness, (p) => p.append('iss', ISSUER))).rejects.toBeInstanceOf(
      AuthorizationResponseError,
    );

    const { journey, provider } = await openJourney(harness);
    const callback = harness.lab
      .authorize(journey.authorizationUrl, PATIENT)
      .replace('/conexoes/retorno', '/outro/caminho');
    await expect(
      provider.completeAuthorization({ callback, expectedCpf: CPF_PATIENT, journey }),
    ).rejects.toBeInstanceOf(AuthorizationResponseError);
    await expect(
      provider.completeAuthorization({ callback: 'não é URL', expectedCpf: CPF_PATIENT, journey }),
    ).rejects.toBeInstanceOf(AuthorizationResponseError);
  });

  it('aceita o retorno como URL, URLSearchParams ou objeto', async () => {
    for (const shape of ['url', 'params', 'object'] as const) {
      const harness = await createHarness();
      const { journey, provider } = await openJourney(harness);
      const url = new URL(harness.lab.authorize(journey.authorizationUrl, PATIENT));
      const callback =
        shape === 'url'
          ? url
          : shape === 'params'
            ? url.searchParams
            : Object.fromEntries(url.searchParams);
      const access = await provider.completeAuthorization({
        callback,
        expectedCpf: CPF_PATIENT,
        journey,
      });
      expect(access.patientFhirId).toBe('pac-teste-1');
    }
  });

  it('recusa jornada aberta para outro provedor ou outro issuer', async () => {
    const harness = await createHarness();
    const { journey, provider } = await openJourney(harness);
    const callback = harness.lab.authorize(journey.authorizationUrl, PATIENT);
    await expect(
      provider.completeAuthorization({
        callback,
        expectedCpf: CPF_PATIENT,
        journey: { ...journey, providerId: '00000000-0000-4000-8000-000000000000' },
      }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    await expect(
      provider.completeAuthorization({
        callback,
        expectedCpf: CPF_PATIENT,
        journey: { ...journey, issuer: 'https://auth.antigo.example' },
      }),
    ).rejects.toBeInstanceOf(IssuerMismatchError);
  });
});

describe('completeAuthorization: troca do código', () => {
  it('troca o código com code_verifier, redirect_uri e private_key_jwt', async () => {
    const harness = await createHarness();
    const { journey } = await connect(harness);

    const exchange = harness.lab.calls.find(
      (call) => call.form?.get('grant_type') === 'authorization_code',
    )!;
    expect([...exchange.form!.keys()].sort()).toEqual([
      'client_assertion',
      'client_assertion_type',
      'code',
      'code_verifier',
      'grant_type',
      'redirect_uri',
    ]);
    expect(exchange.form!.get('code_verifier')).toBe(journey.codeVerifier);
    expect(exchange.form!.get('redirect_uri')).toBe(REDIRECT_URI);
  });

  it('RCP-012: a leitura do consentimento com o token de paciente vem logo depois da troca do código, antes de qualquer recurso FHIR', async () => {
    const harness = await createHarness();
    const { access, consent } = await connect(harness);

    const exchangeIndex = harness.lab.calls.findIndex(
      (call) => call.form?.get('grant_type') === 'authorization_code',
    );
    const next = harness.lab.calls[exchangeIndex + 1]!;
    expect(next.method).toBe('GET');
    expect(next.url).toBe(`${API_BASE}/consents/${consent.consentId}`);
    const token = next.headers.Authorization!.slice('Bearer '.length);
    expect(harness.lab.tokens.get(token)).toMatchObject({
      consentId: consent.consentId,
      kind: 'patient',
    });
    expect(harness.lab.fhirCalls).toHaveLength(0);
    expect(access.consentId).toBe(consent.consentId);
    expect(access.scopes).toEqual(['appointment.write', 'results.read', 'consent.read']);
  });

  it('não repete a troca do código: ele vale uma única vez', async () => {
    const harness = await createHarness();
    const { journey, provider } = await openJourney(harness);
    const callback = harness.lab.authorize(journey.authorizationUrl, PATIENT);
    harness.lab.failNext(
      (call) => call.form?.get('grant_type') === 'authorization_code',
      jsonResponse(500, { error: 'server_error' }),
    );
    await expect(
      provider.completeAuthorization({ callback, expectedCpf: CPF_PATIENT, journey }),
    ).rejects.toMatchObject({ error: 'server_error' });
    expect(tokenGrants(harness).filter((grant) => grant === 'authorization_code')).toHaveLength(1);
  });

  it('RCP-047: com o registro local expirado, não troca o código de jornada aberta antes do vencimento', async () => {
    const harness = await createHarness();
    const { journey, provider } = await openJourney(harness);
    const callback = harness.lab.authorize(journey.authorizationUrl, PATIENT);
    harness.lab.now = new Date('2026-12-16T12:00:01Z');
    await expect(
      provider.completeAuthorization({ callback, expectedCpf: CPF_PATIENT, journey }),
    ).rejects.toBeInstanceOf(RegistryExpiredError);
    expect(tokenGrants(harness)).not.toContain('authorization_code');
  });

  it('RCP-042: CPF do paciente inválido não deixa a jornada começar: nenhuma chamada ao provedor', async () => {
    const harness = await createHarness();
    const provider = harness.client.provider(PROVIDER_ID);
    for (const expectedCpf of ['00000000000', '11111111111', '52998224724', '']) {
      await expect(
        provider.createConsent(
          {
            expirationDateTime: '2027-05-15T03:00:00Z',
            purpose: PURPOSE,
            scopes: ['results.read'],
          },
          { expectedCpf },
        ),
      ).rejects.toBeInstanceOf(LabAccessConfigError);
    }
    expect(harness.lab.calls).toHaveLength(0);

    const { consent } = await openJourney(harness);
    const before = harness.lab.calls.length;
    await expect(
      provider.startAuthorization({
        consent,
        expectedCpf: '00000000000',
        redirectUri: REDIRECT_URI,
      }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    expect(harness.lab.calls).toHaveLength(before);
  });
});
