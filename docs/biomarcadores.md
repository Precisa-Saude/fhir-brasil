# Biomarcadores

Documentação de referência sobre o modelo de dados de biomarcadores, categorias, consultas e faixas de referência.

## Modelo de dados: `BiomarkerDefinition`

Cada biomarcador é definido pela interface `BiomarkerDefinition`:

```typescript
interface BiomarkerDefinition {
  code: string; // Código interno canônico (ex: "HDL", "HbA1c")
  loinc?: string; // Código LOINC principal (ex: "2085-9")
  loincAliases?: string[]; // Códigos LOINC antigos para a mesma coisa
  methodVariants?: MethodVariant[]; // Códigos irmãos que diferem só no método
  codeAliases?: string[]; // Aliases do código interno (ex: "HDL_Cholesterol")
  names: {
    pt: string[]; // Nomes em português (primeiro = nome principal)
    en: string[]; // Nomes em inglês
  };
  category: string | string[]; // Categoria(s) clínica(s)
  unit?: string; // Unidade padrão (ex: "mg/dL")
  sex?: 'male' | 'female' | 'both'; // Relevância por sexo
  hidden?: boolean; // Se true, extraído mas não exibido na UI
}
```

O campo `code` é a chave canônica usada em todo o sistema. Os campos `codeAliases` e `loincAliases` permitem mapear variações encontradas em diferentes laboratórios.

### Código LOINC por método

Alguns analitos têm códigos LOINC irmãos que diferem só no eixo Method. O LDL é o caso do catálogo: `2089-1` não declara método, `13457-7` é calculado, `96259-7` é calculado por Martin-Hopkins e `18262-6` é dosagem direta. O `loinc` da entrada continua sendo o código sem método, e é o que sai quando o laudo não afirma o método.

```typescript
interface MethodVariant {
  loinc: string; // O código por método
  method: string; // A parte Method do LOINC, como o snapshot a registra
  cues: { pt: string[]; en: string[] }; // Trechos que afirmam o método
  note?: string; // Por que este código, e de onde veio a pista
}
```

A varredura do `@precisa-saude/fhir-ocr-utils` procura as pistas por token inteiro na linha do exame, na de cima e nas seguintes até o próximo exame, e preenche `methodLoinc` no casamento. O modelo não escolhe método. Pistas de duas variantes no mesmo trecho deixam o exame sem método.

Só entra pista que aparece em laudo real. Medido em out/2026 sobre três dezenas de laudos reais, a única foi o rodapé de um laboratório norte-americano que declara o cálculo de Martin-Hopkins; nenhum laudo brasileiro do corpus imprimiu o método perto do LDL. As variantes `13457-7` e `18262-6` estão declaradas sem pista, e o conversor as aceita quando quem chama informa o método por `methodLoinc`.

`loincToCode` resolve o código por método para o biomarcador, `codeToLoinc` continua devolvendo o código sem método, e `methodVariantOf(code, loinc)` diz se um código é variante declarada daquele biomarcador. Toda variante está no `loinc-snapshot.json`, conferida pelo `verify-loinc.ts`, e no `BRLabTestVS`.

### Registro de decisão

O catálogo guarda a conclusão; `mapping-decisions.ts` guarda o porquê. Cada biomarcador com LOINC tem um registro com a evidência que o laudo mostrou (`name`, `unit`, `method-line`, `specimen`, `assay-insert`), qual delas decidiu (`settledBy`), os irmãos descartados com o motivo (`siblingsRejected`) e, quando houver revisão independente, `reviewer`, `reviewedAt` e `loincVersion`.

A maioria dos registros é só nome: o código foi escolhido pelo nome do exame, sem outra evidência registrada. É o registro honesto do que existe, e a revisão independente vai preenchendo o resto. O registro repete o `loinc` do catálogo, e um teste falha quando os dois divergem: trocar o código sem atualizar o registro não passa.

