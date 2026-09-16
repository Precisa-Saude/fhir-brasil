# @precisa-saude/fhir-pdf

Extração da **camada de texto** de PDFs de laudo laboratorial, para alimentar a
ancoragem do [`@precisa-saude/fhir-ocr-utils`](../ocr-utils).

```bash
npm i @precisa-saude/fhir-pdf
```

## Isto não é OCR

A maior parte dos laudos que os laboratórios brasileiros entregam já vem com
camada de texto, e ler essa camada é determinístico, offline e barato. Laudo
digitalizado não tem camada nenhuma: aqui ele volta vazio, e a CLI diz isso em
vez de devolver silêncio.

Quem precisa de laudo digitalizado roda um OCR por fora e entrega o texto ao
`fhir-ocr find`. O pacote não embute motor de reconhecimento: devolver lixo de
OCR que a ancoragem depois trata como texto de verdade é pior do que devolver
nada.

## CLI

```bash
npx -p @precisa-saude/fhir-pdf fhir-pdf text laudo.pdf
npx -p @precisa-saude/fhir-pdf fhir-pdf text laudo.pdf --json   # uma entrada por página
```

## Biblioteca

```ts
import { readFile } from 'node:fs/promises';

import { extractPdfText } from '@precisa-saude/fhir-pdf';

const { pages, text } = await extractPdfText(new Uint8Array(await readFile('laudo.pdf')));
```

## No fluxo completo

```bash
fhir-pdf  text laudo.pdf > laudo.txt          # camada de texto
fhir-ocr  find laudo.txt                      # quais grandezas a página cita
fhir-ocr  schema                              # o contrato que o modelo precisa devolver
#                                               (o modelo roda onde você quiser)
fhir-ocr  check saida.json --source laudo.txt --convert \
  | fhir-bio convert | fhir-bio validate      # conferido e em FHIR R4
```

## Dependência

`pdfjs-dist`, da Mozilla. É a exceção explícita à regra de dependência zero do
ecossistema, e é o motivo de este pacote existir separado do `core` e do
`ocr-utils`: os dois continuam sem dependência de runtime além do próprio
catálogo.

## Aviso médico

Este pacote é uma ferramenta de software e **não** presta orientação médica. Os
dados extraídos precisam de conferência profissional antes de qualquer uso
clínico. Nenhum valor devolvido aqui foi interpretado por um profissional de
saúde.

## Licença

Apache-2.0
