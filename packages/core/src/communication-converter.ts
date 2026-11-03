/**
 * Conversas e envios em FHIR: cada mensagem do chat de suporte, da Precisa IA
 * ou cada envio de resultados vira uma `Communication`; cada contato salvo
 * vira uma `RelatedPerson`.
 */

import { type Addressable } from './bundle-urls';
import { fhirResourceId, patientReference } from './export-helpers';
import type {
  FHIRCommunication,
  FHIRCommunicationPayload,
  FHIRReference,
  FHIRRelatedPerson,
} from './fhir-types';
import type { CommunicationChannel, CommunicationData, SharingContactData } from './types';

const CHANNEL_TEXT: Record<CommunicationChannel, string> = {
  'precisa-ia': 'Precisa IA',
  sharing: 'Compartilhamento de resultados',
  support: 'Chat de suporte',
};

const SENDER_DISPLAY = {
  agent: 'Equipe Precisa Saúde',
  assistant: 'Precisa IA',
  system: 'Sistema',
} as const;

/** Uma mensagem ou um envio como `Communication` concluída. */
export function communicationToFHIR(
  message: CommunicationData,
  patientId: string,
): Addressable<FHIRCommunication> {
  const patient = patientReference(patientId);
  const sender: FHIRReference =
    message.sender === 'patient' ? patient : { display: SENDER_DISPLAY[message.sender] };
  const recipient: FHIRReference[] =
    message.channel === 'sharing' && message.recipientDisplay
      ? [{ display: message.recipientDisplay }]
      : message.sender === 'patient'
        ? [{ display: SENDER_DISPLAY[message.channel === 'precisa-ia' ? 'assistant' : 'agent'] }]
        : [patient];
  const payload: FHIRCommunicationPayload[] = [
    ...(message.text ? [{ contentString: message.text }] : []),
    ...(message.payloadDocumentId
      ? [
          {
            contentReference: {
              reference: `DocumentReference/${fhirResourceId('doc', message.payloadDocumentId)}`,
            },
          },
        ]
      : []),
  ];

  return {
    category: [{ text: CHANNEL_TEXT[message.channel] }],
    id: fhirResourceId('msg', message.channel, message.messageId),
    ...(payload.length > 0 ? { payload } : {}),
    recipient,
    resourceType: 'Communication',
    sender,
    sent: message.sentAt,
    status: 'completed',
    subject: patient,
    topic: { text: message.conversationId },
  };
}

/** Um contato salvo para compartilhamento como `RelatedPerson`. */
export function sharingContactToFHIRRelatedPerson(
  contact: SharingContactData,
  patientId: string,
): Addressable<FHIRRelatedPerson> {
  return {
    id: fhirResourceId('contact', contact.contactId),
    ...(contact.name ? { name: [{ text: contact.name }] } : {}),
    patient: patientReference(patientId),
    relationship: [{ text: 'Destinatário de resultados indicado pela pessoa' }],
    resourceType: 'RelatedPerson',
    ...(contact.email ? { telecom: [{ system: 'email', value: contact.email }] } : {}),
  };
}
