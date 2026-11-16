/**
 * Estado compartilhado pelas partes do cliente. Interno ao pacote.
 */

import type { SigningKey } from './client-assertion';
import type { AuthorizationServerEndpoints } from './discovery';
import type { ParticipantRegistry } from './registry';
import type { RegistryProvider, RegistryReceiver } from './registry-types';
import type { RevocationStore } from './revocation';
import type { LabAccessTransport } from './transport';

export interface RetryPolicy {
  /** Primeira espera do recuo exponencial. Mínimo do protocolo: 1 segundo. */
  baseDelayMs: number;
  /** Total de tentativas por chamada, contando a primeira. */
  maxAttempts: number;
  /** Espera máxima aceita. Acima disso o erro volta para quem chamou. */
  maxDelayMs: number;
}

/**
 * Uma chamada aos endpoints de consentimento ou à API FHIR, para o registro
 * de auditoria do receptor. Não carrega token, CPF nem conteúdo de recurso.
 */
export interface InteractionEvent {
  clientId: string;
  consentId?: string;
  /** Valor enviado em `x-fapi-interaction-id`. */
  interactionId: string;
  method: string;
  providerId: string;
  /** URL da chamada, sem os parâmetros de consulta. */
  resource: string;
  /** Status HTTP. Ausente quando não houve resposta. */
  status?: number;
}

export interface ResolvedProvider {
  endpoints: AuthorizationServerEndpoints;
  provider: RegistryProvider;
  receiver: RegistryReceiver;
}

export interface ClientContext {
  clientId: string;
  discover: (issuer: string, scopes: readonly string[]) => Promise<AuthorizationServerEndpoints>;
  invalidateProviderToken: (resolved: ResolvedProvider, scope: string, token: string) => void;
  now: () => Date;
  providerToken: (resolved: ResolvedProvider, scope: string, repeat?: boolean) => Promise<string>;
  registry: () => ParticipantRegistry;
  retry: RetryPolicy;
  revocations: RevocationStore;
  /** Revogações que este processo está tentando agora, por provedor e consentimento. */
  revocationsInFlight: Set<string>;
  signingKey: SigningKey;
  sleep: (ms: number) => Promise<void>;
  transport: LabAccessTransport;
  onInteraction?: (event: InteractionEvent) => void;
}
