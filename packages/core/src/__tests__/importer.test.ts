import { describe, expect, it } from 'vitest';

import type { FHIRBundle, FHIRObservation } from '../fhir-types';
import {
  extractObservationsFromBundle,
  mapFHIRObservationToInternal,
  MAX_FILE_SIZE,
  MAX_OBSERVATIONS,
  processImportBundle,
} from '../importer';
import { validateFHIRImportBundle } from '../validators';

const validObservation: FHIRObservation = {
  code: {
    coding: [
      {
        code: '2345-7',
        display: 'Glucose',
        system: 'http://loinc.org',
      },
    ],
    text: 'Glucose',
  },
  effectiveDateTime: '2024-06-15T08:00:00.000Z',
  interpretation: [
    {
      coding: [
        {
          code: 'N',
          display: 'Normal',
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
        },
      ],
    },
  ],
  referenceRange: [
    {
      high: { unit: 'mg/dL', value: 100 },
      low: { unit: 'mg/dL', value: 70 },
    },
  ],
  resourceType: 'Observation',
  status: 'final',
  subject: { reference: 'Patient/user-123' },
  valueQuantity: {
    code: 'mg/dL',
    system: 'http://unitsofmeasure.org',
    unit: 'mg/dL',
    value: 85,
  },
};

const validBundle: FHIRBundle = {
  entry: [
    {
      fullUrl: 'urn:uuid:patient-1',
      resource: { id: 'user-123', name: [{ text: 'Test User' }], resourceType: 'Patient' },
    },
    { fullUrl: 'urn:uuid:obs-1', resource: validObservation },
  ],
  resourceType: 'Bundle',
  type: 'collection',
};

describe('validateFHIRImportBundle', () => {
  it('should accept a valid Bundle', () => {
    const errors = validateFHIRImportBundle(validBundle);
    expect(errors).toEqual([]);
  });

  it('should reject null input', () => {
    const errors = validateFHIRImportBundle(null);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('root');
  });

  it('should reject non-Bundle resourceType', () => {
    const errors = validateFHIRImportBundle({ entry: [], resourceType: 'Patient' });
    expect(errors.some((e) => e.field === 'resourceType')).toBe(true);
  });

  it('should reject missing entry array', () => {
    const errors = validateFHIRImportBundle({ resourceType: 'Bundle' });
    expect(errors.some((e) => e.field === 'entry')).toBe(true);
  });

  it('should reject empty entry array', () => {
    const errors = validateFHIRImportBundle({ entry: [], resourceType: 'Bundle' });
    expect(errors.some((e) => e.field === 'entry')).toBe(true);
  });
});

describe('extractObservationsFromBundle', () => {
  it('should extract Observation resources', () => {
    const { observations, skipped } = extractObservationsFromBundle(validBundle);
    expect(observations).toHaveLength(1);
    expect(observations[0].resourceType).toBe('Observation');
    expect(skipped).toHaveLength(0);
  });

  it('should skip non-Observation resources silently', () => {
    const bundle: FHIRBundle = {
      entry: [
        {
          resource: { id: 'user-1', resourceType: 'Patient' },
        },
        { resource: validObservation },
      ],
      resourceType: 'Bundle',
      type: 'collection',
    };

    const { observations } = extractObservationsFromBundle(bundle);
    expect(observations).toHaveLength(1);
  });

  it('should skip entries with no resource', () => {
    const bundle: FHIRBundle = {
      entry: [
        { resource: undefined as unknown as FHIRObservation },
        { resource: validObservation },
      ],
      resourceType: 'Bundle',
      type: 'collection',
    };

    const { observations, skipped } = extractObservationsFromBundle(bundle);
    expect(observations).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toContain('no resource');
  });
});

