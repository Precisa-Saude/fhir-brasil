# ADR-001: Manter calculadoras clínicas no monorepo fhir-brasil

**Data:** 2026-04-07
**Status:** Aceito
**Revisão:** Outubro 2026

## Contexto

O pacote `@precisa-saude/fhir-calculators` contém calculadoras clínicas (PhenoAge, BrDMrisc, HOMA-IR, VLDL, IMC) que operam sobre dados de biomarcadores para produzir métricas derivadas de saúde. A questão é se essas calculadoras pertencem ao monorepo fhir-brasil ou se deveriam ser separadas em um repositório `precisa-saude/clinical-calculators`.

## Decisão

Manter as calculadoras no monorepo fhir-brasil.

## Argumentos a favor (manter)

- **Dependência direta do core:** As calculadoras importam tipos, biomarcadores e faixas de referência de `@precisa-saude/fhir`. Separar criaria acoplamento de versão entre repositórios.
- **Testes cruzados:** O monorepo permite testar calculadoras contra o core em cada CI run, detectando breaking changes imediatamente.
- **Marketing unificado:** O site já apresenta calculadoras como um dos 4 pilares da solução. Separar exigiria atualizar site, README, e documentação.
- **Churn desnecessário:** Separar agora quebraria installs existentes, perderia testes cruzados, e exigiria duplicar configuração de CI/CD — tudo para benefício limitado.
- **Diferenciação:** Calculadoras clínicas diferenciam fhir-brasil de bibliotecas puramente de plumbing de dados.

## Argumentos contra (separar)

- **Escopo clínico vs infraestrutura:** O nome fhir-brasil implica trabalho de interoperabilidade FHIR, não lógica clínica.
- **Necessidades de revisão diferentes:** Calculadoras podem requerer sign-off médico e citações clínicas com rigor diferente.
- **Crescimento independente:** Um repositório separado poderia crescer sem ser constrangido pelo posicionamento FHIR.
- **Percepção institucional:** Se HL7 Brasil reconhecer fhir-brasil como infraestrutura canônica, calculadoras no escopo podem confundir o boundary.

## Consequências

- Calculadoras permanecem em `packages/calculators/` com a mesma cadência de release dos outros pacotes.
- Se a comunidade FHIR brasileira crescer e houver demanda por separação, o caminho de migração é bem compreendido (novo repo, mover src/, atualizar imports).
- Revisitar esta decisão em 6 meses (outubro 2026) com base na recepção dos perfis FHIR (Stage 3) e feedback da comunidade.
