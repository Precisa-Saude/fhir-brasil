# Plano: cliente do receptor para acesso laboratorial (PRE-575, fatia C)

## Objetivo

Criar o pacote `@precisa-saude/fhir-lab-access` em `packages/lab-access`: o
cliente do lado do receptor (o backend de um aplicativo voltado ao paciente)
para o protocolo Open Labs Brasil, versão 0.2.0 da especificação.

Atualizado depois para a versão 0.2.1: critérios, evidências e pontos em
aberto dessa atualização estão na última seção, "Atualização para a
especificação 0.2.1".

A especificação é um rascunho ainda não publicado e nunca foi testada contra
um laboratório real. Por isso o pacote nasce `private: true` e não entra na
lista de publicação.

Fonte normativa: a especificação 0.2.0 (capítulos 00 a 09 e a pasta
`registro/`). Este repositório cita os identificadores de requisito (por
exemplo `RCP-011`) e descreve o comportamento com palavras próprias, sem
copiar trechos do texto.

## Decisões

- **Dependências.** `@precisa-saude/fhir` (workspace) e `jose`, exceção
  aprovada e registrada no `AGENTS.md`, como o `pdfjs-dist` do
  `fhir-pdf`. O resto é módulo nativo do Node. A especificação recomenda uma
  biblioteca JOSE estabelecida para JWT, JWK e JWS (seção 7.11).
- **Transporte.** Toda chamada passa por uma interface pequena,
  `LabAccessTransport`. A implementação padrão usa `node:https` com o
  certificado de cliente (mTLS) e TLS 1.2 ou superior. Os testes trocam a
  interface por uma versão em memória.
- **Sem validador de JSON Schema.** O schema do registro é conferido por um
  validador escrito à mão, que espelha o schema da especificação, para não
  acrescentar outra dependência.
- **Estado da jornada fica com o aplicativo.** A jornada de autorização
  atravessa requisições HTTP diferentes. O pacote devolve um objeto de jornada
  serializável (com `state` e `code_verifier`) e o aplicativo o guarda na
  sessão do paciente. O CPF esperado não entra nesse objeto: é entregue só na
  conclusão.
- **Só transporte.** O pacote não monta conteúdo clínico. No agendamento ele
  recebe o `Appointment` pronto, confere o que o protocolo exige de um
  receptor e envia.

## Critérios de aceite

Cada critério traz a verificação que o comprova. Evidências preenchidas ao
final, na seção "Situação".

1. **Pacote.** `packages/lab-access`, nome `@precisa-saude/fhir-lab-access`,
   `private: true`, mesmos scripts do `rnds` (`build`, `clean`, `lint`,
   `test`, `test:coverage`, `typecheck`), dependências de runtime restritas a
   `@precisa-saude/fhir` e `jose`.
   Verificação: `package.json` e o teste `package.test.ts`.
2. **Registro de participantes.** Carrega os bytes do registro, verifica a
   assinatura destacada (PS256, conteúdo destacado, `kid` igual ao thumbprint
   RFC 7638) com as chaves do documento anterior ou do conjunto inicial,
   valida contra o schema, confere `sequence`, `issued_at` e `expires_at`, e
   expõe provedores e endereços. Recusa registro sem assinatura, com
   assinatura errada ou inválido contra o schema.
   Verificação: `registry.test.ts`, com o registro e a assinatura de exemplo
   da especificação copiados como fixtures (são sintéticos) e variantes
   adulteradas (REG-001, REG-002, REG-003, REG-006).
3. **Acesso em nível de provedor.** Token `client_credentials` com asserção
   `private_key_jwt` (PS256, `aud` igual ao `issuer` como texto simples) sobre
   mTLS, em cache e renovado sem corrida entre chamadas concorrentes. Chamadas
   tipadas para `catalog.read`, `locations.read` e `schedule.read`.
   Verificação: `client-assertion.test.ts`, `provider-token.test.ts`,
   `provider-api.test.ts`.
