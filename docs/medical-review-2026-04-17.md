# Revisão clínica — faixas de referência e fontes

**Data:** 2026-04-17
**Escopo:** `@precisa-saude/fhir` — faixas de referência (`reference-ranges.ts`), registro de fontes (`sources.ts`), definições de biomarcadores (`biomarkers.ts`)
**Revisor:** papel de revisão clínica (formação em medicina) sobre o conteúdo publicado
**Complementa:** §9 da revisão `docs/development/medical-review-2026-04-17.md` do repositório `Precisa-Saude/platform`, que delegou a auditoria deste repositório para revisão paralela

Este documento classifica achados por severidade:

- **P0 — Segurança**: pode induzir o usuário a erro clínico significativo
- **P1 — Precisão**: está numericamente incorreto segundo o consenso atual
- **P2 — Fonte**: citação ausente, inadequada, ou não sustenta a afirmação
- **P3 — Cobertura**: lacuna estrutural (sexo/idade/gestação/jejum/etnia)
- **P4 — Estilo**: organização, comentários, consistência cosmética

Convenção: quando um achado afeta vários biomarcadores, é listado uma vez com os códigos envolvidos.

---

## 1. Resumo executivo

**Inventário:** 201 biomarcadores com faixas; 200/201 com `source` preenchido; 40 com variantes por sexo e/ou idade; 38 fontes no `SOURCE_REGISTRY`.

**Estado geral:** qualidade acima da média para um registro aberto em pt-BR. Documentação colateral (`docs/fontes-referencia.md`, `docs/development/verificacao-citacoes.md`) é genuinamente abrangente — a auditoria externa confirmou a granularidade das citações, não a correção clínica dos cortes numéricos.

**Contagem por severidade:**

| Severidade | Qtd |
| ---------- | --- |
| P0         | 0   |
| P1         | 7   |
| P2         | 5   |
| P3         | 6   |
| P4         | 3   |

**Top 10 itens para corrigir (ordem de impacto):**

1. `VitaminD` — `min: 30` aplica o limiar de "grupos de risco" (SBEM 2014) a toda população; o consenso SBEM/SBPC 2017–2018 explicita dois limiares (≥20 população saudável, ≥30 risco) [P1]
2. `HbA1c` — `min: 4.0` e `Glucose` `min: 70` criam falsos "abaixo do normal"; não existe patamar inferior clinicamente acionável para HbA1c, e o ponto de hipoglicemia é <54 mg/dL (SBD, ADA), não 70 [P1]
3. `TSH` — `optimalMax: 2.5` espalha o alvo gestacional (1º trimestre) para adultos não-gestantes; fonte `sbem-thyroid-2013` trata de hipotireoidismo subclínico, não é referência geral de TSH [P1/P2]
4. `VLDL` — cita `friedewald-1972` como fonte de faixa; Friedewald é fórmula (LDL = CT − HDL − TG/5), não publica valores de referência de VLDL [P2]
5. `Ferritin` — `who-iron-2020` está no registro mas não é usado; a fonte utilizada (`tietz-7ed-2015`) é textbook norte-americano em vez da diretriz OMS explicitamente dirigida a ferritina [P2]
6. `HOMA_IR` — `max: 2.5` citando Tietz; Tietz não publica corte de HOMA-IR; coortes brasileiras (BRAMS, ELSA-Brasil) publicam valores distintos (2.71–3.0) [P1/P2]
7. Ausência sistemática de variantes gestacionais (TSH, ferritina, hemoglobina, creatinina, D-dímero, glicose em DMG) [P3]
8. `sbd-diabetes-2024` e `sbpc-ml-2021` com marcadores `TODO` em `sources.ts` — ainda não validados em termos de edição, página e metadados ABNT [P2]
9. `sbem-thyroid-2013` tem 11 anos; consenso brasileiro atualizado (incluindo discussão de TSH em idosos) deve substituí-lo onde existir [P2]
10. `tietz-7ed-2015` é citado como fonte em 100/201 biomarcadores (~50%); adequado como fallback, mas muitos itens têm equivalente brasileiro disponível (hormônios, ferro, lipídios, enzimas hepáticas) [P2]

---

## 2. Achados detalhados

