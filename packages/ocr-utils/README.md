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

1. **Ancoragem (este pacote):** Escaneia o texto OCR bruto procurando nomes de biomarcadores conhecidos contra as 180+ definições de `@precisa-saude/fhir`.

2. **Filtragem:** Gera uma referência LLM filtrada (`filteredReference`) contendo apenas os biomarcadores que foram realmente encontrados no texto. O LLM só pode extrair valores para biomarcadores presentes nesta lista.

3. **Extração (LLM):** O modelo de linguagem recebe o texto OCR junto com a referência filtrada, restringindo sua saída apenas aos biomarcadores ancorados.

Este fluxo em dois estágios garante que o LLM não invente biomarcadores que não estão presentes no documento original.

```
PDF → OCR → findBiomarkersInText() → filteredReference → LLM → valores extraídos
                    |                                                      |
                    +── restringe quais biomarcadores ─────────────────────+
                        o LLM pode extrair
```

### Regras de correspondência

Uma âncora falsa é cara: ela envia ao LLM uma referência de biomarcadores que
não estão no documento, convidando o modelo a preencher valores inexistentes.
Por isso a correspondência é conservadora:

- **Fronteira de token** — o nome precisa aparecer inteiro. `Color` não casa
  dentro de "Colorectal", nem `Cholesterol` dentro de "Hypercholesterolemia".
  Plurais impressos pelos laboratórios ("Proteínas", "Cetonas") continuam
  ancorando no nome singular do catálogo.
- **Nome mais longo vence** — em sobreposição, o casamento mais específico
  prevalece: "HDL Cholesterol" ancora `HDL`, não `Cholesterol`; "Blood Glucose"
  ancora `Glucose`, não `Blood_Urine`.
- **Nomes de uma linha só** — nos layouts em coluna dos laudos, linhas
  consecutivas são biomarcadores distintos, então um nome composto não
  atravessa quebra de linha ("Colesterol\nHDL" não vira "Colesterol HDL").
- **Co-ocorrência de valor para nomes genéricos** — nomes que também são
  palavras comuns (`Color`, `Protein`, `Blood`, `Volume`, `Peso`) só ancoram se
  a linha carregar um valor: um número, uma unidade conhecida, ou um termo
  qualitativo esperado ("Negativo", "Ausente", "Amarelo Citrino"). "Specimen
  type: Blood" não ancora; "Sangue Oculto: Negativo" ancora.
- **Contexto genético é descartado** — símbolos de gene colidem com nomes de
  biomarcador (o gene `APOB` vs. a lipoproteína `ApoB`). Linhas com acesso
  RefSeq (`NM_000384.2`), notação HGVS (`p.Trp448*`, `c.1234A>G`), `rs` do dbSNP
  ou vocabulário de laudo genético não ancoram. É o contexto que decide, não uma
  lista de símbolos proibidos — bani-los quebraria laudos lipídicos reais.

## API

### `findBiomarkersInText(ocrText: string): AnchorResult`

Escaneia texto OCR e retorna todos os biomarcadores encontrados — um casamento
por código, o de maior confiança.

- `result.matches` — Lista de biomarcadores encontrados com código, LOINC, nome, confiança e posição
- `result.filteredReference` — Referência formatada para enviar ao LLM
- `result.stats` — Estatísticas de execução (total de padrões, encontrados, tempo)

`position` é o índice no texto normalizado (sem acentos, minúsculas, espaços
horizontais colapsados), não no texto OCR original.

#### Confiança

`match.confidence` reflete a qualidade do casamento — nome completo ao lado de
um valor não é a mesma coisa que uma menção solta em prosa:

| Valor | Constante                   | Significado                                                              |
| ----- | --------------------------- | ------------------------------------------------------------------------ |
| `1.0` | `CONFIDENCE_VALUE_ADJACENT` | Nome específico com valor na mesma linha (`Glicose: 95 mg/dL`)           |
| `0.7` | `CONFIDENCE_NAME_ONLY`      | Nome específico sem valor por perto (cabeçalho de seção, menção solta)   |
| `0.4` | `CONFIDENCE_AMBIGUOUS`      | Nome genérico que só ancorou por causa do valor ao lado (`Cor: Amarelo`) |

### `getMatchedCodes(result: AnchorResult): string[]`

Extrai a lista de códigos de biomarcadores de um resultado de ancoragem.

## Aviso médico

Este pacote fornece utilitários de processamento de texto para extração de dados laboratoriais. **Não substitui orientação médica profissional.** Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositório para detalhes completos.

## Licença

[Apache-2.0](../../LICENSE)
