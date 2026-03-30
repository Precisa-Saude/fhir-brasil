# Verificacao de Citacoes - Faixas de Referencia

> Status de verificacao de cada biomarcador contra documentos-fonte.
> Biomarcadores organizados por categoria clinica real.

**Legenda**:
- `[ ]` - Nao verificado (sem fonte ou fonte nao conferida)
- `[x]` - Verificado (valor conferido contra documento-fonte)

**Estatisticas**: 37/202 verificados (18.3%)

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
- [x] ApoCIII_ApoA1_Ratio - `khetarpal-apociii-2016` (derivado). **NOTA**: corte 0.15 sem fonte publicada especifica
- [x] Lipoprotein_a - `sbc-lipids-2025` Alterado >=75 nmol/L ou >=30 mg/dL confere

### Subfracoes Lipidicas (Avancado)

- [x] HDL_Large - `caulfield-ionmobility-2008` Quest Ion Mobility ranges
- [x] LDL_Medium - `caulfield-ionmobility-2008` Quest Ion Mobility ranges
- [x] LDL_ParticleNumber - `caulfield-ionmobility-2008` Quest Ion Mobility ranges
- [x] LDL_Peak_Size - `caulfield-ionmobility-2008` Quest Ion Mobility ranges
- [x] LDL_Small - `caulfield-ionmobility-2008` Quest Ion Mobility ranges

### Marcadores Cardiacos

- [x] BNP - `maisel-bnp-2002` 100 pg/mL eh corte diagnostico HF (nao referencia lab saudavel)
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

- [ ] RBC - sem fonte
- [ ] WBC - sem fonte
- [ ] Hgb - sem fonte
- [ ] Hct - sem fonte
- [ ] Platelets - sem fonte
- [ ] MCV - sem fonte
- [ ] MCH - sem fonte
- [ ] MCHC - sem fonte
- [ ] RDW - sem fonte
- [ ] MPV - sem fonte
- [ ] Reticulocytes - sem fonte
- [ ] NRBC - sem fonte
- [ ] ImmatureGranulocytes - sem fonte

### Diferencial Leucocitario

- [ ] Neutrophils - sem fonte
- [ ] Neutrophils_Abs - sem fonte
- [ ] Lymphocytes - sem fonte
- [ ] Lymphocytes_Abs - sem fonte
- [ ] Monocytes - sem fonte
- [ ] Monocytes_Abs - sem fonte
- [ ] Eosinophils - sem fonte
- [ ] Eosinophils_Abs - sem fonte
- [ ] Basophils - sem fonte
- [ ] Basophils_Abs - sem fonte

### Coagulacao

- [ ] INR - sem fonte
- [ ] ProthrombinTime - sem fonte

### Inflamacao / VHS

- [ ] ESR - sem fonte
- [ ] CRP - sem fonte

---

## Painel Metabolico

### Glicemia e Diabetes

- [ ] Glucose - fonte atual: `sbd-diabetes-2024` (falta localizacao)
- [ ] HbA1c - fonte atual: `sbd-diabetes-2024` (falta localizacao)
- [ ] eAG - sem fonte
- [ ] GlycoMark - sem fonte
- [ ] HOMA_IR - sem fonte
- [ ] Insulin - sem fonte
- [ ] CPeptide - sem fonte

### Eletrolitos

- [ ] Sodium - sem fonte
- [ ] Potassium - sem fonte
- [ ] Chloride - sem fonte
- [ ] Calcium - sem fonte
- [ ] Phosphorus - sem fonte
- [ ] Magnesium - sem fonte
- [ ] Magnesium_RBC - sem fonte
- [ ] Bicarbonate - sem fonte
- [ ] CO2 - sem fonte

### Funcao Renal

- [ ] Creatinine - fonte atual: `sbpc-ml-2021` (falta localizacao)
- [ ] eGFR - sem fonte
- [ ] CystatinC - sem fonte
- [ ] BUN_Creatinine_Ratio - sem fonte
- [ ] Urea - sem fonte
- [ ] UricAcid - sem fonte

### Proteinas

- [ ] Albumin - fonte atual: `sbpc-ml-2021` (falta localizacao)
- [ ] Globulin - sem fonte
- [ ] Albumin_Globulin_Ratio - sem fonte
- [ ] Albumin_Creatinine_Ratio - sem fonte
- [ ] TotalProtein - sem fonte
- [ ] Prealbumin - sem fonte

---

## Funcao Hepatica

- [ ] ALT - fonte atual: `sbpc-ml-2021` (falta localizacao)
- [ ] AST - fonte atual: `sbpc-ml-2021` (falta localizacao)
- [ ] GGT - fonte atual: `sbpc-ml-2021` (falta localizacao)
- [ ] AlkalinePhosphatase - sem fonte
- [ ] BilirubinTotal - sem fonte
- [ ] BilirubinDirect - sem fonte
- [ ] BilirubinIndirect - sem fonte
- [ ] Ammonia - sem fonte
- [ ] Lactate - sem fonte

---

## Estudos de Ferro

- [ ] Iron - fonte atual: `sbpc-ml-2021` (falta localizacao)
- [ ] Ferritin - fonte atual: `sbpc-ml-2021` (falta localizacao)
- [ ] TIBC - sem fonte
- [ ] Transferrin - sem fonte
- [ ] TransferrinSaturation - sem fonte

