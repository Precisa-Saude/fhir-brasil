Profile: BRLabChargeItemDefinition
Parent: ChargeItemDefinition
Id: br-lab-charge-item-definition
Title: "BR Lab Charge Item Definition"
Description: "Perfil para o preço de um exame do catálogo de um laboratório, em reais. Restringe ChargeItemDefinition do FHIR R4 para exigir o código do exame, o mesmo do BRLabActivityDefinition, e um preço base em BRL. O alcance do preço usa elementos do próprio recurso: `useContext` com uma unidade (preço por unidade), `jurisdiction` com o município no IBGE (preço por cidade) ou dois `useContext`, um com a Organization da marca e outro com o Location da região (preço por marca e região). A marca fica no próprio preço, e o cliente não precisa resolver o Location da região para saber de quem é o preço."

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
// de uma região, a que as unidades apontam em partOf.
//
// No preço por marca e região, a marca vai em fatia própria, como
// referência direta à Organization, ao lado do Location da região. O
// ValueSet de tipos de contexto do R4 não tem conceito de marca, e o
// binding extensível aceita o código do BRLabPriceContextCS.
//
// A fatia da marca é 0..1, sem invariante: o perfil não distingue o
// Location de uma unidade do de uma região sem resolver a referência,
// e exigir a marca atingiria também o preço por unidade.
* useContext ^slicing.discriminator.type = #pattern
* useContext ^slicing.discriminator.path = "code"
* useContext ^slicing.rules = #open
* useContext contains
    venue 0..1 and
    brand 0..1
* useContext[venue].code = $UsageContextType#venue
* useContext[venue].value[x] only Reference(Location)
* useContext[venue].value[x] ^short = "Unidade ou região em que o preço vale"
* useContext[brand] ^short = "Marca em que o preço vale, no preço por marca e região"
* useContext[brand].code = $LabPriceContext#brand
* useContext[brand].value[x] only Reference(Organization)
* useContext[brand].value[x] ^short = "Organization da marca"

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
