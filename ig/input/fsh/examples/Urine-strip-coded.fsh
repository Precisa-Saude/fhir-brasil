Instance: CetonasNaFitaCodificado
InstanceOf: BRLabObservation
Usage: #example
Title: "Corpos cetônicos na urina por fita — resultado ordinal codificado"
Description: "O laudo imprime \"Traços\" para corpos cetônicos na fita. O resultado vai em `valueCodeableConcept` com a resposta LOINC LA11832-5 (Trace), da answer list LL733-7 do 2514-8, e o qualificador SNOMED CT 260405006 (Trace) ao lado; o texto impresso fica em `text`. Quem consome compara pelo código, sem reconhecer cada grafia (\"Traços\", \"Traço\", \"tr\")."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#2514-8 "Ketones [Presence] in Urine by Test strip"
* valueCodeableConcept.coding[0] = $LOINC#LA11832-5 "Trace"
* valueCodeableConcept.coding[1] = $SNOMED#260405006 "Trace"
* valueCodeableConcept.text = "Traços"
* referenceRange.text = "Negativo"
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"
