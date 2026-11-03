/**
 * Peças comuns aos conversores da exportação do prontuário: referência ao
 * paciente, categoria de `Observation`, `Quantity` em UCUM e o id de recurso
 * que respeita a gramática do FHIR.
 */

import { OBSERVATION_CATEGORY_SYSTEM, UCUM_SYSTEM } from './code-systems';
import type { FHIRCodeableConcept, FHIRQuantity, FHIRReference } from './fhir-types';

/**
 * Forma de um `id` de recurso no R4: `[A-Za-z0-9\-\.]{1,64}`.
 *
 * O catálogo usa sublinhado em códigos compostos (`LDL_Peak_Size`), e um id
 * montado com ele é inválido para qualquer validador. Ver `fhirResourceId`.
 */
export const FHIR_ID_PATTERN = /^[A-Za-z0-9\-.]{1,64}$/;

/** Hash curto e determinístico (FNV-1a, 32 bits, em hexadecimal). */
function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Monta um id de recurso válido a partir de partes livres.
 *
 * Cada caractere fora da gramática vira hífen, e um id que passaria de 64
 * caracteres é cortado e recebe um hash das partes originais no fim, para
 * dois ids longos diferentes não caírem no mesmo prefixo.
 */
export function fhirResourceId(...parts: readonly string[]): string {
  const joined = parts
    .filter((part) => part.length > 0)
    .join('-')
    .replaceAll(/[^A-Za-z0-9\-.]/g, '-');
  if (joined.length === 0) throw new Error('fhirResourceId: nenhuma parte informada');
  if (joined.length <= 64) return joined;
  const hash = shortHash(parts.join('\u0000'));
  return `${joined.slice(0, 64 - hash.length - 1)}-${hash}`;
}

/** `Patient/<id>`, a referência que todo recurso da exportação carrega. */
export function patientReference(patientId: string): FHIRReference {
  return { reference: `Patient/${patientId}` };
}

/** Categorias de `Observation` do HL7 que a exportação usa. */
export type ObservationCategoryCode =
  | 'activity'
  | 'exam'
  | 'laboratory'
  | 'social-history'
  | 'survey'
  | 'vital-signs';

const OBSERVATION_CATEGORY_DISPLAY: Record<ObservationCategoryCode, string> = {
  activity: 'Activity',
  exam: 'Exam',
  laboratory: 'Laboratory',
  'social-history': 'Social History',
  survey: 'Survey',
  'vital-signs': 'Vital Signs',
};

/** O `category` de uma `Observation`, no sistema de categorias do HL7. */
export function observationCategory(code: ObservationCategoryCode): FHIRCodeableConcept[] {
  return [
    {
      coding: [
        { code, display: OBSERVATION_CATEGORY_DISPLAY[code], system: OBSERVATION_CATEGORY_SYSTEM },
      ],
    },
  ];
}

/**
 * Uma `Quantity` com código UCUM. `unit` é o texto para quem lê; `code` é o
 * UCUM para quem computa. Os dois saem sempre, porque aqui o código é
 * escolhido pelo conversor, não lido de um laudo.
 */
export function ucumQuantity(value: number, code: string, unit: string): FHIRQuantity {
  return { code, system: UCUM_SYSTEM, unit, value };
}
