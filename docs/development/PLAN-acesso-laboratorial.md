# Plano: protocolo de acesso laboratorial por consentimento

**Revisado em:** 15/11/2026
**Ticket:** [PRE-575](https://linear.app/precisa-saude/issue/PRE-575), Consent-based lab access protocol
**Relacionados:** PRE-574 (roteamento v1), PRE-482 (fronteira de transporte do fhir-rnds), PRE-489 (loinc-bench)

## Objetivo

Publicar a parte FHIR e o cliente TypeScript de um protocolo em que agendamento, preços e resultados circulam entre um laboratório e um aplicativo do paciente com consentimento explícito, sem que o aplicativo receba a senha do paciente no laboratório. A especificação, o servidor de exemplo e a suíte de conformidade ficam em repositório próprio, de nome neutro. Neste repositório entram os perfis do IG e o pacote cliente.

## Fatias

| Fatia | Onde                        | Conteúdo                                                                                 | Estado                                                           |
| ----- | --------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| A     | fhir-brasil, `ig/`          | Nove perfis, CodeSystem e ValueSet de escopos, CodeSystem de contexto de preço, exemplos | em andamento                                                     |
| B     | rascunho local, fora de git | Especificação do protocolo, formato do registro de participantes, GOVERNANCE             | em andamento, aguarda nome do repositório para o primeiro commit |
| C     | fhir-brasil, `packages/`    | Pacote cliente: fluxo de consentimento, tokens, chamadas tipadas por escopo              | aguarda B revisada e o nome do pacote                            |
| D     | repositório novo            | Servidor de laboratório de exemplo, em imagem de contêiner                               | aguarda B                                                        |
| E     | repositório novo            | Suíte de conformidade, passando contra o servidor de exemplo                             | aguarda D                                                        |
| F     | platform (privado)          | Fluxo "Conectar laboratório" no web, de ponta a ponta contra o servidor de exemplo       | aguarda C e D                                                    |
| G     | fora de código              | Texto de duas páginas para engenharia e segurança dos laboratórios                       | aguarda B                                                        |

## Identificadores dos perfis (fatia A)

Base canônica: `https://fhir-brasil.dev.br/ig/StructureDefinition/<id>`.

| Recurso              | Nome                      | Id                            |
| -------------------- | ------------------------- | ----------------------------- |
| Consent              | BRLabAccessConsent        | br-lab-access-consent         |
| Appointment          | BRLabAppointment          | br-lab-appointment            |
| Slot                 | BRLabSlot                 | br-lab-slot                   |
| Schedule             | BRLabSchedule             | br-lab-schedule               |
| ServiceRequest       | BRLabServiceRequest       | br-lab-service-request        |
| ChargeItemDefinition | BRLabChargeItemDefinition | br-lab-charge-item-definition |
| ActivityDefinition   | BRLabActivityDefinition   | br-lab-activity-definition    |
| Location             | BRLabLocation             | br-lab-location               |
| HealthcareService    | BRLabHealthcareService    | br-lab-healthcare-service     |

## Critérios de aceite

### Fatia A: perfis no IG

1. **Os nove perfis existem** com os nomes e ids da tabela, título e descrição seguindo a convenção atual do IG.
2. **Paciente identificado por CPF**: onde o recurso referencia o paciente, a referência aponta para `BRPatient` ou carrega identificador no sistema `$CPF` já usado no IG.
3. **TUSS ao lado de LOINC**: o código do exame em `BRLabActivityDefinition` e `BRLabServiceRequest` exige ao menos um código e aceita LOINC e TUSS em fatias por sistema, ambos opcionais, para que combo ou painel sem LOINC possa ser publicado com o código próprio do laboratório (decisão de 16/11/2026). Não há binding para `BRTUSSProcedimentosLabVS` enquanto o aviso do `ig/README.md` sobre aquele ValueSet estiver de pé.
4. **Escopos**: CodeSystem com os seis escopos do ticket (`catalog.read`, `locations.read`, `schedule.read`, `appointment.write`, `results.read`, `consent.read`). Os três primeiros são acesso do aplicativo ao laboratório e não pedem consentimento do paciente. O ValueSet `BRLabAccessPatientScopeVS`, ligado com `required` a `Consent.provision.action`, tem só os três que o paciente consente: `appointment.write`, `results.read` e `consent.read` (decisão de 16/11/2026). O Consent carrega validade, permite revogação e leva em `identifier` o identificador que o laboratório dá ao consentimento.
5. **Preço**: `BRLabChargeItemDefinition` representa os três formatos de preço do PRE-574 (por unidade e produto, por cidade, por marca e região) e a moeda é BRL. No preço por marca e região, a marca é um `useContext` próprio, com o código `brand` do `BRLabPriceContextCS` e referência direta à `Organization`, ao lado do `useContext` com o `Location` da região: a marca se lê no próprio preço, sem percorrer `partOf` nem `managingOrganization` (decisão de 16/11/2026). A fatia é opcional, porque o perfil não distingue unidade de região sem resolver a referência.
6. **Um exemplo por perfil**, com dados sintéticos e sem nome de laboratório ou empresa real. O exemplo do `BRLabServiceRequest` é o pedido contido no agendamento de exemplo.
7. **Compila**: `pnpm exec sushi ig/ -o ig/output` termina com 0 erros e sem avisos novos em relação a `origin/main`. `pnpm turbo run lint typecheck test` continua passando.
8. `ig/README.md` lista os artefatos novos.
9. **Agendamento em um recurso só**: `BRLabAppointment` leva os pedidos `BRLabServiceRequest` em `contained`, e `basedOn` aponta para eles por referência local. A agregação `contained` recusa referência externa, e três invariantes conferem que há ao menos um pedido contido, que todo `basedOn` aponta para um pedido contido e que o `subject` de cada pedido repete o paciente do agendamento, pela mesma referência literal ou pelo mesmo CPF (decisão de 16/11/2026).
10. **Exemplos válidos no validador da HL7**: cada exemplo novo passa com 0 erros contra o perfil que declara. As fatias de participante do `BRLabAppointment` e de `actor` do `BRLabSchedule` se distinguem por `type` da referência, e não por `resolve()`, para que o paciente identificado só por CPF e a referência não resolvida caiam na fatia certa.

Fora de escopo da fatia A: coleta domiciliar (o `BRLabHealthcareService` exige ao menos uma unidade), publicar o IG, mudar a versão do IG, recolocar o SUSHI no CI (removido no #62; vale ticket próprio, porque hoje FSH novo não tem checagem automática), corrigir o ValueSet TUSS, tipos TypeScript no `packages/core`.

### Fatia B: rascunho da especificação

1. Cobre fluxos, escopos, ciclo de vida do consentimento, taxonomia de erros, perfil de segurança e formato do registro de participantes, com diagramas de sequência em Mermaid.
2. Em nenhum diagrama ou passo a senha do paciente no laboratório passa pelo receptor.
3. Cada afirmação sobre Open Finance Brasil, FAPI e as RFCs citadas foi conferida na fonte aberta, e o que não pôde ser conferido está listado como não verificado.
4. Não cita laboratório nem empresa, e o nome do protocolo é um marcador a substituir.
5. Referencia os perfis do IG por URL canônica, sem copiá-los.

### Ticket inteiro (PRE-575, "Done when")

- [ ] Um usuário conecta o laboratório de exemplo, vê preços e horários, agenda, cancela e revoga o consentimento, tudo dentro da Precisa
- [ ] Nenhuma senha de laboratório passa pela Precisa, verificável nos diagramas e no código
- [ ] Perfis publicados no fhir-brasil, pacote cliente no npm, repositório da especificação público com nome próprio
- [ ] A suíte de conformidade passa contra o servidor de exemplo

## Pendências que dependem do Rafael

1. Nome do repositório da especificação (sem "Precisa" e sem "fhir-brasil"), antes do primeiro commit.
2. Nome do pacote cliente no npm, que não se troca depois de publicado.
3. mTLS nas chamadas de dados: o `fhir-rnds` só usa certificado para obter o token. Aqui o perfil de segurança pede mTLS entre servidores, então o cliente usaria `node:https` em todas as chamadas para manter zero dependências.
4. Assinatura de request objects com `node:crypto` (PS256), sem biblioteca JOSE, pelo mesmo motivo.

## Estado

- [x] Fatia A implementada e compilando
- [ ] Fatia B em rascunho para revisão
- [ ] Fatias C a G
