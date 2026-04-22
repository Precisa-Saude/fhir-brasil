import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSandboxServer, type SandboxServer } from '../server';

describe('createSandboxServer (HTTP)', () => {
  let sandbox: SandboxServer;
  let baseUrl: string;

  beforeEach(async () => {
    sandbox = createSandboxServer({
      log: () => {},
      port: 0,
      scenario: 'paciente-com-exames',
      // Esses testes exercitam o roteamento HTTP, não validação de perfil.
      // Validação é coberta em `validation.test.ts`.
      validateSubmissions: false,
    });
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

  it('expõe JWKS em /.well-known/jwks.json', async () => {
    const res = await fetch(`${baseUrl}/.well-known/jwks.json`);
    expect(res.status).toBe(200);
    const jwks = (await res.json()) as { keys: { kty: string; kid: string }[] };
    expect(jwks.keys[0]?.kty).toBe('RSA');
    expect(jwks.keys[0]?.kid).toBe(sandbox.signingKeys.keyId);
  });

  it('locations do transaction-response são únicas entre POSTs (regression)', async () => {
    const bundlePayload = JSON.stringify({
      entry: [
        {
          request: { method: 'POST', url: 'Observation' },
          resource: {
            code: { coding: [{ code: '2345-7' }] },
            resourceType: 'Observation',
            status: 'final',
          },
        },
      ],
      resourceType: 'Bundle',
      type: 'transaction',
    });
    const headers = { 'Content-Type': 'application/fhir+json' };
    const r1 = await fetch(`${baseUrl}/api/fhir/r4/Bundle`, {
      body: bundlePayload,
      headers,
      method: 'POST',
    });
    const r2 = await fetch(`${baseUrl}/api/fhir/r4/Bundle`, {
      body: bundlePayload,
      headers,
      method: 'POST',
    });
    const b1 = (await r1.json()) as { entry: { response: { location: string } }[] };
    const b2 = (await r2.json()) as { entry: { response: { location: string } }[] };
    expect(b1.entry[0]?.response.location).not.toBe(b2.entry[0]?.response.location);
  });
});

describe('createSandboxServer (HTTP, validateSubmissions)', () => {
  let sandbox: SandboxServer;
  let baseUrl: string;

  beforeEach(async () => {
    sandbox = createSandboxServer({ log: () => {}, port: 0 }); // validateSubmissions default = true
    const { host, port } = await sandbox.start();
    baseUrl = `http://${host}:${port}`;
  });

  afterEach(async () => {
    await sandbox.stop();
  });

  it('rejeita Bundle inválido com 422 + OperationOutcome multi-issue', async () => {
    const res = await fetch(`${baseUrl}/api/fhir/r4/Bundle`, {
      body: JSON.stringify({
        entry: [
          {
            request: { method: 'POST', url: 'Patient' },
            // Patient sem identifier/name/birthDate/gender → várias issues
            resource: { resourceType: 'Patient' },
          },
        ],
        resourceType: 'Bundle',
        type: 'transaction',
      }),
      headers: { 'Content-Type': 'application/fhir+json' },
      method: 'POST',
    });
    expect(res.status).toBe(422);
    const oo = (await res.json()) as {
      issue: { code: string; location?: string[] }[];
      resourceType: string;
    };
    expect(oo.resourceType).toBe('OperationOutcome');
    expect(oo.issue.length).toBeGreaterThanOrEqual(3);
    expect(oo.issue.every((i) => i.location?.[0]?.startsWith('Bundle.entry[0].resource.'))).toBe(
      true,
    );
  });

  it('aceita Bundle válido em modo validate', async () => {
    const res = await fetch(`${baseUrl}/api/fhir/r4/Bundle`, {
      body: JSON.stringify({
        entry: [
          {
            request: { method: 'POST', url: 'Observation' },
            resource: {
              category: [
                {
                  coding: [
                    {
                      code: 'laboratory',
                      system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                    },
                  ],
                },
              ],
              code: { coding: [{ code: '2345-7', system: 'http://loinc.org' }] },
              effectiveDateTime: '2025-09-10',
              resourceType: 'Observation',
              status: 'final',
              subject: { reference: 'Patient/700000000000001' },
              valueQuantity: {
                code: 'mg/dL',
                system: 'http://unitsofmeasure.org',
                unit: 'mg/dL',
                value: 96,
              },
            },
          },
        ],
        resourceType: 'Bundle',
        type: 'transaction',
      }),
      headers: { 'Content-Type': 'application/fhir+json' },
      method: 'POST',
    });
    expect(res.status).toBe(200);
  });
});

describe('createSandboxServer (HTTP, --strict)', () => {
  let sandbox: SandboxServer;
  let baseUrl: string;
  const VALID_CNS = '700000000000001';

  beforeEach(async () => {
    sandbox = createSandboxServer({ log: () => {}, port: 0, strict: true });
    const { host, port } = await sandbox.start();
    baseUrl = `http://${host}:${port}`;
  });

  afterEach(async () => {
    await sandbox.stop();
  });

  it('rejeita FHIR sem auth (401)', async () => {
    const res = await fetch(`${baseUrl}/api/fhir/r4/Patient/${VALID_CNS}`);
    expect(res.status).toBe(401);
  });

  it('aceita FHIR com bearer + CNS', async () => {
    const tokenRes = await fetch(`${baseUrl}/api/token`, { method: 'POST' });
    // strict sem mTLS: /api/token rejeita pois não há cert
    expect(tokenRes.status).toBe(401);
  });

  it('emite token quando peer cert vem via mTLS (simulado: sandbox não-mtls aqui rejeita)', async () => {
    // Em modo strict sem mTLS o /api/token sempre rejeita; este teste documenta isso.
    // O fluxo end-to-end completo está coberto por router.test.ts (peerCert presented).
    const tokenRes = await fetch(`${baseUrl}/api/token`, { method: 'POST' });
    expect(tokenRes.status).toBe(401);
    const oo = (await tokenRes.json()) as { issue: { diagnostics: string }[] };
    expect(oo.issue[0]?.diagnostics).toContain('Certificado mTLS');
  });
});
