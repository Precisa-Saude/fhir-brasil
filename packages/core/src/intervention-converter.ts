/**
 * FHIR Intervention Converter
 *
 * Converts interventions (medication, supplement, diet, exercise, sleep)
 * to FHIR R4 MedicationStatement and Observation resources.
 */

import { userProfileToFHIR } from './converter';
import type { FHIRBundle, FHIRMedicationStatement, FHIRObservation } from './fhir-types';
import type { InterventionData, UserProfileData } from './types';

/**
 * Determine MedicationStatement/Observation status based on end date
 */
function interventionStatus(endDate?: string): 'active' | 'completed' {
  if (!endDate) return 'active';
  return new Date(endDate) < new Date() ? 'completed' : 'active';
}

/**
 * LOINC-like codes for lifestyle observation types
 */
const LIFESTYLE_CODES: Record<string, { code: string; display: string }> = {
  diet: { code: '81259-4', display: 'Diet' },
  exercise: { code: '73985-4', display: 'Exercise activity' },
  sleep: { code: '93832-4', display: 'Sleep duration' },
};

/**
 * Convert medication/supplement intervention to FHIR MedicationStatement
 */
export function interventionToFHIRMedicationStatement(
  intervention: InterventionData,
  patientId: string,
): FHIRMedicationStatement {
  const statement: FHIRMedicationStatement = {
    category: {
      coding: [
        {
          code: 'patientspecified',
          display: 'Patient Specified',
          system: 'http://terminology.hl7.org/CodeSystem/medication-statement-category',
        },
      ],
    },
    dateAsserted: intervention.startDate,
    effectivePeriod: {
      end: intervention.endDate,
      start: intervention.startDate,
    },
    id: `intervention-${intervention.interventionId}`,
    medicationCodeableConcept: {
      text: intervention.name,
    },
    resourceType: 'MedicationStatement',
    status: interventionStatus(intervention.endDate),
    subject: {
      reference: `Patient/${patientId}`,
    },
  };

  if (intervention.notes) {
    statement.note = [{ text: intervention.notes }];
  }

  return statement;
}

/**
 * Convert diet/exercise/sleep intervention to FHIR Observation (social-history)
 */
export function interventionToFHIRObservation(
  intervention: InterventionData,
  patientId: string,
): FHIRObservation {
  const lifestyleCode = LIFESTYLE_CODES[intervention.type];

  const observation: FHIRObservation = {
    category: [
      {
        coding: [
          {
            code: 'social-history',
            display: 'Social History',
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          },
        ],
      },
    ],
    code: {
      coding: lifestyleCode
        ? [
            {
              code: lifestyleCode.code,
              display: lifestyleCode.display,
              system: 'http://loinc.org',
            },
          ]
        : [],
      text: intervention.name,
    },
    effectivePeriod: {
      end: intervention.endDate,
      start: intervention.startDate,
    },
    id: `intervention-${intervention.interventionId}`,
    resourceType: 'Observation',
    status: 'final',
    subject: {
      reference: `Patient/${patientId}`,
    },
    valueString: intervention.name,
  };

  if (intervention.notes) {
    observation.note = [{ text: intervention.notes }];
  }

  return observation;
}

/**
 * Convert all interventions to a FHIR Bundle
 */
export function interventionsToFHIRBundle(
  interventions: InterventionData[],
  userProfile: UserProfileData,
): FHIRBundle {
  const patientId = userProfile.userId;
  const fhirPatient = userProfileToFHIR(userProfile);

  const entries = interventions.map((intervention) => {
    const isMedication = intervention.type === 'medication' || intervention.type === 'supplement';
    const resource = isMedication
      ? interventionToFHIRMedicationStatement(intervention, patientId)
      : interventionToFHIRObservation(intervention, patientId);

    return {
      fullUrl: `urn:uuid:intervention-${intervention.interventionId}`,
      resource,
    };
  });

  return {
    entry: [
      {
        fullUrl: `urn:uuid:${patientId}`,
        resource: fhirPatient,
      },
      ...entries,
    ],
    resourceType: 'Bundle',
    type: 'collection',
  };
}
