import { describe, expect, it } from 'vitest';

import { healthKitDailyToFHIRObservations } from '../activity-converter';
import { type Addressable, entryFullUrl } from '../bundle-urls';
import { communicationToFHIR } from '../communication-converter';
import { consentToFHIR } from '../consent-converter';
import { labReportEntries, userProfileToFHIR } from '../converter';
import { exportDocumentToFHIR } from '../document-converter';
import {
  buildExportBundle,
  createExportBundleWriter,
  EXPORT_BUNDLE_TAG,
  EXPORT_IDENTIFIER_SYSTEM,
  toBundleEntry,
} from '../export-bundle';
import type { FHIRBundle, FHIRResource } from '../fhir-types';
import {
  geneticProfileToFHIRDiagnosticReport,
  geneticSnpToFHIRObservation,
} from '../genomics-converter';
import { brDMriscToFHIRRiskAssessment, phenoAgeToFHIRObservation } from '../risk-converter';
import { validateBundleReferences, validateFHIRResource } from '../validators';
import { healthConditionsToFHIR, vitalsToFHIRObservations } from '../vitals-converter';

const options = {
  exportId: '3f2a1b2c-0000-4000-8000-000000000001',
  timestamp: '2026-11-03T12:00:00Z',
};
const patientId = 'user-1';

/** Um prontuário sintético com um recurso de cada tipo que a exportação emite. */
function syntheticExport(): Addressable<FHIRResource>[] {
  const patient = userProfileToFHIR({ name: 'Maria da Silva', userId: patientId });
  const lab = labReportEntries(
    {
      collectionDate: '2026-01-15T08:00:00Z',
      createdAt: '2026-01-15T14:00:00Z',
      overallStatus: 'NORMAL',
      reportId: 'rep-1',
      userId: patientId,
    },
    [
      {
        biomarkerCode: 'Glucose',
        biomarkerName: 'Glicose',
        flag: '',
        reportId: 'rep-1',
        unit: 'mg/dL',
        value: 85,
      },
      {
        biomarkerCode: 'LDL_Peak_Size',
        biomarkerName: 'Tamanho do pico de LDL',
        flag: '',
        reportId: 'rep-1',
        unit: 'nm',
        value: 26,
      },
    ],
    patientId,
  ).map((entry) => entry.resource as Addressable<FHIRResource>);
  const snp = geneticSnpToFHIRObservation(
    { genotype: 'AG', profileId: 'prof-1', rsId: 'rs1801133' },
    patientId,
  );
  return [
    patient,
    ...lab,
    exportDocumentToFHIR(
      {
        contentType: 'application/pdf',
        documentId: 'rep-1',
        kind: 'lab-report-pdf',
        relatedReportId: 'rep-1',
        url: 'pdfs/rep-1.pdf',
      },
      patientId,
    ),
    ...vitalsToFHIRObservations(
      { bloodPressure: { diastolic: 80, systolic: 120 }, weightKg: 70 },
      patientId,
    ),
    ...healthConditionsToFHIR({ bpTreatment: true, smoking: false }, patientId),
    ...healthKitDailyToFHIRObservations({ date: '2026-01-15', steps: 8000 }, patientId),
    phenoAgeToFHIRObservation(
      {
        ageDifference: 0,
        calculatedAt: '2026-01-15T12:00:00Z',
        chronologicalAge: 40,
        mortalityScore: 0.01,
        phenoAge: 40,
        resultId: 'ph-1',
      },
      patientId,
    ),
    brDMriscToFHIRRiskAssessment(
      {
        basisObservationIds: ['rep-1-Glucose'],
        calculatedAt: '2026-01-15T12:00:00Z',
        resultId: 'risk-1',
        risk10y: 0.1,
        riskCategory: 'baixo',
      },
      patientId,
    ),
    snp,
    geneticProfileToFHIRDiagnosticReport(
      { profileId: 'prof-1', uploadedAt: '2026-01-10T00:00:00Z' },
      [snp.id],
      patientId,
    ),
    consentToFHIR({ consentId: 'c-1', grantedAt: '2026-01-01T00:00:00Z', kind: 'lgpd' }, patientId),
    communicationToFHIR(
      {
        channel: 'sharing',
        conversationId: 's-1',
        messageId: 's-1',
        payloadDocumentId: 'rep-1',
        recipientDisplay: 'Dra. Ana',
        sender: 'patient',
        sentAt: '2026-01-16T00:00:00Z',
      },
      patientId,
    ),
  ];
}

