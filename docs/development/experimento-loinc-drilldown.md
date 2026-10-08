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
