Profile: BRLabActivityDefinition
Parent: ActivityDefinition
Id: br-lab-activity-definition
Title: "BR Lab Activity Definition"
Description: "Perfil para um exame do catálogo de um laboratório, que o paciente pode agendar. Restringe ActivityDefinition do FHIR R4 para exigir URL canônica, título e ao menos um código. O exame avulso leva LOINC, com TUSS opcional ao lado; combo ou painel sem LOINC leva só o código próprio do laboratório. O preço fica em BRLabChargeItemDefinition, ligado pelo mesmo código."

// URL canônica obrigatória: é por ela que o BRLabServiceRequest aponta o exame
* url 1..1

// Nome do exame como o laboratório o apresenta
* title 1..1

// Um item do catálogo gera um ServiceRequest
* kind 1..1
* kind = #ServiceRequest

// Ao menos um coding. LOINC quando o item é um exame avulso, TUSS opcional.
// Combo ou painel sem LOINC leva só o código próprio do laboratório, que
// entra como outro coding. A fatia tuss não tem binding: ver o aviso sobre
// o BRTUSSProcedimentosLabVS no README do IG.
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
