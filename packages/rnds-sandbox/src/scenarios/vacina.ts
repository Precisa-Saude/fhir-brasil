/**
 * Cenário: paciente com calendário vacinal aplicado.
 *
 * Pedro Lima Almeida, 8 anos, com Bundle pré-submetido contendo
 * Immunization (BCG, hepatite B, pentavalente, tríplice viral).
 */

import type { Scenario } from '../types';

const CNS = '700000000000040';
const CNES_UBS = '4567890';
const CNS_PROFISSIONAL = '700000000000050';

export const vacina: Scenario = {
  description:
    'Pedro Lima Almeida (CNS 700 0000 0000 0040), 8 anos, com calendário vacinal aplicado em UBS CNES 4567890.',
  name: 'vacina',
  data: {
    organizations: [
      {
        active: true,
        id: CNES_UBS,
        identifier: [
          { system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes', value: CNES_UBS },
        ],
        name: 'UBS Sintética Vila Saúde (sandbox)',
        resourceType: 'Organization',
      },
    ],
    patients: [
      {
        birthDate: '2017-11-04',
        gender: 'male',
        id: CNS,
        identifier: [{ system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns', value: CNS }],
        name: [{ family: 'Almeida', given: ['Pedro', 'Lima'] }],
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
        name: [{ family: 'Costa', given: ['Fernanda'] }],
        resourceType: 'Practitioner',
      },
    ],
    submittedBundles: [
      {
        resourceType: 'Bundle',
        type: 'transaction',
        entry: [
          {
            request: { method: 'POST', url: 'Immunization' },
            resource: {
              occurrenceDateTime: '2017-11-05',
              patient: { reference: `Patient/${CNS}` },
              resourceType: 'Immunization',
              status: 'completed',
              vaccineCode: {
                coding: [
                  { code: 'BCG', display: 'BCG', system: 'urn:oid:2.16.840.1.113883.6.59' },
                ],
              },
            },
          },
          {
            request: { method: 'POST', url: 'Immunization' },
            resource: {
              occurrenceDateTime: '2017-11-05',
              patient: { reference: `Patient/${CNS}` },
              resourceType: 'Immunization',
              status: 'completed',
              vaccineCode: {
                coding: [
                  {
                    code: 'HBV',
                    display: 'Hepatite B (RN)',
                    system: 'urn:oid:2.16.840.1.113883.6.59',
                  },
                ],
              },
            },
          },
          {
            request: { method: 'POST', url: 'Immunization' },
            resource: {
              occurrenceDateTime: '2018-12-12',
              patient: { reference: `Patient/${CNS}` },
              resourceType: 'Immunization',
              status: 'completed',
              vaccineCode: {
                coding: [
                  {
                    code: 'MMR',
                    display: 'Tríplice viral (SCR)',
                    system: 'urn:oid:2.16.840.1.113883.6.59',
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  },
};
