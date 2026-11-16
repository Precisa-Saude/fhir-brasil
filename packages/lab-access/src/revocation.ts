/**
 * Revogação de consentimento pelo receptor e revogação pendente (seção 4.4,
 * "Revogação pendente", e fluxo 2.6).
 *
 * O pacote é uma biblioteca e não roda temporizador. Ele faz as tentativas
 * automáticas de cada revogação, grava a pendência num `RevocationStore` e
 * oferece `retryPendingRevocations`, que o aplicativo chama do próprio
 * agendador. O calendário fica em `nextAttemptAt` de cada pendência.
 */

import { REVOCATION_REASONS, type RevocationReason } from './consent-types';
import { consentUrl } from './consents';
import {
  PENDING_REVOCATION_DAILY_INTERVAL_MS,
  PENDING_REVOCATION_HOURLY_INTERVAL_MS,
  PENDING_REVOCATION_HOURLY_PERIOD_MS,
} from './constants';
import type { ClientContext } from './context';
import { LabAccessApiError, LabAccessConfigError, LabAccessError } from './errors';
import { apiRequest, retryDelay } from './http';
import { assertScopeUsable, resolveProvider, shouldRenewToken } from './resolve';
import { assertRegistryAllowsProviderToken } from './tokens';
import { assertConsentId } from './validation';

/**
 * Uma revogação que o provedor ainda não confirmou. Do ponto de vista do
 * receptor o acesso já acabou: os tokens foram descartados quando a revogação
 * foi decidida.
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
  lastAttemptAt: string;
  /** Quando a próxima tentativa vence: de hora em hora no primeiro dia, uma vez por dia depois. */
  nextAttemptAt: string;
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
  // Com o registro expirado, só consent.manage sozinho, e só por 7 dias.
  assertRegistryAllowsProviderToken(ctx, 'consent.manage');
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
 * Envia a revogação com no máximo `retry.maxAttempts` (3) tentativas
 * automáticas ao todo, com recuo e `Retry-After`. Falha que não admite
 * repetição encerra as tentativas. Sem confirmação, grava a pendência.
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
  const requestedAt = ctx.now().toISOString();

  let error: unknown;
  let attempts = 0;
  while (attempts < ctx.retry.maxAttempts) {
    attempts += 1;
    try {
      await attemptRevocation(ctx, providerId, consentId, reason);
      await ctx.revocations.remove(providerId, consentId);
      return { outcome: 'confirmed' };
    } catch (failure) {
      error = failure;
      if (!repeatable(failure) || attempts >= ctx.retry.maxAttempts) break;
      const delay = retryDelay(ctx, failure, attempts);
      if (delay > ctx.retry.maxDelayMs) break;
      await ctx.sleep(delay);
    }
  }

  const lastAttempt = ctx.now();
  const provider = ctx.registry().findParticipant(providerId)?.provider;
  const pending: PendingRevocation = {
    attempts,
    consentId,
    lastAttemptAt: lastAttempt.toISOString(),
    nextAttemptAt: nextRevocationAttemptAt(requestedAt, lastAttempt),
    providerId,
    reason,
    requestedAt,
  };
  if (provider?.consent_management_uri !== undefined) {
    pending.consentManagementUri = provider.consent_management_uri;
  }
  if (request.consentExpiresAt !== undefined) pending.consentExpiresAt = request.consentExpiresAt;

  try {
    await ctx.revocations.save(pending);
  } catch (storeError) {
    // A pendência segue no erro, para o aplicativo gravá-la de outro jeito.
    return { error: storeError, outcome: 'pending', pending };
  }
  return { error, outcome: 'pending', pending };
}

/**
 * Repete as revogações pendentes que venceram: uma única chamada por
 * pendência, sem nova sequência de três. Pendência confirmada ou de
 * consentimento já expirado é apagada. As demais são reagendadas e nunca
 * apagadas por desistência.
 */
export async function retryPendingRevocations(
  ctx: ClientContext,
): Promise<RevocationRetryResult[]> {
  const results: RevocationRetryResult[] = [];
  for (const pending of await ctx.revocations.list()) {
    const now = ctx.now();
    const { consentId, providerId } = pending;
    if (
      pending.consentExpiresAt !== undefined &&
      now.getTime() > Date.parse(pending.consentExpiresAt)
    ) {
      await ctx.revocations.remove(providerId, consentId);
      results.push({ consentId, outcome: 'expired', providerId });
      continue;
    }
    if (now.getTime() < Date.parse(pending.nextAttemptAt)) continue;

    try {
      await attemptRevocation(ctx, providerId, consentId, pending.reason);
      await ctx.revocations.remove(providerId, consentId);
      results.push({ consentId, outcome: 'confirmed', providerId });
    } catch (error) {
      const attemptAt = ctx.now();
      const updated: PendingRevocation = {
        ...pending,
        attempts: pending.attempts + 1,
        lastAttemptAt: attemptAt.toISOString(),
        nextAttemptAt: nextRevocationAttemptAt(pending.requestedAt, attemptAt),
      };
      await ctx.revocations.save(updated);
      results.push({ consentId, error, outcome: 'pending', pending: updated, providerId });
    }
  }
  return results;
}
