import { describe, expect, it } from 'vitest';

import { RevocationPendingError } from '../errors';
import type { PendingRevocation, RevocationStore } from '../revocation';
import { InMemoryRevocationStore } from '../revocation';
import { connect, createHarness, type Harness, TOKEN_ENDPOINT } from './fake-lab';
import { jsonResponse, operationOutcome, PROVIDER_ID } from './helpers';

const HOUR = 60 * 60 * 1000;
const CONSENT_PAGE = 'https://www.laboratorio.example/minha-conta/compartilhamentos';
const isDelete = (call: { method: string }) => call.method === 'DELETE';
const isClientCredentials = (call: { form?: URLSearchParams; url: string }) =>
  call.url === TOKEN_ENDPOINT && call.form?.get('grant_type') === 'client_credentials';
const deletes = (harness: Harness) => harness.lab.calls.filter(isDelete);

function advance(harness: Harness, ms: number) {
  harness.lab.now = new Date(harness.lab.now.getTime() + ms);
}

/** Conecta e deixa a revogação pedida pelo paciente pendente, com o provedor fora do ar. */
async function pendingAfterOutage(harness: Harness) {
  const { access, consent } = await connect(harness);
  const restore = harness.lab.failAll(isDelete, 'network');
  const error = await access.revoke().catch((err: unknown) => err);
  return { access, consent, error: error as RevocationPendingError, restore };
}

