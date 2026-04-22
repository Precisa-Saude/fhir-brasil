/**
 * Cenário: paciente com episódio de internação recente.
 *
 * Carlos Henrique Souza, 67 anos, internado por descompensação de
 * insuficiência cardíaca. Bundle pré-submetido contém Encounter
 * (admissão) + Observations (BNP, troponina) + Condition (CID I50.0).
 */

import type { Scenario } from '../types';

const CPF = '98765432100';
const CNS = '700000000000020';
const CNES_HOSPITAL = '3456789';
const CNS_PROFISSIONAL = '700000000000030';

export const internacao: Scenario = {
  data: {
    organizations: [
      {
        active: true,
        id: CNES_HOSPITAL,
        identifier: [
          { system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes', value: CNES_HOSPITAL },
        ],
        name: 'Hospital Sintético do Coração (sandbox)',
        resourceType: 'Organization',
      },
    ],
    patients: [
      {
        birthDate: '1958-02-28',
        gender: 'male',
        id: CNS,
        identifier: [
          { system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf', value: CPF },
          { system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns', value: CNS },
        ],
        name: [{ family: 'Souza', given: ['Carlos', 'Henrique'] }],
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
        name: [{ family: 'Mendes', given: ['Roberto'] }],
        resourceType: 'Practitioner',
      },
    ],
    submittedBundles: [
      {
        entry: [
          {
            request: { method: 'POST', url: 'Encounter' },
            resource: {
              class: { code: 'IMP', display: 'inpatient encounter' },
              period: { start: '2026-04-15T10:30:00-03:00' },
              resourceType: 'Encounter',
              serviceProvider: { reference: `Organization/${CNES_HOSPITAL}` },
              status: 'in-progress',
              subject: { reference: `Patient/${CNS}` },
            },
          },
          {
            request: { method: 'POST', url: 'Condition' },
            resource: {
              code: {
                coding: [
                  {
                    code: 'I50.0',
                    display: 'Insuficiência cardíaca congestiva',
                    system: 'http://hl7.org/fhir/sid/icd-10',
                  },
                ],
              },
              recordedDate: '2026-04-15',
              resourceType: 'Condition',
              subject: { reference: `Patient/${CNS}` },
            },
          },
          {
            request: { method: 'POST', url: 'Observation' },
            resource: {
              code: {
                coding: [{ code: '33762-6', display: 'NT-proBNP', system: 'http://loinc.org' }],
              },
              effectiveDateTime: '2026-04-15T11:15:00-03:00',
              resourceType: 'Observation',
              status: 'final',
              subject: { reference: `Patient/${CNS}` },
              valueQuantity: {
                code: 'pg/mL',
                system: 'http://unitsofmeasure.org',
                unit: 'pg/mL',
                value: 4820,
              },
            },
          },
          {
            request: { method: 'POST', url: 'Observation' },
            resource: {
              code: {
                coding: [{ code: '49563-0', display: 'Troponina I', system: 'http://loinc.org' }],
              },
              effectiveDateTime: '2026-04-15T11:15:00-03:00',
              resourceType: 'Observation',
              status: 'final',
              subject: { reference: `Patient/${CNS}` },
              valueQuantity: {
                code: 'ng/mL',
                system: 'http://unitsofmeasure.org',
                unit: 'ng/mL',
                value: 0.08,
              },
            },
          },
        ],
        resourceType: 'Bundle',
        type: 'transaction',
      },
    ],
  },
  description:
    'Carlos Henrique Souza (CPF 987.654.321-00, CNS 700 0000 0000 0020), 67 anos, internado por insuficiência cardíaca descompensada (CID I50.0). Hospital CNES 3456789.',
  name: 'internacao',
};
