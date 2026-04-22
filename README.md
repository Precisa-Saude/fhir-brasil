# fhir-brasil

[![CI](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml/badge.svg)](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm @precisa-saude/fhir](https://img.shields.io/npm/v/@precisa-saude/fhir?label=%40precisa-saude%2Ffhir)](https://www.npmjs.com/package/@precisa-saude/fhir)
[![npm @precisa-saude/fhir-calculators](https://img.shields.io/npm/v/@precisa-saude/fhir-calculators?label=fhir-calculators)](https://www.npmjs.com/package/@precisa-saude/fhir-calculators)
[![npm @precisa-saude/fhir-ocr-utils](https://img.shields.io/npm/v/@precisa-saude/fhir-ocr-utils?label=fhir-ocr-utils)](https://www.npmjs.com/package/@precisa-saude/fhir-ocr-utils)
[![npm @precisa-saude/fhir-rnds](https://img.shields.io/npm/v/@precisa-saude/fhir-rnds?label=fhir-rnds)](https://www.npmjs.com/package/@precisa-saude/fhir-rnds)

Toolkit FHIR R4 para o ecossistema de saúde brasileiro — definições de biomarcadores, faixas de referência, calculadoras clínicas, normalização de aliases e cliente RNDS.

Documentação completa e contexto do projeto em [fhir-brasil.dev.br](https://fhir-brasil.dev.br).

---

## Visão geral

O sistema de saúde brasileiro opera como redes paralelas com troca mínima de dados — laboratórios privados entregam PDFs sem padrão, laboratórios do SUS usam sistemas internos, e nenhum enxerga o outro. O **fhir-brasil** fornece a infraestrutura de código aberto para resolver essa fragmentação via FHIR R4:

- **200+ biomarcadores** com códigos LOINC, nomes em pt-BR/en-US, unidades UCUM, organizados em 10 categorias clínicas
- **200+ faixas de referência** com variantes por sexo/idade, baseadas em diretrizes SBPC/ML, SBC e SBD
- **Normalização de aliases** — cada laboratório usa nomes diferentes para o mesmo exame; `normalizeCode('colesterol HDL')` retorna `'HDL'`
- **Calculadoras clínicas** — PhenoAge (idade biológica), BrDMrisc (risco de diabetes), HOMA-IR, VLDL, IMC
- **Utilitários OCR** — ancoragem de texto para extração de biomarcadores de PDFs de resultados de laboratório
- **Cliente RNDS** — cliente HTTP para a Rede Nacional de Dados em Saúde (DATASUS), com autenticação mTLS e zero dependências externas
- **Sandbox RNDS** — mock local da RNDS para desenvolvimento, ensino e demos sem certificado ICP-Brasil

> 580+ testes automatizados, cobertura acima de 80%, revisão contínua de faixas de referência.

---

## Pacotes

| Pacote                                                       | Descrição                                                                                     | Deps                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------------------- |
| [`@precisa-saude/fhir`](packages/core/)                      | Tipos FHIR R4, 200+ biomarcadores, faixas de referência, conversores, normalização de aliases | 0 runtime deps        |
| [`@precisa-saude/fhir-calculators`](packages/calculators/)   | PhenoAge, BrDMrisc, HOMA-IR, VLDL, IMC                                                        | `@precisa-saude/fhir` |
| [`@precisa-saude/fhir-ocr-utils`](packages/ocr-utils/)       | Ancoragem OCR para extração de biomarcadores                                                  | `@precisa-saude/fhir` |
| [`@precisa-saude/fhir-rnds`](packages/rnds/)                 | Cliente HTTP para a RNDS (DATASUS) — autenticação mTLS, FHIR R4                               | `@precisa-saude/fhir` |
| [`@precisa-saude/fhir-rnds-sandbox`](packages/rnds-sandbox/) | Mock local da RNDS — endpoints FHIR R4 e cenários sintéticos para dev/ensino                  | `@precisa-saude/fhir` |

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

### Normalizar aliases de biomarcadores

```typescript
import { normalizeCode } from '@precisa-saude/fhir';

normalizeCode('colesterol HDL'); // → 'HDL'
normalizeCode('Hemoglobina glicada'); // → 'HbA1c'
normalizeCode('TSH ultrassensível'); // → 'TSH'
```

### Consultar faixas de referência

```typescript
import { getReferenceRange } from '@precisa-saude/fhir';

const range = getReferenceRange('Cholesterol');
// → { min: 0, max: 190, optimalMax: 190, unit: 'mg/dL', ... }

const rangeForUser = getReferenceRange('HDL', { sex: 'F', age: 45 });
// → Faixa ajustada para mulher de 45 anos
```

### Converter resultado de laboratório para FHIR

```typescript
import { labResultToFHIRBundle } from '@precisa-saude/fhir';

const bundle = labResultToFHIRBundle(report, observations, userProfile);
// → FHIR R4 Bundle com Patient + DiagnosticReport + Observations
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

const patient = await client.getPatientByCpf('12345678900');
const result = await client.submitBundle(bundle);
```

> **Nota:** O Cliente RNDS foi testado contra servidor mock abrangente. Validação contra infraestrutura real do RNDS requer certificado ICP-Brasil e ainda não foi realizada. Veja [detalhes no README do pacote](packages/rnds/).

### Calcular PhenoAge

```typescript
import { phenoage } from '@precisa-saude/fhir-calculators';

const result = phenoage.calculatePhenoAge({
  chronologicalAge: 45,
  albumin: 42,
  creatinine: 80,
  glucose: 5.2,
  crp: 1.5,
  lymphocytePercent: 30,
  mcv: 88,
  rdw: 13,
  alkalinePhosphatase: 70,
  wbc: 6.5,
});
// → { phenoAge: 42.3, ageDifference: -2.7, ... }
```

---

## CLI

Os pacotes core e ocr-utils incluem ferramentas de linha de comando — zero dependências externas. Todas suportam `--json` para saída estruturada e `--help` para detalhes.

### `fhir-bio` — biomarcadores e conversão FHIR

```bash
fhir-bio lookup ApoB --json          # Buscar biomarcador por código
fhir-bio range Glucose --sex F --json # Faixa de referência
fhir-bio units Creatinine --json      # Informações de unidade
fhir-bio lookup-loinc 718-7           # Buscar por código LOINC
fhir-bio list                         # Listar todos os biomarcadores
fhir-bio categories                   # Listar por categoria
fhir-bio convert resultado.json       # Converter JSON para FHIR Bundle
fhir-bio validate bundle.json         # Validar recurso FHIR
fhir-bio import bundle.json           # Importar Bundle e extrair observações
fhir-bio loinc-map                    # Tabela de mapeamento LOINC ↔ código
```

### `fhir-ocr` — extração de biomarcadores de texto OCR

```bash
echo "Hemoglobina 14.5 g/dL Glicose 99 mg/dL TSH 2.5 mUI/L" | fhir-ocr find --json
echo "Hemoglobina 14.5 g/dL Glicose 99 mg/dL" | fhir-ocr codes --json
```

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
- **TUSS/TISS** — Terminologias ANS para saúde suplementar
- **CID-10 pt-BR** — Classificação Internacional de Doenças (tradução DATASUS)
- **IBGE/CNES** — Códigos de município e tipos de estabelecimento de saúde

---

## Roadmap

- [x] `@precisa-saude/fhir` — Core: tipos FHIR R4, biomarcadores, faixas de referência, conversores
- [x] `@precisa-saude/fhir-calculators` — Calculadoras: PhenoAge, BrDMrisc, derivados
- [x] `@precisa-saude/fhir-ocr-utils` — Utilitários OCR: ancoragem de biomarcadores em texto
- [x] `@precisa-saude/fhir-rnds` — Cliente RNDS: autenticação mTLS, submissão de bundles
- [x] Implementation Guide FHIR — perfis BRPatient, BRLabObservation, BRDiagnosticReport via SUSHI
- [x] Terminologias brasileiras — TUSS, TISS, CID-10, SUS raça/cor, IBGE, CNES
- [x] Helpers de identificadores brasileiros (CPF, CNS)
- [ ] Integração com perfis RNDS (REL, RAC, SA, RIA)

---

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre como contribuir.

Histórico de versões em [CHANGELOG.md](CHANGELOG.md).

---

## Aviso Legal

Este software é fornecido para fins informativos e educacionais. **Não substitui aconselhamento médico profissional.** Veja [DISCLAIMER.md](DISCLAIMER.md).

---

## Licença

[Apache License 2.0](LICENSE)

---

Mantido por [Precisa Saúde](https://precisa-saude.com.br)