Entrada sem LOINC tem um motivo em `NO_LOINC_DECISIONS`: `no-concept` (procurado, e o LOINC não tem), `ambiguous` (há candidatos, e nenhum é a mesma grandeza), `pending-review` (ninguém registrou a busca) ou `not-lab`. A lista está no README, gerada por `pnpm catalog:counts`.

`fhir-bio decision <código ou LOINC>` imprime a ficha no formato da planilha de um mapeador: nome local, unidade, material, método, candidatos com os seis eixos, escolhido, rejeitados, grupos LOINC, revisor e versão. Os eixos e os grupos vêm de uma cópia do snapshot publicada no pacote (`LOINC_SNAPSHOT`, com o aviso da licença do LOINC), e `getMappingSheet()` devolve a mesma ficha como objeto.

```typescript
import { getMappingSheet } from '@precisa-saude/fhir';

const ficha = getMappingSheet('2089-1');
// ficha.code === 'LDL', ficha.specimen === 'Ser/Plas', ficha.method === null
// ficha.candidates: o escolhido e as três variantes por método
```

## Categorias

Os biomarcadores são organizados nas seguintes categorias clínicas:

| Categoria                 | Chave                     | Exemplos                                                |
| ------------------------- | ------------------------- | ------------------------------------------------------- |
| Coração                   | `coracao`                 | HDL, LDL, ApoB, CRP, Triglicerídeos, Lp(a)              |
| Tireoide                  | `tireoide`                | TSH, T3 Livre, T4 Livre, Anti-TPO                       |
| Autoimunidade             | `autoimunidade`           | FAN, Anti-TPO, FR, Anti-CCP                             |
| Regulação imunológica     | `regulacao-imunologica`   | Leucócitos, Linfócitos, Neutrófilos, Hemoglobina        |
| Saúde feminina            | `saude-feminina`          | Estradiol, FSH, Progesterona                            |
| Saúde masculina           | `saude-masculina`         | Testosterona Total, PSA                                 |
| Hormônios                 | `hormonios`               | Cortisol, DHEA-S, IGF-1                                 |
| Metabólico                | `metabolico`              | Glicose, HbA1c, Insulina, HOMA-IR, Ácido Úrico          |
| Toxinas ambientais        | `toxinas-ambientais`      | Chumbo, Mercúrio                                        |
| Nutrientes                | `nutrientes`              | Vitamina D, B12, Ferro, Zinco, Magnésio, Folato         |
| Estresse e envelhecimento | `estresse-envelhecimento` | 8-OHdG                                                  |
| Fígado                    | `figado`                  | ALT, AST, GGT, Bilirrubina, Fosfatase Alcalina          |
| Sangue                    | `sangue`                  | Hemácias, Hemoglobina, Hematócrito, VCM, RDW, Plaquetas |
| Rins                      | `rins`                    | Creatinina, Ureia, TFG, Cistatina C, Ácido Úrico        |
| Pâncreas                  | `pancreas`                | Amilase, Lipase                                         |
| Eletrólitos               | `eletrolitos`             | Sódio, Potássio                                         |
| Urina                     | `urina`                   | EAS (elementos e sedimentos), pH, Proteínas             |
| Marcadores tumorais       | `marcadores-tumorais`     | PSA, CEA, AFP                                           |
| Composição corporal       | `composicao-corporal`     | IMC, Gordura Corporal, Massa Magra (DEXA)               |
| Densidade óssea           | `densidade-ossea`         | T-Score, Z-Score, BMD, BMC                              |

## Consultando definições

### Por código interno

```typescript
import { getDefinitionByCode, normalizeCode } from '@precisa-saude/fhir';

// Busca direta pelo código canônico
const def = getDefinitionByCode('HDL');
console.log(def?.names.pt[0]); // "Colesterol HDL"
console.log(def?.loinc); // "2085-9"
console.log(def?.category); // "coracao"
console.log(def?.unit); // "mg/dL"
```

