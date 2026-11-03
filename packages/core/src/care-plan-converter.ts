/**
 * O plano de ação gerado pela Precisa IA como `CarePlan` de intenção
 * `proposal`: é sugestão de software, não prescrição, e o recurso diz isso no
 * `intent` e no `author`.
 */

import { type Addressable } from './bundle-urls';
import { localCoding } from './export-codes';
import { fhirResourceId, patientReference } from './export-helpers';
import type { FHIRCarePlan } from './fhir-types';
import type { ActionPlanData } from './types';

/** O plano de ação em cache como `CarePlan`, uma atividade por recomendação. */
export function actionPlanToFHIRCarePlan(
  plan: ActionPlanData,
  patientId: string,
): Addressable<FHIRCarePlan> {
  return {
    activity: plan.recommendations.map((recommendation) => ({
      detail: {
        code: {
          coding: [localCoding('recommendation')],
          text: recommendation.category
            ? `${recommendation.title} (${recommendation.category})`
            : recommendation.title,
        },
        ...(recommendation.description ? { description: recommendation.description } : {}),
        status: 'not-started',
      },
    })),
    author: { display: 'Precisa IA' },
    created: plan.generatedAt,
    description: 'Plano de ação sugerido pela Precisa IA a partir dos resultados da pessoa.',
    id: fhirResourceId('careplan', plan.planId),
    intent: 'proposal',
    resourceType: 'CarePlan',
    status: 'active',
    subject: patientReference(patientId),
    title: 'Plano de ação sugerido',
  };
}
