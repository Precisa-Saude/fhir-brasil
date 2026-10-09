import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS } from '../biomarkers';
import { labReportToFHIR, labResultToFHIRBundle } from '../converter';
import {
  diagnosticSectionOf,
  diagnosticSectionsOfReport,
  isUrinalysisCode,
  sectionOfLoincClass,
  V2_0074_SYSTEM,
} from '../diagnostic-sections';
import type { LabReportData } from '../types';

describe('seção de serviço de cada exame', () => {
  it('todo exame do catálogo tem seção', () => {
    expect(BIOMARKER_DEFINITIONS.filter((d) => !diagnosticSectionOf(d.code))).toEqual([]);
  });

  it.each([
    ['Glucose', 'CH'],
    ['HDL', 'CH'],
    ['WBC', 'HM'],
    ['INR', 'HM'],
    ['Urobilinogen_Urine', 'URN'],
    ['Zinc', 'TX'],
    ['CAC', 'CT'],
    ['BMD_Total', 'RAD'],
    ['VisceralFatLevel', 'OTH'],
  ])('%s → %s', (code, section) => {
    expect(diagnosticSectionOf(code)).toBe(section);
  });

  it('a seção declarada vence a classe do LOINC: cetonas saem na urinálise', () => {
    expect(isUrinalysisCode('Ketones_Urine')).toBe(true);
  });

  it('característica da amostra vai para a urinálise só na urina', () => {
    expect(sectionOfLoincClass('SPEC', 'Urine')).toBe('URN');
    expect(sectionOfLoincClass('SPEC', 'Ser/Plas')).toBe('LAB');
    expect(sectionOfLoincClass('BDYWGT.ATOM', null)).toBe('OTH');
    expect(sectionOfLoincClass('CLASSE-NOVA', null)).toBeUndefined();
  });
});

describe('DiagnosticReport.category', () => {
  it('laudo de laboratório leva LAB e as seções em ordem', () => {
    expect(diagnosticSectionsOfReport(['WBC', 'Glucose', 'Glucose', 'Urobilinogen_Urine'])).toEqual(
      ['LAB', 'CH', 'HM', 'URN'],
    );
  });

  it('densitometria fica sem LAB', () => {
    expect(diagnosticSectionsOfReport(['BMD_Total', 'VisceralFatLevel'])).toEqual(['OTH', 'RAD']);
  });

  const report: LabReportData = {
    collectionDate: '2026-10-01',
    createdAt: '2026-10-01T10:00:00Z',
    overallStatus: 'NORMAL',
    processingStatus: 'complete',
    reportId: 'r1',
    userId: 'u1',
  };

  it('sem os códigos das observações, fica só LAB, como antes', () => {
    const diagnostic = labReportToFHIR(report, 'u1', ['o1']);
    expect(diagnostic.category).toEqual([
      { coding: [{ code: 'LAB', display: 'Laboratory', system: V2_0074_SYSTEM }] },
    ]);
  });

  it('o Bundle passa as observações e o laudo sai com as seções', () => {
    const bundle = labResultToFHIRBundle(
      report,
      [
        {
          biomarkerCode: 'Glucose',
          biomarkerName: 'Glicose',
          flag: '',
          reportId: 'r1',
          unit: 'mg/dL',
          value: 90,
        },
        {
          biomarkerCode: 'WBC',
          biomarkerName: 'Leucócitos',
          flag: '',
          reportId: 'r1',
          unit: 'K/uL',
          value: 6,
        },
      ],
      { birthDate: '1985-03-20', gender: 'female', name: 'Paciente Sintético', userId: 'u1' },
    );
    const diagnostic = bundle.entry?.find((e) => e.resource.resourceType === 'DiagnosticReport')
      ?.resource as { category: { coding: { code: string }[] }[] };
    expect(diagnostic.category.map((c) => c.coding[0]?.code)).toEqual(['LAB', 'CH', 'HM']);
  });
});
