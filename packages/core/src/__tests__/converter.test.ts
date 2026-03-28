import { describe, expect, it } from 'vitest';

import {
  labObservationToFHIR,
  labReportToFHIR,
  labResultToFHIRBundle,
  userProfileToFHIR,
} from '../converter';
import {
  validateFHIRDiagnosticReport,
  validateFHIRObservation,
} from '../validators';
import {
  interventionsToFHIRBundle,
  interventionToFHIRMedicationStatement,
  interventionToFHIRObservation,
} from '../intervention-converter';
import type { FHIRDiagnosticReport, FHIRMedicationStatement, FHIRObservation } from '../fhir-types';
import type {
  InterventionData,
  LabObservationData,
  LabReportData,
  UserProfileData,
} from '../types';

const sampleLabObservation: LabObservationData = {
  biomarkerCode: 'Glucose',
  biomarkerName: 'Glucose',
  flag: '',
  referenceMax: 100,
  referenceMin: 70,
  reportId: 'report-123',
  unit: 'mg/dL',
  value: 85,
};

const sampleHighObservation: LabObservationData = {
  biomarkerCode: 'LDL',
  biomarkerName: 'LDL Cholesterol',
  flag: 'H',
  referenceMax: 100,
  referenceMin: 0,
  reportId: 'report-123',
  unit: 'mg/dL',
  value: 150,
};

const sampleLabReport: LabReportData = {
  collectionDate: '2024-01-15T08:00:00.000Z',
  createdAt: '2024-01-15T14:00:00.000Z',
  laboratoryName: 'Generic Lab',
  overallStatus: 'NORMAL',
  processingStatus: 'complete',
  reportId: 'report-123',
  userId: 'user-456',
};

const sampleUserProfile: UserProfileData = {
  address: {
    city: 'São Paulo',
    country: 'BR',
    number: '456',
    postalCode: '01000-000',
    state: 'SP',
    street: 'Avenida Paulista',
  },
  birthDate: '1985-03-20',
  email: 'user@example.com',
  gender: 'female',
  name: 'Maria Silva Santos',
  phone: '+55 11 98888-8888',
  userId: 'user-456',
};

describe('labObservationToFHIR', () => {
  it('should convert lab observation to FHIR Observation', () => {
    const fhirObs = labObservationToFHIR(sampleLabObservation, 'patient-1');

    expect(fhirObs.resourceType).toBe('Observation');
    expect(fhirObs.status).toBe('final');
    expect(fhirObs.valueQuantity?.value).toBe(85);
    expect(fhirObs.valueQuantity?.unit).toBe('mg/dL');
  });

  it('should include internal code system', () => {
    const fhirObs = labObservationToFHIR(sampleLabObservation, 'patient-1');
    const internalCoding = fhirObs.code.coding?.find(
      (c) => c.system === 'http://fhir-brasil.dev/biomarker-codes',
    );
    expect(internalCoding?.code).toBe('Glucose');
  });

  it('should include subject reference', () => {
    const fhirObs = labObservationToFHIR(sampleLabObservation, 'patient-1');
    expect(fhirObs.subject?.reference).toBe('Patient/patient-1');
  });

  it('should include laboratory category', () => {
    const fhirObs = labObservationToFHIR(sampleLabObservation, 'patient-1');
    const category = fhirObs.category?.[0]?.coding?.[0];
    expect(category?.code).toBe('laboratory');
  });

  it('should include performer when provided', () => {
    const fhirObs = labObservationToFHIR(sampleLabObservation, 'patient-1', 'Test Lab');
    expect(fhirObs.performer?.[0]?.display).toBe('Test Lab');
  });

  it('should include normal interpretation for normal values', () => {
    const fhirObs = labObservationToFHIR(sampleLabObservation, 'patient-1');
    expect(fhirObs.interpretation?.[0]?.coding?.[0]?.code).toBe('N');
  });

  it('should include high interpretation for high values', () => {
    const fhirObs = labObservationToFHIR(sampleHighObservation, 'patient-1');
    expect(fhirObs.interpretation?.[0]?.coding?.[0]?.code).toBe('H');
  });

  it('should use valueString for qualitative observations', () => {
    const qualitativeObs: LabObservationData = {
      ...sampleLabObservation,
      isQualitative: true,
      value: 'Positive',
    };

    const fhirObs = labObservationToFHIR(qualitativeObs, 'patient-1');
    expect(fhirObs.valueString).toBe('Positive');
    expect(fhirObs.valueQuantity).toBeUndefined();
  });

  it('should detect qualitative from string value', () => {
    const stringValueObs: LabObservationData = {
      ...sampleLabObservation,
      value: 'Negative',
    };

    const fhirObs = labObservationToFHIR(stringValueObs, 'patient-1');
    expect(fhirObs.valueString).toBe('Negative');
  });

  it('should include reference range for quantitative', () => {
    const fhirObs = labObservationToFHIR(sampleLabObservation, 'patient-1');
    expect(fhirObs.referenceRange?.[0]?.low?.value).toBe(70);
    expect(fhirObs.referenceRange?.[0]?.high?.value).toBe(100);
  });
});

