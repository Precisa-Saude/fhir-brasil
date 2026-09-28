Extension: AsPrinted
Id: as-printed
Title: "As Printed"
Description: "O valor e a faixa de referência como o documento imprime, quando a Observation traz o valor convertido para outra unidade. Ausente quando não houve conversão. A unidade impressa nem sempre é UCUM (\"lbs\", \"mUI/mL\"), e por isso vai em `unit`, sem `system`."
Context: Observation
* value[x] 0..0
* extension contains
    quantity 1..1 and
    referenceRange 0..1
* extension[quantity] ^short = "Valor e unidade impressos"
* extension[quantity].value[x] only Quantity
* extension[referenceRange] ^short = "Faixa de referência impressa, na unidade impressa"
* extension[referenceRange].value[x] only Range
