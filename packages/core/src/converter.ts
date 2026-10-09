/**
 * FHIR Converter
 *
 * Converts lab results to FHIR R4 DiagnosticReport and Observation resources.
 * See: https://hl7.org/fhir/diagnosticreport.html
 */

import { codeToLoinc, methodVariantOf } from './biomarkers';
import { type Addressable, entryFullUrl } from './bundle-urls';
import { BIOMARKER_CODE_SYSTEM, LOINC_SYSTEM } from './code-systems';
import type {
  FHIRBundle,
  FHIRDiagnosticReport,
  FHIRObservation,
  FHIRPatient,
  FHIRQuantity,
  FHIRReferenceRange,
} from './fhir-types';
import { getLoincEntry } from './loinc-axes';
import { ordinalValueFor } from './ordinal-answers';
import { referenceRangeMeaning } from './reference-ranges';
import type { Flag, LabObservationData, LabReportData, UserProfileData } from './types';
import { getDefaultUnit, resolveUcum } from './units';

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
 * O `coding` do sexo, que vai **dentro** do CodeableConcept do `appliesTo`.
 *
 * O nome diz `CODING` e não `APPLIES_TO` de propósito: isto não é o valor do
 * campo, é uma entrada da lista de codificações dele. O embrulho acontece no
 * uso, em `{ coding: [SEX_CODING[sex]] }`.
 *
 * É o `AdministrativeGender`, e não o v3-ObservationInterpretation nem um
 * sistema nosso: um consumidor que já lê `Patient.gender` compara os dois sem
 * tabela de tradução no meio.
 */
const SEX_CODING = {
  female: {
    code: 'female',
    display: 'Female',
    system: 'http://hl7.org/fhir/administrative-gender',
  },
  male: { code: 'male', display: 'Male', system: 'http://hl7.org/fhir/administrative-gender' },
} as const;

/**
 * Monta as faixas de referência do `Observation`.
 *
 * Duas mudanças em relação ao que existia, e as duas são sobre não perder o que
 * o laudo imprimiu.
 *
 * **Um limite só já basta.** Antes a faixa só saía com os dois, e um laudo que
 * publica "inferior a 190 mg/dL" ou "superior a 60 mL/min/1,73m²" perdia o
 * campo inteiro. O R4 trata `low` e `high` como opcionais independentes e
 * documenta o caso de um lado só, e o importador deste mesmo pacote já lia
 * `low?.value` e `high?.value` com acesso opcional: a assimetria era só do
 * escritor. Ver PRE-430.
 *
 * **Mais de uma faixa, anotada.** Laudo com uma coluna de referência por sexo
 * passa a sair com as duas, cada uma com o seu `appliesTo`, em vez de o
 * pipeline escolher uma sem saber de quem é o exame. Ver PRE-424 e PRE-425.
 */
const buildReferenceRanges = (
  observation: LabObservationData,
  quantity: (value: number) => FHIRQuantity,
): FHIRReferenceRange[] => {
  // Devolve lista, e não uma faixa: o caso sem limite nenhum vira lista vazia
  // em vez de `undefined`, e aí os dois caminhos abaixo se compõem com
  // `flatMap` sem ninguém precisar filtrar nada depois.
  const toRanges = (low?: number, high?: number, sex?: 'female' | 'male'): FHIRReferenceRange[] => {
    if (low === undefined && high === undefined) return [];

    return [
      {
        ...(sex === undefined ? {} : { appliesTo: [{ coding: [SEX_CODING[sex]] }] }),
        ...(high === undefined ? {} : { high: quantity(high) }),
        ...(low === undefined ? {} : { low: quantity(low) }),
      },
    ];
  };

  // A lista anotada tem precedência: quando ela existe, o par simples é o
  // resumo de uma das colunas e repeti-lo publicaria a mesma faixa duas vezes,
  // uma delas sem dizer a quem se aplica.
  //
  // Lista vazia cai no par simples, igual a ausente, e isso é escolha: as duas
  // dizem "não tenho faixa anotada", e tratá-las diferente faria um `[]` vindo
  // de um `.filter()` apagar em silêncio a faixa que o chamador também mandou
  // em `referenceMin` e `referenceMax`.
  if (observation.referenceRanges && observation.referenceRanges.length > 0) {
    return observation.referenceRanges.flatMap((r) => toRanges(r.low, r.high, r.appliesTo));
  }

  const meaning = observation.referenceKind && referenceRangeMeaning(observation.referenceKind);
  return toRanges(observation.referenceMin, observation.referenceMax).map((range) =>
    meaning ? { ...range, type: { coding: [meaning] } } : range,
  );
};

/**
 * Convert generic lab observation to FHIR Observation
 */