### Por código LOINC

```typescript
import { getDefinitionByLoinc } from '@precisa-saude/fhir';

const def = getDefinitionByLoinc('2085-9');
console.log(def?.code); // "HDL"
console.log(def?.names.pt[0]); // "Colesterol HDL"
```

### Normalizar aliases

Diferentes laboratórios podem usar variações do mesmo código. A função `normalizeCode` converte aliases para o código canônico:

```typescript
import { normalizeCode } from '@precisa-saude/fhir';

normalizeCode('HDL_Cholesterol'); // "HDL"
normalizeCode('HDL'); // "HDL" (já é canônico)
normalizeCode('DesconhecidoXYZ'); // "DesconhecidoXYZ" (retorna sem alteração)
```

**Quando usar**: sempre que receber códigos de fontes externas (OCR, importação, APIs de terceiros). Isso garante consistência em todo o sistema.

### Converter código para LOINC

```typescript
import { codeToLoinc } from '@precisa-saude/fhir';

codeToLoinc('HDL'); // "2085-9"
codeToLoinc('HbA1c'); // "4548-4"
codeToLoinc('XYZ'); // undefined (código desconhecido)
```

### Listar todos os biomarcadores

```typescript
import {
  getAllDefinitions,
  getVisibleDefinitions,
  getDefinitionsBySex,
  getAllCodes,
} from '@precisa-saude/fhir';

// Todas as definições (incluindo hidden)
const todas = getAllDefinitions();

// Apenas visíveis (exclui hidden)
const visiveis = getVisibleDefinitions();

// Filtrar por sexo
const femininos = getDefinitionsBySex('female');

// Apenas os códigos canônicos
const codigos = getAllCodes();
```

## Faixas de referência

### Modelo de dados

As faixas de referência são definidas pela interface `BiomarkerRangeDefinition`:

```typescript
interface BiomarkerReferenceRange {
  min?: number; // Limite inferior da faixa normal
  minKind?: 'clinical' | 'display'; // Ausente vale 'clinical'
  max?: number; // Limite superior da faixa normal
  maxKind?: 'clinical' | 'display'; // Ausente vale 'clinical'
  kind?: RangeKind; // Preenchido pela consulta, a partir da definição
  optimalMin?: number; // Limite inferior da faixa ótima
  optimalMax?: number; // Limite superior da faixa ótima
  warningMax?: number; // Limite superior de alerta
  unit: string; // Unidade da faixa
}

interface BiomarkerRangeDefinition {
  default: BiomarkerReferenceRange; // Faixa padrão (fallback)
  variants?: RangeVariant[]; // Variantes por sexo/idade
  direction?: 'range' | 'higher-better' | 'lower-better';
  kind?: 'reference-interval' | 'decision-threshold' | 'population';
  loinc?: string; // Código para o qual a faixa vale, quando ela depende do ensaio
  source?: string; // Referência bibliográfica
}
```

O campo `direction` diz para que lado o marcador melhora, e serve à cor e ao gauge:

- `range` (padrão): os dois lados se afastam do saudável
- `higher-better`: subir é bom (ex: HDL, BMC)
- `lower-better`: descer é bom (ex: LDL, CRP)

Ele **não** decide flag. Até a 0.33 ele fazia esse segundo trabalho, e os dois se separam na composição corporal: o `BodyFatPct` é `lower-better`, mas o piso dele vem da faixa saudável da fonte e é corte clínico.

### Tipo da faixa

O `kind` diz que tipo de afirmação a faixa faz. Toda definição do catálogo declara o seu:

- `reference-interval`: intervalo de referência do ensaio, tirado de uma população de referência saudável
- `decision-threshold`: limiar de decisão de diretriz ou de estudo de risco (meta de LDL, corte de pré-diabetes, estágio de DRC)
- `population`: distribuição numa população sem filtro de saúde (NHANES, coortes de base populacional)

