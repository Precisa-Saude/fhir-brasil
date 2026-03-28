# Guia de Contribuição

Guia detalhado para contribuir com o fhir-brasil. Para informações resumidas, veja [CONTRIBUTING.md](../CONTRIBUTING.md).

## Setup do ambiente de desenvolvimento

### Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9
- **Git**

### Instalação

```bash
# Clonar o repositório
git clone https://github.com/precisa-saude/fhir-brasil.git
cd fhir-brasil

# Instalar dependências
pnpm install

# Compilar todos os pacotes
pnpm build

# Verificar que tudo está funcionando
pnpm test
```

### Estrutura do monorepo

```
fhir-brasil/
├── packages/
│   ├── core/              # @precisa-saude/fhir
│   │   └── src/
│   │       ├── biomarkers.ts         # Definições de biomarcadores
│   │       ├── reference-ranges.ts   # Faixas de referência
│   │       ├── converter.ts          # Conversor para FHIR R4
│   │       ├── importer.ts           # Importador de FHIR
│   │       ├── validators.ts         # Validadores
│   │       ├── units.ts              # Mapeamento de unidades
│   │       ├── types.ts              # Tipos genéricos
│   │       ├── fhir-types.ts         # Tipos FHIR R4
│   │       ├── i18n.ts               # Internacionalização
│   │       └── __tests__/            # Testes
│   ├── calculators/       # @precisa-saude/fhir-calculators
│   │   └── src/
│   │       ├── phenoage/             # Calculadora PhenoAge
│   │       ├── brdmrisc/             # Calculadora BrDMrisc
│   │       ├── derived/              # Biomarcadores derivados
│   │       └── __tests__/            # Testes
│   └── ocr-utils/         # @precisa-saude/fhir-ocr-utils
│       └── src/
│           ├── anchor.ts             # Ancoragem de biomarcadores em texto
│           └── __tests__/            # Testes
├── docs/                  # Documentação
├── examples/              # Exemplos executáveis
├── CONVENTIONS.md         # Convenções de código
└── CONTRIBUTING.md        # Guia resumido de contribuição
```

## Comandos úteis

```bash
# Compilar todos os pacotes
pnpm build

# Verificar tipos TypeScript
pnpm typecheck

# Executar linter
pnpm lint

# Executar testes
pnpm test

# Executar testes com cobertura
pnpm test:coverage

# Formatar código
pnpm format

# Verificar formatação
pnpm format:check

# Limpar artefatos de build
pnpm clean
```

Para executar comandos em um pacote específico:

```bash
# Testes apenas do pacote core
pnpm turbo run test --filter=@precisa-saude/fhir

# Build apenas das calculadoras
pnpm turbo run build --filter=@precisa-saude/fhir-calculators
```

## Testes e cobertura

### Executando testes

