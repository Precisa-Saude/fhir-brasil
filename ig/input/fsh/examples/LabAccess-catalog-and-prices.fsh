Instance: GlicoseCatalogoExemplo
InstanceOf: BRLabActivityDefinition
Usage: #example
Title: "Glicose no catálogo de um laboratório"
Description: "Item de catálogo de um laboratório fictício, com o código LOINC e o código próprio do laboratório. Sem coding TUSS, que é opcional."

* url = "https://laboratorio.example/fhir/ActivityDefinition/glicose"
* status = #active
* title = "Glicose"
* code.coding[loinc] = $LOINC#2345-7 "Glicose"
* code.coding[1] = https://laboratorio.example/fhir/produtos#GLI "Glicose"

Instance: ComboSemLoincCatalogoExemplo
InstanceOf: BRLabActivityDefinition
Usage: #example
Title: "Combo no catálogo, sem código LOINC"
Description: "Combo de exames vendido como um único item por um laboratório fictício. Não há LOINC para o conjunto, então o item leva só o código próprio do laboratório."

* url = "https://laboratorio.example/fhir/ActivityDefinition/combo-rotina"
* status = #active
* title = "Combo rotina"
* code.coding[0] = https://laboratorio.example/fhir/produtos#COMBO-ROTINA "Combo rotina"

Instance: PrecoGlicosePorUnidadeExemplo
InstanceOf: BRLabChargeItemDefinition
Usage: #example
Title: "Preço por unidade e produto"
Description: "Preço da glicose em uma unidade: `useContext` aponta a unidade. O valor é fictício."

* url = "https://laboratorio.example/fhir/ChargeItemDefinition/glicose-unidade-centro"
* status = #active
* code.coding[loinc] = $LOINC#2345-7 "Glicose"
* useContext[venue].valueReference = Reference(UnidadeCentroExemplo)
* propertyGroup.priceComponent[base].amount.value = 12.50

Instance: PrecoGlicosePorCidadeExemplo
InstanceOf: BRLabChargeItemDefinition
Usage: #example
Title: "Preço por cidade"
Description: "Preço da glicose em todas as unidades de uma cidade: `jurisdiction` leva o código IBGE de Porto Alegre. O valor é fictício."

* url = "https://laboratorio.example/fhir/ChargeItemDefinition/glicose-porto-alegre"
* status = #active
* code.coding[loinc] = $LOINC#2345-7 "Glicose"
* jurisdiction[municipio].coding = $IBGEMunicipio#4314902 "Porto Alegre"
* propertyGroup.priceComponent[base].amount.value = 14.00

Instance: PrecoGlicosePorMarcaERegiaoExemplo
InstanceOf: BRLabChargeItemDefinition
Usage: #example
Title: "Preço por marca e região"
Description: "Preço da glicose em uma região de uma marca: `useContext` aponta o Location da região, cuja `managingOrganization` é a marca. O valor é fictício."

* url = "https://laboratorio.example/fhir/ChargeItemDefinition/glicose-regiao-sul"
* status = #active
* code.coding[loinc] = $LOINC#2345-7 "Glicose"
* useContext[venue].valueReference = Reference(RegiaoSulExemplo)
* propertyGroup.priceComponent[base].amount.value = 15.00