### 2.1 P1 — Precisão clínica

#### P1-01 `VitaminD`: limiar 30 ng/mL aplicado a toda população

- **Arquivo:** `packages/core/src/reference-ranges.ts:1478`
- **Código atual:** `default: { max: 100, min: 30, optimalMax: 70, optimalMin: 40, unit: 'ng/mL' }`, `source: 'sbem-vitamind-2014'`
- **Problema:** o consenso SBEM 2014 e o posicionamento conjunto SBEM/SBPC-ML de 2017–2018 adotam **dois limiares**:
  - ≥20 ng/mL — "desejável para população saudável" (adultos <60 anos sem fatores de risco)
  - ≥30 ng/mL — grupos de risco (gestantes, idosos ≥60, doença renal crônica, osteoporose, hiperparatireoidismo 2º)

  O valor `min: 30` classifica como "baixo" qualquer adulto saudável com vitamina D entre 20–29 ng/mL, o que não corresponde ao consenso brasileiro. Gera sobrediagnóstico e recomendações indevidas de suplementação em população geral.

- **Correção recomendada:** `min: 20` (default), com variante `ageMin: 60` → `min: 30`. Documentar explicitamente que gestantes, DRC, osteoporose têm limiar ≥30 no `source` ou em metadado adicional.
- **Fonte a citar:** Posicionamento SBEM/SBPC-ML 2017: Ferreira et al., _Arch Endocrinol Metab_, 61(6):527–542, 2017. DOI: 10.1590/2359-3997000000310.

#### P1-02 `HbA1c.min: 4.0` — pseudo-floor sem correspondente clínico

- **Arquivo:** `reference-ranges.ts:719`
- **Código atual:** `default: { max: 5.7, min: 4.0, optimalMax: 5.3, optimalMin: 4.5, unit: '%' }`
- **Problema:** valores de HbA1c <4.0% são incomuns mas não patológicos por si só — surgem em anemia hemolítica, perda sanguínea aguda, hemoglobinopatia, gestação. Definir `min: 4.0` cria flag "abaixo do normal" que sugere anormalidade ao invés de indicar a **condição** que baixa a HbA1c. A SBD 2024 não define piso de referência.
- **Correção:** `min: undefined` ou `min: 0`; manter `optimalMin: 4.5` como alvo fisiológico.

#### P1-03 `Glucose.min: 70` — hipoglicemia real é <54

- **Arquivo:** `reference-ranges.ts:704`
- **Problema:** 70 mg/dL é o "limiar de alerta" (Level 1 ADA/SBD) no contexto de diabético em tratamento. Para glicemia de jejum **em indivíduo não-diabético**, a distribuição de referência pode ir até 60 mg/dL sem patologia. Clinicamente acionável: <54 mg/dL (Level 2).
- **Correção:** `min: 54` e documentar no comentário; manter `optimalMin: 70`.

#### P1-04 `TSH.optimalMax: 2.5` aplicado a não-gestantes

- **Arquivo:** `reference-ranges.ts:1372`
- **Problema:** o alvo 2.5 mIU/L é **específico do 1º trimestre gestacional** (ATA 2017) e foi adotado como "alvo funcional" em literatura de medicina funcional sem respaldo de diretrizes para adultos não-gestantes. SBEM 2013 usa 0.4–4.0 sem recomendar 2.5 como ótimo.
- **Correção:** `optimalMax: 3.0` (ou manter `max` como `optimalMax` para evitar invenção de corte); adicionar variante gestacional trimestre-específica (0.1–2.5 no 1º tri, 0.2–3.0 no 2º/3º).

#### P1-05 `HOMA_IR.max: 2.5` com citação a Tietz

- **Arquivo:** `reference-ranges.ts:788`
- **Problema:** Tietz 7ª ed. não publica corte de HOMA-IR. Cortes publicados em população brasileira:
  - BRAMS (Geloneze et al., 2009, _Diabetol Metab Syndr_): percentil 90 = 2.71
  - ELSA-Brasil (Schmidt et al., 2015): variam por sexo e IMC
  - Vasques et al., 2009: 2.72 em amostra urbana brasileira
