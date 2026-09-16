import { describe, expect, it } from 'vitest';

import type { ExtractedBiomarker } from '../extraction-schema.js';
import { extractionToLabResult } from '../extraction-to-lab-result.js';

const base: ExtractedBiomarker = {
  confidence: 0.98,
  loinc: '718-7',
  name: 'Hemoglobina',
  sourceText: 'Hemoglobina .......... 14,5 g/dL',
  unit: 'g/dL',
  value: 14.5,
};

describe('extractionToLabResult', () => {
  it('traduz o LOINC para o código interno que o conversor espera', () => {
    const envelope = extractionToLabResult([base]);
    expect(envelope.observations).toHaveLength(1);
    expect(envelope.observations[0]?.biomarkerCode).toBe('Hgb');
    expect(envelope.observations[0]?.value).toBe(14.5);
  });

  it('descarta grandeza cujo LOINC não está no catálogo', () => {
    expect(extractionToLabResult([{ ...base, loinc: '99999-9' }]).observations).toHaveLength(0);
  });

  it('descarta grandeza sem LOINC', () => {
    expect(extractionToLabResult([{ ...base, loinc: null }]).observations).toHaveLength(0);
  });

  it('marca H quando o valor passa da faixa que o laudo trouxe', () => {
    const envelope = extractionToLabResult([
      { ...base, loinc: '2276-4', referenceMax: 150, referenceMin: 12, value: 210 },
    ]);
    expect(envelope.observations[0]?.flag).toBe('H');
    expect(envelope.report.overallStatus).toBe('ANORMAL');
  });

  it('marca L quando o valor fica abaixo da faixa', () => {
    const envelope = extractionToLabResult([
      { ...base, loinc: '2276-4', referenceMax: 150, referenceMin: 12, value: 5 },
    ]);
    expect(envelope.observations[0]?.flag).toBe('L');
  });

  it('não inventa flag quando o laudo não trouxe faixa', () => {
    const envelope = extractionToLabResult([base]);
    expect(envelope.observations[0]?.flag).toBe('');
    expect(envelope.report.overallStatus).toBe('NORMAL');
  });

  it('não marca flag para resultado qualitativo', () => {
    const envelope = extractionToLabResult([{ ...base, referenceMax: 1, value: 'Não Reagente' }]);
    expect(envelope.observations[0]?.flag).toBe('');
  });

  it('usa identidade sintética e deixa trocar por opção', () => {
    const padrao = extractionToLabResult([base]);
    expect(padrao.report.reportId).toBe('laudo-demo');
    expect(padrao.profile.userId).toBe('paciente-demo');

    const proprio = extractionToLabResult([base], {
      collectionDate: '2026-03-15',
      reportId: 'r-1',
      userId: 'u-1',
    });
    expect(proprio.report.collectionDate).toBe('2026-03-15');
    expect(proprio.report.createdAt).toBe('2026-03-15T00:00:00Z');
    expect(proprio.observations[0]?.reportId).toBe('r-1');
  });

  it('gera uma data de coleta em ISO quando nenhuma é passada', () => {
    expect(extractionToLabResult([base]).report.collectionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
