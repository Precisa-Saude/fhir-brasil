import {
  type BiomarkerDefinition,
  getDefinitionByCode,
  getDefinitionByLoinc,
} from '../../biomarkers.js';
import { exitWithError, outputJson, outputText } from '../../cli-utils.js';

function displayDefinition(def: BiomarkerDefinition): void {
  const cat = Array.isArray(def.category) ? def.category.join(', ') : def.category;
  outputText(
    [
      `Biomarcador: ${def.code}`,
      `  LOINC:      ${def.loinc ?? '—'}`,
      `  Nomes (pt): ${def.names.pt.join(', ')}`,
      `  Nomes (en): ${def.names.en.join(', ')}`,
      `  Categoria:  ${cat}`,
      `  Unidade:    ${def.unit ?? '—'}`,
      `  Sexo:       ${def.sex ?? 'ambos'}`,
      `  Visível:    ${def.hidden ? 'não' : 'sim'}`,
    ].join('\n'),
  );
}

export async function lookup(args: string[], json: boolean): Promise<void> {
  const code = args[0];
  if (!code) exitWithError('Uso: fhir-bio lookup <código>');

  const def = getDefinitionByCode(code);
  if (!def) exitWithError(`Biomarcador não encontrado: ${code}`);

  if (json) {
    outputJson(def);
  } else {
    displayDefinition(def);
  }
}

export async function lookupLoinc(args: string[], json: boolean): Promise<void> {
  const loinc = args[0];
  if (!loinc) exitWithError('Uso: fhir-bio lookup-loinc <loinc>');

  const def = getDefinitionByLoinc(loinc);
  if (!def) exitWithError(`Biomarcador não encontrado para LOINC: ${loinc}`);

  if (json) {
    outputJson(def);
  } else {
    displayDefinition(def);
  }
}