- **Correção:** atualizar `source` para `geloneze-brams-2009` (criar entrada no registry com DOI 10.1186/1758-5996-1-7) e ajustar `max` para 2.71.

#### P1-06 `Ferritin` — uso de Tietz em vez de WHO 2020

- **Arquivo:** `reference-ranges.ts:615`
- **Problema:** o registry já contém `who-iron-2020` (WHO guideline on use of ferritin concentrations to assess iron status) — documento **exclusivamente** sobre ferritina. A citação atual aponta Tietz, compêndio laboratorial generalista. Os cortes numéricos estão próximos mas a auditoria de fonte deve refletir a fonte mais específica e autoritária. Adicionalmente, WHO 2020 recomenda cortes distintos em contexto inflamatório (+70% se CRP elevada), o que não está modelado.
- **Correção:** `source: 'who-iron-2020'`; documentar em comentário que inflamação aguda eleva ferritina (WHO 2020 recomenda PCR concomitante para interpretar).

#### P1-07 `VLDL` — Friedewald como fonte de faixa

- **Arquivo:** `reference-ranges.ts:1493`
- **Problema:** `friedewald-1972` é a fórmula `LDL = CT − HDL − TG/5`; não publica intervalos de referência de VLDL. VLDL não possui corte clínico validado independentemente — seu uso é derivado (TG/5).
- **Correção:** trocar `source` para `sbc-lipids-2025` (que estabelece triglicérides <150 e, por derivação, VLDL <30). Ajustar comentário.

---

### 2.2 P2 — Qualidade de fonte

#### P2-01 `sbd-diabetes-2024` metadados incompletos

- **Arquivo:** `sources.ts:228` (marcador `TODO: Verificar edição exata e dados completos`)
- **Ação:** acessar `https://diretriz.diabetes.org.br/editorial/`, capturar título oficial, editores, edição, data de acesso; preencher DOI se houver.

#### P2-02 `sbpc-ml-2021` metadados incompletos

- **Arquivo:** `sources.ts:255` (`TODO: Verificar título exato e dados completos na biblioteca SBPC`)
- **Ação:** confirmar título exato ("Recomendações SBPC/ML — Boas Práticas em Laboratório Clínico", 2020, não 2021 — ver nota da revisão platform PR 367 que corrigiu o ano de 2021 para 2020 no conteúdo). Ajustar `key` se a edição for 2020.

#### P2-03 `sbem-thyroid-2013` obsoleta para uso genérico de TSH

- Consenso 2013 é sobre hipotireoidismo **subclínico**. Para citar faixa geral de TSH, o correto é:
  - Manual de Laboratório da SBEM (se publicado recentemente), ou
  - NACB 2003 (Demers & Spencer, _Thyroid_ 13:3–126), já amplamente citado em diretrizes
- **Ação:** adicionar `nacb-thyroid-2003` ao registry; migrar uso genérico de TSH para essa fonte; manter `sbem-thyroid-2013` apenas para achado de TSH subclinicamente elevado.

#### P2-04 `friedewald-1972` listada como fonte de faixa

- Ver P1-07. A entrada pode permanecer no registry como referência de **método** (LDL calculado), mas não deve aparecer no campo `source` de uma `BiomarkerRangeDefinition`.

#### P2-05 Sobre-dependência de `tietz-7ed-2015`

- 100/201 biomarcadores (~50%) citam Tietz. Adequado como fallback quando não há fonte brasileira, mas auditoria identifica substitutos disponíveis:
  - Hormônios reprodutivos (FSH, LH, Estradiol, Progesterona, Testosterona) → manuais SBEM ou laboratórios de referência brasileiros (Fleury, DASA)
  - Enzimas hepáticas (ALT, AST, GGT) → PNS-bioquímica 2019 já está no registry; não é usado
  - Eletrólitos (Sódio, Potássio, Cloreto, Cálcio) → PNS ou SBPC/ML
  - Vitaminas B (B1, B6, B12, Folato) → posicionamento SBEM ou valores estabelecidos pela IOM
- **Ação:** priorizar substituição em biomarcadores de alto tráfego (ALT, AST, GGT, FSH, LH, Estradiol, Testosterona, VitaminB12) em PR dedicado.

---

