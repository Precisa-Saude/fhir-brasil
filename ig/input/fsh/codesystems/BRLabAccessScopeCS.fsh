CodeSystem: BRLabAccessScopeCS
Id: lab-access-scope
Title: "BR Lab Access Scope"
Description: "Escopos do acesso laboratorial por consentimento. Cada escopo libera um conjunto de recursos que o laboratório expõe ao aplicativo. Três não envolvem dado de paciente e não pedem consentimento: `catalog.read`, `locations.read` e `schedule.read`. Os outros três (`appointment.write`, `results.read` e `consent.read`) dependem do consentimento do paciente, formam o BRLabAccessPatientScopeVS e são os únicos listados em `Consent.provision.action` do perfil BRLabAccessConsent."
* ^url = "https://fhir-brasil.dev.br/CodeSystem/lab-access-scope"
* ^status = #draft
* ^content = #complete
* ^caseSensitive = true
* ^publisher = "Precisa Saúde"
* #catalog.read "Leitura do catálogo" "Exames que o laboratório oferece e seus preços, por unidade ou região. Recursos: ActivityDefinition e ChargeItemDefinition."
* #locations.read "Leitura das unidades" "Unidades de atendimento, com endereço, coordenadas e horário de funcionamento. Recursos: Location e HealthcareService."
* #schedule.read "Leitura da agenda" "Horários disponíveis para um conjunto de exames em uma unidade. Horário livre não é dado de paciente, e a leitura não pede consentimento. Recursos: Schedule e Slot."
* #appointment.write "Escrita de agendamento" "Criar, remarcar e cancelar agendamento do paciente que consentiu. Os pedidos de exame vão dentro do agendamento, em `contained`. Recursos: Appointment, com ServiceRequest contido."
* #results.read "Leitura de resultados" "Resultados estruturados do paciente que consentiu. Recursos: DiagnosticReport e Observation."
* #consent.read "Leitura de consentimentos" "Os registros de consentimento do próprio paciente. Recurso: Consent."
