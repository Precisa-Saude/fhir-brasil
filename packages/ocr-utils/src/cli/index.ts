import { parseArgs } from 'node:util';

import { exitWithError } from '@precisa-saude/fhir/cli-utils';

import { codes } from './commands/codes.js';
import { find } from './commands/find.js';

const VERSION = '0.4.1';

const HELP = `fhir-ocr — CLI do @precisa-saude/fhir-ocr-utils

Uso: fhir-ocr <comando> [op��ões]

Comandos:
  find [arquivo]          Encontrar biomarcadores em texto OCR
  codes [arquivo]         Extrair códigos de biomarcadores encontrados no texto

Flags globais:
  --json                  Saída em formato JSON
  --help, -h              Mostrar ajuda
  --version, -v           Mostrar versão

Lê de stdin quando nenhum arquivo é fornecido.
`;

type CommandFn = (args: string[], json: boolean) => Promise<void>;

const COMMANDS: Record<string, CommandFn> = {
  codes,
  find,
};

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
    process.stdout.write(`${VERSION}\n`);
    return;
  }

  const [command, ...rest] = positionals;

  if (values.help || !command) {
    process.stdout.write(HELP);
    return;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    exitWithError(`Comando desconhecido: ${command}\nUse --help para ver os comandos disponíveis.`);
  }

  await handler(rest, values.json as boolean);
}

main().catch((err: Error) => exitWithError(err.message));
