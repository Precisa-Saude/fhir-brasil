import { describe, expect, it } from 'vitest';

import type { FHIRDiagnosticReport, FHIRObservation } from '../fhir-types';
import {
  validateFHIRDiagnosticReport,
  validateFHIRImportBundle,
  validateFHIRObservation,
} from '../validators';

/**
 * Dedicated validators test file to cover branches not exercised by
 * converter.test.ts and importer.test.ts.
 */

describe('validateFHIRObservation', () => {
  const validObs: FHIRObservation = {
    code: { coding: [{ code: '123' }] },
    resourceType: 'Observation',
    status: 'final',
    subject: { reference: 'Patient/1' },
    valueQuantity: { unit: 'mg/dL', value: 100 },
  };

  it('returns no errors for valid observation', () => {
    expect(validateFHIRObservation(validObs)).toEqual([]);
  });

  it('detects missing status', () => {
    const obs = { ...validObs, status: '' } as unknown as FHIRObservation;
    const errors = validateFHIRObservation(obs);
    expect(errors).toContain('Missing status');
  });

  it('detects missing code', () => {
    const obs = { ...validObs, code: undefined } as unknown as FHIRObservation;
    const errors = validateFHIRObservation(obs);
    expect(errors).toContain('Missing or invalid code');
  });

  it('detects empty code coding array', () => {
    const obs = { ...validObs, code: { coding: [] } } as unknown as FHIRObservation;
    const errors = validateFHIRObservation(obs);
    expect(errors).toContain('Missing or invalid code');
  });

  it('detects missing code.coding property', () => {
    const obs = { ...validObs, code: {} } as unknown as FHIRObservation;
    const errors = validateFHIRObservation(obs);
    expect(errors).toContain('Missing or invalid code');
  });

  it('detects missing subject', () => {
    const obs = { ...validObs, subject: undefined } as unknown as FHIRObservation;
    const errors = validateFHIRObservation(obs);
    expect(errors).toContain('Missing subject reference');
  });

  it('detects missing subject reference', () => {
    const obs = { ...validObs, subject: {} } as unknown as FHIRObservation;
    const errors = validateFHIRObservation(obs);
    expect(errors).toContain('Missing subject reference');
  });

  it('detects multiple errors at once', () => {
    const obs = {
      resourceType: 'Wrong',
      // missing status, code, subject, value
    } as unknown as FHIRObservation;
    const errors = validateFHIRObservation(obs);
    expect(errors).toContain('Invalid resourceType');
    expect(errors).toContain('Missing status');
    expect(errors).toContain('Missing or invalid code');
    expect(errors).toContain('Missing subject reference');
    expect(errors).toContain('Missing value (valueQuantity or valueString)');
    expect(errors).toHaveLength(5);
  });
});

describe('validateFHIRDiagnosticReport', () => {
  const validReport: FHIRDiagnosticReport = {
    code: { coding: [{ code: 'panel' }] },
    resourceType: 'DiagnosticReport',
    result: [],
    status: 'final',
    subject: { reference: 'Patient/1' },
  };

  it('returns no errors for valid report', () => {
    expect(validateFHIRDiagnosticReport(validReport)).toEqual([]);
  });

  it('detects invalid resourceType', () => {
    const report = { ...validReport, resourceType: 'Wrong' } as unknown as FHIRDiagnosticReport;
    const errors = validateFHIRDiagnosticReport(report);
    expect(errors).toContain('Invalid resourceType');
  });

  it('detects missing status', () => {
    const report = { ...validReport, status: '' } as unknown as FHIRDiagnosticReport;
    const errors = validateFHIRDiagnosticReport(report);
    expect(errors).toContain('Missing status');
  });

  it('detects missing code', () => {
    const report = { ...validReport, code: undefined } as unknown as FHIRDiagnosticReport;
    const errors = validateFHIRDiagnosticReport(report);
    expect(errors).toContain('Missing or invalid code');
  });

  it('detects missing subject', () => {
    const report = { ...validReport, subject: undefined } as unknown as FHIRDiagnosticReport;
    const errors = validateFHIRDiagnosticReport(report);
    expect(errors).toContain('Missing subject reference');
  });
});

describe('validateFHIRImportBundle', () => {
  it('returns no errors for valid bundle', () => {
    const bundle = {
      entry: [{ resource: {} }],
      resourceType: 'Bundle',
    };
    expect(validateFHIRImportBundle(bundle)).toEqual([]);
  });

  it('rejects null input', () => {
    const errors = validateFHIRImportBundle(null);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe('root');
  });

  it('rejects non-object input', () => {
    const errors = validateFHIRImportBundle('string');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.field).toBe('root');
  });

  it('rejects wrong resourceType', () => {
    const errors = validateFHIRImportBundle({ entry: [{}], resourceType: 'Patient' });
    expect(errors.some((e) => e.field === 'resourceType')).toBe(true);
  });

  it('rejects missing entry array', () => {
    const errors = validateFHIRImportBundle({ resourceType: 'Bundle' });
    expect(errors.some((e) => e.field === 'entry')).toBe(true);
  });

  it('rejects empty entry array', () => {
    const errors = validateFHIRImportBundle({ entry: [], resourceType: 'Bundle' });
    expect(errors.some((e) => e.field === 'entry')).toBe(true);
  });
});

describe('validateFHIRObservation: código UCUM', () => {
  const base: FHIRObservation = {
    code: { coding: [{ code: '3016-3', system: 'http://loinc.org' }] },
    resourceType: 'Observation',
    status: 'final',
    subject: { reference: 'Patient/1' },
  };
  const ucum = 'http://unitsofmeasure.org';

  it('aceita código UCUM sob o system do UCUM', () => {
    const obs = {
      ...base,
      valueQuantity: { code: 'u[IU]/mL', system: ucum, unit: 'uIU/mL', value: 2 },
    };
    expect(validateFHIRObservation(obs)).toEqual([]);
  });

  it('aceita unidade só em texto, sem system', () => {
    const obs = { ...base, valueQuantity: { unit: 'x10^3/mm3', value: 7 } };
    expect(validateFHIRObservation(obs)).toEqual([]);
  });

  it('recusa grafia do laudo publicada como UCUM', () => {
    // Era o que o conversor emitia até out/2026 para TSH.
    const obs = {
      ...base,
      valueQuantity: { code: 'uIU/mL', system: ucum, unit: 'uIU/mL', value: 2 },
    };
    expect(validateFHIRObservation(obs)).toEqual(['valueQuantity: "uIU/mL" is not a UCUM code']);
  });

  it('recusa system do UCUM sem código', () => {
    const obs = { ...base, valueQuantity: { system: ucum, unit: 'mg/dL', value: 2 } };
    expect(validateFHIRObservation(obs)).toEqual([
      'valueQuantity: UCUM system declared without a code',
    ]);
  });

  it('confere também os limites da faixa de referência', () => {
    const obs = {
      ...base,
      referenceRange: [
        {
          high: { code: 'razão', system: ucum, unit: 'razão', value: 20 },
          low: { code: '{ratio}', system: ucum, unit: 'razão', value: 10 },
        },
      ],
      valueQuantity: { code: '{ratio}', system: ucum, unit: 'razão', value: 15 },
    };
    expect(validateFHIRObservation(obs)).toEqual([
      'referenceRange[0].high: "razão" is not a UCUM code',
    ]);
  });
});
