import type { FHIRBundle } from '@precisa-saude/fhir';
import { describe, expect, it } from 'vitest';

import { dispatch } from '../router';
import { resolveScenario } from '../scenarios';
import { SandboxStore } from '../store';

function makeStore() {
  const store = new SandboxStore();
  store.load(resolveScenario('paciente-com-exames'));
  return store;
}

describe('dispatch', () => {
  it('emite token JWT estruturado em POST /api/token', () => {
    const res = dispatch({
      method: 'POST',
      path: '/api/token',
      query: new URLSearchParams(),
      store: new SandboxStore(),
    });
    expect(res.status).toBe(200);
    const body = res.body as { access_token: string; expires_in: number };
    expect(body.access_token.split('.')).toHaveLength(3);
    expect(body.expires_in).toBeGreaterThan(0);
  });

  it('busca paciente por CPF com identifier system|value', () => {
    const res = dispatch({
      method: 'GET',
      path: '/api/fhir/r4/Patient',
      query: new URLSearchParams({
        identifier: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|12345678901',
      }),
      store: makeStore(),
    });
    expect(res.status).toBe(200);
    const patient = res.body as { resourceType: string; name: { family: string }[] };
    expect(patient.resourceType).toBe('Patient');
    expect(patient.name[0]?.family).toBe('Silva');
  });

  it('aceita CPF formatado no identifier (123.456.789-01)', () => {
    const res = dispatch({
      method: 'GET',
      path: '/api/fhir/r4/Patient',
      query: new URLSearchParams({
        identifier: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|123.456.789-01',
      }),
      store: makeStore(),
    });
    expect(res.status).toBe(200);
  });

  it('lê paciente por CNS via /Patient/{cns}', () => {
    const res = dispatch({
      method: 'GET',
      path: '/api/fhir/r4/Patient/700000000000001',
      query: new URLSearchParams(),
      store: makeStore(),
    });
    expect(res.status).toBe(200);
    expect((res.body as { resourceType: string }).resourceType).toBe('Patient');
  });

  it('retorna 404 com OperationOutcome quando paciente não existe', () => {
    const res = dispatch({
      method: 'GET',
      path: '/api/fhir/r4/Patient/000000000000000',
      query: new URLSearchParams(),
      store: makeStore(),
    });
    expect(res.status).toBe(404);
    expect((res.body as { resourceType: string }).resourceType).toBe('OperationOutcome');
  });

  it('lê organização por CNES', () => {
    const res = dispatch({
      method: 'GET',
      path: '/api/fhir/r4/Organization/2345678',
      query: new URLSearchParams(),
      store: makeStore(),
    });
    expect(res.status).toBe(200);
    expect((res.body as { resourceType: string }).resourceType).toBe('Organization');
  });

  it('lê profissional por CNS', () => {
    const res = dispatch({
      method: 'GET',
      path: '/api/fhir/r4/Practitioner/700000000000010',
      query: new URLSearchParams(),
      store: makeStore(),
    });
    expect(res.status).toBe(200);
    expect((res.body as { resourceType: string }).resourceType).toBe('Practitioner');
  });

  it('aceita Bundle em POST e retorna transaction-response', () => {
    const store = makeStore();
    const bundle: FHIRBundle = {
      resourceType: 'Bundle',
      type: 'transaction',
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
    };
    const res = dispatch({
      body: bundle,
      method: 'POST',
      path: '/api/fhir/r4/Bundle',
      query: new URLSearchParams(),
      store,
    });
    expect(res.status).toBe(200);
    const responseBundle = res.body as FHIRBundle;
    expect(responseBundle.type).toBe('transaction-response');
    expect(responseBundle.entry?.[0]?.response?.status).toContain('201');
    expect(store.getSubmittedBundles()).toHaveLength(2); // 1 pré-carregado + 1 novo
  });

  it('rejeita Bundle com tipo inválido', () => {
    const res = dispatch({
      body: { resourceType: 'Bundle', type: 'document' } as FHIRBundle,
      method: 'POST',
      path: '/api/fhir/r4/Bundle',
      query: new URLSearchParams(),
      store: makeStore(),
    });
    expect(res.status).toBe(400);
  });

  it('rejeita método não suportado em endpoint FHIR', () => {
    const res = dispatch({
      method: 'DELETE',
      path: '/api/fhir/r4/Patient/700000000000001',
      query: new URLSearchParams(),
      store: makeStore(),
    });
    expect(res.status).toBe(405);
  });

  it('retorna 404 para paths fora do prefixo FHIR', () => {
    const res = dispatch({
      method: 'GET',
      path: '/random',
      query: new URLSearchParams(),
      store: makeStore(),
    });
    expect(res.status).toBe(404);
  });
});
