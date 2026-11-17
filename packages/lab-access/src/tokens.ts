/**
 * Endpoint de token (seção 5.3.4) e cache dos tokens de provedor.
 */

import {
  ACCESS_TOKEN_EXPIRY_MARGIN_MS,
  MAX_ACCESS_TOKEN_LIFETIME_SECONDS,
  REGISTRY_EXPIRED_GRACE_MS,
} from './constants';
import type { ClientContext, ResolvedProvider } from './context';
import { LabAccessProtocolError, RegistryExpiredError } from './errors';
import { oauthPost, withRetry } from './http';

export interface IssuedToken {
  accessToken: string;
  /** Instante, em milissegundos, a partir do qual o token não é mais usado. */
  expiresAt: number;
  refreshToken?: string;
  scope?: string;
}

function graceEnd(ctx: ClientContext): number {
  return ctx.registry().expiresAt.getTime() + REGISTRY_EXPIRED_GRACE_MS;
}

/**
 * Com o registro expirado, o receptor não abre autorizações nem cria
 * consentimentos (seção 8.3).
 */
export function assertRegistryAllowsNewGrants(ctx: ClientContext): void {
  if (ctx.registry().isExpired(ctx.now())) {
    throw new RegistryExpiredError(
      'O registro de participantes expirou: novas autorizações e novos consentimentos estão suspensos até um documento novo ser aceito.',
    );
  }
}

/**
 * Concessão `client_credentials` com o registro expirado (seção 8.3): nos 7
 * dias seguintes a `expires_at`, só `consent.manage` sozinho, para consultar e
 * revogar consentimentos. Depois disso, nenhuma.
 */
export function assertRegistryAllowsProviderToken(ctx: ClientContext, scope: string): void {
  const now = ctx.now();
  if (!ctx.registry().isExpired(now)) return;
  if (scope === 'consent.manage' && now.getTime() <= graceEnd(ctx)) return;
  throw new RegistryExpiredError(
    scope === 'consent.manage'
      ? 'O registro de participantes expirou há mais de 7 dias: nem o token de consent.manage pode ser pedido.'
      : `O registro de participantes expirou: o token de ${scope} está suspenso até um documento novo ser aceito.`,
  );
}

/** A renovação por refresh token pode seguir por até 7 dias depois de `expires_at`. */
export function assertRegistryAllowsRefresh(ctx: ClientContext): void {
  if (ctx.now().getTime() > graceEnd(ctx)) {
    throw new RegistryExpiredError(
      'O registro de participantes expirou há mais de 7 dias: a renovação de tokens está suspensa.',
    );
  }
}

/**
 * Pede um token. `repeatable` é `false` na troca do código de autorização,
 * que vale uma única vez.
 */
export async function requestToken(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  params: Record<string, string>,
  repeatable: boolean,
): Promise<IssuedToken> {
  const body = await withRetry(ctx, repeatable, () =>
    oauthPost(ctx, resolved, resolved.endpoints.tokenEndpoint, params, 200),
  );

  const { access_token: accessToken, expires_in: expiresIn, token_type: tokenType } = body;
  if (typeof accessToken !== 'string' || accessToken === '') {
    throw new LabAccessProtocolError('A resposta do token não traz access_token.');
  }
  if (typeof tokenType !== 'string' || tokenType.toLowerCase() !== 'bearer') {
    throw new LabAccessProtocolError('A resposta do token não traz token_type Bearer.');
  }
  if (typeof expiresIn !== 'number' || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new LabAccessProtocolError('A resposta do token não traz expires_in válido.');
  }

  // O protocolo limita o token a 900 segundos. Um valor maior não é seguido.
  const lifetime = Math.min(expiresIn, MAX_ACCESS_TOKEN_LIFETIME_SECONDS);
  return {
    accessToken,
    expiresAt: ctx.now().getTime() + lifetime * 1000,
    refreshToken:
      typeof body.refresh_token === 'string' && body.refresh_token !== ''
        ? body.refresh_token
        : undefined,
    scope: typeof body.scope === 'string' ? body.scope : undefined,
  };
}

/**
 * `true` enquanto o token ainda tem mais de 60 segundos de validade, contada
 * do recebimento da resposta pelo relógio do receptor. Um token nunca é usado
 * depois de `expires_in` (seção 5.3.4).
 */
export function isFresh(expiresAt: number, now: Date): boolean {
  return now.getTime() < expiresAt - ACCESS_TOKEN_EXPIRY_MARGIN_MS;
}

/**
 * Cache dos tokens de provedor, um por provedor e por escopo. Fica só em
 * memória: tokens de provedor não vão para armazenamento durável.
 *
 * Chamadas concorrentes que precisam do mesmo token compartilham um único
 * pedido ao endpoint de token.
 */
export class ProviderTokenCache {
  private readonly pending = new Map<string, Promise<string>>();
  private readonly tokens = new Map<string, IssuedToken>();

  constructor(private readonly ctx: ClientContext) {}

  /**
   * Token de provedor para um único escopo. `repeat` igual a `false` faz um só
   * pedido ao endpoint de token, para quem conta as tentativas por fora (a
   * revogação de consentimento).
   */
  async get(resolved: ResolvedProvider, scope: string, repeat = true): Promise<string> {
    const key = `${resolved.endpoints.issuer} ${scope}`;
    const cached = this.tokens.get(key);
    if (cached && isFresh(cached.expiresAt, this.ctx.now())) return cached.accessToken;

    let pending = this.pending.get(key);
    if (!pending) {
      pending = this.fetch(resolved, scope, key, repeat).finally(() => this.pending.delete(key));
      this.pending.set(key, pending);
    }
    return pending;
  }

  /** Esquece o token, se ainda for o que está em cache. */
  invalidate(resolved: ResolvedProvider, scope: string, token: string): void {
    const key = `${resolved.endpoints.issuer} ${scope}`;
    if (this.tokens.get(key)?.accessToken === token) this.tokens.delete(key);
  }

  private async fetch(
    resolved: ResolvedProvider,
    scope: string,
    key: string,
    repeat: boolean,
  ): Promise<string> {
    assertRegistryAllowsProviderToken(this.ctx, scope);
    // Um escopo por token: consent.manage vai sempre sozinho (seção 5.3.4).
    const issued = await requestToken(
      this.ctx,
      resolved,
      { grant_type: 'client_credentials', scope },
      repeat,
    );
    // Um refresh_token aqui seria indevido (RFC 6749, 4.4.3) e não é guardado.
    this.tokens.set(key, { accessToken: issued.accessToken, expiresAt: issued.expiresAt });
    return issued.accessToken;
  }
}