describe('revogação pendente', () => {
  it('RCP-028: faz no máximo três tentativas ao todo, contando o pedido do token de provedor', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    // O token de consent.manage da criação já não vale: a revogação precisa de outro.
    advance(harness, 11 * 60 * 1000);
    const unavailable = jsonResponse(
      503,
      { error: 'temporarily_unavailable' },
      { 'Retry-After': '2' },
    );
    harness.lab.failNext(isClientCredentials, unavailable);
    harness.lab.failNext(isClientCredentials, unavailable);
    harness.lab.failNext(isDelete, 'network');
    const before = harness.lab.calls.length;

    const error = await access.revoke().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RevocationPendingError);
    const after = harness.lab.calls.slice(before);
    expect(after.filter(isClientCredentials)).toHaveLength(3);
    expect(after.filter(isDelete)).toHaveLength(1);
    expect(harness.sleeps).toEqual([2000, 2000]);
  });

  it('RCP-028: grava a pendência com consentimento, provedor, motivo, instante e a página de consentimentos do provedor', async () => {
    const harness = await createHarness();
    const requestedAt = harness.lab.now.toISOString();
    const { consent, error } = await pendingAfterOutage(harness);

    expect(error).toBeInstanceOf(RevocationPendingError);
    expect(deletes(harness)).toHaveLength(3);
    const expected: Partial<PendingRevocation> = {
      attempts: 3,
      consentId: consent.consentId,
      consentManagementUri: CONSENT_PAGE,
      providerId: PROVIDER_ID,
      reason: 'PATIENT_REQUEST',
      requestedAt,
    };
    expect(error.pending).toMatchObject(expected);
    expect(error.pending.nextAttemptAt).toBe(
      new Date(Date.parse(error.pending.lastAttemptAt) + HOUR).toISOString(),
    );
    expect(await harness.client.pendingRevocations()).toEqual([error.pending]);
  });

  it('RCP-028: a pendência fica no armazenamento do aplicativo e um cliente novo a retoma', async () => {
    const saved = new Map<string, PendingRevocation>();
    const store: RevocationStore = {
      list: async () => [...saved.values()],
      remove: async (providerId, consentId) => {
        saved.delete(`${providerId} ${consentId}`);
      },
      save: async (revocation) => {
        saved.set(`${revocation.providerId} ${revocation.consentId}`, revocation);
      },
    };
    const harness = await createHarness({ config: { revocationStore: store } });
    const { consent, restore } = await pendingAfterOutage(harness);
    expect([...saved.values()].map((p) => p.consentId)).toEqual([consent.consentId]);

    // Reinício do backend: outro cliente, o mesmo armazenamento.
    restore();
    const restarted = await createHarness({ config: { revocationStore: store } });
    restarted.lab.consents.set(consent.consentId, harness.lab.consents.get(consent.consentId)!);
    advance(restarted, HOUR);
    const results = await restarted.client.retryPendingRevocations();
    expect(results).toMatchObject([{ consentId: consent.consentId, outcome: 'confirmed' }]);
    expect(saved.size).toBe(0);
  });

  it('RCP-028: repete de hora em hora nas primeiras 24 horas e uma vez por dia depois, uma chamada por vez', async () => {
    const harness = await createHarness();
    await pendingAfterOutage(harness);
    const start = harness.lab.now.getTime();

    // Antes da hora marcada, nada é feito.
    advance(harness, HOUR - 1000);
    expect(await harness.client.retryPendingRevocations()).toEqual([]);
    expect(deletes(harness)).toHaveLength(3);

    const hourly: number[] = [];
    while (harness.lab.now.getTime() - start < 24 * HOUR - HOUR) {
      const [pending] = await harness.client.pendingRevocations();
      harness.lab.now = new Date(pending!.nextAttemptAt);
      const before = deletes(harness).length;
      const [result] = await harness.client.retryPendingRevocations();
      expect(result!.outcome).toBe('pending');
      expect(deletes(harness).length - before).toBe(1);
      hourly.push(Date.parse(result!.pending!.nextAttemptAt) - harness.lab.now.getTime());
    }
    expect(new Set(hourly)).toEqual(new Set([HOUR]));

    // Passadas 24 horas desde o pedido, o intervalo é diário.
    harness.lab.now = new Date(start + 25 * HOUR);
    const [daily] = await harness.client.retryPendingRevocations();
    expect(Date.parse(daily!.pending!.nextAttemptAt) - harness.lab.now.getTime()).toBe(24 * HOUR);
  });

  it('RCP-028: não apaga a pendência por desistência nem por limite de tentativas', async () => {
    const harness = await createHarness();
    await pendingAfterOutage(harness);
    for (let day = 0; day < 25; day += 1) {
      advance(harness, 24 * HOUR);
      await harness.client.retryPendingRevocations();
    }
    expect((await harness.client.pendingRevocations())[0]!.attempts).toBe(28);

    // Passada a janela do registro expirado (7 dias depois de 2026-12-16), não
    // há chamada, mas a pendência fica.
    harness.lab.now = new Date('2026-12-23T12:00:01Z');
    await harness.client.retryPendingRevocations();
    const before = harness.lab.calls.length;
    const attempts = (await harness.client.pendingRevocations())[0]!.attempts;
    for (let day = 0; day < 20; day += 1) {
      advance(harness, 24 * HOUR);
      await harness.client.retryPendingRevocations();
    }
    expect(harness.lab.calls).toHaveLength(before);
    expect(await harness.client.pendingRevocations()).toMatchObject([{ attempts }]);
  });

  it('RCP-028: falha que não admite repetição vai direto para a pendência, sem novas tentativas', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    harness.lab.failNext(
      isDelete,
      jsonResponse(403, operationOutcome('RECEIVER_NOT_ALLOWED', 'forbidden')),
    );
    const error = await access.revoke().catch((err: unknown) => err);
    expect(error).toBeInstanceOf(RevocationPendingError);
    expect(deletes(harness)).toHaveLength(1);
    expect(harness.sleeps).toEqual([]);
    expect(await harness.client.pendingRevocations()).toHaveLength(1);
  });

  it('RCP-028: a pendência termina quando passa a expiração do consentimento', async () => {
    const harness = await createHarness();
    const { error } = await pendingAfterOutage(harness);
    expect(error.pending.consentExpiresAt).toBe('2027-05-15T03:00:00Z');

    harness.lab.now = new Date('2027-05-15T03:00:01Z');
    const before = harness.lab.calls.length;
    expect(await harness.client.retryPendingRevocations()).toMatchObject([{ outcome: 'expired' }]);
    expect(harness.lab.calls).toHaveLength(before);
    expect(await harness.client.pendingRevocations()).toEqual([]);
  });

  it('RCP-028: token de provedor recusado com 401 é trocado na tentativa seguinte', async () => {
    const harness = await createHarness();
    const { access, consent } = await connect(harness);
    harness.lab.failNext(isDelete, jsonResponse(401, operationOutcome('TOKEN_INVALID', 'login')));
    await expect(access.revoke()).resolves.toBeUndefined();
    const [first, second] = deletes(harness);
    expect(first!.headers.Authorization).not.toBe(second!.headers.Authorization);
    expect(harness.lab.consents.get(consent.consentId)!.body.status).toBe('REVOKED');
  });

  it('RCP-028: Retry-After acima da espera máxima encerra as tentativas e grava a pendência', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    harness.lab.failNext(
      isDelete,
      jsonResponse(503, operationOutcome('PROVIDER_UNAVAILABLE', 'transient'), {
        'Retry-After': '3600',
      }),
    );
    await expect(access.revoke()).rejects.toBeInstanceOf(RevocationPendingError);
    expect(deletes(harness)).toHaveLength(1);
    expect(harness.sleeps).toEqual([]);
  });

  it('se o armazenamento falha, a pendência vem no erro para o aplicativo gravar de outro jeito', async () => {
    const failure = new Error('banco fora do ar');
    class FailingStore extends InMemoryRevocationStore {
      override save(): void {
        throw failure;
      }
    }
    const harness = await createHarness({ config: { revocationStore: new FailingStore() } });
    const { access, consent } = await connect(harness);
    harness.lab.failAll(isDelete, 'network');
    const error = (await access.revoke().catch((err: unknown) => err)) as RevocationPendingError;
    expect(error).toBeInstanceOf(RevocationPendingError);
    expect(error.cause).toBe(failure);
    expect(error.pending).toMatchObject({ consentId: consent.consentId, attempts: 3 });
  });

  it('RCP-038: grava a revogação antes da primeira tentativa, e um reinício no meio não a perde', async () => {
    const store = new InMemoryRevocationStore();
    const harness = await createHarness({ config: { revocationStore: store } });
    const { access, consent } = await connect(harness);
    const signal: { reached?: () => void } = {};
    const deleteReached = new Promise<void>((resolve) => (signal.reached = resolve));
    const original = harness.lab.transport.request.bind(harness.lab.transport);
    harness.lab.transport.request = (request) => {
      if (request.method !== 'DELETE') return original(request);
      signal.reached!();
      // O provedor segura a resposta: o processo "cai" antes de ela chegar.
      return new Promise(() => {});
    };

    void access.revoke();
    await deleteReached;
    expect(store.list()).toMatchObject([
      { attempts: 0, consentId: consent.consentId, reason: 'PATIENT_REQUEST' },
    ]);
    // Enquanto este processo tenta, a revogação ainda não é pendente para ele,
    // e a repetição do calendário não faz uma segunda chamada em paralelo.
    expect(await harness.client.pendingRevocations()).toEqual([]);
    expect(await harness.client.retryPendingRevocations()).toEqual([]);

    // Reinício: outro cliente, o mesmo armazenamento.
    const restarted = await createHarness({ config: { revocationStore: store } });
    restarted.lab.consents.set(consent.consentId, harness.lab.consents.get(consent.consentId)!);
    expect(await restarted.client.pendingRevocations()).toMatchObject([
      { consentId: consent.consentId },
    ]);
    expect(await restarted.client.retryPendingRevocations()).toMatchObject([
      { consentId: consent.consentId, outcome: 'confirmed' },
    ]);
    expect(store.list()).toEqual([]);
  });

  it('RCP-040: invalid_client no endpoint de token encerra as tentativas na hora, com a revogação pendente', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    advance(harness, 11 * 60 * 1000);
    harness.lab.failNext(isClientCredentials, jsonResponse(401, { error: 'invalid_client' }));
    const before = harness.lab.calls.length;

    await expect(access.revoke()).rejects.toBeInstanceOf(RevocationPendingError);
    const after = harness.lab.calls.slice(before);
    expect(after.filter(isClientCredentials)).toHaveLength(1);
    expect(after.filter(isDelete)).toHaveLength(0);
    expect(harness.sleeps).toEqual([]);
    expect(await harness.client.pendingRevocations()).toMatchObject([{ attempts: 1 }]);
  });

  it('RCP-041: nenhuma tentativa, automática ou do calendário, antes do instante de Retry-After', async () => {
    const harness = await createHarness();
    const { access, consent, provider } = await connect(harness);
    const unavailable = () =>
      jsonResponse(503, operationOutcome('PROVIDER_UNAVAILABLE', 'transient'), {
        'Retry-After': '7200',
      });
    harness.lab.failNext(isDelete, unavailable());
    const start = harness.lab.now.getTime();

    await expect(access.revoke()).rejects.toBeInstanceOf(RevocationPendingError);
    // A espera passa do teto do cliente: sem tentativa automática nova.
    expect(deletes(harness)).toHaveLength(1);
    expect(harness.sleeps).toEqual([]);
    const [pending] = await harness.client.pendingRevocations();
    expect(Date.parse(pending!.nextAttemptAt)).toBe(start + 2 * HOUR);

    // Nem o calendário de hora em hora nem um novo pedido passam por cima do Retry-After.
    advance(harness, HOUR);
    expect(await harness.client.retryPendingRevocations()).toEqual([]);
    await expect(provider.revokeConsent(consent.consentId)).rejects.toBeInstanceOf(
      RevocationPendingError,
    );
    expect(deletes(harness)).toHaveLength(1);

    // Um Retry-After recebido numa repetição do calendário também adia a seguinte.
    advance(harness, HOUR);
    harness.lab.failNext(isDelete, unavailable());
    const [retried] = await harness.client.retryPendingRevocations();
    expect(deletes(harness)).toHaveLength(2);
    expect(Date.parse(retried!.pending!.nextAttemptAt)).toBe(harness.lab.now.getTime() + 2 * HOUR);
  });

  it('RCP-028: 429 sem código do protocolo, no DELETE e no token de consent.manage, admite repetição', async () => {
    const harness = await createHarness();
    const { access, consent } = await connect(harness);
    advance(harness, 11 * 60 * 1000);
    harness.lab.failNext(isClientCredentials, {
      body: '',
      headers: { 'Retry-After': '2' },
      status: 429,
    });
    harness.lab.failNext(isDelete, { body: '', headers: {}, status: 429 });

    await expect(access.revoke()).resolves.toBeUndefined();
    expect(harness.sleeps).toEqual([2000, 2000]);
    expect(deletes(harness)).toHaveLength(2);
    expect(harness.lab.consents.get(consent.consentId)!.body.status).toBe('REVOKED');
  });

  it('RCP-050: Retry-After acima de 24 horas vale por 24 horas, e depois o calendário volta', async () => {
    const harness = await createHarness();
    const { access, consent } = await connect(harness);
    harness.lab.failNext(
      isDelete,
      jsonResponse(503, operationOutcome('PROVIDER_UNAVAILABLE', 'transient'), {
        'Retry-After': '172800',
      }),
    );
    const start = harness.lab.now.getTime();

    await expect(access.revoke()).rejects.toBeInstanceOf(RevocationPendingError);
    const [pending] = await harness.client.pendingRevocations();
    expect(Date.parse(pending!.notBefore!)).toBe(start + 24 * HOUR);
    expect(Date.parse(pending!.nextAttemptAt)).toBe(start + 24 * HOUR);

    advance(harness, 24 * HOUR - 1000);
    expect(await harness.client.retryPendingRevocations()).toEqual([]);
    advance(harness, 1000);
    expect(await harness.client.retryPendingRevocations()).toMatchObject([
      { outcome: 'confirmed' },
    ]);
    expect(deletes(harness)).toHaveLength(2);
    expect(harness.lab.consents.get(consent.consentId)!.body.status).toBe('REVOKED');
  });

  it('RCP-048: provedor suspenso não é chamado nem para revogar, e o calendário volta quando ele é reativado', async () => {
    const harness = await createHarness();
    const { access, consent } = await connect(harness);
    const withProvider = async (sequence: number, status: 'active' | 'suspended') =>
      (
        await createHarness({
          registry: (doc) => {
            doc.sequence = sequence;
            doc.participants[0]!.status = status;
          },
        })
      ).client.registry;

    harness.client.updateRegistry(await withProvider(8, 'suspended'));
    const before = harness.lab.calls.length;
    await expect(access.revoke()).rejects.toBeInstanceOf(RevocationPendingError);
    advance(harness, HOUR);
    const [blocked] = await harness.client.retryPendingRevocations();
    expect(blocked).toMatchObject({ outcome: 'pending' });
    expect(harness.lab.calls).toHaveLength(before);
    expect(await harness.client.pendingRevocations()).toMatchObject([
      { attempts: 0, consentId: consent.consentId, consentManagementUri: CONSENT_PAGE },
    ]);

    // Reativado, a repetição seguinte já chama, sem esperar o próximo vencimento.
    harness.client.updateRegistry(await withProvider(9, 'active'));
    expect(await harness.client.retryPendingRevocations()).toMatchObject([
      { outcome: 'confirmed' },
    ]);
    expect(deletes(harness)).toHaveLength(1);
    expect(harness.lab.consents.get(consent.consentId)!.body.status).toBe('REVOKED');
  });

  it('RCP-048: com o próprio receptor fora de active, nenhuma chamada, e a pendência fica', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    const suspended = await createHarness({
      registry: (doc) => {
        doc.sequence = 8;
        doc.participants[1]!.status = 'suspended';
      },
    });
    harness.client.updateRegistry(suspended.client.registry);
    const before = harness.lab.calls.length;
    const error = (await access.revoke().catch((err: unknown) => err)) as RevocationPendingError;
    expect(error).toBeInstanceOf(RevocationPendingError);
    expect(error.cause).toMatchObject({ name: 'ReceiverStatusError' });
    expect(harness.lab.calls).toHaveLength(before);
    expect(await harness.client.pendingRevocations()).toHaveLength(1);
  });

  it('o armazenamento em memória guarda uma pendência por consentimento e provedor', async () => {
    const store = new InMemoryRevocationStore();
    const pending: PendingRevocation = {
      attempts: 3,
      consentId: 'c-1',
      lastAttemptAt: '2026-11-16T12:00:00.000Z',
      nextAttemptAt: '2026-11-16T13:00:00.000Z',
      providerId: PROVIDER_ID,
      reason: 'PATIENT_REQUEST',
      requestedAt: '2026-11-16T12:00:00.000Z',
    };
    store.save(pending);
    store.save({ ...pending, attempts: 4 });
    expect(store.list()).toEqual([{ ...pending, attempts: 4 }]);
    store.remove(PROVIDER_ID, 'c-1');
    expect(store.list()).toEqual([]);
  });
});

