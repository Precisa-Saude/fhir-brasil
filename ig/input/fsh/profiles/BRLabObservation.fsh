Profile: BRLabObservation
Parent: Observation
Id: br-lab-observation
Title: "BR Lab Observation"
Description: "Perfil para resultados de exames laboratoriais brasileiros. Restringe a Observation base do FHIR R4 para convenções laboratoriais do Brasil, incluindo código LOINC obrigatório, unidade UCUM no valor numérico, resultado em texto, faixa de referência e suporte a dados extraídos de documento (OCR, origem do valor, confiança e valor como impresso)."

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

// Valor numérico com unidade UCUM, ou resultado em texto ("Negativo", "Raras").
// As regras de valueQuantity valem quando o valor é numérico.
* value[x] only Quantity or string
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

// Extensões de dado extraído de documento: OCR, origem, confiança, o valor
// como impresso quando a Observation traz outro, o valor substituído e a
// unidade de um resultado em texto
* extension contains
    DerivedFromOCR named derivedFromOCR 0..1 and
    ExtractionSource named extractionSource 0..1 and
    ExtractionConfidence named extractionConfidence 0..1 and
    AsPrinted named asPrinted 0..1 and
    Superseded named superseded 0..1 and
    TextValueUnit named textValueUnit 0..1


ValueSet: BRLabObservationStatusVS
Id: br-lab-observation-status-vs
Title: "BR Lab Observation Status"
Description: "Status permitidos para resultados laboratoriais brasileiros."
* http://hl7.org/fhir/observation-status#final
* http://hl7.org/fhir/observation-status#amended
* http://hl7.org/fhir/observation-status#corrected
