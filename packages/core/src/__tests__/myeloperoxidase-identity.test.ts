import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS, codeToLoinc, findCodeByName } from '../biomarkers';
import { getLoincEntry } from '../loinc-axes';
import { MAPPING_DECISIONS } from '../mapping-decisions';
import { getReferenceRange } from '../reference-ranges';
import { resolveUcum } from '../units';

describe('identidade da mieloperoxidase', () => {
  it.each(['Myeloperoxidase', 'Mieloperoxidase'])(
    'resolve a enzima "%s" sem usar o anticorpo',
    (name) => {
      expect(findCodeByName(name)).toBe('Myeloperoxidase');
      expect(codeToLoinc('Myeloperoxidase')).toBe('66853-3');
    },
  );

  it.each(['MPO', 'mpo', 'MPO IgG', 'ANCA MPO', 'ANCA-MPO'])(
    'não atribui o nome ambíguo "%s" à enzima',
    (name) => {
      expect(findCodeByName(name)).toBeUndefined();
    },
  );

  it.each(['Anti-MPO', 'MPO Antibody', 'Myeloperoxidase Antibody (MPO)'])(
    'preserva a identidade do anticorpo "%s"',
    (name) => {
      expect(findCodeByName(name)).toBe('MPO_Antibody');
      expect(codeToLoinc('MPO_Antibody')).toBe('6969-0');
    },
  );

  it('completa a definição sem alterar unidade ou referência existentes', () => {
    expect(BIOMARKER_DEFINITIONS.find((entry) => entry.code === 'Myeloperoxidase')).toMatchObject({
      loinc: '66853-3',
      unit: 'pmol/L',
    });
    expect(resolveUcum('pmol/L', 'Myeloperoxidase')).toBe('pmol/L');
    expect(getReferenceRange('Myeloperoxidase')).toMatchObject({ max: 728, unit: 'pmol/L' });
  });

  it('registra a restrição a plasma sem inventar revisão independente', () => {
    expect(MAPPING_DECISIONS.Myeloperoxidase).toMatchObject({
      evidence: ['name'],
      loinc: '66853-3',
      settledBy: 'name',
    });
    expect(MAPPING_DECISIONS.Myeloperoxidase?.note).toContain('plasma');
    expect(MAPPING_DECISIONS.Myeloperoxidase?.reviewer).toBeUndefined();
    expect(getLoincEntry('66853-3')).toMatchObject({
      component: 'Myeloperoxidase',
      method: null,
      property: 'SCnc',
      scale: 'Qn',
      status: 'ACTIVE',
      system: 'Plas',
      time: 'Pt',
    });
  });
});
