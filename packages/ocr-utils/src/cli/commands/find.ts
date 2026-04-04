import { formatTable, getInput, outputJson, outputText } from '@precisa-saude/fhir/cli-utils';

import { findBiomarkersInText } from '../../anchor.js';

export async function find(args: string[], json: boolean): Promise<void> {
  const text = await getInput(args[0]);
  const result = findBiomarkersInText(text);

  if (json) {
    outputJson(result);
    return;
  }

  if (result.matches.length === 0) {
    outputText('Nenhum biomarcador encontrado no texto.');
    return;
  }

  const rows = result.matches.map((m) => [
    m.code,
    m.loinc ?? '—',
    m.matchedName,
    m.confidence.toFixed(2),
    String(m.position),
  ]);

  outputText(formatTable(['Código', 'LOINC', 'Match', 'Confiança', 'Posição'], rows));
  outputText(
    `\nEncontrados: ${result.stats.matchedCount} de ${result.stats.totalPatterns} padrões (${result.stats.scanTimeMs}ms)`,
  );
}
