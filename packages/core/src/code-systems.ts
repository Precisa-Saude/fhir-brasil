/**
 * Identificadores de sistema de código usados nos recursos FHIR.
 *
 * Ficam num módulo próprio porque exportação e importação precisam concordar
 * literalmente: o importador procura o coding pelo `system`, e uma string
 * divergente de um lado faz o biomarcador desaparecer sem erro.
 */

/** LOINC, o vocabulário oficial de exames laboratoriais. */
export const LOINC_SYSTEM = 'http://loinc.org';

/**
 * Códigos internos do fhir-brasil.
 *
 * Cobre o que não tem LOINC publicado: composição corporal por DEXA,
 * densidade óssea e escore de cálcio, entre outros. É o que permite o ciclo
 * exportar/importar preservar esses biomarcadores.
 */
export const BIOMARKER_CODE_SYSTEM = 'http://fhir-brasil.dev/biomarker-codes';
