Profile: BRLabAccessConsent
Parent: Consent
Id: br-lab-access-consent
Title: "BR Lab Access Consent"
Description: "Perfil para o consentimento que o paciente dá a um aplicativo para acessar seus dados e serviços em um laboratório. Restringe Consent do FHIR R4 para exigir o paciente, o laboratório que guarda o consentimento, o aplicativo que recebe o acesso, os escopos concedidos e a data de expiração. A revogação é registrada em `status`."

// Ciclo de vida em status, com os códigos do R4: proposed (criado pelo
// aplicativo, à espera do paciente), active (autorizado pelo paciente no
// laboratório), rejected (recusado) e inactive (revogado ou expirado)
* status ^short = "proposed | active | rejected | inactive"

// Consent.scope do R4 é a natureza do consentimento, e não os escopos do
// protocolo, que ficam em provision.action
* scope = $ConsentScope#patient-privacy

// Paciente obrigatório: referência ao BRPatient ou identificador CPF
* patient 1..1
* patient only Reference(BRPatient)
* patient obeys br-lab-patient-reference

// Laboratório que guarda o consentimento e autentica o paciente
* organization 1..*

// Uma regra de permissão por consentimento
* provision 1..1
* provision.type 1..1
* provision.type = #permit

// Validade: a data de expiração é obrigatória
* provision.period 1..1
* provision.period.end 1..1
* provision.period.end ^short = "Data e hora em que o consentimento expira"

// Aplicativo que recebe o acesso
* provision.actor 1..*
* provision.actor ^slicing.discriminator.type = #pattern
* provision.actor ^slicing.discriminator.path = "role"
* provision.actor ^slicing.rules = #open
* provision.actor contains receiver 1..1
* provision.actor[receiver].role = $ParticipationType#IRCP
* provision.actor[receiver].reference only Reference(Organization or Device)
* provision.actor[receiver].reference ^short = "Aplicativo do paciente que recebe o acesso"

// Escopos concedidos
* provision.action 1..*
* provision.action from BRLabAccessScopeVS (required)
* provision.action ^short = "Escopo concedido, um por repetição"


// Usada também em BRLabAppointment e BRLabServiceRequest
Invariant: br-lab-patient-reference
Description: "A referência ao paciente deve apontar para um recurso ou carregar o CPF como identificador"
Expression: "reference.exists() or identifier.where(system = 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf').value.exists()"
Severity: #error