---

## Tireoide

- [ ] TSH - fonte atual: `sbem-thyroid-2013` (falta localizacao)
- [ ] T3Free - sem fonte
- [ ] T3Reverse - sem fonte
- [ ] T4Free - sem fonte
- [ ] T4Total - sem fonte
- [ ] AntiTPO - sem fonte
- [ ] AntiThyroglobulin - sem fonte

---

## Vitaminas

- [ ] VitaminA - sem fonte
- [ ] VitaminB1 - sem fonte
- [ ] VitaminB6 - sem fonte
- [ ] VitaminB12 - fonte atual: `sbpc-ml-2021` (falta localizacao)
- [ ] VitaminC - sem fonte
- [ ] VitaminD - fonte atual: `sbem-thyroid-2013` (falta localizacao)
- [ ] VitaminD_1_25 - sem fonte
- [ ] VitaminE - sem fonte
- [ ] Folate - sem fonte
- [ ] FolicAcid - sem fonte
- [ ] MMA - sem fonte

---

## Hormonios

### Reprodutivos

- [ ] Testosterone - sem fonte
- [ ] TestosteroneFree - sem fonte
- [ ] TestosteroneBioavailable - sem fonte
- [ ] DHT - sem fonte
- [ ] Estradiol - sem fonte
- [ ] Progesterone - sem fonte
- [ ] FSH - sem fonte
- [ ] LH - sem fonte
- [ ] AMH - sem fonte
- [ ] SHBG - sem fonte
- [ ] Prolactin - sem fonte

### Adrenais e Metabolicos

- [ ] Cortisol - sem fonte
- [ ] CortisolFree - sem fonte
- [ ] DHEAS - sem fonte
- [ ] GrowthHormone - sem fonte
- [ ] IGF1 - sem fonte
- [ ] Adiponectin - sem fonte
- [ ] Leptin - sem fonte
- [ ] Ghrelin - sem fonte

---

## Marcadores Tumorais

- [ ] PSA - sem fonte
- [ ] PSA_Free - sem fonte
- [ ] PSA_FreeRatio - sem fonte
- [ ] AFP - sem fonte
- [ ] CEA - sem fonte
- [ ] CA125 - sem fonte
- [ ] CA199 - sem fonte

---

## Urinalise

- [ ] pH_Urine - sem fonte
- [ ] SpecificGravity_Urine - sem fonte
- [ ] Urobilinogen_Urine - sem fonte
- [ ] HyalineCasts_Urine - sem fonte
- [ ] RBC_Urine - sem fonte
- [ ] SquamousEpithelial_Urine - sem fonte
- [ ] Leukocytes_Urine - sem fonte
- [ ] Microalbumin - sem fonte
- [ ] Microalbumin_Urine - sem fonte
- [ ] Creatinine_Urine - sem fonte

---

## Acidos Graxos Omega

- [ ] Omega3_Index - sem fonte
- [ ] Omega3_Total - sem fonte
- [ ] Omega3_EPA - sem fonte
- [ ] Omega3_DPA - sem fonte
- [ ] Omega3_DHA - sem fonte
- [ ] Omega6_Total - sem fonte
- [ ] Omega6_AA - sem fonte
- [ ] Omega6_LA - sem fonte
- [ ] Omega6_Omega3_Ratio - sem fonte
- [ ] AA_EPA_Ratio - sem fonte
- [ ] EPADPADHA - sem fonte
- [ ] OmegaCheck - sem fonte
- [ ] Oleic_Acid - sem fonte
- [ ] Palmitic_Acid - sem fonte
- [ ] Stearic_Acid - sem fonte
- [ ] Trans_Fat_Index - sem fonte

---

## Minerais e Oligoelementos

- [ ] Copper - sem fonte
- [ ] Selenium - sem fonte
- [ ] Zinc - sem fonte

---

## Metais Pesados

- [ ] Arsenic - sem fonte
- [ ] Cadmium - sem fonte
- [ ] Lead - sem fonte
- [ ] Mercury - sem fonte

---

## Imunoglobulinas

- [ ] IgA - sem fonte
- [ ] IgG - sem fonte
- [ ] IgE_Total - sem fonte
- [ ] IgE_E1_CatDander - sem fonte
- [ ] IgE_GX1_Grasses - sem fonte

---

## Composicao Corporal (DXA)

- [ ] BMI - sem fonte
- [ ] BodyFatPct - sem fonte (Gallagher et al. 2000 citado em comentario, mas nao formalizado)
- [ ] AndroidFatPct - sem fonte
- [ ] GynoidFatPct - sem fonte
- [ ] AndroidGynoidRatio - sem fonte
- [ ] FatMass - sem fonte
- [ ] FatFreeMass - sem fonte
- [ ] LeanMass - sem fonte
- [ ] TotalMass - sem fonte
- [ ] BMC - sem fonte
- [ ] VATMass - sem fonte
- [ ] VATVolume - sem fonte

---

## Densitometria Ossea (DXA)

- [ ] BMD_Total - sem fonte
- [ ] TScore_Total - sem fonte
- [ ] ZScore_Total - sem fonte

---

## Outros

- [ ] Amylase - sem fonte
- [ ] Lipase - sem fonte
- [ ] F2Isoprostanes - sem fonte
- [ ] CoQ10 - sem fonte
