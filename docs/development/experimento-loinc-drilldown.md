# Experimento: drill-down LOINC com busca por eixos e escolhedor de decisão

> Medição feita em 08/10/2026 para [PRE-488](https://linear.app/precisa-saude/issue/PRE-488).
> Script: [`scripts/loinc-drilldown.ts`](../../scripts/loinc-drilldown.ts).
> Resultados item a item da rodada final:
> [`experimento-loinc-drilldown.resultados.json`](./experimento-loinc-drilldown.resultados.json).

## Pergunta

Um codificador humano acha o código LOINC no SearchLOINC por palavra-chave e
filtros de eixo (componente, propriedade, sistema, escala, método). Dá para
reproduzir esse fluxo por programa e, na etapa final, deixar um modelo de
decisão escolher entre os candidatos? E o que isso muda no mapeamento do
catálogo?

A dúvida nasceu da revisão do crosswalk SIGTAP de 06/10/2026
([datasus-sdk#24](https://github.com/Precisa-Saude/datasus-sdk/issues/24)): quatro
erros de eixo no nosso próprio catálogo (BUN no lugar de ureia, magnésio
eritrocitário no lugar do sérico, T3 livre no lugar do total, zinco em sangue
total no lugar do sérico), todos visíveis assim que os candidatos são filtrados
por sistema e propriedade.

## Conjunto de referência

Os 191 biomarcadores do `@precisa-saude/fhir` 0.38.3 que têm código LOINC, com
nome em português, nome em inglês, unidade e categoria. O código fica escondido
e o pipeline tenta recuperá-lo. Nenhum dado de paciente entra: só nomes e
unidades do catálogo.

## Desenho

1. **Recuperação (determinística).** Busca na LOINC Search API oficial
   (`loinc.regenstrief.org/searchapi`, conta gratuita): nome em inglês com
   cláusulas de eixo (`system:"Ser/Plas" property:MCnc status:ACTIVE`), nome em
   inglês solto com 300 linhas, nome em português com `language=11`, e, quando
   sobra pouco, busca por Part de componente (`/searchapi/parts`). A unidade dá a
   propriedade (mg/dL é MCnc, mmol/L é SCnc, U/L é CCnc, % é fração), a categoria
   e o nome dão o sistema (urina, sangue, hemácias, soro/plasma).
2. **Filtro e ordenação (determinísticos).** Status ACTIVE, sistema e
   propriedade compatíveis, classes de desafio e painel fora. Ordenação pelo
   conceito base, pelo método padrão da classe quando o laudo não imprime método
   e por `COMMON_TEST_RANK` como desempate. Ficam os 15 primeiros.
3. **Escolha.** Dois escolhedores sobre a mesma lista: uma regra (o primeiro da
   ordenação) e o Jev 1.13, modelo de decisão da TypeSafe servido pelo OpenRouter
   (`/api/alpha/decisions`), que recebe o exame como `state`, os candidatos como
   `criteria` de uma pergunta `choice` mais a opção NONE, e devolve a alternativa
   com o vetor de probabilidades, sem gerar texto. Uma variante composta, com uma
   pergunta por eixo, também foi medida.

## O que a série mostrou

| Rodada | Recuperação                                                         | Código entre os 15 | Jev acerta, código presente | Acerto fim a fim |
| ------ | ------------------------------------------------------------------- | ------------------ | --------------------------- | ---------------- |
| 1      | FHIR `$expand`, Ontoserver, português primeiro                      | 52%                | 87%                         | 46%              |
| 2      | FHIR `$expand`, servidor da HL7, inglês primeiro                    | 48%                | 81%                         | 39%              |
| 4      | LOINC Search API, consulta simples                                  | 85%                | 80%                         | 68%              |
| 5      | + cláusulas de eixo no servidor                                     | 87%                | 81%                         | 71%              |
| 6      | + rótulos de eixo em português normalizados                         | 91%                | 80%                         | 72%              |
| 7      | + todos os aliases, Parts, método padrão da classe                  | 93%                | 90%                         | 83%              |
| 8      | + variantes sem hífen, consulta por alias, `RBC.lysate` no conjunto | 95%                | 91%                         | 86%              |

Fim a fim é a fração dos 191 em que o código escolhido pelo Jev é o do
catálogo. A rodada 3 foi a variante composta (uma pergunta por eixo): 75% com
o código presente, confiança não monótona e sem opção de abstenção. Foi
descartada.

### A recuperação é o gargalo, não o escolhedor

Com o código presente na lista, o Jev acerta entre 80% e 91% em todas as
rodadas, e acerta 94% quando se contam como certas as variantes que diferem só
no método. A escolha nunca mudou de patamar; o que mudou foi a busca.

O filtro de texto do `$expand` FHIR casa só com o nome de exibição. "PSA",
"Anti-TPO" e "HDL Cholesterol" não devolvem nada, porque os casamentos estão
nos related names do LOINC. A Search API indexa esses nomes, aceita português
(`language=11`: "creatinina" devolve 1.550 resultados onde o `$expand` devolvia
zero) e aceita as cláusulas de eixo na própria consulta, que é o gesto do
codificador no SearchLOINC.

### O método é política de catálogo, não erro de modelo

Nas rodadas 4 a 6, 23 das 27 escolhas erradas do Jev diferiam do catálogo só
no eixo de método: o catálogo guarda "by Automated count" para o hemograma e
"by Test strip" para a urina tipo I, e o prompt pedia o conceito base sem
método. Nada declarava a convenção. Escrevê-la como padrão por classe
(rascunho em [PRE-473](https://linear.app/precisa-saude/issue/PRE-473)) e
aplicá-la à ordenação e ao prompt transformou 30 erros em acertos de uma vez.

Dois casos de borda sobraram: reticulócitos, em que o catálogo guarda o código
sem método (4679-7) e o padrão da classe favorece "by Automated count", e tempo
de protrombina, em que as variantes em plasma e em sangue receberam a mesma
marca de padrão. O refinamento proposto é deixar o `COMMON_TEST_RANK` escolher
quando as duas variantes existem.

### Confiança como roteamento

Na rodada 8, as 74 propostas com confiança igual ou acima de 0,95 estavam todas
certas. Entre 0,85 e 0,95, 42 de 47. Abaixo de 0,85 a taxa cai para perto de
60%, e o NONE aparece em 53% a 86% dos casos em que o código não está na lista.
Isso define o roteamento de um fluxo de proposta: acima de 0,95 entra como
proposta com os irmãos rejeitados anexados, entre 0,85 e 0,95 o revisor
confirma, abaixo disso volta para a busca ou vai para a fila manual. O vetor de
probabilidades é o registro de decisão que
[PRE-476](https://linear.app/precisa-saude/issue/PRE-476) pede: irmãos
rejeitados com pontuação.

### O que ficou de fora

Oito dos 191 na rodada final. Três eram vocabulário do catálogo, corrigidos em
[fhir-brasil#146](https://github.com/Precisa-Saude/fhir-brasil/pull/146):
HOMA-IR é "Homeostasis model assessment" no LOINC, e os totais de ômega-3 e
ômega-6 são "Omega 3 fatty acids (w3)" e "Omega 6 fatty acids (w6)", sem hífen
e sem "total". Dois são códigos de subpartícula de LDL (padrão e tamanho de
pico), nicho de RMN. Três são medidas de composição corporal do DEXA que a
ordenação deixa fora dos 15.

Custo da rodada final: US$ 0,006 em 191 decisões, cerca de 0,85 segundo cada.

## Rodada 9: política de método de PRE-473, rank informativo (08/10/2026)

Com a política de PRE-473 confirmada, a ordenação passou a seguir o padrão da
classe quando o laudo não imprime método (hemograma: contagem automatizada;
urina tipo I: tira, sedimento: microscopia; coagulação: ensaio de coagulação;
demais classes: conceito base). O `COMMON_TEST_RANK` foi testado primeiro como
desempate entre irmãs do mesmo componente, sistema e propriedade, e contradisse
o catálogo em onze entradas e o próprio LDL da especificação (2089-1 contra
13457-7), sem ganho de acerto. Ficou informativo: a irmã mais usada ganha uma
marca no prompt do escolhedor e no registro de decisão, e entra numa fila de
revisão em vez de reordenar a lista. Rodada feita com
`scripts/loinc-drilldown.ts` sobre o catálogo 0.38.4, que já tem os aliases de
[fhir-brasil#146](https://github.com/Precisa-Saude/fhir-brasil/pull/146).

|                                 | Rodada 8         | Rodada 9                     |
| ------------------------------- | ---------------- | ---------------------------- |
| Código entre os 15 candidatos   | 95,3%            | 97,4%                        |
| recall@1 / @5                   | 74% / 92%        | 75% / 94%                    |
| Regra acerta, código presente   | 71%              | 77%                          |
| Jev acerta, código presente     | 90,7%            | 90,3% (94,6% contando irmãs) |
| Acerto fim a fim                | 86,4%            | 88,0% (168 de 191)           |
| Propostas com confiança >= 0,95 | 74, todas certas | 79, todas certas             |
| Propostas entre 0,85 e 0,95     | 47, 42 certas    | 36, 33 certas                |

A fila de revisão que o rank produz, mesmo sem decidir, tem doze entradas em
que o LOINC diz que a irmã é a mais usada e o catálogo guarda outra, às vezes
de propósito. Está em [PRE-473](https://linear.app/precisa-saude/issue/PRE-473):

| Biomarcador                         | Catálogo                             | Irmã mais usada                                          |
| ----------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| Reticulócitos                       | 4679-7, sem método (rank 745)        | 17849-1, contagem automatizada (425)                     |
| VHS                                 | 30341-2, sem método (280)            | 4537-7, Westergren (164)                                 |
| Gliadina desamidada IgA             | 63453-5, imunoensaio (3.600)         | 58709-7, sem método (2.734)                              |
| Proteína na urina                   | 5804-0, tira (171)                   | 50561-0, tira automatizada (138)                         |
| Troponina I                         | 49563-0, limite de detecção (2.157)  | 10839-9, sem método (107)                                |
| Troponina T                         | 6598-7, sem método (604)             | 67151-1, alta sensibilidade (371)                        |
| D-dímero                            | 48065-7, FEU (583)                   | 48058-2, DDU (267)                                       |
| LDH                                 | 14804-9, lactato para piruvato (526) | 14805-6, piruvato para lactato (427)                     |
| eGFR                                | 98979-8, CKD-EPI 2021 (sem rank)     | 48643-1, MDRD (48)                                       |
| Microalbumina na urina              | 14957-5, limite de detecção (307)    | 1754-1, sem método (272)                                 |
| Densidade e urobilinogênio na urina | 5811-5 e 20405-7, tira (144, 374)    | 2965-2 sem método (94) e 50563-6 tira automatizada (143) |

Por que o rank não decide: o conjunto de referência é o próprio catálogo, e
uma regra que sobrepõe decisões do catálogo não tem contra o que ser validada.
Quando uma entrada da fila for revisada e o catálogo mudar, o ouro muda com
ela.

O teste do rank como desempate também pôs LDL e globulina na fila (13457-7
calculado, rank 76, contra 2089-1, rank 263; 10834-0 calculada, rank 160,
contra 2336-6, rank 214). No desenho informativo as duas variantes calculadas
ficam fora dos 15 pela penalidade de método, então não aparecem acima, mas o
conflito do LDL com a própria especificação de PRE-473 (2089-1 quando o laudo
não diz) continua a ser uma decisão pendente.

## Rodada 10: testes locais de produção, só pelo nome impresso (08/10/2026)

As rodadas anteriores escondiam o código de uma entrada do catálogo e davam ao
pipeline os nomes do próprio catálogo, em inglês e em português. Esta rodada
troca a entrada pela saída da auditoria de testes locais de
[PRE-486](https://linear.app/precisa-saude/issue/PRE-486) (`audit-testes-locais.ts
--json`, produção, 07/10/2026): 2.126 testes locais de 42 laboratórios, cada um
com o nome impresso no laudo, a unidade, o espécime quando impresso e o código
que a plataforma guardou. Sem pacientes: a auditoria sai agregada por
laboratório. Agrupados por nome, unidade, espécime e código, viram 1.040 alvos;
cada alvo recebe só o que o laudo imprime, em português. Em 701 alvos (1.756
testes) a plataforma guardou um código, e o acerto é medido contra ele; os
outros 339 alvos (370 testes) não têm código nenhum, 257 deles sem âncora no
catálogo (`UNKNOWN_*`), e são o conjunto para o qual o caminho de proposta
existe: nesta rodada só recebem a lista de candidatos. Só busca e regra, sem
Jev (`--testes-locais`, `--sem-jev`). Resultado por alvo em
`experimento-loinc-drilldown.testes-locais.json`.

Três coisas tiveram de mudar no script para a condição ser honesta, e duas
delas vieram de defeitos que a rodada expôs:

- **Cláusulas de eixo em português.** Com `language=11`, a cláusula `system:`
  da Search API só casa com o rótulo traduzido (`"SgTotal"`, não `"Bld"`); a
  propriedade e o status continuam em inglês. O script passa a montar a
  cláusula com o rótulo traduzido aprendido e, para unidade ambígua (`%`: MFr,
  NFr, VFr), sai sem cláusula de propriedade, porque em português não há
  consulta solta em inglês para compensar. Os candidatos filtrados são
  trocados pelo registro em inglês numa chamada por lote (`713-8 OR 26450-7
OR ...`), que também ensina os pares de rótulo de sistema e de método
  (`--rotulos`). Sem isso, "Contagem automática" não casava com a política de
  método da classe.
- **O mapa de rótulos se envenenava.** A variante pt-BR do LOINC tem linhas
  com eixo trocado; um par "MCnc → PrThr" aprendido de uma linha dessas
  retraduzia todos os MCnc corretos e os tirava do filtro estrito, e
  "Cholesterol in LDL [Percentile]" passava à frente do colesterol total. Um
  rótulo que já é inglês conhecido nunca mais vira chave de tradução.
- **Empate entre sangue e soro/plasma decidido pelo tamanho do nome.** "Glucose
  in Blood" ganhava de "Glucose in Serum or Plasma" por ser mais curto. A
  ordem da lista de sistemas que a categoria implica virou desempate, e
  coagulação ganhou lista própria com plasma pobre em plaquetas primeiro. No
  conjunto-ouro do catálogo, a regra sobe de 143 para 155 acertos em 191
  (74,9% → 81,2%), com recuperação idêntica (97,4%); as duas perdas restantes
  (globulina para IgA, Lp(a) para a variante molar) são deriva de componente,
  que a regra não enxerga e o escolhedor resolve.

O que a rodada mediu nos alvos com código guardado, por alvo e ponderado
pelos testes locais que cada alvo agrupa:

|                                  | Alvos (701)     | Testes locais (1.756) |
| -------------------------------- | --------------- | --------------------- |
| Código guardado no pool da busca | 68,3%           | 77,2%                 |
| Código entre os 15 candidatos    | 64,5%           | 74,7%                 |
| Regra acerta (@1)                | 56,3%           | 66,2%                 |
| Regra acerta, código presente    | 87,4% (395/452) | —                     |
| Nome não encontrado em português | 31,7%           | 22,8%                 |
| No pool, fora dos 15             | 3,9%            | 2,4%                  |
| Entre os 15, regra errou         | 8,1%            | 8,5%                  |

Dois terços das perdas são o nome que a busca em português não encontra, e a
leitura disso depende do que o campo "nome impresso" da auditoria contém, que
não é sempre o que o laboratório imprimiu:

| Tipo de nome (alvos com código) | Alvos | Testes | No pool | Entre os 15 | Regra @1 | Regra, presente |
| ------------------------------- | ----- | ------ | ------- | ----------- | -------- | --------------- |
| Só ASCII (inglês ou sigla)      | 424   | 889    | 66,0%   | 62,0%       | 52,6%    | 84,8%           |
| Igual ao código do catálogo     | 193   | 643    | 79,3%   | 74,6%       | 68,4%    | 91,7%           |
| Português com acento            | 84    | 224    | 54,8%   | 53,6%       | 47,6%    | 88,9%           |
| Fora composição corporal (DEXA) | 666   | 1.703  | 69,8%   | 65,8%       | 58,6%    | 89,0%           |

- **Só 84 alvos com código (224 testes) têm nome em português com acento**, a
  condição que esta rodada existia para medir. Os outros trazem o código do
  catálogo como nome (193: o parser ou a importação gravou `VitaminB12`,
  `TScore_Total`, `HOMA_IR`), ou um nome em inglês ou sigla (424: laudos
  estrangeiros, importação FHIR e Apple Health, e siglas como `HCM`, `VCM`,
  `RDW`). A busca em português com `language=11` não indexa o inglês, e a
  composição corporal (DEXA, 35 alvos com código) não tem variante pt-BR: 5
  acertos. O campo `biomarkerName` da auditoria merece uma nota em PRE-486.
- **No português de verdade, a variante pt-BR do LOINC não conhece a grafia
  do laudo em 37 de 83 alvos** fora DEXA: "Triglicerídeos", "Ácido Úrico",
  "Transaminase oxalacética" e as cinco grafias de TGO/TGP, "Hemácias",
  "Leucócitos totais", "Filtração Glomerular Estimada", "Coeficiente de
  Variação do Volume Eritrocitário" (RDW). O LOINC traduz o componente
  ("Urato", "Aspartato aminotransferase"), não o jargão de bancada. É o
  mesmo buraco que a tabela de grafias da ancoragem já cobre, e a razão de o
  caminho de produção dar ao pipeline os aliases em inglês do biomarcador
  âncora (`--com-aliases`, próxima rodada).
- **Quando o nome é encontrado, a regra acerta 87% a 92%**, acima dos 82% do
  conjunto-ouro, porque os nomes impressos são os exames comuns. Os erros que
  sobram são políticas, não busca: hemoglobina perde para CHCM (786-4, contagem
  automatizada, pela regra da classe HEM/BC e por `g/dL` admitir EntMCnc),
  VLDL guardado como calculado (13458-5) cai para a posição 11 a 14 pela
  penalidade de método, LDL e colesterol total perdem para "non HDL"
  (43396-1), ureia perde para ureia-nitrogênio (3094-0), tira de urina perde
  para a variante `[Presence]`. Todos entram na fila de PRE-473 ao lado das
  doze entradas da rodada 9.
- **A auditoria carrega âncoras erradas que a busca acusou de graça:**
  "Mielócitos" → Basophils, "Metamielócitos" → Eosinophils e → Monocytes,
  "Hormônio Tiroestimulante" → T4Free, "Corpos Cetônicos" →
  BetaHydroxybutyrate, "Cálcio ionizado" → Calcium, "CAPACIDADE TOTAL DE
  COMBINAÇÃO DO FERRO" → Iron, "Glicemia estimada média" → Glucose. São
  casos para o grupo 3 de PRE-486 (unidade e nome contra o código), não para
  esta rodada.

A Search API devolveu um 429 em 1.040 alvos com três trabalhadores, repetido
à mão; dois trabalhadores não disparam limite.

## Rodada 11: os mesmos testes locais pelo caminho de produção, com Jev (08/10/2026)

Mesmos 1.040 alvos, agora como a produção os veria: a ancoragem acontece antes
de qualquer código, então cada alvo recebe, além do nome impresso, os nomes em
inglês do biomarcador âncora do catálogo (`--com-aliases`), e o Jev 1.13
escolhe entre os 15 candidatos. Os 257 alvos sem âncora (`UNKNOWN_*`)
continuam só com o nome impresso. Custo do Jev: US$ 0,03 para 1.040 decisões.
Resultado por alvo em `experimento-loinc-drilldown.testes-locais-aliases.json`.

|                                 | Rodada 10 (só nome impresso) | Rodada 11 (aliases da âncora) |
| ------------------------------- | ---------------------------- | ----------------------------- |
| Alvos com código guardado       | 701 (1.756 testes)           | 701 (1.756 testes)            |
| Código no pool da busca         | 68,3%                        | 98,6%                         |
| Código entre os 15 candidatos   | 64,5% (74,7% dos testes)     | 93,9% (96,1% dos testes)      |
| Regra acerta (@1)               | 56,3%                        | 81,2%                         |
| Jev acerta, código presente     | —                            | 88,8% (584/658)               |
| Jev acerta, fim a fim           | —                            | 83,3% (87,4% dos testes)      |
| Jev abstém com código ausente   | —                            | 17 de 43                      |
| Propostas com confiança >= 0,95 | —                            | 313, 310 exatas (99,0%)       |
| Propostas entre 0,85 e 0,95     | —                            | 165, 155 exatas (93,9%)       |
| Propostas abaixo de 0,85        | —                            | 189, 119 exatas (63,0%)       |

- **Os aliases da âncora fecham a recuperação.** O código guardado entra no
  pool em 98,6% dos alvos e na lista em 93,9%, contra 64,5% só pelo nome
  impresso: o buraco da rodada 10 era a grafia, não o LOINC. A regra sobe de
  56% para 81%, igual ao conjunto-ouro.
- **O roteamento por confiança se sustenta em produção.** Das 313 propostas
  com confiança >= 0,95 (844 testes), 310 batem com o código guardado, e as
  três que não batem são a favor do Jev ou da fila de PRE-473: "T4 libre
  (Tiroxina libre)" guardado como T4 total (3026-2) e proposto como T4 livre
  (3024-7); "Reticulocyte Count" guardado sem método (4679-7) e proposto com
  contagem automatizada (60474-4), a entrada da fila da rodada 9;
  "Testosterone Free" guardado em massa (2991-8) e proposto em molar
  (14914-6). Entre 0,85 e 0,95, 94% batem. Abaixo de 0,85 cai para 63%, que
  é onde o roteamento manda procurar de novo.
- **Os erros do Jev abaixo de 0,95 são quase todos decisões de catálogo, não
  de busca.** Glicose em sangue (2339-0) contra soro/plasma (2345-7), em
  confiança 0,46 a 0,61; VLDL base (2091-7) contra o calculado guardado
  (13458-5); 25-hidroxivitamina D: 1989-3 guardado contra 62292-8 (D2+D3)
  proposto em sete grafias, confiança 0,65 a 0,91, a mesma troca que a
  revisão do datasus-sdk fez em 06/10; cetonas e glicose na urina, tira
  contra `[Presence]`. E dois acertos do Jev contra o código guardado: "Urea"
  guardado como ureia-nitrogênio (3094-0) e proposto como ureia (3091-6), e
  o T4 acima. Vão para PRE-473 (política) e PRE-486 (âncoras).
- **Para os 339 alvos sem código, a proposta ainda é rara: 66.** 218 não
  recebem candidato algum, porque 171 são composição corporal e
  bioimpedância (massa gorda por segmento, ângulo de fase, água corporal,
  gasto energético) e painéis de IgE, que a busca em português não encontra
  e para os quais não há âncora com aliases; 55 recebem NONE. Das 66
  propostas, 16 estão acima de 0,95 (colesterol total, ureia-nitrogênio,
  TFG por MDRD nas duas populações, magnésio, PCR, PSA, albumina/globulina,
  reticulócitos em %, albumina na urina, FAN por imunofluorescência,
  anti-HCV, tireoglobulina) e são propostas corretas pela leitura dos nomes.
  O caminho de proposta serve ao exame sem âncora que tem nome de bancada;
  para DEXA e bioimpedância, o catálogo precisa de aliases antes.

## Consistência do escolhedor e rodada 12 (09/10/2026)

**Repetições sobre a lista fixa.** Para separar a variância do Jev da
variância da Search API (cuja ordem no corte de linhas não é estável), o
script ganhou `--replay`, que reaproveita as listas de candidatos de uma
corrida anterior, e `--repetir N`, que pergunta N vezes sobre a mesma lista.
Dez repetições por alvo, sobre as listas da rodada de 08/10 no conjunto-ouro e
da rodada 11 nos testes locais:

| Confiança da primeira resposta | Ouro: alvos, unânimes 10/10 | Produção: alvos, unânimes 10/10 | Produção: primeira bate com o guardado |
| ------------------------------ | --------------------------- | ------------------------------- | -------------------------------------- |
| >= 0,95                        | 82, 100%                    | 319, 100%                       | 99,1%                                  |
| 0,85 a 0,95                    | 41, 100%                    | 158, 100%                       | 94,3%                                  |
| 0,60 a 0,85                    | 35, 100%                    | 97, 100%                        | 62,9%                                  |
| < 0,60                         | 23, 73,9%                   | 94, 74,5%                       | 58,5%                                  |

Acima de 0,60 a escolha é estável, certa ou errada; a moda das repetições
corrigiu 0 de 20 erros no ouro e 3 de 77 na produção. Votação por maioria não
acrescenta nada: o sinal de roteamento é a confiança, e abaixo de 0,60 o
modelo está de fato indeciso (Lp(a) e glicose na urina dividem cinco a cinco).
A faixa de 0,60 a 0,85 na produção é baixa por dado guardado defasado: as 16
grafias de vitamina D guardadas como 1989-3, onde o Jev escolhe 62292-8 por
unanimidade, que é o que o catálogo já usa.

**Mudanças da rodada 12.**

- **Urina tipo I qualitativa.** Cetonas, glicose e proteína na urina passam a
  `[Presence] by Test strip` (2514-8, 25428-4, 20454-5): o EAS brasileiro
  imprime Negativo, Traços ou cruzes, resultado ordinal. Os códigos em massa
  por volume (5797-6, 5792-7, 5804-0) ficam como alias para laudo que imprima
  o número. Registro de decisão e snapshot atualizados.
- **Método impresso é vinculante.** O método que o laudo imprime vai ao
  estado do escolhedor, e um candidato com esse método vence na regra e no
  prompt. Na produção, 28 testes locais trazem método; com ele, o Jev escolhe
  HbA1c por HPLC (17856-6) e LDL calculado (13457-7) em confiança >= 0,99,
  contra os códigos sem método que o catálogo guarda.
- **Conceito que só existe como cálculo.** VLDL e TFG estimada ficam com o
  código calculado mesmo quando o LOINC tem a variante medida, desde que o
  próprio alvo seja esse conceito (o VLDL calculado não sobe na lista do LDL).
- **"RBC" sozinho é contagem de hemácias**, não analito dosado na hemácia; o
  filtro de sistema tirava 789-8 da lista em 13 testes.

| Rodada 12                               | Ouro (191) | Produção, alvos com código (705, 1.756 testes) |
| --------------------------------------- | ---------- | ---------------------------------------------- |
| Código no pool                          | 99,0%      | 98,6%                                          |
| Código entre os 15                      | 97,4%      | 94,2%                                          |
| Regra acerta (@1)                       | 83,2%      | 81,4%                                          |
| Jev bate com o guardado ou o catálogo   | 87,4%      | 85,1% dos alvos, 91,2% dos testes              |
| Propostas com confiança >= 0,95, exatas | 98 de 98   | 363 de 367                                     |
| Escolha unânime em três repetições      | 97,4%      | 98,7%                                          |

Na produção o acerto é medido contra o código guardado ou o código atual do
catálogo, porque vitamina D e as tiras de urina mudaram de código depois que
as observações foram gravadas. O que sobra é, na maior parte, decisão de
política (Lp(a), urobilinogênio, tempo de protrombina, ácidos graxos, método
impresso contra código do catálogo), âncora errada para
[PRE-486](https://linear.app/precisa-saude/issue/PRE-486) e falta de alias
(DEXA, bioimpedância, RDW por extenso). A dica de espécime para glicose e INR,
que o Jev ainda põe em sangue total com confiança abaixo de 0,65, não entrou
nesta rodada.

## Consequências para o pipeline

- **Nada muda na extração por laudo.** OCR, ancoragem determinística na tabela
  de grafias, `filteredReference` e extração de valores em região continuam
  como estão. Laudo de paciente carrega nome e CPF e não sai de `sa-east-1`;
  nem a Search API nem o Jev entram nesse caminho.
- **Nasce um caminho de proposta para o que o catálogo ainda não tem.** É o
  item 2 de [PRE-486](https://linear.app/precisa-saude/issue/PRE-486),
  "candidatos vindos do LOINC, e não da nossa lista", medido de ponta a ponta:
  para cada teste local sem código revisado, busca com cláusulas de eixo,
  filtro e ordenação determinísticos, Jev escolhe com confiança, roteamento,
  revisor assina. Dois em cada três testes recebem proposta certa sem
  intervenção; quase todos os demais recebem uma lista curta correta.
- **O filtro de propriedade é a escolha de código pela unidade** que o grupo 3
  de PRE-486 pede. A mesma tabela pode rodar na ancoragem, em região, para
  acusar uma âncora cuja unidade impressa contradiz a propriedade do código.
- **A leitura da sala de Colônia vale aqui.** "O modelo escolhe de uma lista"
  foi ouvido como "o modelo codifica". O desenho acima é honesto com a outra
  leitura: a busca determinística produz a lista, o modelo ordena e diz quando
  não sabe, e um revisor assina. O código nunca vem do modelo.

## Trabalho anterior

- Agente LLM em laço com a LOINC Search API, 151 exames alemães: top-1 85,4%,
  top-5 98,0% (BIS 2026,
  [Springer](https://link.springer.com/chapter/10.1007/978-3-032-26363-6_17)).
  É o resultado que a rodada 8 alcança, com laço determinístico em vez de LLM.
- LabBridge, recuperação híbrida com a estrutura da ontologia e seleção
  restrita por LLM, chinês e inglês: 81% a 90%; RAG puro caiu a 49% em chinês
  (JMIR 2026, [doi:10.2196/92499](https://doi.org/10.2196/92499)).
- Chatbots sem recuperação: 58% de acerto completo no melhor caso (Int J Med
  Inform 2026,
  [doi:10.1016/j.ijmedinf.2026.106270](https://doi.org/10.1016/j.ijmedinf.2026.106270)).

## Notas de infraestrutura

- O Ontoserver público recusa `op: in` nos eixos do LOINC (só `=`, `exists` e
  `is-a`), tem os nomes de Part em português e degrada a 11 segundos por
  chamada com três ou mais requisições em paralelo.
- O `tx.fhir.org` da HL7 responde em 1,6 segundo, aceita os filtros de eixo e a
  união de `include`, mas não tem texto em português e devolve páginas sem
  ordem, o que pede página de 200 e ordenação local.
- A busca em português na Search API devolve os rótulos de eixo traduzidos
  ("SgTotal", "Urina", "Sor/Plas"); o script aprende os pares com os códigos que
  aparecem nas duas línguas e normaliza antes de filtrar.
- A ordem dos resultados no corte de 300 linhas não é estável entre chamadas.