describe('labReportToFHIR', () => {
  it('should convert lab report to FHIR DiagnosticReport', () => {
    const fhirReport = labReportToFHIR(sampleLabReport, 'patient-1', ['obs-1', 'obs-2']);

    expect(fhirReport.resourceType).toBe('DiagnosticReport');
    expect(fhirReport.status).toBe('final');
    expect(fhirReport.id).toBe('report-123');
  });

  it('should map processing status to FHIR status', () => {
    const partialReport = { ...sampleLabReport, processingStatus: 'partial' as const };
    const fhirReport = labReportToFHIR(partialReport, 'patient-1', []);
    expect(fhirReport.status).toBe('partial');

    const pendingReport = { ...sampleLabReport, processingStatus: 'pending_review' as const };
    const pendingFhir = labReportToFHIR(pendingReport, 'patient-1', []);
    expect(pendingFhir.status).toBe('preliminary');
  });

  it('should include observation references', () => {
    const fhirReport = labReportToFHIR(sampleLabReport, 'patient-1', ['obs-1', 'obs-2']);
    expect(fhirReport.result?.length).toBe(2);
    expect(fhirReport.result?.[0]?.reference).toBe('Observation/obs-1');
  });

  it('should include laboratory category', () => {
    const fhirReport = labReportToFHIR(sampleLabReport, 'patient-1', []);
    const category = fhirReport.category?.[0]?.coding?.[0];
    expect(category?.code).toBe('LAB');
  });

  it('should include conclusion for normal status', () => {
    const fhirReport = labReportToFHIR(sampleLabReport, 'patient-1', []);
    expect(fhirReport.conclusion).toContain('normal');
  });

  it('should include conclusion code for abnormal status', () => {
    const abnormalReport = { ...sampleLabReport, overallStatus: 'ANORMAL' as const };
    const fhirReport = labReportToFHIR(abnormalReport, 'patient-1', []);
    expect(fhirReport.conclusionCode).toBeDefined();
  });
});

describe('userProfileToFHIR', () => {
  it('should convert user profile to FHIR Patient', () => {
    const fhirPatient = userProfileToFHIR(sampleUserProfile);

    expect(fhirPatient.resourceType).toBe('Patient');
    expect(fhirPatient.id).toBe('user-456');
    expect(fhirPatient.gender).toBe('female');
    expect(fhirPatient.birthDate).toBe('1985-03-20');
  });

  it('should parse name correctly', () => {
    const fhirPatient = userProfileToFHIR(sampleUserProfile);
    expect(fhirPatient.name?.[0]?.given).toEqual(['Maria', 'Silva']);
    expect(fhirPatient.name?.[0]?.family).toBe('Santos');
    expect(fhirPatient.name?.[0]?.text).toBe('Maria Silva Santos');
  });

  it('should include address with country', () => {
    const fhirPatient = userProfileToFHIR(sampleUserProfile);
    expect(fhirPatient.address?.[0]?.city).toBe('São Paulo');
    expect(fhirPatient.address?.[0]?.country).toBe('BR');
  });

  it('should handle single name', () => {
    const singleName = { ...sampleUserProfile, name: 'Madonna' };
    const fhirPatient = userProfileToFHIR(singleName);
    expect(fhirPatient.name?.[0]?.family).toBe('Madonna');
    expect(fhirPatient.name?.[0]?.given).toBeUndefined();
  });

  it('should exclude CPF for privacy', () => {
    const withCpf = { ...sampleUserProfile, cpf: '123.456.789-00' };
    const fhirPatient = userProfileToFHIR(withCpf);
    // CPF should not appear anywhere in the output
    const jsonString = JSON.stringify(fhirPatient);
    expect(jsonString).not.toContain('123.456.789-00');
    expect(jsonString).not.toContain('cpf');
  });

  it('should handle profile without address', () => {
    const noAddress = { ...sampleUserProfile, address: undefined };
    const fhirPatient = userProfileToFHIR(noAddress);
    expect(fhirPatient.address).toBeUndefined();
  });

  it('should handle profile without telecom', () => {
    const noTelecom = { ...sampleUserProfile, email: undefined, phone: undefined };
    const fhirPatient = userProfileToFHIR(noTelecom);
    expect(fhirPatient.telecom).toBeUndefined();
  });
});

