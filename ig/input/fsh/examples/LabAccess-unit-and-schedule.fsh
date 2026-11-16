Instance: RegiaoSulExemplo
InstanceOf: Location
Usage: #example
Title: "Região de preço de uma marca"
Description: "Região fictícia que uma marca usa para precificar. Não é uma unidade: agrupa unidades, que apontam para ela em `partOf`, e a marca fica em `managingOrganization`."

* status = #active
* name = "Laboratório Exemplo, região Sul"
* physicalType = http://terminology.hl7.org/CodeSystem/location-physical-type#area "Area"
* managingOrganization = Reference(Organization/laboratorio-exemplo)
* managingOrganization.display = "Laboratório Exemplo"

Instance: UnidadeCentroExemplo
InstanceOf: BRLabLocation
Usage: #example
Title: "Unidade de laboratório"
Description: "Unidade fictícia com endereço, coordenadas e horário de funcionamento. O endereço não existe e as coordenadas são as do centro de Porto Alegre, arredondadas."

* identifier.system = "https://laboratorio.example/fhir/unidades"
* identifier.value = "centro"
* status = #active
* name = "Laboratório Exemplo, unidade Centro"
* address.line = "Rua Exemplo, 100"
* address.city = "Porto Alegre"
* address.state = "RS"
* address.country = "BR"
* position.longitude = -51.23
* position.latitude = -30.03
* hoursOfOperation.daysOfWeek[0] = #mon
* hoursOfOperation.daysOfWeek[+] = #tue
* hoursOfOperation.daysOfWeek[+] = #wed
* hoursOfOperation.daysOfWeek[+] = #thu
* hoursOfOperation.daysOfWeek[+] = #fri
* hoursOfOperation.openingTime = "06:30:00"
* hoursOfOperation.closingTime = "17:00:00"
* managingOrganization = Reference(Organization/laboratorio-exemplo)
* managingOrganization.display = "Laboratório Exemplo"
* partOf = Reference(RegiaoSulExemplo)

Instance: ColetaExemplo
InstanceOf: BRLabHealthcareService
Usage: #example
Title: "Serviço de coleta em uma unidade"
Description: "Coleta de sangue oferecida na unidade fictícia, em horário mais curto que o da unidade."

* active = true
* name = "Coleta de sangue"
* providedBy = Reference(Organization/laboratorio-exemplo)
* providedBy.display = "Laboratório Exemplo"
* location = Reference(UnidadeCentroExemplo)
* availableTime.daysOfWeek[0] = #mon
* availableTime.daysOfWeek[+] = #tue
* availableTime.daysOfWeek[+] = #wed
* availableTime.daysOfWeek[+] = #thu
* availableTime.daysOfWeek[+] = #fri
* availableTime.availableStartTime = "06:30:00"
* availableTime.availableEndTime = "11:00:00"

Instance: AgendaColetaExemplo
InstanceOf: BRLabSchedule
Usage: #example
Title: "Agenda de coleta de uma unidade"
Description: "Agenda da coleta de sangue na unidade fictícia, para o mês de dezembro de 2026."

* active = true
* actor[location] = Reference(UnidadeCentroExemplo)
* actor[1] = Reference(ColetaExemplo)
* planningHorizon.start = "2026-12-01T00:00:00-03:00"
* planningHorizon.end = "2026-12-31T23:59:59-03:00"

Instance: HorarioReservadoExemplo
InstanceOf: BRLabSlot
Usage: #example
Title: "Horário de coleta reservado"
Description: "Horário de quinze minutos na agenda de coleta, já ocupado pelo agendamento de exemplo."

* schedule = Reference(AgendaColetaExemplo)
* status = #busy
* start = "2026-12-01T08:00:00-03:00"
* end = "2026-12-01T08:15:00-03:00"
