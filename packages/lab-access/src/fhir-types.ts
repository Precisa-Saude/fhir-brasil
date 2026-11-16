/**
 * Tipos FHIR R4 mínimos para os recursos que o protocolo usa e que ainda não
 * existem em `@precisa-saude/fhir`.
 *
 * Só os elementos que o cliente lê ou confere estão tipados. Os demais passam
 * pelo índice aberto, sem alteração: o cliente é transporte.
 */

import type {
  FHIRAddress,
  FHIRCodeableConcept,
  FHIRContactPoint,
  FHIRIdentifier,
  FHIRMeta,
  FHIRPeriod,
  FHIRReference,
} from '@precisa-saude/fhir';

export interface FHIROperationOutcomeIssue {
  code: string;
  details?: FHIRCodeableConcept;
  diagnostics?: string;
  expression?: string[];
  severity: 'error' | 'fatal' | 'information' | 'warning';
}

export interface FHIROperationOutcome {
  issue: FHIROperationOutcomeIssue[];
  resourceType: 'OperationOutcome';
}

/** Base comum: elementos não tipados seguem como vieram. */
export interface FHIRResourceBase {
  [element: string]: unknown;
  id?: string;
  meta?: FHIRMeta & { versionId?: string };
}

export interface FHIRActivityDefinition extends FHIRResourceBase {
  code?: FHIRCodeableConcept;
  resourceType: 'ActivityDefinition';
  status: 'active' | 'draft' | 'retired' | 'unknown';
  title?: string;
  url?: string;
}

export interface FHIRChargeItemDefinition extends FHIRResourceBase {
  code?: FHIRCodeableConcept;
  resourceType: 'ChargeItemDefinition';
  status: 'active' | 'draft' | 'retired' | 'unknown';
  url?: string;
}

export interface FHIRLocation extends FHIRResourceBase {
  address?: FHIRAddress;
  name?: string;
  position?: { latitude: number; longitude: number };
  resourceType: 'Location';
  status?: 'active' | 'inactive' | 'suspended';
  telecom?: FHIRContactPoint[];
}

export interface FHIRHealthcareService extends FHIRResourceBase {
  active?: boolean;
  location?: FHIRReference[];
  name?: string;
  resourceType: 'HealthcareService';
}

export interface FHIRSchedule extends FHIRResourceBase {
  active?: boolean;
  actor: FHIRReference[];
  planningHorizon?: FHIRPeriod;
  resourceType: 'Schedule';
}

export interface FHIRSlot extends FHIRResourceBase {
  end: string;
  resourceType: 'Slot';
  schedule: FHIRReference;
  serviceType?: FHIRCodeableConcept[];
  start: string;
  status: 'busy' | 'busy-tentative' | 'busy-unavailable' | 'entered-in-error' | 'free';
}

export interface FHIRServiceRequest extends FHIRResourceBase {
  code?: FHIRCodeableConcept;
  intent: string;
  resourceType: 'ServiceRequest';
  status: string;
  subject: FHIRReference;
}

export interface FHIRAppointmentParticipant {
  [element: string]: unknown;
  actor?: FHIRReference;
  status: 'accepted' | 'declined' | 'needs-action' | 'tentative';
}

export type FHIRAppointmentStatus =
  | 'arrived'
  | 'booked'
  | 'cancelled'
  | 'checked-in'
  | 'entered-in-error'
  | 'fulfilled'
  | 'noshow'
  | 'pending'
  | 'proposed'
  | 'waitlist';

export interface FHIRAppointment extends FHIRResourceBase {
  basedOn?: FHIRReference[];
  cancelationReason?: FHIRCodeableConcept;
  contained?: (FHIRResourceBase & { resourceType: string })[];
  end?: string;
  identifier?: FHIRIdentifier[];
  participant: FHIRAppointmentParticipant[];
  resourceType: 'Appointment';
  slot?: FHIRReference[];
  start?: string;
  status: FHIRAppointmentStatus;
}

export interface FHIRCapabilityStatement extends FHIRResourceBase {
  fhirVersion?: string;
  resourceType: 'CapabilityStatement';
}

export interface FHIRBundleLink {
  relation: string;
  url: string;
}

export interface FHIRSearchBundleEntry<T> {
  fullUrl?: string;
  resource?: FHIROperationOutcome | T;
  search?: { mode?: 'include' | 'match' | 'outcome' };
}

/** Bundle `searchset` como devolvido pelo provedor. */
export interface FHIRSearchBundle<T> {
  entry?: FHIRSearchBundleEntry<T>[];
  link?: FHIRBundleLink[];
  resourceType: 'Bundle';
  total?: number;
  type: 'searchset';
}
