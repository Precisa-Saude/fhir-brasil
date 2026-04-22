# Biomarcadores

Documentação de referência sobre o modelo de dados de biomarcadores, categorias, consultas e faixas de referência.

## Modelo de dados: `BiomarkerDefinition`

Cada biomarcador é definido pela interface `BiomarkerDefinition`:

```typescript
interface BiomarkerDefinition {
  code: string; // Código interno canônico (ex: "HDL", "HbA1c")
  loinc?: string; // Código LOINC principal (ex: "2085-9")
  loincAliases?: string[]; // Códigos LOINC alternativos
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
  max?: number; // Limite superior da faixa normal
  optimalMin?: number; // Limite inferior da faixa ótima
  optimalMax?: number; // Limite superior da faixa ótima
  warningMax?: number; // Limite superior de alerta
  unit: string; // Unidade da faixa
}

interface BiomarkerRangeDefinition {
  default: BiomarkerReferenceRange; // Faixa padrão (fallback)
  variants?: RangeVariant[]; // Variantes por sexo/idade
  direction?: 'range' | 'higher-better' | 'lower-better';
  source?: string; // Referência bibliográfica
}
```

O campo `direction` indica a interpretação clínica:

- `range` (padrão): acima do máximo **e** abaixo do mínimo são anormais
- `higher-better`: acima do máximo é normal (ex: HDL, BMC)
- `lower-better`: abaixo do mínimo é normal (ex: LDL, CRP)

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
