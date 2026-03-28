# @fhir-brasil/core

Tipos FHIR R4, 183+ definicoes de biomarcadores com codigos LOINC, faixas de referencia (SBPC/ML, SBC, SBD), conversores e importadores para o contexto clinico brasileiro.

## Instalacao

```bash
npm install @fhir-brasil/core
```

## Uso rapido

### Faixas de referencia

```ts
import { getReferenceRange } from '@fhir-brasil/core';

const range = getReferenceRange('glicose-jejum', { sex: 'F', age: 35 });
// { min: 70, max: 99, optimalMin: 70, optimalMax: 99, unit: 'mg/dL' }
```

### Converter resultados laboratoriais para FHIR R4

```ts
import { labResultToFHIRBundle } from '@fhir-brasil/core';

const bundle = labResultToFHIRBundle(labReport, userProfile);
// Retorna um FHIR Bundle com DiagnosticReport, Observations e Patient
```

### Normalizar codigos de biomarcadores

```ts
import { normalizeCode, codeToLoinc, loincToCode } from '@fhir-brasil/core';

normalizeCode('Glicose Jejum');  // 'glicose-jejum'
codeToLoinc('glicose-jejum');    // '1558-6'
loincToCode('1558-6');           // 'glicose-jejum'
```

### Consultar definicoes de biomarcadores

```ts
import { getDefinitionByCode, getAllDefinitions } from '@fhir-brasil/core';

const def = getDefinitionByCode('hdl');
// { code: 'hdl', loinc: '2085-9', names: { pt: [...], en: [...] }, ... }

const all = getAllDefinitions(); // 183+ definicoes
```

## Sub-path imports

Para tree-shaking otimizado, cada modulo pode ser importado individualmente:

```ts
import { BIOMARKER_DEFINITIONS } from '@fhir-brasil/core/biomarkers';
import { getReferenceRange } from '@fhir-brasil/core/reference-ranges';
import { labResultToFHIRBundle } from '@fhir-brasil/core/converter';
import { labReportFromFHIR } from '@fhir-brasil/core/importer';
import { getCanonicalUnit, unitToUCUM } from '@fhir-brasil/core/units';
import { validateLabReport } from '@fhir-brasil/core/validators';
```

## Modulos

| Sub-path              | Descricao                                                        |
| --------------------- | ---------------------------------------------------------------- |
| `/biomarkers`         | 183+ definicoes com codigos LOINC, nomes pt/en, categorias       |
| `/reference-ranges`   | Faixas de referencia por sexo/idade (SBPC/ML, SBC, SBD, OMS)    |
| `/converter`          | Converte dados laboratoriais para FHIR R4 Bundle                 |
| `/importer`           | Importa FHIR Bundle de volta para estruturas internas            |
| `/units`              | Mapeamento de unidades, conversao para UCUM                      |
| `/validators`         | Validacao de dados laboratoriais                                 |

## Aviso medico

Este pacote fornece ferramentas de software para padronizacao de dados clinicos. **Nao substitui orientacao medica profissional.** Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositorio para detalhes completos.

## Licenca

[Apache-2.0](../../LICENSE)
