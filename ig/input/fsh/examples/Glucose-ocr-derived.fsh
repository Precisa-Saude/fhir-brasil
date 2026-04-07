Instance: GlicoseDerivadaOCR
InstanceOf: BRLabObservation
Usage: #example
Title: "Glicose — derivada de OCR"
Description: "Exemplo de resultado de glicose extraído de PDF via OCR, com extensão derivedFromOCR definida como true."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#2345-7 "Glicose"
* valueQuantity.value = 95
* valueQuantity.unit = "mg/dL"
* valueQuantity.system = $UCUM
* valueQuantity.code = #mg/dL
* referenceRange.low.value = 70
* referenceRange.low.unit = "mg/dL"
* referenceRange.low.system = $UCUM
* referenceRange.low.code = #mg/dL
* referenceRange.high.value = 100
* referenceRange.high.unit = "mg/dL"
* referenceRange.high.system = $UCUM
* referenceRange.high.code = #mg/dL
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"
* extension[derivedFromOCR].valueBoolean = true
