Instance: GlicoseDoHistorico
InstanceOf: BRLabObservation
Usage: #example
Title: "Glicose — lida da tabela de histórico"
Description: "Resultado de uma data anterior, lido da tabela de acompanhamento que um laudo mais novo reimprime. A data é a da coluna do histórico, e não a do laudo que a traz."

* status = #final
* category[laboratory] = $ObsCat#laboratory
* code.coding[loinc] = $LOINC#2345-7 "Glicose"
* valueQuantity.value = 98
* valueQuantity.unit = "mg/dL"
* valueQuantity.system = $UCUM
* valueQuantity.code = #mg/dL
* referenceRange.low.value = 70
* referenceRange.low.unit = "mg/dL"
* referenceRange.low.system = $UCUM
* referenceRange.low.code = #mg/dL
* referenceRange.high.value = 99
* referenceRange.high.unit = "mg/dL"
* referenceRange.high.system = $UCUM
* referenceRange.high.code = #mg/dL
* subject = Reference(Patient/example)
* effectiveDateTime = "2025-10-02"
* extension[extractionSource].extension[page][0].valuePositiveInt = 3
* extension[extractionConfidence].extension[reading].valueDecimal = 1
* extension[extractionConfidence].extension[interpretation].valueDecimal = 0.88

Instance: LaudoDoHistorico
InstanceOf: BRDiagnosticReport
Usage: #example
Title: "Laudo lido da tabela de histórico"
Description: "Um DiagnosticReport por data da tabela de histórico. A extensão reprintedIn diz que ele não foi emitido como laudo: veio do histórico que outro laudo reimprime."

* status = #final
* category[laboratory] = http://terminology.hl7.org/CodeSystem/v2-0074#LAB
* code = $LOINC#11502-2 "Laboratory report"
* subject = Reference(Patient/example)
* effectiveDateTime = "2025-10-02"
* performer = Reference(Organization/example)
* result = Reference(GlicoseDoHistorico)
* extension[reprintedIn].valueReference = Reference(LaudoAtual)

Instance: LaudoAtual
InstanceOf: BRDiagnosticReport
Usage: #example
Title: "Laudo que reimprime o histórico"
Description: "O laudo emitido em 15/03/2026. Traz o resultado do dia e reimprime a tabela de histórico de onde saiu o LaudoDoHistorico."

* status = #final
* category[laboratory] = http://terminology.hl7.org/CodeSystem/v2-0074#LAB
* code = $LOINC#11502-2 "Laboratory report"
* subject = Reference(Patient/example)
* effectiveDateTime = "2026-03-15"
* performer = Reference(Organization/example)
* result = Reference(GlicoseExtraidaConvertida)
