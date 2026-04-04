import { getDefinitionByCode } from '../../biomarkers.js';
import { exitWithError, outputJson, outputText } from '../../cli-utils.js';
import { getCanonicalUnit, getDefaultUnit, unitToUCUM } from '../../units.js';

export async function units(args: string[], json: boolean): Promise<void> {
  const code = args[0];
  if (!code) exitWithError('Uso: fhir-bio units <código>');

  const def = getDefinitionByCode(code);
  if (!def) exitWithError(`Biomarcador não encontrado: ${code}`);

  const defaultUnit = getDefaultUnit(code) || def.unit || '';
  const canonical = getCanonicalUnit(code);
  const ucum = defaultUnit ? unitToUCUM(defaultUnit) : '';

  const unitDetails = {
    canonicalUnit: canonical ?? '—',
    defaultUnit,
    ucum: ucum || '—',
  };

  if (json) {
    outputJson({ ...def, ...unitDetails });
    return;
  }

  outputText(
    [
      `Unidades: ${code}`,
      `  Padrão:    ${unitDetails.defaultUnit || '—'}`,
      `  Canônica:  ${unitDetails.canonicalUnit}`,
      `  UCUM:      ${unitDetails.ucum}`,
    ].join('\n'),
  );
}
