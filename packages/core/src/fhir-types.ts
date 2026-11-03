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
  /**
   * A quem esta faixa se aplica, quando o laudo publica mais de uma.
   *
   * É o campo nativo do R4 para faixa estratificada, e existe justamente para
   * o caso em que o documento imprime uma coluna por sexo. Sem ele só há duas
   * saídas, e as duas perdem: escolher uma coluna sem saber de quem é o exame,
   * ou descartar as duas.
   */
  appliesTo?: FHIRCodeableConcept[];
  high?: FHIRQuantity;
  low?: FHIRQuantity;
  text?: string;
  /**
   * Que tipo de faixa é esta, no `referencerange-meaning` do HL7. Ver
   * `RangeKind` e `referenceRangeMeaning`.
   */
  type?: FHIRCodeableConcept;
}

export interface FHIRPeriod {
  end?: string;
  start?: string;
}

/**
 * Uma parte de um `Observation` composto: a pressão sistólica dentro do painel
 * de pressão arterial, o gene e o genótipo dentro de uma variante genética.
 */
export interface FHIRObservationComponent {
  code: FHIRCodeableConcept;
  interpretation?: FHIRCodeableConcept[];
  valueCodeableConcept?: FHIRCodeableConcept;
  valueQuantity?: FHIRQuantity;
  valueString?: string;
}