Uma banda de "faixa normal" que misture os três diz coisas diferentes conforme o marcador. A classificação de cada fonte, com o motivo, está em [fontes-referencia.md](fontes-referencia.md#tipo-de-cada-faixa).

Em FHIR, `referenceRangeMeaning(kind)` devolve o código do `referenceRange.type` (`normal` ou `recommended`). A distribuição populacional não tem código no `referencerange-meaning`, e a função devolve `undefined`. O conversor emite o `type` quando o `LabObservationData` traz `referenceKind`.

### Faixa que depende do ensaio

Algumas faixas só valem para um código: o D-dímero em FEU (e não em DDU, que mede cerca de metade), a troponina I do ensaio sensível, a Lp(a) molar. Nelas a definição declara o `loinc` para o qual a faixa vale, e um teste exige que seja o código do biomarcador no catálogo. É o descasamento que nenhum teste de eixo pega: código e unidade concordam entre si, e o erro está entre o código e a fonte da faixa. A maioria das fontes não é de um ensaio, e não declara.

### Limite clínico e limite de desenho

`minKind` e `maxKind` dizem se cada limite é corte clínico. `display` é o limite que existe para a faixa ter dois lados no desenho: o teto de 100 mg/dL do HDL, o piso 2 da HbA1c. A flag contra a faixa do catálogo sai de `flagAgainstCatalogRange`, que ignora o limite `display`:

```typescript
import { flagAgainstCatalogRange } from '@precisa-saude/fhir';

flagAgainstCatalogRange('HDL', 105); // ''  (o teto de 100 é desenho)
flagAgainstCatalogRange('BodyFatPct', 8); // 'L' (o piso é clínico)
flagAgainstCatalogRange('BodyFatPct', 8, { biologicalSex: 'M', age: 30 }); // '' (piso da variante: 5)
```

Ela serve só à faixa do catálogo. Faixa que o laboratório imprimiu é afirmação dele sobre aquela amostra, e a comparação contra ela é crua.

### Consultar faixas de referência

```typescript
import { getReferenceRange } from '@precisa-saude/fhir';

// Faixa padrão (sem contexto)
const faixa = getReferenceRange('Glucose');
// { min: 70, max: 99, optimalMin: 75, optimalMax: 90, unit: 'mg/dL' }

// Faixa personalizada por sexo e idade
const faixaTestosterona = getReferenceRange('Testosterone', {
  biologicalSex: 'M',
  age: 40,
});
```

A função `getReferenceRange` procura a variante mais específica:

1. Verifica se existe variante para o sexo **e** faixa etária informados
2. Se não encontrar, retorna a faixa `default`

### Faixa de fallback (sem personalização)

```typescript
import { getFallbackReferenceRange } from '@precisa-saude/fhir';

const fallback = getFallbackReferenceRange('HDL');
// { min: 40, max: 60, unit: 'mg/dL' }
```

Útil quando não há contexto do paciente disponível (ex: API preenchendo faixas que o LLM não extraiu).

## Fontes de dados

As faixas de referência seguem esta hierarquia de fontes:

1. **SBPC/ML** — Sociedade Brasileira de Patologia Clínica / Medicina Laboratorial
2. **SBC** — Sociedade Brasileira de Cardiologia (lipídios e marcadores cardíacos)
3. **SBD** — Sociedade Brasileira de Diabetes (glicemia, HbA1c, HOMA-IR)
4. **SBEM** — Sociedade Brasileira de Endocrinologia e Metabologia
5. **OMS/WHO** — Padrões internacionais
6. **Laboratórios de referência** — Fleury, Weinmann (quando não há diretriz específica)

Toda contribuição envolvendo dados clínicos deve incluir a referência bibliográfica correspondente (artigo PubMed, diretriz com DOI/ISBN, ou publicação SciELO).
