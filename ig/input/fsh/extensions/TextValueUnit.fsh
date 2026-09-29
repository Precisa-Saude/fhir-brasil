Extension: TextValueUnit
Id: text-value-unit
Title: "Text Value Unit"
Description: "A unidade que o documento imprime ao lado de um resultado em texto, como \"Raras /campo\" num sedimento urinário. O `valueString` do R4 não tem onde guardar unidade, e sem ela o resultado perde a escala a que se refere. Só em Observation com `valueString`: resultado numérico leva a unidade em `valueQuantity.unit`."
Context: Observation
* value[x] only string
* ^contextInvariant = "value.ofType(string).exists()"
