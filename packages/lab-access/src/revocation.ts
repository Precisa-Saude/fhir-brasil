/**
 * Revogação de consentimento pelo receptor e revogação pendente (seção 4.4,
 * "Revogação pendente", e fluxo 2.6).
 *
 * O pacote é uma biblioteca e não roda temporizador. Ele grava a revogação
 * num `RevocationStore` assim que ela é decidida, faz as tentativas
 * automáticas e oferece `retryPendingRevocations`, que o aplicativo chama do
 * próprio agendador. O calendário fica em `nextAttemptAt` de cada pendência.
 */

import { REVOCATION_REASONS, type RevocationReason } from './consent-types';
import { consentUrl } from './consents';
import {
  PENDING_REVOCATION_DAILY_INTERVAL_MS,
  PENDING_REVOCATION_HOURLY_INTERVAL_MS,
  PENDING_REVOCATION_HOURLY_PERIOD_MS,
  REVOCATION_RETRY_AFTER_MAX_MS,
} from './constants';
import type { ClientContext } from './context';
import {
  LabAccessApiError,
  LabAccessConfigError,
  LabAccessError,
  OAuthError,
  ReceiverStatusError,
} from './errors';
import { apiRequest, retryDelay } from './http';
import {
  assertScopeUsable,
  effectiveProtocolVersion,
  resolveProvider,
  shouldRenewToken,
} from './resolve';
import { assertRegistryAllowsProviderToken } from './tokens';
import { assertConsentId } from './validation';

/**
 * Uma revogação gravada e ainda não confirmada pelo provedor. Do ponto de
 * vista do receptor o acesso já acabou: os tokens foram descartados quando a
 * revogação foi decidida, e ela foi gravada no mesmo momento, antes da
 * primeira chamada.
 */
export interface PendingRevocation {
  /** Tentativas feitas até agora, contando as automáticas do pedido. */
  attempts: number;
  /** `expiration_date_time` do consentimento, quando conhecido. Passado esse instante, a pendência termina. */
  consentExpiresAt?: string;
  consentId: string;
  /**
   * Página de consentimentos do provedor (`consent_management_uri` do
   * registro), onde o paciente pode revogar direto. O aplicativo mostra esse
   * endereço enquanto a pendência existir.
   */
  consentManagementUri?: string;
  /** Instante da última chamada ao provedor. Ausente enquanto nenhuma foi feita. */
  lastAttemptAt?: string;
  /**
   * Quando a próxima tentativa vence: de hora em hora no primeiro dia, uma vez
   * por dia depois, e nunca antes de `notBefore`.
   */
  nextAttemptAt: string;
  /**
   * Instante indicado pelo último `Retry-After`, limitado a 24 horas depois da
   * tentativa. Nenhuma tentativa acontece antes dele.
   */
  notBefore?: string;
  providerId: string;
  reason: RevocationReason;
  /** Instante em que a revogação foi decidida. */
  requestedAt: string;
}

/**
 * Onde as pendências ficam. A especificação exige armazenamento durável, que
 * sobreviva a reinício do backend: isso é do aplicativo, que implementa esta
 * interface sobre o próprio banco. Uma pendência por provedor e consentimento.
 */
export interface RevocationStore {
  list(): Promise<readonly PendingRevocation[]> | readonly PendingRevocation[];
  remove(providerId: string, consentId: string): Promise<void> | void;
  /** Cria ou substitui a pendência do mesmo provedor e consentimento. */
  save(revocation: PendingRevocation): Promise<void> | void;
}

/**
 * Armazenamento em memória, o padrão do cliente. Não é durável: perde as
 * pendências quando o processo termina. Serve para testes e para começar.
 */
export class InMemoryRevocationStore implements RevocationStore {
  readonly #items = new Map<string, PendingRevocation>();

