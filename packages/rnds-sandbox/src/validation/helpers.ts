/**
 * Helpers compartilhados pelos validadores de perfil.
 *
 * Cada helper retorna `ValidationIssue[]` (vazio quando passa) para que
 * os validadores de perfil possam compor checagens com `[].concat(...)`.
 */

import type { IssueSeverity, ValidationIssue } from './types';

export function issue(
  severity: IssueSeverity,
  code: string,
  diagnostics: string,
  path: string,
): ValidationIssue {
  return { code, diagnostics, expression: [path], location: [path], severity };
}

/** Retorna issue `error/required` se `value` for null/undefined. */
export function requireField(value: unknown, label: string, path: string): ValidationIssue[] {
  if (value === undefined || value === null) {
    return [issue('error', 'required', `${label} é obrigatório`, path)];
  }
  return [];
}

/** Retorna issue se `value` não for um array com pelo menos `min` elementos. */
export function requireMinCardinality(
  value: unknown,
  min: number,
  label: string,
  path: string,
): ValidationIssue[] {
  if (!Array.isArray(value) || value.length < min) {
    return [
      issue(
        'error',
        'required',
        `${label} requer pelo menos ${min} elemento(s); recebido ${
          Array.isArray(value) ? value.length : 0
        }`,
        path,
      ),
    ];
  }
  return [];
}

/** Retorna issue se `actual` não estiver no conjunto `allowed`. */
export function requireOneOf(
  actual: unknown,
  allowed: readonly string[],
  label: string,
  path: string,
): ValidationIssue[] {
  if (typeof actual !== 'string' || !allowed.includes(actual)) {
    return [
      issue(
        'error',
        'invalid',
        `${label} deve ser um de [${allowed.join(', ')}]; recebido "${String(actual)}"`,
        path,
      ),
    ];
  }
  return [];
}

/** Retorna issue se a string não casar com o regex. */
export function requirePattern(
  value: unknown,
  pattern: RegExp,
  label: string,
  path: string,
): ValidationIssue[] {
  if (typeof value !== 'string' || !pattern.test(value)) {
    return [
      issue(
        'error',
        'invalid',
        `${label} não obedece ao formato esperado (${pattern.source})`,
        path,
      ),
    ];
  }
  return [];
}

/**
 * Retorna o valor de `obj[key]` quando obj é um objeto não-null, ou
 * undefined caso contrário (sem lançar).
 */
export function get<T = unknown>(obj: unknown, key: string): T | undefined {
  if (obj && typeof obj === 'object') {
    return (obj as Record<string, unknown>)[key] as T | undefined;
  }
  return undefined;
}
