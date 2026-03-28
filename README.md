# fhir-brasil

[![CI](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml/badge.svg)](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Toolkit FHIR R4 para o ecossistema de saude brasileiro — definicoes de biomarcadores, faixas de referencia e calculadoras clinicas.

Brazilian FHIR R4 toolkit — biomarker definitions, reference ranges, and clinical calculators.

---

## O que e / What is this

**fhir-brasil** fornece uma base compartilhada para healthtechs brasileiras trabalharem com dados de saude no padrao FHIR R4:

- **183+ biomarcadores** com codigos LOINC, nomes em portugues/ingles, categorias e unidades
- **150+ faixas de referencia** com variantes por sexo/idade, baseadas em diretrizes SBPC/ML, SBC e SBD
- **Calculadoras clinicas** — PhenoAge (idade biologica), BrDMrisc (risco de diabetes), HOMA-IR, VLDL, IMC
- **Utilitarios OCR** — ancoragem de texto para extracao de biomarcadores de PDFs de resultados de laboratorio

---

## Por que open-source

1. **Transparencia** — Definicoes de biomarcadores e faixas de referencia devem ser auditaveis
2. **Confiabilidade** — Codigos LOINC e citacoes SBPC/ML verificaveis por qualquer pessoa
3. **Colaboracao** — Healthtechs brasileiras contribuem e se beneficiam de uma base comum
4. **Impacto social** — Dados de saude padronizados ajudam a reduzir desigualdades no acesso

---

## Instalacao

```bash
# Core — tipos, biomarcadores, faixas de referencia, conversores
npm install @fhir-brasil/core

# Calculadoras clinicas (PhenoAge, BrDMrisc, derivados)
npm install @fhir-brasil/calculators

# Utilitarios OCR
npm install @fhir-brasil/ocr-utils
```

---

## Uso rapido

### Converter resultado de laboratorio para FHIR

```typescript
import { labResultToFHIRBundle } from '@fhir-brasil/core';

const bundle = labResultToFHIRBundle(report, observations, userProfile);
// → FHIR R4 Bundle com Patient + DiagnosticReport + Observations
```

### Consultar faixas de referencia

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

| Pacote | Descricao | Deps |
|--------|-----------|------|
| `@fhir-brasil/core` | Tipos FHIR R4, 183+ biomarcadores, faixas de referencia, conversores | 0 runtime deps |
| `@fhir-brasil/calculators` | PhenoAge, BrDMrisc, HOMA-IR, VLDL, IMC | `@fhir-brasil/core` |
| `@fhir-brasil/ocr-utils` | Ancoragem OCR para extracao de biomarcadores | `@fhir-brasil/core` |

---

## Biomarcadores suportados

| Categoria | Qtd | Exemplos |
|-----------|-----|----------|
| Coracao | 30+ | Colesterol, HDL, LDL, Triglicerideos, ApoB, PCR, Lp(a) |
| Tireoide | 6 | TSH, T3 Livre, T4 Livre, Anti-TPO |
| Metabolico | 8 | Glicose, HbA1c, Insulina, HOMA-IR, Acido Urico |
| Nutrientes | 15+ | Vitamina D, B12, Ferro, Ferritina, Folato, Zinco |
| Figado | 8 | ALT, AST, GGT, Bilirrubina, Albumina |
| Sangue (CBC) | 15+ | Hemoglobina, Hematocrito, Plaquetas, Leucocitos |
| Rins | 8 | Creatinina, TFGe, Ureia, Sodio, Potassio |
| Hormonios | 10+ | Testosterona, Estradiol, DHEAS, FSH, LH |
| Composicao corporal | 15+ | % Gordura, Massa Magra, VAT, DMO |
| Urina | 20+ | pH, Proteina, Glicose, Hemoglobina |

---

## Padroes e compliance

- **FHIR R4** — Todos os recursos seguem o padrao HL7 FHIR R4
- **LOINC** — Codigos LOINC verificados para interoperabilidade
- **SBPC/ML** — Faixas de referencia baseadas nas diretrizes brasileiras
- **UCUM** — Unidades no formato Unified Code for Units of Measure

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre como contribuir.

---

## Aviso Legal

Este software e fornecido para fins informativos e educacionais. **Nao substitui aconselhamento medico profissional.** Veja [DISCLAIMER.md](DISCLAIMER.md).

---

## Licenca

[Apache License 2.0](LICENSE)

---

Mantido por [Precisa Saude](https://precisa-saude.com.br)
