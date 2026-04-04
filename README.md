# fhir-brasil

[![CI](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml/badge.svg)](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Website](https://img.shields.io/badge/website-fhir--brasil.dev.br-blueviolet)](https://fhir-brasil.dev.br)

Toolkit FHIR R4 para o ecossistema de saúde brasileiro — definições de biomarcadores, faixas de referência e calculadoras clínicas.

Brazilian FHIR R4 toolkit — biomarker definitions, reference ranges, and clinical calculators.

---

## O problema

O sistema de saúde brasileiro opera como duas redes paralelas com troca mínima de dados:

- **Laboratórios privados** (Weinmann, Fleury, etc.) entregam resultados como PDFs — sem formato padrão, sem codificação LOINC
- **Laboratórios do SUS** enviam resultados por sistemas internos, cada vez mais conectados à RNDS — mas a adesão para exames de rotina ainda não é obrigatória
- **Nenhum sistema enxerga o outro** — o médico da rede privada não tem acesso aos resultados do SUS, e vice-versa

**Resultado: exames duplicados.** O mesmo hemograma é solicitado pelo endocrinologista (privado) e pela UBS (SUS) em questão de semanas, porque não existe uma visão longitudinal do paciente.

Isso custa dinheiro (operadoras e SUS pagam), desperdiça capacidade laboratorial e prejudica o paciente.

## The problem

Brazil's healthcare system operates as two parallel networks with minimal data exchange:

- **Private labs** deliver results as PDFs — no standard format, no LOINC coding
- **Public labs (SUS)** increasingly report to RNDS — but routine lab results are not yet mandatory for private labs
- **Neither system sees the other** — private doctors can't access SUS results, and vice versa

**Result: duplicated exams.** The same blood panel gets ordered by a private specialist and a public health unit within weeks, because there's no longitudinal patient view.

This wastes money, lab capacity, and harms patients.

### Hoje: dados fragmentados

```
┌──────────────────────┐         ┌──────────────────────┐
│     Rede Privada     │         │     Rede Pública     │
│                      │         │                      │
│  Lab privado         │         │  UBS / Lab SUS       │
│  (Weinmann, Fleury)  │         │  (rede pública)      │
│         │            │         │         │            │
│         ▼            │         │         ▼            │
│  PDF no WhatsApp     │         │  Sistema interno     │
│  sem padrão          │         │  dados presos na UBS │
│  sem LOINC           │         │                      │
│         │            │         │         │            │
│         ▼            │         │         ▼            │
│  Médico pede exame   │         │  UBS pede exame      │
│  sem histórico ◄─────┼── ✕ ──►┼─ sem histórico       │
│  do SUS              │         │  privado             │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └───────────┐  ┌─────────────────┘
                       ▼  ▼
              ┌──────────────────┐
              │ Exames duplicados│
              │ custo desperdiçado│
              └──────────────────┘
```

### Com fhir-brasil: interoperabilidade via FHIR R4

```
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Lab privado  │  │     RNDS      │  │ UBS / Lab SUS │
│  PDF upload   │  │  FHIR R4      │  │ via RNDS ou   │
│               │  │  nativo       │  │ PDF           │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │     OCR + parser │  FHIR import     │
        └──────────────────┼──────────────────┘
                           ▼
          ┌────────────────────────────────┐
          │    fhir-brasil (open source)   │
          │                                │
          │  200+ biomarcadores LOINC      │
          │  Conversor FHIR R4             │
          │  Faixas SBPC/ML                │
          │  Calculadoras clínicas         │
          └───────────────┬────────────────┘
                          ▼
          ┌────────────────────────────────┐
          │  Aplicação                     │
          │  (proprietário ou terceiros)   │
          └───────┬────────────────┬───────┘
                  ▼                ▼
      ┌─────────────────┐ ┌────────────────────┐
      │ Visão            │ │ Deduplicação       │
      │ longitudinal     │ │ mesmo LOINC =      │
      │ todas as fontes  │ │ mesmo exame        │
      │ unificadas       │ │                    │
      └─────────────────┘ └────────────────────┘
```

---

## O que é

**fhir-brasil** é a camada de infraestrutura que resolve esse problema. Fornece uma base compartilhada para que healthtechs, instituições de pesquisa e desenvolvedores trabalhem com dados de saúde brasileiros no padrão FHIR R4:

- **200+ biomarcadores** com códigos LOINC, nomes em português/inglês, categorias e unidades
- **200+ faixas de referência** com variantes por sexo/idade, baseadas em diretrizes SBPC/ML, SBC e SBD
- **Calculadoras clínicas** — PhenoAge (idade biológica), BrDMrisc (risco de diabetes), HOMA-IR, VLDL, IMC
- **Utilitários OCR** — ancoragem de texto para extração de biomarcadores de PDFs de resultados de laboratório
- **Cliente RNDS** — cliente HTTP para a Rede Nacional de Dados em Saúde (DATASUS), com autenticação mTLS e zero dependências externas

---

## Ecossistema

O ecossistema de saúde brasileiro envolve múltiplos atores, cada um com seus próprios sistemas e necessidades de dados. O fhir-brasil fornece a base para que cada visão possa ser construída sobre o mesmo padrão:

| Ator                           | Problema de dados                                        | Papel do fhir-brasil                             |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------ |
| **Paciente**                   | Resultados espalhados entre PDFs, WhatsApp, portais      | Base para aplicações de consumo                  |
| **Médico / Clínica**           | Sem visão completa do histórico laboratorial entre redes | Camada de normalização entre fontes              |
| **Laboratório**                | Formatos proprietários, LOINC inconsistente              | Vocabulário compartilhado com 200+ biomarcadores |
| **Operadora**                  | Pagando por exames duplicados entre redes                | Infraestrutura para analytics de deduplicação    |
| **Universidade / Pesquisador** | Dados fragmentados em formatos proprietários             | Pacotes open-source para pesquisa em saúde       |
| **DATASUS / Governo**          | Adoção da RNDS ainda lenta                               | Ferramentas comunitárias que aceleram a adoção   |

---

## Por que código aberto

1. **Transparência** — Definições de biomarcadores e faixas de referência devem ser auditáveis
2. **Confiabilidade** — Códigos LOINC e citações SBPC/ML verificáveis por qualquer pessoa
3. **Colaboração** — Healthtechs brasileiras contribuem e se beneficiam de uma base comum
4. **Impacto social** — Dados de saúde padronizados ajudam a reduzir desigualdades no acesso

---

## O que o fhir-brasil não é

- **Não é um prontuário eletrônico (EHR)** — é uma camada de dados, não um sistema clínico
- **Não é uma ferramenta de diagnóstico** — todos os outputs são informativos
- **Não substitui a RNDS** — complementa a plataforma nacional de interoperabilidade do DATASUS
- **Não é um produto de consumo** — é infraestrutura para que outros possam construir produtos

---

## Instalação

```bash
# Core — tipos, biomarcadores, faixas de referência, conversores
npm install @precisa-saude/fhir

# Calculadoras clínicas (PhenoAge, BrDMrisc, derivados)
npm install @precisa-saude/fhir-calculators

# Utilitários OCR
npm install @precisa-saude/fhir-ocr-utils

# Cliente RNDS (Rede Nacional de Dados em Saúde)
npm install @precisa-saude/fhir-rnds
```

---

## Uso rápido

### Converter resultado de laboratório para FHIR

```typescript
import { labResultToFHIRBundle } from '@precisa-saude/fhir';

const bundle = labResultToFHIRBundle(report, observations, userProfile);
// → FHIR R4 Bundle com Patient + DiagnosticReport + Observations
```

### Consultar faixas de referência

```typescript
import { getReferenceRange } from '@precisa-saude/fhir';

const range = getReferenceRange('Cholesterol');
// → { min: 0, max: 190, optimalMax: 190, unit: 'mg/dL', ... }

const rangeForUser = getReferenceRange('HDL', { sex: 'F', age: 45 });
// → Faixa ajustada para mulher de 45 anos
```

### Consultar paciente na RNDS

```typescript
import { RNDSClient } from '@precisa-saude/fhir-rnds';

const client = new RNDSClient({
  certificate: './certificado.pfx',
  certificatePassword: process.env.RNDS_CERT_PASSWORD!,
  cnes: '1234567',
  cns: '123456789012345',
  environment: 'homologation',
});

// Buscar paciente por CPF
const patient = await client.getPatientByCpf('12345678900');
// → FHIRPatient | null

// Buscar estabelecimento por CNES
const org = await client.getOrganizationByCnes('1234567');
// → FHIROrganization | null

// Enviar bundle de resultados laboratoriais
const result = await client.submitBundle(bundle);
```

### Calcular PhenoAge

```typescript
import { phenoage } from '@precisa-saude/fhir-calculators';

const result = phenoage.calculatePhenoAge({
  chronologicalAge: 45,
  albumin: 42, // g/L
  creatinine: 80, // μmol/L
  glucose: 5.2, // mmol/L
  crp: 1.5, // mg/L
  lymphocytePercent: 30,
  mcv: 88, // fL
  rdw: 13, // %
  alkalinePhosphatase: 70, // U/L
  wbc: 6.5, // 10^9/L
});
// → { phenoAge: 42.3, ageDifference: -2.7, ... }
```

---

## CLI

Os pacotes core e ocr-utils incluem ferramentas de linha de comando — zero dependências externas.

### `fhir-bio` — biomarcadores e conversão FHIR

```bash
npx @precisa-saude/fhir lookup Hemoglobin        # Buscar biomarcador por código
npx @precisa-saude/fhir lookup-loinc 718-7        # Buscar por código LOINC
npx @precisa-saude/fhir list                      # Listar todos os biomarcadores
npx @precisa-saude/fhir categories                # Listar por categoria
npx @precisa-saude/fhir range Glucose --sex F     # Faixa de referência
npx @precisa-saude/fhir units Creatinine          # Informações de unidade
npx @precisa-saude/fhir convert resultado.json    # Converter JSON para FHIR Bundle
npx @precisa-saude/fhir validate bundle.json      # Validar recurso FHIR
npx @precisa-saude/fhir import bundle.json        # Importar Bundle e extrair observações
npx @precisa-saude/fhir loinc-map                 # Tabela de mapeamento LOINC ↔ código
```

### `fhir-ocr` — extração de biomarcadores de texto OCR

```bash
npx @precisa-saude/fhir-ocr-utils find resultado.txt     # Encontrar biomarcadores em texto
npx @precisa-saude/fhir-ocr-utils codes resultado.txt    # Extrair códigos encontrados
cat resultado.txt | npx @precisa-saude/fhir-ocr-utils find   # Lê de stdin
```

Todas as ferramentas suportam `--json` para saída estruturada e `--help` para detalhes.

---

## Pacotes

| Pacote                            | Descrição                                                            | Deps                  |
| --------------------------------- | -------------------------------------------------------------------- | --------------------- |
| `@precisa-saude/fhir`             | Tipos FHIR R4, 200+ biomarcadores, faixas de referência, conversores | 0 runtime deps        |
| `@precisa-saude/fhir-calculators` | PhenoAge, BrDMrisc, HOMA-IR, VLDL, IMC                               | `@precisa-saude/fhir` |
| `@precisa-saude/fhir-ocr-utils`   | Ancoragem OCR para extração de biomarcadores                         | `@precisa-saude/fhir` |
| `@precisa-saude/fhir-rnds`        | Cliente HTTP para a RNDS (DATASUS) — autenticação mTLS, FHIR R4      | `@precisa-saude/fhir` |

---

## Biomarcadores suportados

| Categoria           | Qtd | Exemplos                                               |
| ------------------- | --- | ------------------------------------------------------ |
| Coração             | 30+ | Colesterol, HDL, LDL, Triglicerídeos, ApoB, PCR, Lp(a) |
| Tireoide            | 6   | TSH, T3 Livre, T4 Livre, Anti-TPO                      |
| Metabólico          | 8   | Glicose, HbA1c, Insulina, HOMA-IR, Ácido Úrico         |
| Nutrientes          | 15+ | Vitamina D, B12, Ferro, Ferritina, Folato, Zinco       |
| Fígado              | 8   | ALT, AST, GGT, Bilirrubina, Albumina                   |
| Sangue (CBC)        | 15+ | Hemoglobina, Hematócrito, Plaquetas, Leucócitos        |
| Rins                | 8   | Creatinina, TFGe, Ureia, Sódio, Potássio               |
| Hormônios           | 10+ | Testosterona, Estradiol, DHEAS, FSH, LH                |
| Composição corporal | 15+ | % Gordura, Massa Magra, VAT, DMO                       |
| Urina               | 20+ | pH, Proteína, Glicose, Hemoglobina                     |

---

## Padrões e compliance

- **FHIR R4** — Todos os recursos seguem o padrão HL7 FHIR R4
- **LOINC** — Códigos LOINC verificados para interoperabilidade
- **SBPC/ML** — Faixas de referência baseadas nas diretrizes brasileiras
- **UCUM** — Unidades no formato Unified Code for Units of Measure

---

## Roadmap

- [x] `@precisa-saude/fhir` — Core: tipos FHIR R4, biomarcadores, faixas de referência, conversores
- [x] `@precisa-saude/fhir-calculators` — Calculadoras: PhenoAge, BrDMrisc, derivados
- [x] `@precisa-saude/fhir-ocr-utils` — Utilitários OCR: ancoragem de biomarcadores em texto
- [x] `@precisa-saude/fhir-rnds` — Cliente RNDS: autenticação mTLS, submissão de bundles
- [ ] Integração com perfis RNDS (REL, RAC, SA, RIA)
- [ ] Dados alimentares brasileiros (TBCA)
- [ ] Módulo de nutrigenômica

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
