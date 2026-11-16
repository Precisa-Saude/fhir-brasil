/**
 * Cliente do receptor para o protocolo Open Labs Brasil.
 */

import { assertCertificateRegistered, assertDistinctKeys } from './certificate';
import type { SigningKey } from './client-assertion';
import { METADATA_CACHE_MS } from './constants';
import type { ClientContext, InteractionEvent, RetryPolicy } from './context';
import { type AuthorizationServerEndpoints, discoverAuthorizationServer } from './discovery';
import { LabAccessConfigError } from './errors';
import { ProviderAccess } from './provider-access';
import { ParticipantRegistry } from './registry';
import type { RegistryProvider } from './registry-types';
import { effectiveProtocolVersion } from './resolve';
import {
  InMemoryRevocationStore,
  listPendingRevocations,
  type PendingRevocation,
  retryPendingRevocations,
  type RevocationRetryResult,
  type RevocationStore,
} from './revocation';
import { ProviderTokenCache } from './tokens';
import type { LabAccessTransport } from './transport';

export interface LabAccessClientConfig {
  /** `client_id` do receptor no registro. */
  clientId: string;
  /** Relógio. Padrão: o do sistema. */
  now?: () => Date;
  /** Registro verificado por `verifyRegistry`. */
  registry: ParticipantRegistry;
  retry?: Partial<RetryPolicy>;
  /**
   * Onde ficam as revogações pendentes. Padrão: `InMemoryRevocationStore`,
   * que não é durável. A especificação exige que a pendência sobreviva a
   * reinício do backend, então em produção o aplicativo passa uma
   * implementação sobre o próprio banco.
   */
  revocationStore?: RevocationStore;
  /** Chave privada de assinatura da asserção do cliente. */
  signingKey: SigningKey;
  /** Espera entre repetições. Padrão: `setTimeout`. */
  sleep?: (ms: number) => Promise<void>;
  /** Transporte com mTLS. Use `createMtlsTransport`. */
  transport: LabAccessTransport;
  /** Recebe um evento por chamada, para o registro de auditoria. Sem token e sem CPF. */
  onInteraction?: (event: InteractionEvent) => void;
}

const DEFAULT_RETRY: RetryPolicy = { baseDelayMs: 1000, maxAttempts: 3, maxDelayMs: 60_000 };

function retryPolicy(overrides: Partial<RetryPolicy> = {}): RetryPolicy {
  const policy = { ...DEFAULT_RETRY, ...overrides };
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 3) {
    throw new LabAccessConfigError('retry.maxAttempts deveria ser de 1 a 3.');
  }
  if (!(policy.baseDelayMs >= 1000)) {
    throw new LabAccessConfigError('retry.baseDelayMs deveria ser de ao menos 1000 ms.');
  }
  if (!(policy.maxDelayMs >= policy.baseDelayMs)) {
    throw new LabAccessConfigError('retry.maxDelayMs não pode ser menor que retry.baseDelayMs.');
  }
  return policy;
}

/**
 * Ponto de entrada do pacote.
 *
 * Não há, aqui nem em nenhuma outra parte do pacote, parâmetro para senha do
 * laboratório ou para qualquer credencial do paciente: o paciente se autentica
 * só na página do provedor.
 */
export class LabAccessClient {
  readonly #ctx: ClientContext;
  readonly #discovered = new Map<
    string,
    { endpoints: Promise<AuthorizationServerEndpoints>; fetchedAt: number }
  >();
  #registry: ParticipantRegistry;

