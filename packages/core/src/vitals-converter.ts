/**
 * Perfil de saúde em FHIR: medidas corporais, pressão arterial, condições
 * declaradas e perfil alimentar.
 *
 * Tudo aqui é declarado pela própria pessoa no perfil, não medido por um
 * serviço. Os recursos dizem isso onde o R4 tem lugar para dizer: o
 * `verificationStatus` das condições é `unconfirmed`, o `MedicationStatement`
 * do tratamento de pressão é só texto, e o fumo sai como `Observation` de
 * história social, não como diagnóstico.
 */

import { type Addressable } from './bundle-urls';
import { ICD10_SYSTEM } from './code-systems';
import {
  exportLoincAnswerCoding,
  type ExportLoincUse,
  localCoding,
  requireExportLoinc,
} from './export-codes';
import {
  fhirResourceId,
  observationCategory,
  patientReference,
  ucumQuantity,
} from './export-helpers';
import type {
  FHIRAllergyIntolerance,
  FHIRCodeableConcept,
  FHIRCondition,
  FHIRMedicationStatement,
  FHIRObservation,
} from './fhir-types';
import type { DietaryProfileData, HealthConditionsData, VitalsData } from './types';

/**
 * CID-10 das condições que o perfil declara, no título da tradução brasileira
 * (CBCD/DATASUS). O perfil não distingue o tipo de diabetes, então o código é
 * o de diabetes não especificado; o modelo BRDMRISC, que prevê tipo 2, usa
 * E11 em `risk-converter.ts`.
 */
export const ICD10_CODES = {
  diabetesUnspecified: { code: 'E14', display: 'Diabetes mellitus não especificado' },
  essentialHypertension: { code: 'I10', display: 'Hipertensão essencial (primária)' },
  type2Diabetes: { code: 'E11', display: 'Diabetes mellitus não-insulino-dependente' },
} as const;

const icd10Concept = (key: keyof typeof ICD10_CODES): FHIRCodeableConcept => ({
  coding: [{ ...ICD10_CODES[key], system: ICD10_SYSTEM }],
});

const dateSuffix = (iso?: string): string => (iso ? iso.slice(0, 10) : 'perfil');

/**
 * Medidas corporais e pressão arterial como `Observation` de sinais vitais.
 * Só sai o que foi informado; a pressão vai num painel com sistólica e
 * diastólica em componentes, como o perfil de sinais vitais do HL7 pede.
 */
export function vitalsToFHIRObservations(
  vitals: VitalsData,
  patientId: string,
): Addressable<FHIRObservation>[] {
  const base = (
    use: ExportLoincUse,
    slug: string,
    measuredAt: string | undefined,
  ): Addressable<FHIRObservation> => ({
    category: observationCategory('vital-signs'),
    code: requireExportLoinc(use),
    ...(measuredAt ? { effectiveDateTime: measuredAt } : {}),
    id: fhirResourceId('vitals', slug, dateSuffix(measuredAt)),
    resourceType: 'Observation',
    status: 'final',
    subject: patientReference(patientId),
  });

  const observations: Addressable<FHIRObservation>[] = [];
  if (vitals.heightCm !== undefined) {
    observations.push({
      ...base('bodyHeight', 'height', vitals.measuredAt),
      valueQuantity: ucumQuantity(vitals.heightCm, 'cm', 'cm'),
    });
  }
  if (vitals.weightKg !== undefined) {
    observations.push({
      ...base('bodyWeight', 'weight', vitals.measuredAt),
      valueQuantity: ucumQuantity(vitals.weightKg, 'kg', 'kg'),
    });
  }
  if (vitals.waistCm !== undefined) {
    observations.push({
      ...base('waistCircumference', 'waist', vitals.measuredAt),
      valueQuantity: ucumQuantity(vitals.waistCm, 'cm', 'cm'),
    });
  }
  if (vitals.bloodPressure) {
    const { diastolic, measuredAt, systolic } = vitals.bloodPressure;
    observations.push({
      ...base('bloodPressurePanel', 'blood-pressure', measuredAt ?? vitals.measuredAt),
      component: [
        {
          code: requireExportLoinc('systolicBloodPressure'),
          valueQuantity: ucumQuantity(systolic, 'mm[Hg]', 'mmHg'),
        },
        {
          code: requireExportLoinc('diastolicBloodPressure'),
          valueQuantity: ucumQuantity(diastolic, 'mm[Hg]', 'mmHg'),
        },
      ],
    });
  }
  return observations;
}

