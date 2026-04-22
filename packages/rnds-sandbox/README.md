# @precisa-saude/fhir-rnds-sandbox

> Mock local da RNDS (Rede Nacional de Dados em Saúde) — endpoints FHIR R4
> com cenários sintéticos para desenvolvimento, ensino e demos.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

Sem certificado ICP-Brasil. Sem credenciamento DATASUS. Roda em segundos.

## Por que existe

Testar uma integração com a RNDS em produção exige certificado ICP-Brasil
(SERPRO/AC) e homologação no DATASUS — meses de papelada. Esse atrito trava
hackathons, aulas, PoCs e a adoção de qualquer cliente RNDS, inclusive o
nosso (`@precisa-saude/fhir-rnds`).

`rnds-sandbox` é um servidor HTTP leve que implementa o subset de endpoints
FHIR R4 que clientes RNDS usam de fato — busca de paciente por CPF/CNS,
consulta de organização (CNES) e profissional (CNS), e submissão de Bundle.
Os dados são sintéticos, claramente falsos e versionados em cenários
nomeados.

## Instalação

```bash
npx @precisa-saude/fhir-rnds-sandbox start
```

Ou como dependência:

```bash
pnpm add -D @precisa-saude/fhir-rnds-sandbox
```

## Uso — CLI

```bash
# sobe na porta padrão 8080 com cenário "paciente-com-exames"
rnds-sandbox start

# escolhe cenário e porta
rnds-sandbox start --port 9000 --scenario internacao

# habilita mTLS (cliente precisa apresentar certificado)
rnds-sandbox start --mtls --pfx ./dev-cert.pfx --pfx-password senha

# lista cenários disponíveis
rnds-sandbox scenarios
```

## Uso — programático

```ts
import { createSandboxServer } from '@precisa-saude/fhir-rnds-sandbox';

const sandbox = createSandboxServer({
  scenario: 'paciente-com-exames',
  port: 0, // porta efêmera — útil em testes
});

const { host, port } = await sandbox.start();
console.log(`sandbox em http://${host}:${port}`);

// ... rode seus testes ...

await sandbox.stop();
```

## Cenários

| Nome | Descrição |
| ---- | --------- |
| `paciente-com-exames` | Joana da Silva, 42 anos, com lipidograma + glicemia codificados em LOINC. (padrão) |
| `internacao` | Carlos Souza, 67, internado por insuficiência cardíaca (CID I50.0), com NT-proBNP e troponina. |
| `vacina` | Pedro Almeida, 8 anos, com calendário vacinal aplicado (BCG, hepatite B, tríplice viral). |
| `vazio` | Estado limpo. Útil para testar fluxos do zero. |

Identificadores sintéticos usados nos cenários:

| CPF | CNS | Cenário |
| --- | --- | ------- |
| `12345678901` | `700000000000001` | paciente-com-exames |
| `98765432100` | `700000000000020` | internacao |
| _(sem CPF)_ | `700000000000040` | vacina |

CNES dos estabelecimentos: `2345678` (lab), `3456789` (hospital), `4567890` (UBS).

### Exemplos por cenário

Todos os exemplos assumem o sandbox rodando em `http://127.0.0.1:8080`. Os
campos `submittedBundles` listados em cada cenário ficam disponíveis via
`sandbox.store.getSubmittedBundles()` na API programática (ou seja, são
"histórico" do paciente — o cliente os consome via outras consultas, não
por um endpoint dedicado).

#### `paciente-com-exames` (padrão)

```bash
rnds-sandbox start
```

Buscar paciente por CPF:

```bash
$ curl -s "http://127.0.0.1:8080/api/fhir/r4/Patient?identifier=$(printf 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|12345678901' | jq -sRr @uri)"
```

```json
{
  "resourceType": "Patient",
  "id": "700000000000001",
  "identifier": [
    { "system": "http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf", "value": "12345678901" },
    { "system": "http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns", "value": "700000000000001" }
  ],
  "name": [{ "family": "Silva", "given": ["Joana", "Maria", "da"] }],
  "gender": "female",
  "birthDate": "1983-08-12"
}
```

Histórico pré-carregado (Bundle de lipidograma + glicemia, todas as
Observations codificadas em LOINC):

| LOINC | Biomarcador | Valor |
| ----- | ----------- | ----- |
| `2093-3` | Colesterol total | 198 mg/dL |
| `2089-1` | LDL-Colesterol | 124 mg/dL |
| `2085-9` | HDL-Colesterol | 56 mg/dL |
| `2345-7` | Glicose | 96 mg/dL |

Submeter um novo Bundle (resposta abaixo):

```bash
$ curl -s -X POST http://127.0.0.1:8080/api/fhir/r4/Bundle \
    -H "Content-Type: application/fhir+json" \
    -d '{"resourceType":"Bundle","type":"transaction","entry":[{"request":{"method":"POST","url":"Observation"},"resource":{"resourceType":"Observation","status":"final","code":{"coding":[{"system":"http://loinc.org","code":"2345-7","display":"Glicose"}]},"valueQuantity":{"value":102,"unit":"mg/dL","system":"http://unitsofmeasure.org","code":"mg/dL"}}}]}'
```

