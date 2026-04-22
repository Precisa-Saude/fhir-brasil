#!/usr/bin/env node
/**
 * CLI: rnds-sandbox start [opções]
 *
 * Sobe um mock local da RNDS para desenvolvimento.
 */

import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { SCENARIOS } from './scenarios';
import { createSandboxServer } from './server';
import type { SandboxOptions, ScenarioName } from './types';

export interface ParsedArgs {
  command?: 'start' | 'help' | 'scenarios';
  errors: string[];
  options: SandboxOptions;
}

const HELP = `rnds-sandbox — mock local da RNDS

Uso:
  rnds-sandbox start [opções]
  rnds-sandbox scenarios
  rnds-sandbox --help

Opções de start:
  --port <n>              Porta (padrão: 8080, ou 8443 se --mtls)
  --host <h>              Host (padrão: 127.0.0.1)
  --scenario <nome>       paciente-com-exames | internacao | vacina | vazio

Modos de fidelidade RNDS:
  --strict                Exige bearer token + header Authorization: <CNS> em /api/fhir/r4/*
                          (implícito quando --mtls está ativo)
  --mtls                  HTTPS + handshake mTLS (cliente apresenta cert).
                          /api/token exige cert; FHIR API exige bearer.
  --no-validate           Desabilita validação contra perfis BR* do IG em POST /Bundle
                          (default: validação ON, retorna 422 OperationOutcome em falha)

Cert do servidor (use uma forma OU outra):
  --pfx <caminho>         PFX do servidor
  --pfx-password <s>      Senha do PFX
  --server-key <caminho>  PEM da chave privada do servidor
  --server-cert <caminho> PEM do certificado do servidor

Chaves de assinatura JWT (RS256):
  --jwt-private-key <p>   PEM da chave privada (padrão: gera uma RSA-2048 efêmera)
  --jwt-public-key <p>    PEM da chave pública (opcional — derivada da privada)
  --jwt-key-id <s>        kid no JWT/JWKS (padrão: rnds-sandbox-1)

Exemplos:
  rnds-sandbox start
  rnds-sandbox start --strict --jwt-private-key ./jwt.pem
  rnds-sandbox start --port 9000 --scenario internacao
  rnds-sandbox start --mtls --pfx ./cert.pfx --pfx-password senha
  rnds-sandbox start --mtls --server-key ./srv.key --server-cert ./srv.crt
`;

const STRING_ARGS: Record<string, (options: SandboxOptions, value: string) => void> = {
  '--host': (o, v) => {
    o.host = v;
  },
  '--jwt-key-id': (o, v) => {
    o.jwtKeyId = v;
  },
  '--jwt-private-key': (o, v) => {
    o.jwtPrivateKey = v;
  },
  '--jwt-public-key': (o, v) => {
    o.jwtPublicKey = v;
  },
  '--pfx': (o, v) => {
    o.serverPfx = v;
  },
  '--pfx-password': (o, v) => {
    o.serverPfxPassword = v;
  },
  '--server-cert': (o, v) => {
    o.serverCert = v;
  },
  '--server-key': (o, v) => {
    o.serverKey = v;
  },
};

export function parseArgs(argv: string[]): ParsedArgs {
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
    if (token === '--strict') {
      options.strict = true;
      continue;
    }
    if (token === '--no-validate') {
      options.validateSubmissions = false;
      continue;
    }
    const stringSetter = STRING_ARGS[token];
    if (stringSetter) {
      const value = args.shift();
      if (!value) {
        errors.push(`${token} requer valor`);
      } else {
        stringSetter(options, value);
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
    process.stderr.write(`\n${HELP}`);
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

  if (parsed.options.mtls) {
    const hasPfx = parsed.options.serverPfx;
    const hasKeyAndCert = parsed.options.serverKey && parsed.options.serverCert;
    if (!hasPfx && !hasKeyAndCert) {
      process.stderr.write(
        'erro: --mtls requer --pfx + --pfx-password OU --server-key + --server-cert\n',
      );
      return 1;
    }
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

// Só executa quando este arquivo é o entry-point. Comparamos via realpath
// (ambos os lados) porque `process.argv[1]` pode ser um symlink criado pelo
// npm em `node_modules/.bin/` enquanto `import.meta.url` resolve para o
// arquivo bundled real. Sem realpath, importar este módulo em teste acaba
// disparando `main()` em alguns ambientes / o oposto: o bin não roda quando
// invocado via npx.
function isCliEntryPoint(): boolean {
  const argv1 = process.argv[1];
  if (typeof argv1 !== 'string' || argv1.length === 0) return false;
  try {
    const here = fs.realpathSync(fileURLToPath(import.meta.url));
    const invoked = fs.realpathSync(argv1);
    return here === invoked;
  } catch {
    return false;
  }
}

if (isCliEntryPoint()) {
  main().catch((err: unknown) => {
    process.stderr.write(`erro fatal: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
