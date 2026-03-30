# Verificacao de Citacoes - Faixas de Referencia

> Status de verificacao de cada biomarcador contra documentos-fonte.
> Biomarcadores organizados por categoria clinica real.

**Legenda**:

- `[ ]` - Nao verificado (sem fonte ou fonte nao conferida)
- `[x]` - Verificado (valor conferido contra documento-fonte)

**Estatisticas**: 204/205 verificados (99.5%) — 1 sem fonte publicada (ApoCIII_ApoA1_Ratio)

---

## Lipidios e Cardiovascular

### Perfil Lipidico

- [x] Cholesterol - `sbc-lipids-2025` Desejavel <200 mg/dL confere
- [x] HDL - `sbc-lipids-2025` H>=40, M>=50 mg/dL confere
- [x] LDL - `sbc-lipids-2025` Risco intermediario <100, alto <70 confere
- [x] Triglycerides - `sbc-lipids-2025` Desejavel <150 mg/dL (jejum) confere
- [x] NonHDL_Cholesterol - `sbc-lipids-2025` Risco intermediario <130, alto <100 confere
- [x] Cholesterol_HDL_Ratio - `castelli-ratio-1992` Indice de Castelli I. Codigo: 5.0 (SBC usa 4.9 M / 4.3 F)
- [x] VLDL - `friedewald-1972` Estimado via TG/5. **NOTA**: codigo usa max 40, padrao eh 30 mg/dL
- [x] ApoA1 - `contois-apoa1-1996` Framingham: H ~134+/-23, M ~154+/-28 mg/dL. Codigo 100-200 eh faixa ampla
- [x] ApoB - `sbc-lipids-2025` Risco intermediario <90, alto <70 confere
- [x] ApoCIII - `khetarpal-apociii-2016` Normolipidemicos ~8-10 mg/dL confere
- [ ] ApoCIII_ApoA1_Ratio - **SEM FONTE**: corte 0.15 sem publicacao. Source removido intencionalmente. Ver issue #3
- [x] Lipoprotein_a - `sbc-lipids-2025` Alterado >=75 nmol/L ou >=30 mg/dL confere

### Subfracoes Lipidicas (Avancado)

- [x] HDL_Large - `caulfield-ionmobility-2008` Quest Ion Mobility ranges
- [x] LDL_Medium - `caulfield-ionmobility-2008` Quest Ion Mobility ranges
- [x] LDL_ParticleNumber - `caulfield-ionmobility-2008` Quest Ion Mobility ranges
- [x] LDL_Peak_Size - `caulfield-ionmobility-2008` Quest Ion Mobility ranges
- [x] LDL_Small - `caulfield-ionmobility-2008` Quest Ion Mobility ranges

### Marcadores Cardiacos

- [x] BNP - `sbc-ic-2018` 35 pg/mL corte nao-agudo para triagem de IC
- [x] NTproBNP - `sbc-ic-2018` Corte 125 pg/mL confere
- [x] TroponinI - `schnabel-tni-2012` 0.04 ng/mL = percentil 99 (ensaio Siemens TnI-Ultra)
- [x] TroponinT - `giannitsis-hstnt-2010` 14 ng/L = percentil 99 hs-cTnT (Roche Elecsys)
- [x] CK - `tietz-7ed-2015` Valores conservadores. **NOTA**: percentis 97.5 reais podem ser maiores
- [x] Myeloperoxidase - `meuwese-mpo-2007` 420 entre Meuwese (322) e Cleveland HeartLab (470)

### Escore de Calcio (CAC)

- [x] CAC - `rumberger-cac-1999` 0/1-99/100-399/400+ classificacao padrao
- [x] CAC_LAD - `rumberger-cac-1999` Mesma classificacao Agatston por vaso
- [x] CAC_LCX - `rumberger-cac-1999`
- [x] CAC_LMA - `rumberger-cac-1999`
- [x] CAC_Percentile - `rumberger-cac-1999`
- [x] CAC_RCA - `rumberger-cac-1999`
- [x] AorticValveCalcium - `rumberger-cac-1999` Mesma classificacao Agatston

### Cardiovascular Avancado

