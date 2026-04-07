/**
 * Helpers para identificadores brasileiros — CPF e CNS
 *
 * Validação, formatação e conversão para FHIR Identifier.
 * Algoritmos de validação baseados nas especificações oficiais:
 * - CPF: Receita Federal (mod-11, dois dígitos verificadores)
 * - CNS: Ministério da Saúde (mod-11 para definitivos, soma ponderada para provisórios)
 */

import type { FHIRIdentifier } from './fhir-types';

const CPF_SYSTEM = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf';
const CNS_SYSTEM = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns';

/**
 * Remove caracteres não-numéricos de uma string.
 */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida um CPF brasileiro usando algoritmo mod-11.
 *
 * @param cpf — CPF com ou sem formatação (ex: "123.456.789-09" ou "12345678909")
 * @returns true se o CPF é estruturalmente válido
 */
export function validateCPF(cpf: string): boolean {
  const digits = digitsOnly(cpf);

  if (digits.length !== 11) return false;

  // Rejeitar sequências de dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[10])) return false;

  return true;
}

/**
 * Valida um CNS (Cartão Nacional de Saúde) brasileiro.
 *
 * CNS definitivos começam com 1 ou 2 (mod-11).
 * CNS provisórios começam com 7, 8 ou 9 (soma ponderada mod-11 = 0).
 *
 * @param cns — CNS com 15 dígitos
 * @returns true se o CNS é estruturalmente válido
 */
export function validateCNS(cns: string): boolean {
  const digits = digitsOnly(cns);

  if (digits.length !== 15) return false;

  const firstDigit = digits[0]!;

  // CNS deve começar com 1, 2 (definitivo) ou 7, 8, 9 (provisório)
  if (!['1', '2', '7', '8', '9'].includes(firstDigit)) return false;

  // Ambos os tipos usam soma ponderada mod-11 = 0
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += Number(digits[i]) * (15 - i);
  }
  return sum % 11 === 0;
}

/**
 * Formata um CPF como XXX.XXX.XXX-XX.
 *
 * @param cpf — CPF com 11 dígitos (com ou sem formatação)
 * @returns CPF formatado ou a string original se inválido
 */
export function formatCPF(cpf: string): string {
  const digits = digitsOnly(cpf);
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Formata um CNS como XXX XXXX XXXX XXXX.
 *
 * @param cns — CNS com 15 dígitos
 * @returns CNS formatado ou a string original se inválido
 */
export function formatCNS(cns: string): string {
  const digits = digitsOnly(cns);
  if (digits.length !== 15) return cns;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)} ${digits.slice(11)}`;
}

/**
 * Converte um CPF para um FHIR Identifier.
 *
 * @param cpf — CPF com 11 dígitos (com ou sem formatação)
 * @returns FHIR Identifier com sistema RNDS para CPF
 * @throws Error se o CPF for inválido
 */
export function cpfToFHIRIdentifier(cpf: string): FHIRIdentifier {
  if (!validateCPF(cpf)) {
    throw new Error(`CPF inválido: ${cpf}`);
  }
  return {
    system: CPF_SYSTEM,
    use: 'official',
    value: digitsOnly(cpf),
  };
}

/**
 * Converte um CNS para um FHIR Identifier.
 *
 * @param cns — CNS com 15 dígitos
 * @returns FHIR Identifier com sistema RNDS para CNS
 * @throws Error se o CNS for inválido
 */
export function cnsToFHIRIdentifier(cns: string): FHIRIdentifier {
  if (!validateCNS(cns)) {
    throw new Error(`CNS inválido: ${cns}`);
  }
  return {
    system: CNS_SYSTEM,
    use: 'official',
    value: digitsOnly(cns),
  };
}
