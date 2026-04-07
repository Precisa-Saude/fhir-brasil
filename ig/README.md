# fhir-brasil Implementation Guide

Este diretório contém o Implementation Guide (IG) do fhir-brasil, escrito em [FHIR Shorthand (FSH)](https://build.fhir.org/ig/HL7/fhir-shorthand/) e compilado com [SUSHI](https://fshschool.org/docs/sushi/).

## Conteúdo

### Perfis

- **BRLabObservation** — Perfil para resultados de exames laboratoriais brasileiros. Restringe `Observation` com código LOINC obrigatório, unidade UCUM, faixa de referência e suporte a dados derivados de OCR.

### Extensões

- **DerivedFromOCR** — Indica se uma Observation foi extraída de PDF via OCR. Permite que consumidores apliquem limiares de confiança diferentes.

### ValueSets

- **BRLabTestVS** — Códigos LOINC para exames laboratoriais suportados (subset inicial: 18 biomarcadores cardiovasculares).
- **BRLabObservationStatusVS** — Status permitidos para resultados laboratoriais (`final`, `amended`, `corrected`).

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

## Contribuir

1. Edite ou crie arquivos `.fsh` no diretório apropriado (`profiles/`, `extensions/`, `valuesets/`, `examples/`)
2. Compile com `sushi ig/` para verificar erros de sintaxe
3. O CI roda SUSHI automaticamente em cada PR — falha de compilação bloqueia merge

## Referências

- [FHIR Shorthand (FSH)](https://build.fhir.org/ig/HL7/fhir-shorthand/)
- [SUSHI — documentação](https://fshschool.org/docs/sushi/)
- [FHIR R4 — Observation](https://hl7.org/fhir/R4/observation.html)