### 2.3 P3 — Lacunas estruturais de cobertura

#### P3-01 Ausência total de variantes gestacionais

Nenhum biomarcador em `reference-ranges.ts` modela gestação, apesar do tipo `ReferenceRangeContext` suportar extensão. Biomarcadores clinicamente relevantes na gestação:

| Biomarcador            | Efeito gestacional                             | Corte ajustado                                 |
| ---------------------- | ---------------------------------------------- | ---------------------------------------------- |
| TSH                    | Supressão fisiológica por hCG                  | 1º tri: 0.1–2.5; 2º/3º: 0.2–3.0                |
| Hemoglobina            | Hemodiluição                                   | ≥11 (1º, 3º tri); ≥10.5 (2º tri)               |
| Ferritina              | Queda fisiológica 2º/3º tri                    | <15 ng/mL sugere deficiência                   |
| Creatinina             | Hiperfiltração (↑ 40–50% GFR)                  | 0.4–0.8 mg/dL                                  |
| D-dímero               | Elevação progressiva (fibrinólise placentária) | Nenhum corte padronizado; usar cuidado clínico |
| Glicose jejum          | DMG: ≥92 mg/dL em jejum (IADPSG/SBD)           | Corte de doença é mais baixo que não-gestante  |
| Tireoglobulina/AntiTPO | Screening de alto risco materno                | Manter faixas de referência                    |

**Ação:** estender `RangeVariant` para incluir `pregnancyTrimester?: 1 | 2 | 3` ou criar estrutura paralela `pregnancyVariants`; iniciar pelos 4 biomarcadores de maior impacto (TSH, Hgb, Ferritina, Creatinina).

#### P3-02 Jejum / estado pós-prandial não-modelado

Triglicérides, glicose, insulina, peptídeo-C e lipídios em geral têm faixas distintas em jejum vs. pós-prandial. `BiomarkerReferenceRange` não expressa essa condição pré-analítica. A SBC 2017/2025 explicitou a aceitação de amostras não-jejum para perfil lipídico com cortes distintos (TG <175 não-jejum vs. <150 jejum).

**Ação:** adicionar metadado `fastingRequired: 'strict' | 'preferred' | 'not-required'` ou `variants` com `fastingState`.

#### P3-03 Raça/etnia — eGFR pós-2021

KDIGO 2024 removeu o coeficiente de raça da equação eGFR (CKD-EPI 2021). Verificar se a implementação atual (`reference-ranges.ts:549` e `packages/calculators`) aplica a equação de-indexada. Esta é lacuna de **implementação**, não apenas de faixa.

**Ação:** auditar `packages/calculators/src/egfr.ts` (se existir) contra CKD-EPI 2021 sem fator de raça.

#### P3-04 Pediátrico / geriátrico estendido

`ageMin` em variantes só é usado como corte "18 anos" ou "65 anos". Sem variantes:

- 0–17 anos: muitos biomarcadores têm faixas pediátricas distintas (ex.: CK neonatal muito superior, fósforo, fosfatase alcalina em crescimento)
- 80+ anos: GFR declina fisiologicamente, hemoglobina pode ser fisiologicamente menor

O repositório declara foco em adultos, então a omissão pode ser **intencional e válida**. Recomenda-se **documentação explícita** em README indicando que as faixas são válidas a partir de 18 anos, senão consumidores (ex.: plataforma) podem aplicar indevidamente.

#### P3-05 Contexto inflamatório

Ferritina, VHS, PCR ultrassensível, haptoglobina, ceruloplasmina — marcadores de fase aguda — têm interpretação modificada em inflamação. Não há campo para "contexto inflamatório" e tampouco co-dependência entre biomarcadores. Pragmático: documentar em comentário no código que PCR elevada recomenda reinterpretação de ferritina.

#### P3-06 Lp(a) — biomarcador crítico ausente?

Ver se `Lp_a` / `LipoproteinA` está definido. Lp(a) é pedra angular da estratificação cardiovascular pela SBC 2025 e diretriz europeia 2024, com corte >50 mg/dL = alto risco. Se ausente, é lacuna P3 (cobertura) que tangencia P1 (clínico).

