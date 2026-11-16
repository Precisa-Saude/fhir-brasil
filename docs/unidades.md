# Grafia das unidades

O catálogo de `@precisa-saude/fhir` escreve cada unidade de um jeito só. A
unidade de um biomarcador aparece em `biomarkers.ts`, em `units.ts`
(`canonicalUnit` e `siUnit`) e em cada faixa de `reference-ranges.ts`, e os
três precisam trazer a mesma sequência de caracteres. O teste
`unit-consistency.test.ts` reprova quando divergem, quando uma unidade não
está na grafia padrão e quando um mesmo código UCUM aparece com duas grafias.

Isto trata da grafia que o catálogo declara e devolve. O que o laudo imprime
continua sendo lido: as grafias antigas e as estrangeiras seguem aceitas como
entrada, pelos `aliases` de cada biomarcador e por `standardUnitSpelling`, e
nenhuma delas muda o número.

## Regras aplicadas

| Regra                                        | Antes                 | Agora            | Fonte                                     |
| -------------------------------------------- | --------------------- | ---------------- | ----------------------------------------- |
| Micro se escreve com o símbolo do prefixo, µ | `mcg/dL`, `ug/dL`     | `µg/dL`          | SI, Tabela 7 (prefixos) e item 5.2        |
|                                              | `mcg/L`               | `µg/L`           |                                           |
|                                              | `mcg/mL`              | `µg/mL`          |                                           |
|                                              | `umol/L`              | `µmol/L`         |                                           |
| Hora é `h`, segundo é `s`                    | `mm/hr`               | `mm/h`           | SI, Tabela 8 (hora) e item 5.2            |
|                                              | `segundos`, `seconds` | `s`              |                                           |
| Expoente em sobrescrito                      | `kg/m2`               | `kg/m²`          | o SI escreve os expoentes assim (m², cm³) |
| Taxa de filtração por 1,73 m² de superfície  | `mL/min/1.73m²`       | `mL/min/1,73 m²` | Kirsztajn et al., 2024; Portaria 615/2023 |

O SI diz que os símbolos das unidades "são entidades matemáticas e não
abreviaturas" e que "não é permitida a utilização de abreviaturas para os
símbolos e nomes de unidades", com `seg` entre os exemplos proibidos (item
5.2). `mcg`, `ug`, `hr` e `seconds` caem nessa regra.

A taxa de filtração segue a grafia do posicionamento conjunto da SBN e da
SBPC/ML, que escreve `mL/min/1,73 m²` no texto inteiro. A vírgula decimal é o
item 3.5.1 do anexo da Portaria Inmetro nº 615/2023 ("deve ser sempre
empregada uma vírgula") e o espaço entre o número e o símbolo é o item 3.6 do
mesmo anexo. A expressão usa duas barras, o que o item 5.2 do SI desaconselha
quando não há parênteses; o catálogo acompanha o consenso das duas sociedades,
que é como o laudo brasileiro imprime.

O símbolo de micro no código é o caractere U+00B5 (`µ`). O mu grego U+03BC
(`μ`), visualmente igual, é aceito na entrada e convertido.

## Por que `mcg` existe

A Anvisa manda escrever `mcg` em rótulo de medicamento: "quando abreviada, a
expressão 'micrograma' deve ser descrita como 'mcg'" (RDC nº 768/2022, art.
16, XI). A regra vale para rotulagem de medicamento, onde um `µ` mal impresso
pode ser lido como `m` e multiplicar a dose por mil. Ela não trata de laudo de
laboratório, e por isso o catálogo fica com o SI. `mcg/dL` continua sendo lido.

## Grafias escolhidas pelo uso brasileiro

Para estas unidades nenhuma norma decide. A escolha foi a grafia que as
publicações brasileiras consultadas usam, em português.

| Antes             | Agora             | Onde a grafia aparece                                             |
| ----------------- | ----------------- | ----------------------------------------------------------------- |
| `K/uL`            | `mil/mm³`         | Tabela de hemograma da Divisão de Laboratório Central do HC-FMUSP |
| `M/uL`            | `milhões/mm³`     | Rosenfeld et al., 2019; HC-FMUSP                                  |
| `uIU/mL` (TSH)    | `mUI/L`           | SBPC/ML, 2019 e 2020                                              |
| `uIU/mL` (outros) | `µUI/mL`          | UI das linhas abaixo, com o µ do SI                               |
| `IU/mL`, `IU/L`   | `UI/mL`, `UI/L`   | SBPC/ML, 2020                                                     |
| `mIU/mL`, `mIU/L` | `mUI/mL`, `mUI/L` | SBPC/ML, 2020                                                     |
| `/HPF`            | `/campo`          | SBPC/ML, 2017 ("por campo de grande aumento")                     |
| `titer`           | `título`          | tradução; a palavra é a usada nos livros da SBPC/ML               |
| `/100 WBC`        | `/100 leucócitos` | tradução; não encontrada com esta grafia nas fontes consultadas   |

`mil/mm³` e `10³/µL` são a mesma contagem, porque 1 mm³ é 1 µL, e o código
UCUM continua `10*3/uL`. O TSH em `µUI/mL` e em `mUI/L` é o mesmo número.

