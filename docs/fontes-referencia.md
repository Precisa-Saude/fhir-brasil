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
- NT-proBNP: corte diagnóstico 125 pg/mL para triagem de insuficiência cardíaca

### sbd-diabetes-2024

SOCIEDADE BRASILEIRA DE DIABETES (SBD). **Diretrizes da Sociedade Brasileira de Diabetes 2024**. São Paulo: SBD, 2024.

Disponível em: <https://diretriz.diabetes.org.br>.

> **Nota**: Edição exata e dados bibliográficos completos pendentes de verificação.

### sbem-thyroid-2013

SOCIEDADE BRASILEIRA DE ENDOCRINOLOGIA E METABOLOGIA (SBEM). Consenso Brasileiro para a Abordagem Clínica e Tratamento do Hipotireoidismo Subclínico em Adultos. **Arquivos Brasileiros de Endocrinologia & Metabologia**, v. 57, n. 3, 2013.

> **Nota**: Referência exata do consenso pendente de verificação.

---

## Fontes Internacionais

### tietz-7ed-2015

BURTIS, C. A.; BRUNS, D. E. **Tietz Fundamentals of Clinical Chemistry and Molecular Diagnostics**. 7. ed. St. Louis: Elsevier Saunders, 2015. ISBN 978-1-4557-4165-6.

**Valores utilizados:** Eletrolitos, funcao hepatica, coagulacao, inflamacao, e demais analitos sem diretriz brasileira especifica.

### kdigo-ckd-2024

KIDNEY DISEASE: IMPROVING GLOBAL OUTCOMES (KDIGO) CKD Work Group. KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease. **Kidney International**, v. 105, n. 4S, p. S117-S314, 2024. DOI: [10.1016/j.kint.2023.10.018](https://doi.org/10.1016/j.kint.2023.10.018).

Disponivel em: <https://pubmed.ncbi.nlm.nih.gov/38490803/>.

**Valores utilizados:** Classificacao eGFR (G1-G5).

---

## Fontes a Adicionar

As fontes abaixo serão adicionadas conforme a verificação dos biomarcadores avance:

- **OMS/WHO** — Diretrizes internacionais (anemia, IMC, etc.)
- **ANVISA** — Limites ocupacionais para metais pesados
- **Gallagher et al. (2000)** — Faixas de composição corporal por DXA
- **Harris et al.** — Índice Omega-3
- Artigos PubMed/SciELO com faixas validadas para população brasileira
