import { describe, expect, it } from 'vitest';

import {
  BR_TIPO_AMOSTRA_VALUESET,
  HL7_SPECIMEN_TYPE_SYSTEM,
  specimenTypeCoding,
} from '../specimen-types';

describe('specimenTypeCoding', () => {
  it.each([
    ['Soro', 'SER'],
    ['Plasma', 'PLAS'],
    ['Sangue Total', 'WB'],
    ['Urina', 'UR'],
    ['Líquor', 'CSF'],
    ['Saliva', 'SAL'],
  ])('mapeia %s para %s', (text, code) => {
    expect(specimenTypeCoding(text)).toEqual({
      code,
      display: expect.any(String),
      system: HL7_SPECIMEN_TYPE_SYSTEM,
    });
  });

  it('devolve o display do ValueSet, não o texto que o laudo imprimiu', () => {
    // O perfil proíbe `type.text`, então o display é a única coisa legível que
    // sobra no recurso, e ele tem de ser o do ValueSet.
    expect(specimenTypeCoding('SORO')?.display).toBe('Soro');
    expect(specimenTypeCoding('sangue total')?.display).toBe('Sangue Total');
  });

  it.each(['SORO', 'soro', '  Soro  ', 'Soro'])('ignora caixa e espaço em %p', (text) => {
    expect(specimenTypeCoding(text)?.code).toBe('SER');
  });

  it.each([
    ['espaço não separável', 'Sangue\u00a0Total'],
    ['tabulação', 'Sangue\tTotal'],
    ['espaço fino', 'Sangue\u2009Total'],
  ])('trata %s como espaço comum', (_nome, text) => {
    expect(specimenTypeCoding(text)?.code).toBe('WB');
  });

  it.each([
    ['largura zero no meio', 'So\u200bro'],
    ['BOM e largura zero nas bordas', '\ufeffSoro\u200b'],
    ['hífen opcional, de quebra de linha', 'So\u00adro'],
    ['juntador de palavra', 'So\u2060ro'],
  ])('descarta caractere invisível: %s', (_nome, text) => {
    // A camada de texto de PDF emite esses. Não são espaço, então `\s` não os
    // pega: saem pela categoria `\p{Cf}` antes da normalização.
    expect(specimenTypeCoding(text)?.code).toBe('SER');
  });

  it('ignora acento, que o laudo às vezes não traz', () => {
    expect(specimenTypeCoding('Liquor')?.code).toBe('CSF');
    expect(specimenTypeCoding('LÍQUOR')?.code).toBe('CSF');
  });

  it.each([
    ['Fezes', 'não existe no ValueSet'],
    ['Soro/Plasma', 'dois materiais numa linha, escolher um seria inferência'],
    ['Sangue', 'só existe no CodeSystem do GAL, que ficou de fora'],
    ['', 'texto vazio'],
    ['Material', 'rótulo sem valor'],
  ])('deixa %p sem código: %s', (text) => {
    expect(specimenTypeCoding(text)).toBeUndefined();
  });

  it('publica a URL do ValueSet a que o perfil vincula', () => {
    expect(BR_TIPO_AMOSTRA_VALUESET).toBe(
      'https://rnds-fhir.saude.gov.br/ValueSet/BRTipoAmostra-1.0',
    );
  });
});