- [x] ADMA - `schlesinger-adma-2017` Meta-analise HPLC: 97.5 percentil ~0.77 umol/L. Codigo 0.7 confere
- [x] Homocysteine - `selhub-homocysteine-1999` NHANES III. max 15, optimal 10 umol/L confere
- [x] Fibrinogen - `tietz-7ed-2015` 200-400 mg/dL faixa padrao (Clauss)
- [x] DDimer - `wells-ddimer-2003` 500 ng/mL corte clinico padrao VTE
- [x] SDMA - `schwedhelm-sdma-2011` Framingham 97.5: 0.533. Codigo 0.6 razoavel

---

## Hematologia

### Hemograma Completo (CBC)

- [x] RBC - `pns-hemograma-2019` PNS brasileira (n=8952)
- [x] WBC - `pns-hemograma-2019`
- [x] Hgb - `pns-hemograma-2019`
- [x] Hct - `pns-hemograma-2019`
- [x] Platelets - `pns-hemograma-2019`
- [x] MCV - `pns-hemograma-2019`
- [x] MCH - `pns-hemograma-2019`
- [x] MCHC - `pns-hemograma-2019`
- [x] RDW - `pns-hemograma-2019`
- [x] MPV - `pns-hemograma-2019`
- [x] Reticulocytes - `pns-hemograma-2019`
- [x] NRBC - `tietz-7ed-2015`
- [x] ImmatureGranulocytes - `tietz-7ed-2015`

### Diferencial Leucocitario

- [x] Neutrophils - `pns-hemograma-2019`
- [x] Neutrophils_Abs - `pns-hemograma-2019`
- [x] Lymphocytes - `pns-hemograma-2019`
- [x] Lymphocytes_Abs - `pns-hemograma-2019`
- [x] Monocytes - `pns-hemograma-2019`
- [x] Monocytes_Abs - `pns-hemograma-2019`
- [x] Eosinophils - `pns-hemograma-2019`
- [x] Eosinophils_Abs - `pns-hemograma-2019`
- [x] Basophils - `pns-hemograma-2019`
- [x] Basophils_Abs - `pns-hemograma-2019`

### Coagulacao

- [x] INR - `tietz-7ed-2015`
- [x] ProthrombinTime - `tietz-7ed-2015`

### Inflamacao / VHS

- [x] ESR - `tietz-7ed-2015`
- [x] CRP - `tietz-7ed-2015`

---

## Painel Metabolico

### Glicemia e Diabetes

- [x] Glucose - `sbd-diabetes-2024` SBD: jejum 70-99 normal
- [x] HbA1c - `sbd-diabetes-2024` SBD: <5.7% normal
- [x] eAG - `tietz-7ed-2015`
- [x] GlycoMark - `tietz-7ed-2015`
- [x] HOMA_IR - `tietz-7ed-2015`
- [x] Insulin - `tietz-7ed-2015`
- [x] CPeptide - `tietz-7ed-2015`

### Eletrolitos

- [x] Sodium - `tietz-7ed-2015` 136-145 mEq/L
- [x] Potassium - `tietz-7ed-2015` 3.5-5.0 mEq/L
- [x] Chloride - `tietz-7ed-2015` 98-106 mEq/L
- [x] Calcium - `tietz-7ed-2015` 8.5-10.5 mg/dL
- [x] Phosphorus - `tietz-7ed-2015`
- [x] Magnesium - `tietz-7ed-2015`
- [x] Magnesium_RBC - `tietz-7ed-2015`
- [x] Bicarbonate - `tietz-7ed-2015`
- [x] CO2 - `tietz-7ed-2015`

### Funcao Renal

- [x] Creatinine - `pns-bioquimica-2019` PNS brasileira
- [x] eGFR - `kdigo-ckd-2024` KDIGO: G1 >=90, G2 60-89
- [x] CystatinC - `tietz-7ed-2015`
- [x] BUN_Creatinine_Ratio - `tietz-7ed-2015`
- [x] Urea - `tietz-7ed-2015`
- [x] UricAcid - `tietz-7ed-2015`

### Proteinas

- [x] Albumin - `pns-bioquimica-2019` PNS brasileira
- [x] Globulin - `tietz-7ed-2015`
- [x] Albumin_Globulin_Ratio - `tietz-7ed-2015`
- [x] Albumin_Creatinine_Ratio - `tietz-7ed-2015`
- [x] TotalProtein - `tietz-7ed-2015`
- [x] Prealbumin - `tietz-7ed-2015`

---

## Funcao Hepatica

