# Calculadoras Clínicas

O pacote `@precisa-saude/fhir-calculators` implementa calculadoras clínicas validadas para uso no contexto brasileiro. Atualmente inclui:

- **PhenoAge** — idade biológica baseada em biomarcadores
- **BrDMrisc** — risco de diabetes tipo 2 em 10 anos (população brasileira)
- **Biomarcadores derivados** — HOMA-IR, VLDL, IMC

## PhenoAge

### O que é

PhenoAge é uma estimativa de idade biológica baseada em 9 biomarcadores sanguíneos de rotina, desenvolvida por Levine et al. (2018). O algoritmo utiliza um modelo de riscos proporcionais de Cox (Gompertz) para calcular um "escore de mortalidade" e convertê-lo em idade biológica.

**Referência**: Levine, M.E. et al. "An epigenetic biomarker of aging for lifespan and healthspan." *Aging*, 10(4), 573-591, 2018. DOI: 10.18632/aging.101414

### Biomarcadores necessários

Todos os valores devem estar em **unidades SI**:

| Biomarcador | Campo | Unidade SI | Unidade convencional (BR) |
|-------------|-------|------------|---------------------------|
| Albumina | `albumin` | g/L | g/dL |
| Creatinina | `creatinine` | μmol/L | mg/dL |
| Glicose | `glucose` | mmol/L | mg/dL |
| PCR (Proteína C-Reativa) | `crp` | mg/L | mg/L ou mg/dL |
| Linfócitos | `lymphocytePercent` | % | % |
| VCM (Volume Corpuscular Médio) | `mcv` | fL | fL |
| RDW | `rdw` | % | % |
| Fosfatase Alcalina | `alkalinePhosphatase` | U/L | U/L |
| Leucócitos | `wbc` | 10^9/L | /μL ou 10³/μL |

### Uso básico

```typescript
import { phenoage } from '@precisa-saude/fhir-calculators';

const resultado = phenoage.calculatePhenoAge({
  albumin: 42,              // g/L
  creatinine: 80,           // μmol/L
  glucose: 5.2,             // mmol/L
  crp: 1.5,                 // mg/L
  lymphocytePercent: 30,    // %
  mcv: 88,                  // fL
  rdw: 12.5,                // %
  alkalinePhosphatase: 65,  // U/L
  wbc: 6.2,                 // 10^9/L
  chronologicalAge: 45,
});

console.log(resultado.phenoAge);       // Idade biológica estimada
console.log(resultado.ageDifference);  // Diferença em relação à idade cronológica
console.log(resultado.mortalityScore); // Escore de mortalidade (0-1)
console.log(resultado.breakdown);      // Contribuição de cada biomarcador
```

### Conversão automática de unidades (`autoConvertToSI`)

Laboratórios brasileiros frequentemente reportam em unidades convencionais. A função `autoConvertToSI` converte automaticamente:

```typescript
import { phenoage } from '@precisa-saude/fhir-calculators';

// Albumina: g/dL → g/L
const albumina = phenoage.autoConvertToSI('albumin', 4.2, 'g/dL');
// { value: 42, unit: 'g/L', wasConverted: true }

// Creatinina: mg/dL → μmol/L
const creatinina = phenoage.autoConvertToSI('creatinine', 0.9, 'mg/dL');
// { value: 79.56, unit: 'μmol/L', wasConverted: true }

// Glicose: mg/dL → mmol/L
const glicose = phenoage.autoConvertToSI('glucose', 92, 'mg/dL');
// { value: 5.106, unit: 'mmol/L', wasConverted: true }

// Leucócitos: /μL → 10^9/L
const wbc = phenoage.autoConvertToSI('wbc', 6200, '/μL');
// { value: 6.2, unit: '10^9/L', wasConverted: true }
```

Se a unidade não for informada, a função usa heurísticas baseadas na faixa de valores típica para detectar a unidade de origem.

### Validação

```typescript
import { phenoage } from '@precisa-saude/fhir-calculators';

const validacao = phenoage.validateBiomarkers({
  albumin: 42,
  creatinine: 80,
  glucose: 5.2,
  crp: 1.5,
  lymphocytePercent: 30,
  mcv: 88,
  rdw: 12.5,
  alkalinePhosphatase: 65,
  wbc: 6.2,
  chronologicalAge: 45,
});

console.log(validacao.isValid); // true
console.log(validacao.errors);  // [] (vazio se válido)
```

