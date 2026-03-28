# fhir-brasil

[![CI](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml/badge.svg)](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Toolkit FHIR R4 para o ecossistema de saúde brasileiro — definições de biomarcadores, faixas de referência e calculadoras clínicas.

Brazilian FHIR R4 toolkit — biomarker definitions, reference ranges, and clinical calculators.

---

## O que é / What is this

**fhir-brasil** fornece uma base compartilhada para healthtechs brasileiras trabalharem com dados de saúde no padrão FHIR R4:

- **183+ biomarcadores** com códigos LOINC, nomes em português/inglês, categorias e unidades
- **150+ faixas de referência** com variantes por sexo/idade, baseadas em diretrizes SBPC/ML, SBC e SBD
- **Calculadoras clínicas** — PhenoAge (idade biológica), BrDMrisc (risco de diabetes), HOMA-IR, VLDL, IMC
- **Utilitários OCR** — ancoragem de texto para extração de biomarcadores de PDFs de resultados de laboratório

---

## Por que open-source

1. **Transparência** — Definições de biomarcadores e faixas de referência devem ser auditáveis
2. **Confiabilidade** — Códigos LOINC e citações SBPC/ML verificáveis por qualquer pessoa
3. **Colaboração** — Healthtechs brasileiras contribuem e se beneficiam de uma base comum
4. **Impacto social** — Dados de saúde padronizados ajudam a reduzir desigualdades no acesso

---

## Instalação

```bash
# Core — tipos, biomarcadores, faixas de referência, conversores
npm install @fhir-brasil/core

# Calculadoras clínicas (PhenoAge, BrDMrisc, derivados)
npm install @fhir-brasil/calculators

# Utilitários OCR
npm install @fhir-brasil/ocr-utils
```

---

## Uso rápido

### Converter resultado de laboratório para FHIR

```typescript
import { labResultToFHIRBundle } from '@fhir-brasil/core';

const bundle = labResultToFHIRBundle(report, observations, userProfile);
// → FHIR R4 Bundle com Patient + DiagnosticReport + Observations
```

### Consultar faixas de referência

```typescript
import { getReferenceRange } from '@fhir-brasil/core';

const range = getReferenceRange('Cholesterol');
// → { min: 0, max: 190, optimalMax: 190, unit: 'mg/dL', ... }

const rangeForUser = getReferenceRange('HDL', { sex: 'F', age: 45 });
// → Faixa ajustada para mulher de 45 anos
```

### Calcular PhenoAge

```typescript
import { phenoage } from '@fhir-brasil/calculators';

const result = phenoage.calculatePhenoAge({
  chronologicalAge: 45,
  albumin: 42,        // g/L
  creatinine: 80,     // μmol/L
  glucose: 5.2,       // mmol/L
  crp: 1.5,           // mg/L
  lymphocytePercent: 30,
  mcv: 88,            // fL
  rdw: 13,            // %
  alkalinePhosphatase: 70, // U/L
  wbc: 6.5,           // 10^9/L
});
// → { phenoAge: 42.3, ageDifference: -2.7, ... }
```

---

## Pacotes

| Pacote | Descrição | Deps |
|--------|-----------|------|
| `@fhir-brasil/core` | Tipos FHIR R4, 183+ biomarcadores, faixas de referência, conversores | 0 runtime deps |
| `@fhir-brasil/calculators` | PhenoAge, BrDMrisc, HOMA-IR, VLDL, IMC | `@fhir-brasil/core` |
| `@fhir-brasil/ocr-utils` | Ancoragem OCR para extração de biomarcadores | `@fhir-brasil/core` |

---

## Biomarcadores suportados

| Categoria | Qtd | Exemplos |
|-----------|-----|----------|
| Coração | 30+ | Colesterol, HDL, LDL, Triglicerídeos, ApoB, PCR, Lp(a) |
| Tireoide | 6 | TSH, T3 Livre, T4 Livre, Anti-TPO |
| Metabólico | 8 | Glicose, HbA1c, Insulina, HOMA-IR, Ácido Úrico |
| Nutrientes | 15+ | Vitamina D, B12, Ferro, Ferritina, Folato, Zinco |
| Fígado | 8 | ALT, AST, GGT, Bilirrubina, Albumina |
| Sangue (CBC) | 15+ | Hemoglobina, Hematócrito, Plaquetas, Leucócitos |
| Rins | 8 | Creatinina, TFGe, Ureia, Sódio, Potássio |
| Hormônios | 10+ | Testosterona, Estradiol, DHEAS, FSH, LH |
| Composição corporal | 15+ | % Gordura, Massa Magra, VAT, DMO |
| Urina | 20+ | pH, Proteína, Glicose, Hemoglobina |

---

## Padrões e compliance

- **FHIR R4** — Todos os recursos seguem o padrão HL7 FHIR R4
- **LOINC** — Códigos LOINC verificados para interoperabilidade
- **SBPC/ML** — Faixas de referência baseadas nas diretrizes brasileiras
- **UCUM** — Unidades no formato Unified Code for Units of Measure

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre como contribuir.

---

## Aviso Legal

Este software é fornecido para fins informativos e educacionais. **Não substitui aconselhamento médico profissional.** Veja [DISCLAIMER.md](DISCLAIMER.md).

---

## Licença

[Apache License 2.0](LICENSE)

---

Mantido por [Precisa Saúde](https://precisa-saude.com.br)
