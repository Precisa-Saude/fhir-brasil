import { describe, expect, it } from 'vitest';

import { RegistryExpiredError, RevocationPendingError } from '../errors';
import { connect, createHarness, type Harness, PURPOSE, TOKEN_ENDPOINT } from './fake-lab';
import { CPF_PATIENT, PROVIDER_ID, REDIRECT_URI } from './helpers';

/** `expires_at` do registro de exemplo. */
const EXPIRES_AT = Date.parse('2026-12-16T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const isDelete = (call: { method: string }) => call.method === 'DELETE';
const clientCredentials = (harness: Harness) =>
  harness.lab.calls.filter(
    (call) => call.url === TOKEN_ENDPOINT && call.form?.get('grant_type') === 'client_credentials',
  );

describe('registro expirado', () => {
  it('REG-008: no dia 1, sem PAR, sem token de catálogo, e consent.manage sozinho revoga', async () => {
    const harness = await createHarness();
    const { access, consent, provider } = await connect(harness);
    const tokensBefore = clientCredentials(harness).length;

    harness.lab.now = new Date(EXPIRES_AT + DAY);
    await expect(provider.searchActivityDefinitions()).rejects.toBeInstanceOf(RegistryExpiredError);
    await expect(provider.searchSchedules({ location: 'unidade-norte' })).rejects.toBeInstanceOf(
      RegistryExpiredError,
    );
    await expect(
      provider.startAuthorization({ expectedCpf: CPF_PATIENT, consent, redirectUri: REDIRECT_URI }),
    ).rejects.toBeInstanceOf(RegistryExpiredError);
    expect(clientCredentials(harness)).toHaveLength(tokensBefore);

    await access.revoke();
    const requested = clientCredentials(harness).slice(tokensBefore);
    expect(requested.map((call) => call.form!.get('scope'))).toEqual(['consent.manage']);
    expect(harness.lab.calls.filter(isDelete)).toHaveLength(1);
    expect(harness.lab.consents.get(consent.consentId)!.body.status).toBe('REVOKED');
    // A leitura do consentimento com token de provedor também segue.
    await expect(provider.getConsent(consent.consentId)).resolves.toMatchObject({
      status: 'REVOKED',
    });
  });

  it('REG-008: criar consentimento com o registro expirado é recusado antes de chamar o provedor', async () => {
    const harness = await createHarness();
    const provider = harness.client.provider(PROVIDER_ID);
    harness.lab.now = new Date(EXPIRES_AT + DAY);
    await expect(
      provider.createConsent(
        {
          expirationDateTime: '2027-05-15T03:00:00Z',
          purpose: PURPOSE,
          scopes: ['results.read'],
        },
        { expectedCpf: CPF_PATIENT },
      ),
    ).rejects.toBeInstanceOf(RegistryExpiredError);
    expect(harness.lab.calls.filter((call) => call.method === 'POST')).toHaveLength(0);
  });

  it('REG-008: depois dos 7 dias, nem consent.manage: a revogação fica pendente', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    const tokensBefore = clientCredentials(harness).length;

    harness.lab.now = new Date(EXPIRES_AT + 7 * DAY + 1000);
    const error = await access.revoke().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RevocationPendingError);
    expect((error as Error).cause).toBeInstanceOf(RegistryExpiredError);
    expect(clientCredentials(harness)).toHaveLength(tokensBefore);
    expect(harness.lab.calls.filter(isDelete)).toHaveLength(0);
  });

  it('RCP-033: com o registro expirado, continua tentando as revogações pendentes com token só de consent.manage', async () => {
    const harness = await createHarness();
    const { access, consent } = await connect(harness);
    const restore = harness.lab.failAll(isDelete, 'network');
    await expect(access.revoke()).rejects.toBeInstanceOf(RevocationPendingError);
    restore();

    harness.lab.now = new Date(EXPIRES_AT + 2 * DAY);
    const tokensBefore = clientCredentials(harness).length;
    expect(await harness.client.retryPendingRevocations()).toMatchObject([
      { consentId: consent.consentId, outcome: 'confirmed' },
    ]);
    const requested = clientCredentials(harness).slice(tokensBefore);
    expect(requested.map((call) => call.form!.get('scope'))).toEqual(['consent.manage']);
    expect(harness.lab.consents.get(consent.consentId)!.body.status).toBe('REVOKED');
  });

  it('RCP-033: passados os 7 dias, a pendência continua e traz a página de consentimentos do provedor', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    const restore = harness.lab.failAll(isDelete, 'network');
    await expect(access.revoke()).rejects.toBeInstanceOf(RevocationPendingError);
    restore();

    harness.lab.now = new Date(EXPIRES_AT + 8 * DAY);
    const before = harness.lab.calls.length;
    const [result] = await harness.client.retryPendingRevocations();
    expect(result).toMatchObject({ outcome: 'pending' });
    expect(result!.error).toBeInstanceOf(RegistryExpiredError);
    expect(harness.lab.calls).toHaveLength(before);
    const [pending] = await harness.client.pendingRevocations();
    expect(pending!.consentManagementUri).toBe(
      'https://www.laboratorio.example/minha-conta/compartilhamentos',
    );
  });
});
