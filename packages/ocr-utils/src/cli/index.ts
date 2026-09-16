import { parseArgs } from 'node:util';

import { exitWithError } from '@precisa-saude/fhir/cli-utils';

import { check } from './commands/check.js';
import { codes } from './commands/codes.js';
import { extract } from './commands/extract.js';
import { find } from './commands/find.js';
import { schema } from './commands/schema.js';

declare const __VERSION__: string;

const HELP = `fhir-ocr — CLI do @precisa-saude/fhir-ocr-utils

Uso: fhir-ocr <comando> [opções]

Comandos:
  find [arquivo]          Encontrar biomarcadores em texto OCR
  codes [arquivo]         Extrair códigos de biomarcadores encontrados no texto
  schema                  Imprimir o contrato de saída esperado do modelo
  extract [arquivo]       Mandar o laudo a um modelo compatível com OpenAI
                          (--model, --base-url, --api-key-env,
                          --response-format, se precisar forçar um modo)
  check <saida.json>      Conferir a saída de um modelo contra o contrato
                          e contra a ancoragem (--source <laudo.txt>).
                          Com --convert, imprime o envelope do fhir-bio

Flags globais:
  --json                  Saída em formato JSON
  --help, -h              Mostrar ajuda
  --version, -v           Mostrar versão

Lê de stdin quando nenhum arquivo é fornecido.
`;

type CommandFn = (args: string[], json: boolean, options: Record<string, unknown>) => Promise<void>;

const COMMANDS: Record<string, CommandFn> = {
  check,
  codes,
  extract,
  find,
  schema,
};

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      // `check` precisa do texto que foi ao modelo. Declarado aqui porque o
      // `parseArgs` roda uma vez só, no topo, e opção não declarada vira
      // booleana e joga o valor nos posicionais.
      'api-key-env': { type: 'string' },
      'base-url': { type: 'string' },
      convert: { default: false, type: 'boolean' },
      help: { default: false, short: 'h', type: 'boolean' },
      json: { default: false, type: 'boolean' },
      model: { type: 'string' },
      'response-format': { type: 'string' },
      source: { type: 'string' },
      version: { default: false, short: 'v', type: 'boolean' },
    },
    strict: false,
  });

  if (values.version) {
    process.stdout.write(`${__VERSION__}\n`);
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

  await handler(rest, Boolean(values.json), values);
}

main().catch((err: Error) => exitWithError(err.message));
