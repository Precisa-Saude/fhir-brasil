Profile: BRLabLocation
Parent: Location
Id: br-lab-location
Title: "BR Lab Location"
Description: "Perfil para unidades de atendimento de laboratório. Restringe Location do FHIR R4 para exigir identificador, situação, nome, endereço com cidade e UF e as coordenadas da unidade. O CNES entra como identificador quando a unidade tem um."

// Identificador obrigatório, com o CNES em fatia própria
* identifier 1..*
* identifier ^slicing.discriminator.type = #value
* identifier ^slicing.discriminator.path = "system"
* identifier ^slicing.rules = #open
* identifier contains cnes 0..1
* identifier[cnes].system 1..1
* identifier[cnes].system = $CNES (exactly)
* identifier[cnes].value 1..1
* identifier[cnes].value ^short = "CNES com 7 dígitos"

// Situação e nome obrigatórios
* status 1..1
* name 1..1

// Endereço obrigatório, com cidade e UF
* address 1..1
* address.city 1..1
* address.state 1..1
* address.state ^short = "Sigla da UF"

// Coordenadas obrigatórias
* position 1..1

// Horário de funcionamento
* hoursOfOperation ^short = "Dias e horários em que a unidade atende"

// Marca ou laboratório que opera a unidade
* managingOrganization ^short = "Marca ou laboratório que opera a unidade"

// Região de preço, quando o laboratório precifica por marca e região
* partOf ^short = "Região a que a unidade pertence"