describe('mapFHIRObservationToInternal', () => {
  it('should map observation with known LOINC code', () => {
    const result = mapFHIRObservationToInternal(validObservation, 0);
    expect('observation' in result).toBe(true);
    if ('observation' in result) {
      expect(result.observation.biomarkerCode).toBe('Glucose');
      expect(result.observation.value).toBe(85);
      expect(result.observation.unit).toBe('mg/dL');
      expect(result.observation.loincCode).toBe('2345-7');
      expect(result.observation.collectionDate).toBe('2024-06-15T08:00:00.000Z');
      expect(result.observation.flag).toBe('');
      expect(result.observation.isQualitative).toBe(false);
    }
  });

  it('should extract reference ranges', () => {
    const result = mapFHIRObservationToInternal(validObservation, 0);
    expect('observation' in result).toBe(true);
    if ('observation' in result) {
      expect(result.observation.referenceMin).toBe(70);
      expect(result.observation.referenceMax).toBe(100);
    }
  });

  it('should extract high flag', () => {
    const highObs: FHIRObservation = {
      ...validObservation,
      interpretation: [{ coding: [{ code: 'H' }] }],
    };
    const result = mapFHIRObservationToInternal(highObs, 0);
    expect('observation' in result).toBe(true);
    if ('observation' in result) {
      expect(result.observation.flag).toBe('H');
    }
  });

  it('should extract low flag', () => {
    const lowObs: FHIRObservation = {
      ...validObservation,
      interpretation: [{ coding: [{ code: 'L' }] }],
    };
    const result = mapFHIRObservationToInternal(lowObs, 0);
    expect('observation' in result).toBe(true);
    if ('observation' in result) {
      expect(result.observation.flag).toBe('L');
    }
  });

  it('should handle qualitative (string) values', () => {
    const qualObs: FHIRObservation = {
      ...validObservation,
      valueQuantity: undefined,
      valueString: 'Positive',
    };
    const result = mapFHIRObservationToInternal(qualObs, 0);
    expect('observation' in result).toBe(true);
    if ('observation' in result) {
      expect(result.observation.value).toBe('Positive');
      expect(result.observation.isQualitative).toBe(true);
    }
  });

  it('should skip observations without LOINC code', () => {
    const noLoincObs: FHIRObservation = {
      ...validObservation,
      code: { coding: [{ code: 'custom-code', system: 'http://custom.org' }] },
    };
    const result = mapFHIRObservationToInternal(noLoincObs, 0);
    expect('skipped' in result).toBe(true);
    if ('skipped' in result) {
      // O coding existe, só está num system que não tratamos. Dizer "nenhum
      // código encontrado" mandaria procurar o problema no lugar errado.
      expect(result.skipped.reason).toContain('No code in a supported system');
      expect(result.skipped.reason).toContain('http://custom.org');
    }
  });

  it('should skip observations with unknown LOINC code', () => {
    const unknownLoincObs: FHIRObservation = {
      ...validObservation,
      code: { coding: [{ code: '99999-0', system: 'http://loinc.org' }] },
    };
    const result = mapFHIRObservationToInternal(unknownLoincObs, 0);
    expect('skipped' in result).toBe(true);
    if ('skipped' in result) {
      expect(result.skipped.reason).toContain('Unknown code');
    }
  });

  it('should skip observations without value', () => {
    const noValueObs: FHIRObservation = {
      ...validObservation,
      valueQuantity: undefined,
      valueString: undefined,
    };
    const result = mapFHIRObservationToInternal(noValueObs, 0);
    expect('skipped' in result).toBe(true);
  });

  it('should skip observations without effectiveDateTime', () => {
    const noDateObs: FHIRObservation = {
      ...validObservation,
      effectiveDateTime: undefined,
    };
    const result = mapFHIRObservationToInternal(noDateObs, 0);
    expect('skipped' in result).toBe(true);
  });
});

