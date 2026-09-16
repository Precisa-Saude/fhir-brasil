import { exitWithError, getInput, outputJson } from '@precisa-saude/fhir/cli-utils';

import { extractWithModel } from '../../llm-client.js';

const DEFAULT_BASE_URL = 'http://localhost:1234/v1';

/**
 * Chama um modelo compatível com OpenAI e imprime a resposta crua.
 *
 *   fhir-ocr extract laudo.txt --model qwen3.5-9b
 *   fhir-ocr extract laudo.txt --base-url https://openrouter.ai/api/v1 \
 *     --model <modelo> --api-key-env OPENROUTER_API_KEY
 *
 * Imprime o que o modelo devolveu, sem conferir nada, porque a conferência é o
 * `fhir-ocr check` e ver os dois passos separados é o ponto da demo.
 */
export async function extract(
  args: string[],
  _json: boolean,
  options: Record<string, unknown> = {},
): Promise<void> {
  const model = typeof options.model === 'string' ? options.model : undefined;
  if (!model) {
    exitWithError('Informe o modelo com --model. Exemplo: --model qwen3.5-9b');
  }

  const baseUrl = typeof options['base-url'] === 'string' ? options['base-url'] : DEFAULT_BASE_URL;
  const keyEnv = typeof options['api-key-env'] === 'string' ? options['api-key-env'] : undefined;
  const apiKey = keyEnv ? process.env[keyEnv] : undefined;

  if (keyEnv && !apiKey) {
    exitWithError(`A variável de ambiente ${keyEnv} está vazia.`);
  }

  // Só para forçar um modo. O padrão negocia sozinho, e é o que quase todo
  // mundo deveria usar.
  const rf = options['response-format'];
  const modos = ['auto', 'json_object', 'json_schema', 'none'];
  if (rf !== undefined && (typeof rf !== 'string' || !modos.includes(rf))) {
    exitWithError(`--response-format aceita ${modos.join(', ')}.`);
  }
  const responseFormat = rf as 'auto' | 'json_object' | 'json_schema' | 'none' | undefined;

  const text = await getInput(args[0]);

  try {
    const result = await extractWithModel(text, { apiKey, baseUrl, model, responseFormat });
    process.stderr.write(`modelo respondeu em ${String(result.tookMs)}ms\n`);
    outputJson(result.payload);
  } catch (err) {
    exitWithError(err instanceof Error ? err.message : String(err));
  }
}