describe('fim da pendência pela resposta do provedor', () => {
  it('RCP-029: 404 CONSENT_NOT_FOUND na revogação conta como concluída', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    harness.lab.failNext(
      isDelete,
      jsonResponse(404, operationOutcome('CONSENT_NOT_FOUND', 'not-found')),
    );
    await expect(access.revoke()).resolves.toBeUndefined();
    expect(await harness.client.pendingRevocations()).toEqual([]);
  });

  it('RCP-029: 422 CONSENT_INVALID_STATE na revogação conta como concluída', async () => {
    const harness = await createHarness();
    const { access } = await connect(harness);
    harness.lab.failNext(
      isDelete,
      jsonResponse(422, operationOutcome('CONSENT_INVALID_STATE', 'business-rule')),
    );
    await expect(access.revoke()).resolves.toBeUndefined();
    expect(await harness.client.pendingRevocations()).toEqual([]);
  });

  it('RCP-029: na repetição do calendário, 404 e 422 encerram a pendência', async () => {
    for (const [status, code, issue] of [
      [404, 'CONSENT_NOT_FOUND', 'not-found'],
      [422, 'CONSENT_INVALID_STATE', 'business-rule'],
    ] as const) {
      const harness = await createHarness();
      const { restore } = await pendingAfterOutage(harness);
      restore();
      harness.lab.failNext(isDelete, jsonResponse(status, operationOutcome(code, issue)));
      advance(harness, HOUR);
      expect(await harness.client.retryPendingRevocations()).toMatchObject([
        { outcome: 'confirmed' },
      ]);
      expect(await harness.client.pendingRevocations()).toEqual([]);
    }
  });

  it('RCP-039: 404 sem corpo, ou com outro código, não encerra a revogação', async () => {
    for (const response of [
      { body: '', headers: {}, status: 404 },
      jsonResponse(404, operationOutcome('RESOURCE_NOT_FOUND', 'not-found')),
    ]) {
      const harness = await createHarness();
      const { access } = await connect(harness);
      harness.lab.failNext(isDelete, response);
      await expect(access.revoke()).rejects.toBeInstanceOf(RevocationPendingError);
      // Não admite repetição automática: uma chamada só, e a pendência segue.
      expect(deletes(harness)).toHaveLength(1);
      expect(await harness.client.pendingRevocations()).toHaveLength(1);
    }
  });
});
