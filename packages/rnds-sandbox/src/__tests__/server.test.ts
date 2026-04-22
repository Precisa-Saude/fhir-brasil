import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSandboxServer, type SandboxServer } from '../server';

describe('createSandboxServer (HTTP)', () => {
  let sandbox: SandboxServer;
  let baseUrl: string;

  beforeEach(async () => {
    sandbox = createSandboxServer({ log: () => {}, port: 0, scenario: 'paciente-com-exames' });
    const { host, port } = await sandbox.start();
    baseUrl = `http://${host}:${port}`;
  });

  afterEach(async () => {
    await sandbox.stop();
  });

  it('emite token via POST /api/token', async () => {
    const res = await fetch(`${baseUrl}/api/token`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { access_token: string };
    expect(body.access_token).toBeTruthy();
  });

  it('responde Patient por CNS', async () => {
    const res = await fetch(`${baseUrl}/api/fhir/r4/Patient/700000000000001`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resourceType: string };
    expect(body.resourceType).toBe('Patient');
  });

  it('responde Patient por CPF (search)', async () => {
    const url = `${baseUrl}/api/fhir/r4/Patient?identifier=${encodeURIComponent(
      'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|12345678901',
    )}`;
    const res = await fetch(url);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { resourceType: string };
    expect(body.resourceType).toBe('Patient');
  });

  it('aceita Bundle e retorna transaction-response', async () => {
    const res = await fetch(`${baseUrl}/api/fhir/r4/Bundle`, {
      body: JSON.stringify({
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
      }),
      headers: { 'Content-Type': 'application/fhir+json' },
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { type: string };
    expect(body.type).toBe('transaction-response');
  });

  it('expõe content-type FHIR JSON', async () => {
    const res = await fetch(`${baseUrl}/api/fhir/r4/Patient/700000000000001`);
    expect(res.headers.get('content-type')).toContain('application/fhir+json');
  });
});
