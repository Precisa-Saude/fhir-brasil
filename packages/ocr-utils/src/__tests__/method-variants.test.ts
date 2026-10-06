import { describe, expect, it } from 'vitest';

import { findBiomarkersInText } from '../anchor.js';
import type { ExtractedBiomarker } from '../extraction-schema.js';
import { extractionToLabResult } from '../extraction-to-lab-result.js';
import { validateExtraction } from '../extraction-validator.js';

// Texto sintético, no formato do único caso medido em laudo real: um rodapé
// abaixo do LDL que declara o cálculo de Martin-Hopkins e cita Friedewald só
// para comparar.
const COM_RODAPE = [
  'LDL-CHOLESTEROL 87 mg/dL',
  'Desirable range <100 mg/dL for primary prevention.',
  'LDL-C is now calculated using the Martin-Hopkins',
  'calculation, more accurate than the Friedewald equation.',
  'TRIGLYCERIDES 70 mg/dL',
].join('\n');

const ldlDe = (text: string) => findBiomarkersInText(text).matches.find((m) => m.code === 'LDL');

describe('varredura do método do LDL', () => {
  it('o rodapé que afirma Martin-Hopkins escolhe 96259-7', () => {
    expect(ldlDe(COM_RODAPE)).toMatchObject({
      methodCue: 'calculated using the Martin-Hopkins',
      methodLoinc: '96259-7',
    });
  });

  it('sem pista, o LDL fica sem método', () => {
    expect(ldlDe('COLESTEROL LDL\nResultado: 120 mg/dL')?.methodLoinc).toBeUndefined();
  });

  // Friedewald citado não é afirmação de método: o rodapé real o menciona para
  // comparar, e tratar o nome como pista escolheria o cálculo errado.
  it('Friedewald citado sozinho não escolhe método', () => {
    const text = 'LDL-CHOLESTEROL 87 mg/dL\nFriedewald equation shown for comparison.';
    expect(ldlDe(text)?.methodLoinc).toBeUndefined();
  });

  it('o rodapé depois de outro exame não vale para o LDL', () => {
    const text = [
      'LDL-CHOLESTEROL 87 mg/dL',
      'TRIGLYCERIDES 70 mg/dL',
      'LDL-C is now calculated using the Martin-Hopkins calculation.',
    ].join('\n');
    expect(ldlDe(text)?.methodLoinc).toBeUndefined();
  });

  it('"direta" de outro exame não vira método do LDL', () => {
    const text = 'COLESTEROL LDL 120 mg/dL\nBILIRRUBINA DIRETA 0,2 mg/dL';
    expect(ldlDe(text)?.methodLoinc).toBeUndefined();
  });

  it('exame sem variantes não ganha método', () => {
    const hdl = findBiomarkersInText(`HDL-CHOLESTEROL 55 mg/dL\n${COM_RODAPE}`).matches.find(
      (m) => m.code === 'HDL',
    );
    expect(hdl?.methodLoinc).toBeUndefined();
  });
});

describe('o modelo não escolhe o método', () => {
  const ldl = (loinc: string): Record<string, unknown> => ({
    confidence: 0.9,
    loinc,
    name: 'LDL-Colesterol',
    referenceMax: null,
    referenceMin: null,
    sourceText: 'LDL 87 mg/dL',
    unit: 'mg/dL',
    value: 87,
  });

  it('sem pista no texto, o código por método do modelo volta ao sem método', () => {
    const anchors = findBiomarkersInText('COLESTEROL LDL 87 mg/dL');
    const result = validateExtraction({ biomarkers: [ldl('13457-7')] }, { anchors });
    expect(result.accepted[0]?.loinc).toBe('2089-1');
  });

  it('com pista no texto, vale o código da varredura, mesmo que o modelo mande outro', () => {
    const anchors = findBiomarkersInText(COM_RODAPE);
    const result = validateExtraction({ biomarkers: [ldl('2089-1')] }, { anchors });
    expect(result.accepted[0]?.loinc).toBe('96259-7');
  });

  it('o envelope leva o código por método até a observação', () => {
    const biomarker = { ...ldl('96259-7') } as unknown as ExtractedBiomarker;
    const [observation] = extractionToLabResult([biomarker]).observations;
    expect(observation).toMatchObject({ biomarkerCode: 'LDL', methodLoinc: '96259-7' });
  });

  it('o código sem método não vira methodLoinc', () => {
    const biomarker = { ...ldl('2089-1') } as unknown as ExtractedBiomarker;
    const [observation] = extractionToLabResult([biomarker]).observations;
    expect(observation).not.toHaveProperty('methodLoinc');
  });
});
