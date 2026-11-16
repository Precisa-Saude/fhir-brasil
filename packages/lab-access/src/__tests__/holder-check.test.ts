import { describe, expect, it } from 'vitest';

import type { InteractionEvent } from '../context';
import { HolderVerificationError, LabAccessConfigError, PatientMismatchError } from '../errors';
import { createHarness, type Harness, openJourney } from './fake-lab';
import { API_BASE, CPF_OTHER, CPF_PATIENT, jsonResponse, operationOutcome } from './helpers';

const OTHER = { cpf: CPF_OTHER, fhirId: 'pac-outro' };
const isDelete = (call: { method: string }) => call.method === 'DELETE';
const deletes = (harness: Harness) => harness.lab.calls.filter(isDelete);

async function attempt(harness: Harness, patient = OTHER, expectedCpf = CPF_PATIENT) {
  const { consent, journey, provider } = await openJourney(harness);
  const callback = harness.lab.authorize(journey.authorizationUrl, patient);
  const error = await provider.completeAuthorization({ callback, expectedCpf, journey }).then(
    () => undefined,
    (err: unknown) => err,
  );
  return { consent, error, provider };
}

describe('conferência do titular', () => {
  it('RCP-013: titular divergente termina em revogação com PATIENT_MISMATCH, sem acesso à API FHIR e sem tokens', async () => {
    const harness = await createHarness();
    const { consent, error } = await attempt(harness);

    expect(error).toBeInstanceOf(PatientMismatchError);
    expect(error).toMatchObject({
      consentId: consent.consentId,
      retryable: false,
      revocation: 'confirmed',
    });
    expect((error as PatientMismatchError).interactionId).toMatch(/^[0-9a-f-]{36}$/);

    expect(harness.lab.fhirCalls).toHaveLength(0);
    const [revocation] = deletes(harness);
    expect(revocation!.url).toBe(
      `${API_BASE}/consents/${consent.consentId}?reason=PATIENT_MISMATCH`,
    );
    const token = revocation!.headers.Authorization!.slice('Bearer '.length);
    expect(harness.lab.tokens.get(token)).toEqual({ kind: 'provider', scope: 'consent.manage' });
    expect(harness.lab.consents.get(consent.consentId)!.body).toMatchObject({
      status: 'REVOKED',
      status_reason: { code: 'PATIENT_MISMATCH', ended_via: 'RECEIVER' },
    });
  });

  it('RCP-013: o erro não carrega token nem nenhum dos dois CPFs', async () => {
    const harness = await createHarness();
    const { error } = await attempt(harness);

    const visible = [
      (error as Error).message,
      (error as Error).stack,
      JSON.stringify(error),
      JSON.stringify(Object.getOwnPropertyNames(error).map((key) => (error as never)[key])),
    ].join('\n');
    expect(visible).not.toContain(CPF_PATIENT);
    expect(visible).not.toContain(CPF_OTHER);
    expect(visible).not.toMatch(/patient-token|refresh-/);
  });

  it('RCP-013: o interactionId do erro é o da leitura do consentimento', async () => {
    const harness = await createHarness();
    const { consent, error } = await attempt(harness);
    const read = harness.lab.calls.find(
      (call) => call.method === 'GET' && call.url === `${API_BASE}/consents/${consent.consentId}`,
    )!;
    expect((error as PatientMismatchError).interactionId).toBe(
      read.headers['x-fapi-interaction-id'],
    );
  });

  it('RCP-014: a revogação por divergência é reenviada depois de falha, sem tocar nos tokens de paciente', async () => {
    const harness = await createHarness();
    harness.lab.failNext(isDelete, 'network');
    harness.lab.failNext(
      isDelete,
      jsonResponse(503, operationOutcome('PROVIDER_UNAVAILABLE', 'transient'), {
        'Retry-After': '3',
      }),
    );
    const { error } = await attempt(harness);

    expect(error).toMatchObject({ name: 'PatientMismatchError', revocation: 'confirmed' });
    expect(deletes(harness)).toHaveLength(3);
    expect(harness.sleeps).toEqual([1000, 3000]);
    expect(harness.lab.fhirCalls).toHaveLength(0);
    const patientTokenUses = harness.lab.calls.filter((call) =>
      call.headers.Authorization?.startsWith('Bearer patient-token'),
    );
    // Só a leitura da conferência usou o token de paciente.
    expect(patientTokenUses).toHaveLength(1);
  });

  it('RCP-014: se o DELETE não é confirmado, avisa que a revogação está pendente', async () => {
    const harness = await createHarness();
    for (let i = 0; i < 3; i += 1) harness.lab.failNext(isDelete, 'network');
    const { consent, error, provider } = await attempt(harness);

    expect(error).toMatchObject({ name: 'PatientMismatchError', revocation: 'pending' });
    expect(deletes(harness)).toHaveLength(3);

    // O aplicativo repete a revogação com o mesmo motivo, mais tarde.
    await provider.revokeConsent(consent.consentId, 'PATIENT_MISMATCH');
    expect(harness.lab.consents.get(consent.consentId)!.body.status).toBe('REVOKED');
  });

  it('considera a revogação confirmada quando o consentimento já está em estado final', async () => {
    const harness = await createHarness();
    harness.lab.failNext(
      isDelete,
      jsonResponse(422, operationOutcome('CONSENT_INVALID_STATE', 'business-rule')),
    );
    const { error } = await attempt(harness);
    expect(error).toMatchObject({ name: 'PatientMismatchError', revocation: 'confirmed' });
  });

  it('compara os 11 dígitos, sem pontuação', async () => {
    const harness = await createHarness();
    const { journey, provider } = await openJourney(harness);
    const callback = harness.lab.authorize(journey.authorizationUrl, {
      cpf: CPF_PATIENT,
      fhirId: 'pac-teste-1',
    });
    const access = await provider.completeAuthorization({
      callback,
      expectedCpf: '529.982.247-25',
      journey,
    });
    expect(access.patientFhirId).toBe('pac-teste-1');
    expect(deletes(harness)).toHaveLength(0);
  });

  it('recusa CPF esperado malformado antes de qualquer chamada', async () => {
    const harness = await createHarness();
    const { journey, provider } = await openJourney(harness);
    const callback = harness.lab.authorize(journey.authorizationUrl, OTHER);
    const before = harness.lab.calls.length;

    for (const expectedCpf of ['', '1234567890', '529982247251', 'abcdefghijk']) {
      await expect(
        provider.completeAuthorization({ callback, expectedCpf, journey }),
      ).rejects.toBeInstanceOf(LabAccessConfigError);
    }
    expect(harness.lab.calls).toHaveLength(before);
  });

  const unverifiable: [string, (body: Record<string, unknown>) => unknown][] = [
    ['sem o bloco patient', (body) => ({ ...body, patient: undefined })],
    [
      'com CPF fora do formato',
      (body) => ({ ...body, patient: { cpf: '529.982.247-25', fhir_id: 'p' } }),
    ],
    ['sem fhir_id', (body) => ({ ...body, patient: { cpf: CPF_PATIENT } })],
    [
      'com fhir_id que não é id FHIR',
      (body) => ({ ...body, patient: { cpf: CPF_PATIENT, fhir_id: 'a/b' } }),
    ],
    ['fora de AUTHORISED', (body) => ({ ...body, status: 'AWAITING_AUTHORISATION' })],
    ['de outro consentimento', (body) => ({ ...body, consent_id: 'outro' })],
  ];

  it.each(unverifiable)(
    'leitura %s: não conclui o vínculo e encerra o consentimento',
    async (_name, change) => {
      const harness = await createHarness();
      const { consent, journey, provider } = await openJourney(harness);
      const callback = harness.lab.authorize(journey.authorizationUrl, {
        cpf: CPF_PATIENT,
        fhirId: 'pac-teste-1',
      });
      const stored = harness.lab.consents.get(consent.consentId)!;
      harness.lab.failNext(
        (call) => call.method === 'GET' && call.url.includes('/consents/'),
        jsonResponse(200, change({ ...stored.body, patient: stored.patient })),
      );

      const error = await provider
        .completeAuthorization({ callback, expectedCpf: CPF_PATIENT, journey })
        .catch((err: unknown) => err);
      expect(error).toBeInstanceOf(HolderVerificationError);
      expect(error).toMatchObject({ consentId: consent.consentId, revocation: 'confirmed' });
      expect(deletes(harness)[0]!.url).toContain('reason=RECEIVER_TERMINATION');
      expect(harness.lab.fhirCalls).toHaveLength(0);
    },
  );

  it('se a leitura do consentimento falha, não libera os tokens', async () => {
    const harness = await createHarness();
    const { journey, provider } = await openJourney(harness);
    const callback = harness.lab.authorize(journey.authorizationUrl, {
      cpf: CPF_PATIENT,
      fhirId: 'pac-teste-1',
    });
    harness.lab.failNext(
      (call) => call.method === 'GET' && call.url.includes('/consents/'),
      jsonResponse(404, operationOutcome('CONSENT_NOT_FOUND', 'not-found')),
    );

    const error = await provider
      .completeAuthorization({ callback, expectedCpf: CPF_PATIENT, journey })
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(HolderVerificationError);
    expect((error as Error).cause).toMatchObject({ code: 'CONSENT_NOT_FOUND' });
    expect(deletes(harness)).toHaveLength(1);
    expect(harness.lab.fhirCalls).toHaveLength(0);
  });

  it('RCP-015: os eventos de auditoria não carregam CPF nem token', async () => {
    const events: InteractionEvent[] = [];
    const harness = await createHarness({
      config: { onInteraction: (event) => events.push(event) },
    });
    await attempt(harness);

    expect(events.length).toBeGreaterThan(2);
    const text = JSON.stringify(events);
    expect(text).not.toContain(CPF_PATIENT);
    expect(text).not.toContain(CPF_OTHER);
    expect(text).not.toMatch(/token-\d|refresh-\d/);
    const read = events.find(
      (event) => event.method === 'GET' && event.resource.includes('/consents/'),
    );
    expect(read).toMatchObject({ consentId: expect.any(String), status: 200 });
  });

  it('RCP-015: o CPF recebido não fica no acesso devolvido nem no estado exportado', async () => {
    const harness = await createHarness();
    const { journey, provider } = await openJourney(harness);
    const callback = harness.lab.authorize(journey.authorizationUrl, {
      cpf: CPF_PATIENT,
      fhirId: 'pac-teste-1',
    });
    const access = await provider.completeAuthorization({
      callback,
      expectedCpf: CPF_PATIENT,
      journey,
    });

    expect(JSON.stringify(access.exportState())).not.toContain(CPF_PATIENT);
    expect(JSON.stringify(await access.getConsentRecord())).not.toContain(CPF_PATIENT);
    expect(JSON.stringify(Object.entries(access))).not.toContain(CPF_PATIENT);
  });
});
