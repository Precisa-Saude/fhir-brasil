---
name: Grafia não reconhecida
about: Um nome que o seu laboratório imprime e o catálogo não resolve
title: '[grafia] '
labels: [enhancement, good first issue]
---

<!--
Use isto quando `findCodeByName` (ou `fhir-ocr find`) devolver vazio para um
exame que o catálogo já conhece por outro nome. Se o exame em si não existe no
catálogo, abra uma solicitação de feature.

Não cole laudo nem anexe PDF. Precisamos da linha, não do documento, e laudo
carrega dado de paciente.
-->

## A grafia impressa

<!-- Exatamente como aparece na página, com acento, caixa e pontuação. -->

```

```

## Para qual exame

<!-- O código do catálogo, se você souber, ou o nome que já resolve hoje.
     `npx -p @precisa-saude/fhir fhir-bio loinc-map` imprime a lista inteira. -->

- Código ou nome conhecido:
- Unidade impressa ao lado:

## De onde veio

<!-- Laboratório ou rede, e estado. Serve para sabermos se é grafia regional ou
     de uma rede só. Se preferir não nomear, diga só o estado. -->

- Laboratório/rede:
- UF:

## O que o catálogo devolve hoje

```bash
# o comando que você rodou e a saída vazia
```

---

<!--
Se quiser mandar direto, o pull request é pequeno: a grafia entra na lista `pt`
da definição em `packages/core/src/biomarkers.ts`. Não precisa de teste novo nem
de mexer no código LOINC. O que pedimos no PR é a linha do laudo que motivou a
adição, em texto, sem o documento.

Um caso precisa de conversa antes: quando a mesma grafia serve a dois exames, a
busca deixa a chave sem dono em vez de chutar. Se for esse o caso, diga aqui e a
gente decide junto.
-->
