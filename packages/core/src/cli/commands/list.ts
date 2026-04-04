import { parseArgs } from 'node:util';

import {
  type BiomarkerDefinition,
  getAllDefinitions,
  getBiomarkersByCategory,
  getVisibleDefinitions,
} from '../../biomarkers.js';
import { exitWithError, formatTable, outputJson, outputText } from '../../cli-utils.js';

export async function list(args: string[], json: boolean): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      category: { type: 'string' },
      visible: { default: false, type: 'boolean' },
    },
    strict: false,
  });

  let defs: BiomarkerDefinition[];

  if (values.category) {
    defs = getBiomarkersByCategory(values.category as string);
    if (defs.length === 0) {
      exitWithError(`Categoria não encontrada ou vazia: ${values.category}`);
    }
  } else if (values.visible) {
    defs = getVisibleDefinitions();
  } else {
    defs = getAllDefinitions();
  }

  if (json) {
    outputJson(defs);
    return;
  }

  const rows = defs.map((d) => [
    d.code,
    d.loinc ?? '—',
    d.names.pt[0] ?? '',
    d.unit ?? '—',
    Array.isArray(d.category) ? d.category.join(', ') : d.category,
  ]);

  outputText(formatTable(['Código', 'LOINC', 'Nome (pt)', 'Unidade', 'Categoria'], rows));
  outputText(`\nTotal: ${defs.length} biomarcadores`);
}
