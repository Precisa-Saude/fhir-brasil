import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { labObservationToFHIR } from '../converter';
import type { FHIRBundle } from '../fhir-types';
import { processImportBundle } from '../importer';
import {
  ORDINAL_ANSWERS,
  ordinalAnswerByCode,
  ordinalAnswerFor,
  ordinalValueFor,
  SNOMED_SYSTEM,
} from '../ordinal-answers';
import type { LabObservationData } from '../types';
import { validateFHIRObservation } from '../validators';

const ketones: LabObservationData = {
  biomarkerCode: 'Ketones_Urine',
  biomarkerName: 'Cetonas na Urina',
  collectionDate: '2026-03-15',
  flag: '',
  isQualitative: true,
  reportId: 'report-1',
  unit: '',
  value: 'Negativo',
};

describe('ordinalAnswerFor', () => {
  it.each([
    ['Negativo', 'LA6577-6', '260385009'],
    ['NEGATIVO', 'LA6577-6', '260385009'],
    ['Neg.', 'LA6577-6', '260385009'],
    ['-', 'LA6577-6', '260385009'],
    ['(-)', 'LA6577-6', '260385009'],
    ['Não reagente', 'LA15256-3', '131194007'],
    ['nao  reagente', 'LA15256-3', '131194007'],
    ['Traços', 'LA11832-5', '260405006'],
    ['Traço', 'LA11832-5', '260405006'],
    ['Positivo', 'LA6576-8', '10828004'],
    ['Reagente', 'LA15255-5', '11214006'],
    ['+', 'LA11841-6', '260347006'],
    ['++', 'LA11842-4', '260348001'],
    ['+++', 'LA11843-2', '260349009'],
    ['++++', 'LA11844-0', '260350009'],
    ['(++)', 'LA11842-4', '260348001'],
    ['3+', 'LA11843-2', '260349009'],
    ['Normal', 'LA6626-1', '17621005'],
    ['Ausentes', 'LA9634-2', '2667000'],
    ['Presente', 'LA9633-4', '52101004'],
  ])('"%s" → LOINC %s, SNOMED CT %s', (printed, loinc, snomed) => {
    const answer = ordinalAnswerFor(printed);
    expect(answer?.loinc.code).toBe(loinc);
    expect(answer?.snomed.code).toBe(snomed);
  });

  it('não inventa código para grafia desconhecida', () => {
    expect(ordinalAnswerFor('Raras')).toBeUndefined();
    expect(ordinalAnswerFor('Amarelo citrino')).toBeUndefined();
    expect(ordinalAnswerFor('')).toBeUndefined();
  });

  it('todo código tem a forma do seu sistema e aparece uma vez só', () => {
    const answers = Object.values(ORDINAL_ANSWERS);
    const loinc = answers.map((a) => a.loinc.code);
    const snomed = answers.map((a) => a.snomed.code);
    for (const code of loinc) expect(code).toMatch(/^LA\d+-\d$/);
    for (const code of snomed) expect(code).toMatch(/^\d{6,18}$/);
    expect(new Set(loinc).size).toBe(loinc.length);
    expect(new Set(snomed).size).toBe(snomed.length);
  });
});