4. **Jornada de consentimento.** Cria o consentimento; monta a requisição por
   PAR com PKCE `S256` e `state`; a URL de autorização leva só `client_id` e
   `request_uri`; o retorno confere `iss` e `state` e trata respostas de erro;
   troca o código; lê o consentimento com o token de paciente antes de
   qualquer outra chamada e compara o CPF devolvido com o esperado. Em
   divergência: revoga com `PATIENT_MISMATCH`, descarta os tokens, lança erro
   tipado e não chama a API FHIR. Expiração e renovação conforme a
   especificação. Revogação pelo lado do receptor.
   Verificação: `journey.test.ts`, `holder-check.test.ts`,
   `patient-token.test.ts`, `revocation.test.ts`.
5. **Chamadas em nível de paciente.** `appointment.write` (criação com os
   pedidos de exame contidos, idempotência por `If-None-Exist`, remarcação e
   cancelamento com `If-Match`), `results.read`, `consent.read`.
   Verificação: `patient-api.test.ts`.
6. **Erros.** A taxonomia do capítulo 6 mapeada em classes tipadas: erros
   OAuth, erros com `OperationOutcome`, e se a chamada pode ou não ser
   repetida.
   Verificação: `errors.test.ts`, `retry.test.ts`.
7. **Nenhuma credencial de paciente.** Não existe superfície de API que
   aceite, guarde ou transmita senha do laboratório ou qualquer credencial do
   paciente. Dito no README e conferido por teste onde dá.
   Verificação: `no-credentials.test.ts` (parâmetros do PAR, da URL de
   autorização, do corpo de `POST /consents` e das requisições de token).
8. **Só transporte.** Recursos FHIR tipados com os tipos de
   `@precisa-saude/fhir` quando existem e com tipos mínimos locais nos demais
   casos. Nada é acrescentado a `packages/core` nesta fatia. A lista dos tipos
   que deveriam migrar fica na seção "Tipos a mover para o core".
9. **Mapa de conformidade.** Todo requisito do lado do receptor no capítulo de
   conformidade (RCP-001 a RCP-026 e os REG que valem para o receptor) tem ao
   menos um teste com o identificador no nome, ou aparece listado como não
   testável sem contraparte real. A tabela fica no README do pacote.
   Verificação: `conformance.test.ts` confere que a tabela do README e os
   nomes dos testes batem.
10. **Cobertura e verificações.** Cobertura do pacote igual ou acima de 80% em
    branches, functions, lines e statements. `pnpm turbo run lint typecheck
test build` passa no repositório inteiro.
11. **Integração no monorepo.** Escopo `lab-access` no commitlint, estrutura e
    regras de dependência no `AGENTS.md`, tabela de pacotes do README raiz
    (marcado como rascunho privado), `CONVENTIONS.md`. Fora da lista de
    publicação enquanto privado, com `pnpm packages:check` passando.
12. **README do pacote em pt-BR.** Aviso de situação (rascunho, implementa a
    versão 0.2.0 de uma especificação ainda não publicada, nunca testado
    contra um laboratório real), instalação, uso rápido com a jornada
    completa, propriedades de segurança, tabela de conformidade, "Aviso
    médico" e licença.

## Fora de escopo

- Servidor simulado de laboratório.
- Executor de suíte de conformidade.
- Qualquer interface de usuário.
- Publicação no npm.
- Tipos novos em `packages/core`.

## Divergências entre os critérios e a especificação

Onde a especificação contradiz ou não sustenta um critério, vale a
especificação. Os pontos ambíguos ficam com a leitura mais conservadora e
estão listados em "Pontos em aberto".

- **Critério 5, link de pagamento.** A especificação não fixa a URL da
  extensão que carrega o link de pagamento (pendência do guia de
  implementação). O pacote não extrai o link: devolve o `Appointment` como
  veio.
- **Critério 9.** Parte dos requisitos do receptor fala de telas, do
  aplicativo móvel e de armazenamento (RCP-001, RCP-002, RCP-022 a RCP-025).
  Uma biblioteca de backend não tem como prová-los. Eles entram na tabela
  como "fora do alcance do pacote", com a parte que o pacote garante.

