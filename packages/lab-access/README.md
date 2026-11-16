# @precisa-saude/fhir-lab-access

Cliente do lado do receptor para o protocolo Open Labs Brasil: o backend de um aplicativo voltado ao paciente acessa catálogo, unidades, agenda, agendamento e resultados de um laboratório, com o consentimento que o paciente dá na página do próprio laboratório.

## Situação

> **Rascunho. Não use em produção.**
>
> - Implementa a versão **0.2.0** de uma especificação que **ainda não foi publicada**. Enquanto a versão começar com 0, qualquer mudança da especificação pode quebrar este pacote.
> - **Nunca foi testado contra um laboratório real.** Todos os testes rodam contra um provedor simulado em memória, escrito a partir do texto da especificação.
> - O pacote é **privado** (`"private": true`) e não está no npm. Ele só será publicado depois que a especificação for aberta.
> - Os perfis FHIR que o protocolo referencia ainda estão sendo escritos. Os tipos locais deste pacote cobrem só os elementos que o cliente lê.

---

## Instalação

O pacote não está publicado. Dentro deste monorepo, ele entra como dependência de workspace:

```json
{
  "dependencies": {
    "@precisa-saude/fhir-lab-access": "workspace:^"
  }
}
```

Requer Node.js 22.12 ou superior. O pacote tem uma dependência externa de runtime, [`jose`](https://github.com/panva/jose), usada para assinar a asserção do cliente, verificar a assinatura do registro e calcular thumbprints de chave. A `jose` 6 é distribuída só como módulo ES: a saída CommonJS deste pacote depende de o Node carregar módulos ES com `require`, o que vale a partir da versão 22.12.

## O que o receptor precisa ter

1. Uma entrada ativa no registro de participantes, com `client_id`, `redirect_uris` e certificado de transporte.
2. Um par de chaves RSA de assinatura (2048 bits ou mais), com a chave pública no `jwks_uri` informado no registro.
3. Um certificado de cliente TLS, com chave distinta da chave de assinatura.
4. O conjunto de chaves inicial do registro, recebido na admissão.

Chaves privadas e refresh tokens ficam só no backend. Este pacote não roda em navegador nem em aplicativo móvel.

## Uso rápido

### Verificar o registro e criar o cliente

```ts
import { readFileSync } from 'node:fs';
import { createPrivateKey } from 'node:crypto';
import {
  createMtlsTransport,
  LabAccessClient,
  verifyRegistry,
} from '@precisa-saude/fhir-lab-access';

// Bytes exatos dos dois arquivos, como baixados. A busca é do aplicativo:
// o endereço de publicação do registro ainda não foi definido.
const { registry } = await verifyRegistry({
  registry: readFileSync('participantes.json'),
  signature: readFileSync('participantes.json.jws', 'utf-8'),
  // Primeiro documento: conjunto de chaves inicial recebido na admissão.
  // Nos seguintes: { current: registroAnterior }.
  trust: { initialKeys },
});

const client = new LabAccessClient({
  clientId: 'c2b8f6a4-71de-4c0b-8f3a-9e5d2a7b6c31',
  registry,
  signingKey: {
    key: createPrivateKey(readFileSync('assinatura.key.pem')),
    kid: 'kid-publicado-no-jwks-uri',
  },
  transport: createMtlsTransport({
    cert: readFileSync('transporte.crt.pem'),
    key: readFileSync('transporte.key.pem'),
  }),
});
```

`verifyRegistry` é o único caminho para obter um registro: não existe carga sem conferência de assinatura. Quando chegar um documento novo, verifique com `trust: { current: client.registry }` e entregue o resultado a `client.updateRegistry(...)`.

### Catálogo, unidades e agenda (sem paciente)

```ts
const lab = client.provider('5f0c7c0e-3d1a-4b7e-9a51-2f6d8c1e4a10');

let page = await lab.searchActivityDefinitions({ count: 100, status: 'active' });
while (page) {
  salvarExames(page.resources);
  page = await page.next();
}

const unidades = await lab.searchLocations({ addressCity: 'Porto Alegre', status: 'active' });
const agendas = await lab.searchSchedules({ active: true, location: 'unidade-norte' });
const horarios = await lab.searchSlots({
  schedule: agendas.resources[0].id,
  serviceTypes: [{ code: '718-7', system: 'http://loinc.org' }],
  start: { from: '2026-11-20', to: '2026-11-27' },
  status: 'free',
});
```

### Jornada de consentimento

```ts
// 1. Criar o consentimento. A criação não identifica o paciente.
const consent = await lab.createConsent({
  expirationDateTime: '2027-05-15T03:00:00Z',
  purpose: 'Guardar os resultados dos seus exames no seu histórico pessoal.',
  scopes: ['appointment.write', 'results.read', 'consent.read'],
});

// 2. Abrir a jornada: PAR com PKCE e state.
const journey = await lab.startAuthorization({
  consent,
  redirectUri: 'https://app-paciente.example/conexoes/retorno',
});
// Guarde `journey` no backend, ligado à sessão do paciente.
// Abra `journey.authorizationUrl` no navegador do sistema, nunca em WebView.

// 3. No retorno ao redirect_uri: conferir, trocar o código e conferir o titular.
// PatientMismatchError vem de '@precisa-saude/fhir-lab-access'.
try {
  const access = await lab.completeAuthorization({
    callback: urlDeRetornoCompleta,
    expectedCpf: cpfDoPacienteNoAplicativo,
    journey,
    onTokensUpdated: (state) => guardarCifrado(state),
  });
  guardarCifrado(access.exportState());
} catch (error) {
  if (error instanceof PatientMismatchError) {
    // A conta usada no laboratório é de outra pessoa. O consentimento já foi
    // revogado e os tokens descartados. Se `error.revocation` for "pending",
    // repita `lab.revokeConsent(error.consentId, 'PATIENT_MISMATCH')`.
  }
  throw error;
}
```

`completeAuthorization` só devolve o acesso depois de ler o consentimento com o token de paciente e comparar o CPF devolvido pelo laboratório com `expectedCpf`. O CPF recebido não aparece em nenhum retorno, erro ou evento.

### Resultados e agendamento (com paciente)

```ts
const access = lab.resumePatientAccess(estadoGuardado, {
  onTokensUpdated: (state) => guardarCifrado(state),
});

const laudos = await access.searchDiagnosticReports({
  lastUpdatedAfter: ultimaSincronizacao,
});
// laudos.resources: DiagnosticReport. laudos.included: Observation.

// O aplicativo monta o Appointment, com os pedidos de exame em `contained`.
const criado = await access.createAppointment(appointment);
// Repetir a mesma chamada depois de uma falha de rede não duplica o agendamento.

const lido = await access.readAppointment(criado.resource.id);
await access.rescheduleAppointment({
  current: lido.resource,
  end: '2026-11-24T09:15:00-03:00',
  etag: lido.etag,
  slot: 'horario-24nov-09h',
  start: '2026-11-24T09:00:00-03:00',
});

// Revogar quando o paciente pedir. Os tokens são descartados mesmo se a chamada falhar.
await access.revoke();
```

> **Nota:** o cliente cuida do transporte (mTLS, tokens, cabeçalhos, repetição e os endpoints do protocolo) e não monta nem ajusta conteúdo clínico. `createAppointment` envia o `Appointment` como recebido, depois de conferir as regras estruturais que o protocolo exige do receptor. Na remarcação e no cancelamento, troca só `slot`, `start`, `end`, `status` e `cancelationReason`. O link de pagamento que o laboratório devolve fica dentro do recurso: a extensão que o carrega ainda não foi definida pelo guia de implementação, e este pacote não a lê. O aplicativo abre o link no navegador do sistema, sem alterar a URL.

## Propriedades de segurança

- **Nenhuma credencial de paciente.** O pacote não aceita, não guarda e não transmite senha do laboratório, código de uso único, cookie de sessão nem qualquer outra credencial do paciente. Não existe função, opção ou campo para isso. O paciente se autentica só na página do laboratório, aberta no navegador do sistema.
- **mTLS em toda chamada entre servidores.** O transporte padrão apresenta o certificado de cliente, exige TLS 1.2 ou superior, oferece no TLS 1.2 só as quatro suítes que o protocolo admite e sempre confere o certificado do servidor. Não há opção para desligar a conferência.
- **Cliente autenticado por `private_key_jwt`.** Asserção assinada com PS256, com o `issuer` do laboratório como `aud` em texto simples, `jti` novo a cada chamada e validade de 60 segundos.
- **Autorização só por PAR, com PKCE `S256` e `state`.** A URL aberta no navegador leva apenas `client_id` e `request_uri`.
- **Retorno conferido antes da troca do código.** `iss` idêntico ao `issuer` do laboratório da jornada, também nas respostas de erro, e `state` igual ao enviado.
- **Conferência do titular.** A primeira chamada depois dos tokens é a leitura do consentimento. Com CPF divergente, o consentimento é revogado com `PATIENT_MISMATCH`, os tokens são descartados e nenhuma chamada à API FHIR acontece.
- **Endereços só do registro e dos metadados.** O `issuer` vem do registro assinado, os endpoints OAuth vêm do documento de metadados desse `issuer`, e o link de próxima página só é seguido dentro da base FHIR do registro.
- **Token só no cabeçalho `Authorization`.** Nunca na URL.
- **Erros e eventos sem dado pessoal.** Mensagens de erro e eventos de `onInteraction` não carregam token nem CPF.

O que fica com o aplicativo: guardar refresh tokens cifrados em repouso, manter chaves privadas no backend, abrir a autorização e o link de pagamento no navegador do sistema, buscar o registro ao menos a cada 60 minutos, consultar o estado de cada consentimento autorizado ao menos a cada 24 horas, oferecer ao paciente a tela de consentimentos e não gravar CPF em log.

## API

### `verifyRegistry(input)`

Verifica um candidato a registro: chave pelo `kid`, assinatura PS256 de conteúdo destacado sobre os bytes recebidos, schema, `sequence`, `issued_at` e `expires_at`. Devolve `{ registry, changed }` ou lança `RegistryVerificationError` com o motivo em `reason`.

### `LabAccessClient`

| Membro                     | Descrição                                     |
| -------------------------- | --------------------------------------------- |
| `providers()`              | Provedores ativos no registro em uso          |
| `provider(participantId)`  | Acesso a um provedor (`ProviderAccess`)       |
| `registry`                 | O registro em uso                             |
| `updateRegistry(registry)` | Passa a usar um documento novo, já verificado |

### `ProviderAccess`

| Método                                                                                 | Escopo           |
| -------------------------------------------------------------------------------------- | ---------------- |
| `searchActivityDefinitions`, `readActivityDefinition`                                  | `catalog.read`   |
| `searchChargeItemDefinitions`, `readChargeItemDefinition`                              | `catalog.read`   |
| `searchLocations`, `readLocation`, `searchHealthcareServices`, `readHealthcareService` | `locations.read` |
| `searchSchedules`, `readSchedule`, `searchSlots`, `readSlot`                           | `schedule.read`  |
| `createConsent`, `getConsent`, `revokeConsent`                                         | `consent.manage` |
| `startAuthorization`, `completeAuthorization`, `resumePatientAccess`                   | (jornada)        |
| `getCapabilityStatement`                                                               | (sem token)      |

### `PatientAccess`

| Método                                                                                     | Escopo                     |
| ------------------------------------------------------------------------------------------ | -------------------------- |
| `createAppointment`, `readAppointment`, `searchAppointments`                               | `appointment.write`        |
| `rescheduleAppointment`, `cancelAppointment`                                               | `appointment.write`        |
| `searchDiagnosticReports`, `readDiagnosticReport`, `searchObservations`, `readObservation` | `results.read`             |
| `searchConsents`, `readConsent`                                                            | `consent.read`             |
| `readPatient`, `getConsentRecord`                                                          | qualquer token de paciente |
| `revoke`, `discard`, `exportState`                                                         | (tokens)                   |

As buscas devolvem uma página com `resources`, `included`, `outcomes`, `bundle` e `next()`.

### Erros

Todos estendem `LabAccessError`, que traz `retry` (o que precisa acontecer para repetir) e `retryable`.

| Classe                                              | Quando                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `RegistryVerificationError`                         | Candidato a registro recusado                                                              |
| `RegistryExpiredError`                              | O registro em uso expirou e a operação está suspensa                                       |
| `ProviderUnavailableError`, `ReceiverStatusError`   | Provedor ausente, inativo ou sem versão em comum. Receptor não ativo                       |
| `ProviderMetadataError`, `IssuerMismatchError`      | Metadados fora do perfil. `issuer` diferente do esperado                                   |
| `OAuthError`                                        | Erro JSON do PAR ou do endpoint de token (`invalid_client`, `invalid_grant`, ...)          |
| `StateMismatchError`, `AuthorizationResponseError`  | Retorno da autorização recusado                                                            |
| `AuthorizationDeniedError`                          | O laboratório devolveu `error` no retorno (`access_denied`, ...)                           |
| `PatientMismatchError`, `HolderVerificationError`   | Titular divergente, ou conferência do titular impossível                                   |
| `ConsentEndedError`, `RefreshTokenRevokedError`     | O consentimento saiu de `AUTHORISED`, ou o refresh token foi revogado isoladamente         |
| `RevocationPendingError`, `TokensDiscardedError`    | Revogação não confirmada. Acesso já descartado                                             |
| `LabAccessAuthorizationError`                       | Token, certificado, escopo (seção 6.3.1 da especificação)                                  |
| `LabAccessRequestError`                             | Requisição malformada, recurso inexistente (6.3.2)                                         |
| `LabAccessConsentError`                             | Regras do consentimento (6.3.3)                                                            |
| `LabAccessSchedulingError`                          | Agenda e agendamento: `SLOT_UNAVAILABLE`, `VERSION_CONFLICT`, ... (6.3.4)                  |
| `LabAccessOperationalError`                         | `RATE_LIMITED`, `INTERNAL_ERROR`, `PROVIDER_UNAVAILABLE`, `UPSTREAM_TIMEOUT` (6.3.5)       |
| `LabAccessApiError`                                 | Base das cinco anteriores. Também usada para código desconhecido, tratado pelo status HTTP |
| `LabAccessTransportError`, `LabAccessProtocolError` | Falha de rede ou TLS. Resposta fora do formato do protocolo                                |
| `LabAccessConfigError`, `ScopeError`                | Argumento ou configuração inválida. Escopo que a chamada não pode usar                     |

Os erros com `OperationOutcome` trazem `status`, `code` (o código do protocolo), `issueCode`, `operationOutcome`, `interactionId` e `retryAfterSeconds`.

Repetição automática: leituras, `DELETE` de consentimento, criação condicional de agendamento e `PUT` com `If-Match` são repetidos em `429` e `503` (esperando o `Retry-After`) e em `500`, `504` e falha de rede (recuo a partir de 1 segundo, dobrando), até 3 tentativas. Erros 4xx não são repetidos. A criação de consentimento e a troca do código de autorização nunca são repetidas sozinhas.

### Tipos FHIR

`DiagnosticReport`, `Observation`, `Patient` e `Consent` usam os tipos de `@precisa-saude/fhir`. Os recursos abaixo ainda não existem no core e têm tipos mínimos locais, que deveriam migrar para lá:

- `FHIRAppointment`, `FHIRServiceRequest`, `FHIRSlot`, `FHIRSchedule`
- `FHIRLocation`, `FHIRHealthcareService`
- `FHIRActivityDefinition`, `FHIRChargeItemDefinition`
- `FHIROperationOutcome`, `FHIROperationOutcomeIssue` (hoje duplicados no `fhir-rnds`)
- `FHIRSearchBundle`, `FHIRSearchBundleEntry`, `FHIRBundleLink`, `FHIRCapabilityStatement`

## Conformidade

A tabela liga cada requisito do receptor, e os de registro que valem para o receptor, do capítulo de conformidade da especificação 0.2.0 aos testes deste pacote. Um teste em `src/__tests__/conformance.test.ts` confere que a tabela e os nomes dos testes batem.

Situações:

- **Coberto**: o comportamento inteiro é do pacote e tem teste.
- **Parcial**: o pacote garante uma parte, testada, e o resto depende do aplicativo.
- **Fora do alcance**: o requisito fala de telas, do aplicativo móvel ou de armazenamento. Uma biblioteca de backend não tem como prová-lo.

Nenhum destes testes roda contra um laboratório real.

<!-- conformidade:início -->

| Id      | Situação        | Teste, ou o que falta                                                                                                                                                                                                                                                                               |
| ------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REG-001 | Coberto         | `REG-001: recusa registro sem assinatura`, `REG-001: recusa registro com um byte alterado`, `REG-001: recusa assinatura adulterada`, `REG-001: recusa assinatura feita com chave fora do conjunto de confiança`, `REG-001: não aceita outro algoritmo além de PS256`                                |
| REG-002 | Coberto         | `REG-002: candidato com sequence anterior à do documento em uso é recusado`                                                                                                                                                                                                                         |
| REG-003 | Coberto         | `REG-003: schema`                                                                                                                                                                                                                                                                                   |
| REG-004 | Fora do alcance | A busca periódica do registro é do aplicativo: o endereço de publicação ainda não existe. O pacote só expõe os intervalos (`REG-004: expõe os intervalos de busca do registro (ao menos a cada 60 minutos)`)                                                                                        |
| REG-005 | Parcial         | `REG-005: provedor suspenso ou retirado deixa de ser oferecido`, `REG-005: provedor suspenso em um registro novo deixa de ser chamado`. O prazo de 60 minutos depende de o aplicativo buscar o registro                                                                                             |
| REG-006 | Coberto         | `REG-006: com o registro expirado, não pede novo token client_credentials`, `REG-006: com o registro expirado, não abre nova autorização`, `REG-006: com o registro expirado, a renovação segue por até 7 dias e depois para`                                                                       |
| RCP-001 | Parcial         | `RCP-001: o pacote nunca busca a URL de autorização: ela é só devolvida para o navegador do sistema`. Abrir em agente de usuário externo, e não em WebView, é do aplicativo                                                                                                                         |
| RCP-002 | Parcial         | `RCP-002: nenhuma requisição da jornada completa leva campo de credencial do paciente`, `RCP-002: a API pública não tem função, método ou opção para credencial do paciente`, `RCP-002: só usa as três concessões do protocolo, nunca password`. Telas e armazenamento do aplicativo pedem inspeção |
| RCP-003 | Coberto         | `RCP-003: a URL aberta no navegador tem dois parâmetros, client_id e request_uri`                                                                                                                                                                                                                   |
| RCP-004 | Coberto         | `RCP-004: cada jornada tem o próprio code_verifier, com desafio S256`, `RCP-004: calcula o code_challenge S256 do exemplo do RFC 7636, apêndice B`                                                                                                                                                  |
| RCP-005 | Coberto         | `RCP-005: retorno com state trocado ou ausente é recusado antes da troca do código`                                                                                                                                                                                                                 |
| RCP-006 | Coberto         | `RCP-006: retorno sem iss, ou com iss de outro servidor, é recusado e o código fica sem troca`, `RCP-006: o iss é conferido mesmo quando o retorno traz error`                                                                                                                                      |
| RCP-007 | Coberto         | `RCP-007: o aud da asserção é o issuer do provedor, em texto e não em lista`, `RCP-007: o provedor de teste recebe a asserção com aud igual ao issuer`                                                                                                                                              |
| RCP-008 | Coberto         | `RCP-008: metadados com issuer diferente do registro derrubam o provedor`                                                                                                                                                                                                                           |
| RCP-009 | Coberto         | `RCP-009: os endpoints entre servidores vêm de mtls_endpoint_aliases quando o documento os traz`, `RCP-009: o pedido de token vai para o alias mTLS anunciado`                                                                                                                                      |
| RCP-010 | Coberto         | `RCP-010: refresh token trocado na renovação substitui o anterior nas chamadas seguintes`                                                                                                                                                                                                           |
| RCP-011 | Coberto         | `RCP-011: a criação do consentimento envia só finalidade, escopos, expiração e período, sem dado de paciente`, `RCP-011: nenhum campo do PAR identifica o paciente`                                                                                                                                 |
| RCP-012 | Coberto         | `RCP-012: a leitura do consentimento com o token de paciente vem logo depois da troca do código, antes de qualquer recurso FHIR`                                                                                                                                                                    |
| RCP-013 | Coberto         | `RCP-013: titular divergente termina em revogação com PATIENT_MISMATCH, sem acesso à API FHIR e sem tokens`, `RCP-013: o erro não carrega token nem nenhum dos dois CPFs`                                                                                                                           |
| RCP-014 | Parcial         | `RCP-014: a revogação por divergência é reenviada depois de falha, sem tocar nos tokens de paciente`, `RCP-014: se o DELETE não é confirmado, avisa que a revogação está pendente`. O pacote repete até 3 vezes. Depois disso quem repete é o aplicativo                                            |
| RCP-015 | Parcial         | `RCP-015: os eventos de auditoria não carregam CPF nem token`, `RCP-015: o CPF recebido não fica no acesso devolvido nem no estado exportado`. Os logs do aplicativo pedem inspeção                                                                                                                 |
| RCP-016 | Coberto         | `RCP-016: duas chamadas nunca compartilham o mesmo x-fapi-interaction-id`, `RCP-016: a repetição de uma chamada também leva identificador novo`                                                                                                                                                     |
| RCP-017 | Coberto         | `RCP-017: revogar pelo aplicativo vira DELETE do consentimento, feito com token de provedor`, `RCP-017: com o provedor fora do ar, os tokens ficam descartados do mesmo jeito`                                                                                                                      |
| RCP-018 | Parcial         | `RCP-018: renovação recusada com invalid_grant leva à leitura do consentimento e a um erro com o estado atual`, `RCP-018: invalid_grant com consentimento AUTHORISED indica refresh token revogado`. Mostrar o estado ao paciente é do aplicativo                                                   |
| RCP-019 | Fora do alcance | A consulta periódica é do aplicativo. O pacote oferece `getConsent` e o intervalo (`RCP-019: expõe o intervalo máximo de 24 horas entre consultas de estado do consentimento`)                                                                                                                      |
| RCP-020 | Coberto         | `RCP-020: em 429 e 503, espera o tempo de Retry-After antes de tentar de novo`, `RCP-020: resposta 4xx encerra a chamada na primeira tentativa`                                                                                                                                                     |
| RCP-021 | Coberto         | `RCP-021: criação repetida que recebe 200 devolve o agendamento que já existia`, `RCP-021: exige identificador único do receptor para a criação condicional`                                                                                                                                        |
| RCP-022 | Parcial         | `RCP-022: o pacote não busca nem altera o link de pagamento do agendamento`. Abrir o link no navegador do sistema é do aplicativo                                                                                                                                                                   |
| RCP-023 | Fora do alcance | Onde ficam chaves privadas e refresh tokens é decisão de implantação. Pede inspeção do pacote do aplicativo e do tráfego                                                                                                                                                                            |
| RCP-024 | Fora do alcance | Tela do aplicativo com os consentimentos e a opção de revogar                                                                                                                                                                                                                                       |
| RCP-025 | Fora do alcance | Destino dos resultados dentro do aplicativo. Pede inspeção do fluxo de dados                                                                                                                                                                                                                        |
| RCP-026 | Coberto         | `RCP-026: campos que o cliente não conhece são deixados de lado na leitura do consentimento`                                                                                                                                                                                                        |

<!-- conformidade:fim -->

Os demais grupos do capítulo de conformidade (`SEG`, `AUT`, `CNS`, `API`, `CAT`, `UNI`, `AGE`, `AGD`, `RES`, `ERR`) são requisitos do provedor e não se aplicam a este pacote.

## Aviso médico

Este pacote é uma ferramenta de integração técnica. Os dados acessados ou enviados **não constituem diagnóstico médico** e não substituem avaliação profissional. Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositório para detalhes completos.

## Licença

[Apache-2.0](../../LICENSE)
