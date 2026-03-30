# Fontes de Referência — Faixas de Biomarcadores

> Todas as referências seguem o formato ABNT (NBR 6023).

Este documento lista as fontes bibliográficas utilizadas para as faixas de referência dos biomarcadores do pacote `@precisa-saude/fhir`. Cada entrada corresponde a uma chave de fonte usada no campo `source` das definições em `reference-ranges.ts`.

## Status de Verificação

Consulte [docs/development/verificacao-citacoes.md](development/verificacao-citacoes.md) para o status detalhado de verificação de cada biomarcador.

---

## Pesquisa Nacional de Saude (PNS) - Intervalos de referencia brasileiros

### pns-hemograma-2019

ROSENFELD, L. G. et al. Valores de referencia para exames laboratoriais de hemograma da populacao adulta brasileira: Pesquisa Nacional de Saude. **Revista Brasileira de Epidemiologia**, v. 22, supl. 2, e190003.supl.2, 2019. DOI: [10.1590/1980-549720190003.supl.2](https://doi.org/10.1590/1980-549720190003.supl.2).

Disponivel em: <https://pubmed.ncbi.nlm.nih.gov/31596374/>.

**Valores utilizados:** CBC completo (RBC, WBC, Hgb, Hct, Platelets, MCV, MCH, MCHC, RDW, MPV, Reticulocytes) e diferencial leucocitario, baseados em n=8.952 adultos brasileiros.

### pns-bioquimica-2019

SZWARCWALD, C. L. et al. Valores de referencia para exames laboratoriais de colesterol, hemoglobina glicosilada e creatinina da populacao adulta brasileira. **Revista Brasileira de Epidemiologia**, v. 22, supl. 2, e190002.supl.2, 2019. DOI: [10.1590/1980-549720190002.supl.2](https://doi.org/10.1590/1980-549720190002.supl.2).

Disponivel em: <https://pubmed.ncbi.nlm.nih.gov/31596373/>.

**Valores utilizados:** Creatinina e Albumina para populacao brasileira adulta.

### pns-renal-2019

MALTA, D. C. et al. Evaluation of renal function in the Brazilian adult population, according to laboratory criteria from the National Health Survey. **Revista Brasileira de Epidemiologia**, v. 22, supl. 2, e190010.supl.2, 2019. DOI: [10.1590/1980-549720190010.supl.2](https://doi.org/10.1590/1980-549720190010.supl.2).

Disponivel em: <https://pubmed.ncbi.nlm.nih.gov/31596381/>.

---

## Fontes Brasileiras

### sbpc-ml-2021

SOCIEDADE BRASILEIRA DE PATOLOGIA CLÍNICA/MEDICINA LABORATORIAL (SBPC/ML). **Recomendações da SBPC/ML**. São Paulo: SBPC/ML, 2021.

Disponível em: <https://www.bibliotecasbpc.org.br/index.php?P=4&C=0.2>.

Acesso também em: <https://www.sbpc.org.br/pt/especializacao/publicacoes-tecnicas>.

> **Nota**: Título e dados bibliográficos completos pendentes de verificação contra a publicação original.

### sbc-lipids-2025

RACHED, F. H. et al. Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose – 2025. **Arquivos Brasileiros de Cardiologia**, São Paulo, v. 122, n. 9, e20250640, out. 2025. DOI: [10.36660/abc.20250640](https://doi.org/10.36660/abc.20250640).

Disponível em: <https://pmc.ncbi.nlm.nih.gov/articles/PMC12674852/>.

**Valores utilizados:**

- Colesterol Total: desejável <200 mg/dL
- HDL-c: desejável ≥40 mg/dL (H), ≥50 mg/dL (M)
- Triglicérides (jejum): desejável <150 mg/dL
- LDL-c: risco intermediário <100, alto <70, muito alto <50 mg/dL
- Colesterol não-HDL: risco intermediário <130, alto <100 mg/dL
- ApoB: risco intermediário <90, alto <70 mg/dL
- Lp(a): alterado ≥75 nmol/L ou ≥30 mg/dL

### sbc-lipids-2017 (superseded by 2025)

FALUDI, A. A. et al. Atualização da Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose – 2017. **Arquivos Brasileiros de Cardiologia**, São Paulo, v. 109, n. 2, supl. 1, p. 1-76, ago. 2017. DOI: [10.5935/abc.20170121](https://doi.org/10.5935/abc.20170121).

Disponível em: <https://www.scielo.br/j/abc/a/whBsCyzTDzGYJcsBY7YVkWn/?lang=pt>.

**Tabelas utilizadas:**

- **Tabela 2**: Valores referenciais e de alvo terapêutico do perfil lipídico (com e sem jejum)
  - Colesterol Total: desejável <200 mg/dL
  - HDL-c: desejável ≥40 mg/dL (H), ≥50 mg/dL (M)
  - Triglicérides (jejum): desejável <150 mg/dL
- **Tabela 3**: Metas terapêuticas de LDL-c e colesterol não-HDL por categoria de risco
  - LDL-c: risco intermediário <100 mg/dL, alto risco <70 mg/dL
  - Colesterol não-HDL: risco intermediário <130 mg/dL, alto risco <100 mg/dL

### sbc-ic-2018

ROHDE, L. E. P. et al. Diretriz Brasileira de Insuficiência Cardíaca Crônica e Aguda. **Arquivos Brasileiros de Cardiologia**, São Paulo, v. 111, n. 3, p. 436-539, set. 2018. DOI: [10.5935/abc.20180190](https://doi.org/10.5935/abc.20180190).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/30379264/>.

**Valores utilizados:**

- BNP: corte 35 pg/mL para triagem não-aguda de insuficiência cardíaca
- NT-proBNP: corte diagnóstico 125 pg/mL para triagem de insuficiência cardíaca

### nr7-pcmso-2020

BRASIL. Ministério do Trabalho e Emprego. NR-7 — PCMSO, Quadro 1: Indicadores biológicos. Portaria n. 6.734, de 9 de março de 2020. **Diário Oficial da União**, Brasília, 13 mar. 2020.

Disponível em: <https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2022/portaria-no-567-de-10-de-marco-de-2022-alteracoes-na-nr-7.pdf>.

**Valores utilizados:** Limites de exposição ocupacional para metais pesados (arsênio, cádmio, chumbo, mercúrio).

### sbd-diabetes-2024

SOCIEDADE BRASILEIRA DE DIABETES (SBD). **Diretrizes da Sociedade Brasileira de Diabetes 2024**. São Paulo: SBD, 2024.

Disponível em: <https://diretriz.diabetes.org.br>.

> **Nota**: Edição exata e dados bibliográficos completos pendentes de verificação.

### sbem-thyroid-2013

SGARBI, J. A. et al. Consenso brasileiro para a abordagem clínica e tratamento do hipotireoidismo subclínico em adultos. **Arquivos Brasileiros de Endocrinologia & Metabologia**, v. 57, n. 3, p. 166-183, 2013. DOI: [10.1590/S0004-27302013000300003](https://doi.org/10.1590/S0004-27302013000300003).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/23681266/>.

**Valores utilizados:** TSH 0.4-4.0 mIU/L (idosos até 6.0).

### sbem-vitamind-2014

MAEDA, S. S. et al. Recomendações da Sociedade Brasileira de Endocrinologia e Metabologia (SBEM) para o diagnóstico e tratamento da hipovitaminose D. **Arquivos Brasileiros de Endocrinologia & Metabologia**, v. 58, n. 5, p. 411-433, 2014. DOI: [10.1590/0004-2730000003388](https://doi.org/10.1590/0004-2730000003388).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/25166032/>.

**Valores utilizados:** Vitamina D: suficiência >30, insuficiência 20-29, deficiência <20 ng/mL.

### who-iron-2020

WORLD HEALTH ORGANIZATION. **WHO guideline on use of ferritin concentrations to assess iron status in individuals and populations**. Geneva: WHO, 2020. ISBN 978-92-4-000012-8.

Disponível em: <https://www.who.int/publications/i/item/9789240000124>.

---

## Fontes Internacionais

### tietz-7ed-2015

BURTIS, C. A.; BRUNS, D. E. **Tietz Fundamentals of Clinical Chemistry and Molecular Diagnostics**. 7. ed. St. Louis: Elsevier Saunders, 2015. ISBN 978-1-4557-4165-6.

**Valores utilizados:** Eletrolitos, funcao hepatica, coagulacao, inflamacao, e demais analitos sem diretriz brasileira especifica.

### kdigo-ckd-2024

KIDNEY DISEASE: IMPROVING GLOBAL OUTCOMES (KDIGO) CKD Work Group. KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease. **Kidney International**, v. 105, n. 4S, p. S117-S314, 2024. DOI: [10.1016/j.kint.2023.10.018](https://doi.org/10.1016/j.kint.2023.10.018).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/38490803/>.

**Valores utilizados:** Classificação eGFR (G1-G5).

### who-obesity-2000

WORLD HEALTH ORGANIZATION. **Obesity: preventing and managing the global epidemic**. WHO Technical Report Series, n. 894. Geneva: WHO, 2000. ISBN 92-4-120894-5.

**Valores utilizados:** Classificação de IMC (baixo peso, eutrófico, sobrepeso, obesidade graus I-III).

### who-osteoporosis-1994

WHO STUDY GROUP. Assessment of fracture risk and its application to screening for postmenopausal osteoporosis. **WHO Technical Report Series**, n. 843. Geneva: WHO, 1994.

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/7941614/>.

**Valores utilizados:** Classificação T-Score (normal, osteopenia, osteoporose).

---

## Perfil Lipídico — Fontes Complementares

### castelli-ratio-1992

CASTELLI, W. P. et al. Lipids and risk of coronary heart disease: the Framingham Study. **Annals of Epidemiology**, v. 2, n. 1-2, p. 23-28, 1992. DOI: [10.1016/1047-2797(92)90033-M](<https://doi.org/10.1016/1047-2797(92)90033-M>).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/1342260/>.

**Valores utilizados:** Índice de Castelli I (razão Colesterol Total/HDL).

### friedewald-1972

FRIEDEWALD, W. T.; LEVY, R. I.; FREDRICKSON, D. S. Estimation of the concentration of low-density lipoprotein cholesterol in plasma, without use of the preparative ultracentrifuge. **Clinical Chemistry**, v. 18, n. 6, p. 499-502, 1972. DOI: [10.1093/clinchem/18.6.499](https://doi.org/10.1093/clinchem/18.6.499).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/4337382/>.

**Valores utilizados:** Estimativa de VLDL via TG/5.

### contois-apoa1-1996

CONTOIS, J. H. et al. Reference intervals for plasma apolipoprotein A-1 determined with a standardized commercial immunoturbidimetric assay: results from the Framingham Offspring Study. **Clinical Chemistry**, v. 42, n. 4, p. 507-514, 1996. DOI: [10.1093/clinchem/42.4.507](https://doi.org/10.1093/clinchem/42.4.507).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/8605666/>.

**Valores utilizados:** ApoA1 — intervalos de referência Framingham.

### khetarpal-apociii-2016

KHETARPAL, S. A. et al. Why is apolipoprotein CIII emerging as a novel therapeutic target to reduce the burden of cardiovascular disease? **Current Atherosclerosis Reports**, v. 18, n. 10, p. 59, 2016.

Disponível em: <https://pmc.ncbi.nlm.nih.gov/articles/PMC5018018/>.

**Valores utilizados:** ApoCIII — faixa normolipidêmica ~8-10 mg/dL.

### caulfield-ionmobility-2008

CAULFIELD, M. P. et al. Direct determination of lipoprotein particle sizes and concentrations by ion mobility analysis. **Clinical Chemistry**, v. 54, n. 8, p. 1307-1316, 2008. DOI: [10.1373/clinchem.2007.100586](https://doi.org/10.1373/clinchem.2007.100586).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/18515257/>.

**Valores utilizados:** Subfrações lipídicas por Ion Mobility (HDL Large, LDL Medium, LDL Particle Number, LDL Peak Size, LDL Small).

---

## Marcadores Cardíacos — Fontes Complementares

### schnabel-tni-2012

SCHNABEL, R. B. et al. Relations of biomarkers of distinct pathophysiological pathways and atrial fibrillation incidence in the community. **Circulation**, v. 121, n. 2, p. 200-207, 2010.

**Valores utilizados:** Troponina I — percentil 99 (0.04 ng/mL, ensaio Siemens TnI-Ultra).

### giannitsis-hstnt-2010

GIANNITSIS, E. et al. Analytical validation of a high-sensitivity cardiac troponin T assay. **Clinical Chemistry**, v. 56, n. 2, p. 254-261, 2010. DOI: [10.1373/clinchem.2009.132654](https://doi.org/10.1373/clinchem.2009.132654).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/19959623/>.

**Valores utilizados:** Troponina T de alta sensibilidade — percentil 99 (14 ng/L, Roche Elecsys).

### meuwese-mpo-2007

MEUWESE, M. C. et al. Serum myeloperoxidase levels are associated with the future risk of coronary artery disease in apparently healthy individuals: the EPIC-Norfolk Prospective Population Study. **Journal of the American College of Cardiology**, v. 50, n. 2, p. 159-165, 2007. DOI: [10.1016/j.jacc.2007.03.033](https://doi.org/10.1016/j.jacc.2007.03.033).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/17616301/>.

**Valores utilizados:** Mieloperoxidase — corte de risco ~420 pmol/L.

### rumberger-cac-1999

RUMBERGER, J. A. et al. Electron beam computed tomographic coronary calcium scanning: a review and guidelines for use in asymptomatic persons. **Mayo Clinic Proceedings**, v. 74, n. 3, p. 243-252, 1999. DOI: [10.4065/74.3.243](https://doi.org/10.4065/74.3.243).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/10089993/>.

**Valores utilizados:** Classificação Agatston de cálcio coronariano (0 / 1-99 / 100-399 / 400+) e por vaso (LAD, LCX, LMA, RCA).

---

## Cardiovascular Avançado — Fontes Complementares

### schlesinger-adma-2017

SCHLESINGER, S. et al. Asymmetric and symmetric dimethylarginine as risk markers for total mortality and cardiovascular outcomes: a systematic review and meta-analysis of prospective studies. **PLoS One**, v. 11, n. 11, e0165811, 2016. DOI: [10.1371/journal.pone.0165811](https://doi.org/10.1371/journal.pone.0165811).

**Valores utilizados:** ADMA — percentil 97.5 ~0.77 µmol/L.

### selhub-homocysteine-1999

SELHUB, J. et al. Serum total homocysteine concentrations in the third National Health and Nutrition Examination Survey (1991-1994): population reference ranges and contribution of vitamin status to high serum concentrations. **Annals of Internal Medicine**, v. 131, n. 5, p. 331-339, 1999. DOI: [10.7326/0003-4819-131-5-199909070-00003](https://doi.org/10.7326/0003-4819-131-5-199909070-00003).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/10475885/>.

**Valores utilizados:** Homocisteína — máximo 15, ótimo 10 µmol/L (NHANES III).

### wells-ddimer-2003

WELLS, P. S. et al. Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis. **New England Journal of Medicine**, v. 349, p. 1227-1235, 2003. DOI: [10.1056/NEJMoa023153](https://doi.org/10.1056/NEJMoa023153).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/14507948/>.

**Valores utilizados:** D-Dímero — corte clínico 500 ng/mL para exclusão de TEV.

### schwedhelm-sdma-2011

SCHWEDHELM, E. et al. Plasma symmetric dimethylarginine reference limits from the Framingham Offspring Cohort. **Clinical Chemistry and Laboratory Medicine**, v. 49, n. 11, p. 1907-1910, 2011. DOI: [10.1515/CCLM.2011.679](https://doi.org/10.1515/CCLM.2011.679).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/21864208/>.

**Valores utilizados:** SDMA — percentil 97.5 Framingham: 0.533 µmol/L.

---

## Marcadores Tumorais

### sturgeon-nacb-2008

STURGEON, C. M. et al. National Academy of Clinical Biochemistry Laboratory Medicine Practice Guidelines for use of tumor markers in testicular, prostate, colorectal, breast, and ovarian cancers. **Clinical Chemistry**, v. 54, n. 12, p. e11-e79, 2008. DOI: [10.1373/clinchem.2008.105601](https://doi.org/10.1373/clinchem.2008.105601).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/19042984/>.

**Valores utilizados:** PSA, PSA Livre, Razão PSA Livre, AFP, CEA, CA-125, CA 19-9.

---

## Ácidos Graxos Ômega

### harris-omega3-2004

HARRIS, W. S.; VON SCHACKY, C. The Omega-3 Index: a new risk factor for death from coronary heart disease? **Preventive Medicine**, v. 39, n. 1, p. 212-220, 2004. DOI: [10.1016/j.ypmed.2004.02.030](https://doi.org/10.1016/j.ypmed.2004.02.030).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/15208005/>.

**Valores utilizados:** Índice Ômega-3, frações EPA/DPA/DHA, OmegaCheck.

### simopoulos-omega-ratio-2002

SIMOPOULOS, A. P. The importance of the ratio of omega-6/omega-3 essential fatty acids. **Biomedicine & Pharmacotherapy**, v. 56, n. 8, p. 365-379, 2002. DOI: [10.1016/S0753-3322(02)00253-6](<https://doi.org/10.1016/S0753-3322(02)00253-6>).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/12442909/>.

**Valores utilizados:** Razão Ômega-6/Ômega-3, frações Ômega-6 (AA, LA), razão AA/EPA.

---

## Composição Corporal (DXA)

### gallagher-bodyfat-2000

GALLAGHER, D. et al. Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. **American Journal of Clinical Nutrition**, v. 72, n. 3, p. 694-701, 2000.

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/10966886/>.

**Valores utilizados:** Faixas de percentual de gordura corporal por sexo e idade.

### kelly-dxa-2009

KELLY, T. L. et al. Dual energy X-ray absorptiometry body composition reference values from NHANES. **PLoS One**, v. 4, n. 9, e7038, 2009. DOI: [10.1371/journal.pone.0007038](https://doi.org/10.1371/journal.pone.0007038).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/19753111/>.

**Valores utilizados:** Composição corporal por DXA — gordura androide/ginoide, razão A/G, massa gorda, massa magra, massa livre de gordura, massa total, BMC.

### ofenheimer-vat-2020

OFENHEIMER, A. et al. Reference values of body composition parameters and visceral adipose tissue (VAT) by DXA in adults aged 18-81 years: results from the LEAD cohort. **European Journal of Clinical Nutrition**, v. 74, p. 1181-1191, 2020. DOI: [10.1038/s41430-020-0596-5](https://doi.org/10.1038/s41430-020-0596-5).

Disponível em: <https://pubmed.ncbi.nlm.nih.gov/32123345/>.

**Valores utilizados:** Tecido adiposo visceral — massa e volume por DXA.