describe('labResultToFHIRBundle', () => {
  it('should create complete FHIR Bundle', () => {
    const observations = [sampleLabObservation];
    const bundle = labResultToFHIRBundle(sampleLabReport, observations, sampleUserProfile);

    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('collection');
    expect(bundle.entry.length).toBe(3); // patient + report + 1 observation
  });

  it('should include patient resource', () => {
    const bundle = labResultToFHIRBundle(
      sampleLabReport,
      [sampleLabObservation],
      sampleUserProfile,
    );
    const patientEntry = bundle.entry.find((e) => e.resource.resourceType === 'Patient');
    expect(patientEntry).toBeDefined();
    expect((patientEntry?.resource as { id?: string }).id).toBe('user-456');
  });

  it('should include diagnostic report', () => {
    const bundle = labResultToFHIRBundle(
      sampleLabReport,
      [sampleLabObservation],
      sampleUserProfile,
    );
    const reportEntry = bundle.entry.find((e) => e.resource.resourceType === 'DiagnosticReport');
    expect(reportEntry).toBeDefined();
    expect((reportEntry?.resource as { id?: string }).id).toBe('report-123');
  });

  it('should include correct number of observations', () => {
    const observations = [
      sampleLabObservation,
      { ...sampleLabObservation, biomarkerCode: 'HbA1c', biomarkerName: 'HbA1c', value: 5.5 },
    ];
    const bundle = labResultToFHIRBundle(sampleLabReport, observations, sampleUserProfile);
    const observationEntries = bundle.entry.filter(
      (e) => e.resource.resourceType === 'Observation',
    );
    expect(observationEntries.length).toBe(2);
  });

  it('should use collection date from report for observations', () => {
    const bundle = labResultToFHIRBundle(
      sampleLabReport,
      [sampleLabObservation],
      sampleUserProfile,
    );
    const obsEntry = bundle.entry.find((e) => e.resource.resourceType === 'Observation');
    const obs = obsEntry?.resource as FHIRObservation;
    expect(obs.effectiveDateTime).toBe(sampleLabReport.collectionDate);
  });

  it('should include laboratory name in observations', () => {
    const bundle = labResultToFHIRBundle(
      sampleLabReport,
      [sampleLabObservation],
      sampleUserProfile,
    );
    const obsEntry = bundle.entry.find((e) => e.resource.resourceType === 'Observation');
    const obs = obsEntry?.resource as FHIRObservation;
    expect(obs.performer?.[0]?.display).toBe('Generic Lab');
  });
});

describe('validateFHIRDiagnosticReport', () => {
  it('should return empty array for valid report', () => {
    const validReport: FHIRDiagnosticReport = {
      code: { coding: [{ code: '123', system: 'http://loinc.org' }] },
      resourceType: 'DiagnosticReport',
      status: 'final',
      subject: { reference: 'Patient/1' },
    };

    const errors = validateFHIRDiagnosticReport(validReport);
    expect(errors).toEqual([]);
  });

  it('should detect invalid resourceType', () => {
    const invalidReport = {
      code: { coding: [{ code: '123' }] },
      resourceType: 'Invalid',
      status: 'final',
      subject: { reference: 'Patient/1' },
    } as unknown as FHIRDiagnosticReport;

    const errors = validateFHIRDiagnosticReport(invalidReport);
    expect(errors).toContain('Invalid resourceType');
  });

  it('should detect missing status', () => {
    const reportNoStatus = {
      code: { coding: [{ code: '123' }] },
      resourceType: 'DiagnosticReport',
      subject: { reference: 'Patient/1' },
    } as unknown as FHIRDiagnosticReport;

    const errors = validateFHIRDiagnosticReport(reportNoStatus);
    expect(errors).toContain('Missing status');
  });

  it('should detect missing code', () => {
    const reportNoCode = {
      resourceType: 'DiagnosticReport',
      status: 'final',
      subject: { reference: 'Patient/1' },
    } as unknown as FHIRDiagnosticReport;

    const errors = validateFHIRDiagnosticReport(reportNoCode);
    expect(errors).toContain('Missing or invalid code');
  });

  it('should detect missing subject', () => {
    const reportNoSubject: FHIRDiagnosticReport = {
      code: { coding: [{ code: '123' }] },
      resourceType: 'DiagnosticReport',
      status: 'final',
    };

    const errors = validateFHIRDiagnosticReport(reportNoSubject);
    expect(errors).toContain('Missing subject reference');
  });
});

