CodeSystem: BRLabPriceContextCS
Id: lab-price-context
Title: "BR Lab Price Context"
Description: "Tipos de contexto de uso de um preço de exame que o ValueSet de tipos de contexto do FHIR R4 não cobre. Hoje tem um código, o da marca, usado em `ChargeItemDefinition.useContext.code` do perfil BRLabChargeItemDefinition."
* ^url = "https://fhir-brasil.dev.br/CodeSystem/lab-price-context"
* ^status = #draft
* ^content = #complete
* ^caseSensitive = true
* ^publisher = "Precisa Saúde"
* #brand "Marca" "Marca de laboratório em que o preço vale. O valor do contexto é uma referência à Organization da marca."
