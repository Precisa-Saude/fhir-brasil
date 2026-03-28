# Instruções para o Claude

NÃO use "You're absolutely right" ou equivalentes. Mantenha um tom profissional e positivo sem entusiasmo desnecessário.

## Visão Geral do Projeto

Este é o monorepo open-source `fhir-brasil` — um toolkit FHIR R4 brasileiro com definições de biomarcadores, faixas de referência e calculadoras clínicas.

## Estrutura do Monorepo

```
packages/
  core/          — Tipos FHIR R4, 183+ biomarcadores, faixas de referência, conversores
  calculators/   — PhenoAge, BrDMRisc, HOMA-IR, VLDL, IMC
  ocr-utils/     — Ancoragem OCR para extração de biomarcadores
```

## Comandos

```bash
pnpm install                    # Instalar dependências
pnpm turbo run build            # Compilar todos os pacotes
pnpm turbo run typecheck        # Verificar tipos
pnpm turbo run lint             # Verificar lint
pnpm turbo run test             # Rodar todos os testes
pnpm turbo run test:coverage    # Rodar testes com cobertura
```

## Convenções

- **TypeScript strict mode** com `noUncheckedIndexedAccess`
- **ESM + CJS** via tsup
- **Vitest** para testes, limiar de 80% de cobertura
- **Zero dependências runtime** em `@fhir-brasil/core`
- Mensagens de commit: `tipo(escopo): descrição` — escopos: `core`, `calculators`, `ocr-utils`, `docs`, `ci`

## Adicionar Novas Dependências

**Sempre perguntar antes de adicionar dependências npm.** Forneça uma breve descrição do que o pacote faz e por que é necessário. Isso permite ao usuário:

- Sugerir alternativas que já conheça
- Avaliar se a dependência é necessária
- Considerar impacto no bundle e manutenção

**Regras de dependência:**

- `@fhir-brasil/core` deve ter **zero dependências runtime**
- `@fhir-brasil/calculators` depende apenas de `@fhir-brasil/core`
- `@fhir-brasil/ocr-utils` depende apenas de `@fhir-brasil/core`
- Pergunte antes de adicionar qualquer dependência runtime externa

## Seguir Planos Acordados — Sem Desvios Silenciosos

**CRÍTICO**: Ao implementar uma feature baseada em um plano acordado (em `docs/development/` ou `.claude/plans/`), você DEVE seguir o plano exatamente ou perguntar explicitamente antes de desviar.

**A abordagem correta:**

1. Se um passo parece complexo, **pergunte primeiro**: "Este passo requer X. Devo prosseguir ou preferimos uma abordagem mais simples?"

2. Se quiser simplificar, **proponha a mudança explicitamente**: "Posso criar uma versão mais simples primeiro como MVP. Funciona?"

3. **Nunca substitua silenciosamente** uma implementação mais simples pelo que foi acordado

4. Se os dados precisam vir de uma fonte oficial (LOINC, SBPC/ML, etc.), **não invente valores** — integre a fonte real ou sinalize a lacuna

## Commits Requerem Permissão

**CRÍTICO**: Sempre peça permissão antes de criar commits. Nunca faça commit sem aprovação explícita do usuário.

**Correto**: "Fiz as alterações. Posso commitar com a mensagem: 'fix(core): corrigir faixas duplicadas'?"

Isso permite ao usuário:

- Revisar as alterações antes do commit
- Ajustar a mensagem de commit
- Decidir se divide as alterações em múltiplos commits

## Sempre Usar Pull Requests

**CRÍTICO**: Nunca faça push direto na main. Sempre crie um pull request para code review.

**Fluxo**:

1. Criar branch de feature a partir da main
2. Fazer commits na branch de feature
3. Fazer push da branch e abrir um PR
4. Merge via GitHub após revisão

**Se acidentalmente fez commit na main**:

```bash
git branch feature-branch
git reset --hard origin/main
git checkout feature-branch
git push -u origin feature-branch
gh pr create --title "..." --body "..."
```

## Nunca Pular Git Hooks

**CRÍTICO**: Nunca use `--no-verify`, `--no-gpg-sign`, ou qualquer flag que pule git hooks. Isso se aplica a `git commit`, `git push` e todos os outros comandos git. Se um hook falhar (ex: verificação de cobertura no pre-push), **corrija o problema subjacente** em vez de contornar o hook.

Se os limiares de cobertura falharem no push:

1. Adicione testes para elevar a cobertura acima do limiar
2. Flutuações de cobertura dentro de ~0.5% do limiar são esperadas — adicione um teste rápido para cobrir a lacuna
3. Nunca abaixe os limiares ou pule hooks como solução alternativa

## Diretrizes de Commits Git

**CRÍTICO**: Sempre faça pull antes de commitar para manter histórico linear:

```bash
git pull --rebase origin main
```

