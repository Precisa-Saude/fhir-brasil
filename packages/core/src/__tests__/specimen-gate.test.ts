import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS, codeToLoinc } from '../biomarkers';
import { LOINC_SNAPSHOT } from '../loinc-axes';
import { loincSpecimenClass, specimenClassOf, specimenMismatch } from '../specimen-gate';

const loincOf = (code: string): string => {
  const loinc = codeToLoinc(code);
  if (!loinc) throw new Error(`${code} sem LOINC`);
  return loinc;
};

describe('classe do material impresso', () => {
  it.each([
    ['Urina', 'urine'],
    ['Urina de 24 horas', 'urine'],
    ['URINA TIPO I', 'urine'],
    ['Soro', 'blood'],
    ['Plasma (EDTA)', 'blood'],
    ['Sangue Total', 'blood'],
    ['  soro​ ', 'blood'],
  ] as const)('%s é %s', (material, classe) => {
    expect(specimenClassOf(material)).toBe(classe);
  });

  it.each(['Líquor', 'Saliva', 'Fezes', '', 'Material não informado'])(
    '%s não tem classe e não barra nada',
    (material) => {
      expect(specimenClassOf(material)).toBeUndefined();
    },
  );
});

describe('código de soro em seção de urina, e o inverso', () => {
  it.each(['Sodium', 'Potassium', 'Calcium', 'Magnesium', 'Urea', 'UricAcid'])(
    '%s sérico com material urina é conflito',
    (code) => {
      expect(specimenMismatch('Urina de 24 horas', loincOf(code))).toMatchObject({
        code: 'blood',
        material: 'urine',
        reason: 'specimen-mismatch',
      });
    },
  );

  it('código de urina com material soro é conflito', () => {
    expect(specimenMismatch('Soro', loincOf('Glucose_Urine'))).toMatchObject({
      code: 'urine',
      material: 'blood',
    });
  });

  it('material e código da mesma classe não conflitam', () => {
    expect(specimenMismatch('Soro', loincOf('Sodium'))).toBeNull();
    expect(specimenMismatch('Urina', loincOf('Glucose_Urine'))).toBeNull();
  });

  it('material sem classe ou código fora das duas classes não conflitam', () => {
    expect(specimenMismatch('Líquor', loincOf('Sodium'))).toBeNull();
    expect(specimenMismatch('Urina', loincOf('BMI'))).toBeNull();
    expect(specimenMismatch('Urina', '0000-0')).toBeNull();
  });
});

describe('cobertura das classes', () => {
  // Sistema novo no snapshot sem classe passa calado pelo gate. Este teste
  // obriga a decidir: entra numa classe, ou na lista do que não é sangue nem urina.
  const SEM_CLASSE = new Set([
    '^Patient',
    'Abdomen.mid',
    'Amnio fld',
    'Bld/Tiss',
    'Thigh',
    'Triceps',
    'Waist',
    // Densidade óssea por DXA: osso, sítio em Observation.bodySite (PRE-494).
    'XXX>Bone',
  ]);

  it('todo sistema do catálogo tem classe ou está declarado sem classe', () => {
    const soltos = BIOMARKER_DEFINITIONS.filter((b) => b.loinc)
      .map((b) => [b.code, b.loinc!, LOINC_SNAPSHOT.codes[b.loinc!]?.system] as const)
      .filter(([, loinc, system]) => !loincSpecimenClass(loinc) && !SEM_CLASSE.has(system ?? ''))
      .map(([code, , system]) => `${code} (${system})`);
    expect(soltos).toEqual([]);
  });
});
