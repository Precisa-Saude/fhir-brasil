Profile: BRPatient
Parent: Patient
Id: br-patient
Title: "BR Patient"
Description: "Perfil para pacientes brasileiros. Restringe Patient do FHIR R4 para incluir identificadores brasileiros obrigatórios (CPF ou CNS) e dados demográficos relevantes ao contexto do SUS."

// Pelo menos um identificador brasileiro obrigatório
* identifier 1..*
* identifier ^slicing.discriminator.type = #value
* identifier ^slicing.discriminator.path = "system"
* identifier ^slicing.rules = #open

* identifier contains
    cpf 0..1 and
    cns 0..1

* identifier[cpf].system 1..1
* identifier[cpf].system = "http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf" (exactly)
* identifier[cpf].value 1..1
* identifier[cpf].value ^short = "CPF com 11 dígitos"

* identifier[cns].system 1..1
* identifier[cns].system = "http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns" (exactly)
* identifier[cns].value 1..1
* identifier[cns].value ^short = "CNS com 15 dígitos"

// Pelo menos um identificador brasileiro (CPF ou CNS) deve estar presente
* obeys br-patient-identifier

// Nome obrigatório
* name 1..*

// Data de nascimento obrigatória
* birthDate 1..1

// Sexo obrigatório
* gender 1..1


Invariant: br-patient-identifier
Description: "Paciente deve ter pelo menos um identificador brasileiro (CPF ou CNS)"
Expression: "identifier.where(system = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf').exists() or identifier.where(system = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns').exists()"
Severity: #error
