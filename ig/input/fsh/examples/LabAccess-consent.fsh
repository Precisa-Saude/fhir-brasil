Instance: ConsentimentoAtivoExemplo
InstanceOf: BRLabAccessConsent
Usage: #example
Title: "Consentimento de acesso laboratorial ativo"
Description: "Consentimento autorizado pelo paciente no laboratório, com os três escopos que dependem do paciente, validade de seis meses e o identificador que o laboratório deu ao consentimento. Laboratório, aplicativo, identificador e CPF são fictícios."

* identifier.system = "https://laboratorio.example/fhir/consentimentos"
* identifier.value = "3f9a6c2e-5d14-4b7a-9e80-1c2d3e4f5a6b"
* status = #active
* category = $ActCode#INFA "information access"
* patient.type = "Patient"
* patient.identifier.system = $CPF
* patient.identifier.value = "52998224725"
* dateTime = "2026-11-20T10:15:00-03:00"
* organization = Reference(Organization/laboratorio-exemplo)
* organization.display = "Laboratório Exemplo"
* policy.uri = "https://laboratorio.example/politica-de-privacidade"
* provision.period.start = "2026-11-20T10:15:00-03:00"
* provision.period.end = "2027-05-20T10:15:00-03:00"
* provision.actor[receiver].reference = Reference(Organization/aplicativo-exemplo)
* provision.actor[receiver].reference.display = "Aplicativo Exemplo"
* provision.action[0] = $LabAccessScope#appointment.write
* provision.action[+] = $LabAccessScope#results.read
* provision.action[+] = $LabAccessScope#consent.read

Instance: ConsentimentoRevogadoExemplo
InstanceOf: BRLabAccessConsent
Usage: #example
Title: "Consentimento de acesso laboratorial revogado"
Description: "Consentimento de leitura de resultados que o paciente revogou antes do fim da validade: `status` passa a `inactive` e a regra de permissão fica como registro do que tinha sido concedido. Laboratório, aplicativo e CPF são fictícios."

* identifier.system = "https://laboratorio.example/fhir/consentimentos"
* identifier.value = "b27e4d90-8a31-4c5f-a6d2-7e9f0a1b2c3d"
* status = #inactive
* category = $ActCode#INFA "information access"
* patient.type = "Patient"
* patient.identifier.system = $CPF
* patient.identifier.value = "52998224725"
* dateTime = "2026-08-03T09:00:00-03:00"
* organization = Reference(Organization/laboratorio-exemplo)
* organization.display = "Laboratório Exemplo"
* policy.uri = "https://laboratorio.example/politica-de-privacidade"
* provision.period.start = "2026-08-03T09:00:00-03:00"
* provision.period.end = "2027-02-03T09:00:00-03:00"
* provision.actor[receiver].reference = Reference(Organization/aplicativo-exemplo)
* provision.actor[receiver].reference.display = "Aplicativo Exemplo"
* provision.action[0] = $LabAccessScope#results.read
* provision.action[+] = $LabAccessScope#consent.read
