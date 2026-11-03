import { describe, expect, it } from 'vitest';

import { actionPlanToFHIRCarePlan } from '../care-plan-converter';
import { communicationToFHIR, sharingContactToFHIRRelatedPerson } from '../communication-converter';
import { consentToFHIR } from '../consent-converter';
import { exportDocumentToFHIR, SHA256_IDENTIFIER_SYSTEM } from '../document-converter';
import { validateFHIRResource } from '../validators';

const patientId = 'user-1';

describe('consentToFHIR', () => {
  it('consentimento vigente: ativo, com categoria LOINC, política e período aberto', () => {
    const consent = consentToFHIR(
      {
        consentId: 'c-1',
        grantedAt: '2026-01-01T00:00:00Z',
        kind: 'lgpd',
        policyUri: 'https://precisa-saude.com.br/privacidade',
      },
      patientId,
    );
    expect(consent).toMatchObject({
      dateTime: '2026-01-01T00:00:00Z',
      id: 'consent-lgpd-c-1',
      patient: { reference: 'Patient/user-1' },
      policy: [{ uri: 'https://precisa-saude.com.br/privacidade' }],
      provision: { period: { start: '2026-01-01T00:00:00Z' }, type: 'permit' },
      scope: { coding: [{ code: 'patient-privacy' }] },
      status: 'active',
    });
    expect(consent.category[0]?.coding?.[0]?.code).toBe('59284-0');
    expect(consent.policyRule?.text).toMatch(/LGPD/);
    expect(consent.provision?.actor).toBeUndefined();
    expect(validateFHIRResource(consent)).toEqual([]);
  });

  it('consentimento revogado fica inativo com o fim do período; o de compartilhamento leva o destinatário', () => {
    const consent = consentToFHIR(
      {
        consentId: 'c-2',
        grantedAt: '2026-01-01T00:00:00Z',
        kind: 'sharing',
        policyText: 'Envio do laudo de 15/01 para a médica.',
        recipientDisplay: 'Dra. Ana',
        revokedAt: '2026-02-01T00:00:00Z',
      },
      patientId,
    );
    expect(consent.status).toBe('inactive');
    expect(consent.provision?.period).toEqual({
      end: '2026-02-01T00:00:00Z',
      start: '2026-01-01T00:00:00Z',
    });
    expect(consent.provision?.actor?.[0]).toMatchObject({
      reference: { display: 'Dra. Ana' },
      role: { coding: [{ code: 'IRCP' }] },
    });
    expect(consent.policyRule?.text).toBe('Envio do laudo de 15/01 para a médica.');
  });
});

describe('exportDocumentToFHIR', () => {
  it('PDF de laudo: tipo LOINC 11502-2, caminho no pacote, laudo relacionado e hash', () => {
    const document = exportDocumentToFHIR(
      {
        contentHash: 'abc123',
        contentType: 'application/pdf',
        createdAt: '2026-01-15T00:00:00Z',
        documentId: 'rep-1',
        kind: 'lab-report-pdf',
        relatedReportId: 'rep-1',
        title: 'hemograma.pdf',
        url: 'pdfs/rep-1.pdf',
      },
      patientId,
    );
    expect(document).toMatchObject({
      content: [
        {
          attachment: {
            contentType: 'application/pdf',
            creation: '2026-01-15T00:00:00Z',
            title: 'hemograma.pdf',
            url: 'pdfs/rep-1.pdf',
          },
        },
      ],
      context: { related: [{ reference: 'DiagnosticReport/rep-1' }] },
      id: 'doc-rep-1',
      identifier: [{ system: SHA256_IDENTIFIER_SYSTEM, value: 'abc123' }],
      status: 'current',
    });
    expect(document.type?.coding?.[0]?.code).toBe('11502-2');
    expect(document.content[0]?.attachment.hash).toBeUndefined();
    expect(validateFHIRResource(document)).toEqual([]);
  });

  it('arquivo genético bruto só tem texto no tipo; PDF compartilhado diz que é cópia', () => {
    const raw = exportDocumentToFHIR(
      {
        contentType: 'text/plain',
        documentId: 'prof-1',
        kind: 'genetic-raw-file',
        url: 'genetics/prof-1.txt',
      },
      patientId,
    );
    expect(raw.type).toEqual({ text: 'Arquivo genético bruto' });
    expect(raw.context).toBeUndefined();
    expect(raw.identifier).toBeUndefined();

    const shared = exportDocumentToFHIR(
      {
        contentType: 'application/pdf',
        documentId: 'send-1',
        kind: 'shared-pdf',
        url: 'shared/send-1.pdf',
      },
      patientId,
    );
    expect(shared.type?.text).toBe('Laudo laboratorial compartilhado');
  });
});

