Profile: BRLabObservation
Parent: Observation
Id: br-lab-observation
Title: "BR Lab Observation"
Description: "Perfil para resultados de exames laboratoriais brasileiros. Restringe a Observation base do FHIR R4 para convenções laboratoriais do Brasil, incluindo código LOINC obrigatório, unidade UCUM, faixa de referência e suporte a dados derivados de OCR."

// Status restrito a resultados finalizados
* status from BRLabObservationStatusVS (required)
* status ^short = "final | amended | corrected"

// Categoria obrigatória: laboratory
* category 1..*
* category ^slicing.discriminator.type = #pattern
* category ^slicing.discriminator.path = "$this"
* category ^slicing.rules = #open
* category contains laboratory 1..1
* category[laboratory] = $ObsCat#laboratory

// Código LOINC obrigatório
* code 1..1
* code.coding 1..*
* code.coding ^slicing.discriminator.type = #value
* code.coding ^slicing.discriminator.path = "system"
* code.coding ^slicing.rules = #open
* code.coding contains loinc 1..1
* code.coding[loinc].system 1..1
* code.coding[loinc].system = $LOINC (exactly)
* code.coding[loinc].code 1..1
* code.coding[loinc].code from BRLabTestVS (preferred)
* code.coding[loinc].display 1..1
* code.coding[loinc].display ^short = "Nome do exame em pt-BR"

// Valor numérico com unidade UCUM
* value[x] only Quantity
* valueQuantity.value 1..1
* valueQuantity.unit 1..1
* valueQuantity.system 1..1
* valueQuantity.system = $UCUM (exactly)
* valueQuantity.code 1..1

// Faixa de referência
* referenceRange 1..*
* referenceRange.low.system = $UCUM (exactly)
* referenceRange.high.system = $UCUM (exactly)

// Sujeito obrigatório
* subject 1..1
* subject only Reference(Patient)

// Data efetiva obrigatória
* effective[x] only dateTime
* effectiveDateTime 1..1

// Extensão para dados derivados de OCR
* extension contains DerivedFromOCR named derivedFromOCR 0..1


ValueSet: BRLabObservationStatusVS
Id: br-lab-observation-status-vs
Title: "BR Lab Observation Status"
Description: "Status permitidos para resultados laboratoriais brasileiros."
* http://hl7.org/fhir/observation-status#final
* http://hl7.org/fhir/observation-status#amended
* http://hl7.org/fhir/observation-status#corrected
