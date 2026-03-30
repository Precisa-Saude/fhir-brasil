/**
 * FHIR Converter
 *
 * Converts lab results to FHIR R4 DiagnosticReport and Observation resources.
 * See: https://hl7.org/fhir/diagnosticreport.html
 */

import { codeToLoinc } from './biomarkers';
import type { FHIRBundle, FHIRDiagnosticReport, FHIRObservation, FHIRPatient } from './fhir-types';
import type { Flag, LabObservationData, LabReportData, UserProfileData } from './types';
import { getDefaultUnit, unitToUCUM } from './units';

// Re-export all types and functions
export * from './fhir-types';

/**
 * Convert Flag to FHIR interpretation code
 */
function interpretationCode(flag: Flag): string {
  switch (flag) {
    case 'H':
      return 'H'; // High
    case 'L':
      return 'L'; // Low
    default:
      return 'N'; // Normal
  }
}

/**
 * Convert Flag to FHIR interpretation display
 */
function interpretationDisplay(flag: Flag): string {
  switch (flag) {
    case 'H':
      return 'High';
    case 'L':
      return 'Low';
    default:
      return 'Normal';
  }
}

/**
 * Convert generic lab observation to FHIR Observation
 */
export function labObservationToFHIR(
  observation: LabObservationData,
  patientId: string,
  laboratoryName?: string,
): FHIRObservation {
  const loincCode = codeToLoinc(observation.biomarkerCode) || '99999-9';
  // Use default unit if source unit is empty
  const sourceUnit =
    observation.unit || getDefaultUnit(observation.biomarkerCode) || observation.unit;
  const ucumUnit = unitToUCUM(sourceUnit);
  const isQualitative = observation.isQualitative || typeof observation.value === 'string';

  // Base observation structure
  const fhirObs: FHIRObservation = {
    category: [
      {
        coding: [
          {
            code: 'laboratory',
            display: 'Laboratory',
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          code: loincCode,
          display: observation.biomarkerName,
          system: 'http://loinc.org',
        },
        {
          code: observation.biomarkerCode,
          display: observation.biomarkerName,
          system: 'http://fhir-brasil.dev/biomarker-codes',
        },
      ],
      text: observation.biomarkerName,
    },
    effectiveDateTime: observation.collectionDate,
    id: `${observation.reportId}-${observation.biomarkerCode}`,
    interpretation: [
      {
        coding: [
          {
            code: interpretationCode(observation.flag),
            display: interpretationDisplay(observation.flag),
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          },
        ],
      },
    ],
    performer: laboratoryName ? [{ display: laboratoryName }] : undefined,
    resourceType: 'Observation',
    status: 'final',
    subject: {
      reference: `Patient/${patientId}`,
    },
  };

  // Add value based on type (qualitative = string, quantitative = number)
  if (isQualitative) {
    fhirObs.valueString = String(observation.value);
  } else {
    fhirObs.valueQuantity = {
      code: ucumUnit,
      system: 'http://unitsofmeasure.org',
      unit: sourceUnit,
      value: observation.value as number,
    };

    // Reference range only applies to quantitative values
    if (observation.referenceMin !== undefined && observation.referenceMax !== undefined) {
      fhirObs.referenceRange = [
        {
          high: {
            code: ucumUnit,
            system: 'http://unitsofmeasure.org',
            unit: sourceUnit,
            value: observation.referenceMax,
          },
          low: {
            code: ucumUnit,
            system: 'http://unitsofmeasure.org',
            unit: sourceUnit,
            value: observation.referenceMin,
          },
        },
      ];
    }
  }

  return fhirObs;
}

/**
 * Convert generic lab report to FHIR DiagnosticReport
 */
export function labReportToFHIR(
  report: LabReportData,
  patientId: string,
  observationIds: string[],
): FHIRDiagnosticReport {
  // Map processing status to FHIR status
  let status: FHIRDiagnosticReport['status'];
  switch (report.processingStatus) {
    case 'complete':
      status = 'final';
      break;
    case 'partial':
      status = 'partial';
      break;
    case 'pending_review':
      status = 'preliminary';
      break;
    default:
      status = 'final';
  }

  return {
    category: [
      {
        coding: [
          {
            code: 'LAB',
            display: 'Laboratory',
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
          },
        ],
      },
    ],
    code: {
      coding: [
        {
          code: '11502-2', // Laboratory report
          display: 'Laboratory report',
          system: 'http://loinc.org',
        },
      ],
      text: 'Laboratory Results',
    },
    conclusion:
      report.overallStatus === 'NORMAL'
        ? 'All results within normal limits'
        : 'One or more abnormal results detected',
    conclusionCode:
      report.overallStatus === 'ANORMAL'
        ? [
            {
              coding: [
                {
                  code: 'A',
                  display: 'Abnormal',
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                },
              ],
            },
          ]
        : undefined,
    effectiveDateTime: report.collectionDate,
    id: report.reportId,
    issued: report.createdAt,
    performer: report.laboratoryName ? [{ display: report.laboratoryName }] : undefined,
    resourceType: 'DiagnosticReport',
    result: observationIds.map((id) => ({ reference: `Observation/${id}` })),
    status,
    subject: {
      reference: `Patient/${patientId}`,
    },
  };
}

/**
 * Convert user profile to FHIR Patient
 * NOTE: CPF is intentionally excluded for privacy (LGPD compliance)
 */
export function userProfileToFHIR(profile: UserProfileData): FHIRPatient {
  const nameParts = profile.name.split(' ');
  const given = nameParts.slice(0, -1);
  const family = nameParts[nameParts.length - 1] || '';

  return {
    address: profile.address
      ? [
          {
            city: profile.address.city,
            country: profile.address.country || 'BR',
            line: [
              profile.address.street && profile.address.number
                ? `${profile.address.street}, ${profile.address.number}`
                : profile.address.street,
              profile.address.complement,
            ].filter(Boolean) as string[],
            postalCode: profile.address.postalCode,
            state: profile.address.state,
          },
        ]
      : undefined,
    birthDate: profile.birthDate,
    gender: profile.gender,
    id: profile.userId,
    name: [
      {
        family,
        given: given.length > 0 ? given : undefined,
        text: profile.name,
      },
    ],
    resourceType: 'Patient',
    telecom:
      [
        ...(profile.email ? [{ system: 'email' as const, value: profile.email }] : []),
        ...(profile.phone ? [{ system: 'phone' as const, value: profile.phone }] : []),
      ].length > 0
        ? [
            ...(profile.email ? [{ system: 'email' as const, value: profile.email }] : []),
            ...(profile.phone ? [{ system: 'phone' as const, value: profile.phone }] : []),
          ]
        : undefined,
  };
}

/**
 * Convert complete lab result to FHIR Bundle
 * This is the main function for exporting lab results to FHIR R4 format
 */
export function labResultToFHIRBundle(
  report: LabReportData,
  observations: LabObservationData[],
  userProfile: UserProfileData,
): FHIRBundle {
  const patientId = userProfile.userId;

  // Convert observations
  const fhirObservations = observations.map((obs) => ({
    fullUrl: `urn:uuid:observation-${obs.reportId}-${obs.biomarkerCode}`,
    resource: labObservationToFHIR(
      { ...obs, collectionDate: report.collectionDate },
      patientId,
      report.laboratoryName,
    ),
  }));

  const observationIds = observations.map(
    (obs) => `observation-${obs.reportId}-${obs.biomarkerCode}`,
  );

  // Convert report
  const diagnosticReport = labReportToFHIR(report, patientId, observationIds);

  // Convert patient
  const fhirPatient = userProfileToFHIR(userProfile);

  return {
    entry: [
      {
        fullUrl: `urn:uuid:${patientId}`,
        resource: fhirPatient,
      },
      {
        fullUrl: `urn:uuid:diagnostic-report-${report.reportId}`,
        resource: diagnosticReport,
      },
      ...fhirObservations,
    ],
    resourceType: 'Bundle',
    type: 'collection',
  };
}
