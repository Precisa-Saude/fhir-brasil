/**
 * Comparação de CPF para a conferência do titular.
 */

import { timingSafeEqual } from 'node:crypto';

import { LabAccessConfigError } from './errors';

/** Devolve os 11 dígitos do CPF informado pelo aplicativo, sem pontuação. */
export function normalizeExpectedCpf(cpf: string): string {
  const digits = typeof cpf === 'string' ? cpf.replace(/[.\-\s]/g, '') : '';
  if (!/^\d{11}$/.test(digits)) {
    // A mensagem não repete o valor recebido.
    throw new LabAccessConfigError('O CPF esperado deveria ter 11 dígitos.');
  }
  return digits;
}

/** Compara dois CPFs de 11 dígitos em tempo constante. */
export function sameCpf(expectedDigits: string, receivedDigits: string): boolean {
  const a = Buffer.from(expectedDigits, 'ascii');
  const b = Buffer.from(receivedDigits, 'ascii');
  return a.length === b.length && timingSafeEqual(a, b);
}
