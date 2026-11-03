/**
 * Consentimentos em FHIR: um `Consent` por evento, com a data, a política e,
 * no compartilhamento, com quem a pessoa consentiu em compartilhar.
 */

import { type Addressable } from './bundle-urls';
import { requireExportLoinc } from './export-codes';
import { fhirResourceId, patientReference } from './export-helpers';
import type { FHIRConsent } from './fhir-types';
import type { ConsentData, ConsentKind } from './types';

const CONSENT_SCOPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/consentscope';

/** Texto curto de cada tipo, para `policyRule.text` quando não há política. */
const CONSENT_KIND_TEXT: Record<ConsentKind, string> = {
  lgpd: 'Tratamento de dados de saúde pela Precisa Saúde (LGPD)',
  'precisa-ia-deep': 'Análise aprofundada pela Precisa IA com modelo fora do país',
  sharing: 'Compartilhamento de resultados com um destinatário indicado',
  whatsapp: 'Recebimento de mensagens e laudos pelo WhatsApp',
};

/** Um consentimento como `Consent` de escopo `patient-privacy`. */
export function consentToFHIR(consent: ConsentData, patientId: string): Addressable<FHIRConsent> {
  const patient = patientReference(patientId);
  return {
    category: [requireExportLoinc('patientConsent')],
    dateTime: consent.grantedAt,
    id: fhirResourceId('consent', consent.kind, consent.consentId),
    patient,
    ...(consent.policyUri ? { policy: [{ uri: consent.policyUri }] } : {}),
    policyRule: { text: consent.policyText ?? CONSENT_KIND_TEXT[consent.kind] },
    provision: {
      ...(consent.recipientDisplay
        ? {
            actor: [
              {
                reference: { display: consent.recipientDisplay },
                role: {
                  coding: [
                    {
                      code: 'IRCP',
                      display: 'information recipient',
                      system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                    },
                  ],
                },
              },
            ],
          }
        : {}),
      period: {
        ...(consent.revokedAt ? { end: consent.revokedAt } : {}),
        start: consent.grantedAt,
      },
      type: 'permit',
    },
    resourceType: 'Consent',
    scope: {
      coding: [
        { code: 'patient-privacy', display: 'Privacy Consent', system: CONSENT_SCOPE_SYSTEM },
      ],
    },
    status: consent.revokedAt ? 'inactive' : 'active',
  };
}
