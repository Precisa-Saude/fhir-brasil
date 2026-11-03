import { describe, expect, it } from 'vitest';

import { FHIR_BRASIL_LOCAL_CODE_SYSTEM, LOINC_SYSTEM } from '../code-systems';
import {
  EXPORT_LOINC_ANSWERS,
  EXPORT_LOINC_CODES,
  exportLoincAnswerCoding,
  exportLoincCoding,
  type ExportLoincUse,
  LOCAL_CODES,
  localCoding,
  requireExportLoinc,
} from '../export-codes';
import { getLoincEntry } from '../loinc-axes';

describe('EXPORT_LOINC_CODES', () => {
  it('todo código do registro tem entrada no snapshot verificado', () => {
    const semEntrada = Object.entries(EXPORT_LOINC_CODES)
      .filter(([, code]) => !getLoincEntry(code))
      .map(([use, code]) => `${use}=${code}`);
    expect(semEntrada).toEqual([]);
  });

  it('o coding sai com o display do snapshot sob http://loinc.org', () => {
    const coding = exportLoincCoding('bodyHeight');
    expect(coding).toEqual({ code: '8302-2', display: 'Body height', system: LOINC_SYSTEM });
  });

  it('requireExportLoinc embrulha o coding num CodeableConcept', () => {
    expect(requireExportLoinc('sleepDuration')).toEqual({
      coding: [{ code: '93832-4', display: 'Sleep duration', system: LOINC_SYSTEM }],
    });
  });

  it('um uso fora do snapshot é erro de programação, não coding vazio', () => {
    const fake = { ...EXPORT_LOINC_CODES } as Record<string, string>;
    fake.bogus = '99999-9';
    expect(exportLoincCoding('bogus' as ExportLoincUse)).toBeUndefined();
    expect(() => requireExportLoinc('bogus' as ExportLoincUse)).toThrow(/não está no snapshot/);
  });

  it('nenhum código do registro repete outro', () => {
    const codes = Object.values(EXPORT_LOINC_CODES);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('EXPORT_LOINC_ANSWERS', () => {
  it('toda resposta é um código LA com display', () => {
    for (const { code, display } of Object.values(EXPORT_LOINC_ANSWERS)) {
      expect(code).toMatch(/^LA\d+-\d$/);
      expect(display.length).toBeGreaterThan(0);
    }
  });

  it('o coding de resposta sai sob http://loinc.org', () => {
    expect(exportLoincAnswerCoding('allelicHomozygous')).toEqual({
      code: 'LA6705-3',
      display: 'Homozygous',
      system: LOINC_SYSTEM,
    });
  });
});

describe('LOCAL_CODES', () => {
  it('códigos em kebab-case, únicos, com display em português', () => {
    const codes = Object.values(LOCAL_CODES).map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const { code, display } of Object.values(LOCAL_CODES)) {
      expect(code).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(display.length).toBeGreaterThan(0);
    }
  });

  it('o coding local sai sob o sistema local do fhir-brasil', () => {
    expect(localCoding('phenoAge')).toEqual({
      code: 'phenoage',
      display: 'Idade fenotípica (PhenoAge)',
      system: FHIR_BRASIL_LOCAL_CODE_SYSTEM,
    });
  });
});
