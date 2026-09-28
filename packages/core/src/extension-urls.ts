/**
 * URLs das extensões do IG do fhir-brasil.
 *
 * Quem emite a extensão e quem a lê precisam concordar literalmente na URL: um
 * consumidor procura a extensão pelo `url`, e uma grafia divergente faz o dado
 * sumir sem erro. O teste confere cada uma contra o `Id:` do FSH em
 * `ig/input/fsh/extensions/`, então extensão nova no IG sem constante aqui, ou
 * o inverso, reprova.
 */

/** Canonical do IG, como está no `sushi-config.yaml`. */
export const IG_CANONICAL = 'https://fhir-brasil.dev.br/ig';

const structureDefinition = (id: string): string => `${IG_CANONICAL}/StructureDefinition/${id}`;

/**
 * Extensões do IG, pela URL.
 *
 * As que têm partes (`extractionSource`, `extractionConfidence`, `asPrinted`)
 * levam as partes em `extension[]` aninhado, cada uma com `url` relativo: o
 * nome da parte, como `page` ou `reading`. Ver o FSH de cada uma.
 */
export const FHIR_BRASIL_EXTENSIONS = {
  /** `Observation`: valor e faixa como impressos, quando houve conversão. */
  asPrinted: structureDefinition('as-printed'),
  /** `Observation`: extraída de PDF via OCR. */
  derivedFromOCR: structureDefinition('derived-from-ocr'),
  /** `Observation`: confiança na leitura e na interpretação, de 0 a 1. */
  extractionConfidence: structureDefinition('extraction-confidence'),
  /** `Observation`: páginas, trecho citado e caixa do trecho no documento. */
  extractionSource: structureDefinition('extraction-source'),
  /** `DiagnosticReport`: lido da tabela de histórico de outro laudo. */
  reprintedIn: structureDefinition('reprinted-in'),
  /** `Observation`: lido do documento, mas substituído por outro valor do mesmo laudo. */
  superseded: structureDefinition('superseded'),
} as const;
