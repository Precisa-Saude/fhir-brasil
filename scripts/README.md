# Scripts

Ferramentas de manutenção do catálogo. Nenhuma faz parte do pacote publicado.

## verify-loinc.ts

Confere os códigos LOINC do catálogo contra o servidor oficial
(`https://fhir.loinc.org`).

```bash
pnpm loinc:check     # compara o vivo com o snapshot versionado
pnpm loinc:update    # regrava o snapshot a partir do vivo
```

Precisa de `LOINC_USER` e `LOINC_PASSWORD` (conta gratuita em
[loinc.org/get-started](https://loinc.org/get-started/)). No CI vêm dos secrets
do repositório.

Sem credencial, `LOINC_LOOKUP_URL` aponta para um servidor que sirva o LOINC
sem login, como o da HL7:

```bash
LOINC_LOOKUP_URL='https://tx.fhir.org/r4/CodeSystem/$lookup' pnpm loinc:update
```

É o caminho de quem adiciona um código: `loinc-axes.test.ts` recusa código sem
entrada no snapshot, então os eixos dele precisam estar gravados antes do PR. O
servidor oficial continua sendo a referência, e o workflow mensal regrava tudo
a partir dele.

### O que o check garante

1. **Existência** — o código resolve no servidor oficial. Pega erro de digitação
   e código que o LOINC aposentou.
2. **Deriva** — o nome oficial, o status ou um dos seis eixos (componente,
   propriedade, tempo, sistema, escala, método) mudaram no LOINC desde que mapeamos. É o que
   realmente paga: transforma uma edição silenciosa de terceiro em check
   vermelho, em vez de descobrir meses depois.

Status `DEPRECATED` ou `DISCOURAGED` falha alto.

### O que o check NÃO garante

**Adequação semântica.** Se `43583-4` é o código _certo_ para Lipoproteína (a) —
property, timing, system, scale, method conferindo com o que medimos — é revisão
humana, e nenhum check verde diz que os mapeamentos estão corretos.

Não confunda uma coisa com a outra. O check passar significa que os códigos
existem e não mudaram, não que estão certos.

O que chega perto da adequação, sem rede, é
`packages/core/src/__tests__/loinc-axes.test.ts`. Ele lê os eixos gravados no
snapshot e confere por regra o que dá para conferir por regra: a propriedade do
código tem que combinar com a unidade declarada (% é fração, mg/dL é
massa/volume, /HPF é número/área), o sistema tem que caber no catálogo (urina
para `_Urine`, sangue e derivados para o resto, líquido amniótico para ninguém),
quem tem unidade é quantitativo e quem não tem não é, e o tempo é pontual. Existe porque em outubro de 2026 uma revisão
externa encontrou onze códigos errados num desses eixos, todos existentes, todos
`ACTIVE`, todos verdes neste check: beta-hidroxibutirato apontava para
butirilcarnitina em líquido amniótico, bactérias na urina para urocultura, e os
ácidos graxos para quantidade por hemácia enquanto o laudo imprime %. Nove dos
onze estavam errados desde o commit inicial do catálogo. O compromisso que a
regra não aceita e que foi mantido de propósito fica listado no próprio teste,
com o motivo.

### Códigos de saída

| Código | Significado                                                                   |
| ------ | ----------------------------------------------------------------------------- |
| `0`    | Tudo confere com o snapshot                                                   |
| `1`    | Achado real: código não resolve, status proibido, deriva, ou fora do snapshot |
| `2`    | Não deu para conferir (LOINC fora do ar, rede, credencial recusada)           |

O `2` existe para o CI não confundir "não consegui perguntar" com "está tudo
certo". Indisponibilidade de terceiro vira `::warning::` e não derruba o build.

### Como aceitar uma mudança

Deriva **não** é corrigida automaticamente. Rode o workflow `LOINC` em
`workflow_dispatch` com `update: true`: ele regrava o snapshot e abre um PR.

Isso é de propósito. Um nome que mudou upstream pode significar que o código
deixou de servir para o analito que a gente mede, e isso precisa de olho humano
antes de entrar.

### Sobre o snapshot

`loinc-snapshot.json` guarda, por código, o nome oficial, o status, os seis
eixos (componente, propriedade, tempo, sistema, escala, método) na grafia em que
o LOINC os exibe e os LOINC Groups (`LG…`) a que o código pertence, com o nome de
cada um, mais a versão do LOINC e a data da conferência. O grupo junta códigos
que medem a mesma coisa e diferem num eixo que o agrupamento ignora, e é onde se
procura o irmão de um código antes de trocar o mapeamento. Nem todo código tem
grupo.

Os grupos só vêm do `fhir.loinc.org`, que os publica como `parent` do código. Um
servidor alternativo em `LOINC_LOOKUP_URL`, como o `tx.fhir.org`, não os publica:
um código gravado por ele entra sem `groups`, e o check não acusa a ausência
como deriva. A gravação seguinte pelo workflow preenche.

Localmente, `pnpm loinc:check` e `pnpm loinc:update` leem `LOINC_USER` e
`LOINC_PASSWORD` do `.env` na raiz (`node --env-file-if-exists`), sem
interpretar o valor. Carregar o `.env` com `source` expande `$` e crase dentro
da senha, e o servidor responde 401.

Guardar o nome não é só diagnóstico. A **seção 10.3 da licença do LOINC** exige
que informação extraída venha sempre acompanhada do identificador **e do display
name correspondente**. Um snapshot só com hash do nome seria menor e detectaria
deriva igual, mas descumpriria essa cláusula. O arquivo carrega o aviso da seção
10.1 junto dos dados, para viajar com eles.

### Agendamento

Cron mensal (dia 5) mais `workflow_dispatch`. Não roda por PR: precisa de
credencial e rede, o que em todo PR fica lento e instável — e secret não é
exposto a PR de fork em repositório público.

A cadência acompanha a do LOINC, que está migrando para release mensal.

## generate-valueset.ts

Gera `ig/input/fsh/valuesets/BRLabTestVS.fsh` a partir dos biomarcadores com
código LOINC no `packages/core`.

```bash
pnpm valueset:generate   # regenera
pnpm valueset:check      # regenera e falha se o versionado divergir
```

O `valueset:check` roda em todo PR — não usa rede nem credencial. Existe porque
o gerador ficou anos sem ser chamado por nada: o ValueSet congelou em 160 códigos
enquanto o catálogo chegava a 177, e manteve um código LOINC antigo da
Lipoproteína (a) depois da troca.

## catalog-counts.ts

Fonte única dos números do catálogo. Regrava o bloco entre
`<!-- catalog:counts:start -->` e `<!-- catalog:counts:end -->` no `README.md` da
raiz e o `site/src/data/catalog-counts.json` que o site consome.

```bash
pnpm catalog:counts          # regrava os dois
pnpm catalog:counts --json   # imprime os números, não escreve nada
pnpm catalog:check           # regrava e falha se o versionado divergir
```

O `catalog:check` roda em todo PR. Não usa rede nem credencial.

Existe porque os mesmos números circulavam em quatro formulações e nenhuma batia
com o publicado. O README dizia "200+ biomarcadores com códigos LOINC" quando 38
dos 225 não têm código nenhum, e "580+ testes"; o site dizia "397 testes" com 699
no repositório; um deck herdou "153 de 164, 93,3%", que era o escopo de um
crosswalk de abril de 2026 no `datasus-sdk`, não o catálogo (PRE-328).

Para citar em deck, artigo ou proposta, use o `--json` ou copie o bloco do
README. Não escreva os números à mão em outro lugar: o check só cobre o que ele
gera.

Uma nota sobre `acceptedLoincCodes`: é maior que `withLoinc` porque a busca por
código aceita também os aliases de códigos que o LOINC aposentou. O LDH responde
tanto pelo canônico quanto pelo `2532-0`, que está `DISCOURAGED`. São medidas
diferentes, e trocar uma pela outra muda o número em um.

## sync-versions.js

Sincroniza a versão entre os pacotes do workspace. Chamado pelo
`semantic-release`.

## worktree.sh

Atalho para `pnpm exec precisa-worktree`. A implementação está no
[`worktree-cli`](https://github.com/Precisa-Saude/tooling/tree/main/packages/worktree-cli).
