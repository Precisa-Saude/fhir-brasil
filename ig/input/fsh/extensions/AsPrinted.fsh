Extension: AsPrinted
Id: as-printed
Title: "As Printed"
Description: "O valor e a faixa de referência como o documento imprime, quando a Observation traz outra coisa: o valor convertido para outra unidade, ou a unidade do catálogo num valor que o documento imprime sem unidade nenhuma. Ausente quando a Observation traz exatamente o que está impresso. A unidade impressa nem sempre é UCUM (\"lbs\", \"mUI/mL\"), e por isso vai em `unit`, sem `system`. Quantidade sem `unit` quer dizer que o documento não imprime unidade."
Context: Observation
* value[x] 0..0
* extension contains
    quantity 1..1 and
    referenceRange 0..1
* extension[quantity] ^short = "Valor e unidade impressos; sem unit quando não há unidade impressa"
* extension[quantity].value[x] only Quantity
* extension[referenceRange] ^short = "Faixa de referência impressa, na unidade impressa"
* extension[referenceRange].value[x] only Range