```json
{
  "resourceType": "Bundle",
  "type": "transaction-response",
  "entry": [{ "response": { "status": "201 Created", "location": "Resource/sandbox-1" } }]
}
```

#### `internacao`

```bash
rnds-sandbox start --scenario internacao
```

Buscar paciente por CNS:

```bash
$ curl -s http://127.0.0.1:8080/api/fhir/r4/Patient/700000000000020
```

```json
{
  "resourceType": "Patient",
  "id": "700000000000020",
  "identifier": [
    { "system": "http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf", "value": "98765432100" },
    { "system": "http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns", "value": "700000000000020" }
  ],
  "name": [{ "family": "Souza", "given": ["Carlos", "Henrique"] }],
  "gender": "male",
  "birthDate": "1958-02-28"
}
```

Buscar o hospital (Organization) pelo CNES:

```bash
$ curl -s http://127.0.0.1:8080/api/fhir/r4/Organization/3456789
```

```json
{
  "resourceType": "Organization",
  "id": "3456789",
  "active": true,
  "identifier": [
    { "system": "http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes", "value": "3456789" }
  ],
  "name": "Hospital Sintético do Coração (sandbox)"
}
```

Histórico pré-carregado:

| Recurso | Detalhe |
| ------- | ------- |
| `Encounter` | classe `IMP` (inpatient), iniciado em 2026-04-15 |
| `Condition` | CID-10 `I50.0` (Insuficiência cardíaca congestiva) |
| `Observation` LOINC `33762-6` | NT-proBNP — 4820 pg/mL |
| `Observation` LOINC `49563-0` | Troponina I — 0.08 ng/mL |

#### `vacina`

```bash
rnds-sandbox start --scenario vacina
```

Buscar o paciente pediátrico:

```bash
$ curl -s http://127.0.0.1:8080/api/fhir/r4/Patient/700000000000040
```

```json
{
  "resourceType": "Patient",
  "id": "700000000000040",
  "identifier": [
    { "system": "http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns", "value": "700000000000040" }
  ],
  "name": [{ "family": "Almeida", "given": ["Pedro", "Lima"] }],
  "gender": "male",
  "birthDate": "2017-11-04"
}
```

Histórico pré-carregado (3 `Immunization`, sistema PNI/CVP
`urn:oid:2.16.840.1.113883.6.59`):

| Vacina | Código | Data |
| ------ | ------ | ---- |
| BCG | `BCG` | 2017-11-05 |
| Hepatite B (RN) | `HBV` | 2017-11-05 |
| Tríplice viral (SCR) | `MMR` | 2018-12-12 |

#### `vazio`

```bash
rnds-sandbox start --scenario vazio
```

Toda consulta de leitura retorna `404 OperationOutcome`. Útil para
exercitar o caminho de erro do cliente:

```bash
$ curl -s -i http://127.0.0.1:8080/api/fhir/r4/Patient/700000000000001 | head -1
HTTP/1.1 404 Not Found
```

```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "not-found",
      "diagnostics": "Paciente CNS 700000000000001 não encontrado"
    }
  ]
}
```

## Endpoints

Compatível com o subset usado por `@precisa-saude/fhir-rnds`:

| Método | Path | Auth (modo strict) | Descrição |
| ------ | ---- | ------------------ | --------- |
| `POST` | `/api/token` | mTLS (cert do cliente) | Emite token JWT assinado em RS256. |
| `GET`  | `/.well-known/jwks.json` | público | Chave pública (JWK) usada para verificar a assinatura do token. |
| `GET`  | `/api/fhir/r4/Patient?identifier={system}\|{value}` | bearer + CNS | Busca por CPF (`.../cpf`) ou CNS (`.../cns`). |
| `GET`  | `/api/fhir/r4/Patient/{cns}` | bearer + CNS | Lê paciente por CNS. |
| `GET`  | `/api/fhir/r4/Organization/{cnes}` | bearer + CNS | Lê estabelecimento por CNES. |
| `GET`  | `/api/fhir/r4/Practitioner/{cns}` | bearer + CNS | Lê profissional por CNS. |
| `POST` | `/api/fhir/r4/Bundle` | bearer + CNS | Aceita Bundle transaction/batch e retorna transaction-response. |

Em modo **permissivo** (padrão sem flags) nenhum auth é exigido — qualquer
curl entra. Recursos não encontrados retornam `404` com `OperationOutcome`.
Endpoints FHIR exigem dois headers em modo strict (igual à API real):

- `X-Authorization-Server: Bearer <jwt>` — token RS256 emitido pelo sandbox
- `Authorization: <CNS>` — CNS de 15 dígitos do profissional requisitante

## Modos de fidelidade