## Etapas

- [x] Leitura da especificação 0.2.0 e das notas de revisão
- [x] Plano com critérios de aceite
- [x] Esqueleto do pacote e exceção de dependência
- [x] Registro de participantes
- [x] Descoberta, asserção do cliente, PKCE
- [x] Token de provedor e chamadas de catálogo, unidades e agenda
- [x] Jornada de consentimento e conferência do titular
- [x] Token de paciente, renovação e revogação
- [x] Agendamento, resultados e registros de consentimento
- [x] Erros e repetição
- [x] README, tabela de conformidade e integração no monorepo
- [x] Verificação final
- [ ] Revisão do mantenedor, commit e PR

## Situação

Implementado e verificado localmente em 2026-11-16. Nada foi commitado.
Nenhum teste roda contra um laboratório real: o provedor é simulado em
memória, a partir do texto da especificação.

| #   | Critério                 | Evidência                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pacote                   | `package.test.ts`: privado, dependências `@precisa-saude/fhir` e `jose`, scripts iguais aos do `rnds`                                                                                                                                                                                                      |
| 2   | Registro                 | `registry.test.ts`, 61 testes: exemplo da especificação aceito, 7 variantes de assinatura recusadas, 34 violações de schema, sequência e validade                                                                                                                                                          |
| 3   | Nível de provedor        | `client-assertion.test.ts`, `provider-token.test.ts` (cache, concorrência, renovação), `provider-api.test.ts`                                                                                                                                                                                              |
| 4   | Jornada                  | `journey.test.ts`, `holder-check.test.ts`, `patient-token.test.ts`, `revocation.test.ts`                                                                                                                                                                                                                   |
| 5   | Nível de paciente        | `patient-api.test.ts`                                                                                                                                                                                                                                                                                      |
| 6   | Erros                    | `errors.test.ts` (os 33 códigos da seção 6.3 e os 8 erros OAuth), `retry.test.ts`                                                                                                                                                                                                                          |
| 7   | Nenhuma credencial       | `no-credentials.test.ts`                                                                                                                                                                                                                                                                                   |
| 8   | Só transporte            | `patient-api.test.ts` (o `Appointment` segue como o aplicativo o montou). Lista de tipos abaixo                                                                                                                                                                                                            |
| 9   | Mapa de conformidade     | Tabela no README do pacote, conferida por `conformance.test.ts`. 32 requisitos: 20 cobertos, 7 parciais, 5 fora do alcance                                                                                                                                                                                 |
| 10  | Cobertura e verificações | `pnpm turbo run test:coverage --filter=@precisa-saude/fhir-lab-access`, com o `vitest.config.ts` da raiz: 99,39% statements, 96,20% branches, 98,79% functions, 99,39% lines (só `src/`, sem os testes: 98,79%, 96,34%, 99,53%, 98,79%). `pnpm turbo run lint typecheck test build`: 25 tarefas, 25 certas |
| 11  | Integração no monorepo   | `.commitlintrc.cjs`, `AGENTS.md`, `CONVENTIONS.md`, `.precisa.json` (escopo), `README.md`, `.prettierignore`. `pnpm packages:check` passa sem o pacote na lista                                                                                                                                            |
| 12  | README do pacote         | `packages/lab-access/README.md`                                                                                                                                                                                                                                                                            |

Verificação manual, fora da suíte: o transporte real (`createMtlsTransport`)
foi exercitado contra um servidor HTTPS local com certificados gerados na
hora. Apresentou o certificado de cliente em TLS 1.3 e em TLS 1.2, recusou
servidor sem CA confiável e recusou servidor que só oferecia suíte fora da
lista.

## O que muda para publicar

- `packages/lab-access/package.json`: tirar `"private": true`, acrescentar
  `"publishConfig": { "access": "public" }`. A versão passa a ser sincronizada
  pelo `scripts/sync-versions.js`.
