Instance: ColesterolTotalNormal
InstanceOf: BRLabObservation
Usage: #example
Title: "Colesterol Total — resultado normal"
Description: "Exemplo de resultado de colesterol total dentro da faixa de referência."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#2093-3 "Colesterol Total"
* valueQuantity.value = 175
* valueQuantity.unit = "mg/dL"
* valueQuantity.system = $UCUM
* valueQuantity.code = #mg/dL
* referenceRange.high.value = 190
* referenceRange.high.unit = "mg/dL"
* referenceRange.high.system = $UCUM
* referenceRange.high.code = #mg/dL
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"
