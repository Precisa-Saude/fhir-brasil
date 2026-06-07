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