describe('validateFHIRObservation', () => {
  it('should return empty array for valid observation', () => {
    const validObs: FHIRObservation = {
      code: { coding: [{ code: '123' }] },
      resourceType: 'Observation',
      status: 'final',
      subject: { reference: 'Patient/1' },
      valueQuantity: { unit: 'mg/dL', value: 100 },
    };

    const errors = validateFHIRObservation(validObs);
    expect(errors).toEqual([]);
  });

  it('should accept valueString instead of valueQuantity', () => {
    const obsWithString: FHIRObservation = {
      code: { coding: [{ code: '123' }] },
      resourceType: 'Observation',
      status: 'final',
      subject: { reference: 'Patient/1' },
      valueString: 'Positive',
    };

    const errors = validateFHIRObservation(obsWithString);
    expect(errors).toEqual([]);
  });

  it('should detect missing value', () => {
    const obsNoValue: FHIRObservation = {
      code: { coding: [{ code: '123' }] },
      resourceType: 'Observation',
      status: 'final',
      subject: { reference: 'Patient/1' },
    };

    const errors = validateFHIRObservation(obsNoValue);
    expect(errors).toContain('Missing value (valueQuantity or valueString)');
  });

  it('should detect invalid resourceType', () => {
    const invalidObs = {
      code: { coding: [{ code: '123' }] },
      resourceType: 'Invalid',
      status: 'final',
      subject: { reference: 'Patient/1' },
      valueQuantity: { value: 100 },
    } as unknown as FHIRObservation;

    const errors = validateFHIRObservation(invalidObs);
    expect(errors).toContain('Invalid resourceType');
  });
});

// === Intervention Converter Tests ===

const sampleMedicationIntervention: InterventionData = {
  interventionId: 'int-med-001',
  name: 'Metformina 500mg',
  notes: 'Tomar após almoço',
  startDate: '2024-01-15',
  type: 'medication',
};

const sampleSupplementIntervention: InterventionData = {
  endDate: '2024-06-15',
  interventionId: 'int-sup-001',
  name: 'Vitamina D 2000UI',
  startDate: '2024-01-01',
  type: 'supplement',
};

const sampleExerciseIntervention: InterventionData = {
  interventionId: 'int-ex-001',
  name: 'Corrida 30min',
  startDate: '2024-03-01',
  type: 'exercise',
};

const sampleDietIntervention: InterventionData = {
  interventionId: 'int-diet-001',
  name: 'Dieta mediterrânea',
  notes: 'Reduzir carboidratos refinados',
  startDate: '2024-02-01',
  type: 'diet',
};

const sampleSleepIntervention: InterventionData = {
  endDate: '2020-01-01',
  interventionId: 'int-sleep-001',
  name: 'Higiene do sono',
  startDate: '2019-06-01',
  type: 'sleep',
};

describe('interventionToFHIRMedicationStatement', () => {
  it('should convert medication to MedicationStatement', () => {
    const stmt = interventionToFHIRMedicationStatement(sampleMedicationIntervention, 'user-456');

    expect(stmt.resourceType).toBe('MedicationStatement');
    expect(stmt.medicationCodeableConcept?.text).toBe('Metformina 500mg');
    expect(stmt.subject?.reference).toBe('Patient/user-456');
    expect(stmt.status).toBe('active');
    expect(stmt.id).toBe('intervention-int-med-001');
  });

  it('should use patientspecified category', () => {
    const stmt = interventionToFHIRMedicationStatement(sampleMedicationIntervention, 'user-456');
    expect(stmt.category?.coding?.[0]?.code).toBe('patientspecified');
  });

  it('should include effectivePeriod', () => {
    const stmt = interventionToFHIRMedicationStatement(sampleMedicationIntervention, 'user-456');
    expect(stmt.effectivePeriod?.start).toBe('2024-01-15');
    expect(stmt.effectivePeriod?.end).toBeUndefined();
  });

  it('should include notes when present', () => {
    const stmt = interventionToFHIRMedicationStatement(sampleMedicationIntervention, 'user-456');
    expect(stmt.note?.[0]?.text).toBe('Tomar após almoço');
  });

  it('should not include notes when absent', () => {
    const stmt = interventionToFHIRMedicationStatement(sampleExerciseIntervention, 'user-456');
    expect(stmt.note).toBeUndefined();
  });

  it('should set completed status when endDate is in the past', () => {
    const stmt = interventionToFHIRMedicationStatement(sampleSupplementIntervention, 'user-456');
    expect(stmt.status).toBe('completed');
  });

  it('should convert supplement same as medication', () => {
    const stmt = interventionToFHIRMedicationStatement(sampleSupplementIntervention, 'user-456');
    expect(stmt.resourceType).toBe('MedicationStatement');
    expect(stmt.medicationCodeableConcept?.text).toBe('Vitamina D 2000UI');
  });
});