**Nunca** use `git pull` sem `--rebase` ou `git merge`, pois isso cria merge commits.

Ao criar commits, NÃO inclua linhas de atribuição de IA. Mantenha as mensagens de commit limpas e profissionais.

**Mensagens de commit em pt-BR**: Todas as mensagens de commit devem ser escritas em português brasileiro. O tipo (`feat`, `fix`, `refactor`, etc.) permanece em inglês (convenção universal), mas a descrição deve ser em pt-BR.

**Exemplos**:
- `feat(core): adicionar definição do biomarcador Cistatina C`
- `fix(calculators): corrigir conversão de unidade para creatinina`
- `docs: atualizar README com novos exemplos de uso`
- `test(ocr-utils): adicionar testes para ancoragem com diacríticos`

**Escopos de mensagem de commit**: Use apenas estes escopos válidos:

- `core`, `calculators`, `ocr-utils` — Alterações específicas de pacote
- `docs` — Atualizações de documentação
- `ci` — Alterações de CI/CD
- `deps` — Atualizações de dependências
- `lint` — Alterações de linting/formatação

**CRÍTICO**: Sempre rode lint e typecheck antes de commitar:

```bash
pnpm turbo run lint typecheck
```

### Assinatura GPG de Commits

**Todos os commits devem ser assinados** usando a chave GPG para `rlueder@pm.me`:

- **Key ID**: `0EBDED434F6DD42DB42021ACD286645D568C89F2`
- Git está configurado com `commit.gpgsign = true` globalmente

## Nome da Empresa

A grafia correta é "Precisa Saúde" (com espaço e acento).

## Diretrizes de Dados Médicos

- Todas as definições de biomarcadores incluem códigos LOINC para interoperabilidade
- Faixas de referência citam fontes (SBPC/ML, SBC, SBD, etc.)
- Nunca fabrique valores clínicos — use diretrizes publicadas ou sinalize lacunas
- Aviso legal médico deve estar presente em todos os READMEs de pacotes

## Referências Científicas — Fontes Proibidas

**CRÍTICO**: Nunca use `labtestsonline.org.br` como fonte em arquivos de conteúdo de biomarcadores. É um portal comercial, não uma fonte acadêmica autoritativa.

**Fontes proibidas** (não citar em seções `Fontes`):

- `labtestsonline.org.br` — portal comercial de testes laboratoriais
- Páginas iniciais genéricas de organizações (ex: `diabetes.org.br/`, `endocrino.org.br/`, `cardiol.br/`) — use URLs de publicações específicas

**Fontes aceitáveis** (sempre preferir nesta ordem):

1. Artigos PubMed (`pubmed.ncbi.nlm.nih.gov/PMID/`)
2. Artigos SciELO Brasil (`scielo.br/j/...`)
3. PDFs de diretrizes oficiais (ex: SBD `diretriz.diabetes.org.br/editorial/`, PDF ABESO, relatórios técnicos OMS)
4. Publicações específicas de sociedades com DOI/ISBN (não URLs de páginas iniciais)

## Cobertura de Testes

**CRÍTICO**: Nunca abaixe os limiares de cobertura de testes para fazer os checks passarem. A cobertura deve aumentar ao longo do tempo, não diminuir.

Quando os checks de cobertura falharem:

1. **Adicione testes** para aumentar a cobertura do código novo ou modificado
2. **Foque em cobertura de branches** — frequentemente o limiar mais difícil de atingir
3. **Procure ganhos rápidos** — arquivos com muitas branches não testadas que são fáceis de testar

## Manter Documentação Atualizada

Ao fazer alterações significativas, atualize a documentação relevante:

| Tipo de Alteração            | Arquivos a Atualizar                  |
| ---------------------------- | ------------------------------------- |
| Novo pacote                  | `README.md` (estrutura do projeto)    |
| Novo biomarcador             | `README.md` (contagem de biomarcadores) |
| Nova calculadora             | `README.md`, README do pacote         |
| Mudanças de API              | README do pacote, `CONVENTIONS.md`    |
| Atualização de faixa de ref. | Citação da fonte no código            |

## Persistência de Planos

Ao criar planos de implementação durante conversas:

1. **Sempre salve planos no codebase** — Planos devem ser persistidos para referência entre sessões
2. **Local**: Salve planos em `docs/development/PLAN.md`
3. **Formato**: Use markdown claro com seções para:
   - Objetivo: O que estamos tentando alcançar
   - Status Atual: O que foi concluído
   - Próximos Passos: Lista ordenada de tarefas restantes
   - Contexto: Decisões técnicas relevantes
4. **Atualize regularmente**: Mantenha o arquivo de plano atualizado conforme o trabalho progride
5. **Arquive planos concluídos**: Mova para `docs/development/completed/YYYY-MM-DD-nome-plano.md`
