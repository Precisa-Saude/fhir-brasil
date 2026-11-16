Profile: BRLabSchedule
Parent: Schedule
Id: br-lab-schedule
Title: "BR Lab Schedule"
Description: "Perfil para a agenda de uma unidade de laboratório. Restringe Schedule do FHIR R4 para que a agenda pertença a uma unidade (BRLabLocation) e, quando for o caso, a um serviço dessa unidade (BRLabHealthcareService). A referência à unidade leva `type` com `Location`, que é o que a distingue da referência ao serviço."

// Agenda de uma unidade e, opcionalmente, de um serviço dela. A fatia da
// unidade se distingue por type, sem resolver a referência.
* actor only Reference(BRLabLocation or BRLabHealthcareService)
* actor ^slicing.discriminator.type = #value
* actor ^slicing.discriminator.path = "type"
* actor ^slicing.rules = #open
* actor contains location 1..1
* actor[location].type 1..1
* actor[location].type = "Location"
* actor[location] only Reference(BRLabLocation)
* actor[location] ^short = "Unidade a que a agenda pertence"
