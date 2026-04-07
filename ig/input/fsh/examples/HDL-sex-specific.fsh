Instance: HDLFaixaSexoEspecifica
InstanceOf: BRLabObservation
Usage: #example
Title: "HDL — faixa de referência sexo-específica"
Description: "Exemplo de resultado de HDL com faixa de referência ajustada para sexo feminino (>50 mg/dL)."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#2085-9 "Colesterol HDL"
* valueQuantity.value = 62
* valueQuantity.unit = "mg/dL"
* valueQuantity.system = $UCUM
* valueQuantity.code = #mg/dL
* referenceRange.low.value = 50
* referenceRange.low.unit = "mg/dL"
* referenceRange.low.system = $UCUM
* referenceRange.low.code = #mg/dL
* referenceRange.text = "Mulheres: >50 mg/dL"
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"