Os testes usam [Vitest](https://vitest.dev/) e ficam co-localizados em `src/__tests__/`:

```bash
# Todos os testes
pnpm test

# Com cobertura
pnpm test:coverage

# Modo watch (durante desenvolvimento)
cd packages/core && pnpm vitest --watch
```

### Limiar de cobertura

O limiar mínimo é **80%** para statements, branches, functions e lines. O CI rejeita PRs que baixem a cobertura abaixo desse limite.

### Escrevendo testes

```typescript
import { describe, expect, it } from 'vitest';
import { getReferenceRange } from '../reference-ranges';

describe('getReferenceRange', () => {
  it('deve retornar a faixa padrão quando não há contexto', () => {
    const faixa = getReferenceRange('Glucose');
    expect(faixa).toBeDefined();
    expect(faixa!.unit).toBe('mg/dL');
  });

  it('deve retornar undefined para código desconhecido', () => {
    expect(getReferenceRange('CodigoInexistente')).toBeUndefined();
  });

  it('deve retornar variante por sexo quando contexto é fornecido', () => {
    const faixa = getReferenceRange('Testosterone', {
      biologicalSex: 'M',
      age: 35,
    });
    expect(faixa).toBeDefined();
    expect(faixa!.min).toBeGreaterThan(0);
  });
});
```

**Boas práticas**:
- Nomes de testes em português, descritivos
- Testar o caminho feliz **e** os edge cases
- Testar códigos desconhecidos, campos ausentes, valores limítrofes
- Usar `describe` correspondendo ao nome da função ou módulo

## Como adicionar um novo biomarcador

### Passo 1: Adicionar a definição

Em `packages/core/src/biomarkers.ts`, adicione uma entrada no array `BIOMARKER_DEFINITIONS`:

```typescript
{
  category: 'nutrientes',        // Categoria clínica
  code: 'VitaminaK',            // Código canônico (PascalCase)
  loinc: '32622-8',             // Código LOINC (obrigatório quando existir)
  names: {
    en: ['Vitamin K', 'Phylloquinone'],
    pt: ['Vitamina K', 'Filoquinona'],
  },
  unit: 'ng/mL',                // Unidade padrão
},
```

**Regras**:
- O `code` deve ser `PascalCase` com underscores para nomes compostos (ex: `LDL_Peak_Size`)
- O `loinc` é obrigatório quando o código LOINC existe (alguns biomarcadores DEXA regionais não possuem)
- `names.pt[0]` é o nome principal exibido na interface
- Mantenha a ordem alfabética dentro da categoria

### Passo 2: Adicionar a faixa de referência

Em `packages/core/src/reference-ranges.ts`, adicione uma entrada em `biomarkerRangeDefinitions`:

```typescript
VitaminaK: {
  default: {
    min: 0.13,
    max: 1.19,
    optimalMin: 0.3,
    optimalMax: 0.9,
    unit: 'ng/mL',
  },
  source: 'SBPC/ML 2021',
},
```

Se houver variantes por sexo ou idade:

```typescript
Testosterone: {
  default: { min: 10, max: 1000, unit: 'ng/dL' },
  variants: [
    {
      sex: 'M',
      ageMin: 18,
      ageMax: 49,
      range: { min: 300, max: 1000, optimalMin: 500, optimalMax: 800, unit: 'ng/dL' },
    },
    {
      sex: 'F',
      range: { min: 15, max: 70, optimalMin: 20, optimalMax: 50, unit: 'ng/dL' },
    },
  ],
},
```

### Passo 3: Adicionar mapeamento de unidades (se necessário)

Em `packages/core/src/units.ts`, adicione o mapeamento para UCUM se a unidade ainda não estiver registrada.

### Passo 4: Escrever testes

Crie ou atualize testes em `packages/core/src/__tests__/`:

```typescript
it('deve encontrar definição de VitaminaK por código', () => {
  const def = getDefinitionByCode('VitaminaK');
  expect(def).toBeDefined();
  expect(def!.loinc).toBe('32622-8');
});

it('deve retornar faixa de referência para VitaminaK', () => {
  const faixa = getReferenceRange('VitaminaK');
  expect(faixa).toBeDefined();
  expect(faixa!.unit).toBe('ng/mL');
});
```

### Passo 5: Verificar tudo

```bash
pnpm turbo run build typecheck lint test --filter=@precisa-saude/fhir
```

### Passo 6: Referência bibliográfica obrigatória

Na mensagem do commit ou na descrição do PR, inclua a referência da faixa de referência:

```
feat(core): adicionar definição do biomarcador Vitamina K

Faixa de referência baseada nas diretrizes SBPC/ML 2021.
LOINC: 32622-8
```

## Como adicionar uma nova calculadora

### Passo 1: Criar a estrutura

```
packages/calculators/src/
└── minha-calculadora/
    ├── calculator.ts    # Lógica principal
    ├── constants.ts     # Coeficientes e constantes
    ├── types.ts         # Interfaces de entrada/saída
    ├── unit-converters.ts  # Conversão de unidades (se necessário)
    └── index.ts         # Barrel export
```

### Passo 2: Definir tipos

Em `types.ts`, defina as interfaces de entrada e saída:

```typescript
export interface MinhaCalculadoraInput {
  biomarcadorA: number;
  biomarcadorB: number;
}

export interface MinhaCalculadoraResult {
  score: number;
  calculatedAt: string;
}
```

### Passo 3: Implementar a lógica

Em `calculator.ts`, implemente a função principal:

```typescript
import type { MinhaCalculadoraInput, MinhaCalculadoraResult } from './types';

export function calculateMinhaCalc(input: MinhaCalculadoraInput): MinhaCalculadoraResult {
  // Implementação...
  return {
    score: resultado,
    calculatedAt: new Date().toISOString(),
  };
}
```

### Passo 4: Exportar no índice do pacote

Em `packages/calculators/src/index.ts`:

```typescript
export * as minhaCalc from './minha-calculadora';
```

### Passo 5: Escrever testes

Crie `packages/calculators/src/__tests__/minha-calculadora.test.ts` com casos de teste abrangentes, incluindo:

- Valores típicos
- Valores limítrofes
- Entradas inválidas
- Conversão de unidades (se aplicável)

### Passo 6: Documentar

Adicione uma seção em `docs/calculadoras.md` com:

- O que é a calculadora e qual problema resolve
- Referência bibliográfica (artigo original)
- Biomarcadores necessários e unidades
- Exemplo de uso
- Interpretação dos resultados

## Padrão de commits

Seguimos o formato [Conventional Commits](https://www.conventionalcommits.org/) em português:

```
tipo(escopo): descrição em pt-BR
```

### Tipos

| Tipo | Descrição |
|------|-----------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `test` | Adição ou atualização de testes |
| `docs` | Documentação |
| `chore` | Manutenção, configuração, dependências |
| `ci` | Integração contínua |

### Escopos

| Escopo | Pacote |
|--------|--------|
| `core` | `@precisa-saude/fhir` |
| `calculators` | `@precisa-saude/fhir-calculators` |
| `ocr-utils` | `@precisa-saude/fhir-ocr-utils` |
| `docs` | Documentação |
| `ci` | CI/CD |

### Exemplos

```
feat(core): adicionar definição do biomarcador Cistatina C
fix(calculators): corrigir conversão de unidade para creatinina
refactor(core): extrair lógica de normalização para função utilitária
test(calculators): adicionar testes para BrDMrisc com modelo 6
docs: atualizar guia de início rápido com exemplo de PhenoAge
chore: atualizar dependências do monorepo
```

**Regras**:
- Mensagens no imperativo: "adicionar", "corrigir", "atualizar" (não "adicionado", "corrigindo")
- Concisas e descritivas
- Em português brasileiro

## Processo de code review

1. **Abra um PR** com descrição clara do que mudou e por quê
2. **Testes passando**: o CI executa build, typecheck, lint e testes
3. **Cobertura**: não pode baixar abaixo de 80%
4. **Dados clínicos**: se o PR envolve faixas de referência ou coeficientes, deve incluir a referência bibliográfica
5. **Review**: pelo menos uma aprovação é necessária
6. **Merge**: squash merge no branch principal

### Checklist para reviewers

- [ ] Os tipos estão corretos e bem definidos?
- [ ] Os testes cobrem os edge cases?
- [ ] As faixas de referência possuem fonte bibliográfica?
- [ ] O código segue as convenções em `CONVENTIONS.md`?
- [ ] A documentação foi atualizada (se aplicável)?
- [ ] O commit message segue o padrão?