describe('BROrdinalResultVS', () => {
  it('tem as mesmas respostas, com o mesmo display, que ORDINAL_ANSWERS', () => {
    const fsh = readFileSync(
      join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'ig',
        'input',
        'fsh',
        'valuesets',
        'BROrdinalResultVS.fsh',
      ),
      'utf8',
    );
    const inVs = [...fsh.matchAll(/^\* \$(LOINC|SNOMED)#(\S+) "([^"]+)"$/gm)]
      .map((m) => `${m[1]} ${m[2]} ${m[3]}`)
      .sort();
    const inCode = Object.values(ORDINAL_ANSWERS)
      .flatMap((a) => [
        `LOINC ${a.loinc.code} ${a.loinc.display}`,
        `SNOMED ${a.snomed.code} ${a.snomed.display}`,
      ])
      .sort();
    expect(inVs).toEqual(inCode);
  });
});

describe('ordinalAnswerByCode', () => {
  it('acha a resposta pelo código LOINC ou SNOMED CT', () => {
    expect(ordinalAnswerByCode('LA11832-5', 'http://loinc.org')).toBe(ORDINAL_ANSWERS.trace);
    expect(ordinalAnswerByCode('260405006', SNOMED_SYSTEM)).toBe(ORDINAL_ANSWERS.trace);
  });

  it('não devolve código que não conferimos, nem de outro sistema', () => {
    expect(ordinalAnswerByCode('LA99999-9', 'http://loinc.org')).toBeUndefined();
    expect(ordinalAnswerByCode('LA11832-5', SNOMED_SYSTEM)).toBeUndefined();
    expect(ordinalAnswerByCode('LA11832-5', 'http://example.org')).toBeUndefined();
  });
});

describe('ordinalValueFor', () => {
  it('sai com LOINC e SNOMED CT, e o texto impresso ao lado', () => {
    expect(ordinalValueFor('Traços')).toEqual({
      coding: [
        { code: 'LA11832-5', display: 'Trace', system: 'http://loinc.org' },
        { code: '260405006', display: 'Trace', system: 'http://snomed.info/sct' },
      ],
      text: 'Traços',
    });
  });

  it('o código vindo do Bundle vence a grafia', () => {
    expect(ordinalValueFor('Neg (fita)', 'LA6577-6')?.coding?.[0]?.code).toBe('LA6577-6');
  });

  it('código desconhecido cai na grafia', () => {
    expect(ordinalValueFor('Positivo', 'LA99999-9')?.coding?.[0]?.code).toBe('LA6576-8');
  });

  it('sem código e sem grafia conhecida não há valor codificado', () => {
    expect(ordinalValueFor('Raras')).toBeUndefined();
  });
});

describe('conversor: resultado ordinal', () => {
  it('emite valueCodeableConcept para grafia conhecida', () => {
    const obs = labObservationToFHIR({ ...ketones, value: '++' }, 'patient-1');
    expect(obs.valueString).toBeUndefined();
    expect(obs.valueCodeableConcept).toEqual({
      coding: [
        { code: 'LA11842-4', display: '2+', system: 'http://loinc.org' },
        { code: '260348001', display: '++', system: 'http://snomed.info/sct' },
      ],
      text: '++',
    });
    expect(validateFHIRObservation(obs)).toEqual([]);
  });

  it('cai em valueString quando a grafia não tem código', () => {
    const obs = labObservationToFHIR({ ...ketones, value: 'Raras' }, 'patient-1');
    expect(obs.valueCodeableConcept).toBeUndefined();
    expect(obs.valueString).toBe('Raras');
  });

  it('usa o answerCode do chamador, se conferido', () => {
    const obs = labObservationToFHIR(
      { ...ketones, answerCode: 'LA6577-6', value: 'Neg (fita)' },
      'patient-1',
    );
    expect(obs.valueCodeableConcept?.coding?.[0]?.code).toBe('LA6577-6');
    expect(obs.valueCodeableConcept?.text).toBe('Neg (fita)');
  });

  it('ignora answerCode que não conferimos', () => {
    const obs = labObservationToFHIR(
      { ...ketones, answerCode: 'LA99999-9', value: 'Raras' },
      'patient-1',
    );
    expect(obs.valueCodeableConcept).toBeUndefined();
    expect(obs.valueString).toBe('Raras');
  });
});

describe('importador: resultado codificado', () => {
  const bundleWith = (valueCodeableConcept: unknown): FHIRBundle =>
    ({
      entry: [
        {
          resource: {
            code: { coding: [{ code: '5797-6', system: 'http://loinc.org' }] },
            effectiveDateTime: '2026-03-15',
            resourceType: 'Observation',
            status: 'final',
            valueCodeableConcept,
          },
        },
      ],
      resourceType: 'Bundle',
      type: 'collection',
    }) as FHIRBundle;

  it('lê o texto e o código de resposta', () => {
    const result = processImportBundle(
      bundleWith({
        coding: [{ code: 'LA11832-5', display: 'Trace', system: 'http://loinc.org' }],
        text: 'Traços',
      }),
    );
    expect(result.skipped).toEqual([]);
    expect(result.imported[0]).toMatchObject({
      answerCode: 'LA11832-5',
      isQualitative: true,
      value: 'Traços',
    });
  });

  it('sem text, usa o display do coding', () => {
    const result = processImportBundle(
      bundleWith({
        coding: [{ code: 'LA6577-6', display: 'Negative', system: 'http://loinc.org' }],
      }),
    );
    expect(result.imported[0]?.value).toBe('Negative');
  });

  it('Bundle só com SNOMED CT conhecido vira o LOINC correspondente', () => {
    const result = processImportBundle(
      bundleWith({ coding: [{ code: '260385009', system: 'http://snomed.info/sct' }] }),
    );
    expect(result.imported[0]?.value).toBe('260385009');
    expect(result.imported[0]?.answerCode).toBe('LA6577-6');
  });

  it('código desconhecido fora do LOINC não vira answerCode', () => {
    const result = processImportBundle(
      bundleWith({
        coding: [
          { code: 'NEG', system: 'http://lab.example/codes' },
          { code: '999999999', system: 'http://snomed.info/sct' },
        ],
        text: 'Negativo',
      }),
    );
    expect(result.imported[0]?.value).toBe('Negativo');
    expect(result.imported[0]?.answerCode).toBeUndefined();
  });

  it('descarta valueCodeableConcept vazio', () => {
    const result = processImportBundle(bundleWith({ coding: [] }));
    expect(result.imported).toEqual([]);
    expect(result.skipped[0]?.reason).toContain('valueCodeableConcept');
  });

  it('ida e volta preserva código e texto', () => {
    const exported = labObservationToFHIR({ ...ketones, value: 'Traços' }, 'patient-1');
    const imported = processImportBundle({
      entry: [{ resource: exported }],
      resourceType: 'Bundle',
      type: 'collection',
    }).imported[0]!;
    const again = labObservationToFHIR(
      { ...ketones, answerCode: imported.answerCode, value: imported.value },
      'patient-1',
    );
    expect(again.valueCodeableConcept).toEqual(exported.valueCodeableConcept);
  });
});

describe('validateFHIRObservation: valueCodeableConcept', () => {
  const base = labObservationToFHIR(ketones, 'patient-1');

  it('aceita valor só com texto', () => {
    expect(
      validateFHIRObservation({ ...base, valueCodeableConcept: { text: 'Negativo' } }),
    ).toEqual([]);
  });

  it('recusa valor sem coding e sem texto', () => {
    expect(validateFHIRObservation({ ...base, valueCodeableConcept: {} })).toContain(
      'valueCodeableConcept: neither coding nor text',
    );
  });

  it('recusa coding sem código', () => {
    expect(
      validateFHIRObservation({
        ...base,
        valueCodeableConcept: { coding: [{ system: 'http://loinc.org' }] },
      }),
    ).toContain('valueCodeableConcept.coding[0]: missing code');
  });

  it('recusa código de exame no lugar da resposta', () => {
    expect(
      validateFHIRObservation({
        ...base,
        valueCodeableConcept: { coding: [{ code: '2514-8', system: 'http://loinc.org' }] },
      }),
    ).toContain('valueCodeableConcept.coding[0]: "2514-8" is not a LOINC answer code (LA…)');
  });

  it('aceita código de outro sistema', () => {
    expect(
      validateFHIRObservation({
        ...base,
        valueCodeableConcept: { coding: [{ code: '260385009', system: 'http://snomed.info/sct' }] },
      }),
    ).toEqual([]);
  });
});
