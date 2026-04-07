/**
 * FHIR R4 Resource Types
 *
 * Type definitions for FHIR R4 resources used in lab result conversion.
 * See: https://hl7.org/fhir/R4/
 */

export interface FHIRCodeableConcept {
  coding?: FHIRCoding[];
  text?: string;
}

export interface FHIRCoding {
  code?: string;
  display?: string;
  system?: string;
}

export interface FHIRReference {
  display?: string;
  reference?: string;
}

export interface FHIRQuantity {
  code?: string;
  system?: string;
  unit?: string;
  value?: number;
}

export interface FHIRReferenceRange {
  high?: FHIRQuantity;
  low?: FHIRQuantity;
  text?: string;
}

export interface FHIRPeriod {
  end?: string;
  start?: string;
}

export interface FHIRObservation {
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  effectiveDateTime?: string;
  effectivePeriod?: FHIRPeriod;
  id?: string;
  interpretation?: FHIRCodeableConcept[];
  issued?: string;
  note?: FHIRAnnotation[];
  performer?: FHIRReference[];
  referenceRange?: FHIRReferenceRange[];
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  subject?: FHIRReference;
  valueQuantity?: FHIRQuantity;
  valueString?: string;
}

export interface FHIRAnnotation {
  authorString?: string;
  text: string;
  time?: string;
}

export interface FHIRDiagnosticReport {
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  conclusion?: string;
  conclusionCode?: FHIRCodeableConcept[];
  effectiveDateTime?: string;
  id?: string;
  issued?: string;
  performer?: FHIRReference[];
  presentedForm?: FHIRAttachment[];
  resourceType: 'DiagnosticReport';
  result?: FHIRReference[];
  resultsInterpreter?: FHIRReference[];
  status:
    | 'registered'
    | 'partial'
    | 'preliminary'
    | 'final'
    | 'amended'
    | 'corrected'
    | 'cancelled';
  subject?: FHIRReference;
}

export interface FHIRAttachment {
  contentType?: string;
  creation?: string;
  data?: string;
  title?: string;
  url?: string;
}

export interface FHIRIdentifier {
  system?: string;
  type?: FHIRCodeableConcept;
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  value?: string;
}

export interface FHIRPatient {
  address?: FHIRAddress[];
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  id?: string;
  identifier?: FHIRIdentifier[];
  name?: FHIRHumanName[];
  resourceType: 'Patient';
  telecom?: FHIRContactPoint[];
}

export interface FHIRHumanName {
  family?: string;
  given?: string[];
  text?: string;
}

export interface FHIRContactPoint {
  system?: 'phone' | 'email' | 'fax' | 'pager' | 'url' | 'sms' | 'other';
  value?: string;
}

export interface FHIRAddress {
  city?: string;
  country?: string;
  line?: string[];
  postalCode?: string;
  state?: string;
}

export interface FHIRMedicationStatement {
  category?: FHIRCodeableConcept;
  dateAsserted?: string;
  effectivePeriod?: FHIRPeriod;
  id?: string;
  medicationCodeableConcept?: FHIRCodeableConcept;
  note?: FHIRAnnotation[];
  resourceType: 'MedicationStatement';
  status:
    | 'active'
    | 'completed'
    | 'entered-in-error'
    | 'intended'
    | 'not-taken'
    | 'on-hold'
    | 'stopped'
    | 'unknown';
  subject?: FHIRReference;
}

/**
 * FHIR Bundle containing all resources
 */
export interface FHIRBundle {
  entry: FHIRBundleEntry[];
  resourceType: 'Bundle';
  type: 'collection' | 'document' | 'message' | 'transaction' | 'batch';
}

export interface FHIRBundleEntry {
  fullUrl?: string;
  resource: FHIRPatient | FHIRDiagnosticReport | FHIRObservation | FHIRMedicationStatement;
}
