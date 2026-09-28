Instance: TriglicerideosLidos
InstanceOf: BRLabObservation
Usage: #example
Title: "Triglicerídeos — lido do laudo"
Description: "O valor de que o VLDL do exemplo seguinte é calculado."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#2571-8 "Triglicerídeos"
* valueQuantity.value = 150
* valueQuantity.unit = "mg/dL"
* valueQuantity.system = $UCUM
* valueQuantity.code = #mg/dL
* referenceRange.high.value = 150
* referenceRange.high.unit = "mg/dL"
* referenceRange.high.system = $UCUM
* referenceRange.high.code = #mg/dL
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"

Instance: VLDLCalculado
InstanceOf: BRLabObservation
Usage: #example
Title: "VLDL — calculado dos triglicerídeos"
Description: "Valor calculado por quem extraiu, e não impresso no laudo. O `derivedFrom` do R4 aponta para as observações de que ele saiu, e é por ele que quem consome sabe que o valor foi calculado. Não leva `extraction-source`: não há trecho no documento para citar."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#13458-5 "Colesterol VLDL"
* valueQuantity.value = 30
* valueQuantity.unit = "mg/dL"
* valueQuantity.system = $UCUM
* valueQuantity.code = #mg/dL
* referenceRange.high.value = 30
* referenceRange.high.unit = "mg/dL"
* referenceRange.high.system = $UCUM
* referenceRange.high.code = #mg/dL
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"
* derivedFrom = Reference(TriglicerideosLidos)