- `.github/workflows/ci.yml`: acrescentar `packages/lab-access` ao bloco
  `packages:` do job `publish`. Sem isso `pnpm packages:check` reprova.
- `.precisa.json`: acrescentar a `publishPackages`.
- `README.md` da raiz: selo do npm, linha da tabela sem "rascunho privado",
  comando de instalação, roadmap.
- `site/src/components/Packages.tsx`: entrada do pacote.
- `packages/lab-access/README.md`: aviso de situação e seção de instalação.
- `packages/lab-access/src/__tests__/package.test.ts`: o teste que exige
  `private: true`.
- `AGENTS.md`: seção "Private packages".
- Antes de tudo isso: a especificação precisa estar pública, e o pacote
  precisa ter rodado contra ao menos um provedor real.

## Tipos a mover para o core

Tipos mínimos locais em `packages/lab-access/src/fhir-types.ts`, que deveriam
ir para `@precisa-saude/fhir` em outra fatia:

- `FHIRAppointment`, `FHIRAppointmentParticipant`, `FHIRServiceRequest`
- `FHIRSlot`, `FHIRSchedule`
- `FHIRLocation`, `FHIRHealthcareService`
- `FHIRActivityDefinition`, `FHIRChargeItemDefinition`
- `FHIROperationOutcome`, `FHIROperationOutcomeIssue` (hoje também no
  `fhir-rnds`)
- `FHIRSearchBundle`, `FHIRSearchBundleEntry`, `FHIRBundleLink`: o
  `FHIRBundle` do core não tem o tipo `searchset` nem `link`
- `FHIRCapabilityStatement`

O `FHIRConsent` do core não tem `identifier`, `organization` nem
`provision.action` e `provision.dataPeriod`, que o perfil de consentimento do
acesso laboratorial usa.

## Pontos em aberto

Lista da implementação da 0.2.0. A 0.2.1 respondeu à maior parte: o que
mudou em cada ponto está na seção "Atualização para a especificação 0.2.1",
abaixo.

Onde a especificação é ambígua, ou parece errada, o pacote ficou com a
leitura mais conservadora. Cada ponto abaixo pede decisão na especificação.

1. **Registro expirado e revogação.** A seção 8.3 manda o participante parar
   de pedir concessões `client_credentials` depois de `expires_at`. A
   revogação pelo receptor usa justamente um token `client_credentials`
   (`consent.manage`), e a seção 2.6 manda repetir a revogação até conseguir.
   Lido ao pé da letra, um registro expirado impede o receptor de revogar.
   Implementado: nenhum token de provedor novo depois de `expires_at`,
   inclusive para revogar. Os tokens do paciente são descartados localmente e
   a revogação fica pendente.
2. **Versão do protocolo.** A especificação é a 0.2.0, o registro de exemplo
   declara `protocol_versions: ["1.0"]` e o `api_base_url` termina em `/v1`.
   Não está dito que versão um implementador da 0.2.0 declara. Implementado:
   a negociação compara só as duas listas do registro, sem versão fixa no
   pacote.
3. **MAJOR em comum sem MINOR idêntico.** A seção 9.1 diz para escolher a
   maior versão que os dois listam e que sem MAJOR em comum não há
   comunicação. Não diz o que vale com `1.0` de um lado e `1.1` do outro.
   Implementado: a comunicação segue (o MINOR é compatível por definição) e a
   versão negociada fica indefinida.
4. **Conferência do titular impossível.** A especificação trata o CPF
   diferente (`PATIENT_MISMATCH`) e não diz o que fazer quando a leitura do
   consentimento falha ou vem sem `patient`. Implementado: o vínculo não é
   concluído, os tokens são descartados e o consentimento é revogado com
   `RECEIVER_TERMINATION`, porque `PATIENT_MISMATCH` afirmaria uma divergência
   que não foi constatada.
5. **"Repetir até conseguir".** As seções 2.6 e 6.6 mandam repetir o `DELETE`
   sem limite. Uma chamada de biblioteca não pode ficar presa para sempre.
   Implementado: até 3 tentativas com recuo, e depois o erro informa que a
   revogação está pendente, para o aplicativo repetir.
