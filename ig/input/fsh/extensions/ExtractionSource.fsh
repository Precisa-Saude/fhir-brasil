Extension: ExtractionSource
Id: extraction-source
Title: "Extraction Source"
Description: "Onde, no documento de origem, está o valor desta Observation: as páginas em que o exame aparece, o trecho citado e, em documento digitalizado, a caixa do trecho na página. Serve para quem consome conferir cada valor contra o documento. Ausente em valor calculado, que não está impresso em lugar nenhum."
Context: Observation
* value[x] 0..0
* extension contains
    page 1..* and
    quote 0..1 and
    box 0..1
* extension[page] ^short = "Página, contada a partir de 1"
* extension[page] ^definition = "Páginas em que o exame aparece, em ordem. A primeira é a do trecho citado; as demais repetem o mesmo exame, como no laudo que traz resumo e detalhe."
* extension[page].value[x] only positiveInt
* extension[quote] ^short = "Trecho do documento de onde o valor foi lido"
* extension[quote] ^definition = "O trecho como aparece no documento, com o nome do exame e o valor. Não é normalizado nem traduzido."
* extension[quote].value[x] only string
* extension[box] ^short = "Caixa do trecho na página, em fração dela (0 a 1)"
* extension[box] ^definition = "Só em documento digitalizado, e só quando o OCR achou o trecho. A origem é o canto superior esquerdo da página. Em documento com camada de texto, quem exibe localiza o trecho pelo próprio texto."
* extension[box].value[x] 0..0
* extension[box].extension contains
    x0 1..1 and
    y0 1..1 and
    x1 1..1 and
    y1 1..1
* extension[box].extension[x0].value[x] only decimal
* extension[box].extension[y0].value[x] only decimal
* extension[box].extension[x1].value[x] only decimal
* extension[box].extension[y1].value[x] only decimal
