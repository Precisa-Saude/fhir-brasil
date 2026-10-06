/**
 * Os eixos e os grupos LOINC de cada código do catálogo, como o servidor
 * oficial os publica, conferidos todo mês pelo `scripts/verify-loinc.ts`.
 *
 * Os dados vêm de `loinc-snapshot.generated.ts`, cópia do
 * `scripts/loinc-snapshot.json` feita pelo gerador. Toda leitura daqui carrega
 * o código e o display juntos, e quem republicar deve levar `LOINC_SNAPSHOT._notice`.
 */
import { LOINC_SNAPSHOT } from './loinc-snapshot.generated';

/** Um código LOINC no snapshot, com os eixos na grafia em que o LOINC os exibe. */
export interface LoincEntry {
  component: string | null;
  display: string;
  /** LOINC Groups (`LG…`) a que o código pertence, com o nome de cada um. */
  groups?: Record<string, string>;
  /** Único eixo opcional: a maioria dos códigos não afirma método. */
  method: string | null;
  property: string | null;
  scale: string | null;
  status: string | null;
  system: string | null;
  time: string | null;
}

export interface LoincSnapshot {
  _checkedAt: string;
  _loincVersion: string | null;
  /** Aviso da seção 10.1 da licença do LOINC. */
  _notice: string;
  codes: Record<string, LoincEntry>;
}

export { LOINC_SNAPSHOT };

/** Os eixos de um código do catálogo, ou `undefined` se ele não está no snapshot. */
export function getLoincEntry(loinc: string): LoincEntry | undefined {
  return LOINC_SNAPSHOT.codes[loinc];
}