describe('processImportBundle', () => {
  it('should process a valid bundle end-to-end', () => {
    const result = processImportBundle(validBundle);
    expect(result.errors).toHaveLength(0);
    expect(result.imported).toHaveLength(1);
    expect(result.imported[0].biomarkerCode).toBe('Glucose');
    expect(result.totalProcessed).toBe(1);
  });

  it('should return validation errors for invalid input', () => {
    const result = processImportBundle('not json');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.imported).toHaveLength(0);
  });

  it('should handle bundle with mixed known and unknown LOINC codes', () => {
    const bundle: FHIRBundle = {
      entry: [
        { resource: validObservation },
        {
          resource: {
            ...validObservation,
            code: { coding: [{ code: '99999-0', system: 'http://loinc.org' }] },
          },
        },
      ],
      resourceType: 'Bundle',
      type: 'collection',
    };

    const result = processImportBundle(bundle);
    expect(result.imported).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
  });

  it('should handle empty Bundle with only non-Observation resources', () => {
    const bundle: FHIRBundle = {
      entry: [{ resource: { id: 'user-1', resourceType: 'Patient' } }],
      resourceType: 'Bundle',
      type: 'collection',
    };

    const result = processImportBundle(bundle);
    expect(result.imported).toHaveLength(0);
    expect(result.totalProcessed).toBe(0);
  });
});

describe('limites de importação', () => {
  it('expõe limites coerentes entre si', () => {
    // Uma Observation indentada ocupa ~2,75KB. O teto de arquivo precisa caber
    // MAX_OBSERVATIONS nessa forma, senão o limite de tamanho corta antes.
    const worstCaseBytes = MAX_OBSERVATIONS * 2816;

    expect(MAX_OBSERVATIONS).toBe(5000);
    expect(MAX_FILE_SIZE).toBe(15 * 1024 * 1024);
    expect(worstCaseBytes).toBeLessThan(MAX_FILE_SIZE);
  });

  it('para de coletar ao atingir MAX_OBSERVATIONS', () => {
    const entries = Array.from({ length: MAX_OBSERVATIONS + 3 }, () => ({
      resource: { ...validObservation },
    }));

    const result = extractObservationsFromBundle({
      entry: entries,
      resourceType: 'Bundle',
      type: 'collection',
    });

    expect(result.observations).toHaveLength(MAX_OBSERVATIONS);
    expect(result.skipped).toHaveLength(3);
    expect(result.skipped[0]?.reason).toContain(String(MAX_OBSERVATIONS));
  });
});

describe('biomarcadores sem LOINC', () => {
  const bodyCompositionObservation = (biomarkerCode: string, loincCode?: string) => ({
    code: {
      coding: [
        ...(loincCode
          ? [{ code: loincCode, display: 'Gordura visceral', system: 'http://loinc.org' }]
          : []),
        {
          code: biomarkerCode,
          display: 'Massa gorda',
          system: 'http://fhir-brasil.dev/biomarker-codes',
        },
      ],
      text: 'Massa gorda',
    },
    effectiveDateTime: '2024-06-15T08:00:00.000Z',
    resourceType: 'Observation' as const,
    status: 'final' as const,
    subject: { reference: 'Patient/user-1' },
    valueQuantity: { code: 'kg', system: 'http://unitsofmeasure.org', unit: 'kg', value: 22.4 },
  });

  it('importa pelo código interno quando não há coding LOINC', () => {
    const result = mapFHIRObservationToInternal(bodyCompositionObservation('VATMass'), 0);

    expect('observation' in result).toBe(true);
    if (!('observation' in result)) return;
    expect(result.observation.biomarkerCode).toBe('VATMass');
    expect(result.observation.value).toBe(22.4);
    // Sem LOINC publicado, o campo fica ausente em vez de receber valor inventado.
    expect(result.observation.loincCode).toBeUndefined();
  });

  it('importa arquivos antigos que traziam o placeholder 99999-9', () => {
    const result = mapFHIRObservationToInternal(
      bodyCompositionObservation('VATMass', '99999-9'),
      0,
    );

    expect('observation' in result).toBe(true);
    if (!('observation' in result)) return;
    expect(result.observation.biomarkerCode).toBe('VATMass');
    expect(result.observation.loincCode).toBeUndefined();
  });

  it('prefere o LOINC quando ele resolve', () => {
    const result = mapFHIRObservationToInternal(bodyCompositionObservation('VATMass', '2345-7'), 0);

    expect('observation' in result).toBe(true);
    if (!('observation' in result)) return;
    // 2345-7 é glicose: o LOINC ganha do coding interno.
    expect(result.observation.biomarkerCode).toBe('Glucose');
    expect(result.observation.loincCode).toBe('2345-7');
  });

  it('descarta código interno inexistente, citando o que viu', () => {
    const result = mapFHIRObservationToInternal(bodyCompositionObservation('NaoExiste'), 3);

    expect('skipped' in result).toBe(true);
    if (!('skipped' in result)) return;
    expect(result.skipped.reason).toContain('biomarker code NaoExiste');
  });

  it('não aceita o coding interno de outro system', () => {
    const observation = {
      ...bodyCompositionObservation('FatMass'),
      code: {
        coding: [{ code: 'VATMass', display: 'Massa gorda', system: 'http://exemplo.invalido' }],
        text: 'Massa gorda',
      },
    };

    expect('skipped' in mapFHIRObservationToInternal(observation, 0)).toBe(true);
  });
});

