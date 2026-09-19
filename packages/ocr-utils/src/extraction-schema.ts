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
 * A descrição dele diz "linha" e não "trecho" porque "trecho" é largo demais:
 * num laudo da Quest o `qwen3-4b-2507` citou a nota de rodapé inteira do ANA
 * SCREEN, oito linhas de explicação, e quem confere recebeu um parágrafo aceso
 * no lugar da linha do resultado. A citação continua sendo do documento, só
 * que grande demais para servir de referência.
 *
 * `collectionDate` e `laboratoryName` moram no topo porque valem para o laudo
 * inteiro, e não para uma medida. Sem a data não sai Bundle FHIR: o mapeador
 * recusa montar um sem ela, então um contrato que não pede a data entrega
 * biomarcador que não vira recurso.
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
            description:
              'The line of the report where this measurement and its value are printed. ' +
              'A line, not the explanatory block around it.',
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
    collectionDate: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description:
        'The date the specimen was collected, as ISO 8601 (YYYY-MM-DD), or null when the ' +
        'report does not print one. Required: answer null rather than omitting the field.',
    },
    laboratoryName: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description:
        'The laboratory that issued the report, as printed, or null when it is not stated. ' +
        'Required: answer null rather than omitting the field.',
    },
  },
  required: ['biomarkers', 'collectionDate', 'laboratoryName'],
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
  /** Data da coleta em ISO 8601, ou `null` quando o laudo não imprime uma. */
  collectionDate: string | null;
  /** Laboratório que emitiu o laudo, como impresso, ou `null`. */
  laboratoryName: string | null;
}