export interface FHIRObservation {
  bodySite?: FHIRCodeableConcept;
  category?: FHIRCodeableConcept[];
  code: FHIRCodeableConcept;
  component?: FHIRObservationComponent[];
  derivedFrom?: FHIRReference[];
  device?: FHIRReference;
  effectiveDateTime?: string;
  effectivePeriod?: FHIRPeriod;
  id?: string;
  interpretation?: FHIRCodeableConcept[];
  issued?: string;
  method?: FHIRCodeableConcept;
  note?: FHIRAnnotation[];
  performer?: FHIRReference[];
  referenceRange?: FHIRReferenceRange[];
  resourceType: 'Observation';
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  subject?: FHIRReference;
  /**
   * Resultado ordinal ou nominal codificado (resposta LOINC `LA…`), com o
   * texto impresso em `text`. Ver `ordinal-answers.ts`.
   */
  valueCodeableConcept?: FHIRCodeableConcept;
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
  identifier?: FHIRIdentifier[];
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
  /** Hash SHA-1 em base64, como o R4 define. Não serve para SHA-256. */
  hash?: string;
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
  effectiveDateTime?: string;
  effectivePeriod?: FHIRPeriod;
  id?: string;
  medicationCodeableConcept?: FHIRCodeableConcept;
  note?: FHIRAnnotation[];
  reasonCode?: FHIRCodeableConcept[];
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
 * Os recursos abaixo entram pela exportação do prontuário (ver
 * `export-bundle.ts`). Cada tipo traz só os elementos que os conversores deste
 * pacote emitem, não o recurso inteiro do R4: um campo que ninguém escreve nem
 * lê só obrigaria o consumidor a tratar `undefined`.
 */

export interface FHIRDocumentReference {
  author?: FHIRReference[];
  category?: FHIRCodeableConcept[];
  content: { attachment: FHIRAttachment }[];
  context?: { related?: FHIRReference[] };
  date?: string;
  description?: string;
  id?: string;
  identifier?: FHIRIdentifier[];
  resourceType: 'DocumentReference';
  status: 'current' | 'superseded' | 'entered-in-error';
  subject?: FHIRReference;
  type?: FHIRCodeableConcept;
}

export interface FHIRRange {
  high?: FHIRQuantity;
  low?: FHIRQuantity;
}

export interface FHIRRiskAssessmentPrediction {
  outcome?: FHIRCodeableConcept;
  probabilityDecimal?: number;
  qualitativeRisk?: FHIRCodeableConcept;
  whenRange?: FHIRRange;
}

export interface FHIRRiskAssessment {
  basis?: FHIRReference[];
  code?: FHIRCodeableConcept;
  id?: string;
  identifier?: FHIRIdentifier[];
  method?: FHIRCodeableConcept;
  note?: FHIRAnnotation[];
  occurrenceDateTime?: string;
  prediction?: FHIRRiskAssessmentPrediction[];
  resourceType: 'RiskAssessment';
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled';
  subject: FHIRReference;
}

export interface FHIRConsentProvision {
  actor?: { reference: FHIRReference; role: FHIRCodeableConcept }[];
  period?: FHIRPeriod;
  type?: 'deny' | 'permit';
}

export interface FHIRConsent {
  category: FHIRCodeableConcept[];
  dateTime?: string;
  id?: string;
  patient?: FHIRReference;
  policy?: { uri?: string }[];
  policyRule?: FHIRCodeableConcept;
  provision?: FHIRConsentProvision;
  resourceType: 'Consent';
  scope: FHIRCodeableConcept;
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';
}

export interface FHIRCommunicationPayload {
  contentReference?: FHIRReference;
  contentString?: string;
}

export interface FHIRCommunication {
  category?: FHIRCodeableConcept[];
  id?: string;
  medium?: FHIRCodeableConcept[];
  note?: FHIRAnnotation[];
  partOf?: FHIRReference[];
  payload?: FHIRCommunicationPayload[];
  recipient?: FHIRReference[];
  resourceType: 'Communication';
  sender?: FHIRReference;
  sent?: string;
  status:
    | 'preparation'
    | 'in-progress'
    | 'not-done'
    | 'on-hold'
    | 'stopped'
    | 'completed'
    | 'entered-in-error'
    | 'unknown';
  subject?: FHIRReference;
  topic?: FHIRCodeableConcept;
}

export interface FHIRAllergyIntolerance {
  category?: ('food' | 'medication' | 'environment' | 'biologic')[];
  clinicalStatus?: FHIRCodeableConcept;
  code?: FHIRCodeableConcept;
  id?: string;
  patient: FHIRReference;
  recordedDate?: string;
  resourceType: 'AllergyIntolerance';
  type?: 'allergy' | 'intolerance';
}

export interface FHIRCondition {
  category?: FHIRCodeableConcept[];
  clinicalStatus?: FHIRCodeableConcept;
  code?: FHIRCodeableConcept;
  id?: string;
  recordedDate?: string;
  resourceType: 'Condition';
  subject: FHIRReference;
  verificationStatus?: FHIRCodeableConcept;
}

export interface FHIRRelatedPerson {
  id?: string;
  name?: FHIRHumanName[];
  patient: FHIRReference;
  relationship?: FHIRCodeableConcept[];
  resourceType: 'RelatedPerson';
  telecom?: FHIRContactPoint[];
}

export interface FHIRSpecimen {
  collection?: { collectedDateTime?: string };
  id?: string;
  resourceType: 'Specimen';
  subject?: FHIRReference;
  type?: FHIRCodeableConcept;
}

export interface FHIRDevice {
  deviceName?: { name: string; type: 'udi-label-name' | 'user-friendly-name' | 'other' }[];
  id?: string;
  manufacturer?: string;
  resourceType: 'Device';
  type?: FHIRCodeableConcept;
}

export interface FHIRCarePlanActivityDetail {
  code?: FHIRCodeableConcept;
  description?: string;
  status:
    | 'not-started'
    | 'scheduled'
    | 'in-progress'
    | 'on-hold'
    | 'completed'
    | 'cancelled'
    | 'stopped'
    | 'unknown'
    | 'entered-in-error';
}

export interface FHIRCarePlan {
  activity?: { detail?: FHIRCarePlanActivityDetail }[];
  author?: FHIRReference;
  category?: FHIRCodeableConcept[];
  created?: string;
  description?: string;
  id?: string;
  intent: 'proposal' | 'plan' | 'order' | 'option';
  resourceType: 'CarePlan';
  status: 'draft' | 'active' | 'on-hold' | 'revoked' | 'completed' | 'entered-in-error' | 'unknown';
  subject: FHIRReference;
  title?: string;
}

/**
 * Qualquer recurso que os conversores deste pacote emitem. A união cresce com
 * os conversores; um recurso de fora dela ainda cabe numa entrada, mas o
 * `entryFullUrl` e o `validateBundleReferences` só conhecem estes.
 */
export type FHIRResource =
  | FHIRAllergyIntolerance
  | FHIRCarePlan
  | FHIRCommunication
  | FHIRCondition
  | FHIRConsent
  | FHIRDevice
  | FHIRDiagnosticReport
  | FHIRDocumentReference
  | FHIRMedicationStatement
  | FHIRObservation
  | FHIRPatient
  | FHIRRelatedPerson
  | FHIRRiskAssessment
  | FHIRSpecimen;

export interface FHIRMeta {
  lastUpdated?: string;
  profile?: string[];
  tag?: FHIRCoding[];
}

/**
 * FHIR Bundle containing all resources
 */
export interface FHIRBundle {
  entry: FHIRBundleEntry[];
  /** Identidade desta exportação, para o titular distinguir dois arquivos. */
  identifier?: FHIRIdentifier;
  meta?: FHIRMeta;
  resourceType: 'Bundle';
  /** Instante em que o Bundle foi montado. */
  timestamp?: string;
  type: 'collection' | 'document' | 'message' | 'transaction' | 'batch';
}

export interface FHIRBundleEntry {
  fullUrl?: string;
  resource: FHIRResource;
}
