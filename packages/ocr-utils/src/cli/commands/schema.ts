import { outputJson } from '@precisa-saude/fhir/cli-utils';

import { LAB_EXTRACTION_SCHEMA } from '../../extraction-schema.js';

/**
 * Imprime o contrato de saída. Sempre JSON, mesmo sem `--json`: o uso desta
 * subcomando é alimentar outra ferramenta, e um modo "bonito" só daria uma
 * forma errada para alguém colar no lugar errado.
 */
export async function schema(_args: string[], _json: boolean): Promise<void> {
  outputJson(LAB_EXTRACTION_SCHEMA);
}
