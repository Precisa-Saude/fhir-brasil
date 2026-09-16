import { loincToCode } from '@precisa-saude/fhir';

import type { ExtractedBiomarker } from './extraction-schema.js';

/**
 * Converte grandezas já conferidas no envelope que o `fhir-bio convert` come.
 *
 * O laudo e o paciente não vêm do modelo: o contrato de extração cobre só as
 * grandezas. Os dois saem daqui com valores sintéticos e óbvios, na mesma
 * linha do `fhir-rnds-sandbox`, para a demo rodar de ponta a ponta sem inventar
 * identidade de ninguém. Quem integra de verdade troca os dois pelo que já tem.
 */
export interface LabResultEnvelope {
  observations: {
    biomarkerCode: string;
    biomarkerName: string;
    flag: 'H' | 'L' | '';
    referenceMax?: number;
    referenceMin?: number;
    reportId: string;
    unit: string;
    value: number | string;
  }[];
  profile: { name: string; userId: string };
  report: {
    collectionDate: string;
    createdAt: string;
    overallStatus: 'ANORMAL' | 'NORMAL';
    processingStatus: 'complete';
    reportId: string;
    userId: string;
  };
}

export interface ToLabResultOptions {
  collectionDate?: string;
  reportId?: string;
  userId?: string;
}

/** `H`/`L` só quando o próprio laudo trouxe a faixa. Nunca inferida daqui. */
function flagFor(b: ExtractedBiomarker): 'H' | 'L' | '' {
  if (typeof b.value !== 'number') return '';
  if (typeof b.referenceMax === 'number' && b.value > b.referenceMax) return 'H';
  if (typeof b.referenceMin === 'number' && b.value < b.referenceMin) return 'L';
  return '';
}

export function extractionToLabResult(
  biomarkers: ExtractedBiomarker[],
  options: ToLabResultOptions = {},
): LabResultEnvelope {
  const reportId = options.reportId ?? 'laudo-demo';
  const userId = options.userId ?? 'paciente-demo';
  const collectionDate = options.collectionDate ?? new Date().toISOString().slice(0, 10);

  const observations = biomarkers.flatMap((b) => {
    // Sem código interno não há como converter, e o LOINC sozinho não basta
    // para o `convert`. Cai fora em silêncio porque a checagem de ancoragem já
    // rodou antes: o que chega aqui sem código é grandeza fora do catálogo.
    const code = b.loinc ? loincToCode(b.loinc) : undefined;
    if (!code) return [];

    return [
      {
        biomarkerCode: code,
        biomarkerName: b.name,
        flag: flagFor(b),
        ...(typeof b.referenceMax === 'number' ? { referenceMax: b.referenceMax } : {}),
        ...(typeof b.referenceMin === 'number' ? { referenceMin: b.referenceMin } : {}),
        reportId,
        unit: b.unit,
        value: b.value,
      },
    ];
  });

  return {
    observations,
    profile: { name: 'Paciente de Demonstração', userId },
    report: {
      collectionDate,
      createdAt: `${collectionDate}T00:00:00Z`,
      overallStatus: observations.some((o) => o.flag !== '') ? 'ANORMAL' : 'NORMAL',
      processingStatus: 'complete',
      reportId,
      userId,
    },
  };
}
