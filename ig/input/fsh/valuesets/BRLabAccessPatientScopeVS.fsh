ValueSet: BRLabAccessPatientScopeVS
Id: lab-access-patient-scope-vs
Title: "BR Lab Access Patient Scope ValueSet"
Description: "Escopos do acesso laboratorial que dependem do consentimento do paciente: agendamento, resultados e leitura dos próprios consentimentos. Os outros três escopos do BRLabAccessScopeCS (catálogo, unidades e agenda) são acesso do aplicativo ao laboratório, sem dado de paciente, e não entram em um Consent."
* $LabAccessScope#appointment.write "Escrita de agendamento"
* $LabAccessScope#results.read "Leitura de resultados"
* $LabAccessScope#consent.read "Leitura de consentimentos"
