#!/usr/bin/env node
/**
 * CLI: rnds-sandbox start [opções]
 *
 * Sobe um mock local da RNDS para desenvolvimento.
 */

import { createSandboxServer } from './server';
import { SCENARIOS } from './scenarios';
import type { ScenarioName, SandboxOptions } from './types';

interface ParsedArgs {
  command?: 'start' | 'help' | 'scenarios';
  options: SandboxOptions;
  errors: string[];
}

const HELP = `rnds-sandbox — mock local da RNDS

Uso:
  rnds-sandbox start [opções]
  rnds-sandbox scenarios
  rnds-sandbox --help

Opções de start:
  --port <n>            Porta (padrão: 8080, ou 8443 se --mtls)
  --host <h>            Host (padrão: 127.0.0.1)
  --scenario <nome>     paciente-com-exames | internacao | vacina | vazio
  --mtls                Habilita mTLS no handshake (requer --pfx, --pfx-password)
  --pfx <caminho>       Caminho do PFX do servidor
  --pfx-password <s>    Senha do PFX

Exemplos:
  rnds-sandbox start
  rnds-sandbox start --port 9000 --scenario internacao
  rnds-sandbox start --mtls --pfx ./cert.pfx --pfx-password senha
`;

function parseArgs(argv: string[]): ParsedArgs {
  const errors: string[] = [];
  const options: SandboxOptions = {};
  let command: ParsedArgs['command'];

  const args = [...argv];
  while (args.length > 0) {
    const token = args.shift()!;
    if (token === '--help' || token === '-h') {
      command = 'help';
      continue;
    }
    if (!command && (token === 'start' || token === 'scenarios' || token === 'help')) {
      command = token;
      continue;
    }
    if (token === '--port') {
      const value = args.shift();
      const port = Number(value);
      if (!value || Number.isNaN(port)) {
        errors.push(`--port requer valor numérico, recebido: ${String(value)}`);
      } else {
        options.port = port;
      }
      continue;
    }
    if (token === '--host') {
      const value = args.shift();
      if (!value) {
        errors.push('--host requer valor');
      } else {
        options.host = value;
      }
      continue;
    }
    if (token === '--scenario') {
      const value = args.shift();
      if (!value || !(value in SCENARIOS)) {
        errors.push(
          `--scenario inválido. Disponíveis: ${Object.keys(SCENARIOS).join(', ')}. Recebido: ${String(value)}`,
        );
      } else {
        options.scenario = value as ScenarioName;
      }
      continue;
    }
    if (token === '--mtls') {
      options.mtls = true;
      continue;
    }
    if (token === '--pfx') {
      const value = args.shift();
      if (!value) {
        errors.push('--pfx requer caminho');
      } else {
        options.serverPfx = value;
      }
      continue;
    }
    if (token === '--pfx-password') {
      const value = args.shift();
      if (!value) {
        errors.push('--pfx-password requer valor');
      } else {
        options.serverPfxPassword = value;
      }
      continue;
    }
    errors.push(`argumento desconhecido: ${token}`);
  }

  return { command, errors, options };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      process.stderr.write(`erro: ${err}\n`);
    }
    process.stderr.write('\n' + HELP);
    return 1;
  }

  if (!parsed.command || parsed.command === 'help') {
    process.stdout.write(HELP);
    return 0;
  }

  if (parsed.command === 'scenarios') {
    process.stdout.write('Cenários disponíveis:\n\n');
    for (const scenario of Object.values(SCENARIOS)) {
      process.stdout.write(`  ${scenario.name}\n    ${scenario.description}\n\n`);
    }
    return 0;
  }

  if (parsed.options.mtls && !parsed.options.serverPfx) {
    process.stderr.write('erro: --mtls requer --pfx <caminho> e --pfx-password <senha>\n');
    return 1;
  }

  const sandbox = createSandboxServer(parsed.options);
  await sandbox.start();

  const shutdown = async (signal: string) => {
    process.stdout.write(`\n[rnds-sandbox] recebido ${signal}, encerrando...\n`);
    await sandbox.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  return 0;
}

main().catch((err: unknown) => {
  process.stderr.write(`erro fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
