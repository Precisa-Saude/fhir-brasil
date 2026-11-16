Instance: PedidoGlicoseExemplo
InstanceOf: BRLabServiceRequest
Usage: #example
Title: "Pedido de exame de um agendamento"
Description: "Pedido de glicose criado junto com o agendamento, com o paciente identificado por CPF fictício e o item do catálogo em `instantiatesCanonical`."

* status = #active
* intent = #order
* instantiatesCanonical = "https://laboratorio.example/fhir/ActivityDefinition/glicose"
* code.coding[loinc] = $LOINC#2345-7 "Glicose"
* subject.type = "Patient"
* subject.identifier.system = $CPF
* subject.identifier.value = "52998224725"

Instance: AgendamentoExemplo
InstanceOf: BRLabAppointment
Usage: #example
Title: "Agendamento de coleta com link de pagamento"
Description: "Agendamento confirmado em uma unidade fictícia, com o endereço em que o paciente conclui o pagamento no laboratório. A referência ao paciente leva o CPF fictício e `type`, que identifica o tipo do recurso quando não há referência literal."

* extension[paymentLink].valueUrl = "https://laboratorio.example/pagamento/exemplo"
* status = #booked
* basedOn = Reference(PedidoGlicoseExemplo)
* slot = Reference(HorarioReservadoExemplo)
* start = "2026-12-01T08:00:00-03:00"
* end = "2026-12-01T08:15:00-03:00"
* participant[patient].actor.type = "Patient"
* participant[patient].actor.identifier.system = $CPF
* participant[patient].actor.identifier.value = "52998224725"
* participant[patient].status = #accepted
* participant[location].actor = Reference(UnidadeCentroExemplo)
* participant[location].status = #accepted
