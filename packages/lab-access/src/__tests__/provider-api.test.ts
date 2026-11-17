import { describe, expect, it } from 'vitest';

import { chargeItemScope } from '../catalog';
import { LabAccessConfigError, LabAccessProtocolError } from '../errors';
import { bundle, createHarness, type Harness } from './fake-lab';
import { FHIR_BASE, jsonResponse, operationOutcome, PROVIDER_ID } from './helpers';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function setup() {
  const harness = await createHarness();
  harness.lab.fhir = () => jsonResponse(200, bundle([]));
  return { harness, provider: harness.client.provider(PROVIDER_ID) };
}

function lastFhir(harness: Harness) {
  const call = harness.lab.fhirCalls.at(-1)!;
  const url = new URL(call.url);
  return { call, params: [...url.searchParams.entries()], path: url.pathname, url };
}

function scopeOf(harness: Harness) {
  const token = harness.lab.fhirCalls.at(-1)!.headers.Authorization!.slice('Bearer '.length);
  return harness.lab.tokens.get(token);
}

describe('cabeçalhos da API FHIR', () => {
  it('envia Authorization, Accept e x-fapi-interaction-id, e nunca o token na URL', async () => {
    const { harness, provider } = await setup();
    await provider.searchLocations({ status: 'active' });

    const { call, url } = lastFhir(harness);
    expect(call.headers.Accept).toBe('application/fhir+json');
    expect(call.headers.Authorization).toMatch(/^Bearer provider-token-\d+$/);
    expect(call.headers['x-fapi-interaction-id']).toMatch(UUID);
    expect(call.headers['Content-Type']).toBeUndefined();
    expect(url.search).not.toContain('token');
  });

  it('RCP-016: duas chamadas nunca compartilham o mesmo x-fapi-interaction-id', async () => {
    const { harness, provider } = await setup();
    await provider.searchLocations();
    await provider.searchLocations();
    await provider.readLocation('unidade-norte').catch(() => {});

    const ids = harness.lab.fhirCalls.map((call) => call.headers['x-fapi-interaction-id']);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(UUID);
  });

  it('RCP-016: a repetição de uma chamada também leva identificador novo', async () => {
    const { harness, provider } = await setup();
    harness.lab.failNext(
      (call) => call.url.startsWith(FHIR_BASE),
      jsonResponse(500, operationOutcome('INTERNAL_ERROR', 'exception')),
    );
    await provider.searchLocations();
    const ids = harness.lab.fhirCalls.map((call) => call.headers['x-fapi-interaction-id']);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('catalog.read', () => {
  it('busca exames e preços com os parâmetros do protocolo', async () => {
    const { harness, provider } = await setup();
    await provider.searchActivityDefinitions({
      count: 100,
      lastUpdatedAfter: new Date('2026-11-01T00:00:00Z'),
      status: 'active',
      title: 'glicose',
      url: 'https://laboratorio.example/exames/glicose',
    });
    expect(lastFhir(harness).path).toBe('/fhir/r4/ActivityDefinition');
    expect(lastFhir(harness).params).toEqual([
      ['status', 'active'],
      ['url', 'https://laboratorio.example/exames/glicose'],
      ['title', 'glicose'],
      ['_lastUpdated', 'gt2026-11-01T00:00:00Z'],
      ['_count', '100'],
    ]);
    expect(scopeOf(harness)).toEqual({ kind: 'provider', scope: 'catalog.read' });

    await provider.searchChargeItemDefinitions({
      effective: 'ge2026-11-01',
      jurisdiction: 'https://laboratorio.example/municipios|porto-alegre',
      lastUpdatedAfter: '2026-11-01T00:00:00Z',
      status: 'active',
    });
    expect(lastFhir(harness).path).toBe('/fhir/r4/ChargeItemDefinition');
    expect(lastFhir(harness).params).toEqual([
      ['status', 'active'],
      ['jurisdiction', 'https://laboratorio.example/municipios|porto-alegre'],
      ['effective', 'ge2026-11-01'],
      ['_lastUpdated', 'gt2026-11-01T00:00:00Z'],
    ]);
  });

  it('lê exame e preço por id, com ETag', async () => {
    const { harness, provider } = await setup();
    harness.lab.fhir = (_call, url) =>
      jsonResponse(
        200,
        { id: 'glicose', resourceType: url.pathname.split('/').at(-2), status: 'retired' },
        { ETag: 'W/"2"' },
      );

    const activity = await provider.readActivityDefinition('glicose');
    expect(lastFhir(harness).path).toBe('/fhir/r4/ActivityDefinition/glicose');
    expect(activity).toEqual({
      etag: 'W/"2"',
      resource: { id: 'glicose', resourceType: 'ActivityDefinition', status: 'retired' },
    });
    const charge = await provider.readChargeItemDefinition('glicose');
    expect(charge.resource.resourceType).toBe('ChargeItemDefinition');
  });

  it('recusa id que não é id FHIR, _count fora de 1 a 100 e data inválida', async () => {
    const { harness, provider } = await setup();
    await expect(provider.readActivityDefinition('../Patient/1')).rejects.toBeInstanceOf(
      LabAccessConfigError,
    );
    await expect(provider.searchActivityDefinitions({ count: 101 })).rejects.toBeInstanceOf(
      LabAccessConfigError,
    );
    await expect(provider.searchActivityDefinitions({ count: 0 })).rejects.toBeInstanceOf(
      LabAccessConfigError,
    );
    await expect(
      provider.searchActivityDefinitions({ lastUpdatedAfter: new Date('x') }),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    expect(harness.lab.fhirCalls).toHaveLength(0);
  });

  it('recusa recurso de tipo diferente do pedido', async () => {
    const { harness, provider } = await setup();
    harness.lab.fhir = () => jsonResponse(200, { id: 'x', resourceType: 'Patient' });
    await expect(provider.readActivityDefinition('x')).rejects.toBeInstanceOf(
      LabAccessProtocolError,
    );
    harness.lab.fhir = () => jsonResponse(200, { resourceType: 'Bundle', type: 'transaction' });
    await expect(provider.searchActivityDefinitions()).rejects.toBeInstanceOf(
      LabAccessProtocolError,
    );
    harness.lab.fhir = () => ({ body: '', headers: {}, status: 200 });
    await expect(provider.searchActivityDefinitions()).rejects.toBeInstanceOf(
      LabAccessProtocolError,
    );
  });
});

describe('locations.read', () => {
  it('busca unidades e serviços', async () => {
    const { harness, provider } = await setup();
    await provider.searchLocations({
      addressCity: 'Porto Alegre',
      addressPostalCode: '90000-000',
      addressState: 'RS',
      near: '-30.03|-51.23|5|km',
      status: 'active',
    });
    expect(lastFhir(harness).path).toBe('/fhir/r4/Location');
    expect(lastFhir(harness).params).toEqual([
      ['status', 'active'],
      ['address-city', 'Porto Alegre'],
      ['address-state', 'RS'],
      ['address-postalcode', '90000-000'],
      ['near', '-30.03|-51.23|5|km'],
    ]);
    expect(scopeOf(harness)).toEqual({ kind: 'provider', scope: 'locations.read' });

    await provider.searchHealthcareServices({ active: true, location: 'unidade-norte' });
    expect(lastFhir(harness).path).toBe('/fhir/r4/HealthcareService');
    expect(lastFhir(harness).params).toEqual([
      ['location', 'Location/unidade-norte'],
      ['active', 'true'],
    ]);
    await provider.searchHealthcareServices({ location: 'Location/unidade-norte' });
    expect(lastFhir(harness).params).toEqual([['location', 'Location/unidade-norte']]);
  });

  it('lê unidade e serviço por id', async () => {
    const { harness, provider } = await setup();
    harness.lab.fhir = (_call, url) =>
      jsonResponse(200, { id: 'a', resourceType: url.pathname.split('/').at(-2) });
    expect((await provider.readLocation('a')).resource.resourceType).toBe('Location');
    expect((await provider.readHealthcareService('a')).resource.resourceType).toBe(
      'HealthcareService',
    );
  });
});

describe('schedule.read', () => {
  it('busca agendas de uma unidade e horários livres para uma cesta', async () => {
    const { harness, provider } = await setup();
    await provider.searchSchedules({ active: true, location: 'unidade-norte' });
    expect(lastFhir(harness).path).toBe('/fhir/r4/Schedule');
    expect(lastFhir(harness).params).toEqual([
      ['actor', 'Location/unidade-norte'],
      ['active', 'true'],
    ]);
    expect(scopeOf(harness)).toEqual({ kind: 'provider', scope: 'schedule.read' });

    await provider.searchSlots({
      schedule: 'agenda-norte',
      serviceTypes: [
        { code: '718-7', system: 'http://loinc.org' },
        { code: 'COMBO-1', system: 'https://laboratorio.example/exames' },
      ],
      start: { from: '2026-11-20', to: '2026-11-27' },
      status: 'free',
    });
    expect(lastFhir(harness).path).toBe('/fhir/r4/Slot');
    expect(lastFhir(harness).params).toEqual([
      ['schedule', 'Schedule/agenda-norte'],
      ['start', 'ge2026-11-20'],
      ['start', 'lt2026-11-27'],
      ['status', 'free'],
      ['service-type', 'http://loinc.org|718-7'],
      ['service-type', 'https://laboratorio.example/exames|COMBO-1'],
    ]);
  });

  it('a busca de horários não leva dado de paciente', async () => {
    const { harness, provider } = await setup();
    await provider.searchSlots({
      ...({ patient: 'pac-teste-1' } as object),
      schedule: 'agenda-norte',
      start: { from: '2026-11-20', to: '2026-11-27' },
    });
    expect(lastFhir(harness).url.search).not.toContain('patient');
  });

  it('recusa busca sem agenda, sem os dois limites ou com janela maior que 31 dias', async () => {
    const { harness, provider } = await setup();
    const attempts = [
      { start: { from: '2026-11-20', to: '2026-11-27' } },
      { schedule: 'ag', start: { from: '2026-11-20' } },
      { schedule: 'ag', start: { from: '2026-11-20', to: '2026-12-22' } },
      { schedule: 'ag', start: { from: '2026-11-27', to: '2026-11-20' } },
      { schedule: 'ag', start: { from: 'amanhã', to: '2026-11-20' } },
      {
        schedule: 'ag',
        serviceTypes: [{ code: '', system: 'x' }],
        start: { from: '2026-11-20', to: '2026-11-27' },
      },
    ];
    for (const attempt of attempts) {
      await expect(provider.searchSlots(attempt as never)).rejects.toBeInstanceOf(
        LabAccessConfigError,
      );
    }
    expect(harness.lab.fhirCalls).toHaveLength(0);

    await provider.searchSlots({ schedule: 'ag', start: { from: '2026-11-20', to: '2026-12-21' } });
    expect(harness.lab.fhirCalls).toHaveLength(1);
  });

  it('devolve o OperationOutcome informativo de exame não coletado na unidade', async () => {
    const { harness, provider } = await setup();
    const outcome = {
      issue: [
        {
          code: 'business-rule',
          details: {
            coding: [
              { code: 'EXAM_NOT_AVAILABLE_AT_LOCATION', system: 'urn:open-labs-brasil:error-code' },
            ],
          },
          diagnostics: 'http://loinc.org|718-7',
          severity: 'information',
        },
      ],
      resourceType: 'OperationOutcome',
    };
    harness.lab.fhir = () =>
      jsonResponse(200, {
        entry: [{ resource: outcome, search: { mode: 'outcome' } }],
        resourceType: 'Bundle',
        type: 'searchset',
      });

    const page = await provider.searchSlots({
      schedule: 'agenda-norte',
      start: { from: '2026-11-20', to: '2026-11-27' },
    });
    expect(page.resources).toEqual([]);
    expect(page.outcomes).toEqual([outcome]);
    expect(page.nextUrl).toBeUndefined();
    await expect(page.next()).resolves.toBeUndefined();
  });

  it('lê agenda e horário por id', async () => {
    const { harness, provider } = await setup();
    harness.lab.fhir = (_call, url) =>
      jsonResponse(200, { id: 'a', resourceType: url.pathname.split('/').at(-2) });
    expect((await provider.readSchedule('a')).resource.resourceType).toBe('Schedule');
    expect((await provider.readSlot('a')).resource.resourceType).toBe('Slot');
  });
});

describe('paginação', () => {
  it('segue o link next sem alterá-lo', async () => {
    const { harness, provider } = await setup();
    const nextUrl = `${FHIR_BASE}?_getpages=abc&_getpagesoffset=2&_count=2`;
    const pages = [
      bundle(
        [
          { id: 'a', resourceType: 'Location' },
          { id: 'b', resourceType: 'Location' },
        ],
        nextUrl,
      ),
      bundle([{ id: 'c', resourceType: 'Location' }]),
    ];
    harness.lab.fhir = () => jsonResponse(200, pages.shift());

    const first = await provider.searchLocations({ count: 2 });
    expect(first.resources.map((r) => r.id)).toEqual(['a', 'b']);
    expect(first.nextUrl).toBe(nextUrl);

    const second = await first.next();
    expect(harness.lab.fhirCalls.at(-1)!.url).toBe(nextUrl);
    expect(second!.resources.map((r) => r.id)).toEqual(['c']);
    expect(await second!.next()).toBeUndefined();
  });

  it('RCP-030: não envia token nem certificado para um link next fora da base FHIR do registro', async () => {
    const { harness, provider } = await setup();
    for (const next of [
      'https://atacante.example/fhir/r4/Location?page=2',
      'http://api.laboratorio.example/fhir/r4/Location?page=2',
      'https://api.laboratorio.example:8443/fhir/r4/Location?page=2',
      'https://api.laboratorio.example/fhir/r4-outro/Location?page=2',
      'https://api.laboratorio.example/fhir/Location?page=2',
      'https://api.laboratorio.example/fhir/r4/../../admin/Location?page=2',
      'https://api.laboratorio.example/fhir/r4/%2e%2e/%2e%2e/admin?page=2',
      'https://api.laboratorio.example@atacante.example/fhir/r4/Location?page=2',
      'https://[nada',
    ]) {
      harness.lab.fhir = () => jsonResponse(200, bundle([], next));
      const page = await provider.searchLocations();
      const before = harness.lab.calls.length;
      await expect(page.next(), next).rejects.toBeInstanceOf(LabAccessProtocolError);
      expect(harness.lab.calls).toHaveLength(before);
    }
  });

  it('RCP-043: não segue link com componente de usuário, nem link relativo que resolve fora da base', async () => {
    const { harness, provider } = await setup();
    for (const next of [
      'https://usuario@api.laboratorio.example/fhir/r4/Location?page=2',
      'https://usuario:senha@api.laboratorio.example/fhir/r4/Location?page=2',
      '../../outro/Location?page=2',
      '/outro/Location?page=2',
      '//atacante.example/fhir/r4/Location?page=2',
      '//usuario@api.laboratorio.example/fhir/r4/Location?page=2',
      '//[nada',
    ]) {
      harness.lab.fhir = () => jsonResponse(200, bundle([], next));
      const page = await provider.searchLocations();
      const before = harness.lab.calls.length;
      await expect(page.next(), next).rejects.toBeInstanceOf(LabAccessProtocolError);
      expect(harness.lab.calls).toHaveLength(before);
    }
  });

  it('RCP-051: resolve link relativo contra a URL da requisição e segue o que fica dentro da base', async () => {
    const { harness, provider } = await setup();
    for (const [next, expected] of [
      ['?page=2', `${FHIR_BASE}/Location?page=2`],
      ['/fhir/r4/Location?page=3', `${FHIR_BASE}/Location?page=3`],
      ['Location?page=4', `${FHIR_BASE}/Location?page=4`],
      ['./?_getpages=abc', `${FHIR_BASE}/?_getpages=abc`],
    ] as const) {
      harness.lab.fhir = () => jsonResponse(200, bundle([], next));
      const page = await provider.searchLocations({ status: 'active' });
      expect(page.nextUrl, next).toBe(expected);
      await page.next();
      expect(harness.lab.calls.at(-1)!.url).toBe(expected);
    }
  });

  it('RCP-030: compara a URL já interpretada: host em maiúsculas e porta padrão explícita valem', async () => {
    const { harness, provider } = await setup();
    for (const next of [
      'https://API.Laboratorio.example/fhir/r4/Location?page=2',
      'https://api.laboratorio.example:443/fhir/r4/Location?page=2',
      'https://api.laboratorio.example/fhir/r4?_getpages=abc',
    ]) {
      harness.lab.fhir = () => jsonResponse(200, bundle([], next));
      const page = await provider.searchLocations();
      await page.next();
      // A URL segue como veio, sem ser reescrita.
      expect(harness.lab.calls.at(-1)!.url).toBe(next);
    }
  });

  it('RCP-030: não segue redirecionamento HTTP na API FHIR nem nos endpoints de consentimento', async () => {
    const { harness, provider } = await setup();
    harness.lab.fhir = () => ({
      body: '',
      headers: { Location: `${FHIR_BASE}/Location?page=outra` },
      status: 302,
    });
    const before = harness.lab.calls.length;
    await expect(provider.searchLocations()).rejects.toBeInstanceOf(LabAccessProtocolError);
    // Token e busca: nenhuma chamada ao endereço do Location.
    expect(harness.lab.calls.slice(before).filter((call) => call.url.includes('outra'))).toEqual(
      [],
    );

    harness.lab.failNext((call) => call.method === 'GET' && call.url.includes('/consents/'), {
      body: '',
      headers: { Location: 'https://atacante.example/consents/x' },
      status: 303,
    });
    await expect(
      provider.getConsent('7c1d5f0a-2b3e-4a6c-8d9e-0f1a2b3c4d5e'),
    ).rejects.toBeInstanceOf(LabAccessProtocolError);
    expect(harness.lab.calls.some((call) => call.url.includes('atacante'))).toBe(false);
  });
});

describe('alcance do preço', () => {
  const VENUE = {
    code: 'venue',
    system: 'http://terminology.hl7.org/CodeSystem/usage-context-type',
  };
  const BRAND = {
    code: 'brand',
    system: 'https://fhir-brasil.dev.br/CodeSystem/lab-price-context',
  };
  const IBGE = 'https://fhir-brasil.dev.br/CodeSystem/ibge-municipio';
  const base = { resourceType: 'ChargeItemDefinition' as const, status: 'active' as const };

  it('preço sem contexto nem município vale para todas as unidades', () => {
    expect(chargeItemScope(base)).toEqual({
      brands: [],
      jurisdictions: [],
      unrecognizedContexts: 0,
      unrestricted: true,
      venues: [],
    });
  });

  it('lê unidade ou região, marca e município', () => {
    const scope = chargeItemScope({
      ...base,
      jurisdiction: [{ coding: [{ code: '4314902', system: IBGE }] }],
      useContext: [
        { code: VENUE, valueReference: { reference: 'Location/regiao-sul' } },
        { code: BRAND, valueReference: { reference: 'Organization/marca-exemplo' } },
      ],
    });
    expect(scope).toEqual({
      brands: ['Organization/marca-exemplo'],
      jurisdictions: [{ code: '4314902', system: IBGE }],
      unrecognizedContexts: 0,
      unrestricted: false,
      venues: ['Location/regiao-sul'],
    });
  });

  it('RCP-049: contexto que o cliente não reconhece impede tratar o preço como geral', () => {
    const scope = chargeItemScope({
      ...base,
      useContext: [
        { code: { code: 'focus', system: VENUE.system }, valueCodeableConcept: { text: 'x' } },
        { code: VENUE, valueCodeableConcept: { text: 'sem referência' } },
        {
          code: { code: 'brand', system: 'https://outro.example/cs' },
          valueReference: { reference: 'Organization/x' },
        },
      ],
    });
    expect(scope).toMatchObject({
      brands: [],
      unrecognizedContexts: 3,
      unrestricted: false,
      venues: [],
    });
  });

  it('município sem código utilizável também conta como contexto não reconhecido', () => {
    const scope = chargeItemScope({ ...base, jurisdiction: [{ text: 'Porto Alegre' }] });
    expect(scope).toMatchObject({
      jurisdictions: [],
      unrecognizedContexts: 1,
      unrestricted: false,
    });
  });
});

describe('metadata', () => {
  it('lê o CapabilityStatement sem token', async () => {
    const { harness, provider } = await setup();
    const statement = await provider.getCapabilityStatement();
    expect(statement.resourceType).toBe('CapabilityStatement');
    const call = harness.lab.fhirCalls.at(-1)!;
    expect(call.url).toBe(`${FHIR_BASE}/metadata`);
    expect(call.headers.Authorization).toBeUndefined();
  });
});
