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

### O que o check garante

1. **Existência** — o código resolve no servidor oficial. Pega erro de digitação
   e código que o LOINC aposentou.
2. **Deriva** — o nome oficial ou o status mudaram no LOINC desde que mapeamos.
   É o que realmente paga: transforma uma edição silenciosa de terceiro em check
   vermelho, em vez de descobrir meses depois.

Status `DEPRECATED` ou `DISCOURAGED` falha alto.

### O que o check NÃO garante

**Adequação semântica.** Se `43583-4` é o código _certo_ para Lipoproteína (a) —
property, timing, system, scale, method conferindo com o que medimos — é revisão
humana, e nenhum check verde diz que os mapeamentos estão corretos.

Não confunda uma coisa com a outra. O check passar significa que os códigos
existem e não mudaram, não que estão certos.

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

`loinc-snapshot.json` guarda, por código, o nome oficial e o status, mais a
versão do LOINC e a data da conferência.

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

## sync-versions.js

Sincroniza a versão entre os pacotes do workspace. Chamado pelo
`semantic-release`.

## worktree.sh

Atalho para `pnpm exec precisa-worktree`. A implementação está no
[`worktree-cli`](https://github.com/Precisa-Saude/tooling/tree/main/packages/worktree-cli).
