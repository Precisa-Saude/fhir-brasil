# Contribuindo

Obrigado pelo interesse em contribuir com o fhir-brasil!

## Como Contribuir

### Reportar Bugs

1. Verifique se o bug já foi reportado nas [Issues](https://github.com/precisa-saude/fhir-brasil/issues)
2. Abra uma nova issue com:
   - Descrição clara do problema
   - Passos para reproduzir
   - Comportamento esperado vs. obtido
   - Versão do pacote

### Propor Melhorias

1. Abra uma issue descrevendo a melhoria
2. Aguarde feedback antes de implementar
3. Para dados clínicos, inclua a referência bibliográfica

### Pull Requests

1. Faça fork do repositório
2. Crie um branch: `git checkout -b feat/minha-feature`
3. Faça suas alterações seguindo as convenções em `CONVENTIONS.md`
4. Adicione ou atualize testes
5. Verifique que tudo passa:
   ```bash
   pnpm turbo run build typecheck lint test
   ```
6. Abra o PR com descrição clara

### Dados Médicos

Contribuições envolvendo dados clínicos (faixas de referência, definições de biomarcadores, calculadoras) **devem incluir referências bibliográficas** de fontes confiáveis:

- Diretrizes SBPC/ML, SBC, SBD, SBEM
- Artigos PubMed com PMID
- Artigos SciELO com DOI
- Relatórios técnicos OMS/WHO

**Não** aceitamos dados sem referência ou de fontes comerciais.

## Código de Conduta

Esperamos que todos os contribuidores mantenham um ambiente respeitoso e construtivo. Comportamento abusivo, discriminatório ou assediador não será tolerado.

## Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a [Apache License 2.0](LICENSE).
