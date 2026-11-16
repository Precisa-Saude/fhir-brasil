/**
 * Resolve o provedor a cada operação, a partir do registro em uso.
 *
 * Como a leitura é feita a cada chamada, uma mudança de situação passa a
 * valer assim que o aplicativo entrega ao cliente o documento novo.
 */

import type { ClientContext, ResolvedProvider } from './context';
import { PROTOCOL_ERROR_CODES } from './error-codes';
import { LabAccessApiError, ReceiverStatusError, ScopeError } from './errors';
import { negotiateProtocolVersion } from './registry';

export async function resolveProvider(
  ctx: ClientContext,
  providerId: string,
): Promise<ResolvedProvider> {
  const registry = ctx.registry();
  const receiver = registry.getReceiver(ctx.clientId);
  if (receiver.status !== 'active') {
    throw new ReceiverStatusError(receiver.status);
  }
  const provider = registry.getProvider(providerId);
  negotiateProtocolVersion(receiver.protocol_versions, provider.protocol_versions);
  const endpoints = await ctx.discover(provider.provider.issuer);
  return { endpoints, provider, receiver };
}

/** O escopo precisa estar permitido ao receptor e anunciado pelo provedor no registro. */
export function assertScopeUsable(resolved: ResolvedProvider, scope: string): void {
  if (!(resolved.receiver.receiver.scopes_allowed as string[]).includes(scope)) {
    throw new ScopeError(`O registro não permite o escopo ${scope} a este receptor.`);
  }
  if (!(resolved.provider.provider.scopes_supported as string[]).includes(scope)) {
    throw new ScopeError(`O provedor não anuncia o escopo ${scope} no registro.`);
  }
}

/**
 * Um 401 em recurso pede renovação do token, uma vez (seção 6.4, regra 3),
 * salvo quando o código diz que renovar não adianta.
 */
export function shouldRenewToken(error: unknown): boolean {
  if (!(error instanceof LabAccessApiError) || error.status !== 401) return false;
  if (error.retry === 'after-token-refresh') return true;
  return error.code === undefined || !(error.code in PROTOCOL_ERROR_CODES);
}

/** Executa a chamada com um token de provedor, renovando-o uma vez diante de 401. */
export async function withProviderToken<T>(
  ctx: ClientContext,
  resolved: ResolvedProvider,
  scope: string,
  call: (token: string) => Promise<T>,
): Promise<T> {
  assertScopeUsable(resolved, scope);
  const token = await ctx.providerToken(resolved, scope);
  try {
    return await call(token);
  } catch (error) {
    if (!shouldRenewToken(error)) throw error;
    ctx.invalidateProviderToken(resolved, scope, token);
    return call(await ctx.providerToken(resolved, scope));
  }
}
