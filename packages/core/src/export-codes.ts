/**
 * Códigos que a exportação do prontuário emite fora do catálogo de
 * biomarcadores.
 *
 * Dois registros, com regras diferentes:
 *
 * - `EXPORT_LOINC_CODES`: códigos LOINC de sinais vitais, atividade, genômica e
 *   do próprio laudo. Entram no snapshot verificado pelo
 *   `scripts/verify-loinc.ts`, como os códigos dos biomarcadores, e o display
 *   sai do snapshot, nunca daqui. Um código fora do snapshot não é emitido.
 * - `LOCAL_CODES`: o que não tem LOINC publicado, sob
 *   `FHIR_BRASIL_LOCAL_CODE_SYSTEM`, com display em português.
 */

import { FHIR_BRASIL_LOCAL_CODE_SYSTEM, LOINC_SYSTEM } from './code-systems';
import {
  EXPORT_LOINC_ANSWERS,
  EXPORT_LOINC_CODES,
  type ExportLoincAnswerUse,
  type ExportLoincUse,
} from './export-loinc-codes';
import type { FHIRCodeableConcept, FHIRCoding } from './fhir-types';
import { getLoincEntry } from './loinc-axes';

export {
  EXPORT_LOINC_ANSWERS,
  EXPORT_LOINC_CODES,
  type ExportLoincAnswerUse,
  type ExportLoincUse,
} from './export-loinc-codes';

/**
 * O coding LOINC de um uso da exportação, com o display do snapshot.
 *
 * Devolve `undefined` quando o código não está no snapshot: emitir o código
 * sem o nome oficial descumpre a seção 10.3 da licença do LOINC, e emitir um
 * código que ninguém conferiu é o erro que o snapshot existe para impedir.
 */
export function exportLoincCoding(use: ExportLoincUse): FHIRCoding | undefined {
  const code = EXPORT_LOINC_CODES[use];
  const entry = getLoincEntry(code);
  if (!entry) return undefined;
  return { code, display: entry.display, system: LOINC_SYSTEM };
}

/**
 * O `code` de um recurso com o LOINC de um uso, ou erro quando o código não
 * está no snapshot.
 *
 * É erro de programação, não de dado: o teste de `export-codes` garante que
 * todo código do registro tem entrada, então chegar aqui sem ela significa que
 * alguém acrescentou um código sem rodar o verificador.
 */
export function requireExportLoinc(use: ExportLoincUse): FHIRCodeableConcept {
  const coding = exportLoincCoding(use);
  if (!coding) {
    throw new Error(
      `LOINC ${EXPORT_LOINC_CODES[use]} (${use}) não está no snapshot: rode scripts/verify-loinc.ts --merge-missing`,
    );
  }
  return { coding: [coding] };
}

/** O coding de uma resposta LOINC da exportação, sob `http://loinc.org`. */
export function exportLoincAnswerCoding(use: ExportLoincAnswerUse): FHIRCoding {
  return { ...EXPORT_LOINC_ANSWERS[use], system: LOINC_SYSTEM };
}

/** Códigos locais, com o display em português. */
export const LOCAL_CODES = {
  /** Calorias ativas do dia, como o Apple Health as define. */
  activeEnergyBurned: { code: 'active-energy-burned', display: 'Calorias ativas em 24 horas' },
  /** Risco de diabetes tipo 2 em 10 anos pelo modelo BRDMRISC. */
  brdmrisc: { code: 'brdmrisc-10y', display: 'Risco de diabetes tipo 2 em 10 anos (BRDMRISC)' },
  /** Restrição alimentar declarada (sem glúten, sem lactose…). */
  dietaryRestriction: { code: 'dietary-restriction', display: 'Restrição alimentar declarada' },
  /** Tipo de dieta declarado pela pessoa (vegetariana, vegana…). */
  dietType: { code: 'diet-type', display: 'Tipo de dieta declarado' },
  /** Nível de risco atribuído a uma variante no painel nutrigenômico. */
  geneticRiskLevel: { code: 'genetic-risk-level', display: 'Nível de risco da variante' },
  /** Genótipo bruto lido do arquivo (`AG`, `TT`). */
  genotype: { code: 'genotype', display: 'Genótipo' },
  /** Idade fenotípica (PhenoAge, Levine 2018). */
  phenoAge: { code: 'phenoage', display: 'Idade fenotípica (PhenoAge)' },
  /** Diferença entre idade fenotípica e cronológica, em anos. */
  phenoAgeDifference: { code: 'phenoage-difference', display: 'Diferença da idade fenotípica' },
  /** Escore de mortalidade do PhenoAge. */
  phenoAgeMortalityScore: {
    code: 'phenoage-mortality-score',
    display: 'Escore de mortalidade (PhenoAge)',
  },
  /** Recomendação gerada pela Precisa IA. */
  recommendation: { code: 'ai-recommendation', display: 'Recomendação gerada por IA' },
  /** Regularidade do sono do Apple Health, de 0 a 1. */
  sleepConsistency: { code: 'sleep-consistency', display: 'Regularidade do sono' },
} as const;

export type LocalCodeUse = keyof typeof LOCAL_CODES;

/** O coding local de um uso, sob `FHIR_BRASIL_LOCAL_CODE_SYSTEM`. */
export function localCoding(use: LocalCodeUse): FHIRCoding {
  const { code, display } = LOCAL_CODES[use];
  return { code, display, system: FHIR_BRASIL_LOCAL_CODE_SYSTEM };
}
