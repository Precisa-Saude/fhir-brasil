/**
 * Formato do registro de participantes (capítulo 8). Os nomes de campo são
 * identificadores do protocolo e ficam como no arquivo.
 */

import type { Scope } from './constants';

export interface RegistryKey {
  alg: 'PS256';
  e: string;
  /** Thumbprint SHA-256 da chave (RFC 7638). */
  kid: string;
  kty: 'RSA';
  n: string;
  use: 'sig';
}

export type ParticipantStatus = 'active' | 'suspended' | 'withdrawn';

export interface RegistryTransportCertificate {
  not_after: string;
  not_before: string;
  x5c: string[];
  'x5t#S256': string;
}

export interface RegistryProviderBlock {
  api_base_url: string;
  consent_management_uri: string;
  fhir_base_url: string;
  issuer: string;
  logo_uri?: string;
  scopes_supported: Scope[];
}

export interface RegistryReceiverBlock {
  client_id: string;
  client_name: string;
  eligibility: { declared_at: string; health_plan_operator: false; patient_facing: true };
  jwks_uri: string;
  logo_uri?: string;
  policy_uri: string;
  redirect_uris: string[];
  scopes_allowed: Scope[];
  tos_uri: string;
  transport_certificates: RegistryTransportCertificate[];
}

export interface RegistryParticipant {
  cnpj: string;
  contacts: { security_email: string; technical_email: string };
  display_name: string;
  legal_name: string;
  participant_id: string;
  protocol_versions: string[];
  provider?: RegistryProviderBlock;
  receiver?: RegistryReceiverBlock;
  role: 'provider' | 'receiver';
  status: ParticipantStatus;
  updated_at: string;
}

export type RegistryProvider = RegistryParticipant & {
  provider: RegistryProviderBlock;
  role: 'provider';
};

export type RegistryReceiver = RegistryParticipant & {
  receiver: RegistryReceiverBlock;
  role: 'receiver';
};

export interface RegistryDocument {
  environment: 'pilot' | 'production';
  expires_at: string;
  issued_at: string;
  participants: RegistryParticipant[];
  registry_keys: { keys: RegistryKey[] };
  schema_version: string;
  sequence: number;
}
