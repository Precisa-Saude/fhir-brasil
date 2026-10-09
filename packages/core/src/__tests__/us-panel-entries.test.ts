import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS, findCodeByName } from '../biomarkers';
import { getReferenceRange } from '../reference-ranges';
import { convertUnit, resolveUcum } from '../units';

/**
 * Entradas que o painel metabólico e o hemograma americanos imprimem e o
 * catálogo não tinha (PRE-479, recorte de 09/10/2026): sem elas, o resultado
 * saía como `UNKNOWN_<nome>`, sem LOINC.
 */
describe('entradas dos painéis americanos', () => {
  it.each([
    ['ANION GAP', 'AnionGap', '33037-3'],
    ['C-PEPTIDE', 'CPeptide', '1986-9'],
    ['IGF-1', 'IGF1', '2484-4'],
    ['Immature Granulocytes', 'ImmatureGranulocytes', '71695-1'],
    ['Immature Grans (Abs)', 'ImmatureGranulocytes_Abs', '53115-2'],
    ['CALCIUM, IONIZED', 'IonizedCalcium', '1995-0'],
    ['NRBC', 'NRBC', '58413-6'],
    ['PHOSPHORUS', 'Phosphorus', '2777-1'],
    ['Protein/Creatinine Ratio, Urine', 'ProteinCreatinineRatio_Urine', '2890-2'],
    ['TRANSFERRIN', 'Transferrin', '3034-6'],
    ['25-OH Vitamin D2', 'VitaminD2', '49054-0'],
    ['25-OH Vitamin D3', 'VitaminD3', '1989-3'],
  ])('"%s" resolve para %s (%s)', (printed, code, loinc) => {
    expect(findCodeByName(printed)).toBe(code);
    expect(BIOMARKER_DEFINITIONS.find((d) => d.code === code)?.loinc).toBe(loinc);
  });

  it('o total da vitamina D continua no código do total', () => {
    expect(findCodeByName('Vitamin D, 25-OH, Total')).toBe('VitaminD');
  });

  it('saturação da transferrina não vira transferrina', () => {
    expect(findCodeByName('Transferrin Saturation')).not.toBe('Transferrin');
  });

  it('cálcio iônico em mg/dL vai para mmol/L pela massa molar do cálcio', () => {
    const result = convertUnit(4.8, 'mg/dL', 'mmol/L', 'IonizedCalcium');
    expect(result?.unit).toBe('mmol/L');
    expect(result?.value).toBeCloseTo(1.198, 3);
  });

  it('fósforo em mmol/L vai para mg/dL', () => {
    const result = convertUnit(1.0, 'mmol/L', 'mg/dL', 'Phosphorus');
    expect(result?.value).toBeCloseTo(3.097, 3);
  });

  it('eritroblastos impressos em % ou por 100 leucócitos saem no mesmo UCUM', () => {
    expect(resolveUcum('/100 WBC', 'NRBC')).toBe('/100{WBCs}');
    expect(resolveUcum('%', 'NRBC')).toBe('/100{WBCs}');
  });

  // IGF-1 cai com a idade: uma faixa adulta única marcaria baixo quem é só
  // mais velho. Sem faixa no catálogo, vale a que o laboratório imprime.
  it('IGF-1 fica sem faixa de catálogo', () => {
    expect(getReferenceRange('IGF1')).toBeUndefined();
  });
});
