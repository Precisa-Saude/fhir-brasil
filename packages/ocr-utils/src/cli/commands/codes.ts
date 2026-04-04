import { getInput, outputJson, outputText } from '@precisa-saude/fhir/cli-utils';

import { findBiomarkersInText, getMatchedCodes } from '../../anchor.js';

export async function codes(args: string[], json: boolean): Promise<void> {
  const text = await getInput(args[0]);
  const result = findBiomarkersInText(text);
  const matched = getMatchedCodes(result);

  if (json) {
    outputJson(matched);
    return;
  }

  if (matched.length === 0) {
    outputText('Nenhum biomarcador encontrado no texto.');
    return;
  }

  outputText(matched.join('\n'));
  outputText(`\nTotal: ${matched.length} códigos encontrados`);
}
