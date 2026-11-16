Profile: BRLabSlot
Parent: Slot
Id: br-lab-slot
Title: "BR Lab Slot"
Description: "Perfil para um horário de atendimento em uma unidade de laboratório. Restringe Slot do FHIR R4 para que o horário pertença a uma agenda BRLabSchedule. Situação, início e fim já são obrigatórios no recurso base."

// Agenda a que o horário pertence
* schedule only Reference(BRLabSchedule)
