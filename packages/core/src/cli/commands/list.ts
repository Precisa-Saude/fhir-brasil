import { parseArgs } from 'node:util';

import {
  type BiomarkerDefinition,
  getAllDefinitions,
  getVisibleDefinitions,
} from '../../biomarkers.js';
import { exitWithError, formatTable, outputJson, outputText } from '../../cli-utils.js';
import { diagnosticSectionOf } from '../../diagnostic-sections.js';

export async function list(args: string[], json: boolean): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      section: { type: 'string' },
      visible: { default: false, type: 'boolean' },
    },
    strict: false,
  });

  let defs: BiomarkerDefinition[];

  if (values.section) {
    const section = String(values.section).toUpperCase();
    defs = getAllDefinitions().filter((d) => diagnosticSectionOf(d.code) === section);
    if (defs.length === 0) {
      exitWithError(`Seção não encontrada ou vazia: ${values.section}`);
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
    diagnosticSectionOf(d.code) ?? '—',
  ]);

  outputText(formatTable(['Código', 'LOINC', 'Nome (pt)', 'Unidade', 'Seção'], rows));
  outputText(`\nTotal: ${defs.length} biomarcadores`);
}
