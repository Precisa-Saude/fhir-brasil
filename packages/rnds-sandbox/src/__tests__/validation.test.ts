import { describe, expect, it } from 'vitest';

import {
  validateBRDiagnosticReport,
  validateBRLabObservation,
  validateBRPatient,
  validateBundle,
  validateResource,
} from '../validation';

const PATIENT_REF = 'Patient/700000000000001';

const validPatient = {
  birthDate: '1983-08-12',
  gender: 'female',
  identifier: [
    { system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf', value: '12345678901' },
    { system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns', value: '700000000000001' },
  ],
  name: [{ family: 'Silva', given: ['Joana'] }],
  resourceType: 'Patient',
};

const validLabObservation = {
  category: [
    {
      coding: [
        {
          code: 'laboratory',
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        },
      ],
    },
  ],
  code: { coding: [{ code: '2345-7', display: 'Glicose', system: 'http://loinc.org' }] },
  effectiveDateTime: '2025-09-10',
  resourceType: 'Observation',
  status: 'final',
  subject: { reference: PATIENT_REF },
  valueQuantity: {
    code: 'mg/dL',
    system: 'http://unitsofmeasure.org',
    unit: 'mg/dL',
    value: 96,
  },
};

const validDiagnosticReport = {
  category: [
    { coding: [{ code: 'LAB', system: 'http://terminology.hl7.org/CodeSystem/v2-0074' }] },
  ],
  code: { coding: [{ code: '24323-8', system: 'http://loinc.org' }] },
  effectiveDateTime: '2025-09-10',
  performer: [{ reference: 'Practitioner/700000000000010' }],
  result: [{ reference: 'Observation/abc' }],
  resourceType: 'DiagnosticReport',
  status: 'final',
  subject: { reference: PATIENT_REF },
};

describe('validateBRPatient', () => {
  it('aceita Patient completo', () => {
    expect(validateBRPatient(validPatient, 'r')).toEqual([]);
  });

  it('rejeita sem identifier', () => {
    const issues = validateBRPatient({ ...validPatient, identifier: undefined }, 'r');
    expect(issues.some((i) => i.code === 'required')).toBe(true);
  });

  it('rejeita sem identificador brasileiro (CPF/CNS)', () => {
    const issues = validateBRPatient(
      {
        ...validPatient,
        identifier: [{ system: 'http://outra.url/passport', value: 'X1' }],
      },
      'r',
    );
    expect(issues.some((i) => i.code === 'invariant')).toBe(true);
  });

  it('rejeita sem name/birthDate/gender', () => {
    const issues = validateBRPatient(
      { ...validPatient, birthDate: undefined, gender: undefined, name: undefined },
      'r',
    );
    const codes = issues.map((i) => i.code);
    expect(codes.filter((c) => c === 'required').length).toBeGreaterThanOrEqual(3);
  });

  it('rejeita gender com valor inválido', () => {
    const issues = validateBRPatient({ ...validPatient, gender: 'X' }, 'r');
    expect(issues.some((i) => i.code === 'invalid')).toBe(true);
  });
});

describe('validateBRLabObservation', () => {
  it('aceita Observation completo', () => {
    expect(validateBRLabObservation(validLabObservation, 'r')).toEqual([]);
  });

  it('rejeita sem coding LOINC', () => {
    const obs = {
      ...validLabObservation,
      code: { coding: [{ code: 'X', system: 'http://outra.url' }] },
    };
    expect(validateBRLabObservation(obs, 'r').some((i) => i.code === 'required')).toBe(true);
  });

  it('rejeita sem categoria laboratory', () => {
    const obs = { ...validLabObservation, category: [{ coding: [{ code: 'survey' }] }] };
    expect(validateBRLabObservation(obs, 'r').some((i) => i.code === 'invalid')).toBe(true);
  });

  it('rejeita valueQuantity com system não-UCUM', () => {
    const obs = {
      ...validLabObservation,
      valueQuantity: { ...validLabObservation.valueQuantity, system: 'http://outro.com' },
    };
    expect(
      validateBRLabObservation(obs, 'r').some(
        (i) => i.code === 'invalid' && i.expression?.[0]?.includes('valueQuantity.system'),
      ),
    ).toBe(true);
  });

  it('rejeita valueQuantity sem system (1..1 do FSH)', () => {
    const { system: _, ...vqSemSystem } = validLabObservation.valueQuantity;
    const obs = { ...validLabObservation, valueQuantity: vqSemSystem };
    expect(
      validateBRLabObservation(obs, 'r').some(
        (i) => i.code === 'required' && i.expression?.[0]?.includes('valueQuantity.system'),
      ),
    ).toBe(true);
  });

  it('rejeita status fora do value set', () => {
    const obs = { ...validLabObservation, status: 'preliminary' };
    expect(validateBRLabObservation(obs, 'r').some((i) => i.code === 'invalid')).toBe(true);
  });

  it('rejeita sem subject', () => {
    const obs = { ...validLabObservation, subject: undefined };
    expect(validateBRLabObservation(obs, 'r').some((i) => i.code === 'required')).toBe(true);
  });
});

describe('validateBRDiagnosticReport', () => {
  it('aceita DiagnosticReport completo', () => {
    expect(validateBRDiagnosticReport(validDiagnosticReport, 'r')).toEqual([]);
  });

  it('rejeita sem result/performer', () => {
    const dr = { ...validDiagnosticReport, performer: [], result: [] };
    const issues = validateBRDiagnosticReport(dr, 'r');
    expect(issues.filter((i) => i.code === 'required').length).toBeGreaterThanOrEqual(2);
  });

  it('rejeita categoria sem v2-0074 LAB', () => {
    const dr = { ...validDiagnosticReport, category: [{ coding: [{ code: 'OTHER' }] }] };
    expect(validateBRDiagnosticReport(dr, 'r').some((i) => i.code === 'invalid')).toBe(true);
  });
});

describe('validateBundle', () => {
  it('passa com Bundle válido', () => {
    const bundle = {
      entry: [{ resource: validPatient }, { resource: validLabObservation }],
      resourceType: 'Bundle',
      type: 'transaction',
    };
    const result = validateBundle(bundle);
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('reúne issues de múltiplos entries', () => {
    const bundle = {
      entry: [
        { resource: { ...validPatient, gender: undefined } },
        { resource: { ...validLabObservation, status: 'preliminary' } },
      ],
      resourceType: 'Bundle',
      type: 'transaction',
    };
    const result = validateBundle(bundle);
    expect(result.valid).toBe(false);
    // Deve incluir issue para Patient.gender e Observation.status
    expect(
      result.issues.some((i) => i.expression?.[0]?.includes('Bundle.entry[0].resource.gender')),
    ).toBe(true);
    expect(
      result.issues.some((i) => i.expression?.[0]?.includes('Bundle.entry[1].resource.status')),
    ).toBe(true);
  });

  it('respeita meta.profile quando declarado', () => {
    const obsAsPatient = {
      meta: { profile: ['https://fhir-brasil.dev.br/ig/StructureDefinition/br-patient'] },
      resourceType: 'Observation',
    };
    const issues = validateResource(obsAsPatient, 'r');
    // Forçado a validar como BRPatient → reclama da falta de identifier/name/etc.
    expect(issues.some((i) => i.code === 'required')).toBe(true);
  });

  it('ignora resourceTypes fora do escopo do IG', () => {
    const bundle = {
      entry: [{ resource: { resourceType: 'Encounter', status: 'finished' } }],
      resourceType: 'Bundle',
      type: 'transaction',
    };
    expect(validateBundle(bundle).valid).toBe(true);
  });

  it('NÃO aplica BRLabObservation a Observation não-laboratorial (regression)', () => {
    // Observation de vital-signs (sem category laboratory) — não deve ser
    // forçada ao perfil de exame de laboratório só porque é Observation.
    const vitalSigns = {
      category: [
        {
          coding: [
            {
              code: 'vital-signs',
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            },
          ],
        },
      ],
      code: { coding: [{ code: '85354-9', system: 'http://loinc.org' }] },
      resourceType: 'Observation',
      // sem subject, sem effectiveDateTime, sem valueQuantity — passaria por
      // BRLabObservation, mas como NÃO é laboratory, deve passar.
    };
    const issues = validateResource(vitalSigns, 'r');
    expect(issues).toEqual([]);
  });

  it('aplica BRLabObservation quando category contém laboratory', () => {
    const labObs = {
      category: [
        {
          coding: [
            {
              code: 'laboratory',
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            },
          ],
        },
      ],
      resourceType: 'Observation',
      // sem code/value/subject/effective — deve falhar porque agora aplica
      // BRLabObservation
    };
    expect(validateResource(labObs, 'r').length).toBeGreaterThan(0);
  });
});
