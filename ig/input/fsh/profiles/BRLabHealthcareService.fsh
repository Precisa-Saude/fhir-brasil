Profile: BRLabHealthcareService
Parent: HealthcareService
Id: br-lab-healthcare-service
Title: "BR Lab Healthcare Service"
Description: "Perfil para os serviços que um laboratório presta em suas unidades, como coleta de sangue ou exame de imagem. Restringe HealthcareService do FHIR R4 para exigir o nome do serviço, o laboratório que o presta e as unidades em que é oferecido. Todo serviço é prestado em ao menos uma unidade: coleta domiciliar fica fora desta versão."

// Situação e nome obrigatórios
* active 1..1
* name 1..1

// Laboratório que presta o serviço
* providedBy 1..1

// Unidades em que o serviço é oferecido
* location 1..*
* location only Reference(BRLabLocation)

// Horário do serviço, quando difere do horário da unidade
* availableTime ^short = "Dias e horários em que o serviço é prestado"
