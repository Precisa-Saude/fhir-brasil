import { describe, expect, it } from 'vitest';

import { findBiomarkersInText, getMatchedCodes } from '../anchor';

describe('findBiomarkersInText', () => {
  it('should find exact English biomarker names', () => {
    const ocrText = 'HDL Cholesterol 55 mg/dL';
    const result = findBiomarkersInText(ocrText);
    expect(result.matches.some((m) => m.code === 'HDL')).toBe(true);
    expect(result.stats.matchedCount).toBeGreaterThan(0);
  });

  it('should find exact Portuguese biomarker names', () => {
    const result = findBiomarkersInText('Hemoglobina 13.2 g/dL');
    expect(result.matches.some((m) => m.code === 'Hgb')).toBe(true);
  });

  it('should find biomarkers with Portuguese diacritics', () => {
    const result = findBiomarkersInText('Colesterol Total 180 mg/dL\nTriglicerídeos 150 mg/dL');
    expect(result.matches.some((m) => m.code === 'Cholesterol')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Triglycerides')).toBe(true);
  });

  it('should handle case insensitivity', () => {
    const result = findBiomarkersInText('GLICOSE 95 mg/dL');
    expect(result.matches.some((m) => m.code === 'Glucose')).toBe(true);
  });

  it('should NOT match biomarkers not in text', () => {
    const result = findBiomarkersInText('Hemoglobina 13.2 g/dL');
    expect(result.matches.some((m) => m.code === 'HDL')).toBe(false);
    expect(result.matches.some((m) => m.code === 'LDL')).toBe(false);
  });

  it('should find multiple biomarkers in a typical lab report', () => {
    const ocrText = `
      RESULTADO DE EXAMES
      Hemoglobina: 14.2 g/dL
      Hematócrito: 42%
      Glicose: 95 mg/dL
      Creatinina: 0.9 mg/dL
      TSH: 2.45 mUI/L
    `;
    const result = findBiomarkersInText(ocrText);
    expect(result.matches.some((m) => m.code === 'Hgb')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Hct')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Glucose')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Creatinine')).toBe(true);
    expect(result.matches.some((m) => m.code === 'TSH')).toBe(true);
    expect(result.stats.matchedCount).toBeGreaterThanOrEqual(5);
  });

  it('should find common abbreviations', () => {
    const result = findBiomarkersInText('HDL 55\nLDL 120\nTSH 2.5\nPCR 0.5');
    expect(result.matches.some((m) => m.code === 'HDL')).toBe(true);
    expect(result.matches.some((m) => m.code === 'LDL')).toBe(true);
    expect(result.matches.some((m) => m.code === 'TSH')).toBe(true);
    expect(result.matches.some((m) => m.code === 'CRP')).toBe(true);
  });

  it('should return empty matches for non-medical text', () => {
    const result = findBiomarkersInText(
      'This is a resume for John Doe. Skills: Python, JavaScript.',
    );
    expect(result.matches.length).toBe(0);
  });

  it('should generate filtered reference only for matched biomarkers', () => {
    const result = findBiomarkersInText('Hemoglobina 14.2 g/dL\nGlicose 95 mg/dL');
    expect(result.filteredReference).toContain('Hgb');
    expect(result.filteredReference).toContain('Glucose');
    expect(result.filteredReference).not.toContain('Cholesterol');
  });

  it('should return NO MATCHING message when no biomarkers found', () => {
    const result = findBiomarkersInText('This document contains no biomarkers');
    expect(result.filteredReference).toContain('NO MATCHING BIOMARKERS');
  });

  it('should not duplicate biomarkers when multiple aliases match', () => {
    const result = findBiomarkersInText('HDL Cholesterol HDL-Colesterol');
    const hdlMatches = result.matches.filter((m) => m.code === 'HDL');
    expect(hdlMatches.length).toBe(1);
  });

  it('should handle OCR text with extra whitespace', () => {
    const result = findBiomarkersInText('Hemoglobina      14.2      g/dL');
    expect(result.matches.some((m) => m.code === 'Hgb')).toBe(true);
  });

  it('should include position of match in result', () => {
    const result = findBiomarkersInText('Hemoglobina 14.2 g/dL');
    const match = result.matches.find((m) => m.code === 'Hgb');
    expect(match?.position).toBeGreaterThanOrEqual(0);
  });
});

describe('getMatchedCodes', () => {
  it('should return array of matched biomarker codes', () => {
    const result = findBiomarkersInText('Hemoglobina 14.2\nGlicose 95');
    const codes = getMatchedCodes(result);
    expect(codes).toContain('Hgb');
    expect(codes).toContain('Glucose');
    expect(codes.length).toBe(result.matches.length);
  });
});
