# @fhir-brasil/ocr-utils

Utilitarios de ancoragem OCR para extracao de biomarcadores de PDFs de resultados laboratoriais.

## Instalacao

```bash
npm install @fhir-brasil/ocr-utils
```

> **Nota:** Requer `@fhir-brasil/core` como peer dependency.

## Uso rapido

### Encontrar biomarcadores em texto OCR

```ts
import { findBiomarkersInText, getMatchedCodes } from '@fhir-brasil/ocr-utils';

const ocrText = `
  HEMOGRAMA COMPLETO
  Hemoglobina: 14.2 g/dL
  Glicose Jejum: 95 mg/dL
  Colesterol Total: 195 mg/dL
  HDL: 55 mg/dL
  Triglicerides: 120 mg/dL
`;

const result = findBiomarkersInText(ocrText);

console.log(result.matches);
// [
//   { code: 'hemoglobina', loinc: '718-7', matchedName: 'Hemoglobina', ... },
//   { code: 'glicose-jejum', loinc: '1558-6', matchedName: 'Glicose Jejum', ... },
//   { code: 'colesterol-total', loinc: '2093-3', matchedName: 'Colesterol Total', ... },
//   ...
// ]

const codes = getMatchedCodes(result);
// ['hemoglobina', 'glicose-jejum', 'colesterol-total', 'hdl', 'triglicerides']

console.log(result.filteredReference);
// Referencia LLM filtrada apenas com os biomarcadores encontrados
```

## Padrao anti-alucinacao

Este pacote implementa um padrao de **ancoragem antes do LLM** para prevenir alucinacoes na extracao de dados laboratoriais:

1. **Ancoragem (este pacote):** Escaneia o texto OCR bruto procurando nomes de biomarcadores conhecidos usando correspondencia exata de strings contra as 183+ definicoes de `@fhir-brasil/core`.

2. **Filtragem:** Gera uma referencia LLM filtrada (`filteredReference`) contendo apenas os biomarcadores que foram realmente encontrados no texto. O LLM so pode extrair valores para biomarcadores presentes nesta lista.

3. **Extracao (LLM):** O modelo de linguagem recebe o texto OCR junto com a referencia filtrada, restringindo sua saida apenas aos biomarcadores ancorados.

Este fluxo em dois estagios garante que o LLM nao invente biomarcadores que nao estao presentes no documento original.

```
PDF -> OCR -> findBiomarkersInText() -> filteredReference -> LLM -> valores extraidos
                    |                                                      |
                    +-- restringe quais biomarcadores ------>---------------+
                        o LLM pode extrair
```

## API

### `findBiomarkersInText(ocrText: string): AnchorResult`

Escaneia texto OCR e retorna todos os biomarcadores encontrados.

- `result.matches` -- Lista de biomarcadores encontrados com codigo, LOINC, nome e posicao
- `result.filteredReference` -- Referencia formatada para enviar ao LLM
- `result.stats` -- Estatisticas de execucao (total de padroes, encontrados, tempo)

### `getMatchedCodes(result: AnchorResult): string[]`

Extrai a lista de codigos de biomarcadores de um resultado de ancoragem.

## Aviso medico

Este pacote fornece utilitarios de processamento de texto para extracao de dados laboratoriais. **Nao substitui orientacao medica profissional.** Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositorio para detalhes completos.

## Licenca

[Apache-2.0](../../LICENSE)
