/**
 * Arquivos que viajam junto do Bundle (PDF do laudo, arquivo genético bruto,
 * PDF compartilhado) como `DocumentReference`.
 *
 * O conteúdo não vai embutido em base64: `attachment.url` é o caminho
 * relativo dentro do pacote exportado, e quem lê o Bundle encontra o arquivo
 * ao lado. O hash SHA-256 vai em `identifier`, porque `Attachment.hash` é
 * SHA-1 por definição do R4 e um SHA-256 ali seria o campo errado.
 */

import { type Addressable } from './bundle-urls';
import { exportLoincCoding } from './export-codes';
import { fhirResourceId, patientReference } from './export-helpers';
import type { FHIRCodeableConcept, FHIRDocumentReference } from './fhir-types';
import type { ExportDocumentData, ExportDocumentKind } from './types';

/** `identifier.system` do hash SHA-256 do arquivo. */
export const SHA256_IDENTIFIER_SYSTEM = 'http://fhir-brasil.dev/identifiers/sha-256';

function documentType(kind: ExportDocumentKind): FHIRCodeableConcept {
  if (kind === 'genetic-raw-file') return { text: 'Arquivo genético bruto' };
  const report = exportLoincCoding('laboratoryReport');
  return {
    ...(report ? { coding: [report] } : {}),
    text: kind === 'shared-pdf' ? 'Laudo laboratorial compartilhado' : 'Laudo laboratorial',
  };
}

/** Um arquivo exportado como `DocumentReference` apontando para o caminho no pacote. */
export function exportDocumentToFHIR(
  document: ExportDocumentData,
  patientId: string,
): Addressable<FHIRDocumentReference> {
  return {
    content: [
      {
        attachment: {
          contentType: document.contentType,
          ...(document.createdAt ? { creation: document.createdAt } : {}),
          ...(document.title ? { title: document.title } : {}),
          url: document.url,
        },
      },
    ],
    ...(document.relatedReportId
      ? { context: { related: [{ reference: `DiagnosticReport/${document.relatedReportId}` }] } }
      : {}),
    ...(document.createdAt ? { date: document.createdAt } : {}),
    id: fhirResourceId('doc', document.documentId),
    ...(document.contentHash
      ? { identifier: [{ system: SHA256_IDENTIFIER_SYSTEM, value: document.contentHash }] }
      : {}),
    resourceType: 'DocumentReference',
    status: 'current',
    subject: patientReference(patientId),
    type: documentType(document.kind),
  };
}
