/**
 * Contrato de saída para extração de laudo por modelo.
 *
 * Este é o **contrato de interoperabilidade**, e não um prompt. Ele descreve a
 * forma do JSON que qualquer modelo precisa devolver para o resto do toolkit
 * conseguir conferir e converter o resultado. Não diz como pedir isso ao
 * modelo, não traz instrução de comportamento e não depende de fornecedor:
 * quem usa liga do jeito que a plataforma dele permitir (saída estruturada,
 * gramática, tool use ou simples prompt com validação por cima).
 *
 * As descrições são deliberadamente neutras. Regra de comportamento ("nunca
 * infira", "copie literalmente") é ajuste de prompt, muda de modelo para
 * modelo e não pertence a um contrato público.
 *
 * As descrições são as únicas strings em inglês do pacote, e isso é
 * deliberado: o schema é contrato de integração lido por quem consome de fora
 * do Brasil, e uma descrição em pt-BR não ajuda ninguém em Colônia ou Madri.
 * O resto da documentação segue a regra do ecossistema.
 *
 * O campo `sourceText` existe porque é o que torna a conferência possível:
 * sem o trecho que originou o valor não dá para auditar a extração depois.
 *
 * O `loinc` é obrigatório apesar de aceitar `null`. Opcional, ele some: num
 * laudo da Labcorp o `granite-4.1-8b` leu os cinco exames certos e devolveu
 * todos sem o campo, e a conferência recusou os cinco. Obrigatório, o modelo
 * precisa decidir e responder `null` quando nenhum código serve, que é uma
 * resposta auditável em vez de um silêncio. Sem isto, qual modelo funciona
 * depende de o modelo lembrar de preencher campo opcional.
 *
 * Campo que aceita mais de um tipo usa `anyOf`, e não `type: [...]`. As duas
 * formas são JSON Schema válido, mas decodificador restrito não engole a
 * segunda: o LM Studio recusa a geração com `'type' must be a string`. Como o
 * ponto do contrato é servir a qualquer modelo, vale a forma mais aceita.
 */
export const LAB_EXTRACTION_SCHEMA = {
  $id: 'https://fhir-brasil.dev.br/schemas/lab-extraction.json',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  additionalProperties: false,
  properties: {
    biomarkers: {
      description: 'The measurements read from the report.',
      items: {
        additionalProperties: false,
        properties: {
          confidence: {
            description: 'Confidence in this reading, from 0 to 1.',
            maximum: 1,
            minimum: 0,
            type: 'number',
          },
          loinc: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
            description:
              'A LOINC code from the allowed list, or null when none of them applies. ' +
              'Required: answer null rather than omitting the field.',
          },
          name: {
            description: 'The measurement name as the report prints it.',
            type: 'string',
          },
          referenceMax: {
            anyOf: [{ type: 'number' }, { type: 'null' }],
            description: 'Upper bound of the range printed on the report, or null.',
          },
          referenceMin: {
            anyOf: [{ type: 'number' }, { type: 'null' }],
            description: 'Lower bound of the range printed on the report, or null.',
          },
          sourceText: {
            description: 'The snippet of the report carrying this measurement and its value.',
            type: 'string',
          },
          unit: {
            description: 'Unit as the report prints it. Empty string when there is none.',
            type: 'string',
          },
          value: {
            anyOf: [{ type: 'number' }, { type: 'string' }],
            description: 'Numeric value, or text for a qualitative result.',
          },
        },
        required: ['name', 'value', 'unit', 'sourceText', 'confidence', 'loinc'],
        type: 'object',
      },
      type: 'array',
    },
  },
  required: ['biomarkers'],
  title: 'Laboratory report extraction',
  type: 'object',
} as const;

/** Uma grandeza como o modelo devolve, antes de qualquer conferência. */
export interface ExtractedBiomarker {
  confidence: number;
  loinc?: string | null;
  name: string;
  referenceMax?: number | null;
  referenceMin?: number | null;
  sourceText: string;
  unit: string;
  value: number | string;
}

/** O objeto inteiro que o modelo devolve. */
export interface ExtractionPayload {
  biomarkers: ExtractedBiomarker[];
}
