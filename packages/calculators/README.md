# @precisa-saude/fhir-calculators

Calculadoras clínicas — PhenoAge (Levine 2018), BrDMrisc (Bracco 2023), biomarcadores derivados (HOMA-IR, VLDL, IMC).

## Instalação

```bash
npm install @precisa-saude/fhir-calculators
```

> **Nota:** Requer `@precisa-saude/fhir` como peer dependency.

## Uso rápido

### PhenoAge — Idade biológica

Implementação do algoritmo de Levine et al. (2018) para cálculo de idade biológica a partir de 9 biomarcadores sanguíneos.

```ts
import { phenoage } from '@precisa-saude/fhir-calculators';

const result = phenoage.calculatePhenoAge({
  chronologicalAge: 45,
  albumin: 42, // g/L
  creatinine: 80, // μmol/L
  glucose: 5.2, // mmol/L
  crp: 1.5, // mg/L (PCR ultrassensível — convertida para mg/dL internamente)
  lymphocytePercent: 30,
  mcv: 88, // fL
  rdw: 13.2, // %
  alkalinePhosphatase: 65, // U/L
  wbc: 6.0, // 10^9/L
});

console.log(result.phenoAge); // 39.5 (idade biológica)
console.log(result.ageDifference); // -5.5 (anos mais jovem)
```

> **Unidade da PCR:** o modelo de Levine foi ajustado sobre dados do NHANES IV,
> onde a PCR é medida em **mg/dL**. O campo `crp` desta API permanece em
> **mg/L** — a unidade reportada pelos laboratórios brasileiros (PCR
> ultrassensível) — e o cálculo converte mg/L → mg/dL antes do termo
> `0.0954·ln(PCR)`. Não pré-converta a PCR para mg/dL ao chamar a função.

### BrDMrisc — Risco de diabetes tipo 2

Implementação do modelo BrDMrisc (Bracco et al. 2023) para estimativa de risco de diabetes tipo 2 em 10 anos, validado para a população brasileira. Seleciona automaticamente o melhor modelo disponível com base nos biomarcadores presentes.

```ts
import { brdmrisc } from '@precisa-saude/fhir-calculators';

const result = brdmrisc.calculateBrDMrisc({
  fpg: 105, // mg/dL — glicemia de jejum
  hba1c: 5.8, // %
  triglycerides: 180, // mg/dL
  hdlc: 42, // mg/dL
});

console.log(result.riskPercent); // 18.5 (% risco em 10 anos)
console.log(result.riskCategory); // 'moderate'
console.log(result.modelUsed.name); // 'FPG + HbA1c + Lipids'
```

### Biomarcadores derivados

Calcula biomarcadores derivados a partir de valores laboratoriais existentes.

```ts
import { computeDerivedBiomarkers } from '@precisa-saude/fhir-calculators';

const derived = computeDerivedBiomarkers([
  { code: 'Glucose', value: 95 },
  { code: 'Insulin', value: 12.0 },
  { code: 'Triglycerides', value: 150 },
]);

// Retorna: HOMA-IR = (95 × 12) / 405, VLDL = 150 / 5
derived.forEach((d) => console.log(`${d.code}: ${d.value} ${d.unit}`));
```

## Referências acadêmicas

| Calculadora | Referência                                                                            |
| ----------- | ------------------------------------------------------------------------------------- |
| PhenoAge    | Levine ME et al. (2018). An epigenetic biomarker of aging. _Aging_ 10(4):573-591      |
| BrDMrisc    | Bracco PA et al. (2023). BrDMrisc model for type 2 diabetes risk in Brazilians        |
| HOMA-IR     | Matthews DR et al. (1985). Homeostasis model assessment. _Diabetologia_ 28(7):412-419 |
| VLDL        | Friedewald WT et al. (1972). Estimation of LDL cholesterol. _Clin Chem_ 18(6):499-502 |

## Aviso médico

Este pacote implementa algoritmos clínicos publicados para fins de software. Os resultados **não constituem diagnóstico médico** e não substituem avaliação profissional. Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositório para detalhes completos.

## Licença

[Apache-2.0](../../LICENSE)
