# @fhir-brasil/calculators

Calculadoras clinicas -- PhenoAge (Levine 2018), BrDMrisc (Bracco 2023), biomarcadores derivados (HOMA-IR, VLDL, IMC).

## Instalacao

```bash
npm install @fhir-brasil/calculators
```

> **Nota:** Requer `@fhir-brasil/core` como peer dependency.

## Uso rapido

### PhenoAge -- Idade biologica

Implementacao do algoritmo de Levine et al. (2018) para calculo de idade biologica a partir de 9 biomarcadores sanguineos.

```ts
import { phenoage } from '@fhir-brasil/calculators';

const result = phenoage.calculatePhenoAge({
  chronologicalAge: 45,
  albumin: 4.2,        // g/dL
  creatinine: 0.9,     // mg/dL
  glucose: 95,         // mg/dL
  crp: 1.5,            // mg/L
  lymphocytePercent: 30,
  mcv: 88,             // fL
  rdw: 13.2,           // %
  alkalinePhosphatase: 65, // U/L
  whiteBloodCells: 6.0,    // 10^3/uL
});

console.log(result.phenoAge);       // 42.3 (idade biologica)
console.log(result.ageAcceleration); // -2.7 (anos mais jovem)
```

### BrDMrisc -- Risco de diabetes tipo 2

Implementacao do modelo BrDMrisc (Bracco et al. 2023) para estimativa de risco de diabetes tipo 2 em 10 anos, validado para a populacao brasileira.

```ts
import { brdmrisc } from '@fhir-brasil/calculators';

const result = brdmrisc.calculateBrDMrisc({
  age: 50,
  sex: 'male',
  bmi: 28.5,
  waistCircumference: 95,    // cm
  fastingGlucose: 105,       // mg/dL
  triglycerides: 180,        // mg/dL
  hdl: 42,                   // mg/dL
  systolicBP: 135,           // mmHg
  familyHistoryDiabetes: true,
});

console.log(result.riskPercent);  // 18.5 (% risco em 10 anos)
console.log(result.riskCategory); // 'moderate'
```

### Biomarcadores derivados

Calcula biomarcadores derivados a partir de valores laboratoriais existentes.

```ts
import { computeDerivedBiomarkers } from '@fhir-brasil/calculators';

const derived = computeDerivedBiomarkers([
  { code: 'insulina-jejum', value: 12.0 },
  { code: 'glicose-jejum', value: 95 },
  { code: 'colesterol-total', value: 200 },
  { code: 'hdl', value: 50 },
  { code: 'triglicerides', value: 150 },
  { code: 'peso', value: 80 },
  { code: 'altura', value: 1.75 },
]);

// Retorna: HOMA-IR, VLDL, LDL (Friedewald), IMC, etc.
derived.forEach(d => console.log(`${d.code}: ${d.value} ${d.unit}`));
```

## Referencias academicas

| Calculadora     | Referencia                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------- |
| PhenoAge        | Levine ME et al. (2018). An epigenetic biomarker of aging. *Aging* 10(4):573-591               |
| BrDMrisc        | Bracco PA et al. (2023). BrDMrisc model for type 2 diabetes risk in Brazilians                 |
| HOMA-IR         | Matthews DR et al. (1985). Homeostasis model assessment. *Diabetologia* 28(7):412-419          |
| VLDL/LDL        | Friedewald WT et al. (1972). Estimation of LDL cholesterol. *Clin Chem* 18(6):499-502          |

## Aviso medico

Este pacote implementa algoritmos clinicos publicados para fins de software. Os resultados **nao constituem diagnostico medico** e nao substituem avaliacao profissional. Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositorio para detalhes completos.

## Licenca

[Apache-2.0](../../LICENSE)
