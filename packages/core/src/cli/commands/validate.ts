import { exitWithError, getInput, outputJson, outputText } from '../../cli-utils.js';
import { validateFHIRImportBundle } from '../../validators.js';

export async function validate(args: string[], json: boolean): Promise<void> {
  const raw = await getInput(args[0]);

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    exitWithError('JSON inválido.');
  }

  const errors = validateFHIRImportBundle(data as never);

  if (json) {
    outputJson({ errors, valid: errors.length === 0 });
    return;
  }

  if (errors.length === 0) {
    outputText('Recurso FHIR válido.');
  } else {
    outputText('Erros de validação:');
    for (const err of errors) {
      outputText(`  ${err.field}: ${err.details}`);
    }
    process.exitCode = 1;
  }
}
