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

- **Catálogo de biomarcadores** com códigos LOINC, nomes em pt-BR/en-US, unidades UCUM e a seção de serviço HL7 v2-0074 de cada exame. As contagens exatas estão em [Catálogo em números](#catálogo-em-números)
- **Faixas de referência** com variantes por sexo/idade, baseadas em diretrizes SBPC/ML, SBC e SBD
- **Normalização de aliases** — cada laboratório usa nomes diferentes para o mesmo exame; `normalizeCode('colesterol HDL')` retorna `'HDL'`
- **Utilitários OCR** — ancoragem de texto para extração de biomarcadores de PDFs de resultados de laboratório
- **Cliente RNDS** — cliente HTTP para a Rede Nacional de Dados em Saúde (DATASUS), com autenticação mTLS e zero dependências externas
- **Sandbox RNDS** — mock local da RNDS para desenvolvimento, ensino e demos sem certificado ICP-Brasil

> Todo pacote publicado tem piso de 80% de cobertura em statements, branches, functions e lines, e o CI reprova abaixo disso. As faixas de referência são revisadas continuamente contra as diretrizes citadas.

Cada faixa carrega uma chave em `source`, e a citação por trás dela é resolvível sem sair do pacote: `SOURCE_REGISTRY` traz a referência ABNT, o DOI e a URL de cada uma, por `@precisa-saude/fhir/sources` ou pelo comando `fhir-bio source`.

---

## Pacotes

| Pacote                                                       | Descrição                                                                                            | Deps                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------- |
| [`@precisa-saude/fhir`](packages/core/)                      | Tipos FHIR R4, catálogo de biomarcadores, faixas de referência, conversores, normalização de aliases | 0 runtime deps        |
| [`@precisa-saude/fhir-ocr-utils`](packages/ocr-utils/)       | Ancoragem OCR, contrato de extração e conferência da saída de modelo                                 | `@precisa-saude/fhir` |
| [`@precisa-saude/fhir-pdf`](packages/pdf/)                   | Camada de texto de PDF de laudo, para alimentar a ancoragem                                          | `pdfjs-dist`          |
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

Os pacotes core, ocr-utils e pdf incluem ferramentas de linha de comando. Todas suportam `--json` para saída estruturada e `--help` para detalhes.

### `fhir-bio` — biomarcadores e conversão FHIR

```bash
fhir-bio lookup ApoB --json          # Buscar biomarcador por código
fhir-bio range Glucose --sex F --json # Faixa de referência
fhir-bio units Creatinine --json      # Informações de unidade
fhir-bio source --biomarker TSH       # A citação por trás da faixa
fhir-bio source sbem-thyroid-2013     # Ou direto pela chave que o range imprime
fhir-bio lookup-loinc 718-7           # Buscar por código LOINC
fhir-bio list                         # Listar todos os biomarcadores
fhir-bio sections                     # Listar pela seção de serviço (v2-0074)
fhir-bio convert resultado.json       # Converter JSON para FHIR Bundle
fhir-bio validate bundle.json         # Validar recurso FHIR
fhir-bio import bundle.json           # Importar Bundle e extrair observações
fhir-bio loinc-map                    # Tabela de mapeamento LOINC ↔ código
fhir-bio decision 2089-1              # Ficha de decisão do mapeamento (eixos, rejeitados, revisor)
```

### `fhir-ocr` — extração de biomarcadores de texto OCR

```bash
echo "Hemoglobina 14.5 g/dL Glicose 99 mg/dL TSH 2.5 mUI/L" | fhir-ocr find --json
echo "Hemoglobina 14.5 g/dL Glicose 99 mg/dL" | fhir-ocr codes --json
```

---

## Catálogo em números

<!-- catalog:counts:start -->

Medido no `@precisa-saude/fhir@1.0.0`, gerado por `pnpm catalog:counts`.

- **260 biomarcadores** definidos, dos quais **225 têm código LOINC** (86,5%) e 35 não têm.
- **231 códigos LOINC aceitos** na busca por código: os 225 canônicos, as variantes por método e os aliases de códigos que o LOINC aposentou.
- **203 faixas de referência**, com variantes por sexo e idade.
- **11 seções de serviço** (HL7 v2-0074), a categoria que sai no `DiagnosticReport`: da classe do LOINC, ou declarada no exame sem LOINC.
- **Registro de decisão** dos 225 mapeamentos: 49 com evidência além do nome (unidade, material, método ou bula), 176 escolhidos só pelo nome, 0 com revisão independente. A ficha de cada um sai em `fhir-bio decision <código>`.

| Seção                              | Biomarcadores | Com LOINC | Exemplos                                                                    |
| ---------------------------------- | ------------: | --------: | --------------------------------------------------------------------------- |
| Bioquímica (`CH`)                  |           126 |       126 | ApoB, HDL, HDL_Large, CRP, LDL                                              |
| Hematologia (`HM`)                 |            33 |        33 | Basophils, Basophils_Abs, Eosinophils, Eosinophils_Abs, Lymphocytes         |
| Outros (medida corporal) (`OTH`)   |            28 |        14 | BMI, BodyFatPct, FatMass, LeanMass, FatFreeMass                             |
| Radiologia (densitometria) (`RAD`) |            22 |         8 | BMC, VATVolume, VATMass, AndroidGynoidRatio, AndroidFatPct                  |
| Sorologia (`SR`)                   |            18 |        18 | AntiThyroglobulin, AntiTPO, ANA_Screen, RheumatoidFactor, AntiCCP           |
| Urinálise (`URN`)                  |            17 |        17 | Appearance_Urine, Bacteria_Urine, Bilirubin_Urine, Blood_Urine, Color_Urine |
| Tomografia (`CT`)                  |             7 |         0 | CAC, CAC_LMA, CAC_LAD, CAC_LCX, CAC_RCA                                     |
| Toxicologia (`TX`)                 |             4 |         4 | Lead, Mercury, Zinc, Selenium                                               |
| Banco de sangue (`BLB`)            |             2 |         2 | ABO_Group, Rh_Type                                                          |
| Imunologia (`IMM`)                 |             2 |         2 | IgE_E1_CatDander, IgE_GX1_Grasses                                           |
| Genética (`GE`)                    |             1 |         1 | APOE_Genotype                                                               |
| **Total**                          |       **260** |   **225** |                                                                             |

### Os 35 sem LOINC, e por quê

**ambiguous** (4): há candidatos, mas a equivalência não está estabelecida.

| Biomarcador          | Motivo                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BMC`                | O laudo DXA define BMC como conteúdo mineral ósseo separado do tecido magro. 101685-6 não esclarece se Body bone mass inclui matriz orgânica; 101686-4 é percentual por BIA. |
| `ExtracellularWater` | 73706-4 existe como volume de fluido extracelular, método Measured. A entrada genérica não declara medição versus estimativa por BIA.                                        |
| `IntracellularWater` | 73705-6 estima fluido intracelular por água total menos extracelular. Falta confirmar esse método na entrada genérica.                                                       |
| `BasalMetabolicRate` | 50042-1 é índice; 69429-9, 82278-3 e 82286-6 descrevem metabolismo de repouso. TMB estimada exige confirmar protocolo e fórmula.                                             |

**no-concept** (31): nenhum conceito equivalente encontrado nas buscas registradas.

| Biomarcador           | Motivo                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CAC`                 | 79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.                                                                                                                                                    |
| `CAC_LMA`             | 79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.                                                                                                                                                    |
| `CAC_LAD`             | 79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.                                                                                                                                                    |
| `CAC_LCX`             | 79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.                                                                                                                                                    |
| `CAC_RCA`             | 79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.                                                                                                                                                    |
| `CAC_Percentile`      | Nenhum percentil de Agatston encontrado; o código do exame 79087-3 não representa um percentil.                                                                                                                                            |
| `AorticValveCalcium`  | 89927-8 é um exame de coração/raiz aórtica (Doc), não o escore numérico da valva aórtica.                                                                                                                                                  |
| `LeanMass`            | O laudo DXA GE Lunar Prodigy confirma tecido magro separado de BMC. 91557-9 e 88334-8 incluem esse mineral no peso sem gordura; 73964-9 mede massa muscular. Nenhum equivalente de tecido magro sem BMC encontrado nas buscas registradas. |
| `VATVolume`           | 73707-2 mede área de gordura visceral; não equivale a massa, volume ou índice do aparelho.                                                                                                                                                 |
| `VATMass`             | 73707-2 mede área de gordura visceral; não equivale a massa, volume ou índice do aparelho.                                                                                                                                                 |
| `AndroidGynoidRatio`  | Nenhum resultado regional androide/ginoide encontrado; 41982-0 é percentual corporal total.                                                                                                                                                |
| `AndroidFatPct`       | Nenhum resultado regional androide/ginoide encontrado; 41982-0 é percentual corporal total.                                                                                                                                                |
| `GynoidFatPct`        | Nenhum resultado regional androide/ginoide encontrado; 41982-0 é percentual corporal total.                                                                                                                                                |
| `MuscleMassIndex`     | Os candidatos medem massa muscular ou sua fração do peso; não massa por altura ao quadrado.                                                                                                                                                |
| `VisceralFatLevel`    | 73707-2 mede área de gordura visceral; não equivale a massa, volume ou índice do aparelho.                                                                                                                                                 |
| `ECWToTBWRatio`       | Sem razão ECW/TBW encontrada; 101684-9 é percentual de água no corpo, com outro denominador.                                                                                                                                               |
| `ResidualMass`        | Nenhuma massa residual antropométrica encontrada nas buscas registradas.                                                                                                                                                                   |
| `WaistToHeightRatio`  | Nenhuma razão cintura/altura encontrada; 8280-0 mede só a circunferência da cintura.                                                                                                                                                       |
| `ConicityIndex`       | Nenhum índice de conicidade encontrado nas buscas registradas.                                                                                                                                                                             |
| `SkinfoldSubscapular` | Só foram encontradas dobras de coxa, tríceps e cintura; nenhum termo do sítio anatômico desta entrada.                                                                                                                                     |
| `SkinfoldSuprailiac`  | Só foram encontradas dobras de coxa, tríceps e cintura; nenhum termo do sítio anatômico desta entrada.                                                                                                                                     |
| `SkinfoldChest`       | Só foram encontradas dobras de coxa, tríceps e cintura; nenhum termo do sítio anatômico desta entrada.                                                                                                                                     |
| `SkinfoldMidaxillary` | Só foram encontradas dobras de coxa, tríceps e cintura; nenhum termo do sítio anatômico desta entrada.                                                                                                                                     |
| `ArmsLeanMass`        | Nenhuma massa de tecido magro regional encontrada; 91557-9 é peso magro corporal total.                                                                                                                                                    |
| `ArmsFatMass`         | Nenhuma massa de gordura regional encontrada; 73708-0 é gordura corporal total.                                                                                                                                                            |
| `LegsLeanMass`        | Nenhuma massa de tecido magro regional encontrada; 91557-9 é peso magro corporal total.                                                                                                                                                    |
| `LegsFatMass`         | Nenhuma massa de gordura regional encontrada; 73708-0 é gordura corporal total.                                                                                                                                                            |
| `TrunkLeanMass`       | Nenhuma massa de tecido magro regional encontrada; 91557-9 é peso magro corporal total.                                                                                                                                                    |
| `TrunkFatMass`        | Nenhuma massa de gordura regional encontrada; 73708-0 é gordura corporal total.                                                                                                                                                            |
| `TScore_Total`        | Os T-scores encontrados são por sítio (fêmur, quadril ou coluna), não corpo inteiro.                                                                                                                                                       |
| `ZScore_Total`        | Os Z-scores encontrados são por sítio (fêmur, quadril ou coluna lombar), não corpo inteiro.                                                                                                                                                |

<!-- catalog:counts:end -->

O CI roda `pnpm catalog:check` e reprova quando o catálogo anda sem o texto
acompanhar. Por isso esta é a formulação para citar em apresentação, artigo ou
proposta. Números escritos à mão em outro lugar não são conferidos por nada.

---

## Padrões e compliance

- **FHIR R4** — Todos os recursos seguem o padrão HL7 FHIR R4
- **LOINC** — Códigos LOINC verificados para interoperabilidade
- **SBPC/ML** — Faixas de referência baseadas nas diretrizes brasileiras
- **SNOMED CT** — Qualificadores para resultado ordinal (Negativo, Traços, ++), ao lado da resposta LOINC
- **UCUM** — Unidades no formato Unified Code for Units of Measure
- **TUSS/TISS** — Terminologias ANS para saúde suplementar
- **CID-10 pt-BR** — Classificação Internacional de Doenças (tradução DATASUS)
- **IBGE/CNES** — Códigos de município e tipos de estabelecimento de saúde

---

## Roadmap

- [x] `@precisa-saude/fhir` — Core: tipos FHIR R4, biomarcadores, faixas de referência, conversores
- [x] `@precisa-saude/fhir-ocr-utils` — Utilitários OCR: ancoragem de biomarcadores em texto
- [x] Contrato de extração — schema público que qualquer modelo pode preencher, e a conferência da saída contra a ancoragem
- [x] `@precisa-saude/fhir-pdf` — Camada de texto de PDF, fechando o caminho do laudo até o FHIR
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

As respostas de resultado ordinal também trazem 12 qualificadores SNOMED CT. O
Brasil é membro da SNOMED International, e o uso no país não tem custo, mas
exige registro no centro nacional de distribuição; fora dos países membros,
depende de licença de afiliado:

> This material includes content from SNOMED Clinical Terms® (SNOMED CT®),
> which is copyright of the International Health Terminology Standards
> Development Organisation (IHTSDO), trading as SNOMED International.
> Implementers must have the appropriate SNOMED CT Affiliate license; see
> http://www.snomed.org/snomed-ct/get-snomed-ct or contact info@snomed.org.

O nome oficial de cada código fica em
[`scripts/loinc-snapshot.json`](scripts/loinc-snapshot.json), que a seção 10.3
da licença exige acompanhar o código sempre que ele é redistribuído. O
`pnpm loinc:check` confere esse arquivo contra o servidor oficial — veja
[`scripts/README.md`](scripts/README.md).

---

Mantido por [Precisa Saúde](https://precisa-saude.com.br)
