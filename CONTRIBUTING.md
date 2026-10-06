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

### Uma grafia que o catálogo não reconhece

O caso mais comum, e o mais fácil de aceitar. Cada laboratório escreve o mesmo
exame de um jeito, e o catálogo só resolve o que alguém já escreveu nele. Quando
`findCodeByName` devolve vazio para um exame que existe sob outro nome, falta uma
grafia e não falta código.

Dá para abrir a issue **Grafia não reconhecida** e parar aí. Se quiser mandar o
pull request, ele é pequeno:

1. Ache a definição em `packages/core/src/biomarkers.ts`
2. Acrescente a grafia na lista `pt`, como o laboratório imprime, com acento e
   pontuação
3. Abra o PR com a linha do laudo que motivou a adição, **em texto**

Não precisa de teste novo, não mexe no código LOINC e não regenera o ValueSet do
IG. Exemplo de PR só com grafias: [#103](https://github.com/Precisa-Saude/fhir-brasil/pull/103).

Duas coisas que valem saber antes:

- **Não anexe o laudo.** A linha basta, e o documento carrega dado de paciente.
- **Grafia que serve a dois exames fica sem dono.** A busca prefere devolver
  vazio a chutar entre os dois, então esse caso vira conversa na issue antes do
  PR.

Exame que o catálogo não tem de jeito nenhum é outra coisa: aí é definição nova,
com código LOINC e referência, e vale a seção abaixo.

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
