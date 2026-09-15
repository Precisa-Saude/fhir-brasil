# Convenções

## Nomenclatura

- **Arquivos**: `kebab-case.ts` (ex: `reference-ranges.ts`, `unit-converter.ts`)
- **Tipos/Interfaces**: `PascalCase` (ex: `BiomarkerDefinition`, `FHIRObservation`)
- **Funções**: `camelCase` (ex: `getReferenceRange`, `codeToLoinc`)
- **Constantes**: `UPPER_SNAKE_CASE` para mapas de dados (ex: `BIOMARKER_DEFINITIONS`, `UNIT_TO_UCUM`)
- **Códigos de biomarcadores**: `PascalCase` com underscores para nomes compostos (ex: `HbA1c`, `LDL_Peak_Size`, `BodyFatPct`)

## Imports

- Use imports relativos dentro de um pacote (`./biomarkers`)
- Use imports de pacote entre pacotes (`@precisa-saude/fhir`)
- Barrel exports em `index.ts` — re-exporte tudo que é público
- Sub-path exports para tree-shaking (ex: `@precisa-saude/fhir/biomarkers`)

## Erros

- Lance `Error` com mensagens descritivas para erros de programação
- Retorne `null`/`undefined` para casos esperados de "não encontrado"
- Funções de validação retornam `{ valid: boolean; errors: string[] }`

## Testes

- Co-localizados no diretório `src/__tests__/`
- Nomenclatura de arquivos: `<módulo>.test.ts`
- Use blocos `describe` correspondendo ao nome da função/módulo
- Teste edge cases: códigos desconhecidos, campos ausentes, valores limítrofes
- Limiar de cobertura: 80% (statements, branches, functions, lines)

## Commits

- Formato: `tipo(escopo): descrição em pt-BR`
- Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`
- Escopos: `core`, `ocr-utils`, `rnds`, `docs`, `ci`
- Mensagens concisas, modo imperativo, em português brasileiro
- Exemplos:
  - `feat(core): adicionar definição do biomarcador Cistatina C`
  - `fix(core): corrigir conversão de unidade para creatinina`
  - `docs: atualizar README com novos exemplos de uso`

### Nunca escrever o marcador de pular CI

O GitHub procura o marcador `[skip` + `ci]` na mensagem **inteira** do commit,
não só no assunto, e o honra mesmo dentro de crase. Escrevê-lo em prosa, ainda
que para explicar o comportamento de outro commit, faz o push não disparar
workflow nenhum.

Aconteceu na #104: o corpo do commit explicava que o commit de release carrega
esse marcador, o texto foi junto no squash-merge, e a main recebeu a mudança
sem rodar CI. Sem CI não roda o `semantic-release`, e o pacote ficou sem
publicar com a correção já mergeada — invisível para quem dependia dela, e sem
nenhum aviso.

Ao descrever o comportamento, escrever o nome do marcador em vez do literal.
Vale também para corpo de PR, que vira mensagem de commit no squash-merge.
