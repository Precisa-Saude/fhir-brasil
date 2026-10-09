# Auditoria das 45 lacunas LOINC

Consulta em 09/10/2026 ao serviço oficial de busca, que informou a versão
**2.83**. Escopo: as 45 entradas sem código no commit `32047d3`.

Foram aplicados **Estrone → 2258-2** e **FatFreeMass → 91557-9**. O segundo
foi resolvido com a definição de um laudo DXA fornecido durante a auditoria.
O catálogo passa de 215 para **217 de 260 biomarcadores com LOINC (83,5%)**,
restando **43**. Das restantes, quatro têm candidatos que dependem de
esclarecimento terminológico ou do método; nas outras 39 não foi encontrado equivalente nas buscas
registradas. As 14 entradas antes classificadas como `pending-review` agora
têm pesquisa registrada. Isso não significa revisão clínica independente.

**Limite da contagem:** as 43 entradas continuam sem mapeamento LOINC
individual no catálogo. A busca inicial não avaliou completamente a
codificação composta (medida + região + método), painéis ou códigos de outros
sistemas. A investigação adicional abaixo encontrou caminhos concretos para
DXA; portanto, a lista não representa 43 lacunas confirmadas na terminologia.

O [registro em JSON](loinc-gaps-2026-10-09.json) contém as 45 entradas,
62 consultas com URL e contagem de resultados, e 41 candidatos com nome
oficial e seis eixos. Cada entrada aponta suas buscas, motivo e próximo passo.
As consultas ligadas às decisões retornaram todos os resultados. A busca
exploratória adicional `fluid body` teve corte em 200 resultados, registrado
como `truncated`; ela não fundamenta nenhuma conclusão de ausência.

## Mapeamentos aplicados

