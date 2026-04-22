/**
 * Cenário: paciente com histórico de exames laboratoriais.
 *
 * Joana Maria da Silva, 42 anos, com Bundle pré-submetido de
 * lipidograma, glicemia e hemograma. Útil para demonstrar
 * o fluxo "buscar paciente → consultar exames anteriores → submeter novos".
 *
 * IDs sintéticos — não correspondem a CPF/CNS reais.
 */

import type { Scenario } from '../types';

const CPF = '12345678901';
const CNS = '700000000000001';
const CNES_LAB = '2345678';
const CNS_PROFISSIONAL = '700000000000010';

export const pacienteComExames: Scenario = {
  description:
    'Joana Maria da Silva (CPF 123.456.789-01, CNS 700 0000 0000 0001), 42 anos, com histórico de lipidograma e glicemia. Laboratório CNES 2345678. Profissional Dr(a). Pereira (CNS 700 0000 0000 0010).',
  name: 'paciente-com-exames',
  data: {
    organizations: [
      {
        active: true,
        id: CNES_LAB,
        identifier: [
          {
            system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes',
            value: CNES_LAB,
          },
        ],
        name: 'Laboratório Sintético São Paulo (sandbox)',
        resourceType: 'Organization',
      },
    ],
    patients: [
      {
        birthDate: '1983-08-12',
        gender: 'female',
        id: CNS,
        identifier: [
          { system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf', value: CPF },
          { system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns', value: CNS },
        ],
        name: [{ family: 'Silva', given: ['Joana', 'Maria', 'da'] }],
        resourceType: 'Patient',
      },
    ],
    practitioners: [
      {
        active: true,
        id: CNS_PROFISSIONAL,
        identifier: [
          {
            system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
            value: CNS_PROFISSIONAL,
          },
        ],
        name: [{ family: 'Pereira', given: ['Ana', 'Carolina'] }],
        resourceType: 'Practitioner',
      },
    ],
    submittedBundles: [
      {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            request: { method: 'POST', url: 'Observation' },
            resource: {
              code: {
                coding: [
                  {
                    code: '2093-3',
                    display: 'Colesterol total',
                    system: 'http://loinc.org',
                  },
                ],
              },
              effectiveDateTime: '2025-09-10',
              resourceType: 'Observation',
              status: 'final',
              subject: { reference: `Patient/${CNS}` },
              valueQuantity: {
                code: 'mg/dL',
                system: 'http://unitsofmeasure.org',
                unit: 'mg/dL',
                value: 198,
              },
            },
          },
          {
            request: { method: 'POST', url: 'Observation' },
            resource: {
              code: {
                coding: [
                  { code: '2089-1', display: 'LDL-Colesterol', system: 'http://loinc.org' },
                ],
              },
              effectiveDateTime: '2025-09-10',
              resourceType: 'Observation',
              status: 'final',
              subject: { reference: `Patient/${CNS}` },
              valueQuantity: {
                code: 'mg/dL',
                system: 'http://unitsofmeasure.org',
                unit: 'mg/dL',
                value: 124,
              },
            },
          },
          {
            request: { method: 'POST', url: 'Observation' },
            resource: {
              code: {
                coding: [
                  { code: '2085-9', display: 'HDL-Colesterol', system: 'http://loinc.org' },
                ],
              },
              effectiveDateTime: '2025-09-10',
              resourceType: 'Observation',
              status: 'final',
              subject: { reference: `Patient/${CNS}` },
              valueQuantity: {
                code: 'mg/dL',
                system: 'http://unitsofmeasure.org',
                unit: 'mg/dL',
                value: 56,
              },
            },
          },
          {
            request: { method: 'POST', url: 'Observation' },
            resource: {
              code: {
                coding: [{ code: '2345-7', display: 'Glicose', system: 'http://loinc.org' }],
              },
              effectiveDateTime: '2025-09-10',
              resourceType: 'Observation',
              status: 'final',
              subject: { reference: `Patient/${CNS}` },
              valueQuantity: {
                code: 'mg/dL',
                system: 'http://unitsofmeasure.org',
                unit: 'mg/dL',
                value: 96,
              },
            },
          },
        ],
      },
    ],
  },
};
