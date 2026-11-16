Profile: BRLabSchedule
Parent: Schedule
Id: br-lab-schedule
Title: "BR Lab Schedule"
Description: "Perfil para a agenda de uma unidade de laboratório. Restringe Schedule do FHIR R4 para que a agenda pertença a uma unidade (BRLabLocation) e, quando for o caso, a um serviço dessa unidade (BRLabHealthcareService)."

// Agenda de uma unidade e, opcionalmente, de um serviço dela
* actor only Reference(BRLabLocation or BRLabHealthcareService)
* actor ^slicing.discriminator.type = #type
* actor ^slicing.discriminator.path = "resolve()"
* actor ^slicing.rules = #open
* actor contains location 1..1
* actor[location] only Reference(BRLabLocation)
* actor[location] ^short = "Unidade a que a agenda pertence"