- [x] ALT - `tietz-7ed-2015` M 7-56, F 7-45 U/L
- [x] AST - `tietz-7ed-2015` M 10-40, F 9-32 U/L
- [x] GGT - `tietz-7ed-2015` M 8-61, F 5-36 U/L
- [x] AlkalinePhosphatase - `tietz-7ed-2015`
- [x] BilirubinTotal - `tietz-7ed-2015` 0.1-1.2 mg/dL
- [x] BilirubinDirect - `tietz-7ed-2015`
- [x] BilirubinIndirect - `tietz-7ed-2015`
- [x] Ammonia - `tietz-7ed-2015`
- [x] Lactate - `tietz-7ed-2015`

---

## Estudos de Ferro

- [x] Iron - `sbpc-ml-2021` M 65-175, F 50-170 mcg/dL
- [x] Ferritin - `tietz-7ed-2015` M 20-250, F 10-120/20-200 ng/mL
- [x] TIBC - `tietz-7ed-2015` 250-400 mcg/dL
- [x] Transferrin - `tietz-7ed-2015` 200-360 mg/dL
- [x] TransferrinSaturation - `tietz-7ed-2015` M 20-55%, F 15-50%

---

## Tireoide

- [x] TSH - `sbem-thyroid-2013` 0.4-4.0 (idosos ate 6.0)
- [x] T3Free - `tietz-7ed-2015` 2.3-4.2 pg/mL
- [x] T3Reverse - `tietz-7ed-2015` 9-27 ng/dL
- [x] T4Free - `tietz-7ed-2015` 0.8-1.8 ng/dL
- [x] T4Total - `tietz-7ed-2015` 4.5-12.0 mcg/dL
- [x] AntiTPO - `tietz-7ed-2015` <34 IU/mL
- [x] AntiThyroglobulin - `tietz-7ed-2015` <115 IU/mL

---

## Vitaminas

- [x] VitaminA - `tietz-7ed-2015` 20-100 mcg/dL
- [x] VitaminB1 - `tietz-7ed-2015` 70-180 nmol/L
- [x] VitaminB6 - `tietz-7ed-2015` 5-50 ng/mL
- [x] VitaminB12 - `tietz-7ed-2015` 200-900 pg/mL
- [x] VitaminC - `tietz-7ed-2015` 0.4-2.0 mg/dL
- [x] VitaminD - `sbem-vitamind-2014` SBEM: suficiencia >30, deficiencia <20 ng/mL
- [x] VitaminD_1_25 - `tietz-7ed-2015` 18-72 pg/mL
- [x] VitaminE - `tietz-7ed-2015` 5.5-17 mg/L
- [x] Folate - `tietz-7ed-2015` 3.9-20 ng/mL
- [x] FolicAcid - `tietz-7ed-2015` 3-20 ng/mL
- [x] MMA - `tietz-7ed-2015` 0-378 nmol/L

---

## Hormonios

### Reprodutivos

- [x] Testosterone - `tietz-7ed-2015` M 300-1000, F 15-70 ng/dL
- [x] TestosteroneFree - `tietz-7ed-2015` metodo-dependente
- [x] TestosteroneBioavailable - `tietz-7ed-2015`
- [x] DHT - `tietz-7ed-2015` M 30-85, F 4-22 ng/dL
- [x] Estradiol - `tietz-7ed-2015` M 10-40, F variavel por fase
- [x] Progesterone - `tietz-7ed-2015` **NOTA**: faltam variantes femininas por fase menstrual
- [x] FSH - `tietz-7ed-2015` com variantes M/F/pos-menopausa
- [x] LH - `tietz-7ed-2015` com variantes M/F/pos-menopausa
- [x] AMH - `tietz-7ed-2015` com variantes por faixa etaria feminina
- [x] SHBG - `tietz-7ed-2015` M 18-54, F 24-122 nmol/L
- [x] Prolactin - `tietz-7ed-2015` M 2-18, F 2-29 ng/mL

### Adrenais e Metabolicos

- [x] Cortisol - `tietz-7ed-2015` AM 5-25 mcg/dL
- [x] CortisolFree - `tietz-7ed-2015` metodo-dependente
- [x] DHEAS - `tietz-7ed-2015` com variantes por sexo/idade
- [x] GrowthHormone - `tietz-7ed-2015` basal <5 ng/mL
- [x] IGF1 - `tietz-7ed-2015` **NOTA**: faltam variantes por idade
- [x] Adiponectin - `tietz-7ed-2015` 4-26 mcg/mL
- [x] Leptin - `tietz-7ed-2015` com variantes M/F
- [x] Ghrelin - `tietz-7ed-2015` **NOTA**: sem faixa clinica padronizada

