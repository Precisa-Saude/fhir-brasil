import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS, findCodeByName } from '../biomarkers';
import { getReferenceRange } from '../reference-ranges';
import { resolveUcum } from '../units';

/**
 * Segundo nível do recorte da PRE-479 (09/10/2026): códigos propostos pelo
 * loinc-drilldown com o Jev e aprovados pelo curador. Ver o registro de
 * decisão de cada um em `mapping-decisions.ts`.
 */
describe('entradas de segundo nível', () => {
  it.each([
    ['PTT, ACTIVATED', 'APTT', '14979-9'],
    ['CYCLIC CITRULLINATED PEPTIDE (CCP) AB, IGG', 'AntiCCP', '33935-8'],
    ['MYELOPEROXIDASE ANTIBODY (MPO)', 'MPO_Antibody', '6969-0'],
    ['P-ANCA', 'pANCA', '32787-4'],
    ['DNA (DS) ANTIBODY', 'AntiDsDNA', '5130-0'],
    ['SM ANTIBODY', 'AntiSm', '11090-8'],
    ['RNP ANTIBODY', 'AntiRNP', '29374-6'],
    ["SJOGREN'S ANTIBODY (SS-A)", 'AntiSSA', '17792-3'],
    ["SJOGREN'S ANTIBODY (SS-B)", 'AntiSSB', '17791-5'],
    ['SCLERODERMA ANTIBODY (SCL-70)', 'AntiScl70', '27416-7'],
    ['JO-1 ANTIBODY', 'AntiJo1', '11565-9'],
  ])('"%s" resolve para %s (%s)', (printed, code, loinc) => {
    expect(findCodeByName(printed)).toBe(code);
    expect(BIOMARKER_DEFINITIONS.find((d) => d.code === code)?.loinc).toBe(loinc);
  });

  it('índice de anticorpo e título saem em UCUM', () => {
    expect(resolveUcum('AI', 'AntiSSA')).toBe('{AI}');
    expect(resolveUcum('titer', 'pANCA')).toBe('{titer}');
  });

  // O corte de autoanticorpo depende do ensaio: vale o que o laboratório imprime.
  it.each(['AntiCCP', 'AntiDsDNA', 'AntiSSA', 'pANCA'])('%s fica sem faixa de catálogo', (code) => {
    expect(getReferenceRange(code)).toBeUndefined();
  });
});
