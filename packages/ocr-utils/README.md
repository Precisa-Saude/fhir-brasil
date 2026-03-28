# @precisa-saude/fhir-ocr-utils

Utilitários de ancoragem OCR para extração de biomarcadores de PDFs de resultados laboratoriais.

## Instalação

```bash
npm install @precisa-saude/fhir-ocr-utils
```

> **Nota:** Requer `@precisa-saude/fhir` como peer dependency.

## Uso rápido

### Encontrar biomarcadores em texto OCR

```ts
import { findBiomarkersInText, getMatchedCodes } from '@precisa-saude/fhir-ocr-utils';

const ocrText = `
  HEMOGRAMA COMPLETO
  Hemoglobina: 14.2 g/dL
  Glicose Jejum: 95 mg/dL
  Colesterol Total: 195 mg/dL
  HDL: 55 mg/dL
  Triglicerídeos: 120 mg/dL
`;

const result = findBiomarkersInText(ocrText);

console.log(result.matches);
// [
//   { code: 'Hgb', loinc: '718-7', matchedName: 'Hemoglobina', ... },
//   { code: 'Glucose', loinc: '2345-7', matchedName: 'Glicose', ... },
//   { code: 'Cholesterol', loinc: '2093-3', matchedName: 'Colesterol Total', ... },
//   ...
// ]

const codes = getMatchedCodes(result);
// ['Hgb', 'Glucose', 'Cholesterol', 'HDL', 'Triglycerides']

console.log(result.filteredReference);
// Referência LLM filtrada apenas com os biomarcadores encontrados
```

## Padrão anti-alucinação

Este pacote implementa um padrão de **ancoragem antes do LLM** para prevenir alucinações na extração de dados laboratoriais:

1. **Ancoragem (este pacote):** Escaneia o texto OCR bruto procurando nomes de biomarcadores conhecidos usando correspondência exata de strings contra as 183+ definições de `@precisa-saude/fhir`.

2. **Filtragem:** Gera uma referência LLM filtrada (`filteredReference`) contendo apenas os biomarcadores que foram realmente encontrados no texto. O LLM só pode extrair valores para biomarcadores presentes nesta lista.

3. **Extração (LLM):** O modelo de linguagem recebe o texto OCR junto com a referência filtrada, restringindo sua saída apenas aos biomarcadores ancorados.

Este fluxo em dois estágios garante que o LLM não invente biomarcadores que não estão presentes no documento original.

```
PDF → OCR → findBiomarkersInText() → filteredReference → LLM → valores extraídos
                    |                                                      |
                    +── restringe quais biomarcadores ─────────────────────+
                        o LLM pode extrair
```

## API

### `findBiomarkersInText(ocrText: string): AnchorResult`

Escaneia texto OCR e retorna todos os biomarcadores encontrados.

- `result.matches` — Lista de biomarcadores encontrados com código, LOINC, nome e posição
- `result.filteredReference` — Referência formatada para enviar ao LLM
- `result.stats` — Estatísticas de execução (total de padrões, encontrados, tempo)

### `getMatchedCodes(result: AnchorResult): string[]`

Extrai a lista de códigos de biomarcadores de um resultado de ancoragem.

## Aviso médico

Este pacote fornece utilitários de processamento de texto para extração de dados laboratoriais. **Não substitui orientação médica profissional.** Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositório para detalhes completos.

## Licença

[Apache-2.0](../../LICENSE)
