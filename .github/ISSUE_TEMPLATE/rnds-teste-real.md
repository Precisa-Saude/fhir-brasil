---
name: Resultado de teste com RNDS real
about: Reportar resultados de testes do Cliente RNDS contra infraestrutura real do DATASUS
title: '[RNDS] Resultado de teste contra ambiente real'
labels: rnds
assignees: ''
---

## Ambiente testado

- [ ] Homologação (`ehr-services.hmg.saude.gov.br`)
- [ ] Produção (`ehr-services.saude.gov.br`)

## Versão do pacote

`@precisa-saude/fhir-rnds` versão:

## Operações testadas

- [ ] Autenticação (obtenção de token JWT via mTLS)
- [ ] `getPatientByCpf`
- [ ] `getPatientByCns`
- [ ] `getOrganizationByCnes`
- [ ] `getPractitionerByCns`
- [ ] `submitBundle`

## Resultados

### Operações que funcionaram conforme esperado

<!-- Descreva quais operações funcionaram corretamente -->

### Operações que falharam ou divergiram do esperado

<!-- Descreva quais operações falharam, incluindo mensagens de erro (sem dados sensíveis) -->

### Diferenças observadas em relação ao mock

<!-- Diferenças entre o comportamento real e o esperado pelo mock (formato de resposta, headers, etc.) -->

## Informações adicionais

<!-- Qualquer contexto adicional relevante. NÃO inclua certificados, senhas, CPFs reais ou dados de pacientes. -->