const declaredCondition = (
  key: keyof typeof ICD10_CODES,
  patientId: string,
  recordedAt: string | undefined,
): Addressable<FHIRCondition> => ({
  category: [
    {
      coding: [
        {
          code: 'problem-list-item',
          display: 'Problem List Item',
          system: 'http://terminology.hl7.org/CodeSystem/condition-category',
        },
      ],
    },
  ],
  clinicalStatus: {
    coding: [
      {
        code: 'active',
        display: 'Active',
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
      },
    ],
  },
  code: icd10Concept(key),
  id: fhirResourceId('condition', ICD10_CODES[key].code),
  ...(recordedAt ? { recordedDate: recordedAt } : {}),
  resourceType: 'Condition',
  subject: patientReference(patientId),
  // Declarado pela pessoa, sem laudo médico por trás: é o que `unconfirmed`
  // significa no R4.
  verificationStatus: {
    coding: [
      {
        code: 'unconfirmed',
        display: 'Unconfirmed',
        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
      },
    ],
  },
});

/**
 * Condições declaradas: diabetes e hipertensão em tratamento viram `Condition`
 * com CID-10; o tratamento de pressão leva também um `MedicationStatement`
 * só com texto, porque o perfil não guarda qual remédio; o fumo sai como
 * `Observation` de história social com a resposta LOINC de fumante quando a
 * pessoa declara fumar, e só com texto quando declara não fumar, porque o
 * perfil não distingue quem nunca fumou de quem parou.
 */
export function healthConditionsToFHIR(
  conditions: HealthConditionsData,
  patientId: string,
): Addressable<FHIRCondition | FHIRMedicationStatement | FHIRObservation>[] {
  const resources: Addressable<FHIRCondition | FHIRMedicationStatement | FHIRObservation>[] = [];
  const { recordedAt } = conditions;

  if (conditions.diabetes) {
    resources.push(declaredCondition('diabetesUnspecified', patientId, recordedAt));
  }
  if (conditions.bpTreatment) {
    resources.push(declaredCondition('essentialHypertension', patientId, recordedAt));
    resources.push({
      category: {
        coding: [
          {
            code: 'patientspecified',
            display: 'Patient Specified',
            system: 'http://terminology.hl7.org/CodeSystem/medication-statement-category',
          },
        ],
      },
      ...(recordedAt ? { dateAsserted: recordedAt } : {}),
      id: fhirResourceId('medication', 'anti-hypertensive'),
      medicationCodeableConcept: {
        text: 'Tratamento anti-hipertensivo (medicamento não informado)',
      },
      reasonCode: [icd10Concept('essentialHypertension')],
      resourceType: 'MedicationStatement',
      status: 'active',
      subject: patientReference(patientId),
    });
  }
  if (conditions.smoking !== undefined) {
    resources.push({
      category: observationCategory('social-history'),
      code: requireExportLoinc('tobaccoSmokingStatus'),
      ...(recordedAt ? { effectiveDateTime: recordedAt } : {}),
      id: fhirResourceId('smoking-status', dateSuffix(recordedAt)),
      resourceType: 'Observation',
      status: 'final',
      subject: patientReference(patientId),
      valueCodeableConcept: conditions.smoking
        ? {
            coding: [exportLoincAnswerCoding('smokerCurrentStatusUnknown')],
            text: 'Fuma (declarado)',
          }
        : { text: 'Não fuma (declarado)' },
    });
  }
  return resources;
}

/**
 * Perfil alimentar: cada alergia vira `AllergyIntolerance` de categoria
 * alimentar; o tipo de dieta e cada restrição viram `Observation` de história
 * social com código local, porque não há LOINC para "dieta vegana declarada".
 * `NutritionOrder` não cabe: é prescrição de profissional, não declaração.
 */
export function dietaryProfileToFHIR(
  diet: DietaryProfileData,
  patientId: string,
): Addressable<FHIRAllergyIntolerance | FHIRObservation>[] {
  const resources: Addressable<FHIRAllergyIntolerance | FHIRObservation>[] = [];
  const { recordedAt } = diet;
  const socialHistory = (
    slug: string,
    code: FHIRCodeableConcept,
    text: string,
  ): Addressable<FHIRObservation> => ({
    category: observationCategory('social-history'),
    code,
    ...(recordedAt ? { effectiveDateTime: recordedAt } : {}),
    id: fhirResourceId('diet', slug),
    resourceType: 'Observation',
    status: 'final',
    subject: patientReference(patientId),
    valueCodeableConcept: { text },
  });

  for (const allergen of diet.allergies ?? []) {
    resources.push({
      category: ['food'],
      clinicalStatus: {
        coding: [
          {
            code: 'active',
            display: 'Active',
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          },
        ],
      },
      code: { text: allergen },
      id: fhirResourceId('allergy', allergen),
      patient: patientReference(patientId),
      ...(recordedAt ? { recordedDate: recordedAt } : {}),
      resourceType: 'AllergyIntolerance',
      type: 'allergy',
    });
  }
  if (diet.dietType) {
    resources.push(socialHistory('type', { coding: [localCoding('dietType')] }, diet.dietType));
  }
  for (const restriction of diet.restrictions ?? []) {
    resources.push(
      socialHistory(
        `restriction-${restriction}`,
        { coding: [localCoding('dietaryRestriction')] },
        restriction,
      ),
    );
  }
  return resources;
}
