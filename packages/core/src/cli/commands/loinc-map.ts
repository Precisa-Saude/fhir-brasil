import { getAllDefinitions } from '../../biomarkers.js';
import { formatTable, outputJson, outputText } from '../../cli-utils.js';

export async function loincMap(_args: string[], json: boolean): Promise<void> {
  const defs = getAllDefinitions().filter((d) => d.loinc);

  if (json) {
    const map = Object.fromEntries(defs.map((d) => [d.loinc, d.code]));
    outputJson(map);
    return;
  }

  const rows = defs.map((d) => [d.loinc!, d.code, d.names.pt[0] ?? d.names.en[0] ?? '']);

  outputText(formatTable(['LOINC', 'Código', 'Nome (pt)'], rows));
  outputText(`\nTotal: ${rows.length} mapeamentos`);
}
