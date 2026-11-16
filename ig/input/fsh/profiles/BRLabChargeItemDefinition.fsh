Profile: BRLabChargeItemDefinition
Parent: ChargeItemDefinition
Id: br-lab-charge-item-definition
Title: "BR Lab Charge Item Definition"
Description: "Perfil para o preço de um exame do catálogo de um laboratório, em reais. Restringe ChargeItemDefinition do FHIR R4 para exigir o código do exame, o mesmo do BRLabActivityDefinition, e um preço base em BRL. O alcance do preço usa elementos do próprio recurso: `useContext` com uma unidade (preço por unidade), `jurisdiction` com o município no IBGE (preço por cidade) ou `useContext` com o Location de uma região, cuja `managingOrganization` é a marca (preço por marca e região)."

// Código do exame: liga o preço ao item do catálogo. Ao menos um
// coding, com LOINC e TUSS opcionais, como no BRLabActivityDefinition.
* code 1..1
* code.coding 1..*
* code.coding ^slicing.discriminator.type = #value
* code.coding ^slicing.discriminator.path = "system"
* code.coding ^slicing.rules = #open
* code.coding contains
    loinc 0..1 and
    tuss 0..1
* code.coding[loinc].system 1..1
* code.coding[loinc].system = $LOINC (exactly)
* code.coding[loinc].code 1..1
* code.coding[loinc].code from BRLabTestVS (preferred)
* code.coding[tuss].system 1..1
* code.coding[tuss].system = $TUSS (exactly)
* code.coding[tuss].code 1..1

// Onde o preço vale, por local: uma unidade (BRLabLocation) ou o Location
// de uma região. A marca é a managingOrganization desse Location, e as
// unidades da região apontam para ele em partOf.
* useContext ^slicing.discriminator.type = #pattern
* useContext ^slicing.discriminator.path = "code"
* useContext ^slicing.rules = #open
* useContext contains venue 0..1
* useContext[venue].code = $UsageContextType#venue
* useContext[venue].value[x] only Reference(Location)
* useContext[venue].value[x] ^short = "Unidade ou região em que o preço vale"

// Onde o preço vale, por cidade: código de município do IBGE
* jurisdiction ^slicing.discriminator.type = #value
* jurisdiction ^slicing.discriminator.path = "coding.system"
* jurisdiction ^slicing.rules = #open
* jurisdiction contains municipio 0..*
* jurisdiction[municipio].coding 1..1
* jurisdiction[municipio].coding.system 1..1
* jurisdiction[municipio].coding.system = $IBGEMunicipio (exactly)
* jurisdiction[municipio].coding.code 1..1
* jurisdiction[municipio].coding.code ^short = "Código IBGE do município, com 7 dígitos"

// Preço base obrigatório, em reais. Descontos e acréscimos entram como
// outros componentes do mesmo grupo.
* propertyGroup 1..*
* propertyGroup.priceComponent 1..*
* propertyGroup.priceComponent ^slicing.discriminator.type = #value
* propertyGroup.priceComponent ^slicing.discriminator.path = "type"
* propertyGroup.priceComponent ^slicing.rules = #open
* propertyGroup.priceComponent.amount.currency = #BRL
* propertyGroup.priceComponent contains base 1..1
* propertyGroup.priceComponent[base].type = #base
* propertyGroup.priceComponent[base].amount 1..1
* propertyGroup.priceComponent[base].amount.value 1..1
* propertyGroup.priceComponent[base].amount.currency 1..1
