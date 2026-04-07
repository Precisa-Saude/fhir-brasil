# Integração fhir-brasil + Medplum

Exemplo demonstrando o round-trip completo: converter resultado de laboratório → armazenar no Medplum → consultar → calcular PhenoAge.

## Pré-requisitos

- [Medplum CLI](https://www.medplum.com/docs/cli) ou instância Medplum rodando
- Node.js >= 20
- Pacotes fhir-brasil instalados

```bash
npm install @precisa-saude/fhir @precisa-saude/fhir-calculators @medplum/core @medplum/fhirtypes
```

## Fluxo

```
Resultado lab (JSON) → labResultToFHIRBundle() → Bundle FHIR R4
        ↓
  medplum.executeBatch(bundle)  →  Medplum armazena
        ↓
  medplum.searchResources('Observation', ...)  →  Consulta dados
        ↓
  phenoage.calculatePhenoAge(dados)  →  Idade biológica
```

## Uso

```typescript
import { MedplumClient } from '@medplum/core';
import { labResultToFHIRBundle } from '@precisa-saude/fhir';
import { phenoage } from '@precisa-saude/fhir-calculators';

// 1. Converter resultado para FHIR
const bundle = labResultToFHIRBundle(report, observations, profile);

// 2. Enviar para o Medplum
const medplum = new MedplumClient({ baseUrl: 'http://localhost:8103' });
await medplum.startClientLogin(clientId, clientSecret);
const batchResult = await medplum.executeBatch(bundle);

// 3. Consultar observações armazenadas
const obs = await medplum.searchResources('Observation', {
  patient: `Patient/${patientId}`,
  category: 'laboratory',
});

// 4. Extrair valores para PhenoAge
const albumin = obs.find((o) => o.code?.coding?.[0]?.code === '1751-7');
const creatinine = obs.find((o) => o.code?.coding?.[0]?.code === '2160-0');
// ... extrair todos os 9 biomarcadores necessários

// 5. Calcular PhenoAge
const result = phenoage.calculatePhenoAge({
  chronologicalAge: 45,
  albumin: albumin?.valueQuantity?.value ?? 0,
  creatinine: creatinine?.valueQuantity?.value ?? 0,
  // ... demais parâmetros
});

console.log(`Idade biológica: ${result.phenoAge}`);
```

## Executar com Medplum local

```bash
# Iniciar Medplum via Docker
npx medplum docker

# Rodar o exemplo
npx tsx examples/medplum-integration/example.ts
```

## Referências

- [Medplum — documentação](https://www.medplum.com/docs)
- [fhir-brasil — core](../../packages/core/)
- [fhir-brasil — calculadoras](../../packages/calculators/)
