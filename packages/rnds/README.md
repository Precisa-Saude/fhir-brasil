# @precisa-saude/fhir-rnds

Cliente HTTP para a RNDS (Rede Nacional de Dados em Saúde) — API FHIR R4 do DATASUS com autenticação mTLS, cache de token JWT e zero dependências runtime externas.

## Status de Produção

> **Este pacote foi testado exclusivamente contra um servidor mock** com fixtures realistas baseadas na documentação da RNDS. A validação contra a infraestrutura real da RNDS (ambientes de homologação e produção do DATASUS) **ainda não foi realizada**, pois requer:
>
> - Certificado digital **ICP-Brasil** (tipo A1 ou A3) emitido para um estabelecimento de saúde
> - **Credenciamento ativo** no Portal de Serviços DATASUS
> - CNES e CNS válidos vinculados ao certificado
>
> Se você testou este pacote contra a RNDS real, por favor [abra uma issue](https://github.com/Precisa-Saude/fhir-brasil/issues/new?template=rnds-teste-real.md) com os resultados — isso ajuda a comunidade inteira.

---

## Instalação

```bash
npm install @precisa-saude/fhir-rnds
```

> **Nota:** Requer Node.js >= 20 (fetch nativo) e `@precisa-saude/fhir` como peer dependency.

## Pré-requisitos

Para utilizar a RNDS, é necessário:

1. **Certificado digital ICP-Brasil** — arquivo `.pfx` emitido para o estabelecimento de saúde
2. **CNES** — código do Cadastro Nacional de Estabelecimentos de Saúde (7 dígitos)
3. **CNS** — Cartão Nacional de Saúde do profissional responsável (15 dígitos)
4. **Credenciamento no Portal de Serviços DATASUS** — via conta gov.br

Consulte o [guia oficial da RNDS](https://rnds-guia.saude.gov.br/docs/publico-alvo/ti/conhecer) para detalhes sobre o processo de credenciamento.

## Uso rápido

### Configurar o cliente

```ts
import { RNDSClient } from '@precisa-saude/fhir-rnds';

const client = new RNDSClient({
  certificate: './certificado.pfx', // caminho ou Buffer
  certificatePassword: process.env.RNDS_CERT_PASSWORD!,
  cnes: '1234567',
  cns: '123456789012345',
  environment: 'homologation', // ou 'production'
});
```

### Consultar paciente

```ts
// Por CPF
const patient = await client.getPatientByCpf('12345678900');
console.log(patient?.name);
// [{ family: 'Silva', given: ['João'] }]

// Por CNS
const patient2 = await client.getPatientByCns('123456789012345');
```

### Consultar estabelecimento e profissional

```ts
const org = await client.getOrganizationByCnes('1234567');
console.log(org?.name);
// 'Hospital São Paulo'

const practitioner = await client.getPractitionerByCns('123456789012345');
console.log(practitioner?.name);
// [{ family: 'Santos', given: ['Maria'] }]
```

### Enviar resultados laboratoriais

```ts
import { labResultToFHIRBundle } from '@precisa-saude/fhir';

const bundle = labResultToFHIRBundle(report, observations, profile);
const result = await client.submitBundle(bundle);
```

## Autenticação

O cliente gerencia a autenticação automaticamente:

1. Apresenta o certificado `.pfx` via mutual TLS ao endpoint de autenticação
2. Recebe um token JWT (válido por 30 minutos)
3. Cacheia o token e renova automaticamente antes de expirar
4. Deduplica requisições de renovação concorrentes

## Ambientes

| Ambiente       | Autenticação                | API                             |
| -------------- | --------------------------- | ------------------------------- |
| `homologation` | `ehr-auth-hmg.saude.gov.br` | `ehr-services.hmg.saude.gov.br` |
| `production`   | `ehr-auth.saude.gov.br`     | `ehr-services.saude.gov.br`     |

## API

### `RNDSClient`

| Método                        | Retorno                    | Descrição                                          |
| ----------------------------- | -------------------------- | -------------------------------------------------- |
| `getPatientByCpf(cpf)`        | `FHIRPatient \| null`      | Busca paciente por CPF                             |
| `getPatientByCns(cns)`        | `FHIRPatient \| null`      | Busca paciente por CNS                             |
| `getOrganizationByCnes(cnes)` | `FHIROrganization \| null` | Busca estabelecimento por CNES                     |
| `getPractitionerByCns(cns)`   | `FHIRPractitioner \| null` | Busca profissional por CNS                         |
| `submitBundle(bundle)`        | `FHIRBundle`               | Envia bundle FHIR (resultados laboratoriais, etc.) |

### Erros

| Classe                | Quando                                                  |
| --------------------- | ------------------------------------------------------- |
| `RNDSAuthError`       | Falha de autenticação (401, 403, certificado inválido)  |
| `RNDSValidationError` | Erro de validação FHIR (422), inclui `OperationOutcome` |
| `RNDSNotFoundError`   | Recurso não encontrado (404)                            |
| `RNDSError`           | Outros erros HTTP                                       |

### Tipos FHIR adicionais

O pacote exporta tipos FHIR R4 que ainda não existem no core:

- `FHIROrganization`, `FHIRPractitioner`, `FHIRIdentifier`
- `FHIROperationOutcome`, `FHIROperationOutcomeIssue`
- `RNDSSearchBundle<T>`, `RNDSTokenResponse`

## Referências

- [Guia oficial RNDS — DATASUS](https://rnds-guia.saude.gov.br/docs/conector)
- [kyriosdata/rnds](https://github.com/kyriosdata/rnds) — implementação de referência

## Aviso médico

Este pacote é uma ferramenta de integração técnica com a RNDS. Os dados acessados ou enviados **não constituem diagnóstico médico** e não substituem avaliação profissional. Consulte o [DISCLAIMER.md](../../DISCLAIMER.md) na raiz do repositório para detalhes completos.

## Licença

[Apache-2.0](../../LICENSE)
