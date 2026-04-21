// Códigos TUSS realinhados com a tabela oficial ANS (MAPEAMENTO TUSS x SIGTAP 2017 04.xlsx).
// Fonte: https://www.gov.br/ans/pt-br/arquivos/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-tiss/padrao-tiss-tabelas-relacionadas/padraotiss_mapeamento_tuss_sigtap.zip
// Ver issue #23 para auditoria completa e justificativa de cada mudança.

ValueSet: BRTUSSProcedimentosLabVS
Id: tuss-procedimentos-lab-vs
Title: "TUSS Procedimentos Laboratoriais ValueSet"
Description: "Subconjunto de códigos TUSS para procedimentos laboratoriais relevantes aos biomarcadores suportados pelo fhir-brasil. Códigos da Tabela 22 (Procedimentos e Eventos em Saúde) da TUSS, alinhados com a tabela oficial ANS competência 2017-04."

// Hematologia
* $TUSS#40304361 "Hemograma com contagem de plaquetas (eritrograma, leucograma, plaquetas)"
* $TUSS#40304558 "Reticulócitos, contagem"
* $TUSS#40304370 "Hemossedimentação (VHS)"

// Bioquímica — glicose e metabolismo
* $TUSS#40302040 "Glicose"
* $TUSS#40302733 "Hemoglobina glicada (Fração A1c)"
* $TUSS#40316360 "Insulina"
* $TUSS#40301150 "Ácido úrico"
* $TUSS#40301648 "Creatino fosfoquinase total (CK)"

// Bioquímica — perfil lipídico
* $TUSS#40301605 "Colesterol total"
* $TUSS#40301583 "Colesterol HDL"
* $TUSS#40301591 "Colesterol LDL"
* $TUSS#40302547 "Triglicerídeos"
* $TUSS#40302695 "Colesterol VLDL"
* $TUSS#40301354 "Apolipoproteína A (Apo A)"
* $TUSS#40301362 "Apolipoproteína B (Apo B)"
* $TUSS#40302210 "Lipoproteína (a) — Lp(a)"

// Bioquímica — função hepática
* $TUSS#40301222 "Albumina"
* $TUSS#40301397 "Bilirrubinas (direta, indireta e total)"
* $TUSS#40302377 "Proteínas totais"
* $TUSS#40301885 "Fosfatase alcalina"
* $TUSS#40301990 "Gama-glutamil transferase (GGT)"
* $TUSS#40302504 "Transaminase oxalacética (TGO/AST)"
* $TUSS#40302512 "Transaminase pirúvica (TGP/ALT)"

// Bioquímica — função renal
* $TUSS#40301630 "Creatinina"
* $TUSS#40302580 "Ureia"
* $TUSS#40302318 "Potássio"
* $TUSS#40302423 "Sódio"
* $TUSS#40301508 "Clearance de creatinina"

// Bioquímica — minerais e eletrólitos
* $TUSS#40301400 "Cálcio"
* $TUSS#40302237 "Magnésio"
* $TUSS#40301842 "Ferro sérico"
* $TUSS#40316270 "Ferritina"
* $TUSS#40301427 "Capacidade de fixação de ferro (TIBC)"

// Hormônios — tireoide
* $TUSS#40316521 "Tireoestimulante, hormônio (TSH)"
* $TUSS#40316491 "T4 livre"
* $TUSS#40316467 "T3 livre"
* $TUSS#40316530 "Tireoglobulina (anti-TG)"
* $TUSS#40316157 "Anti-TPO"

// Hormônios — reprodutivos
* $TUSS#40316246 "Estradiol"
* $TUSS#40316289 "Folículo estimulante, hormônio (FSH)"
* $TUSS#40316335 "Hormônio luteinizante (LH)"
* $TUSS#40316408 "Progesterona"
* $TUSS#40316416 "Prolactina"
* $TUSS#40316513 "Testosterona total"
* $TUSS#40316505 "Testosterona livre"

// Hormônios — outros
* $TUSS#40316190 "Cortisol"
* $TUSS#40316459 "Sulfato de dehidroepiandrosterona (S-DHEA)"

// Vitaminas
* $TUSS#40316572 "Vitamina B12"
* $TUSS#40301087 "Ácido fólico (eritrocitário)"
* $TUSS#40302830 "Vitamina D 25 hidroxi"

// Marcadores tumorais
* $TUSS#40316068 "Alfa-fetoproteína (AFP)"
* $TUSS#40316378 "Marcadores tumorais (CA 19.9, CA 125, CA 72-4, CA 15-3, etc.)"
* $TUSS#40316122 "Antígeno carcinoembriogênico (CEA)"
* $TUSS#40316149 "Antígeno específico prostático total (PSA)"
* $TUSS#40316130 "Antígeno específico prostático livre (PSA livre)"

// Marcadores inflamatórios
* $TUSS#40308391 "Proteína C reativa, quantitativa"

// Urinálise
* $TUSS#40311210 "Rotina de urina (EAS — caracteres físicos, elementos anormais e sedimentoscopia)"
* $TUSS#40311171 "Microalbuminúria"