### Conversões suportadas

| Biomarcador | De | Para | Fator |
|-------------|-----|------|-------|
| Albumina | g/dL | g/L | ×10 |
| Creatinina | mg/dL | μmol/L | ×88.4 |
| Glicose | mg/dL | mmol/L | ÷18.0182 |
| PCR | mg/dL | mg/L | ×10 |
| Leucócitos | /μL | 10^9/L | ÷1000 |

---

## BrDMrisc

### O que é

BrDMrisc (Brazilian Diabetes Mellitus Risk Score) é um escore de risco de diabetes tipo 2 em 10 anos, desenvolvido e validado na coorte ELSA-Brasil. É o primeiro modelo de risco de DM2 específico para a população brasileira.

**Referência**: Bracco, P.A. et al. "BrDMrisc: a Brazilian diabetes risk score for screening of type 2 diabetes mellitus." *Frontiers in Endocrinology*, 14:1166147, 2023. DOI: 10.3389/fendo.2023.1166147

### Modelos disponíveis

O BrDMrisc oferece 14 modelos com diferentes combinações de biomarcadores. Os 6 modelos laboratoriais (lab-only) são usados quando apenas dados de exames estão disponíveis:

| Modelo | Nome | Biomarcadores | AUC |
|--------|------|---------------|-----|
| 6 | Glicemia + HbA1c + Lipídios | FPG, HbA1c, TG, HDL-c | 0.813 |
| 5 | Glicemia + Lipídios | FPG, TG, HDL-c | 0.796 |
| 3 | Glicemia + HbA1c | FPG, HbA1c | 0.793 |
| 4 | Glicemia + Triglicerídeos | FPG, TG | 0.790 |
| 1 | Apenas Glicemia de Jejum | FPG | 0.776 |
| 2 | Apenas HbA1c | HbA1c | 0.668 |

A seleção de modelo é **automática**: a calculadora escolhe o modelo com maior AUC dentre aqueles cujos biomarcadores estão disponíveis.

### Unidades esperadas

| Biomarcador | Campo | Unidade |
|-------------|-------|---------|
| Glicemia de jejum | `fpg` | mg/dL |
| Hemoglobina glicada | `hba1c` | % (NGSP) |
| Triglicerídeos | `triglycerides` | mg/dL |
| HDL-colesterol | `hdlc` | mg/dL |

> **Nota**: essas são as unidades convencionais usadas pela maioria dos laboratórios brasileiros. Se seus dados estiverem em mmol/L ou mmol/mol, use `autoConvertToTarget`.

### Uso básico

```typescript
import { brdmrisc } from '@precisa-saude/fhir-calculators';

// Com todos os 4 biomarcadores (modelo 6, AUC 0.813)
const resultado = brdmrisc.calculateBrDMrisc({
  fpg: 102,            // mg/dL
  hba1c: 5.8,          // %
  triglycerides: 180,  // mg/dL
  hdlc: 42,            // mg/dL
});

console.log(resultado.riskPercent);     // Risco em 10 anos (%)
console.log(resultado.riskCategory);    // 'low' | 'moderate' | 'high' | 'very-high'
console.log(resultado.modelUsed.name);  // "FPG + HbA1c + Lipids"
console.log(resultado.breakdown);       // Contribuição de cada biomarcador
```

### Seleção automática de modelo

```typescript
import { brdmrisc } from '@precisa-saude/fhir-calculators';

// Apenas glicemia disponível → usa modelo 1
const r1 = brdmrisc.calculateBrDMrisc({ fpg: 95 });
console.log(r1.modelUsed.id); // 1

// Glicemia + HbA1c → usa modelo 3 (AUC mais alta)
const r2 = brdmrisc.calculateBrDMrisc({ fpg: 95, hba1c: 5.4 });
console.log(r2.modelUsed.id); // 3

// Você também pode selecionar o modelo manualmente:
const modelo = brdmrisc.selectModel({ fpg: 95, hba1c: 5.4 });
console.log(modelo?.namePt); // "Glicemia + HbA1c"
```

### Conversão automática de unidades (`autoConvertToTarget`)

