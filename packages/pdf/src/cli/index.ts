import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { exitWithError, outputJson, outputText } from '@precisa-saude/fhir/cli-utils';

import { extractPdfText } from '../extract-text.js';

declare const __VERSION__: string;

const HELP = `fhir-pdf — CLI do @precisa-saude/fhir-pdf

Uso: fhir-pdf text <arquivo.pdf> [--json]

Comandos:
  text <arquivo.pdf>      Extrair a camada de texto do PDF

Flags:
  --json                  Saída em JSON, com uma entrada por página
  --help, -h              Mostrar ajuda
  --version, -v           Mostrar versão

Não faz OCR: laudo digitalizado não tem camada de texto e sai vazio.
`;

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      help: { default: false, short: 'h', type: 'boolean' },
      json: { default: false, type: 'boolean' },
      version: { default: false, short: 'v', type: 'boolean' },
    },
    strict: false,
  });

  if (values.version) {
    process.stdout.write(`${__VERSION__}\n`);
    return;
  }

  const [command, file] = positionals;

  if (values.help || !command) {
    process.stdout.write(HELP);
    return;
  }

  if (command !== 'text') {
    exitWithError(`Comando desconhecido: ${command}\nUse --help para ver os comandos disponíveis.`);
  }
  if (!file) {
    exitWithError('Informe o caminho do PDF. Exemplo: fhir-pdf text laudo.pdf');
  }

  const result = await extractPdfText(new Uint8Array(await readFile(file)));

  if (values.json) {
    outputJson(result);
    return;
  }

  if (result.text === '') {
    exitWithError(
      'Este PDF não tem camada de texto, provavelmente porque é digitalizado.\n' +
        'Rode um OCR por fora e passe o texto para o `fhir-ocr find`.',
    );
  }

  outputText(result.text);
}

main().catch((err: Error) => exitWithError(err.message));
