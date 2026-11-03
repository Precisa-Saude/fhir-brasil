import { describe, expect, it } from 'vitest';

import { OBSERVATION_CATEGORY_SYSTEM, UCUM_SYSTEM } from '../code-systems';
import {
  FHIR_ID_PATTERN,
  fhirResourceId,
  observationCategory,
  patientReference,
  ucumQuantity,
} from '../export-helpers';

describe('fhirResourceId', () => {
  it('junta as partes com hífen', () => {
    expect(fhirResourceId('report-123', 'Glucose')).toBe('report-123-Glucose');
  });

  it('troca o que a gramática do R4 não aceita por hífen', () => {
    expect(fhirResourceId('report-123', 'LDL_Peak_Size')).toBe('report-123-LDL-Peak-Size');
    expect(fhirResourceId('healthkit', '2026-01-15T00:00:00Z', 'steps')).toMatch(FHIR_ID_PATTERN);
    expect(fhirResourceId('allergy', 'amendoim e castanhas')).toBe('allergy-amendoim-e-castanhas');
  });

  it('ignora partes vazias e recusa ficar sem nenhuma', () => {
    expect(fhirResourceId('consent', '', 'abc')).toBe('consent-abc');
    expect(() => fhirResourceId('', '')).toThrow(/nenhuma parte/);
  });

  it('corta ids longos em 64 caracteres sem colidir', () => {
    const a = fhirResourceId('x'.repeat(70), 'a');
    const b = fhirResourceId('x'.repeat(70), 'b');
    expect(a).toHaveLength(64);
    expect(b).toHaveLength(64);
    expect(a).not.toBe(b);
    expect(a).toMatch(FHIR_ID_PATTERN);
    expect(fhirResourceId('x'.repeat(70), 'a')).toBe(a);
  });
});

describe('peças comuns', () => {
  it('patientReference aponta para Patient/<id>', () => {
    expect(patientReference('user-1')).toEqual({ reference: 'Patient/user-1' });
  });

  it('observationCategory usa o sistema de categorias do HL7', () => {
    expect(observationCategory('vital-signs')).toEqual([
      {
        coding: [
          { code: 'vital-signs', display: 'Vital Signs', system: OBSERVATION_CATEGORY_SYSTEM },
        ],
      },
    ]);
  });

  it('ucumQuantity leva código e texto', () => {
    expect(ucumQuantity(72, 'kg', 'kg')).toEqual({
      code: 'kg',
      system: UCUM_SYSTEM,
      unit: 'kg',
      value: 72,
    });
  });
});
