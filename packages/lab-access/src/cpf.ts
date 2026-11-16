/**
 * CPF na conferência do titular (seção 4.4).
 */

import { timingSafeEqual } from 'node:crypto';

import { LabAccessConfigError } from './errors';

function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let i = 0; i < length; i += 1) sum += Number(digits[i]) * (length + 1 - i);
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/**
 * `true` para 11 dígitos com os dois dígitos verificadores certos. Sequências
 * de um dígito só (`00000000000`, `11111111111`...) passam no cálculo, mas não
 * são CPF emitido e contam como inválidas.
 */
export function isValidCpf(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{11}$/.test(value)) return false;
  if (/^(\d)\1{10}$/.test(value)) return false;
  return checkDigit(value, 9) === Number(value[9]) && checkDigit(value, 10) === Number(value[10]);
}

/** Devolve os 11 dígitos do CPF informado pelo aplicativo, sem pontuação. */
export function normalizeExpectedCpf(cpf: string | undefined): string {
  const digits = typeof cpf === 'string' ? cpf.replace(/[.\-\s]/g, '') : '';
  if (!isValidCpf(digits)) {
    // A mensagem não repete o valor recebido.
    throw new LabAccessConfigError(
      'O CPF esperado deveria ter 11 dígitos com dígitos verificadores válidos.',
    );
  }
  return digits;
}

/** Compara dois CPFs de 11 dígitos em tempo constante. */
export function sameCpf(expectedDigits: string, receivedDigits: string): boolean {
  const a = Buffer.from(expectedDigits, 'ascii');
  const b = Buffer.from(receivedDigits, 'ascii');
  return a.length === b.length && timingSafeEqual(a, b);
}
