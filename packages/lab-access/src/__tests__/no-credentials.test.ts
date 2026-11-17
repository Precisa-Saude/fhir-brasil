import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { PAYMENT_LINK_URL, readPaymentLink } from '../appointment';
import { CONSENT_STATUS_CHECK_INTERVAL_MS } from '../constants';
import * as api from '../index';
import { AUTHORIZATION_ENDPOINT, bundle, connect, createHarness } from './fake-lab';
import { jsonResponse } from './helpers';

/** Nomes que indicariam credencial do paciente em uma requisição ou na API. */
const CREDENTIAL =
  /pass(word|wd)?$|senha|username|user_name|login|otp|credential|cookie|secret|pin$/i;

const SRC = new URL('../', import.meta.url);

function sourceFiles(): string[] {
  return readdirSync(fileURLToPath(SRC)).filter((name) => name.endsWith('.ts'));
}

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

async function fullJourney() {
  const harness = await createHarness();
  harness.lab.fhir = (call) =>
    call.method === 'GET'
      ? jsonResponse(200, bundle([]))
      : jsonResponse(201, { ...(call.json as object), id: 'ag-1' });
  const { access } = await connect(harness);
  await access.searchDiagnosticReports();
  harness.lab.now = new Date(harness.lab.now.getTime() + 600_000);
  await access.readPatient().catch(() => {});
  await harness.client.provider(access.providerId).searchLocations();
  await access.revoke();
  return harness;
}

describe('nenhuma credencial de paciente', () => {
  it('RCP-002: nenhuma requisição da jornada completa leva campo de credencial do paciente', async () => {
    const harness = await fullJourney();
    expect(harness.lab.calls.length).toBeGreaterThan(8);

    for (const call of harness.lab.calls) {
      const names = [
        ...Object.keys(call.headers),
        ...(call.form ? [...call.form.keys()] : []),
        ...(call.json && typeof call.json === 'object' ? Object.keys(call.json) : []),
        ...new URL(call.url).searchParams.keys(),
      ];
      for (const name of names) {
        // O único "segredo" que o cliente apresenta é dele mesmo: a asserção assinada.
        expect(name, `${call.method} ${call.url}`).not.toMatch(CREDENTIAL);
      }
      expect(call.headers.Cookie).toBeUndefined();
    }
  });

  it('RCP-002: só usa as três concessões do protocolo, nunca password', async () => {
    const harness = await fullJourney();
    const grants = new Set(
      harness.lab.calls.map((call) => call.form?.get('grant_type')).filter(Boolean),
    );
    expect([...grants].sort()).toEqual([
      'authorization_code',
      'client_credentials',
      'refresh_token',
    ]);
  });

  it('RCP-002: a API pública não tem função, método ou opção para credencial do paciente', () => {
    const names = [
      ...Object.keys(api),
      ...Object.getOwnPropertyNames(api.LabAccessClient.prototype),
      ...Object.getOwnPropertyNames(api.ProviderAccess.prototype),
      ...Object.getOwnPropertyNames(api.PatientAccess.prototype),
    ];
    expect(names.length).toBeGreaterThan(60);
    for (const name of names) expect(name).not.toMatch(CREDENTIAL);
  });

  it('RCP-002: o código do pacote não tem identificador de senha ou credencial de paciente', () => {
    const forbidden = /password|passwd|senha|username|login_hint|\botp\b|(?<!client_)credential/i;
    // Única exceção: a lista de concessões que os metadados não podem anunciar,
    // que precisa nomear a concessão de senha para recusá-la.
    const refusedGrants =
      /^const FORBIDDEN_GRANT_TYPES: readonly string\[\] = \['password', 'implicit'\];$/m;
    for (const file of sourceFiles()) {
      const code = withoutComments(
        readFileSync(fileURLToPath(new URL(file, SRC)), 'utf-8'),
      ).replace(refusedGrants, '');
      expect(code, file).not.toMatch(forbidden);
    }
    expect(sourceFiles().length).toBeGreaterThan(15);
  });

  it('RCP-001: o pacote nunca busca a URL de autorização: ela é só devolvida para o navegador do sistema', async () => {
    const harness = await fullJourney();
    expect(harness.lab.calls.some((call) => call.url.startsWith(AUTHORIZATION_ENDPOINT))).toBe(
      false,
    );
  });

  it('RCP-022: o pacote não busca nem altera o link de pagamento do agendamento', async () => {
    const harness = await createHarness();
    const paymentUrl = 'https://pagamentos.laboratorio.example/p/abc?x=1';
    const extension = [{ url: PAYMENT_LINK_URL, valueUrl: paymentUrl }];
    harness.lab.fhir = (call) =>
      jsonResponse(201, { ...(call.json as object), extension, id: 'ag-1', status: 'pending' });
    const { access } = await connect(harness);

    const created = await access.createAppointment({
      basedOn: [{ reference: '#e1' }],
      contained: [
        {
          code: { coding: [{ code: '718-7', system: 'http://loinc.org' }] },
          id: 'e1',
          intent: 'order',
          resourceType: 'ServiceRequest',
          status: 'active',
          subject: { reference: 'Patient/pac-teste-1' },
        },
      ],
      identifier: [{ system: 'https://app-paciente.example/agendamentos', value: 'a-1' }],
      participant: [
        { actor: { reference: 'Patient/pac-teste-1', type: 'Patient' }, status: 'accepted' },
        {
          actor: { reference: 'Location/unidade-norte', type: 'Location' },
          status: 'needs-action',
        },
      ],
      resourceType: 'Appointment',
      status: 'proposed',
    });

    expect(created.resource.extension).toEqual(extension);
    // O link sai exatamente como veio, para o aplicativo abrir no navegador do sistema.
    expect(readPaymentLink(created.resource)).toBe(paymentUrl);
    expect(harness.lab.calls.some((call) => call.url.startsWith('https://pagamentos.'))).toBe(
      false,
    );
  });

  it('RCP-019: expõe o intervalo máximo de 24 horas entre consultas de estado do consentimento', () => {
    expect(CONSENT_STATUS_CHECK_INTERVAL_MS).toBe(24 * 60 * 60 * 1000);
    expect(api.CONSENT_STATUS_CHECK_INTERVAL_MS).toBe(CONSENT_STATUS_CHECK_INTERVAL_MS);
  });

  it('REG-004: expõe os intervalos de busca do registro (ao menos a cada 60 minutos)', () => {
    expect(api.REGISTRY_MAX_FETCH_INTERVAL_MS).toBe(60 * 60 * 1000);
    expect(api.REGISTRY_MIN_FETCH_INTERVAL_MS).toBe(5 * 60 * 1000);
  });
});