  list(): PendingRevocation[] {
    return [...this.#items.values()].map((item) => ({ ...item }));
  }

  remove(providerId: string, consentId: string): void {
    this.#items.delete(`${providerId} ${consentId}`);
  }

  save(revocation: PendingRevocation): void {
    this.#items.set(`${revocation.providerId} ${revocation.consentId}`, { ...revocation });
  }
}

export interface RevocationRetryResult {
  consentId: string;
  /** Falha da tentativa, quando a pendência continua. */
  error?: unknown;
  /**
   * `confirmed`: o provedor respondeu 204, 404 `CONSENT_NOT_FOUND` ou 422
   * `CONSENT_INVALID_STATE`. `expired`: o consentimento passou da expiração.
   * Nos dois casos a pendência foi apagada. `pending`: a tentativa falhou e a
   * pendência foi reagendada.
   */
  outcome: 'confirmed' | 'expired' | 'pending';
  /** A pendência atualizada, quando `outcome` é `pending`. */
  pending?: PendingRevocation;
  providerId: string;
}

/** Próximo vencimento: de hora em hora nas primeiras 24 horas desde o pedido, diário depois. */
export function nextRevocationAttemptAt(requestedAt: string, attemptAt: Date): string {
  const elapsed = attemptAt.getTime() - Date.parse(requestedAt);
  const interval =
    elapsed < PENDING_REVOCATION_HOURLY_PERIOD_MS
      ? PENDING_REVOCATION_HOURLY_INTERVAL_MS
      : PENDING_REVOCATION_DAILY_INTERVAL_MS;
  return new Date(attemptAt.getTime() + interval).toISOString();
}

/** 404 `CONSENT_NOT_FOUND` e 422 `CONSENT_INVALID_STATE`: o consentimento já não vale no provedor. */
function concluded(error: unknown): boolean {
  return (
    error instanceof LabAccessApiError &&
    ((error.status === 404 && error.code === 'CONSENT_NOT_FOUND') ||
      (error.status === 422 && error.code === 'CONSENT_INVALID_STATE'))
  );
}

function repeatable(error: unknown): error is LabAccessError {
  return (
    error instanceof LabAccessError &&
    (error.retry === 'backoff' ||
      error.retry === 'after-retry-after' ||
      error.retry === 'after-token-refresh')
  );
}

function pendingKey(providerId: string, consentId: string): string {
  return `${providerId} ${consentId}`;
}

/**
 * Instante indicado por `Retry-After` na falha, se houver. Na revogação ele
 * vale por no máximo 24 horas: um valor maior conta como 24 horas, e depois
 * disso o calendário volta (seção 4.4, item 5).
 */
function retryAfterInstant(error: unknown, now: Date): number | undefined {
  const seconds =
    error instanceof LabAccessApiError || error instanceof OAuthError
      ? error.retryAfterSeconds
      : undefined;
  if (seconds === undefined) return undefined;
  return now.getTime() + Math.min(seconds * 1000, REVOCATION_RETRY_AFTER_MAX_MS);
}

/**
 * Condições locais que impedem a chamada (seção 4.4, item 4): registro
 * expirado há mais de 7 dias, receptor ou provedor fora de `active` no
 * registro aceito, ou sem versão efetiva entre os dois. Nenhuma delas faz
 * chamada de rede, e com qualquer uma o provedor não é chamado, nem para
 * revogar.
 */
function localBlocker(ctx: ClientContext, providerId: string): unknown {
  try {
    assertRegistryAllowsProviderToken(ctx, 'consent.manage');
    const registry = ctx.registry();
    const receiver = registry.getReceiver(ctx.clientId);
    if (receiver.status !== 'active') throw new ReceiverStatusError(receiver.status);
    effectiveProtocolVersion(receiver, registry.getProvider(providerId));
    return undefined;
  } catch (error) {
    return error;
  }
}

/**
 * Uma tentativa: um pedido de token de provedor, se o que está em cache não
 * serve, e um `DELETE`, sem repetição dentro dela. Termina sem erro quando a
 * revogação está concluída.
 */
async function attemptRevocation(
  ctx: ClientContext,
  providerId: string,
  consentId: string,
  reason: RevocationReason,
): Promise<void> {
  const resolved = await resolveProvider(ctx, providerId);
  assertScopeUsable(resolved, 'consent.manage');
  const token = await ctx.providerToken(resolved, 'consent.manage', false);
  try {
    await apiRequest(ctx, {
      accept: 'json',
      consentId,
      method: 'DELETE',
      okStatuses: [204],
      providerId,
      token,
      url: `${consentUrl(resolved, consentId)}?reason=${reason}`,
    });
  } catch (error) {
    if (concluded(error)) return;
    if (shouldRenewToken(error)) ctx.invalidateProviderToken(resolved, 'consent.manage', token);
    throw error;
  }
}

/** Reagenda depois de uma chamada que falhou, respeitando `Retry-After`. */
function afterFailure(record: PendingRevocation, error: unknown, attemptAt: Date): void {
  record.lastAttemptAt = attemptAt.toISOString();
  const scheduled = Date.parse(nextRevocationAttemptAt(record.requestedAt, attemptAt));
  const notBefore = retryAfterInstant(error, attemptAt);
  if (notBefore === undefined) delete record.notBefore;
  else record.notBefore = new Date(notBefore).toISOString();
  record.nextAttemptAt = new Date(Math.max(scheduled, notBefore ?? 0)).toISOString();
}

async function quietly(action: () => Promise<void> | void): Promise<unknown> {
  try {
    await action();
    return undefined;
  } catch (error) {
    return error;
  }
}

export interface RevocationRequest {
  consentExpiresAt?: string;
  consentId: string;
  providerId: string;
  reason: RevocationReason;
}

export type RevocationResult =
  | { outcome: 'confirmed' }
  | { error: unknown; outcome: 'pending'; pending: PendingRevocation };

/**
 * Revoga um consentimento (seção 4.4, "Revogação pendente").
 *
 * 1. Grava a revogação no `RevocationStore` antes de qualquer chamada. Se já
 *    havia uma gravada para o mesmo consentimento, segue com ela.
 * 2. Com uma condição local que impede a chamada, ou antes do instante de um
 *    `Retry-After` recebido, não chama o provedor.
 * 3. Senão, faz no máximo `retry.maxAttempts` (3) tentativas ao todo, com
 *    recuo e `Retry-After`. Falha que não admite repetição, ou espera acima de
 *    `retry.maxDelayMs`, encerra as tentativas na hora.
 * 4. Confirmada, apaga o registro. Sem confirmação, deixa-o pendente, com o
 *    próximo vencimento.
 *
 * Quem chama já descartou os tokens do paciente antes de chamar.
 */
export async function revokeConsent(
  ctx: ClientContext,
  request: RevocationRequest,
): Promise<RevocationResult> {
  const { consentId, providerId, reason } = request;
  assertConsentId(consentId);
  if (!REVOCATION_REASONS.includes(reason)) {
    throw new LabAccessConfigError('Motivo de revogação desconhecido.');
  }
  const key = pendingKey(providerId, consentId);
  const decidedAt = ctx.now();
  const existing = (await ctx.revocations.list()).find(
    (item) => item.providerId === providerId && item.consentId === consentId,
  );
  const record: PendingRevocation = existing
    ? { ...existing }
    : {
        attempts: 0,
        consentId,
        nextAttemptAt: decidedAt.toISOString(),
        providerId,
        reason,
        requestedAt: decidedAt.toISOString(),
      };
  const provider = ctx.registry().findParticipant(providerId)?.provider;
  if (record.consentManagementUri === undefined && provider !== undefined) {
    record.consentManagementUri = provider.consent_management_uri;
  }
  if (record.consentExpiresAt === undefined && request.consentExpiresAt !== undefined) {
    record.consentExpiresAt = request.consentExpiresAt;
  }

  // Gravada antes da primeira chamada: um reinício no meio não a perde.
  let storeError = existing ? undefined : await quietly(() => ctx.revocations.save({ ...record }));

  let error: unknown;
  const waiting =
    ctx.revocationsInFlight.has(key) ||
    (record.notBefore !== undefined && decidedAt.getTime() < Date.parse(record.notBefore));
  const blocker = waiting ? undefined : localBlocker(ctx, providerId);
  if (blocker !== undefined) {
    // Sem chamada. A pendência fica vencida, para ser tentada assim que a
    // condição acabar.
    error = blocker;
    record.nextAttemptAt = decidedAt.toISOString();
  } else if (!waiting) {
    ctx.revocationsInFlight.add(key);
    try {
      for (let tries = 1; tries <= ctx.retry.maxAttempts; tries += 1) {
        record.attempts += 1;
        try {
          await attemptRevocation(ctx, providerId, consentId, reason);
          await quietly(() => ctx.revocations.remove(providerId, consentId));
          return { outcome: 'confirmed' };
        } catch (failure) {
          error = failure;
          afterFailure(record, failure, ctx.now());
          if (!repeatable(failure) || tries >= ctx.retry.maxAttempts) break;
          const delay = retryDelay(ctx, failure, tries);
          if (delay > ctx.retry.maxDelayMs) break;
          await ctx.sleep(delay);
        }
      }
    } finally {
      ctx.revocationsInFlight.delete(key);
    }
  }

  storeError ??= await quietly(() => ctx.revocations.save({ ...record }));
  // A pendência segue no erro, para o aplicativo gravá-la de outro jeito se o
  // armazenamento falhou.
  return { error: storeError ?? error, outcome: 'pending', pending: record };
}

/**
 * Repete as revogações pendentes que venceram: uma única chamada por
 * pendência, sem nova sequência de três, e nunca antes do instante de um
 * `Retry-After` recebido. Pendência de provedor que não pode ser chamado
 * (condição local) fica como está e é tentada assim que a condição acaba.
 * Pendência confirmada ou de consentimento já expirado é apagada. As demais
 * são reagendadas e nunca apagadas por desistência.
 *
 * Inclui as revogações gravadas e nunca confirmadas que o aplicativo
 * encontra ao reiniciar.
 */
export async function retryPendingRevocations(
  ctx: ClientContext,
): Promise<RevocationRetryResult[]> {
  const results: RevocationRetryResult[] = [];
  for (const pending of await ctx.revocations.list()) {
    const now = ctx.now();
    const { consentId, providerId } = pending;
    const key = pendingKey(providerId, consentId);
    if (ctx.revocationsInFlight.has(key)) continue;
    if (
      pending.consentExpiresAt !== undefined &&
      now.getTime() > Date.parse(pending.consentExpiresAt)
    ) {
      await ctx.revocations.remove(providerId, consentId);
      results.push({ consentId, outcome: 'expired', providerId });
      continue;
    }
    // `nextAttemptAt` nunca fica antes de `notBefore`: o Retry-After já entrou nele.
    if (now.getTime() < Date.parse(pending.nextAttemptAt)) continue;

    const blocker = localBlocker(ctx, providerId);
    if (blocker !== undefined) {
      results.push({ consentId, error: blocker, outcome: 'pending', pending, providerId });
      continue;
    }

    const record: PendingRevocation = { ...pending, attempts: pending.attempts + 1 };
    ctx.revocationsInFlight.add(key);
    try {
      await attemptRevocation(ctx, providerId, consentId, pending.reason);
      await ctx.revocations.remove(providerId, consentId);
      results.push({ consentId, outcome: 'confirmed', providerId });
    } catch (error) {
      afterFailure(record, error, ctx.now());
      await ctx.revocations.save(record);
      results.push({ consentId, error, outcome: 'pending', pending: record, providerId });
    } finally {
      ctx.revocationsInFlight.delete(key);
    }
  }
  return results;
}

/** Pendências gravadas, menos as que este processo está tentando agora. */
export async function listPendingRevocations(ctx: ClientContext): Promise<PendingRevocation[]> {
  return (await ctx.revocations.list())
    .filter((item) => !ctx.revocationsInFlight.has(pendingKey(item.providerId, item.consentId)))
    .map((item) => ({ ...item }));
}
