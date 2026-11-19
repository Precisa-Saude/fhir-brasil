import { describe, expect, it } from 'vitest';

import {
  ConsentEndedError,
  IssuerMismatchError,
  LabAccessConfigError,
  RefreshTokenRevokedError,
  RegistryExpiredError,
  ScopeError,
  TokensDiscardedError,
} from '../errors';
import type { PatientAccessState } from '../patient-access';
import { bundle, connect, createHarness, type Harness, openJourney } from './fake-lab';
import { FHIR_BASE, jsonResponse, operationOutcome, PROVIDER_ID } from './helpers';

const refreshes = (harness: Harness) =>
  harness.lab.calls.filter((call) => call.form?.get('grant_type') === 'refresh_token');

async function connected() {
  const harness = await createHarness();
  harness.lab.fhir = () => jsonResponse(200, bundle([]));
  return { harness, ...(await connect(harness)) };
}

describe('token de paciente', () => {
  it('usa o token de acesso enquanto vale e renova 60 segundos antes de expirar', async () => {
    const { access, harness } = await connected();
    await access.searchDiagnosticReports();
    harness.lab.now = new Date(harness.lab.now.getTime() + 539_000);
    await access.searchDiagnosticReports();
    expect(refreshes(harness)).toHaveLength(0);

    harness.lab.now = new Date(harness.lab.now.getTime() + 2_000);
    await access.searchDiagnosticReports();
    const [refresh] = refreshes(harness);
    expect([...refresh!.form!.keys()].sort()).toEqual([
      'client_assertion',
      'client_assertion_type',
      'grant_type',
      'refresh_token',
    ]);
    expect(refresh!.form!.get('refresh_token')).toMatch(/^refresh-/);
  });

  it('chamadas concorrentes compartilham uma única renovação', async () => {
    const { access, harness } = await connected();
    harness.lab.now = new Date(harness.lab.now.getTime() + 600_000);
    await Promise.all(Array.from({ length: 5 }, () => access.searchDiagnosticReports()));
    expect(refreshes(harness)).toHaveLength(1);
  });

  it('RCP-010: refresh token trocado na renovação substitui o anterior nas chamadas seguintes', async () => {
    const updates: PatientAccessState[] = [];
    const harness = await createHarness();
    harness.lab.fhir = () => jsonResponse(200, bundle([]));
    const { journey, provider } = await openJourney(harness);
    const access = await provider.completeAuthorization({
      callback: harness.lab.authorize(journey.authorizationUrl, {
        cpf: '52998224725',
        fhirId: 'pac-teste-1',
      }),
      expectedCpf: '52998224725',
      journey,
      onTokensUpdated: (state) => updates.push(state),
    });
    const original = access.exportState().refreshToken;

    harness.lab.rotateRefreshTo = 'refresh-rotacionado';
    harness.lab.now = new Date(harness.lab.now.getTime() + 600_000);
    await access.searchDiagnosticReports();
    expect(access.exportState().refreshToken).toBe('refresh-rotacionado');
    expect(updates.at(-1)!.refreshToken).toBe('refresh-rotacionado');

    harness.lab.now = new Date(harness.lab.now.getTime() + 600_000);
    await access.searchDiagnosticReports();
    const sent = refreshes(harness).map((call) => call.form!.get('refresh_token'));
    expect(sent).toEqual([original, 'refresh-rotacionado']);
  });

  it('mantém o refresh token quando a renovação não devolve outro', async () => {
    const { access, harness } = await connected();
    const original = access.exportState().refreshToken;
    harness.lab.now = new Date(harness.lab.now.getTime() + 600_000);
    await access.searchDiagnosticReports();
    expect(access.exportState().refreshToken).toBe(original);
  });

  it('diante de 401 TOKEN_INVALID em recurso, renova uma vez e repete', async () => {
    const { access, harness } = await connected();
    harness.lab.expireAccessTokens('patient');
    await access.searchDiagnosticReports();

    expect(refreshes(harness)).toHaveLength(1);
    expect(harness.lab.fhirCalls).toHaveLength(2);
  });

  it('não insiste quando o 401 se repete depois da renovação', async () => {
    const { access, harness } = await connected();
    const denied = jsonResponse(401, operationOutcome('TOKEN_INVALID', 'login'));
    harness.lab.failNext((call) => call.url.startsWith(FHIR_BASE), denied);
    harness.lab.failNext((call) => call.url.startsWith(FHIR_BASE), denied);
    await expect(access.searchDiagnosticReports()).rejects.toMatchObject({ code: 'TOKEN_INVALID' });
    expect(refreshes(harness)).toHaveLength(1);
  });

  it('encerra o acesso se a revogação aparecer no 401 depois da renovação', async () => {
    const { access, consent, harness } = await connected();
    harness.lab.failNext(
      (call) => call.url.startsWith(FHIR_BASE),
      jsonResponse(401, operationOutcome('TOKEN_INVALID', 'login')),
    );
    // A revogação acontece depois da renovação, antes da chamada repetida.
    harness.lab.fhir = () => {
      harness.lab.endConsent(consent.consentId, 'REVOKED', 'PATIENT_REQUEST', 'PROVIDER');
      return jsonResponse(401, operationOutcome('CONSENT_REVOKED', 'security'));
    };

    await expect(access.searchDiagnosticReports()).rejects.toMatchObject({
      name: 'ConsentEndedError',
      status: 'REVOKED',
    });
    expect(refreshes(harness)).toHaveLength(1);
    expect(() => access.exportState()).toThrowError(TokensDiscardedError);
  });

  it('RCP-018: renovação recusada com invalid_grant leva à leitura do consentimento e a um erro com o estado atual', async () => {
    const { access, consent, harness } = await connected();
    harness.lab.endConsent(consent.consentId, 'REVOKED', 'PATIENT_REQUEST', 'PROVIDER');
    harness.lab.now = new Date(harness.lab.now.getTime() + 600_000);

    const error = await access.searchDiagnosticReports().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ConsentEndedError);
    expect(error).toMatchObject({
      consentId: consent.consentId,
      endedVia: 'PROVIDER',
      reasonCode: 'PATIENT_REQUEST',
      status: 'REVOKED',
    });

    const lookup = harness.lab.calls.at(-1)!;
    expect(lookup.method).toBe('GET');
    expect(lookup.url).toContain(`/consents/${consent.consentId}`);
    const token = lookup.headers.Authorization!.slice('Bearer '.length);
    expect(harness.lab.tokens.get(token)).toMatchObject({ kind: 'provider' });

    // Os tokens foram descartados.
    await expect(access.searchDiagnosticReports()).rejects.toBeInstanceOf(TokensDiscardedError);
    expect(() => access.exportState()).toThrowError(TokensDiscardedError);
  });

  it('RCP-018: consentimento expirado aparece como EXPIRED com MAX_DATE_REACHED', async () => {
    const { access, consent, harness } = await connected();
    harness.lab.endConsent(consent.consentId, 'EXPIRED', 'MAX_DATE_REACHED', 'SYSTEM');
    harness.lab.now = new Date(harness.lab.now.getTime() + 600_000);
    await expect(access.searchDiagnosticReports()).rejects.toMatchObject({
      reasonCode: 'MAX_DATE_REACHED',
      status: 'EXPIRED',
    });
  });

  it('RCP-018: invalid_grant com consentimento AUTHORISED indica refresh token revogado', async () => {
    const { access, harness } = await connected();
    harness.lab.failNext(
      (call) => call.form?.get('grant_type') === 'refresh_token',
      jsonResponse(400, { error: 'invalid_grant' }),
    );
    harness.lab.now = new Date(harness.lab.now.getTime() + 600_000);
    await expect(access.searchDiagnosticReports()).rejects.toBeInstanceOf(RefreshTokenRevokedError);
    await expect(access.searchDiagnosticReports()).rejects.toBeInstanceOf(TokensDiscardedError);
  });

  it('diante de 401 CONSENT_REVOKED em recurso, consulta o consentimento sem tentar renovar', async () => {
    const { access, consent, harness } = await connected();
    harness.lab.endConsent(consent.consentId, 'REVOKED', 'PROVIDER_SECURITY', 'PROVIDER');
    harness.lab.failNext(
      (call) => call.url.startsWith(FHIR_BASE),
      jsonResponse(401, operationOutcome('CONSENT_REVOKED', 'security'), {
        'WWW-Authenticate': 'Bearer error="invalid_token", error_description="consent revoked"',
      }),
    );
    await expect(access.searchDiagnosticReports()).rejects.toMatchObject({
      name: 'ConsentEndedError',
      reasonCode: 'PROVIDER_SECURITY',
      status: 'REVOKED',
    });
    expect(refreshes(harness)).toHaveLength(0);
  });

  it('401 CONSENT_EXPIRED com consentimento ainda AUTHORISED devolve o erro original', async () => {
    const { access, harness } = await connected();
    harness.lab.failNext(
      (call) => call.url.startsWith(FHIR_BASE),
      jsonResponse(401, operationOutcome('CONSENT_EXPIRED', 'expired')),
    );
    await expect(access.searchDiagnosticReports()).rejects.toMatchObject({
      code: 'CONSENT_EXPIRED',
      name: 'LabAccessAuthorizationError',
    });
  });

  it('recusa localmente chamada de escopo que o consentimento não tem', async () => {
    const harness = await createHarness();
    const { journey, provider } = await openJourney(harness, ['consent.read']);
    const access = await provider.completeAuthorization({
      callback: harness.lab.authorize(journey.authorizationUrl, {
        cpf: '52998224725',
        fhirId: 'pac-teste-1',
      }),
      expectedCpf: '52998224725',
      journey,
    });
    await expect(access.searchDiagnosticReports()).rejects.toBeInstanceOf(ScopeError);
    expect(harness.lab.fhirCalls).toHaveLength(0);
  });

  it('retoma o acesso a partir do estado exportado', async () => {
    const { access, harness } = await connected();
    const state = JSON.parse(JSON.stringify(access.exportState())) as PatientAccessState;
    expect(Object.keys(state).sort()).toEqual([
      'accessToken',
      'accessTokenExpiresAt',
      'consentExpiresAt',
      'consentId',
      'issuer',
      'patientFhirId',
      'providerId',
      'refreshToken',
      'scopes',
    ]);

    const resumed = harness.client.provider(PROVIDER_ID).resumePatientAccess(state);
    await resumed.searchDiagnosticReports();
    expect(harness.lab.fhirCalls.at(-1)!.url).toContain('patient=pac-teste-1');
    expect(refreshes(harness)).toHaveLength(0);
  });

  it('recusa estado de outro provedor, de outro issuer ou malformado', async () => {
    const { access, harness } = await connected();
    const state = access.exportState();
    const provider = harness.client.provider(PROVIDER_ID);

    expect(() =>
      provider.resumePatientAccess({ ...state, issuer: 'https://antigo.example' }),
    ).toThrowError(IssuerMismatchError);
    expect(() => provider.resumePatientAccess({ ...state, providerId: 'outro' })).toThrowError(
      LabAccessConfigError,
    );
    expect(() => provider.resumePatientAccess({ ...state, patientFhirId: 'a/b' })).toThrowError(
      LabAccessConfigError,
    );
    expect(() => provider.resumePatientAccess({ ...state, consentId: 'a b' })).toThrowError(
      LabAccessConfigError,
    );
    expect(() =>
      provider.resumePatientAccess({ ...state, scopes: ['catalog.read'] as never }),
    ).toThrowError(LabAccessConfigError);
  });

  it('REG-008: com o registro expirado, a renovação por refresh token segue por até 7 dias e depois para', async () => {
    const { access, harness } = await connected();

    harness.lab.now = new Date('2026-12-23T11:59:00Z');
    await access.searchDiagnosticReports();
    expect(refreshes(harness)).toHaveLength(1);

    harness.lab.now = new Date('2026-12-23T12:10:01Z');
    await expect(access.searchDiagnosticReports()).rejects.toBeInstanceOf(RegistryExpiredError);
    expect(refreshes(harness)).toHaveLength(1);
  });

  it('sem refresh token, trata o fim do token de acesso como perda do acesso', async () => {
    const { access, harness } = await connected();
    const state = { ...access.exportState(), refreshToken: undefined };
    const resumed = harness.client.provider(PROVIDER_ID).resumePatientAccess(state);
    harness.lab.now = new Date(harness.lab.now.getTime() + 600_000);
    await expect(resumed.searchDiagnosticReports()).rejects.toBeInstanceOf(
      RefreshTokenRevokedError,
    );
  });
});
