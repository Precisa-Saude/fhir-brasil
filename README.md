# fhir-brasil

[![CI](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml/badge.svg)](https://github.com/precisa-saude/fhir-brasil/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm @precisa-saude/fhir](https://img.shields.io/npm/v/@precisa-saude/fhir?label=%40precisa-saude%2Ffhir)](https://www.npmjs.com/package/@precisa-saude/fhir)
[![npm @precisa-saude/fhir-ocr-utils](https://img.shields.io/npm/v/@precisa-saude/fhir-ocr-utils?label=fhir-ocr-utils)](https://www.npmjs.com/package/@precisa-saude/fhir-ocr-utils)
[![npm @precisa-saude/fhir-rnds](https://img.shields.io/npm/v/@precisa-saude/fhir-rnds?label=fhir-rnds)](https://www.npmjs.com/package/@precisa-saude/fhir-rnds)

Toolkit FHIR R4 para o ecossistema de saúde brasileiro — definições de biomarcadores, faixas de referência, normalização de aliases e cliente RNDS.

Documentação completa e contexto do projeto em [fhir-brasil.dev.br](https://fhir-brasil.dev.br).

---

## Visão geral

O sistema de saúde brasileiro opera como redes paralelas com troca mínima de dados — laboratórios privados entregam PDFs sem padrão, laboratórios do SUS usam sistemas internos, e nenhum enxerga o outro. O **fhir-brasil** fornece a infraestrutura de código aberto para resolver essa fragmentação via FHIR R4:

- **Catálogo de biomarcadores** com códigos LOINC, nomes em pt-BR/en-US, unidades UCUM e categorias clínicas. As contagens exatas estão em [Catálogo em números](#catálogo-em-números)
- **Faixas de referência** com variantes por sexo/idade, baseadas em diretrizes SBPC/ML, SBC e SBD
- **Normalização de aliases** — cada laboratório usa nomes diferentes para o mesmo exame; `normalizeCode('colesterol HDL')` retorna `'HDL'`
- **Utilitários OCR** — ancoragem de texto para extração de biomarcadores de PDFs de resultados de laboratório
- **Cliente RNDS** — cliente HTTP para a Rede Nacional de Dados em Saúde (DATASUS), com autenticação mTLS e zero dependências externas
- **Sandbox RNDS** — mock local da RNDS para desenvolvimento, ensino e demos sem certificado ICP-Brasil

> Todo pacote publicado tem piso de 80% de cobertura em statements, branches, functions e lines, e o CI reprova abaixo disso. As faixas de referência são revisadas continuamente contra as diretrizes citadas.

---

## Pacotes

| Pacote                                                       | Descrição                                                                                            | Deps                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------- |
| [`@precisa-saude/fhir`](packages/core/)                      | Tipos FHIR R4, catálogo de biomarcadores, faixas de referência, conversores, normalização de aliases | 0 runtime deps        |
| [`@precisa-saude/fhir-ocr-utils`](packages/ocr-utils/)       | Ancoragem OCR para extração de biomarcadores                                                         | `@precisa-saude/fhir` |
| [`@precisa-saude/fhir-rnds`](packages/rnds/)                 | Cliente HTTP para a RNDS (DATASUS) — autenticação mTLS, FHIR R4                                      | `@precisa-saude/fhir` |
| [`@precisa-saude/fhir-rnds-sandbox`](packages/rnds-sandbox/) | Mock local da RNDS — endpoints FHIR R4 e cenários sintéticos para dev/ensino                         | `@precisa-saude/fhir` |

---

## Instalação

```bash
# Core — tipos, biomarcadores, faixas de referência, conversores
npm install @precisa-saude/fhir

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

> **Calculadoras clínicas:** PhenoAge, BrDMrisc e biomarcadores derivados foram movidos para o pacote [`@precisa-saude/calculadoras-clinicas`](https://www.npmjs.com/package/@precisa-saude/calculadoras-clinicas) ([repositório](https://github.com/Precisa-Saude/calculadoras-clinicas)).

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

## Catálogo em números

<!-- catalog:counts:start -->

Medido no `@precisa-saude/fhir@0.24.1`, gerado por `pnpm catalog:counts`.

- **225 biomarcadores** definidos, dos quais **187 têm código LOINC** (83,1%) e 38 não têm.
- **188 códigos LOINC aceitos** na busca por código: os 187 canônicos mais os aliases de códigos que o LOINC aposentou.
- **208 faixas de referência**, com variantes por sexo e idade.
- **10 categorias clínicas** de primeiro nível sobre 20 subcategorias.

| Categoria                            | Biomarcadores | Com LOINC | Exemplos                                                            |
| ------------------------------------ | ------------: | --------: | ------------------------------------------------------------------- |
| Cardiovascular                       |            29 |        22 | ApoB, HDL, HDL_Large, CRP, LDL                                      |
| Composição Corporal e Envelhecimento |            44 |        14 | Cortisol, BMI, BodyFatPct, FatMass, LeanMass                        |
| Hematológico                         |            17 |        17 | Hct, Hgb, MCH, MCHC, MCV                                            |
| Hepático e Biliar                    |            12 |        12 | ALT, Albumin, Albumin_Globulin_Ratio, AlkalinePhosphatase, AST      |
| Imunológico                          |            25 |        25 | ANA_Screen, RheumatoidFactor, Basophils, Basophils_Abs, Eosinophils |
| Metabólico e Endócrino               |            21 |        21 | AntiThyroglobulin, AntiTPO, TSH, T4Free, Thyroglobulin              |
| Nutricional e Exposição Ambiental    |            28 |        28 | Lead, Mercury, AA_EPA_Ratio, Calcium, Ferritin                      |
| Oncológico                           |             6 |         6 | AFP, CA125, CEA, CA199, CA153                                       |
| Renal e Eletrolítico                 |            29 |        29 | Microalbumin_Urine, Urea, BUN_Creatinine_Ratio, Creatinine, eGFR    |
| Saúde Reprodutiva                    |            15 |        14 | AMH, DHEAS, Estradiol, Estrone, FSH                                 |
| **Total**                            |       **225** |   **187** |                                                                     |

As linhas somam 226 porque 1 biomarcador aparece em duas categorias. O Beta-hCG é marcador tumoral e exame de saúde feminina ao mesmo tempo. O total não conta ninguém duas vezes.

<!-- catalog:counts:end -->

O CI roda `pnpm catalog:check` e reprova quando o catálogo anda sem o texto
acompanhar. Por isso esta é a formulação para citar em apresentação, artigo ou
proposta. Números escritos à mão em outro lugar não são conferidos por nada.

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
- [x] `@precisa-saude/fhir-ocr-utils` — Utilitários OCR: ancoragem de biomarcadores em texto
- [x] Calculadoras clínicas — extraídas para [`@precisa-saude/calculadoras-clinicas`](https://github.com/Precisa-Saude/calculadoras-clinicas)
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

O código deste repositório é Apache-2.0. O catálogo de biomarcadores incorpora
códigos LOINC, que têm licença própria — permissiva e sem custo, mas com aviso
exigido:

> This material contains content from LOINC (http://loinc.org). LOINC is
> copyright © Regenstrief Institute, Inc. and the Logical Observation
> Identifiers Names and Codes (LOINC) Committee and is available at no cost
> under the license at http://loinc.org/license. LOINC® is a registered United
> States trademark of Regenstrief Institute, Inc.

O nome oficial de cada código fica em
[`scripts/loinc-snapshot.json`](scripts/loinc-snapshot.json), que a seção 10.3
da licença exige acompanhar o código sempre que ele é redistribuído. O
`pnpm loinc:check` confere esse arquivo contra o servidor oficial — veja
[`scripts/README.md`](scripts/README.md).

---

Mantido por [Precisa Saúde](https://precisa-saude.com.br)
