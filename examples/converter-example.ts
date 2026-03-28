/**
 * Exemplo: Conversor FHIR R4
 *
 * Demonstra como converter dados laboratoriais genéricos para um Bundle FHIR R4
 * contendo Patient, DiagnosticReport e Observation.
 *
 * Para executar:
 *   npx tsx examples/converter-example.ts
 */

import {
  labResultToFHIRBundle,
  labObservationToFHIR,
  userProfileToFHIR,
  type LabReportData,
  type LabObservationData,
  type UserProfileData,
} from '@precisa-saude/fhir';

// =============================================================================
// 1. Definir os dados do laudo
// =============================================================================

const laudo: LabReportData = {
  reportId: 'laudo-2025-001',
  userId: 'paciente-abc-123',
  collectionDate: '2025-03-15',
  createdAt: '2025-03-16T10:30:00Z',
  overallStatus: 'ANORMAL', // Pelo menos um resultado fora da faixa
  processingStatus: 'complete',
  laboratoryName: 'Laboratório São Paulo',
};

// =============================================================================
// 2. Definir as observações (biomarcadores extraídos do laudo)
// =============================================================================

const observacoes: LabObservationData[] = [
  {
    reportId: 'laudo-2025-001',
    biomarkerCode: 'Glucose',
    biomarkerName: 'Glicose',
    value: 92,
    unit: 'mg/dL',
    flag: '', // Normal
    referenceMin: 70,
    referenceMax: 99,
  },
  {
    reportId: 'laudo-2025-001',
    biomarkerCode: 'HbA1c',
    biomarkerName: 'Hemoglobina Glicada',
    value: 5.4,
    unit: '%',
    flag: '', // Normal
    referenceMin: 4.0,
    referenceMax: 5.6,
  },
  {
    reportId: 'laudo-2025-001',
    biomarkerCode: 'LDL',
    biomarkerName: 'Colesterol LDL',
    value: 165,
    unit: 'mg/dL',
    flag: 'H', // Alto
    referenceMin: 0,
    referenceMax: 130,
  },
  {
    reportId: 'laudo-2025-001',
    biomarkerCode: 'HDL',
    biomarkerName: 'Colesterol HDL',
    value: 55,
    unit: 'mg/dL',
    flag: '', // Normal
    referenceMin: 40,
    referenceMax: 60,
  },
  {
    // Exemplo de resultado qualitativo (texto em vez de número)
    reportId: 'laudo-2025-001',
    biomarkerCode: 'BloodType',
    biomarkerName: 'Tipo Sanguíneo',
    value: 'A+',
    unit: '',
    flag: '',
    isQualitative: true,
  },
];

// =============================================================================
// 3. Definir o perfil do paciente
// =============================================================================

const paciente: UserProfileData = {
  userId: 'paciente-abc-123',
  name: 'Maria da Silva Santos',
  birthDate: '1990-05-20',
  gender: 'female',
  email: 'maria@exemplo.com',
  phone: '+5511999998888',
  address: {
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 45',
    neighborhood: 'Jardim Paulista',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '01401-000',
    country: 'BR',
  },
};

// =============================================================================
// 4. Converter para Bundle FHIR R4
// =============================================================================

console.log('=== Conversão completa para Bundle FHIR R4 ===\n');

const bundle = labResultToFHIRBundle(laudo, observacoes, paciente);

console.log(`Tipo do Bundle: ${bundle.type}`);
console.log(`Total de recursos: ${bundle.entry.length}`);
console.log();

// Inspecionar cada recurso do Bundle
for (const entry of bundle.entry) {
  const resource = entry.resource;
  console.log(`  - ${resource.resourceType} (id: ${resource.id})`);

  if (resource.resourceType === 'Patient') {
    console.log(`    Nome: ${resource.name?.[0]?.text}`);
    console.log(`    Nascimento: ${resource.birthDate}`);
  }

  if (resource.resourceType === 'DiagnosticReport') {
    console.log(`    Status: ${resource.status}`);
    console.log(`    Conclusão: ${resource.conclusion}`);
    console.log(`    Observações: ${resource.result?.length}`);
  }

  if (resource.resourceType === 'Observation') {
    const codigo = resource.code?.coding?.[0];
    if (resource.valueQuantity) {
      console.log(
        `    ${codigo?.display}: ${resource.valueQuantity.value} ${resource.valueQuantity.unit}`,
      );
    } else if (resource.valueString) {
      console.log(`    ${codigo?.display}: ${resource.valueString}`);
    }

    const interpretacao = resource.interpretation?.[0]?.coding?.[0];
    console.log(`    Interpretação: ${interpretacao?.display}`);
  }
}

// =============================================================================
// 5. Converter recursos individualmente
// =============================================================================

console.log('\n=== Conversão individual de recursos ===\n');

// Converter apenas uma observação
const obsIndividual = labObservationToFHIR(
  observacoes[0],
  paciente.userId,
  laudo.laboratoryName,
);
console.log('Observation individual:');
console.log(`  LOINC: ${obsIndividual.code.coding[0].code}`);
console.log(`  Código interno: ${obsIndividual.code.coding[1]?.code}`);
console.log(`  Valor: ${obsIndividual.valueQuantity?.value} ${obsIndividual.valueQuantity?.unit}`);
console.log(`  Unidade UCUM: ${obsIndividual.valueQuantity?.code}`);

// Converter apenas o paciente
const fhirPatient = userProfileToFHIR(paciente);
console.log('\nPatient:');
console.log(`  Nome: ${fhirPatient.name[0].text}`);
console.log(`  Família: ${fhirPatient.name[0].family}`);
console.log(`  Cidade: ${fhirPatient.address?.[0]?.city}`);
console.log(`  Sexo: ${fhirPatient.gender}`);

// =============================================================================
// 6. Saída JSON completa do Bundle
// =============================================================================

console.log('\n=== JSON completo do Bundle ===\n');
console.log(JSON.stringify(bundle, null, 2));
