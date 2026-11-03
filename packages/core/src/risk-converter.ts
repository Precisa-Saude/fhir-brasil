/**
 * Escores derivados em FHIR: PhenoAge como `Observation` com componentes e
 * BRDMRISC como `RiskAssessment`.
 *
 * Nenhum dos dois tem LOINC. O PhenoAge sai com código local e a idade
 * cronológica, que tem LOINC, como componente; o BRDMRISC é uma previsão, e o
 * R4 tem recurso próprio para isso, com a probabilidade, o horizonte e o
 * desfecho em CID-10.
 */

import { type Addressable } from './bundle-urls';
import { ICD10_SYSTEM } from './code-systems';
import { localCoding, requireExportLoinc } from './export-codes';
import {
  fhirResourceId,
  observationCategory,
  patientReference,
  ucumQuantity,
} from './export-helpers';
import type { FHIRObservation, FHIRRiskAssessment } from './fhir-types';
import type { BrDMriscResultData, PhenoAgeResultData } from './types';
import { ICD10_CODES } from './vitals-converter';

/**
 * PhenoAge (Levine et al., 2018) como `Observation` de categoria `survey`, a
 * categoria do HL7 para escores de instrumentos de avaliação. O valor é a
 * idade fenotípica em anos; os componentes trazem a idade cronológica, a
 * diferença e o escore de mortalidade.
 */
export function phenoAgeToFHIRObservation(
  result: PhenoAgeResultData,
  patientId: string,
): Addressable<FHIRObservation> {
  const years = (value: number) => ucumQuantity(value, 'a', 'anos');
  return {
    category: observationCategory('survey'),
    code: { coding: [localCoding('phenoAge')] },
    component: [
      { code: requireExportLoinc('age'), valueQuantity: years(result.chronologicalAge) },
      {
        code: { coding: [localCoding('phenoAgeDifference')] },
        valueQuantity: years(result.ageDifference),
      },
      {
        code: { coding: [localCoding('phenoAgeMortalityScore')] },
        valueQuantity: ucumQuantity(result.mortalityScore, '{score}', 'escore'),
      },
    ],
    effectiveDateTime: result.calculatedAt,
    id: fhirResourceId('phenoage', result.resultId),
    resourceType: 'Observation',
    status: 'final',
    subject: patientReference(patientId),
    valueQuantity: years(result.phenoAge),
  };
}

/**
 * BRDMRISC como `RiskAssessment`: desfecho diabetes tipo 2 (CID-10 E11),
 * probabilidade em 10 anos, categoria qualitativa como o modelo a nomeia e,
 * quando quem chama as tem, as `Observation` laboratoriais que alimentaram o
 * cálculo em `basis`.
 */
export function brDMriscToFHIRRiskAssessment(
  result: BrDMriscResultData,
  patientId: string,
): Addressable<FHIRRiskAssessment> {
  const basis = (result.basisObservationIds ?? []).map((id) => ({
    reference: `Observation/${id}`,
  }));
  return {
    ...(basis.length > 0 ? { basis } : {}),
    code: { coding: [localCoding('brdmrisc')] },
    id: fhirResourceId('brdmrisc', result.resultId),
    ...(result.modelUsed ? { method: { text: result.modelUsed } } : {}),
    occurrenceDateTime: result.calculatedAt,
    prediction: [
      {
        outcome: { coding: [{ ...ICD10_CODES.type2Diabetes, system: ICD10_SYSTEM }] },
        probabilityDecimal: result.risk10y,
        qualitativeRisk: { text: result.riskCategory },
        whenRange: { high: ucumQuantity(10, 'a', 'anos') },
      },
    ],
    resourceType: 'RiskAssessment',
    status: 'final',
    subject: patientReference(patientId),
  };
}
