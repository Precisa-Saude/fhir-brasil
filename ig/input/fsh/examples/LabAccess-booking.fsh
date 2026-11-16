Instance: PedidoGlicoseExemplo
InstanceOf: BRLabServiceRequest
Usage: #inline
Title: "Pedido de exame contido em um agendamento"
Description: "Pedido de glicose que vai dentro do agendamento de exemplo, em `contained`, com o paciente identificado por CPF fictício e o item do catálogo em `instantiatesCanonical`. Não existe como recurso à parte."

* status = #active
* intent = #order
* instantiatesCanonical = "https://laboratorio.example/fhir/ActivityDefinition/glicose"
* code.coding[loinc] = $LOINC#2345-7 "Glucose [Mass/volume] in Serum or Plasma"
* code.text = "Glicose"
* subject.type = "Patient"
* subject.identifier.system = $CPF
* subject.identifier.value = "52998224725"

Instance: AgendamentoExemplo
InstanceOf: BRLabAppointment
Usage: #example
Title: "Agendamento de coleta com o pedido de exame contido"
Description: "Agendamento confirmado em uma unidade fictícia. O pedido de glicose vai em `contained` e `basedOn` aponta para ele por referência local. O paciente aparece com o mesmo CPF fictício no participante e no `subject` do pedido, e `type` identifica o tipo do recurso quando não há referência literal. A extensão leva o endereço em que o paciente conclui o pagamento no laboratório."

* contained[0] = PedidoGlicoseExemplo
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
* participant[location].actor.type = "Location"
* participant[location].status = #accepted