describe('motivos de descarte', () => {
  const base = {
    effectiveDateTime: '2024-06-15T08:00:00.000Z',
    resourceType: 'Observation' as const,
    status: 'final' as const,
    subject: { reference: 'Patient/user-1' },
    valueQuantity: { unit: 'mg/dL', value: 5 },
  };

  it('distingue coding ausente de coding em system alheio', () => {
    const semCoding = mapFHIRObservationToInternal({ ...base, code: { coding: [] } }, 0);
    const systemAlheio = mapFHIRObservationToInternal(
      { ...base, code: { coding: [{ code: '365812005', system: 'http://snomed.info/sct' }] } },
      1,
    );

    expect('skipped' in semCoding && semCoding.skipped.reason).toBe(
      'No code found in observation coding',
    );
    expect('skipped' in systemAlheio && systemAlheio.skipped.reason).toContain(
      'http://snomed.info/sct',
    );
  });

  it('cita os dois codings quando nenhum resolve', () => {
    const result = mapFHIRObservationToInternal(
      {
        ...base,
        code: {
          coding: [
            { code: '00000-0', system: 'http://loinc.org' },
            { code: 'NaoExiste', system: 'http://fhir-brasil.dev/biomarker-codes' },
          ],
        },
      },
      0,
    );

    expect('skipped' in result).toBe(true);
    if (!('skipped' in result)) return;
    // Citar só um dos dois faria parecer que o outro nem foi considerado.
    expect(result.skipped.reason).toContain('LOINC 00000-0');
    expect(result.skipped.reason).toContain('biomarker code NaoExiste');
  });
});

describe('alias no coding interno', () => {
  const withDeclaredCode = (code: string) => ({
    code: {
      coding: [{ code, display: 'x', system: 'http://fhir-brasil.dev/biomarker-codes' }],
      text: 'x',
    },
    effectiveDateTime: '2024-06-15T08:00:00.000Z',
    resourceType: 'Observation' as const,
    status: 'final' as const,
    subject: { reference: 'Patient/user-1' },
    valueQuantity: { unit: 'mg/dL', value: 30 },
  });

  it('grava o código canônico, não o alias', () => {
    const result = mapFHIRObservationToInternal(withDeclaredCode('VLDL_Cholesterol'), 0);

    expect('observation' in result).toBe(true);
    if (!('observation' in result)) return;
    expect(result.observation.biomarkerCode).toBe('VLDL');
  });

  it('recupera o LOINC do canônico quando o alias chega sem ele', () => {
    const result = mapFHIRObservationToInternal(withDeclaredCode('VLDL_Cholesterol'), 0);

    expect('observation' in result).toBe(true);
    if (!('observation' in result)) return;
    // `codeToLoinc` é indexado pelo canônico: sem normalizar, viria undefined.
    expect(result.observation.loincCode).toBe('13458-5');
  });

  it('mantém o canônico intacto quando já vem canônico', () => {
    const result = mapFHIRObservationToInternal(withDeclaredCode('VLDL'), 0);

    expect('observation' in result).toBe(true);
    if (!('observation' in result)) return;
    expect(result.observation.biomarkerCode).toBe('VLDL');
    expect(result.observation.loincCode).toBe('13458-5');
  });
});
