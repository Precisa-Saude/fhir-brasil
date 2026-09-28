Invariant: br-confidence-range
Description: "A confiança vai de 0 a 1."
Expression: "value.ofType(decimal).all($this >= 0 and $this <= 1)"
Severity: #error

Extension: ExtractionConfidence
Id: extraction-confidence
Title: "Extraction Confidence"
Description: "Confiança na extração deste valor, em dois eixos que falham por motivos diferentes. A leitura diz se os caracteres do documento foram lidos certo; a interpretação diz se o valor lido foi atribuído ao exame, à unidade e à faixa certos. Um valor pode ter leitura perfeita e interpretação duvidosa, e o inverso."
Context: Observation
* value[x] 0..0
* extension contains
    reading 0..1 and
    interpretation 0..1
* extension[reading] ^short = "Confiança na leitura dos caracteres (0 a 1)"
* extension[reading] ^definition = "Em documento com camada de texto, 1: o texto vem do próprio arquivo. Em página digitalizada, a confiança do OCR nas palavras do trecho citado."
* extension[reading].value[x] only decimal
* extension[reading] obeys br-confidence-range
* extension[interpretation] ^short = "Confiança na atribuição do valor ao exame (0 a 1)"
* extension[interpretation] ^definition = "A confiança de quem extraiu em ter associado o valor lido ao exame, à unidade e à faixa de referência certos."
* extension[interpretation].value[x] only decimal
* extension[interpretation] obeys br-confidence-range
