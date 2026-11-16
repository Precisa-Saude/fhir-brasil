/**
 * Resolve o provedor a cada operação, a partir do registro em uso.
 *
 * Como a leitura é feita a cada chamada, uma mudança de situação passa a
 * valer assim que o aplicativo entrega ao cliente o documento novo.
 */

import { SUPPORTED_PROTOCOL_VERSIONS } from './constants';
import type { ClientContext, ResolvedProvider } from './context';
import { PROTOCOL_ERROR_CODES } from './error-codes';
import {
  LabAccessApiError,
  ProviderUnavailableError,
  ReceiverStatusError,
  ScopeError,
} from './errors';
import { negotiateProtocolVersion } from './registry';
import type { RegistryProvider, RegistryReceiver } from './registry-types';
import { baseUrl } from './validation';

/**
 * Confere se receptor e provedor se comunicam (seção 9.1) e devolve a versão
 * efetiva: ela precisa existir, ser uma versão que este pacote implementa, e o
 * `api_base_url` do provedor precisa terminar em `/v{MAJOR}` dela.
 */
export function effectiveProtocolVersion(
  receiver: RegistryReceiver,
  provider: RegistryProvider,
): string {
  const version = negotiateProtocolVersion(receiver.protocol_versions, provider.protocol_versions);
  if (!SUPPORTED_PROTOCOL_VERSIONS.includes(version)) {
    throw new ProviderUnavailableError(
      'unsupported-version',
      `A versão efetiva com o provedor é ${version}, que este pacote não implementa.`,
    );
  }
  const major = version.split('.')[0];
  if (!baseUrl(provider.provider.api_base_url).endsWith(`/v${major}`)) {
    throw new ProviderUnavailableError(
      'api-version-mismatch',
      `O api_base_url do provedor deveria terminar em /v${major}.`,
    );
  }
  return version;
}

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
  effectiveProtocolVersion(receiver, provider);
  const endpoints = await ctx.discover(
    provider.provider.issuer,
    provider.provider.scopes_supported,
  );
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
