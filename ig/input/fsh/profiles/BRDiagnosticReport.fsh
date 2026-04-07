Profile: BRDiagnosticReport
Parent: DiagnosticReport
Id: br-diagnostic-report
Title: "BR Diagnostic Report"
Description: "Perfil para laudos de exames laboratoriais brasileiros. Restringe DiagnosticReport do FHIR R4 para incluir categoria obrigatória, referência ao paciente e resultados conformes ao perfil BRLabObservation."

// Status restrito a laudos finalizados
* status from BRDiagnosticReportStatusVS (required)

// Categoria obrigatória: laboratory
* category 1..*
* category ^slicing.discriminator.type = #pattern
* category ^slicing.discriminator.path = "$this"
* category ^slicing.rules = #open
* category contains laboratory 1..1
* category[laboratory] = http://terminology.hl7.org/CodeSystem/v2-0074#LAB

// Código do laudo
* code 1..1

// Sujeito obrigatório (referência ao BRPatient)
* subject 1..1
* subject only Reference(BRPatient)

// Data efetiva obrigatória
* effective[x] only dateTime
* effectiveDateTime 1..1

// Resultados referenciam BRLabObservation
* result 1..*
* result only Reference(BRLabObservation)

// Responsável pelo laudo
* performer 1..*


ValueSet: BRDiagnosticReportStatusVS
Id: br-diagnostic-report-status-vs
Title: "BR Diagnostic Report Status"
Description: "Status permitidos para laudos laboratoriais brasileiros."
* http://hl7.org/fhir/diagnostic-report-status#final
* http://hl7.org/fhir/diagnostic-report-status#amended
* http://hl7.org/fhir/diagnostic-report-status#corrected
