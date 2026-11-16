/**
 * Agendamento (seção 5.5.5): o que o protocolo exige do receptor ao criar,
 * remarcar e cancelar.
 *
 * O cliente não monta o `Appointment`: recebe o recurso pronto, confere as
 * regras estruturais da criação e o envia como veio. Na remarcação e no
 * cancelamento troca só os elementos que o receptor pode alterar.
 */

import type { FHIRCodeableConcept, FHIRIdentifier } from '@precisa-saude/fhir';

import { LabAccessConfigError } from './errors';
import type { FHIRAppointment, FHIRServiceRequest, FHIRTypedReference } from './fhir-types';
import { assertFhirId, toReference } from './validation';

export interface AppointmentIdentifier {
  system: string;
  value: string;
}

/** URL canônica da extensão que carrega o link de pagamento (seção 5.5.5). */
export const PAYMENT_LINK_URL = 'https://fhir-brasil.dev.br/ig/StructureDefinition/payment-link';

/**
 * Identificador do receptor na criação condicional (seção 5.5.5). Com esses
 * conjuntos de caracteres, o par vai em `If-None-Exist` na forma literal
 * `identifier=system|value`, sem nenhuma regra de escape da busca FHIR ou da
 * URL entrar em jogo.
 *
 * - `value`: de 1 a 64 caracteres não reservados do RFC 3986.
 * - `system`: URL `https` de até 200 caracteres, só com letras, dígitos e
 *   `- . _ ~ : /`, e portanto sem consulta, fragmento, `%` nem credenciais.
 */
const IDENTIFIER_VALUE = /^[A-Za-z0-9\-._~]{1,64}$/;
const IDENTIFIER_SYSTEM = /^https:\/\/[A-Za-z0-9\-._~:/]+$/;
const IDENTIFIER_SYSTEM_MAX = 200;

function isProtocolIdentifier(
  identifier: FHIRIdentifier | undefined,
): identifier is AppointmentIdentifier {
  const { system, value } = identifier ?? {};
  if (typeof value !== 'string' || !IDENTIFIER_VALUE.test(value)) return false;
  if (
    typeof system !== 'string' ||
    system.length > IDENTIFIER_SYSTEM_MAX ||
    !IDENTIFIER_SYSTEM.test(system)
  ) {
    return false;
  }
  // O conjunto de caracteres ainda admite texto que não é URL, como `https://:`.
  try {
    new URL(system);
    return true;
  } catch {
    return false;
  }
}

/**
 * Escolhe o identificador do receptor usado na criação condicional. Com mais
 * de um identificador no recurso, quem chama precisa dizer qual.
 */
function conditionalIdentifier(
  appointment: FHIRAppointment,
  chosen: AppointmentIdentifier | undefined,
): AppointmentIdentifier {
  const identifiers = appointment.identifier ?? [];
  const rules =
    'system como URL https de até 200 caracteres (letras, dígitos e - . _ ~ : /) e value de 1 a 64 caracteres (letras, dígitos e - . _ ~)';
  if (chosen !== undefined) {
    const present = identifiers.some((i) => i.system === chosen.system && i.value === chosen.value);
    if (!present) {
      throw new LabAccessConfigError(
        'O identificador indicado deveria estar em Appointment.identifier.',
      );
    }
    if (!isProtocolIdentifier(chosen)) {
      throw new LabAccessConfigError(`O identificador do receptor deveria ter ${rules}.`);
    }
    return chosen;
  }
  const [only] = identifiers;
  if (identifiers.length !== 1) {
    throw new LabAccessConfigError(
      'O Appointment deveria trazer um identifier do receptor. Com mais de um, indique qual usar.',
    );
  }
  if (!isProtocolIdentifier(only)) {
    throw new LabAccessConfigError(`O identificador do receptor deveria ter ${rules}.`);
  }
  return only;
}

/** Participantes de um tipo, pelo `actor.type`, que é como o perfil os distingue. */
function participantsOfType(appointment: FHIRAppointment, type: string): FHIRTypedReference[] {
  return (appointment.participant ?? [])
    .map((participant) => participant.actor)
    .filter((actor): actor is FHIRTypedReference => actor?.type === type);
}

/**
 * Confere as regras da criação e devolve o valor de `If-None-Exist`.
 *
 * - Estado `proposed`, sem a extensão de link de pagamento, que é do provedor.
 * - Participantes distinguidos por `actor.type`: exatamente um `Patient`, com a
 *   referência `Patient/{fhir_id}` do consentimento, e exatamente uma
 *   `Location`. Participante que aponta para um paciente sem `actor.type`
 *   também é recusado: sem ele o recurso não valida no perfil.
 * - Ao menos um `ServiceRequest` contido, cada um com `status` `active`,
 *   `intent` `order`, `code` com ao menos um `coding`, sem `meta.versionId` nem
 *   `meta.lastUpdated`, e com `subject` igual, caractere a caractere, à
 *   referência do participante paciente (o `type`, quando vem, é `Patient`).
 * - Um `basedOn` local para cada pedido contido e nenhum para fora do recurso.
 */
