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
import type { FHIRAppointment } from './fhir-types';
import { assertFhirId, toReference } from './validation';

export interface AppointmentIdentifier {
  system: string;
  value: string;
}

/**
 * O par vai sem codificação em `If-None-Exist`, como `identifier=system|value`.
 * Caracteres com significado em uma busca FHIR ou em um cabeçalho HTTP não são
 * aceitos, para que o valor não possa ser lido de outra forma pelo provedor.
 */
const UNSAFE_IN_SEARCH = /[\s|&#%+,$\\]/;

function isComplete(identifier: FHIRIdentifier | undefined): identifier is AppointmentIdentifier {
  const usable = (text: unknown) =>
    typeof text === 'string' && text !== '' && !UNSAFE_IN_SEARCH.test(text);
  return usable(identifier?.system) && usable(identifier?.value);
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
  if (chosen !== undefined) {
    const present = identifiers.some((i) => i.system === chosen.system && i.value === chosen.value);
    if (!isComplete(chosen) || !present) {
      throw new LabAccessConfigError(
        'O identificador indicado deveria estar em Appointment.identifier, com system e value.',
      );
    }
    return chosen;
  }
  const [only] = identifiers;
  if (identifiers.length !== 1 || !isComplete(only)) {
    throw new LabAccessConfigError(
      'O Appointment deveria trazer um identifier do receptor, com system e value. Com mais de um, indique qual usar.',
    );
  }
  return only;
}

/**
 * Confere as regras da criação e devolve o valor de `If-None-Exist`.
 *
 * Estado `proposed`, ao menos um `ServiceRequest` contido, um `basedOn` local
 * para cada pedido contido e nenhum para fora do recurso, e toda referência a
 * paciente apontando para o paciente do consentimento.
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

  const contained = appointment.contained ?? [];
  if (contained.length === 0) fail('O Appointment deveria conter ao menos um ServiceRequest.');
  const patient = `Patient/${patientFhirId}`;
  const containedIds = new Set<string>();
  for (const resource of contained) {
    if (resource.resourceType !== 'ServiceRequest') {
      fail('Os recursos contidos deveriam ser ServiceRequest.');
    }
    if (typeof resource.id !== 'string' || resource.id === '') {
      fail('Todo ServiceRequest contido deveria ter id.');
    }
    const subject = (resource.subject as { reference?: unknown } | undefined)?.reference;
    if (subject !== patient) {
      fail('O subject de cada pedido contido deveria ser o paciente do consentimento.');
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

  const patients = (appointment.participant ?? [])
    .map((participant) => participant.actor?.reference)
    .filter((reference): reference is string => reference?.startsWith('Patient/') ?? false);
  if (patients.length === 0 || patients.some((reference) => reference !== patient)) {
    fail('O participante paciente deveria ser o paciente do consentimento.');
  }

  const identifier = conditionalIdentifier(appointment, chosen);
  return `identifier=${identifier.system}|${identifier.value}`;
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
