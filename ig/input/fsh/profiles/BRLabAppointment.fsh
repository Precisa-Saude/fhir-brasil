Profile: BRLabAppointment
Parent: Appointment
Id: br-lab-appointment
Title: "BR Lab Appointment"
Description: "Perfil para o agendamento de exames em uma unidade de laboratório, feito pelo aplicativo em nome do paciente que consentiu. Restringe Appointment do FHIR R4 para exigir o paciente, a unidade e os pedidos de exame que o agendamento atende. O endereço de pagamento no laboratório vai na extensão PaymentLink."

// Exames agendados, um BRLabServiceRequest por exame
* basedOn 1..*
* basedOn only Reference(BRLabServiceRequest)

// Horários reservados
* slot only Reference(BRLabSlot)

// Participantes obrigatórios: o paciente e a unidade
* participant ^slicing.discriminator.type = #type
* participant ^slicing.discriminator.path = "actor.resolve()"
* participant ^slicing.rules = #open
* participant contains
    patient 1..1 and
    location 1..1

// Paciente: referência ao BRPatient ou identificador CPF
* participant[patient].actor 1..1
* participant[patient].actor only Reference(BRPatient)
* participant[patient].actor obeys br-lab-patient-reference

* participant[location].actor 1..1
* participant[location].actor only Reference(BRLabLocation)

// Endereço em que o paciente conclui o pagamento no laboratório
* extension contains PaymentLink named paymentLink 0..1
