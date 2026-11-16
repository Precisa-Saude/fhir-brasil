Profile: BRLabAppointment
Parent: Appointment
Id: br-lab-appointment
Title: "BR Lab Appointment"
Description: "Perfil para o agendamento de exames em uma unidade de laboratório, feito pelo aplicativo em nome do paciente que consentiu. Restringe Appointment do FHIR R4 para exigir o paciente, a unidade e os pedidos de exame que o agendamento atende. O agendamento é um recurso só: os pedidos vão dentro dele, em `contained`, um BRLabServiceRequest por exame, e `basedOn` aponta para cada um por referência local. O `subject` de cada pedido repete o `actor` do paciente no agendamento, com a mesma referência literal ou o mesmo CPF. Os participantes do paciente e da unidade levam `actor.type` (`Patient` e `Location`), que é o que distingue um do outro. O endereço de pagamento no laboratório vai na extensão PaymentLink."

* obeys br-lab-appointment-contained-request
* obeys br-lab-appointment-based-on-contained
* obeys br-lab-appointment-request-subject

// Exames agendados, um BRLabServiceRequest por exame, sempre contido no
// agendamento. A agregação recusa referência a pedido externo.
* basedOn 1..*
* basedOn only Reference(BRLabServiceRequest)
* basedOn ^type.aggregation = #contained
* basedOn ^short = "Referência local a um pedido de exame em contained"

// Horários reservados
* slot only Reference(BRLabSlot)

// Participantes obrigatórios: o paciente e a unidade. As fatias se
// distinguem por actor.type, sem resolver a referência: o paciente
// identificado só por CPF não tem recurso a resolver.
* participant ^slicing.discriminator.type = #value
* participant ^slicing.discriminator.path = "actor.type"
* participant ^slicing.rules = #open
* participant contains
    patient 1..1 and
    location 1..1

// Paciente: referência ao BRPatient ou identificador CPF
* participant[patient].actor 1..1
* participant[patient].actor.type 1..1
* participant[patient].actor.type = "Patient"
* participant[patient].actor only Reference(BRPatient)
* participant[patient].actor obeys br-lab-patient-reference

* participant[location].actor 1..1
* participant[location].actor.type 1..1
* participant[location].actor.type = "Location"
* participant[location].actor only Reference(BRLabLocation)

// Endereço em que o paciente conclui o pagamento no laboratório
* extension contains PaymentLink named paymentLink 0..1


Invariant: br-lab-appointment-contained-request
Description: "O agendamento deve conter ao menos um pedido de exame (ServiceRequest) em contained"
Expression: "contained.ofType(ServiceRequest).exists()"
Severity: #error

Invariant: br-lab-appointment-based-on-contained
Description: "Cada basedOn deve ser uma referência local a um ServiceRequest contido no agendamento"
Expression: "basedOn.all(reference.exists()) and basedOn.reference.subsetOf(contained.ofType(ServiceRequest).select('#' + id))"
Severity: #error

// Compara só o que o FHIRPath alcança sem resolver referência externa: a
// referência literal e o CPF. Por isso o pedido repete a forma usada no
// participante. Como o subject só aceita paciente, coincidir com o actor
// de um participante é coincidir com o do paciente.
Invariant: br-lab-appointment-request-subject
Description: "O subject de cada pedido contido deve repetir o paciente do agendamento: a mesma referência literal ou o mesmo CPF do actor do participante"
Expression: "contained.ofType(ServiceRequest).subject.all((reference.exists() and reference in %resource.participant.actor.reference) or (identifier.where(system = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf').value.exists() and identifier.where(system = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf').value.first() in %resource.participant.actor.identifier.where(system = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf').value))"
Severity: #error
