import { describe, expect, it } from 'vitest';

import { LabAccessConfigError, RevocationPendingError, TokensDiscardedError } from '../errors';
import { bundle, connect, createHarness, openJourney } from './fake-lab';
import { API_BASE, CPF_PATIENT, jsonResponse, PROVIDER_ID } from './helpers';

const isDelete = (call: { method: string }) => call.method === 'DELETE';

describe('revogação pelo lado do receptor', () => {
  it('RCP-017: revogar pelo aplicativo vira DELETE do consentimento, feito com token de provedor', async () => {
    const harness = await createHarness();
    const { access, consent } = await connect(harness);
    await access.revoke();

    const revocation = harness.lab.calls.find(isDelete)!;
    expect(revocation.url).toBe(`${API_BASE}/consents/${consent.consentId}?reason=PATIENT_REQUEST`);
    const token = revocation.headers.Authorization!.slice('Bearer '.length);
    expect(harness.lab.tokens.get(token)).toEqual({ kind: 'provider', scope: 'consent.manage' });
    expect(harness.lab.consents.get(consent.consentId)!.body).toMatchObject({
      status: 'REVOKED',
      status_reason: { code: 'PATIENT_REQUEST', ended_via: 'RECEIVER' },
    });
    await expect(access.searchDiagnosticReports()).rejects.toBeInstanceOf(TokensDiscardedError);
  });

  it('RCP-017: com o provedor fora do ar, os tokens ficam descartados do mesmo jeito', async () => {
    const harness = await createHarness();
    harness.lab.fhir = () => jsonResponse(200, bundle([]));
    const { access, consent, provider } = await connect(harness);
    for (let i = 0; i < 3; i += 1) harness.lab.failNext(isDelete, 'network');

    const error = await access.revoke().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RevocationPendingError);
    expect(error).toMatchObject({ consentId: consent.consentId, retryable: true });
    expect(harness.sleeps).toEqual([1000, 2000]);

    await expect(access.searchDiagnosticReports()).rejects.toBeInstanceOf(TokensDiscardedError);
    await expect(access.readPatient()).rejects.toBeInstanceOf(TokensDiscardedError);
    expect(() => access.exportState()).toThrowError(TokensDiscardedError);
    expect(harness.lab.fhirCalls).toHaveLength(0);

    // Mais tarde, a repetição do calendário conclui a revogação.
    harness.lab.now = new Date(harness.lab.now.getTime() + 60 * 60 * 1000);
    await harness.client.retryPendingRevocations();
    expect(harness.lab.consents.get(consent.consentId)!.body.status).toBe('REVOKED');
    expect(provider.providerId).toBe(PROVIDER_ID);
  });

  it('RCP-017: o endpoint de revogação de token do RFC 7009 nunca substitui o DELETE do consentimento', async () => {
    const harness = await createHarness();
    harness.lab.metadata.revocation_endpoint = 'https://mtls.auth.laboratorio.example/revoke';
    const { access } = await connect(harness);
    await access.revoke();
    expect(harness.lab.calls.some((call) => call.url.endsWith('/revoke'))).toBe(false);
    expect(harness.lab.calls.filter(isDelete)).toHaveLength(1);
  });

  it('aceita RECEIVER_TERMINATION e recusa motivo desconhecido', async () => {
    const harness = await createHarness();
    const { access, consent, provider } = await connect(harness);
    await expect(
      provider.revokeConsent(consent.consentId, 'OUTRO' as never),
    ).rejects.toBeInstanceOf(LabAccessConfigError);
    await expect(provider.revokeConsent('a b')).rejects.toBeInstanceOf(LabAccessConfigError);
    await access.revoke('RECEIVER_TERMINATION');
    expect(harness.lab.calls.find(isDelete)!.url).toContain('reason=RECEIVER_TERMINATION');
  });

  it('RCP-029: revogar consentimento em estado final conta como revogação concluída', async () => {
    const harness = await createHarness();
    const { access, consent, provider } = await connect(harness);
    await access.revoke();

    await expect(provider.revokeConsent(consent.consentId)).resolves.toBeUndefined();
    const last = harness.lab.calls.filter(isDelete).at(-1)!;
    expect(last.url).toContain(consent.consentId);
    expect(await harness.client.pendingRevocations()).toEqual([]);
    // Revogar de novo pelo acesso já descartado não chama o provedor outra vez.
    const before = harness.lab.calls.length;
    await access.revoke();
    expect(harness.lab.calls).toHaveLength(before);
  });

  it('desistir de um consentimento ainda não autorizado também usa DELETE', async () => {
    const harness = await createHarness();
    const { consent, provider } = await openJourney(harness);
    await provider.revokeConsent(consent.consentId, 'RECEIVER_TERMINATION');
    expect(harness.lab.consents.get(consent.consentId)!.body.status).toBe('REJECTED');
  });

  it('discard() descarta os tokens sem chamar o provedor', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    const before = harness.lab.calls.length;
    access.discard();
    await expect(access.readPatient()).rejects.toBeInstanceOf(TokensDiscardedError);
    expect(harness.lab.calls).toHaveLength(before);
  });
});

describe('getConsent com token de provedor', () => {
  it('RCP-026: campos que o cliente não conhece são deixados de lado na leitura do consentimento', async () => {
    const harness = await createHarness();
    const { access, consent, provider } = await connect(harness);
    harness.lab.failNext(
      (call) => call.method === 'GET' && call.url.includes('/consents/'),
      jsonResponse(200, {
        ...harness.lab.consents.get(consent.consentId)!.body,
        campo_de_versao_futura: { x: 1 },
        patient: { cpf: CPF_PATIENT, fhir_id: 'pac-teste-1' },
      }),
    );

    const read = await provider.getConsent(consent.consentId);
    expect(Object.keys(read).sort()).toEqual([
      'consentId',
      'creationDateTime',
      'expirationDateTime',
      'purpose',
      'scopes',
      'status',
      'statusUpdateDateTime',
    ]);
    expect(read.status).toBe('AUTHORISED');
    expect(JSON.stringify(read)).not.toContain(CPF_PATIENT);
    access.discard();
  });

  it('devolve o motivo do encerramento em estado final', async () => {
    const harness = await createHarness();
    const { access, consent, provider } = await connect(harness);
    await access.revoke();
    harness.lab.consents.get(consent.consentId)!.body.status_reason = {
      additional_information: 'Revogado no aplicativo.',
      code: 'PATIENT_REQUEST',
      ended_via: 'RECEIVER',
    };

    const read = await provider.getConsent(consent.consentId);
    expect(read).toMatchObject({
      status: 'REVOKED',
      statusReason: {
        additionalInformation: 'Revogado no aplicativo.',
        code: 'PATIENT_REQUEST',
        endedVia: 'RECEIVER',
      },
    });
  });

  it('consentimento desconhecido devolve CONSENT_NOT_FOUND', async () => {
    const harness = await createHarness();
    await expect(
      harness.client.provider(PROVIDER_ID).getConsent('00000000-0000-4000-8000-000000000000'),
    ).rejects.toMatchObject({
      code: 'CONSENT_NOT_FOUND',
      name: 'LabAccessRequestError',
      status: 404,
    });
  });
});