**Ação:** confirmar presença; se ausente, adicionar com `source: 'sbc-lipids-2025'`.

---

### 2.4 P4 — Estilo / organização

#### P4-01 Comentários de seção fora de lugar

Em `reference-ranges.ts`:

- Linha 246 `// THYROID` precede `Omega6_AA`, `AA_EPA_Ratio`, `Arsenic`, `AST` — nenhum é tireoidiano.
- Linha 292 `// HEMATOLOGY - CBC` precede `Bicarbonate`, `BilirubinDirect` — hepatobiliar/ácido-base.
- Linha 767 `// INFLAMMATION` precede `Hgb`, `HOMA_IR`, `Homocysteine` — metabólico/hemograma.

Os biomarcadores estão ordenados alfabeticamente; os comentários de categoria foram preservados de um ordenamento anterior. Remover os comentários ou mover para uma estrutura real de agrupamento.

#### P4-02 `unit: ''` para razões — inconsistência?

Razões adimensionais usam `unit: ''` (ex.: `Albumin_Globulin_Ratio`, `BUN_Creatinine_Ratio`, `HOMA_IR`, `AA_EPA_Ratio`). Convenção UCUM permite `1` como placeholder explícito para adimensional. Documentar escolha no `types.ts` ou na documentação.

#### P4-03 `ApoCIII_ApoA1_Ratio` sem fonte, mas com corte numérico

Linha 241–243: comentário explicita "corte de 0.15 sem fonte publicada — valor calculado, não validado clinicamente". Honesto, mas o biomarcador ainda é exposto como faixa de referência. Opção: (a) omitir o biomarcador até que exista fonte; (b) tipar como `status: 'experimental'` para o consumidor filtrar.

---

## 3. Consistência cruzada com `Precisa-Saude/platform`

Auditoria cruzada entre `biomarkerRangeDefinitions` aqui e `packages/content/biomarkers/tests/*.md` na plataforma:

| Biomarcador | fhir-brasil                               | platform (conteúdo)                                             | Avaliação                                                                                           |
| ----------- | ----------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| LDL         | default 0–100 lower-better, SBC 2025      | metas por risco (SBC 2019): <100/<70/<50                        | Consistente se consumidor aplicar lógica de risco                                                   |
| HDL         | M 40–60, F 50–60, SBC 2025                | enfatiza cutoff sexo-específico                                 | **Alinhado**                                                                                        |
| HbA1c       | 4.0–5.7%, SBD 2024                        | <5.7 normal, 5.7–6.4 pré-DM, ≥6.5 DM                            | **Alinhado** no topo; `min: 4.0` problemático (P1-02)                                               |
| Glucose     | 70–100                                    | 70–99 jejum                                                     | Diferença trivial (1 mg/dL); `min: 70` problemático (P1-03)                                         |
| Vitamin D   | 30–100, SBEM 2014                         | deficiência <20, suficiência ≥30                                | **Parcial** — plataforma cita 20 como limiar de deficiência; fhir-brasil usa 30 como mínimo (P1-01) |
| TSH         | 0.4–4.0, ótimo até 2.5 (age 65+: até 6.0) | plataforma não sampleada em profundidade                        | **Revisar** `optimalMax: 2.5` (P1-04)                                                               |
| Ferritin    | M 20–250, F 10–120 (18–50), tietz         | plataforma aponta <30 como deficiência em mulheres menstruantes | **Parcial** — fhir-brasil `min: 10` permite subdiagnóstico (P1-06)                                  |
| Creatinine  | M 0.7–1.3, F 0.5–1.1, PNS                 | plataforma alinhada                                             | **Alinhado**                                                                                        |
| ApoB        | 0–90, lower-better, SBC 2025              | plataforma tem "mais precisa que LDL" (P1 corrigido em PR 369)  | **Alinhado** após correção da plataforma                                                            |

Sem disagreements numéricos graves entre os dois repositórios nos biomarcadores de maior tráfego. Principais lacunas são **comuns aos dois** (vitamina D single-threshold, ferritina em mulheres pré-menopausa).

---

## 4. Plano de remediação sugerido

Segue o padrão PRE-189 da plataforma (PRs sequenciais, cada um com 2 rodadas de revisão automática antes de merge):

