/**
 * O contrato que qualquer modelo tem que preencher.
 *
 * O que precisa de prova aqui é o que um decodificador restrito pode deixar de
 * fora sozinho. Campo opcional some sem erro, e some de forma diferente em cada
 * modelo, então a garantia não pode ser "o modelo costuma mandar".
 */
import { describe, expect, it } from 'vitest';

import { LAB_EXTRACTION_SCHEMA } from '../extraction-schema.js';

const item = LAB_EXTRACTION_SCHEMA.properties.biomarkers.items;

describe('LAB_EXTRACTION_SCHEMA', () => {
  // O `granite-4.1-8b` leu cinco exames certos num laudo da Labcorp e devolveu
  // todos sem `loinc`, porque o campo era opcional. A conferência recusou os
  // cinco, e o defeito parecia do modelo.
  it('exige o `loinc`, para ele não sumir em silêncio', () => {
    expect(item.required).toContain('loinc');
  });

  it('deixa o `loinc` ser nulo, porque nem todo exame tem código', () => {
    expect(item.properties.loinc.anyOf).toEqual([{ type: 'string' }, { type: 'null' }]);
  });

  // Decodificador restrito recusa `type: [...]`, e o LM Studio responde
  // `'type' must be a string`. O contrato serve a qualquer modelo ou não serve.
  it('campo de mais de um tipo usa anyOf', () => {
    for (const [name, spec] of Object.entries(item.properties)) {
      expect(Array.isArray((spec as { type?: unknown }).type), `${name} usa type: [...]`).toBe(
        false,
      );
    }
  });
});
