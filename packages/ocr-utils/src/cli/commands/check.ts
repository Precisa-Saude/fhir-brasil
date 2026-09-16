import {
  exitWithError,
  formatTable,
  getInput,
  outputJson,
  outputText,
  parseJson,
} from '@precisa-saude/fhir/cli-utils';

import { findBiomarkersInText } from '../../anchor.js';
import { extractionToLabResult } from '../../extraction-to-lab-result.js';
import { validateExtraction } from '../../extraction-validator.js';

/**
 * Confere a saída de um modelo contra o contrato e contra a ancoragem.
 *
 *   fhir-ocr check saida.json --source laudo.txt
 *
 * O `--source` é o mesmo texto que foi ao modelo, e a ancoragem é refeita aqui
 * em vez de ser recebida pronta: aceitar a lista de permitidos de fora deixaria
 * quem chama contornar a checagem sem perceber.
 *
 * Sem `--source` só a forma é conferida, e a saída diz isso em voz alta. É um
 * modo mais fraco de propósito, para inspecionar resposta de modelo sem ter o
 * laudo em mãos.
 */
export async function check(
  args: string[],
  json: boolean,
  options: Record<string, unknown> = {},
): Promise<void> {
  const sourcePath = typeof options.source === 'string' ? options.source : undefined;

  const raw = parseJson<unknown>(await getInput(args[0]), 'Saída do modelo não é JSON válido.');
  const anchors = sourcePath ? findBiomarkersInText(await getInput(sourcePath)) : undefined;

  const result = validateExtraction(raw, { anchors });

  // `--convert` fecha a cadeia: a saída vira o envelope do `fhir-bio convert`,
  // então dá para encanar demo inteira sem editar JSON à mão no meio.
  if (options.convert === true) {
    if (!result.valid) {
      exitWithError(`Saída inválida: ${result.errors.join('; ')}`);
    }
    outputJson(extractionToLabResult(result.accepted));
    return;
  }

  if (json) {
    outputJson(result);
    return;
  }

  if (!result.valid) {
    exitWithError(`Saída inválida: ${result.errors.join('; ')}`);
  }

  if (result.accepted.length > 0) {
    outputText(
      formatTable(
        ['LOINC', 'Nome', 'Valor', 'Unidade'],
        result.accepted.map((b) => [
          b.loinc ?? '—',
          b.name,
          String(b.value),
          b.unit === '' ? '—' : b.unit,
        ]),
      ),
    );
  }

  if (result.rejected.length > 0) {
    outputText(`\nRecusados: ${result.rejected.length}`);
    for (const r of result.rejected) {
      outputText(`  [${r.reason}] ${r.detail}`);
    }
  }

  const total = result.accepted.length + result.rejected.length;
  outputText(
    `\nAceitos: ${result.accepted.length} de ${total}${
      anchors ? '' : '   (sem --source: ancoragem não conferida)'
    }`,
  );
}
