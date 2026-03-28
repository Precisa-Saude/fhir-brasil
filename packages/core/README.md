# @fhir-brasil/core

Tipos FHIR R4, 183+ definições de biomarcadores com códigos LOINC, faixas de referência (SBPC/ML, SBC, SBD), conversores e importadores para o contexto clínico brasileiro.

## Instalação

```bash
npm install @fhir-brasil/core
```

## Uso rápido

### Faixas de referência

```ts
import { getReferenceRange } from '@fhir-brasil/core';

const range = getReferenceRange('Cholesterol');
// { min: 0, max: 190, optimalMax: 190, unit: 'mg/dL', ... }

const rangeForUser = getReferenceRange('HDL', { sex: 'F', age: 35 });
// Faixa ajustada por sexo e idade
```

### Converter resultados laboratoriais para FHIR R4

```ts
import { labResultToFHIRBundle } from '@fhir-brasil/core';

const bundle = labResultToFHIRBundle(report, observations, userProfile);
// Retorna um FHIR Bundle com DiagnosticReport, Observations e Patient
```

### Normalizar códigos de biomarcadores

```ts
import { normalizeCode, codeToLoinc, loincToCode } from '@fhir-brasil/core';

normalizeCode('CholHDL_Ratio');  // 'Cholesterol_HDL_Ratio'
codeToLoinc('HDL');              // '2085-9'
loincToCode('2085-9');           // 'HDL'
```

### Consultar definições de biomarcadores

```ts
import { getDefinitionByCode, getAllDefinitions } from '@fhir-brasil/core';

const def = getDefinitionByCode('HDL');
// { code: 'HDL', loinc: '2085-9', names: { pt: [...], en: [...] }, ... }

const all = getAllDefinitions(); // 183+ definições
```

## Sub-path imports

Para tree-shaking otimizado, cada módulo pode ser importado individualmente:

```ts
import { BIOMARKER_DEFINITIONS } from '@fhir-brasil/core/biomarkers';
import { getReferenceRange } from '@fhir-brasil/core/reference-ranges';
import { labResultToFHIRBundle } from '@fhir-brasil/core/converter';
import { processImportBundle } from '@fhir-brasil/core/importer';
import { getCanonicalUnit, unitToUCUM } from '@fhir-brasil/core/units';
import { validateFHIRObservation } from '@fhir-brasil/core/validators';
```

## Módulos

| Sub-path              | Descrição                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `/biomarkers`         | 183+ definições com códigos LOINC, nomes pt/en, categorias       |
| `/reference-ranges`   | Faixas de referência por sexo/idade (SBPC/ML, SBC, SBD, OMS)    |
| `/converter`          | Converte dados laboratoriais para FHIR R4 Bundle                 |
| `/importer`           | Importa FHIR Bundle de volta para estruturas internas            |
| `/units`              | Mapeamento de unidades, conversão para UCUM                      |
| `/validators`         | Validação de recursos FHIR (DiagnosticReport, Observation, Bundle) |

## Aviso médico

Este pacote fornece ferramentas de software para padronização de dados clínicos. **Não substitui orientação médica profissional.** Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositório para detalhes completos.

## Licença

[Apache-2.0](../../LICENSE)
