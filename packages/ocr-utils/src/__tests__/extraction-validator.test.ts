import { describe, expect, it } from 'vitest';

import { findBiomarkersInText } from '../anchor.js';
import { LAB_EXTRACTION_SCHEMA } from '../extraction-schema.js';
import { acceptedBiomarkers, validateExtraction } from '../extraction-validator.js';

const LAUDO = `HEMOGRAMA COMPLETO
Hemoglobina .......... 14,5 g/dL
BIOQUIMICA
Glicose .............. 99 mg/dL
Ferritina ............ 210 ng/mL`;

const anchors = findBiomarkersInText(LAUDO);

const hemoglobina = {
  confidence: 0.98,
  loinc: '718-7',
  name: 'Hemoglobina',
  sourceText: 'Hemoglobina .......... 14,5 g/dL',
  unit: 'g/dL',
  value: 14.5,
};

describe('LAB_EXTRACTION_SCHEMA', () => {
  it('exige os campos que tornam a conferência possível', () => {
    expect(LAB_EXTRACTION_SCHEMA.properties.biomarkers.items.required).toContain('sourceText');
    // A data e o laboratório valem para o laudo inteiro, e a data decide se
    // existe Bundle FHIR: sem ela o mapeador recusa montar.
    expect(LAB_EXTRACTION_SCHEMA.required).toEqual([
      'biomarkers',
      'collectionDate',
      'laboratoryName',
    ]);
  });

  // Faixa é campo obrigatório pelo mesmo motivo do `loinc`: opcional, o modelo
  // esquece, e faixa errada não parece errada. Ver o comentário do schema.
  it.each(['referenceMin', 'referenceMax'])('exige %s, que decide normal ou alterado', (campo) => {
    expect(LAB_EXTRACTION_SCHEMA.properties.biomarkers.items.required).toContain(campo);
  });

  // A descrição é montada por concatenação, então a asserção tolera quebra de
  // linha e espaço: reflow do código-fonte não é mudança de contrato.
  it('diz que o limite não é a medida, que era a confusão dos modelos', () => {
    const { referenceMax, referenceMin } =
      LAB_EXTRACTION_SCHEMA.properties.biomarkers.items.properties;
    for (const campo of [referenceMin, referenceMax]) {
      expect(campo.description).toMatch(/not\s+this\s+result/);
    }
  });

  it('não carrega regra de comportamento nas descrições', () => {
    const descriptions = JSON.stringify(LAB_EXTRACTION_SCHEMA).toLowerCase();
    for (const forbidden of ['never', 'nunca', 'verbatim', 'do not infer']) {
      expect(descriptions).not.toContain(forbidden);
    }
  });
});

describe('validateExtraction', () => {
  it('recusa saída que não é objeto', () => {
    const result = validateExtraction('não sou JSON de objeto');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('recusa objeto sem a lista de grandezas', () => {
    const result = validateExtraction({ resultados: [] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('biomarkers');
  });

  it('aceita uma grandeza bem formada e ancorada', () => {
    const result = validateExtraction({ biomarkers: [hemoglobina] }, { anchors });
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('descarta código que a varredura não ancorou', () => {
    // 1742-6 é ALT. O laudo não menciona ALT em lugar nenhum: é o caso do
    // valor plausível pendurado num exame que não estava na página.
    const result = validateExtraction(
      {
        biomarkers: [
          {
            ...hemoglobina,
            loinc: '1742-6',
            name: 'ALT',
            sourceText: 'Ferro Total 108',
            value: 108,
          },
        ],
      },
      { anchors },
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.reason).toBe('not-anchored');
    expect(result.rejected[0]?.detail).toContain('1742-6');
  });

  it('descarta grandeza sem código, porque não dá para conferir', () => {
    const { loinc: _loinc, ...semCodigo } = hemoglobina;
    const result = validateExtraction({ biomarkers: [semCodigo] }, { anchors });
    expect(result.rejected[0]?.reason).toBe('not-anchored');
  });

  it('aceita quando o modelo devolve o código interno em vez do LOINC', () => {
    const result = validateExtraction(
      { biomarkers: [{ ...hemoglobina, loinc: 'Hgb' }] },
      { anchors },
    );
    expect(result.accepted).toHaveLength(1);
  });

  it.each([
    ['name', { ...hemoglobina, name: '' }],
    ['value', { ...hemoglobina, value: undefined }],
    ['unit', { ...hemoglobina, unit: undefined }],
    ['sourceText', { ...hemoglobina, sourceText: '' }],
    ['confidence fora de faixa', { ...hemoglobina, confidence: 4 }],
    ['loinc de tipo errado', { ...hemoglobina, loinc: 7187 }],
    ['referenceMax de tipo errado', { ...hemoglobina, referenceMax: 'alto' }],
  ])('recusa por forma quando %s está errado', (_label, biomarker) => {
    const result = validateExtraction({ biomarkers: [biomarker] }, { anchors });
    expect(result.rejected[0]?.reason).toBe('schema');
    expect(result.accepted).toHaveLength(0);
  });

  it('recusa entrada que nem objeto é', () => {
    const result = validateExtraction({ biomarkers: ['Hemoglobina 14,5'] }, { anchors });
    expect(result.rejected[0]?.detail).toContain('não é um objeto');
  });

  it('sem ancoragem confere só a forma, e deixa passar código não ancorado', () => {
    const result = validateExtraction({
      biomarkers: [{ ...hemoglobina, loinc: '1742-6', name: 'ALT' }],
    });
    expect(result.accepted).toHaveLength(1);
  });

  it('aceita valor qualitativo e unidade vazia', () => {
    const result = validateExtraction(
      { biomarkers: [{ ...hemoglobina, unit: '', value: 'Não Reagente' }] },
      { anchors },
    );
    expect(result.accepted).toHaveLength(1);
  });

  it('separa aprovadas e recusadas na mesma passada', () => {
    const result = validateExtraction(
      {
        biomarkers: [
          hemoglobina,
          { ...hemoglobina, loinc: '1742-6', name: 'ALT' },
          { ...hemoglobina, name: '' },
        ],
      },
      { anchors },
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected.map((r) => r.reason)).toEqual(['not-anchored', 'schema']);
  });
});

describe('o que vale para o laudo inteiro', () => {
  it('devolve data e laboratório quando o modelo responde', () => {
    const result = validateExtraction(
      { biomarkers: [hemoglobina], collectionDate: '2026-09-18', laboratoryName: 'Fleury' },
      { anchors },
    );
    expect(result.report).toEqual({ collectionDate: '2026-09-18', laboratoryName: 'Fleury' });
  });

  // Campo ausente e `null` são a mesma coisa aqui, e string vazia também: o
  // Bundle não sai com data vazia, e "" atravessaria a checagem de tipo.
  it.each([
    ['ausente', {}],
    ['nulo', { collectionDate: null, laboratoryName: null }],
    ['vazio', { collectionDate: '', laboratoryName: '' }],
  ])('devolve nulo quando o campo está %s', (_label, extra) => {
    const result = validateExtraction({ biomarkers: [hemoglobina], ...extra }, { anchors });
    expect(result.report).toEqual({ collectionDate: null, laboratoryName: null });
  });
});

describe('acceptedBiomarkers', () => {
  it('devolve só a lista aprovada', () => {
    expect(acceptedBiomarkers({ biomarkers: [hemoglobina] }, { anchors })).toHaveLength(1);
  });
});