6. **Limite de tentativas.** A seção 6.3.5 fixa "no máximo 3 tentativas" só
   para `INTERNAL_ERROR`. Implementado: o mesmo limite para toda repetição
   automática, e leitura de "3 tentativas" como total, contando a primeira.
7. **Metadados.** A seção 5.2 diz que o documento "DEVE conter ao menos" os
   campos do exemplo, sem dizer quais valores são obrigatórios.
   Implementado: o provedor é recusado se não anunciar PAR obrigatório,
   parâmetro `iss`, token vinculado a certificado, `code`, as três concessões,
   `private_key_jwt`, PS256 e S256.
8. **Regras do registro fora dos passos de verificação.** A validade máxima
   de 30 dias (8.2) e o `kid` igual ao thumbprint (8.3, item 5) não estão nos
   seis passos de verificação nem no schema. Implementado: as duas são
   conferidas e o candidato é recusado se falhar.
9. **Link `next`.** A seção 5.1 manda seguir a URL sem alterá-la, e o fluxo 2
   proíbe obter endereços fora do registro e dos metadados. Implementado: o
   link é seguido como veio, mas só se estiver dentro do `fhir_base_url` do
   registro, para o token não ir a outro endereço.
10. **Link de pagamento.** A extensão que carrega o link não tem URL definida
    (pendência do guia). O pacote não lê o link.
