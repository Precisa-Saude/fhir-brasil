Instance: GlicoseExtraidaConvertida
InstanceOf: BRLabObservation
Usage: #example
Title: "Glicose — extraída de laudo digitalizado, com conversão de unidade"
Description: "Exemplo de glicose lida por OCR de um laudo que imprime mmol/L, convertida para mg/dL. Traz o trecho citado, a página e a caixa do trecho, a confiança nos dois eixos e o valor como impresso."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#2345-7 "Glicose"
* valueQuantity.value = 95.5
* valueQuantity.unit = "mg/dL"
* valueQuantity.system = $UCUM
* valueQuantity.code = #mg/dL
* referenceRange.low.value = 70.3
* referenceRange.low.unit = "mg/dL"
* referenceRange.low.system = $UCUM
* referenceRange.low.code = #mg/dL
* referenceRange.high.value = 99.1
* referenceRange.high.unit = "mg/dL"
* referenceRange.high.system = $UCUM
* referenceRange.high.code = #mg/dL
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"
* extension[derivedFromOCR].valueBoolean = true
* extension[extractionSource].extension[page][0].valuePositiveInt = 1
* extension[extractionSource].extension[quote].valueString = "GLICOSE 5,3 mmol/L 3,9 a 5,5"
* extension[extractionSource].extension[box].extension[x0].valueDecimal = 0.12
* extension[extractionSource].extension[box].extension[y0].valueDecimal = 0.31
* extension[extractionSource].extension[box].extension[x1].valueDecimal = 0.64
* extension[extractionSource].extension[box].extension[y1].valueDecimal = 0.33
* extension[extractionConfidence].extension[reading].valueDecimal = 0.97
* extension[extractionConfidence].extension[interpretation].valueDecimal = 0.92
* extension[asPrinted].extension[quantity].valueQuantity.value = 5.3
* extension[asPrinted].extension[quantity].valueQuantity.unit = "mmol/L"
* extension[asPrinted].extension[referenceRange].valueRange.low.value = 3.9
* extension[asPrinted].extension[referenceRange].valueRange.low.unit = "mmol/L"
* extension[asPrinted].extension[referenceRange].valueRange.high.value = 5.5
* extension[asPrinted].extension[referenceRange].valueRange.high.unit = "mmol/L"