  constructor(config: LabAccessClientConfig) {
    if (!(config?.registry instanceof ParticipantRegistry)) {
      throw new LabAccessConfigError('registry deveria ser o resultado de verifyRegistry.');
    }
    if (
      typeof config.signingKey?.kid !== 'string' ||
      config.signingKey.kid === '' ||
      !config.signingKey.key
    ) {
      throw new LabAccessConfigError('signingKey deveria trazer kid e a chave privada.');
    }
    if (typeof config.transport?.request !== 'function') {
      throw new LabAccessConfigError('transport deveria implementar LabAccessTransport.');
    }
    const now = config.now ?? (() => new Date());
    const receiver = config.registry.getReceiver(config.clientId);
    const certificate = config.transport.clientCertificate;
    if (certificate) {
      assertCertificateRegistered(receiver, certificate, now());
      assertDistinctKeys(config.signingKey, certificate);
    }

    this.#registry = config.registry;
    const ctx: ClientContext = {
      clientId: config.clientId,
      discover: (issuer, scopes) => this.#discover(issuer, scopes),
      invalidateProviderToken: (resolved, scope, token) =>
        tokens.invalidate(resolved, scope, token),
      now,
      onInteraction: config.onInteraction,
      providerToken: (resolved, scope, repeat) => tokens.get(resolved, scope, repeat),
      registry: () => this.#registry,
      retry: retryPolicy(config.retry),
      revocations: config.revocationStore ?? new InMemoryRevocationStore(),
      revocationsInFlight: new Set(),
      signingKey: config.signingKey,
      sleep: config.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
      transport: config.transport,
    };
    const tokens = new ProviderTokenCache(ctx);
    this.#ctx = ctx;
  }

  /** O registro em uso. */
  get registry(): ParticipantRegistry {
    return this.#registry;
  }

  /**
   * Revogações que o provedor ainda não confirmou, inclusive as gravadas antes
   * de um reinício. As que este processo está tentando no momento ficam de
   * fora. O aplicativo mostra cada uma ao paciente, com
   * `consentManagementUri`, a página do provedor onde ele pode revogar direto,
   * também enquanto o provedor está suspenso e não é chamado.
   */
  async pendingRevocations(): Promise<PendingRevocation[]> {
    return listPendingRevocations(this.#ctx);
  }

  /**
   * Repete as revogações pendentes que venceram, uma chamada por pendência.
   * O pacote não agenda nada sozinho: o aplicativo chama este método do
   * próprio agendador, com a frequência que quiser, e o calendário de cada
   * pendência (de hora em hora no primeiro dia, diário depois) decide o que
   * vence.
   */
  retryPendingRevocations(): Promise<RevocationRetryResult[]> {
    return retryPendingRevocations(this.#ctx);
  }

  /** Acesso a um provedor do registro, pelo `participant_id`. */
  provider(participantId: string): ProviderAccess {
    return new ProviderAccess(this.#ctx, participantId);
  }

  /**
   * Provedores que o aplicativo pode oferecer ao paciente: ativos no registro
   * em uso e com versão de protocolo efetiva com este receptor, que o pacote
   * implementa (seção 9.1). Com o receptor fora de `active`, nenhum.
   */
  providers(): RegistryProvider[] {
    const receiver = this.#registry.getReceiver(this.#ctx.clientId);
    if (receiver.status !== 'active') return [];
    return this.#registry.providers().filter((provider) => {
      try {
        effectiveProtocolVersion(receiver, provider);
        return true;
      } catch {
        return false;
      }
    });
  }

  /**
   * Passa a usar um documento novo do registro, já verificado. Mudanças de
   * situação e de endereço valem a partir da próxima chamada.
   */
  updateRegistry(registry: ParticipantRegistry): void {
    if (!(registry instanceof ParticipantRegistry)) {
      throw new LabAccessConfigError('registry deveria ser o resultado de verifyRegistry.');
    }
    if (registry.sequence < this.#registry.sequence) {
      throw new LabAccessConfigError(
        'O registro novo tem sequence menor que a do registro em uso.',
      );
    }
    registry.getReceiver(this.#ctx.clientId);
    this.#registry = registry;
  }

  /**
   * Metadados do servidor de autorização, em cache por até 24 horas. A chave
   * do cache inclui os escopos do registro, que entram na conferência.
   */
  #discover(issuer: string, scopes: readonly string[]): Promise<AuthorizationServerEndpoints> {
    const now = this.#ctx.now().getTime();
    const key = `${issuer} ${[...scopes].sort().join(' ')}`;
    const cached = this.#discovered.get(key);
    if (cached && now - cached.fetchedAt <= METADATA_CACHE_MS) return cached.endpoints;

    const endpoints = discoverAuthorizationServer(this.#ctx.transport, issuer, scopes);
    this.#discovered.set(key, { endpoints, fetchedAt: now });
    endpoints.catch(() => {
      if (this.#discovered.get(key)?.endpoints === endpoints) this.#discovered.delete(key);
    });
    return endpoints;
  }
}
