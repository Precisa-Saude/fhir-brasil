# Identidade de mieloperoxidase no catálogo

## Decisão

`Myeloperoxidase` identifica a concentração molar da enzima em plasma, com LOINC `66853-3` e unidade `pmol/L`. A unidade e a referência preexistentes são preservadas. O anticorpo anti-MPO continua sendo `MPO_Antibody`, LOINC `6969-0`.

## Fonte e limites do mapeamento

A Search API oficial do LOINC 2.83 retornou os 32 resultados de `Myeloperoxidase` em 22/11/2026. O código ativo `66853-3` possui os eixos `Myeloperoxidase:SCnc:Pt:Plas:Qn`, sem método específico, e unidade de exemplo `pmol/L`.

Consulta: https://loinc.regenstrief.org/searchapi/loincs?query=Myeloperoxidase&rows=100

Os candidatos descartados são:

- `6969-0`: anticorpo anti-MPO, não a enzima.
- `48146-5`: unidades/volume em soro, não concentração molar.
- `99407-9`: massa/volume em soro por imunoensaio, não concentração molar.

A unidade herdada do catálogo não constitui evidência independente de laudo. O registro usa `evidence: ['name']` e `settledBy: 'name'`; não afirma material de um laudo específico nem equivalência com soro. A consulta à terminologia não equivale a revisão independente, por isso não preenche os campos de revisor.

## Resolução de nomes

Os nomes completos `Myeloperoxidase` e `Mieloperoxidase` resolvem para a enzima. `MPO`, `mpo`, `MPO IgG`, `ANCA MPO` e `ANCA-MPO` ficam sem resolução por nome, pois não oferecem identidade suficiente. Os aliases explícitos de anticorpo permanecem separados.

## Critérios de aceitação e verificação

- [x] Os 12 casos de `myeloperoxidase-identity.test.ts` cobrem nomes completos, nomes ambíguos, anticorpo, unidade, referência e eixos oficiais.
- [x] `pnpm --filter @precisa-saude/fhir test:coverage --maxWorkers=1 --minWorkers=1` passou com 2.359 testes na validação do PR #190, sem alterar limiares.
- [x] `pnpm turbo run lint typecheck build --filter=@precisa-saude/fhir`, Prettier e `git diff --check` passaram.
- [x] Contagens derivadas e ValueSet foram regenerados pelos scripts do repositório. A geração do ValueSet foi conferida como idempotente.

## Fora de escopo

Esta alteração não modifica limites clínicos, converte massa em quantidade de substância ou altera `MPO_Antibody`. Não altera dependências da plataforma nem reprocessa contas.

A adoção pela plataforma exige uma versão publicada e freeze com `--stale`, com revisão das diferenças antes de qualquer atualização de baseline. Chamadas novas de modelo e alterações em registros clínicos dependem de autorização separada.