```typescript
import { brdmrisc } from '@precisa-saude/fhir-calculators';

// Glicose em mmol/L → mg/dL
const fpg = brdmrisc.autoConvertToTarget('fpg', 5.5, 'mmol/L');
// { value: 99.1, unit: 'mg/dL', wasConverted: true }

// HbA1c em mmol/mol (IFCC) → % (NGSP)
const hba1c = brdmrisc.autoConvertToTarget('hba1c', 42, 'mmol/mol');
// { value: 5.993, unit: '%', wasConverted: true }

// Triglicerídeos em mmol/L → mg/dL
const tg = brdmrisc.autoConvertToTarget('triglycerides', 2.0, 'mmol/L');
// { value: 177.14, unit: 'mg/dL', wasConverted: true }
```

### Categorias de risco

| Categoria | Faixa | Interpretação |
|-----------|-------|---------------|
| `low` | < 10% | Risco baixo |
| `moderate` | 10–20% | Risco moderado — monitorar |
| `high` | 20–35% | Risco alto — prevenção intensiva |
| `very-high` | >= 35% | Risco muito alto — avaliação médica urgente |

---

## Biomarcadores derivados

Alguns biomarcadores podem ser calculados a partir de outros já extraídos do laudo, evitando a necessidade de extração direta.

### Fórmulas

| Biomarcador | Fórmula | Unidade | Quando é calculado |
|-------------|---------|---------|---------------------|
| HOMA-IR | (Glicose × Insulina) / 405 | índice | Glicose **e** Insulina presentes |
| VLDL | Triglicerídeos / 5 | mg/dL | Triglicerídeos presente |
| IMC | Peso / Altura² | kg/m² | Massa Total presente **e** altura no contexto |

> **Nota**: Glicose e Insulina devem estar em mg/dL e μUI/mL, respectivamente, para a fórmula do HOMA-IR.

### Uso

```typescript
import { computeDerivedBiomarkers } from '@precisa-saude/fhir-calculators';

// Biomarcadores já extraídos do laudo
const extraidos = [
  { code: 'Glucose', value: 92, unit: 'mg/dL' },
  { code: 'Insulin', value: 8.5, unit: 'μUI/mL' },
  { code: 'Triglycerides', value: 150, unit: 'mg/dL' },
];

const derivados = computeDerivedBiomarkers(extraidos);
console.log(derivados);
// [
//   { code: 'HOMA_IR', value: 1.930..., unit: 'index', name: 'HOMA_IR', loincCode: '...' },
//   { code: 'VLDL', value: 30, unit: 'mg/dL', name: 'VLDL', loincCode: '...' },
// ]
```

### Com contexto do usuário (para IMC)

```typescript
import { computeDerivedBiomarkers } from '@precisa-saude/fhir-calculators';

const extraidos = [
  { code: 'TotalMass', value: 72, unit: 'kg' },
];

const derivados = computeDerivedBiomarkers(extraidos, {
  userContext: { heightCm: 170 },
});
console.log(derivados);
// [{ code: 'BMI', value: 24.913..., unit: 'kg/m2', ... }]
```

### Regras de cálculo

- Um biomarcador derivado **só é calculado** se todos os inputs necessários estiverem presentes com valores numéricos
- Se o biomarcador já existir nos dados extraídos, ele **não é recalculado** (o valor do laudo tem precedência)
- O IMC requer o contexto do usuário com `heightCm` entre 50 e 250 cm

## Referências

1. Levine, M.E. et al. "An epigenetic biomarker of aging for lifespan and healthspan." *Aging*, 10(4), 573-591, 2018. DOI: [10.18632/aging.101414](https://doi.org/10.18632/aging.101414)

2. Bracco, P.A. et al. "BrDMrisc: a Brazilian diabetes risk score for screening of type 2 diabetes mellitus." *Frontiers in Endocrinology*, 14:1166147, 2023. DOI: [10.3389/fendo.2023.1166147](https://doi.org/10.3389/fendo.2023.1166147)

3. Matthews, D.R. et al. "Homeostasis model assessment: insulin resistance and beta-cell function from fasting plasma glucose and insulin concentrations in man." *Diabetologia*, 28(7), 412-419, 1985. DOI: [10.1007/BF00280883](https://doi.org/10.1007/BF00280883)
