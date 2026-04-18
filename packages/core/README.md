# @precisa-saude/fhir

Tipos FHIR R4, 180+ definições de biomarcadores com códigos LOINC, faixas de referência (SBPC/ML, SBC, SBD), conversores e importadores para o contexto clínico brasileiro.

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

const all = getAllDefinitions(); // 180+ definições
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

| Sub-path            | Descrição                                                             |
| ------------------- | --------------------------------------------------------------------- |
| `/biomarkers`       | 180+ definições com códigos LOINC, nomes pt/en, categorias            |
| `/reference-ranges` | Faixas de referência por sexo/idade/gestação (SBPC/ML, SBC, SBD, OMS) |
| `/converter`        | Converte dados laboratoriais para FHIR R4 Bundle                      |
| `/importer`         | Importa FHIR Bundle de volta para estruturas internas                 |
| `/units`            | Mapeamento de unidades, conversão para UCUM                           |
| `/validators`       | Validação de recursos FHIR (DiagnosticReport, Observation, Bundle)    |

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

O metadado opcional `fastingRequired` em `BiomarkerReferenceRange` indica se a amostra exige jejum estrito (ex.: `Glucose`, `Insulin`, `HOMA_IR`) ou se o jejum é preferido mas não obrigatório (ex.: `Triglycerides`, que aceita dosagem não-jejum por SBC 2017/2025).

## Aviso médico

Este pacote fornece ferramentas de software para padronização de dados clínicos. **Não substitui orientação médica profissional.** Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositório para detalhes completos.

## Licença

[Apache-2.0](../../LICENSE)
