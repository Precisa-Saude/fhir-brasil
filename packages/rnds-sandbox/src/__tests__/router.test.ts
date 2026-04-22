import { describe, expect, it } from 'vitest';

import { issueToken } from '../auth';
import { resolveSigningKeys, type SigningKeys } from '../keys';
import { dispatch, type RouteContext } from '../router';
import { resolveScenario } from '../scenarios';
import { SandboxStore } from '../store';
import type { SandboxBundle } from '../types';

const KEYS: SigningKeys = resolveSigningKeys();

function makeStore() {
  const store = new SandboxStore();
  store.load(resolveScenario('paciente-com-exames'));
  return store;
}

function makeCtx(overrides: Partial<RouteContext> = {}): RouteContext {
  return {
    headers: {},
    keys: KEYS,
    method: 'GET',
    path: '/',
    query: new URLSearchParams(),
    store: makeStore(),
    strict: false,
    // Testes de roteamento usam Bundles minimalistas; validação tem
    // suite própria em `validation.test.ts`.
    validateProfiles: false,
    ...overrides,
  };
}

describe('dispatch — modo permissivo', () => {
  it('emite token JWT estruturado em POST /api/token', () => {
    const res = dispatch(makeCtx({ method: 'POST', path: '/api/token' }));
    expect(res.status).toBe(200);
    const body = res.body as { access_token: string; expires_in: number };
    expect(body.access_token.split('.')).toHaveLength(3);
    expect(body.expires_in).toBeGreaterThan(0);
  });

  it('busca paciente por CPF com identifier system|value', () => {
    const res = dispatch(
      makeCtx({
        method: 'GET',
        path: '/api/fhir/r4/Patient',
        query: new URLSearchParams({
          identifier: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|12345678901',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const patient = res.body as { resourceType: string; name: { family: string }[] };
    expect(patient.resourceType).toBe('Patient');
    expect(patient.name[0]?.family).toBe('Silva');
  });

  it('aceita CPF formatado no identifier (123.456.789-01)', () => {
    const res = dispatch(
      makeCtx({
        method: 'GET',
        path: '/api/fhir/r4/Patient',
        query: new URLSearchParams({
          identifier: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|123.456.789-01',
        }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('lê paciente por CNS via /Patient/{cns}', () => {
    const res = dispatch(makeCtx({ path: '/api/fhir/r4/Patient/700000000000001' }));
    expect(res.status).toBe(200);
    expect((res.body as { resourceType: string }).resourceType).toBe('Patient');
  });

  it('retorna 404 com OperationOutcome quando paciente não existe', () => {
    const res = dispatch(makeCtx({ path: '/api/fhir/r4/Patient/000000000000000' }));
    expect(res.status).toBe(404);
    expect((res.body as { resourceType: string }).resourceType).toBe('OperationOutcome');
  });

  it('lê organização por CNES', () => {
    const res = dispatch(makeCtx({ path: '/api/fhir/r4/Organization/2345678' }));
    expect(res.status).toBe(200);
    expect((res.body as { resourceType: string }).resourceType).toBe('Organization');
  });

  it('lê profissional por CNS', () => {
    const res = dispatch(makeCtx({ path: '/api/fhir/r4/Practitioner/700000000000010' }));
    expect(res.status).toBe(200);
    expect((res.body as { resourceType: string }).resourceType).toBe('Practitioner');
  });

  it('aceita Bundle em POST e retorna transaction-response', () => {
    const store = makeStore();
    const bundle: SandboxBundle = {
      entry: [
        {
          request: { method: 'POST', url: 'Observation' },
          resource: {
            code: { coding: [{ code: '2345-7', system: 'http://loinc.org' }] },
            resourceType: 'Observation',
            status: 'final',
          },
        },
      ],
      resourceType: 'Bundle',
      type: 'transaction',
    };
    const res = dispatch(
      makeCtx({ body: bundle, method: 'POST', path: '/api/fhir/r4/Bundle', store }),
    );
    expect(res.status).toBe(200);
    const responseBundle = res.body as SandboxBundle;
    expect(responseBundle.type).toBe('transaction-response');
    expect(responseBundle.entry?.[0]?.response?.status).toContain('201');
    expect(store.getSubmittedBundles()).toHaveLength(2);
  });

  it('rejeita Bundle com tipo inválido', () => {
    const res = dispatch(
      makeCtx({
        body: { resourceType: 'Bundle', type: 'document' } as unknown as SandboxBundle,
        method: 'POST',
        path: '/api/fhir/r4/Bundle',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejeita método não suportado em endpoint FHIR', () => {
    const res = dispatch(
      makeCtx({ method: 'DELETE', path: '/api/fhir/r4/Patient/700000000000001' }),
    );
    expect(res.status).toBe(405);
  });

  it('retorna 404 para paths fora do prefixo FHIR', () => {
    const res = dispatch(makeCtx({ path: '/random' }));
    expect(res.status).toBe(404);
  });
});

describe('dispatch — busca por paciente', () => {
  it('retorna searchset Bundle com Observations pré-carregadas', () => {
    const res = dispatch(
      makeCtx({
        path: '/api/fhir/r4/Observation',
        query: new URLSearchParams({ subject: 'Patient/700000000000001' }),
      }),
    );
    expect(res.status).toBe(200);
    const bundle = res.body as {
      entry: { resource: { code: { coding: { code: string }[] } } }[];
      total: number;
      type: string;
    };
    expect(bundle.type).toBe('searchset');
    expect(bundle.total).toBe(4);
    expect(bundle.entry).toHaveLength(4);
    const codes = bundle.entry.map((e) => e.resource.code.coding[0]?.code);
    expect(codes).toEqual(expect.arrayContaining(['2093-3', '2089-1', '2085-9', '2345-7']));
  });

  it('inclui Observations submetidas após o load', () => {
    const store = makeStore();
    store.recordBundle({
      entry: [
        {
          request: { method: 'POST', url: 'Observation' },
          resource: {
            code: { coding: [{ code: '2160-0', system: 'http://loinc.org' }] },
            resourceType: 'Observation',
            subject: { reference: 'Patient/700000000000001' },
          },
        },
      ],
      resourceType: 'Bundle',
      type: 'transaction',
    });
    const res = dispatch(
      makeCtx({
        path: '/api/fhir/r4/Observation',
        query: new URLSearchParams({ subject: 'Patient/700000000000001' }),
        store,
      }),
    );
    expect(res.status).toBe(200);
    expect((res.body as { total: number }).total).toBe(5);
  });

  it('aceita CNS sem prefixo Patient/', () => {
    const res = dispatch(
      makeCtx({
        path: '/api/fhir/r4/Observation',
        query: new URLSearchParams({ subject: '700000000000001' }),
      }),
    );
    expect(res.status).toBe(200);
    expect((res.body as { total: number }).total).toBe(4);
  });

  it('retorna searchset vazio quando paciente não tem recursos', () => {
    const res = dispatch(
      makeCtx({
        path: '/api/fhir/r4/Observation',
        query: new URLSearchParams({ subject: 'Patient/000000000000000' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = res.body as { entry: unknown[]; total: number };
    expect(body.total).toBe(0);
    expect(body.entry).toEqual([]);
  });

  it('exige parâmetro subject ou patient', () => {
    const res = dispatch(
      makeCtx({ path: '/api/fhir/r4/Observation', query: new URLSearchParams() }),
    );
    expect(res.status).toBe(400);
  });

  it('busca Immunization usando ?patient=', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('vacina'));
    const res = dispatch(
      makeCtx({
        path: '/api/fhir/r4/Immunization',
        query: new URLSearchParams({ patient: 'Patient/700000000000040' }),
        store,
      }),
    );
    expect(res.status).toBe(200);
    expect((res.body as { total: number }).total).toBe(3);
  });

  it('busca Condition do cenário internação', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('internacao'));
    const res = dispatch(
      makeCtx({
        path: '/api/fhir/r4/Condition',
        query: new URLSearchParams({ subject: 'Patient/700000000000020' }),
        store,
      }),
    );
    expect(res.status).toBe(200);
    expect((res.body as { total: number }).total).toBe(1);
  });
});

describe('dispatch — JWKS', () => {
  it('serve /.well-known/jwks.json com a chave RSA', () => {
    const res = dispatch(makeCtx({ path: '/.well-known/jwks.json' }));
    expect(res.status).toBe(200);
    const jwks = res.body as {
      keys: { alg: string; kty: string; kid: string; n: string; e: string }[];
    };
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]).toMatchObject({
      alg: 'RS256',
      kid: KEYS.keyId,
      kty: 'RSA',
      use: 'sig',
    });
    expect(jwks.keys[0]?.n).toBeTruthy();
    expect(jwks.keys[0]?.e).toBeTruthy();
  });
});

describe('dispatch — modo strict', () => {
  const validToken = issueToken(KEYS).access_token;
  const VALID_CNS = '700000000000001';

  it('rejeita FHIR sem header X-Authorization-Server', () => {
    const res = dispatch(makeCtx({ path: '/api/fhir/r4/Patient/700000000000001', strict: true }));
    expect(res.status).toBe(401);
  });

  it('rejeita bearer sem o esquema "Bearer"', () => {
    const res = dispatch(
      makeCtx({
        headers: { 'x-authorization-server': validToken, authorization: VALID_CNS },
        path: '/api/fhir/r4/Patient/700000000000001',
        strict: true,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('rejeita token com assinatura inválida', () => {
    const tampered = `${validToken.split('.').slice(0, 2).join('.')}.invalidsig`;
    const res = dispatch(
      makeCtx({
        headers: {
          authorization: VALID_CNS,
          'x-authorization-server': `Bearer ${tampered}`,
        },
        path: '/api/fhir/r4/Patient/700000000000001',
        strict: true,
      }),
    );
    expect(res.status).toBe(401);
    expect((res.body as { issue: { diagnostics: string }[] }).issue[0]?.diagnostics).toContain(
      'bad-signature',
    );
  });

  it('rejeita FHIR com bearer válido mas sem header Authorization (CNS)', () => {
    const res = dispatch(
      makeCtx({
        headers: { 'x-authorization-server': `Bearer ${validToken}` },
        path: '/api/fhir/r4/Patient/700000000000001',
        strict: true,
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejeita CNS com formato inválido', () => {
    const res = dispatch(
      makeCtx({
        headers: {
          authorization: '12345',
          'x-authorization-server': `Bearer ${validToken}`,
        },
        path: '/api/fhir/r4/Patient/700000000000001',
        strict: true,
      }),
    );
    expect(res.status).toBe(400);
  });

  it('aceita FHIR com bearer válido + CNS bem formado', () => {
    const res = dispatch(
      makeCtx({
        headers: {
          authorization: VALID_CNS,
          'x-authorization-server': `Bearer ${validToken}`,
        },
        path: '/api/fhir/r4/Patient/700000000000001',
        strict: true,
      }),
    );
    expect(res.status).toBe(200);
  });

  it('rejeita /api/token sem cert apresentado quando strict', () => {
    const res = dispatch(
      makeCtx({
        method: 'POST',
        path: '/api/token',
        strict: true,
      }),
    );
    expect(res.status).toBe(401);
  });

  it('aceita /api/token com cert apresentado quando strict', () => {
    const res = dispatch(
      makeCtx({
        method: 'POST',
        path: '/api/token',
        peerCert: { cn: 'PRECISA SAUDE LTDA:1234567', cnes: '1234567', presented: true },
        strict: true,
      }),
    );
    expect(res.status).toBe(200);
  });
});
