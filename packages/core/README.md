# @precisa-saude/fhir

Tipos FHIR R4, catálogo de biomarcadores com códigos LOINC, faixas de referência (SBPC/ML, SBC, SBD), conversores e importadores para o contexto clínico brasileiro.

As contagens do catálogo — quantos biomarcadores, quantos com LOINC, quantas faixas — ficam em [Catálogo em números](../../README.md#catálogo-em-números), geradas a partir deste pacote.

## Instalação

```bash
npm install @precisa-saude/fhir
```

## Uso rápido

### Faixas de referência

```ts
import { getReferenceRange } from '@precisa-saude/fhir';

const range = getReferenceRange('Cholesterol');
// { min: 0, max: 190, optimalMax: 190, unit: 'mg/dL', ... }

const rangeForUser = getReferenceRange('HDL', { sex: 'F', age: 35 });
// Faixa ajustada por sexo e idade
```

### Converter resultados laboratoriais para FHIR R4

```ts
import { labResultToFHIRBundle } from '@precisa-saude/fhir';

const bundle = labResultToFHIRBundle(report, observations, userProfile);
// Retorna um FHIR Bundle com DiagnosticReport, Observations e Patient
```

### Resultado ordinal codificado

Resultado em texto que tem resposta conhecida ("Negativo", "Não reagente",
"Traços", "Positivo", "Reagente", "+" a "++++", "Normal", "Ausente",
"Presente") sai em `valueCodeableConcept` com dois codings, a resposta LOINC
(`LA…`) e o qualificador SNOMED CT, e o texto impresso em `text`. Grafia sem
resposta conhecida ("Raras") continua em `valueString`.

```ts
import { labObservationToFHIR, ordinalAnswerFor } from '@precisa-saude/fhir';

labObservationToFHIR({ ...obs, value: 'Traços' }, patientId).valueCodeableConcept;
// {
//   coding: [
//     { system: 'http://loinc.org', code: 'LA11832-5', display: 'Trace' },
//     { system: 'http://snomed.info/sct', code: '260405006', display: 'Trace' },
//   ],
//   text: 'Traços',
// }

ordinalAnswerFor('++'); // { loinc: { code: 'LA11842-4', ... }, snomed: { code: '260348001', ... } }
```

O importador lê `valueCodeableConcept` de volta: o texto vai para `value` e o
código LOINC de resposta para `answerCode`, traduzido do SNOMED CT quando o
Bundle só traz ele. Passar `answerCode` ao conversor mantém o código numa ida
e volta mesmo com grafia fora da tabela.

### Normalizar códigos de biomarcadores

```ts
import { normalizeCode, codeToLoinc, loincToCode } from '@precisa-saude/fhir';

normalizeCode('CholHDL_Ratio'); // 'Cholesterol_HDL_Ratio'
codeToLoinc('HDL'); // '2085-9'
loincToCode('2085-9'); // 'HDL'
```

### Consultar definições de biomarcadores

```ts
import { getDefinitionByCode, getAllDefinitions } from '@precisa-saude/fhir';

const def = getDefinitionByCode('HDL');
// { code: 'HDL', loinc: '2085-9', names: { pt: [...], en: [...] }, ... }

const all = getAllDefinitions(); // todo o catálogo
```

### URLs das extensões do IG

Quem emite e quem lê uma extensão do IG precisa concordar na URL. As constantes
saem do pacote raiz, conferidas por teste contra o FSH do IG:

```ts
import { FHIR_BRASIL_EXTENSIONS } from '@precisa-saude/fhir';

const source = observation.extension?.find(
  (e) => e.url === FHIR_BRASIL_EXTENSIONS.extractionSource,
);
```

## Sub-path imports

Para tree-shaking otimizado, cada módulo pode ser importado individualmente:

```ts
import { BIOMARKER_DEFINITIONS } from '@precisa-saude/fhir/biomarkers';
import { getReferenceRange } from '@precisa-saude/fhir/reference-ranges';
import { labResultToFHIRBundle } from '@precisa-saude/fhir/converter';
import { processImportBundle } from '@precisa-saude/fhir/importer';
import { getCanonicalUnit, unitToUCUM } from '@precisa-saude/fhir/units';
import { validateFHIRObservation } from '@precisa-saude/fhir/validators';
```

## Módulos

| Sub-path            | Descrição                                                                 |
| ------------------- | ------------------------------------------------------------------------- |
| `/biomarkers`       | Definições com códigos LOINC, nomes pt/en, sub-categorias                 |
| `/category-groups`  | Agrupamento de 10 categorias clínicas top-level sobre 20 subcategorias    |
| `/reference-ranges` | Faixas de referência por sexo/idade/gestação (SBPC/ML, SBC, SBD, OMS)     |
| `/converter`        | Converte dados laboratoriais para FHIR R4 Bundle                          |
| `/importer`         | Importa FHIR Bundle de volta para estruturas internas                     |
| `/units`            | Mapeamento de unidades, conversão para UCUM (`resolveUcum`, `isUcumCode`) |
| `/validators`       | Validação de recursos FHIR (DiagnosticReport, Observation, Bundle)        |

## Escopo das faixas de referência

As faixas em `/reference-ranges` são **validadas para adultos (≥18 anos)**. Variantes pediátricas não estão incluídas — consumidores que atendem populações pediátricas devem adicionar suas próprias faixas ou buscar fontes específicas (SBP, protocolos neonatais).

Variantes gestacionais estão disponíveis para `TSH`, `Hgb`, `Ferritin`, `Creatinine` e `Glucose`. Para usar, passe `pregnant: true` e, quando conhecido, `pregnancyTrimester` no `ReferenceRangeContext`:

```ts
const range = getReferenceRange('TSH', {
  biologicalSex: 'F',
  pregnant: true,
  pregnancyTrimester: 1,
});
// → { max: 2.5, min: 0.1, ... } (alvo ATA 2017 para 1º trimestre)
```

Cada faixa diz que tipo de afirmação ela é (`kind`: intervalo de referência do ensaio, limiar de decisão de diretriz ou distribuição populacional) e, por limite, se ele é corte clínico ou só desenho (`minKind`/`maxKind`). Para sinalizar um valor contra a faixa do catálogo, use `flagAgainstCatalogRange`, que ignora os limites de desenho; o `direction` diz para que lado o marcador melhora e não decide flag. Detalhes em [docs/biomarcadores.md](../../docs/biomarcadores.md#tipo-da-faixa).

O metadado opcional `fastingRequired` em `BiomarkerReferenceRange` indica se a amostra exige jejum estrito (ex.: `Glucose`, `Insulin`, `HOMA_IR`) ou se o jejum é preferido mas não obrigatório (ex.: `Triglycerides`, que aceita dosagem não-jejum por SBC 2017/2025).

## Aviso médico

Este pacote fornece ferramentas de software para padronização de dados clínicos. **Não substitui orientação médica profissional.** Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositório para detalhes completos.

## Licença

[Apache-2.0](../../LICENSE)

### Conteúdo LOINC

Este pacote incorpora códigos LOINC, que têm licença própria — permissiva e sem
custo, mas com aviso exigido:

> This material contains content from LOINC (http://loinc.org). LOINC is
> copyright © Regenstrief Institute, Inc. and the Logical Observation
> Identifiers Names and Codes (LOINC) Committee and is available at no cost
> under the license at http://loinc.org/license. LOINC® is a registered United
> States trademark of Regenstrief Institute, Inc.

### Conteúdo SNOMED CT

As respostas codificadas (`ORDINAL_ANSWERS`) trazem, ao lado do LOINC, 12
qualificadores SNOMED CT (identificador e termo preferido). O Brasil é membro
da SNOMED International, e o uso no país não tem custo, mas a SNOMED pede o
registro do uso no centro nacional de distribuição. Fora dos países membros, o
uso depende de licença de afiliado.

> This material includes content from SNOMED Clinical Terms® (SNOMED CT®),
> which is copyright of the International Health Terminology Standards
> Development Organisation (IHTSDO), trading as SNOMED International.
> Implementers must have the appropriate SNOMED CT Affiliate license; see
> http://www.snomed.org/snomed-ct/get-snomed-ct or contact info@snomed.org.
