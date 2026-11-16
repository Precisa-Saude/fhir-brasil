Profile: BRLabServiceRequest
Parent: ServiceRequest
Id: br-lab-service-request
Title: "BR Lab Service Request"
Description: "Perfil para o pedido de um exame que acompanha um agendamento em laboratório. Restringe ServiceRequest do FHIR R4 para exigir ao menos um código (LOINC no exame avulso, com TUSS opcional ao lado, ou o código próprio do laboratório num combo) e o paciente identificado. Um agendamento com vários exames leva um pedido por exame."

// Item do catálogo que o pedido instancia
* instantiatesCanonical only Canonical(BRLabActivityDefinition)

// Ao menos um coding: LOINC no exame avulso, código próprio do laboratório
// num combo sem LOINC. TUSS opcional. A fatia tuss não tem binding:
// ver o aviso sobre o BRTUSSProcedimentosLabVS no README do IG.
* code 1..1
* code.coding 1..*
* code.coding ^slicing.discriminator.type = #value
* code.coding ^slicing.discriminator.path = "system"
* code.coding ^slicing.rules = #open
* code.coding contains
    loinc 0..1 and
    tuss 0..1
* code.coding[loinc].system 1..1
* code.coding[loinc].system = $LOINC (exactly)
* code.coding[loinc].code 1..1
* code.coding[loinc].code from BRLabTestVS (preferred)
* code.coding[tuss].system 1..1
* code.coding[tuss].system = $TUSS (exactly)
* code.coding[tuss].code 1..1

// Paciente obrigatório: referência ao BRPatient ou identificador CPF
* subject only Reference(BRPatient)
* subject obeys br-lab-patient-reference