export function labObservationToFHIR(
  observation: LabObservationData,
  patientId: string,
  laboratoryName?: string,
): Addressable<FHIRObservation> {
  // O código por método só sai quando é variante declarada do biomarcador. Um
  // `methodLoinc` qualquer viraria afirmação sob `http://loinc.org` que o
  // catálogo não conferiu.
  const methodLoinc =
    observation.methodLoinc && methodVariantOf(observation.biomarkerCode, observation.methodLoinc)
      ? observation.methodLoinc
      : undefined;
  const loincCode = methodLoinc ?? codeToLoinc(observation.biomarkerCode);
  // Use default unit if source unit is empty
  const sourceUnit =
    observation.unit || getDefaultUnit(observation.biomarkerCode) || observation.unit;
  // `system` + `code` só saem quando a unidade resolve em UCUM. Unidade que o
  // pacote não sabe traduzir fica só em `unit`, como texto: afirmar
  // `http://unitsofmeasure.org` sobre `x10^3/mm3` era publicar um código
  // falso, e quem consome o Bundle confiando no system trataria aquilo como
  // UCUM de verdade.
  const ucumUnit = resolveUcum(sourceUnit, observation.biomarkerCode);
  const quantity = (value: number): FHIRQuantity => ({
    ...(ucumUnit ? { code: ucumUnit, system: 'http://unitsofmeasure.org' } : {}),
    ...(sourceUnit ? { unit: sourceUnit } : {}),
    value,
  });
  const isQualitative = observation.isQualitative || typeof observation.value === 'string';

  // Base observation structure
  const fhirObs: Addressable<FHIRObservation> = {
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
      // Sem LOINC, o coding LOINC simplesmente não sai. Antes ia `99999-9`,
      // que não é código LOINC nenhum: publicava sob `http://loinc.org` uma
      // afirmação falsa, e quem consumisse o bundle confiando no system
      // trataria aquilo como código de verdade. Composição corporal, densidade
      // óssea e escore de cálcio não têm LOINC, e o certo é a lacuna explícita.
      coding: [
        ...(loincCode
          ? [
              {
                code: loincCode,
                // O display de um coding é o do sistema de código, e a licença
                // do LOINC (seção 10.3) pede o nome oficial junto do código. O
                // nome do laudo em português fica em `code.text` e no coding do
                // catálogo. Fora do snapshot (código que só o chamador conhece),
                // não há nome oficial para dar, e o display sai vazio em vez de
                // pôr um nome nosso sob `http://loinc.org`.
                display: getLoincEntry(loincCode)?.display,
                system: LOINC_SYSTEM,
              },
            ]
          : []),
        {
          code: observation.biomarkerCode,
          display: observation.biomarkerName,
          system: BIOMARKER_CODE_SYSTEM,
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

  // Resultado em texto sai codificado quando a grafia tem resposta LOINC
  // conferida ("Negativo", "Traços", "++"), com o impresso em `text`. Grafia
  // sem código ("Raras", "Límpido") continua em `valueString`: um código
  // aproximado seria pior que o texto exato.
  if (isQualitative) {
    const printed = String(observation.value);
    const coded = ordinalValueFor(printed, observation.answerCode);
    if (coded) fhirObs.valueCodeableConcept = coded;
    else fhirObs.valueString = printed;
  } else {
    fhirObs.valueQuantity = quantity(observation.value as number);

    // Reference range only applies to quantitative values
    const referenceRange = buildReferenceRanges(observation, quantity);
    if (referenceRange.length > 0) fhirObs.referenceRange = referenceRange;
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
): Addressable<FHIRDiagnosticReport> {
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
export function userProfileToFHIR(profile: UserProfileData): Addressable<FHIRPatient> {
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
  const fhirObservations = observations.map((obs) => {
    const resource = labObservationToFHIR(
      { ...obs, collectionDate: report.collectionDate },
      patientId,
      report.laboratoryName,
    );

    return { fullUrl: entryFullUrl(resource), resource };
  });

  // Os ids vêm dos recursos já montados, e não de uma segunda montagem da mesma
  // regra. O `DiagnosticReport.result` aponta para eles, e era aqui que a
  // referência se separava do recurso.
  const observationIds = fhirObservations.map((entry) => entry.resource.id);

  // Convert report
  const diagnosticReport = labReportToFHIR(report, patientId, observationIds);

  // Convert patient
  const fhirPatient = userProfileToFHIR(userProfile);

  return {
    entry: [
      { fullUrl: entryFullUrl(fhirPatient), resource: fhirPatient },
      { fullUrl: entryFullUrl(diagnosticReport), resource: diagnosticReport },
      ...fhirObservations,
    ],
    resourceType: 'Bundle',
    type: 'collection',
  };
}