### PR A — P1 correções clínicas críticas

- VitaminD, HbA1c, Glucose, TSH, HOMA_IR, Ferritin, VLDL (7 correções numéricas/de fonte)
- Novas entradas no `SOURCE_REGISTRY`:
  - `ferreira-vitd-2017` (posicionamento SBEM/SBPC-ML)
  - `geloneze-brams-2009` (HOMA-IR Brasil)
  - `nacb-thyroid-2003` (TSH geral)
- Atualização de testes em `packages/core/src/__tests__/reference-ranges.test.ts` para refletir novos cortes

### PR B — Metadados de fonte pendentes

- Verificar e preencher `sbd-diabetes-2024` (edição, título, URL específica, data de acesso)
- Verificar e corrigir `sbpc-ml-2021` → possivelmente `sbpc-ml-2020` (ano correto conforme PR 367 da plataforma)
- Adicionar DOI onde ausente (auditar toda `SOURCE_REGISTRY`)

### PR C — Gestação e jejum

- Estender `RangeVariant` com `pregnancyTrimester?: 1 | 2 | 3`
- Adicionar variantes para TSH, Hgb, Ferritina, Creatinina, Glucose
- Metadado `fastingRequired` em `BiomarkerReferenceRange`

### PR D — Redução de dependência de Tietz

- Substituir fonte em hormônios reprodutivos, enzimas hepáticas, eletrólitos onde exista equivalente brasileiro
- Não é alteração numérica obrigatória — trocar fonte sem mudar cortes é aceitável quando o corte já vinha de consenso brasileiro informal

### PR E — P3/P4 lacunas e estilo

- Auditar `Lp(a)` e adicionar se ausente
- Reorganizar ou remover comentários de seção desatualizados
- Documentar escolha `unit: ''` vs. `unit: '1'` em `types.ts`
- Documentar em README que faixas são válidas para adultos (≥18 anos)

### PR F (se aplicável) — `packages/calculators`

- Auditoria paralela: confirmar CKD-EPI 2021 sem fator de raça em eGFR; revisar PhenoAge (já auditado na plataforma); revisar HOMA-IR com novo corte BRAMS.

---

## 5. Fora de escopo

- **`biomarkers.ts`** (definições LOINC, unidades, aliases): aparenta consistência com o `units.ts`; auditoria completa é outro documento, não este.
- **`packages/rnds`**: cliente HTTP, sem conteúdo clínico.
- **`packages/ocr-utils`**: utilitários de extração, sem conteúdo clínico.
- **Revisão formal de LGPD/ANVISA**: não aplicável a repositório de tipos/dados abertos.

---

## 6. Como verificar

- Cada PR deve passar `pnpm turbo run lint test typecheck` em todos os pacotes afetados.
- Os testes em `reference-ranges.test.ts` devem falhar antes da correção (teste de regressão) e passar após.
- Para cada mudança de fonte: confirmar que a nova chave existe em `SOURCE_REGISTRY` e tem DOI/URL verificáveis.
- Para cada mudança numérica clínica: citar no commit a publicação específica (PMID ou DOI) que justifica o novo corte.

---

## Apêndice — Metodologia

- Inventário dos 201 biomarcadores via leitura direta de `reference-ranges.ts` (2036 linhas) e grepping para padrões críticos.
- Cruzamento com `SOURCE_REGISTRY` em `sources.ts` para detectar fontes órfãs (não usadas) e citações quebradas (usadas, não registradas — nenhuma detectada).
- Cross-check numérico com 10 biomarcadores de maior tráfego no repositório `Precisa-Saude/platform` (`packages/content/biomarkers/tests/*.md`).
- Julgamento clínico aplicado com base em: diretrizes SBC 2017/2025, SBD 2024, SBEM 2013/2014/2017 posicionamentos, KDIGO 2024, WHO (ferro 2020, osteoporose 1994), NACB (tireoide 2003, tumor markers 2008), e ADA/EASD para DMG.
- Nenhum achado P0: a biblioteca não contém erro clínico que leve a dano imediato. P1 são sobrediagnósticos e sub-utilização de fontes brasileiras existentes; P2/P3 são falhas de citação e cobertura.
