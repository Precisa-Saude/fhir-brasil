import { exitWithError, getInput, outputJson, outputText } from '../../cli-utils.js';
import type { FHIRBundle } from '../../fhir-types.js';
import { processImportBundle } from '../../importer.js';

export async function importBundle(args: string[], json: boolean): Promise<void> {
  const raw = await getInput(args[0]);

  let bundle: FHIRBundle;
  try {
    bundle = JSON.parse(raw);
  } catch {
    exitWithError('JSON inválido.');
  }

  const result = processImportBundle(bundle);

  if (json) {
    outputJson(result);
    return;
  }

  outputText(`Processados: ${result.totalProcessed}`);
  outputText(`Importados:  ${result.imported.length}`);
  outputText(`Ignorados:   ${result.skipped.length}`);
  outputText(`Erros:       ${result.errors.length}`);

  if (result.imported.length > 0) {
    outputText('\nObservações importadas:');
    for (const obs of result.imported) {
      outputText(`  ${obs.biomarkerCode} (${obs.loincCode}): ${obs.value} ${obs.unit}`);
    }
  }

  if (result.errors.length > 0) {
    outputText('\nErros:');
    for (const err of result.errors) {
      outputText(`  ${err.field}: ${err.details}`);
    }
  }
}
