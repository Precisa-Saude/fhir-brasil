/**
 * Conferências de formato usadas antes de montar URLs e escopos.
 */

import { LabAccessConfigError } from './errors';

const CONSENT_ID = /^[A-Za-z0-9\-._~]{1,128}$/;
const FHIR_ID = /^[A-Za-z0-9\-.]{1,64}$/;
const ONLY_DOTS = /^\.+$/;

/** `consent_id` como a seção 5.4.1 define. Ele entra em caminhos e no escopo dinâmico. */
export function isConsentId(value: unknown): value is string {
  return typeof value === 'string' && CONSENT_ID.test(value) && !ONLY_DOTS.test(value);
}

/** Id lógico de recurso FHIR R4. */
export function isFhirId(value: unknown): value is string {
  return typeof value === 'string' && FHIR_ID.test(value) && !ONLY_DOTS.test(value);
}

export function assertConsentId(value: unknown): string {
  if (!isConsentId(value)) {
    throw new LabAccessConfigError('O consent_id não tem o formato que o protocolo define.');
  }
  return value;
}

export function assertFhirId(value: unknown, what = 'id'): string {
  if (!isFhirId(value)) {
    throw new LabAccessConfigError(`O ${what} não é um id lógico FHIR válido.`);
  }
  return value;
}

/** Aceita `id` ou `Tipo/id` e devolve `Tipo/id`. */
export function toReference(resourceType: string, value: unknown): string {
  const prefix = `${resourceType}/`;
  const id =
    typeof value === 'string' && value.startsWith(prefix) ? value.slice(prefix.length) : value;
  return `${prefix}${assertFhirId(id, `id de ${resourceType}`)}`;
}

/** Remove barras finais de uma URL base. */
export function baseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}
