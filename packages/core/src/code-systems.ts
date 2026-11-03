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

/**
 * Códigos locais do fhir-brasil para o que não é biomarcador e não tem código
 * publicado: escores derivados (PhenoAge, BRDMRISC), métricas que só um
 * fabricante define (calorias ativas e regularidade do sono do Apple Health),
 * genótipo bruto, tipo de dieta. Cada código está em `LOCAL_CODES`
 * (`export-codes.ts`), com o display em português. Um LOINC parecido no lugar
 * seria afirmação sob `http://loinc.org` que ninguém conferiu.
 */
export const FHIR_BRASIL_LOCAL_CODE_SYSTEM = 'http://fhir-brasil.dev/local-codes';

/** UCUM, o sistema das unidades de `Quantity`. */
export const UCUM_SYSTEM = 'http://unitsofmeasure.org';

/** dbSNP, o identificador `rs…` das variantes genéticas. */
export const DBSNP_SYSTEM = 'http://www.ncbi.nlm.nih.gov/snp';

/** CID-10, no `system` que o R4 define e que o IG do fhir-brasil usa. */
export const ICD10_SYSTEM = 'http://hl7.org/fhir/sid/icd-10';

/** Categorias de `Observation` do HL7 (`laboratory`, `vital-signs`, `activity`…). */
export const OBSERVATION_CATEGORY_SYSTEM =
  'http://terminology.hl7.org/CodeSystem/observation-category';
