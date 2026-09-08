# fhir-brasil Implementation Guide

Este diretório contém o Implementation Guide (IG) do fhir-brasil, escrito em [FHIR Shorthand (FSH)](https://build.fhir.org/ig/HL7/fhir-shorthand/) e compilado com [SUSHI](https://fshschool.org/docs/sushi/).

## Publicação

**O pacote ainda não está publicado em registro nenhum.** `br.dev.fhir-brasil.core`
não resolve no [FHIR Package Registry](https://packages.fhir.org/catalog?name=br.dev.fhir-brasil.core)
nem no [Simplifier](https://simplifier.net/packages/br.dev.fhir-brasil.core): as
duas consultas voltam vazias. Não cite o pacote como instalável.

O workflow `_publish-ig.yml` existe e está pronto, mas nada o chama e o
`SIMPLIFIER_API_KEY` não está configurado no repositório.

Até lá, compile localmente:

```bash
pnpm exec sushi ig/ -o ig/output
node ig/scripts/build-package-tgz.js
```

## Conteúdo

### Perfis

- **BRPatient** — Restringe `Patient` para o contexto do SUS: exige nome, data de nascimento, sexo e pelo menos um identificador brasileiro, CPF ou CNS, conferido por invariante.
- **BRLabObservation** — Perfil para resultados de exames laboratoriais brasileiros. Restringe `Observation` com código LOINC obrigatório, unidade UCUM, faixa de referência e suporte a dados derivados de OCR.
- **BRDiagnosticReport** — Restringe `DiagnosticReport` para laudos laboratoriais: categoria `LAB` obrigatória, status limitado a `final`, `amended` ou `corrected`, sujeito em `BRPatient` e resultados em `BRLabObservation`.

### Extensões

- **DerivedFromOCR** — Indica se uma Observation foi extraída de PDF via OCR. Permite que consumidores apliquem limiares de confiança diferentes.

### CodeSystems

- **BRSUSRacaCorCS** — Classificação de raça/cor do SUS (5 categorias IBGE).
- **BRTISSCS** — Tipos de guia do padrão TISS (ANS).
- **BRCNESCS** — Tipos de estabelecimento de saúde (CNES/DATASUS).
- **BRTUSSCS** — Terminologia Unificada da Saúde Suplementar (ANS). Stub `#not-present` — códigos nos ValueSets.
- **BRCID10CS** — CID-10 pt-BR (DATASUS/Edusp). Stub `#not-present` — códigos nos ValueSets.
- **BRIBGEMunicipioCS** — Códigos de município IBGE. Stub `#not-present`.

### ValueSets

- **BRLabTestVS** — Códigos LOINC para exames laboratoriais suportados. Gerado por `pnpm valueset:generate` a partir do catálogo do core, e o número fica na `Description` do arquivo `.fsh`, não aqui, para não congelar de novo.
- **BRLabObservationStatusVS** — Status permitidos para resultados laboratoriais (`final`, `amended`, `corrected`).
- **BRSUSRacaCorVS** — Todos os valores de raça/cor do SUS.
- **BRTISSGuiasVS** — Tipos de guia TISS.
- **BRTUSSProcedimentosLabVS** — Subset TUSS para procedimentos laboratoriais. **Não cite este ValueSet.** A auditoria em `fhir-brasil-tuss-audit.md`, no `datasus-sdk`, achou 57 dos 59 códigos desalinhados em relação à tabela oficial da ANS. A correção é trabalho separado.
- **BRCID10MetabolicoVS** — Subset CID-10 para diagnósticos metabólicos (diabetes, dislipidemias, obesidade, tireoide, deficiências nutricionais).

### Exemplos

- Colesterol total normal
- HDL com faixa de referência sexo-específica
- Glicose derivada de OCR

## Compilar localmente

```bash
# Instalar SUSHI (requer Node.js >= 18)
npm install -g fsh-sushi

# Compilar o IG
sushi ig/ -o ig/output

# Ou via npx (sem instalação global)
npx fsh-sushi ig/ -o ig/output
```

A compilação produz StructureDefinition JSON em `ig/output/`. Para gerar o site HTML completo do IG, é necessário o [IG Publisher](https://confluence.hl7.org/display/FHIR/IG+Publisher+Documentation) (requer Java 17+).

## Terminologias brasileiras incluídas

| CodeSystem     | Origem                     | Licenciamento                      | Conteúdo FSH             |
| -------------- | -------------------------- | ---------------------------------- | ------------------------ |
| TUSS           | ANS (gov.br, dados.gov.br) | Dado aberto, Lei 12.527/2011       | Stub `#not-present`      |
| TISS           | ANS (RN 501/2022)          | Padrão obrigatório, acesso público | Completo (tipos de guia) |
| CID-10 pt-BR   | DATASUS/Edusp              | Uso livre com atribuição           | Stub `#not-present`      |
| SUS Raça/Cor   | IBGE/Ministério da Saúde   | Domínio público                    | Completo (5 códigos)     |
| IBGE Município | IBGE                       | Domínio público                    | Stub `#not-present`      |
| CNES Tipos     | DATASUS                    | Livre para uso                     | Completo (~35 tipos)     |

**CBHPM** foi excluída por ser publicação comercial (AMB/Editora Manole). TUSS já cobre os códigos de procedimentos para saúde suplementar, pois é a republicação da CBHPM pela ANS sob autoridade regulatória.

**Atribuição CID-10**: Os direitos de publicação da CID-10 em português pertencem à Edusp. Os arquivos podem ser utilizados livremente por desenvolvedores de sistemas desde que sejam dados os devidos créditos e não seja cobrado pelo seu uso.

## Contribuir

1. Edite ou crie arquivos `.fsh` no diretório apropriado (`codesystems/`, `profiles/`, `extensions/`, `valuesets/`, `examples/`)
2. Compile com `sushi ig/` para verificar erros de sintaxe
3. O CI roda SUSHI automaticamente em cada PR — falha de compilação bloqueia merge

## Referências

- [FHIR Shorthand (FSH)](https://build.fhir.org/ig/HL7/fhir-shorthand/)
- [SUSHI — documentação](https://fshschool.org/docs/sushi/)
- [FHIR R4 — Observation](https://hl7.org/fhir/R4/observation.html)