describe('communicationToFHIR', () => {
  it('mensagem da pessoa para a Precisa IA', () => {
    const message = communicationToFHIR(
      {
        channel: 'precisa-ia',
        conversationId: 'conv-1',
        messageId: 'm-1',
        sender: 'patient',
        sentAt: '2026-01-15T10:00:00Z',
        text: 'O que significa VCM alto?',
      },
      patientId,
    );
    expect(message).toMatchObject({
      category: [{ text: 'Precisa IA' }],
      id: 'msg-precisa-ia-m-1',
      payload: [{ contentString: 'O que significa VCM alto?' }],
      recipient: [{ display: 'Precisa IA' }],
      sender: { reference: 'Patient/user-1' },
      sent: '2026-01-15T10:00:00Z',
      status: 'completed',
      topic: { text: 'conv-1' },
    });
    expect(validateFHIRResource(message)).toEqual([]);
  });

  it('resposta do agente no suporte vai para a pessoa', () => {
    const message = communicationToFHIR(
      {
        channel: 'support',
        conversationId: 'conv-2',
        messageId: 'm-2',
        sender: 'agent',
        sentAt: '2026-01-15T10:05:00Z',
        text: 'Oi!',
      },
      patientId,
    );
    expect(message.sender).toEqual({ display: 'Equipe Precisa Saúde' });
    expect(message.recipient).toEqual([{ reference: 'Patient/user-1' }]);
  });

  it('envio de resultados leva o destinatário e o documento enviado', () => {
    const message = communicationToFHIR(
      {
        channel: 'sharing',
        conversationId: 'send-1',
        messageId: 'send-1',
        payloadDocumentId: 'send-1',
        recipientDisplay: 'Dra. Ana',
        sender: 'patient',
        sentAt: '2026-01-15T10:05:00Z',
      },
      patientId,
    );
    expect(message.recipient).toEqual([{ display: 'Dra. Ana' }]);
    expect(message.payload).toEqual([
      { contentReference: { reference: 'DocumentReference/doc-send-1' } },
    ]);
  });

  it('mensagem sem texto nem arquivo sai sem payload', () => {
    const message = communicationToFHIR(
      {
        channel: 'support',
        conversationId: 'conv-3',
        messageId: 'm-3',
        sender: 'system',
        sentAt: '2026-01-15T10:05:00Z',
      },
      patientId,
    );
    expect(message.payload).toBeUndefined();
    expect(message.sender).toEqual({ display: 'Sistema' });
  });
});

describe('sharingContactToFHIRRelatedPerson', () => {
  it('contato com nome e e-mail', () => {
    const person = sharingContactToFHIRRelatedPerson(
      { contactId: 'ct-1', email: 'ana@exemplo.com', name: 'Dra. Ana' },
      patientId,
    );
    expect(person).toMatchObject({
      id: 'contact-ct-1',
      name: [{ text: 'Dra. Ana' }],
      patient: { reference: 'Patient/user-1' },
      telecom: [{ system: 'email', value: 'ana@exemplo.com' }],
    });
    expect(validateFHIRResource(person)).toEqual([]);
  });

  it('contato só com id não inventa nome nem telecom', () => {
    const person = sharingContactToFHIRRelatedPerson({ contactId: 'ct-2' }, patientId);
    expect(person.name).toBeUndefined();
    expect(person.telecom).toBeUndefined();
  });
});

describe('actionPlanToFHIRCarePlan', () => {
  it('uma atividade por recomendação, como proposta da Precisa IA', () => {
    const plan = actionPlanToFHIRCarePlan(
      {
        generatedAt: '2026-01-15T00:00:00Z',
        planId: 'plan-1',
        recommendations: [
          {
            category: 'alimentação',
            description: 'Incluir folhas verdes.',
            recommendationId: 'r-1',
            title: 'Mais folato',
          },
          { recommendationId: 'r-2', title: 'Repetir ferritina em 3 meses' },
        ],
      },
      patientId,
    );
    expect(plan).toMatchObject({
      author: { display: 'Precisa IA' },
      created: '2026-01-15T00:00:00Z',
      id: 'careplan-plan-1',
      intent: 'proposal',
      status: 'active',
      subject: { reference: 'Patient/user-1' },
    });
    expect(plan.activity?.map((a) => a.detail?.code?.text)).toEqual([
      'Mais folato (alimentação)',
      'Repetir ferritina em 3 meses',
    ]);
    expect(plan.activity?.[0]?.detail?.description).toBe('Incluir folhas verdes.');
    expect(plan.activity?.[1]?.detail?.description).toBeUndefined();
    expect(validateFHIRResource(plan)).toEqual([]);
  });
});
