/**
 * Tipos FHIR R4 específicos para a RNDS
 *
 * Tipos que ainda não existem no pacote core e são necessários
 * para interação com a API da RNDS.
 */

import type {
  FHIRAddress,
  FHIRCodeableConcept,
  FHIRContactPoint,
  FHIRHumanName,
  FHIRReference,
} from '@precisa-saude/fhir';

export interface FHIRIdentifier {
  system?: string;
  type?: FHIRCodeableConcept;
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  value?: string;
}

export interface FHIROrganization {
  active?: boolean;
  address?: FHIRAddress[];
  alias?: string[];
  id?: string;
  identifier?: FHIRIdentifier[];
  name?: string;
  resourceType: 'Organization';
  telecom?: FHIRContactPoint[];
  type?: FHIRCodeableConcept[];
}

export interface FHIRPractitioner {
  active?: boolean;
  address?: FHIRAddress[];
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  id?: string;
  identifier?: FHIRIdentifier[];
  name?: FHIRHumanName[];
  qualification?: FHIRPractitionerQualification[];
  resourceType: 'Practitioner';
  telecom?: FHIRContactPoint[];
}

export interface FHIRPractitionerQualification {
  code: FHIRCodeableConcept;
  identifier?: FHIRIdentifier[];
  issuer?: FHIRReference;
  period?: { start?: string; end?: string };
}

export interface FHIROperationOutcomeIssue {
  code: string;
  details?: FHIRCodeableConcept;
  diagnostics?: string;
  expression?: string[];
  location?: string[];
  severity: 'fatal' | 'error' | 'warning' | 'information';
}

export interface FHIROperationOutcome {
  issue: FHIROperationOutcomeIssue[];
  resourceType: 'OperationOutcome';
}

export interface RNDSSearchBundleEntry<T> {
  fullUrl?: string;
  resource: T;
}

export interface RNDSSearchBundle<T> {
  entry?: RNDSSearchBundleEntry<T>[];
  resourceType: 'Bundle';
  total?: number;
  type: 'searchset';
}

export interface RNDSTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}