describe('buildExportBundle', () => {
  it('coleção plana com identificador, instante e tag, sem total', () => {
    const bundle = buildExportBundle(syntheticExport(), options);
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('collection');
    expect(bundle.identifier).toEqual({
      system: EXPORT_IDENTIFIER_SYSTEM,
      value: options.exportId,
    });
    expect(bundle.timestamp).toBe(options.timestamp);
    expect(bundle.meta?.tag).toEqual([EXPORT_BUNDLE_TAG]);
    expect('total' in bundle).toBe(false);
    expect(bundle.entry.filter((e) => e.resource.resourceType === 'Patient')).toHaveLength(1);
    expect(
      bundle.entry.every(
        (e) => e.fullUrl === entryFullUrl(e.resource as Addressable<FHIRResource>),
      ),
    ).toBe(true);
    expect(bundle.entry.some((e) => e.resource.resourceType === 'Bundle')).toBe(false);
  });

  it('todo recurso do prontuário sintético passa no validador estrutural', () => {
    for (const resource of syntheticExport()) {
      expect(validateFHIRResource(resource), resource.id).toEqual([]);
    }
  });

  it('toda referência do prontuário sintético resolve dentro do Bundle', () => {
    const bundle = buildExportBundle(syntheticExport(), options);
    expect(validateBundleReferences(bundle)).toEqual([]);
  });

  it('o id do biomarcador com sublinhado sai válido e o laudo aponta para ele', () => {
    const bundle = buildExportBundle(syntheticExport(), options);
    const ids = bundle.entry.map((e) => e.resource.id);
    expect(ids).toContain('rep-1-LDL-Peak-Size');
    expect(ids).not.toContain('rep-1-LDL_Peak_Size');
    const report = bundle.entry.find((e) => e.resource.id === 'rep-1')?.resource;
    expect(
      report?.resourceType === 'DiagnosticReport' && report.result?.map((r) => r.reference),
    ).toEqual(['Observation/rep-1-Glucose', 'Observation/rep-1-LDL-Peak-Size']);
  });
});

describe('createExportBundleWriter', () => {
  it.each([0, 1, 3])(
    'a concatenação com %i entrada(s) é o mesmo JSON de buildExportBundle',
    (count) => {
      const resources = syntheticExport().slice(0, count);
      const writer = createExportBundleWriter(options);
      let text = writer.open();
      for (const resource of resources) text += writer.entry(resource);
      text += writer.close();
      expect(writer.count).toBe(count);
      expect(JSON.parse(text)).toEqual(buildExportBundle(resources, options));
      expect(text).toBe(JSON.stringify(buildExportBundle(resources, options)));
    },
  );

  it('recusa uso fora de ordem', () => {
    const resource = syntheticExport()[0]!;
    const writer = createExportBundleWriter(options);
    expect(() => writer.entry(resource)).toThrow(/fora de open/);
    expect(() => writer.close()).toThrow(/antes de open/);
    writer.open();
    expect(() => writer.open()).toThrow(/duas vezes/);
    writer.close();
    expect(() => writer.close()).toThrow(/duas vezes/);
    expect(() => writer.entry(resource)).toThrow(/fora de open/);
  });
});

describe('validateBundleReferences', () => {
  const patient = userProfileToFHIR({ name: 'Maria', userId: patientId });

  it('aponta referência que não resolve, id inválido e fullUrl que não bate', () => {
    const orphan = consentToFHIR(
      { consentId: 'c-9', grantedAt: '2026-01-01T00:00:00Z', kind: 'lgpd' },
      'outra-pessoa',
    );
    const badId = { ...patient, id: 'tem_sublinhado' } as Addressable<FHIRResource>;
    const bundle: FHIRBundle = {
      entry: [
        toBundleEntry(patient),
        toBundleEntry(orphan),
        { fullUrl: 'https://x/Patient/errado', resource: badId },
        { resource: { ...patient, id: 'sem-fullurl' } },
      ],
      resourceType: 'Bundle',
      type: 'collection',
    };
    const errors = validateBundleReferences(bundle);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('reference "Patient/outra-pessoa" does not resolve'),
        expect.stringContaining('id "tem_sublinhado" is not a valid FHIR id'),
        expect.stringContaining('does not end in Patient/tem_sublinhado'),
        expect.stringContaining('entry[3] (Patient): missing fullUrl'),
      ]),
    );
  });

  it('recurso sem id é apontado; referências absolutas ficam de fora', () => {
    const noId = { ...patient } as Partial<typeof patient>;
    delete noId.id;
    const bundle: FHIRBundle = {
      entry: [
        { fullUrl: 'https://x/Patient/1', resource: noId as FHIRResource },
        toBundleEntry({
          ...communicationToFHIR(
            {
              channel: 'support',
              conversationId: 'c',
              messageId: 'm',
              sender: 'system',
              sentAt: '2026-01-01T00:00:00Z',
            },
            patientId,
          ),
          subject: { reference: 'urn:uuid:3f2a1b2c-0000-4000-8000-000000000001' },
          recipient: [{ reference: 'https://outro.servidor/Patient/9' }],
        }),
        toBundleEntry(patient),
      ],
      resourceType: 'Bundle',
      type: 'collection',
    };
    const errors = validateBundleReferences(bundle);
    expect(errors).toEqual(['entry[0] (Patient): missing id']);
  });
});
