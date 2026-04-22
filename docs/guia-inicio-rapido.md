# Guia de Início Rápido

Este guia mostra como instalar e usar os pacotes do fhir-brasil para trabalhar com dados laboratoriais no padrão FHIR R4 no contexto brasileiro.

## Instalação

Os pacotes estão disponíveis no npm com o escopo `@precisa-saude`:

```bash
# Pacote principal — definições de biomarcadores, faixas de referência e conversor FHIR
npm install @precisa-saude/fhir

# Calculadoras clínicas — PhenoAge, BrDMrisc, biomarcadores derivados
npm install @precisa-saude/fhir-calculators

# Utilitários para OCR — ancoragem de biomarcadores em texto extraído
npm install @precisa-saude/fhir-ocr-utils
```

> **Requisitos**: Node.js >= 20, TypeScript >= 5.7 (recomendado).

## Exemplo 1: Consultar faixa de referência

```typescript
import { getReferenceRange, getDefinitionByCode } from '@precisa-saude/fhir';

// Consultar a definição do biomarcador
const hdl = getDefinitionByCode('HDL');
console.log(hdl?.names.pt[0]); // "Colesterol HDL"
console.log(hdl?.loinc); // "2085-9"

// Obter faixa de referência padrão
const faixa = getReferenceRange('HDL');
console.log(faixa);
// { min: 40, max: 60, optimalMin: 50, optimalMax: 60, unit: 'mg/dL' }

// Obter faixa personalizada por sexo e idade
const faixaPersonalizada = getReferenceRange('Testosterone', {
  biologicalSex: 'M',
  age: 35,
});
console.log(faixaPersonalizada);
// { min: 300, max: 1000, optimalMin: 500, optimalMax: 800, unit: 'ng/dL' }
```

## Exemplo 2: Converter resultado laboratorial para FHIR

```typescript
import {
  labResultToFHIRBundle,
  type LabReportData,
  type LabObservationData,
  type UserProfileData,
} from '@precisa-saude/fhir';

// Dados do laudo
const laudo: LabReportData = {
  reportId: 'laudo-001',
  userId: 'paciente-123',
  collectionDate: '2025-03-15',
  createdAt: new Date().toISOString(),
  overallStatus: 'NORMAL',
  laboratoryName: 'Laboratório Exemplo',
};

// Observações (biomarcadores extraídos)
const observacoes: LabObservationData[] = [
  {
    reportId: 'laudo-001',
    biomarkerCode: 'Glucose',
    biomarkerName: 'Glicose',
    value: 92,
    unit: 'mg/dL',
    flag: '',
    referenceMin: 70,
    referenceMax: 99,
  },
  {
    reportId: 'laudo-001',
    biomarkerCode: 'HbA1c',
    biomarkerName: 'Hemoglobina Glicada',
    value: 5.4,
    unit: '%',
    flag: '',
    referenceMin: 4.0,
    referenceMax: 5.6,
  },
];

// Perfil do paciente
const paciente: UserProfileData = {
  userId: 'paciente-123',
  name: 'Maria Silva',
  birthDate: '1990-05-20',
  gender: 'female',
};

// Gerar Bundle FHIR R4
const bundle = labResultToFHIRBundle(laudo, observacoes, paciente);
console.log(JSON.stringify(bundle, null, 2));
// Resultado: Bundle com Patient, DiagnosticReport e Observations no formato FHIR R4
```

## Exemplo 3: Calcular PhenoAge

```typescript
import { phenoage } from '@precisa-saude/fhir-calculators';

// Valores em unidades SI (como esperado pelo algoritmo)
const resultado = phenoage.calculatePhenoAge({
  albumin: 42, // g/L
  creatinine: 80, // μmol/L
  glucose: 5.2, // mmol/L
  crp: 1.5, // mg/L
  lymphocytePercent: 30, // %
  mcv: 88, // fL
  rdw: 12.5, // %
  alkalinePhosphatase: 65, // U/L
  wbc: 6.2, // 10^9/L
  chronologicalAge: 45, // anos
});

console.log(`Idade biológica: ${resultado.phenoAge} anos`);
console.log(`Diferença: ${resultado.ageDifference} anos`);

// Se os valores estão em unidades brasileiras convencionais,
// use autoConvertToSI para converter automaticamente:
const albumina = phenoage.autoConvertToSI('albumin', 4.2, 'g/dL');
console.log(albumina);
// { value: 42, unit: 'g/L', wasConverted: true }
```

## Próximos passos

- [Biomarcadores](./biomarcadores.md) — modelo de dados, categorias e consultas
- [Calculadoras](./calculadoras.md) — PhenoAge, BrDMrisc e biomarcadores derivados
- [Contribuindo](./contribuindo.md) — como configurar o ambiente e contribuir