[2258-2, Estrone (E1) [Mass/volume] in Serum or Plasma](https://loinc.org/2258-2)
é ACTIVE e declara `Estrone:MCnc:Pt:Ser/Plas:Qn`, sem método. A unidade-exemplo
é `pg/mL`, igual à do catálogo. A anotação anterior confundia o conceito
genérico com a fração não conjugada. O catálogo só diz “Estrona”; não afirma
fração, sulfato ou uma definição particular de “total”.

O `$lookup` oficial conferiu o escolhido e os três candidatos rejeitados:
2261-6 (fração não conjugada), 22663-9 (concentração molar) e 15355-1
(sulfato de estrona). Os nomes e eixos estão no snapshot versionado.
Esses candidatos não foram adicionados como aliases. A ficha fica disponível
em `fhir-bio decision Estrone`.

[91557-9, Lean body weight](https://loinc.org/91557-9) é ACTIVE, com eixos
`Lean body weight:Mass:Pt:^Patient:Qn`, sem método. O modelo de laudo DXA
GE Healthcare Lunar Prodigy, software 16 [SP 2], define `Fat Free` como
tecido magro mais BMC e a massa total como gordura mais tecido magro mais BMC.
Assim, `FatFreeMass` corresponde ao peso total menos gordura. Essa é a
grandeza da fórmula oficial de
[88334-8, Lean body weight Calculated](https://loinc.org/88334-8), que usa o
mesmo componente LOINC `LP94922-9`. O `$lookup` oficial confirmou ambos.

O catálogo usa 91557-9 para manter a entrada genérica sem método obrigatório.
88334-8 fica registrado como irmão rejeitado para essa escolha canônica;
não foi adicionado como alias. `LeanMass` continua sem LOINC porque o laudo
separa o tecido magro do mineral ósseo. O título de uma seção sobre equilíbrio
muscular não transforma o resultado `Lean Mass` em massa muscular.
A ficha fica disponível em `fhir-bio decision FatFreeMass`.

## Candidatos que precisam de esclarecimento

| Entrada              | Candidato                                                                    | Evidência que falta                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BMC`                | [101685-6, Body bone mass](https://loinc.org/101685-6)                       | Confirmar se “Body bone” representa só mineral ou também matriz orgânica. A página não estabelece equivalência com BMC de DXA.                           |
| `ExtracellularWater` | [73706-4, Extracellular fluid [Volume] Measured](https://loinc.org/73706-4)  | Confirmar se a observação corresponde ao método `Measured`. Uma estimativa por BIA não deve receber essa declaração por suposição.                       |
| `IntracellularWater` | [73705-6, Intracellular fluid [Volume] Estimated](https://loinc.org/73705-6) | Confirmar a estimativa por água total menos extracelular, descrita pelo termo.                                                                           |
| `BasalMetabolicRate` | 69429-9 (repouso), 82278-3 (RMR medido), 82286-6 (RMR previsto)              | Identificar protocolo e fórmula. O índice 50042-1 não é uma taxa em kcal/dia, e metabolismo basal não deve ser equiparado automaticamente ao de repouso. |

As buscas literais por “extracellular water” e “intracellular water” retornaram
zero, mas trocar `water` por `fluid` encontrou os dois conceitos. A mesma
limitação de busca explica por que “lean body weight” não aparecia na
justificativa antiga de `LeanMass`. Por isso `no-concept` agora significa
“nenhum conceito equivalente encontrado nas buscas registradas”, sem afirmar
que uma busca prova a inexistência do conceito.

O laudo fornecido resolveu a definição local de `LeanMass`, `FatFreeMass`
e `BMC`. Para BMC, falta esclarecer o escopo do termo LOINC `Body bone`.
O documento também confirma BMD de corpo inteiro e regiões amplas, com
T-score e Z-score apenas na linha total, além de massa e volume de VAT como
resultados separados. Ele não contém ECW, ICW ou taxa metabólica. Esses casos
ainda precisam da definição e do método no laudo/manual correspondente.

O JSON registra as definições por página, o modelo do equipamento e a versão
do software. O documento privado, seus identificadores pessoais e resultados
não foram incluídos no repositório.

## Lacunas sem equivalente encontrado

| Família                                                               | Entradas | Resultado da busca e próximo passo                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cálcio coronariano, por artéria, percentil e valva aórtica            |        7 | Os resultados LOINC são documentos de exame, não escores numéricos. Preparar solicitação dos conceitos quantitativos ou avaliar a modelagem SNOMED/DICOM abaixo.                                                                                                               |
| BMD de corpo inteiro e das sete regiões, T-score e Z-score totais     |       10 | Há códigos de sítios específicos. Úmero não é braços, fêmur não é pernas, quadril não é pelve e coluna lombar não cobre uma região genérica “Spine”. 46383-6 não informa sítio; não preserva sozinho o significado de corpo inteiro. Solicitar conceitos com região explícita. |
| Massas magras e gordurosas de braços, pernas e tronco                 |        6 | Os candidatos são corporais totais. Documentar as regiões do equipamento e solicitar as observações regionais.                                                                                                                                                                 |
| Tecido magro total sem mineral ósseo                                  |        1 | O laudo confirma a separação de BMC. 91557-9 inclui BMC e 73964-9 mede músculo. Solicitar termo para tecido magro DXA.                                                                                                                                                         |
| Gordura visceral: massa, volume e nível                               |        3 | 73707-2 é área. Registrar separadamente kg, cm³ e o índice do fabricante.                                                                                                                                                                                                      |
| Gordura androide/ginoide e razão A/G                                  |        3 | O percentual de gordura corporal total não é equivalente. Documentar limites das regiões e denominadores.                                                                                                                                                                      |
| Dobras subescapular, supra-ilíaca, peitoral e axilar média            |        4 | Foram encontradas apenas dobras de coxa, tríceps e cintura. Solicitar termos para os quatro sítios.                                                                                                                                                                            |
| ECW/TBW, índice muscular, massa residual, cintura/altura e conicidade |        5 | Não foram encontrados termos equivalentes. A solicitação precisa da fórmula e dos compartimentos usados.                                                                                                                                                                       |

## Painéis e resultados estruturados de DXA

O painel ativo [83311-1](https://loinc.org/83311-1) reúne medições quantitativas
de densidade óssea por DXA, incluindo BMD, T-score e Z-score de vários sítios.
O LOINC o classifica como `Order`. Ele identifica o conjunto solicitado;
cada resultado continua precisando de significado próprio. O relatório
[38269-7](https://loinc.org/38269-7) aparece no
[exemplo DXA do FHIR R4](https://hl7.org/fhir/R4/diagnosticreport-example-dxa.json.html).
Já o antigo painel PhenX [63520-1](https://loinc.org/63520-1) está
`DISCOURAGED` e lista metadados do equipamento/imagem, sem resolver as
grandezas desta auditoria.

O [exemplo de BMD do HL7](https://hl7.org/fhir/R4/observation-example-bmd.html)
combina LOINC para a medida e SNOMED CT para a anatomia/lateralidade.
O [FHIR permite bodySite quando o sítio não está implícito no código](https://hl7.org/fhir/R4/observation-definitions.html#Observation.bodySite).
Isso reabre a avaliação de 46383-6 com região explícita para as entradas BMD.
É uma proposta a validar, não um mapeamento implementado. Usar o mesmo LOINC
em oito regiões exige mudar a resolução por código para preservar a anatomia.

A [declaração DICOM enCORE vinculada pela GE para v15, v16 e v17](https://s7d9.scene7.com/is/content/gehealthcare/gech-dicom-conformance-rev71-br-enpdf),
seções 10.5 e 10.6, documenta um template de observações DXA e códigos privados
do fabricante no esquema `GELUNAR`: 3 (BMD), 6 (BMD_TSCORE), 8 (BMD_ZSCORE),
26 (FAT_MASS), 27 (LEAN_MASS), 31 (BMC para composição corporal),
33 (VAT_VOLUME), 34 (VAT_MASS), 49 (ANDROID_PFAT), 50 (GYNOID_PFAT) e
51 (AG_RATIO). A tabela também define regiões de corpo inteiro. O contexto
do exame precisa acompanhar a região: valores `1000-x` são reutilizados
em diferentes tipos de exame. Esses códigos não são LOINC nem códigos DCM
universais. A existência na especificação não confirma sua presença em uma
exportação específica do equipamento.

A recomendação passa a ser avaliar um perfil FHIR de DXA com observações
individuais, região, método, dispositivo e unidades UCUM, agrupadas em
`DiagnosticReport`. Preservar os códigos de origem GE quando disponíveis e
adicionar equivalências padronizadas somente após validação. Nenhum código
adicional foi aplicado nesta etapa; a cobertura LOINC permanece 217/260.

Há trabalho anterior nessa direção: o
[estudo BOA de 2025](https://www.jmir.org/2025/1/e68750) usa FHIR, SNOMED CT
e RadLex para composição corporal derivada de CT. É uma referência de
modelagem, sem estabelecer equivalência automática com DXA.

## Caminho para o escore coronariano

O [DICOM TID 3905, edição 2026d](https://dicom.nema.org/medical/dicom/current/output/chtml/part16/sect_TID_3905.html)
usa **SNOMED CT 450360000, Coronary artery calcium score**, associado ao método
**DICOM 112055, Agatston Scoring Method**, e unidade UCUM `1`. Isso oferece
um caminho de interoperabilidade para avaliar em uma mudança própria, com
preservação do sítio anatômico. Não aumenta a cobertura LOINC.

Não estender esse código automaticamente ao percentil MESA ou ao cálcio da
valva aórtica. São outras observações. O conversor atual continua emitindo
o código local para as lacunas.

## Material para solicitar novos termos

O [processo oficial de solicitação](https://loinc.org/request) aceita formulário
ou planilha. O JSON desta auditoria já fornece nome local, unidade, buscas,
candidatos e motivo da rejeição. Para cada entrada, completar:

- definição da grandeza e seu uso;
- método, equipamento/software e região ou espécime;
- fórmula e denominador, quando houver;
- exemplo de resultado e trecho anonimizado do laudo/manual.

Os quatro casos ambíguos devem passar primeiro por esclarecimento terminológico,
para evitar pedir um termo que já existe. Não houve envio ao Regenstrief.

## Estado da implementação

Catálogo, registro de decisão, snapshot, módulo publicado, ValueSet do IG e
contagens foram atualizados juntos. Há testes de regressão de exportação/importação
FHIR da estrona e de separação das frações, além da massa livre de gordura
e sua distinção do tecido magro e de BMC. A consulta às fontes não preenche
`reviewer` nem declara revisão independente.

Validação: build completo, lint e typecheck do monorepo; testes com cobertura
dos cinco pacotes; formatação dos arquivos alterados; regeneração idempotente
das contagens, ValueSet e módulo LOINC. O `$lookup` oficial verificou os seis
códigos adicionados ao snapshot. As alterações estão na branch
`fix/lacunas-loinc`, sem commit ou publicação.