export function prepareAppointmentCreation(
  appointment: FHIRAppointment,
  patientFhirId: string,
  chosen?: AppointmentIdentifier,
): string {
  const fail = (message: string): never => {
    throw new LabAccessConfigError(message);
  };
  if (appointment?.resourceType !== 'Appointment') fail('O recurso deveria ser um Appointment.');
  if (appointment.status !== 'proposed') {
    fail('O Appointment deveria chegar com status igual a proposed.');
  }
  if ((appointment.extension ?? []).some((extension) => extension?.url === PAYMENT_LINK_URL)) {
    fail('A criação não leva a extensão de link de pagamento: o link é definido pelo provedor.');
  }

  const patient = `Patient/${patientFhirId}`;
  const patients = participantsOfType(appointment, 'Patient');
  if (patients.length !== 1 || patients[0]!.reference !== patient) {
    fail(
      'O Appointment deveria ter um participante com actor.type Patient e a referência do paciente do consentimento.',
    );
  }
  const untyped = (appointment.participant ?? []).some(
    (participant) =>
      participant.actor?.type === undefined &&
      /^(Patient|Location)\//.test(participant.actor?.reference ?? ''),
  );
  if (untyped) fail('Os participantes paciente e unidade deveriam trazer actor.type.');
  const locations = participantsOfType(appointment, 'Location');
  if (
    locations.length !== 1 ||
    !/^Location\/[A-Za-z0-9\-.]{1,64}$/.test(locations[0]!.reference ?? '')
  ) {
    fail(
      'O Appointment deveria ter um participante com actor.type Location e a referência da unidade.',
    );
  }

  const contained = appointment.contained ?? [];
  if (contained.length === 0) fail('O Appointment deveria conter ao menos um ServiceRequest.');
  const containedIds = new Set<string>();
  for (const resource of contained) {
    if (resource.resourceType !== 'ServiceRequest') {
      fail('Os recursos contidos deveriam ser ServiceRequest.');
    }
    if (typeof resource.id !== 'string' || resource.id === '') {
      fail('Todo ServiceRequest contido deveria ter id.');
    }
    const request = resource as Partial<FHIRServiceRequest>;
    if (request.status !== 'active' || request.intent !== 'order') {
      fail('Todo pedido contido deveria ter status active e intent order.');
    }
    const codings = request.code?.coding;
    if (!Array.isArray(codings) || codings.length === 0) {
      fail('Todo pedido contido deveria ter code com ao menos um coding.');
    }
    if (resource.meta?.versionId !== undefined || resource.meta?.lastUpdated !== undefined) {
      fail('Recurso contido não leva meta.versionId nem meta.lastUpdated.');
    }
    const subject = request.subject;
    if (
      subject?.reference !== patient ||
      (subject.type !== undefined && subject.type !== 'Patient')
    ) {
      fail(
        'O subject de cada pedido contido deveria repetir a referência do participante paciente.',
      );
    }
    containedIds.add(resource.id as string);
  }

  const referenced = new Set<string>();
  for (const basedOn of appointment.basedOn ?? []) {
    const reference = basedOn.reference ?? '';
    if (!reference.startsWith('#') || !containedIds.has(reference.slice(1))) {
      fail('Todo basedOn deveria apontar para um pedido contido, com referência local.');
    }
    referenced.add(reference.slice(1));
  }
  if (referenced.size !== containedIds.size) {
    fail('Todo ServiceRequest contido deveria ser referenciado por um basedOn.');
  }

  const identifier = conditionalIdentifier(appointment, chosen);
  return `identifier=${identifier.system}|${identifier.value}`;
}

/**
 * Link de pagamento do agendamento, ou `undefined` (seção 5.5.5).
 *
 * Lido só da extensão de URL canônica `payment-link` no nível raiz do
 * `Appointment`, em `valueUrl`, e só com esquema `https`. Link em outro
 * elemento, em outra extensão, com outro esquema, ou com a extensão repetida
 * não é devolvido. O aplicativo abre o endereço como veio, no navegador do
 * sistema: o pacote não o busca nem o altera.
 */
export function readPaymentLink(appointment: FHIRAppointment): string | undefined {
  const links = (appointment?.extension ?? []).filter(
    (extension) => extension?.url === PAYMENT_LINK_URL,
  );
  if (links.length !== 1) return undefined;
  const value = links[0]!.valueUrl;
  if (typeof value !== 'string' || !value.startsWith('https://')) return undefined;
  try {
    new URL(value);
    return value;
  } catch {
    return undefined;
  }
}

function assertUpdatable(current: FHIRAppointment, etag: string): string {
  if (current?.resourceType !== 'Appointment') {
    throw new LabAccessConfigError('O recurso deveria ser o Appointment lido do provedor.');
  }
  if (typeof etag !== 'string' || etag === '') {
    throw new LabAccessConfigError(
      'Alterar um Appointment exige o ETag da leitura, para o If-Match.',
    );
  }
  return assertFhirId(current.id, 'id do Appointment');
}

export interface RescheduleInput {
  /** O recurso completo, como lido do provedor. */
  current: FHIRAppointment;
  end: string;
  /** `ETag` da leitura. */
  etag: string;
  /** Novo horário: id ou referência `Slot/id`. */
  slot: string;
  start: string;
}

export interface CancelInput {
  cancelationReason?: FHIRCodeableConcept;
  current: FHIRAppointment;
  etag: string;
}

/** Cópia do recurso lido, com `slot`, `start` e `end` novos e o resto intacto. */
export function rescheduled(input: RescheduleInput): { body: FHIRAppointment; id: string } {
  const id = assertUpdatable(input.current, input.etag);
  if (!input.start || !input.end) {
    throw new LabAccessConfigError('A remarcação exige start e end do novo horário.');
  }
  const body = structuredClone(input.current);
  body.slot = [{ reference: toReference('Slot', input.slot) }];
  body.start = input.start;
  body.end = input.end;
  return { body, id };
}

/** Cópia do recurso lido, com `status` igual a `cancelled`. */
export function cancelled(input: CancelInput): { body: FHIRAppointment; id: string } {
  const id = assertUpdatable(input.current, input.etag);
  const body = structuredClone(input.current);
  body.status = 'cancelled';
  if (input.cancelationReason !== undefined) body.cancelationReason = input.cancelationReason;
  return { body, id };
}