A insulina fica em `µUI/mL`. As fontes consultadas não trazem a unidade da
insulina, então a grafia vem das duas regras já adotadas (UI e µ) e não de uma
publicação.

## O que ainda não foi decidido

`/LPF` (cilindros hialinos na urina) segue em inglês. O livro de urina da
SBPC/ML distingue "campo de pequeno aumento" de "campo de grande aumento", e
`/campo` já está em uso para o segundo.

As grandezas adimensionais ainda têm três rótulos. Razões, índices e escores
trazem `razão`, `índice` ou `score` na definição e unidade vazia na faixa, e
o INR usa `{ratio}` como canônica. É a lista `KNOWN_LABEL_MISMATCHES` do
teste. `AU` (escore de Agatston) e `score` (T-score e Z-score) dividem a
anotação UCUM `{score}` sem serem a mesma unidade, e estão em
`KNOWN_DOUBLE_SPELLINGS` com o INR.

## O que não foi possível consultar

A ABNT NBR ISO 80000-1 (Grandezas e unidades, parte 1) é vendida pela ABNT e
não foi lida. Nenhuma regra desta página se apoia nela. As regras de escrita
vêm da tradução do SI publicada pelo Inmetro e da Portaria nº 615/2023, que
são de acesso livre e tratam do mesmo assunto.

## Referências

INSTITUTO NACIONAL DE METROLOGIA, QUALIDADE E TECNOLOGIA; INSTITUTO PORTUGUÊS
DA QUALIDADE. **Sistema Internacional de Unidades (SI)**. Tradução do Grupo de
Trabalho luso-brasileiro do Inmetro e IPQ da 9ª edição (2019) do BIPM.
Brasília, DF: Inmetro, 2021. ISBN 978-85-86920-28-8. Disponível em:
https://www.gov.br/suframa/pt-br/centrais-de-conteudo/biblioteca/sistema-internaciona-de-unidades-inmetro.pdf.
Acesso em: 16 nov. 2026.

INSTITUTO NACIONAL DE METROLOGIA, QUALIDADE E TECNOLOGIA. **Portaria nº 615,
de 18 de dezembro de 2023**. Diário Oficial da União, Brasília, DF. Disponível
em:
https://www.in.gov.br/web/dou/-/portaria-n-615-de-18-de-dezembro-de-2023-533482081.
Acesso em: 16 nov. 2026.

KIRSZTAJN, G. M. et al. Estimativa da taxa de filtração glomerular na prática
clínica: posicionamento consensual da Sociedade Brasileira de Nefrologia (SBN)
e Sociedade Brasileira de Patologia Clínica e Medicina Laboratorial (SBPC/ML).
**Brazilian Journal of Nephrology**, v. 46, n. 3, jul./set. 2024. DOI:
https://doi.org/10.1590/2175-8239-JBN-2023-0193pt.

AGÊNCIA NACIONAL DE VIGILÂNCIA SANITÁRIA. **Resolução RDC nº 768, de 12 de
dezembro de 2022**. Disponível em:
https://ses.sp.bvs.br/wp-content/uploads/2022/12/U_RS-MS-ANVISA-RDC-768_121222.pdf.
Acesso em: 16 nov. 2026.

ROSENFELD, L. G. et al. Valores de referência para exames laboratoriais de
hemograma da população adulta brasileira: Pesquisa Nacional de Saúde.
**Revista Brasileira de Epidemiologia**, v. 22, supl. 2, 2019. DOI:
https://doi.org/10.1590/1980-549720190003.supl.2.

SUMITA, N. M. et al. (org.). **Recomendações da Sociedade Brasileira de
Patologia Clínica/Medicina Laboratorial (SBPC/ML)**: boas práticas em
laboratório clínico. 1. ed. Barueri: Manole, 2020. ISBN 978-85-7868-395-5.
Disponível em:
https://controllab.com/wp-content/uploads/RecomendacoesSBPCML_BoasPraticasEmLaboratorioClinico.pdf.
Acesso em: 16 nov. 2026.

SUMITA, N. M. et al. (org.). **Recomendações da Sociedade Brasileira de
Patologia Clínica/Medicina Laboratorial (SBPC/ML)**: inovação no laboratório
clínico. 1. ed. Barueri: Manole, 2019.

SOCIEDADE BRASILEIRA DE PATOLOGIA CLÍNICA/MEDICINA LABORATORIAL.
**Recomendações da Sociedade Brasileira de Patologia Clínica/Medicina
Laboratorial (SBPC/ML)**: realização de exames em urina. Barueri: Manole, 2017. Disponível em:
https://controllab.com/wp-content/uploads/recomendacoes_da_sbpcml_realizacao_de_exames_em_urina.pdf.
Acesso em: 16 nov. 2026.

HOSPITAL DAS CLÍNICAS DA FACULDADE DE MEDICINA DA UNIVERSIDADE DE SÃO PAULO.
Divisão de Laboratório Central. **Hemograma**: especificação do exame. Disponível em:
https://patologiaclinica.hc.fm.usp.br/exames-especificacao?id=9662. Acesso em:
16 nov. 2026.
