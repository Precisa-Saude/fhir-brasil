Instance: CelulasEpiteliaisEmTexto
InstanceOf: BRLabObservation
Usage: #example
Title: "Células epiteliais na urina — resultado em texto, com unidade"
Description: "O laudo imprime \"Raras\" com a unidade /campo. O resultado vai em `valueString`, e a unidade, que o R4 não guarda ao lado de texto, em `text-value-unit`. A faixa de referência também é texto."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#11277-1 "Células Epiteliais Escamosas na Urina"
* valueString = "Raras"
* referenceRange.text = "Raras a algumas"
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"
* extension[textValueUnit].valueString = "/campo"

Instance: DensidadeSemUnidadeImpressa
InstanceOf: BRLabObservation
Usage: #example
Title: "Densidade da urina — unidade do catálogo num valor impresso sem unidade"
Description: "O laudo imprime a densidade sem unidade. A Observation leva a unidade UCUM do catálogo, que o perfil exige e que deixa o valor comparável, e o `as-printed` registra a quantidade sem `unit`, que é o que o documento traz."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#5811-5 "Densidade da Urina"
* valueQuantity.value = 1.020
* valueQuantity.unit = "{specific gravity}"
* valueQuantity.system = $UCUM
* valueQuantity.code = #"{specific gravity}"
* referenceRange.low.value = 1.005
* referenceRange.low.system = $UCUM
* referenceRange.low.code = #"{specific gravity}"
* referenceRange.high.value = 1.030
* referenceRange.high.system = $UCUM
* referenceRange.high.code = #"{specific gravity}"
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"
* extension[asPrinted].extension[quantity].valueQuantity.value = 1.020
