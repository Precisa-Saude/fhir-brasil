# Identidade de mieloperoxidase no catálogo

## Objetivo

Completar a identidade de `Myeloperoxidase`, que já possui unidade e referência, sem confundir a enzima com o anticorpo anti-MPO.

## Critérios de aceitação

- [x] `myeloperoxidase-identity.test.ts` demonstra primeiro a ausência da identidade e depois resolve os nomes da enzima para `Myeloperoxidase`, com LOINC `66853-3` e unidade `pmol/L`. Execução inicial: cinco falhas e três testes passando. Execução final: oito passando.
- [x] Os nomes de anti-MPO continuam resolvendo para `MPO_Antibody`, LOINC `6969-0`, nos três casos da regressão.
- [x] Os eixos oficiais são `Myeloperoxidase:SCnc:Pt:Plas:Qn`, sem método. O teste de eixos e o registro de decisão preservam a restrição a plasma.
- [x] Unidade e referência existentes permanecem inalteradas. `pnpm --filter @precisa-saude/fhir test:coverage --maxWorkers=1 --minWorkers=1`: 2.355 testes passando, cobertura de linhas 99,36%, branches 93,94%, funções 97,14%. `pnpm turbo run lint typecheck build --filter=@precisa-saude/fhir` passou.
- [x] Contagens derivadas e documentação acompanham a entrada nova. `pnpm catalog:counts` gerou 277 biomarcadores, 230 com LOINC. Prettier e `git diff --check` passaram.

## Estado atual

A Search API oficial do LOINC 2.83 retornou os 32 resultados de `Myeloperoxidase` em 22/11/2026. O código ativo `66853-3` representa concentração molar em plasma, com unidade de exemplo `pmol/L`. `48146-5` mede unidades/volume em soro; `99407-9` mede massa/volume em soro por imunoensaio; `6969-0` mede o anticorpo. Nenhum deles é substituto dimensionalmente equivalente.

Consulta: https://loinc.regenstrief.org/searchapi/loincs?query=Myeloperoxidase&rows=100

## Próximos passos

A correção está implementada na branch `fix/myeloperoxidase-catalog-identity`, sem commit. O build ESM também passou no contrato de identidade, LOINC, referência e separação de anti-MPO usado pela plataforma.

A primeira suíte completa apontou a necessidade de regenerar o módulo de terminologia e registrar também os irmãos rejeitados no snapshot. O campo `loincVersion` pertence ao conjunto de metadados de revisão independente; a versão consultada ficou na nota, sem inventar revisor. Depois dessas correções, todos os testes passaram.

Uma execução de cobertura a partir da raiz incluiu os outros pacotes e falhou no limiar global, embora os 2.355 testes passassem. A execução canônica via filtro do pacote passou sem alterar configuração ou limiares.

Aguardar aprovação de commit e revisão. Após merge e publicação pelo fluxo normal, consumir a versão publicada na plataforma, executar freeze com `--stale` e revisar as diferenças sem regravar baselines automaticamente. A avaliação nova em dev continua dependendo de autorização explícita para chamadas de modelo. Nenhum pacote instalado na plataforma foi substituído.

## Fora de escopo

Não alterar limites clínicos ou converter massa em quantidade de substância. Não afirmar equivalência com soro. Não modificar `MPO_Antibody`, publicar pacote, criar commits, chamar modelos ou reprocessar contas. A plataforma só consumirá uma versão publicada após aprovação.