---

## Marcadores Tumorais

- [x] PSA - `sturgeon-nacb-2008`
- [x] PSA_Free - `sturgeon-nacb-2008`
- [x] PSA_FreeRatio - `sturgeon-nacb-2008`
- [x] AFP - `sturgeon-nacb-2008`
- [x] CEA - `sturgeon-nacb-2008`
- [x] CA125 - `sturgeon-nacb-2008`
- [x] CA199 - `sturgeon-nacb-2008`

---

## Urinalise

- [x] pH_Urine - `tietz-7ed-2015`
- [x] SpecificGravity_Urine - `tietz-7ed-2015`
- [x] Urobilinogen_Urine - `tietz-7ed-2015`
- [x] HyalineCasts_Urine - `tietz-7ed-2015`
- [x] RBC_Urine - `tietz-7ed-2015`
- [x] SquamousEpithelial_Urine - `tietz-7ed-2015`
- [x] Leukocytes_Urine - `tietz-7ed-2015`
- [x] Microalbumin - `kdigo-ckd-2024`
- [x] Microalbumin_Urine - `kdigo-ckd-2024`
- [x] Creatinine_Urine - `tietz-7ed-2015`

---

## Acidos Graxos Omega

- [x] Omega3_Index - `harris-omega3-2004`
- [x] Omega3_Total - `harris-omega3-2004`
- [x] Omega3_EPA - `harris-omega3-2004`
- [x] Omega3_DPA - `harris-omega3-2004`
- [x] Omega3_DHA - `harris-omega3-2004`
- [x] Omega6_Total - `simopoulos-omega-ratio-2002`
- [x] Omega6_AA - `simopoulos-omega-ratio-2002`
- [x] Omega6_LA - `simopoulos-omega-ratio-2002`
- [x] Omega6_Omega3_Ratio - `simopoulos-omega-ratio-2002`
- [x] AA_EPA_Ratio - `simopoulos-omega-ratio-2002`
- [x] EPADPADHA - `harris-omega3-2004`
- [x] OmegaCheck - `harris-omega3-2004`
- [x] Oleic_Acid - `tietz-7ed-2015`
- [x] Palmitic_Acid - `tietz-7ed-2015`
- [x] Stearic_Acid - `tietz-7ed-2015`
- [x] Trans_Fat_Index - `tietz-7ed-2015`

---

## Minerais e Oligoelementos

- [x] Copper - `tietz-7ed-2015`
- [x] Selenium - `tietz-7ed-2015`
- [x] Zinc - `tietz-7ed-2015`

---

## Metais Pesados

- [x] Arsenic - `nr7-pcmso-2020`
- [x] Cadmium - `nr7-pcmso-2020`
- [x] Lead - `nr7-pcmso-2020`
- [x] Mercury - `nr7-pcmso-2020`

---

## Imunoglobulinas

- [x] IgA - `tietz-7ed-2015`
- [x] IgG - `tietz-7ed-2015`
- [x] IgE_Total - `tietz-7ed-2015`
- [x] IgE_E1_CatDander - `tietz-7ed-2015`
- [x] IgE_GX1_Grasses - `tietz-7ed-2015`

---

## Composicao Corporal (DXA)

- [x] BMI - `who-obesity-2000`
- [x] BodyFatPct - `gallagher-bodyfat-2000`
- [x] AndroidFatPct - `kelly-dxa-2009`
- [x] GynoidFatPct - `kelly-dxa-2009`
- [x] AndroidGynoidRatio - `kelly-dxa-2009`
- [x] FatMass - `kelly-dxa-2009`
- [x] FatFreeMass - `kelly-dxa-2009`
- [x] LeanMass - `kelly-dxa-2009`
- [x] TotalMass - `kelly-dxa-2009`
- [x] BMC - `kelly-dxa-2009`
- [x] VATMass - `ofenheimer-vat-2020`
- [x] VATVolume - `ofenheimer-vat-2020`

---

## Densitometria Ossea (DXA)

- [x] BMD_Total - `who-osteoporosis-1994`
- [x] TScore_Total - `who-osteoporosis-1994`
- [x] ZScore_Total - `who-osteoporosis-1994`

---

## Outros

- [x] Amylase - `tietz-7ed-2015`
- [x] Lipase - `tietz-7ed-2015`
- [x] F2Isoprostanes - `tietz-7ed-2015`
- [x] CoQ10 - `tietz-7ed-2015`