describe('interventionToFHIRObservation', () => {
  it('should convert exercise to social-history Observation', () => {
    const obs = interventionToFHIRObservation(sampleExerciseIntervention, 'user-456');

    expect(obs.resourceType).toBe('Observation');
    expect(obs.category?.[0]?.coding?.[0]?.code).toBe('social-history');
    expect(obs.valueString).toBe('Corrida 30min');
    expect(obs.subject?.reference).toBe('Patient/user-456');
  });

  it('should include LOINC code for exercise', () => {
    const obs = interventionToFHIRObservation(sampleExerciseIntervention, 'user-456');
    const loincCoding = obs.code.coding?.find((c) => c.system === 'http://loinc.org');
    expect(loincCoding?.code).toBe('73985-4');
  });

  it('should include LOINC code for diet', () => {
    const obs = interventionToFHIRObservation(sampleDietIntervention, 'user-456');
    const loincCoding = obs.code.coding?.find((c) => c.system === 'http://loinc.org');
    expect(loincCoding?.code).toBe('81259-4');
  });

  it('should include LOINC code for sleep', () => {
    const obs = interventionToFHIRObservation(sampleSleepIntervention, 'user-456');
    const loincCoding = obs.code.coding?.find((c) => c.system === 'http://loinc.org');
    expect(loincCoding?.code).toBe('93832-4');
  });

  it('should include effectivePeriod', () => {
    const obs = interventionToFHIRObservation(sampleDietIntervention, 'user-456');
    expect(obs.effectivePeriod?.start).toBe('2024-02-01');
  });

  it('should include notes when present', () => {
    const obs = interventionToFHIRObservation(sampleDietIntervention, 'user-456');
    expect(obs.note?.[0]?.text).toBe('Reduzir carboidratos refinados');
  });
});

describe('interventionsToFHIRBundle', () => {
  const allInterventions: InterventionData[] = [
    sampleMedicationIntervention,
    sampleSupplementIntervention,
    sampleExerciseIntervention,
    sampleDietIntervention,
    sampleSleepIntervention,
  ];

  it('should create Bundle with Patient and all interventions', () => {
    const bundle = interventionsToFHIRBundle(allInterventions, sampleUserProfile);

    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('collection');
    // Patient + 5 interventions
    expect(bundle.entry).toHaveLength(6);
  });

  it('should include Patient as first entry', () => {
    const bundle = interventionsToFHIRBundle(allInterventions, sampleUserProfile);
    expect(bundle.entry[0].resource.resourceType).toBe('Patient');
  });

  it('should use MedicationStatement for medication and supplement', () => {
    const bundle = interventionsToFHIRBundle(allInterventions, sampleUserProfile);
    const medStatements = bundle.entry.filter(
      (e) => e.resource.resourceType === 'MedicationStatement',
    );
    expect(medStatements).toHaveLength(2);
  });

  it('should use Observation for exercise, diet, and sleep', () => {
    const bundle = interventionsToFHIRBundle(allInterventions, sampleUserProfile);
    const observations = bundle.entry.filter((e) => e.resource.resourceType === 'Observation');
    expect(observations).toHaveLength(3);
  });

  it('should handle empty interventions array', () => {
    const bundle = interventionsToFHIRBundle([], sampleUserProfile);
    expect(bundle.entry).toHaveLength(1); // Just Patient
    expect(bundle.entry[0].resource.resourceType).toBe('Patient');
  });

  it('should set correct fullUrl for each entry', () => {
    const bundle = interventionsToFHIRBundle([sampleMedicationIntervention], sampleUserProfile);
    expect(bundle.entry[1].fullUrl).toBe('urn:uuid:intervention-int-med-001');
  });
});
