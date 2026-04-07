import { describe, expect, it } from 'vitest';

import {
  cnsToFHIRIdentifier,
  cpfToFHIRIdentifier,
  formatCNS,
  formatCPF,
  validateCNS,
  validateCPF,
} from '../identifiers';

describe('validateCPF', () => {
  // CPFs válidos conhecidos (vetores de teste)
  it.each([
    ['529.982.247-25', true],
    ['52998224725', true],
    ['111.444.777-35', true],
    ['11144477735', true],
  ])('valida CPF %s como %s', (cpf, expected) => {
    expect(validateCPF(cpf)).toBe(expected);
  });

  it.each([
    ['000.000.000-00', false], // sequência repetida
    ['111.111.111-11', false], // sequência repetida
    ['999.999.999-99', false], // sequência repetida
    ['123.456.789-00', false], // dígitos verificadores incorretos
    ['529.982.247-26', false], // último dígito errado
    ['529.982.247-15', false], // penúltimo dígito errado
    ['1234567890', false], // 10 dígitos
    ['123456789012', false], // 12 dígitos
    ['', false],
    ['abc', false],
  ])('rejeita CPF inválido %s', (cpf, expected) => {
    expect(validateCPF(cpf)).toBe(expected);
  });
});

describe('validateCNS', () => {
  // CNS definitivos (começam com 1 ou 2) — soma ponderada mod-11 = 0
  it('valida CNS definitivo válido', () => {
    expect(validateCNS('100000000000007')).toBe(true);
    expect(validateCNS('200000000000003')).toBe(true);
  });

  // CNS provisórios (começam com 7, 8 ou 9) — soma ponderada mod-11 = 0
  it('valida CNS provisório válido', () => {
    expect(validateCNS('700000000000005')).toBe(true);
    expect(validateCNS('800000000000001')).toBe(true);
  });

  it('rejeita CNS definitivo com dígitos errados', () => {
    expect(validateCNS('100000000000001')).toBe(false);
    expect(validateCNS('200000000000009')).toBe(false);
  });

  it.each([
    ['12345', false], // muito curto
    ['', false],
    ['abcdefghijklmno', false], // não numérico
    ['000000000000000', false], // não começa com 1,2,7,8,9
    ['300000000000000', false], // começa com 3
  ])('rejeita CNS inválido %s', (cns, expected) => {
    expect(validateCNS(cns)).toBe(expected);
  });

  it('rejeita CNS com 14 dígitos', () => {
    expect(validateCNS('12345678901234')).toBe(false);
  });

  it('rejeita CNS com 16 dígitos', () => {
    expect(validateCNS('1234567890123456')).toBe(false);
  });
});

describe('formatCPF', () => {
  it('formata CPF com 11 dígitos', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
  });

  it('formata CPF já com pontuação (remove e reformata)', () => {
    expect(formatCPF('529.982.247-25')).toBe('529.982.247-25');
  });

  it('retorna string original se não tem 11 dígitos', () => {
    expect(formatCPF('1234')).toBe('1234');
    expect(formatCPF('')).toBe('');
  });
});

describe('formatCNS', () => {
  it('formata CNS com 15 dígitos', () => {
    expect(formatCNS('700000000000005')).toBe('700 0000 0000 0005');
  });

  it('retorna string original se não tem 15 dígitos', () => {
    expect(formatCNS('12345')).toBe('12345');
  });
});

describe('cpfToFHIRIdentifier', () => {
  it('converte CPF para FHIR Identifier com sistema RNDS', () => {
    const identifier = cpfToFHIRIdentifier('529.982.247-25');
    expect(identifier).toEqual({
      system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
      use: 'official',
      value: '52998224725',
    });
  });

  it('aceita CPF sem formatação', () => {
    const identifier = cpfToFHIRIdentifier('52998224725');
    expect(identifier.value).toBe('52998224725');
  });

  it('lança erro para CPF inválido', () => {
    expect(() => cpfToFHIRIdentifier('00000000000')).toThrow('CPF inválido');
    expect(() => cpfToFHIRIdentifier('123')).toThrow('CPF inválido');
  });
});

describe('cnsToFHIRIdentifier', () => {
  it('converte CNS para FHIR Identifier com sistema RNDS', () => {
    const identifier = cnsToFHIRIdentifier('700000000000005');
    expect(identifier).toEqual({
      system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
      use: 'official',
      value: '700000000000005',
    });
  });

  it('lança erro para CNS inválido', () => {
    expect(() => cnsToFHIRIdentifier('000000000000000')).toThrow('CNS inválido');
    expect(() => cnsToFHIRIdentifier('123')).toThrow('CNS inválido');
  });
});