O sandbox tem três modos. Escolha o que combina com o que você quer
demonstrar/testar:

| Modo | Como ativar | Comportamento |
| ---- | ----------- | ------------- |
| **Permissivo** | (sem flags) | HTTP puro, qualquer chamada aceita. Útil para curl, aulas e iteração rápida. |
| **Strict** | `--strict` | HTTP, mas /api/fhir/r4/* exige bearer + CNS, e /api/token exige cert mTLS apresentado (rejeita sem). Útil para validar a lógica de auth do cliente sem precisar configurar TLS. |
| **mTLS** | `--mtls` (implica strict) | HTTPS com handshake mTLS opcional do cliente. Réplica fiel da RNDS: cert exigido em /api/token; FHIR API exige bearer. |

### JWT — RS256 com JWKS

O token é um JWT RS256 real, assinado com uma chave RSA-2048. Por padrão
a chave é gerada **efêmera** no boot — bom para devs que rodam o sandbox
em sessões curtas. Em CI/demos onde você quer reusar o mesmo token entre
restarts, passe `--jwt-private-key`:

```bash
# gere uma chave estável (uma vez)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt.pem

rnds-sandbox start --strict --jwt-private-key ./jwt.pem
```

A chave pública é exposta via `/.well-known/jwks.json`. Bibliotecas de JWT
(`jose`, `jsonwebtoken`, `jwt.io` com a URL do JWKS) podem verificar a
assinatura sem configuração fora-de-banda:

```bash
$ curl -s http://127.0.0.1:8080/.well-known/jwks.json | jq
{
  "keys": [
    {
      "alg": "RS256",
      "e": "AQAB",
      "kid": "rnds-sandbox-1",
      "kty": "RSA",
      "n": "qdg8rAyVCT0s7UA4YM_j6fjjLt_-0huK7sQyLT...",
      "use": "sig"
    }
  ]
}
```

### mTLS na prática

Você precisa de um cert para o **servidor**. Qualquer cert auto-assinado
serve, ou use o que já tiver (cert ICP-Brasil de homologação, por
exemplo). O sandbox aceita certs de cliente sem validar a CA
(`rejectUnauthorized: false`) — propósito: dev, não produção.

```bash
# 1. Gere cert auto-assinado para o servidor (uma vez)
openssl req -newkey rsa:2048 -nodes -keyout srv.key -x509 \
  -days 365 -out srv.crt -subj "/CN=rnds-sandbox.local"

# 2. Suba com mTLS — aceita PFX OU key+cert PEM
rnds-sandbox start --mtls --server-key ./srv.key --server-cert ./srv.crt

# (alternativa) PFX:
openssl pkcs12 -export -out srv.pfx -inkey srv.key -in srv.crt -password pass:dev
rnds-sandbox start --mtls --pfx ./srv.pfx --pfx-password dev
```

Para apresentar um cert de cliente no curl (e receber CN/CNES embutidos
no token):

```bash
# Gere um cert de cliente que embute CNES "1234567" no CN
openssl req -newkey rsa:2048 -nodes -keyout client.key -x509 \
  -days 365 -out client.crt \
  -subj "/CN=PRECISA SAUDE LTDA:1234567"

# Pega token via mTLS — note --cacert + --cert
TOKEN=$(curl -sk \
  --cert client.crt --key client.key \
  -X POST https://127.0.0.1:8443/api/token | jq -r .access_token)

# Decodifique para conferir cn/cnes nas claims (jwt.io ou jq):
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq
# → { "iss": "...", "sub": "PRECISA SAUDE LTDA:1234567",
#     "cnes": "1234567", "cn": "PRECISA SAUDE LTDA:1234567", ... }

# Use o token + CNS do profissional na chamada FHIR:
curl -sk https://127.0.0.1:8443/api/fhir/r4/Patient/700000000000001 \
  -H "X-Authorization-Server: Bearer $TOKEN" \
  -H "Authorization: 700000000000010"
```

## Docker

```bash
docker run --rm -p 8080:8080 ghcr.io/precisa-saude/fhir-rnds-sandbox:latest
```

Escolha cenário e porta:

```bash
docker run --rm -p 9000:9000 ghcr.io/precisa-saude/fhir-rnds-sandbox:latest \
  start --port 9000 --scenario internacao
```

## Aviso de produção

Este pacote é estritamente para **desenvolvimento, testes e ensino**.
Tokens são RS256-assinados, mas com chave gerada localmente (não da RNDS)
— a assinatura é cryptograficamente válida no escopo do sandbox e nada
mais. Dados são sintéticos. Não submeta dados de pacientes reais a este
servidor — ele apenas armazena em memória e perde o estado quando
reinicia.

## Aviso médico

Os recursos FHIR retornados pelo sandbox **não constituem** registros de
saúde reais. Cenários são fictícios e ilustrativos. Não use para tomar
decisões clínicas.

## Licença

Apache-2.0 © Precisa Saúde