11. **`If-None-Exist` sem codificação.** O exemplo da seção 5.5.5 mostra o
    valor sem codificação de URL. Implementado igual ao exemplo, e
    identificador com espaço, `|`, `&`, `#`, `%`, `+`, `,`, `$` ou `\` é
    recusado antes do envio.
12. **Identificador com mais de um valor.** A especificação fala em "um
    `identifier`" do receptor. Com mais de um no recurso, o pacote exige que
    quem chama diga qual vai no `If-None-Exist`.
13. **Token de provedor por escopo.** O fluxo 2.1 mostra um token com vários
    escopos. O pacote pede um token por escopo, o que a especificação não
    proíbe e isola a recusa de um escopo dos demais.
14. **`expires_in` fora de 300 a 900.** É obrigação do provedor. O pacote não
    recusa a resposta, mas nunca usa um token por mais de 900 segundos.
15. **Endpoint de revogação de token (RFC 7009).** Opcional na especificação.
    O pacote lê o endereço dos metadados e ainda não tem chamada para ele.
16. **`RECEIVER_NOT_ALLOWED` e `invalid_client`.** A seção 6.4 manda parar de
    chamar o provedor. O pacote devolve o erro sem repetição, e a decisão de
    parar fica com o aplicativo.

## Atualização para a especificação 0.2.1

A 0.2.1 é um PATCH da especificação que esclarece pontos levantados por esta
implementação e, em vários deles, fixa comportamento. A versão de protocolo
continua `0.2`. Fonte: `CHANGELOG.md`, capítulos 00 a 09, `registro/` e as
notas de revisão do repositório da especificação, lidos no ramo principal em
2026-11-16. Como antes, este repositório cita os identificadores e descreve o
comportamento com palavras próprias.

### Critérios de aceite da 0.2.1

Cada critério traz o comportamento observável, a verificação e, quando
cabe, o identificador do requisito. Os testes com identificador no nome são
escritos antes do código e falham contra a implementação da 0.2.0.

1. **Números de versão.** O pacote declara a especificação `0.2.1` e o
   protocolo `0.2`. O schema do registro aceita `schema_version` `0.x` e
   recusa `1.x`. As fixtures passam a ser o exemplo regenerado da 0.2.1 e a
   assinatura dele, com o resumo SHA-256 fixado no teste e a entrada no
   `.prettierignore` mantida. Nada no código ou nos testes fica preso a
   `1.0` ou a `/v1`.
   Verificação: `registry.test.ts`, `package.test.ts` e
   `grep -rn "acesso/v1" packages/lab-access` sem resultado.
2. **Negociação de versão (REG-009, RCP-037).** A versão efetiva é calculada
   pela regra da seção 9.1: com MAJOR 0, só versão idêntica; com MAJOR 1 ou
   mais, o menor entre os maiores MINOR de cada lado. O `api_base_url` do
   provedor precisa terminar em `/v{MAJOR}`. A versão efetiva precisa ser
   uma que o pacote implementa (`0.2`). Sem versão efetiva o provedor não
   aparece em `client.providers()` e nenhuma chamada é feita a ele.
   Verificação: testes `REG-009` e `RCP-037`.
3. **Verificação do registro em catorze passos (REG-007).** `verifyRegistry`
   aplica V2 a V14, na ordem, e recusa no primeiro que falha, informando o
   passo no erro (`step`). Entram o tamanho da chave (V5), o ambiente (V8,
   com o ambiente do participante informado na chamada), a validade invertida
   ou acima de 30 dias (V11), o `kid` das chaves anunciadas (V13) e a
   unicidade de `participant_id` com `client_id` igual ao `participant_id`
   (V14). V1 (baixar por HTTPS) é do aplicativo, porque o pacote não busca o
   registro. Fora da lista, nenhuma regra de recusa.
   Verificação: um teste `REG-007` por condição, cada candidato validamente
   assinado quando a condição não é a assinatura.
4. **Registro expirado (REG-008, RCP-033).** Nos 7 dias seguintes a
   `expires_at`: nenhuma jornada nova, nenhum token de catálogo, unidades ou
   agenda, e token `client_credentials` só com `consent.manage` sozinho, para
   ler e revogar consentimentos. Criar consentimento é recusado localmente
   com `RegistryExpiredError`, e o `403 REGISTRY_EXPIRED` do provedor vira
   erro tipado. Depois dos 7 dias, nenhum token, e a revogação fica pendente.
   Verificação: testes `REG-008` e `RCP-033`.
5. **Revogação pendente (RCP-028, RCP-029).** Toda revogação enviada pelo
   receptor faz no máximo três tentativas automáticas ao todo, contando a
   obtenção do token de provedor, com recuo e `Retry-After`. Falhando, grava
   a pendência (consentimento, provedor, motivo, instante do pedido,
   tentativas, próxima tentativa e o `consent_management_uri` do provedor)
   em um `RevocationStore`. O pacote traz um armazenamento em memória, que
   não é durável: o armazenamento durável é do aplicativo. O pacote não roda
   temporizador: expõe `pendingRevocations()` e `retryPendingRevocations()`,
   que faz uma única chamada por pendência vencida e agenda a seguinte de
   hora em hora nas primeiras 24 horas e diariamente depois. 204, 404
   `CONSENT_NOT_FOUND`, 422 `CONSENT_INVALID_STATE` e a passagem de
   `expiration_date_time`, quando conhecida, encerram a pendência. Nenhuma
   pendência é apagada por desistência.
   Verificação: testes `RCP-028` e `RCP-029`.
6. **Conferência impossível (RCP-027).** Leitura do consentimento que falha,
   que vem sem `patient`, sem `patient.cpf`, ou com CPF que não tem 11 dígitos
   com dígitos verificadores válidos: o vínculo não é concluído, os tokens
   são descartados e a revogação usa `RECEIVER_TERMINATION`, nunca
   `PATIENT_MISMATCH`. O CPF esperado, informado pelo aplicativo, também é
   conferido pelos dígitos verificadores antes da troca do código.
   Verificação: testes `RCP-027`.
7. **Metadados do servidor de autorização (AUT-026, RCP-031).** Os catorze
   campos da tabela da seção 5.2 são conferidos com o valor exigido:
   igualdade exata onde a tabela diz "exatamente", URLs `https`, os três
   booleanos `true`, `grant_types_supported` sem `password` e `implicit`, e
   `scopes_supported` contendo os escopos do provedor no registro. `jwks_uri`
   é exigido e nunca buscado. Os endereços de `mtls_endpoint_aliases`
   também precisam ser `https`.
   Verificação: um teste `RCP-031` que omite cada campo, um por vez, e outro
   que contradiz cada valor.
8. **Paginação (API-012, RCP-030).** O link `next` só é seguido com o mesmo
   esquema, host e porta do `fhir_base_url` do registro e caminho dentro do
   caminho da base, em fronteira de segmento, depois de interpretar a URL.
   Fora disso nenhuma requisição é feita. Resposta 3xx nunca é seguida, nos
   endpoints de consentimento e na API FHIR.
   Verificação: testes `RCP-030` para outro host, outro esquema, outra
   porta, caminho fora da base e redirecionamento.
9. **`If-None-Exist` (AGD-015, AGD-017, RCP-036).** O cabeçalho vai na forma
   literal `identifier={system}|{value}`. `value` com 1 a 64 caracteres não
   reservados do RFC 3986. `system` como URL `https` com até 200 caracteres
   de `A-Z a-z 0-9 - . _ ~ : /`, sem consulta, fragmento nem `%`. Fora disso
   o agendamento é recusado antes do envio.
   Verificação: testes `RCP-036`.
10. **Link de pagamento (AGD-016, RCP-035).** `readPaymentLink(appointment)`
    devolve o endereço só da extensão de URL canônica `payment-link`, no
    nível raiz, em `valueUrl` e com esquema `https`. Link em outro elemento,
    em outro esquema ou repetido não é devolvido. A criação recusa um
    `Appointment` que já traga a extensão. Remarcação e cancelamento
    devolvem o recurso como foi lido.
    Verificação: testes `RCP-035`.
11. **Participantes e pedidos contidos (perfil `br-lab-appointment`).** Na
    criação: exatamente um participante com `actor.type` `Patient`, com a
    referência `Patient/{fhir_id}` do consentimento, e exatamente um com
    `actor.type` `Location`. O `subject` de cada pedido contido repete a
    referência do participante paciente, caractere a caractere, e, quando
    traz `type`, ele é `Patient`. Cada pedido tem `status` `active`,
    `intent` `order`, `code` com ao menos um `coding` e não leva
    `meta.versionId` nem `meta.lastUpdated`.
    Verificação: casos de recusa em `patient-api.test.ts`.
12. **Tokens de provedor (AUT-027, RCP-032, RCP-034).** Um token por escopo,
    `consent.manage` sempre sozinho. Nenhum token de acesso é usado depois de
    `expires_in`, contado do recebimento, com margem de 60 segundos. O
    endpoint de revogação de token do RFC 7009 nunca é chamado, e a
    revogação de consentimento é sempre o `DELETE`.
    Verificação: testes `RCP-032` e `RCP-034`.
13. **Alcance do preço.** `chargeItemScope(chargeItemDefinition)` lê os três
    alcances do perfil `br-lab-charge-item-definition`: unidade ou região
    (`useContext` `venue`), marca (`useContext` `brand` do sistema
    `lab-price-context`) e municípios (`jurisdiction`). Contexto de tipo
    desconhecido é sinalizado, e o preço só é dado como geral quando não traz
    contexto nenhum.
    Verificação: testes em `provider-api.test.ts`.
14. **Mapa de conformidade.** A tabela do README cobre REG-001 a REG-010 e
    RCP-001 a RCP-037, com REG-006 e RCP-014 marcados como retirados e sem
    teste. `conformance.test.ts` confere a tabela contra os nomes dos testes.
15. **Verificações.** `pnpm turbo run lint typecheck test build` no
    repositório inteiro, `pnpm format:check`, `pnpm packages:check` com o
    pacote fora da lista de publicação, e cobertura do pacote igual ou acima
    dos limiares do repositório.

### Fora de escopo da 0.2.1

- Temporizador ou agendador de repetições: o pacote é biblioteca.
- Armazenamento durável de pendências: interface no pacote, implementação no
  aplicativo.
- Busca do registro e telas do aplicativo (inclusive a da pendência).
- Qualquer mudança no guia de implementação, na especificação ou na
  publicação do pacote.
