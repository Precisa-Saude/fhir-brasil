# Plano de Implementação — fhir-brasil v1.0

**Projeto Linear:** [fhir-brasil v1.0](https://linear.app/precisa-saude/project/fhir-brasil-v10-ff0225772b16)
**Baseado em:** spec v3-final
**Data:** 2026-04-07

## Objetivo

Evoluir o fhir-brasil de "biblioteca TypeScript útil" para "Implementation Guide brasileiro canônico". Alinhar materiais públicos com estado real do código, adicionar disclosure responsável do RNDS, e criar o primeiro perfil FHIR formal via FSH/SUSHI.

## Status Atual

- 4 pacotes publicados (core v0.6.1, calculators v0.6.1, ocr-utils v0.6.1, rnds v0.1.0)
- 397+ testes, cobertura >80%
- README e site com desalinhamentos (contagem "200+" no site vs 184 reais, nomes de empresas)
- RNDS sem disclosure de status de produção
- Sem perfis FHIR formais (StructureDefinition)

---

## Stages e Tickets Linear

### Stage 1 — Alinhamento de Credibilidade

| Ticket  | Título                                                         | Prioridade |
| ------- | -------------------------------------------------------------- | ---------- |
| PRE-157 | Reconciliar README (4 pacotes, badges, trimmar posicionamento) | Urgent     |
| PRE-158 | Auditar metadata package.json (engines, keywords)              | High       |
| PRE-159 | Reconciliar marketing site (contagem, nomes, disclosure)       | High       |
| PRE-160 | Atualizar CLAUDE.md com rnds                                   | Medium     |
| PRE-161 | Cortar release v0.6.2 (bloqueado por PRE-157..160)             | Medium     |

### Stage 2 — Credibilidade RNDS

| Ticket  | Título                                                 | Prioridade |
| ------- | ------------------------------------------------------ | ---------- |
| PRE-162 | Extrair fixtures de teste RNDS para JSON               | Medium     |
| PRE-163 | Criar disclosure "Status de Produção" e issue template | High       |
| PRE-164 | Testes de integração com msw (opcional)                | Low        |

### Stage 3 — FHIR Implementation Guide

| Ticket  | Título                                                 | Prioridade |
| ------- | ------------------------------------------------------ | ---------- |
| PRE-165 | Inicializar ig/ com sushi-config e aliases             | High       |
| PRE-166 | Perfil BRLabObservation em FSH (bloqueado por PRE-165) | High       |
| PRE-167 | Extensão derivedFromOCR                                | Medium     |
| PRE-168 | ValueSet BRLabTestVS                                   | Medium     |
| PRE-169 | Exemplos de Observation (bloqueado por PRE-166, 167)   | Medium     |
| PRE-170 | Integrar SUSHI ao CI (bloqueado por PRE-165)           | High       |

### Stage 4 — Melhorias Core

| Ticket  | Título                             | Prioridade |
| ------- | ---------------------------------- | ---------- |
| PRE-171 | ADR-001: calculadoras no monorepo  | Low        |
| PRE-172 | Helpers CPF/CNS com conversão FHIR | Medium     |
| PRE-173 | Expandir BiomarkerUnitConfig       | Low        |

### Stage 5 — Features Avançadas

| Ticket  | Título                                                        | Prioridade |
| ------- | ------------------------------------------------------------- | ---------- |
| PRE-174 | JSON Schemas a partir dos perfis FHIR (bloqueado por PRE-166) | Low        |
| PRE-175 | Exemplo de integração Medplum                                 | Low        |

### Backlog (Tier 3)

| Ticket  | Título                                              |
| ------- | --------------------------------------------------- |
| PRE-176 | Perfis adicionais (BRPatient, BRDiagnosticReport)   |
| PRE-177 | Terminologia brasileira (TUSS, CID-10 pt-BR, CBHPM) |
| PRE-178 | Validação real RNDS contra DATASUS                  |
| PRE-179 | Higiene operacional (CODE_OF_CONDUCT, CITATION.cff) |

---

## Divergências da Spec

| Item               | Spec pede                | Decisão                      | Razão                                      |
| ------------------ | ------------------------ | ---------------------------- | ------------------------------------------ |
| Mock server RNDS   | Express/Fastify completo | Fixtures JSON + disclosure   | Over-engineering; valor está no disclosure |
| IG Publisher no CI | Implícito                | SUSHI-only                   | Java, ~5-10min, centenas de MB             |
| UCUM module        | Parser completo          | Expandir BiomarkerUnitConfig | Parser genérico é escopo enorme            |
| Validation API     | ajv no core              | JSON Schema exportado do IG  | Viola zero-deps do core                    |
| Python bindings    | Pacote PyPI              | Descartado                   | Prematuro                                  |
| CQL layer          | Avaliar cql-execution    | Backlog apenas               | Muito nicho                                |

## Ordem de Execução

```
Stage 1 (README + site + npm) ──→ v0.6.2
    ↓
Stage 2 (RNDS disclosure) ──→ v0.7.0
    ↓
Stage 3 (FHIR IG/SUSHI) ──→ v0.8.0
    ↓
Stage 4 (CPF/CNS, ADR) ──→ v0.9.0
    ↓
Stage 5 (JSON Schema, Medplum) ──→ v1.0.0
```
