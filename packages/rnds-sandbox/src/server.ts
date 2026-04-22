/**
 * Servidor HTTP(S) do sandbox.
 *
 * Cria um http.Server (ou https.Server com mTLS) que despacha
 * requisições para o roteador.
 */

import fs from 'node:fs';
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import https from 'node:https';

import { dispatch, type RouteContext } from './router';
import { resolveScenario } from './scenarios';
import { SandboxStore } from './store';
import type { SandboxOptions } from './types';

export interface SandboxServer {
  /** Servidor HTTP(S) subjacente. */
  server: http.Server | https.Server;
  /** Store em memória — útil para inspeção em testes. */
  store: SandboxStore;
  /** Inicia o servidor. Retorna quando estiver escutando. */
  start: () => Promise<{ host: string; port: number }>;
  /** Encerra o servidor. */
  stop: () => Promise<void>;
}

export function createSandboxServer(options: SandboxOptions = {}): SandboxServer {
  const log = options.log ?? ((msg: string) => console.log(`[rnds-sandbox] ${msg}`));
  const useMtls = options.mtls === true;
  const port = options.port ?? (useMtls ? 8443 : 8080);
  const host = options.host ?? '127.0.0.1';

  const store = new SandboxStore();
  store.load(resolveScenario(options.scenario));

  const handler = (req: IncomingMessage, res: ServerResponse) => {
    handleRequest(req, res, store, log).catch((err: unknown) => {
      log(`erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            issue: [{ code: 'exception', diagnostics: String(err), severity: 'fatal' }],
            resourceType: 'OperationOutcome',
          }),
        );
      }
    });
  };

  const server: http.Server | https.Server = useMtls
    ? https.createServer(
        {
          pfx: resolvePfx(options.serverPfx),
          passphrase: options.serverPfxPassword,
          requestCert: true,
          rejectUnauthorized: false,
        },
        handler,
      )
    : http.createServer(handler);

  return {
    server,
    store,
    start: () =>
      new Promise<{ host: string; port: number }>((resolve, reject) => {
        const onError = (err: Error) => {
          server.off('error', onError);
          reject(err);
        };
        server.once('error', onError);
        server.listen(port, host, () => {
          server.off('error', onError);
          const address = server.address();
          const actualPort = typeof address === 'object' && address ? address.port : port;
          log(
            `${useMtls ? 'HTTPS+mTLS' : 'HTTP'} ouvindo em ${host}:${actualPort} ` +
              `(cenário: ${options.scenario ?? 'paciente-com-exames'})`,
          );
          resolve({ host, port: actualPort });
        });
      }),
    stop: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  store: SandboxStore,
  log: (msg: string) => void,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://sandbox.local');
  const body = await readBody(req);
  const ctx: RouteContext = {
    body,
    method: req.method ?? 'GET',
    path: url.pathname,
    query: url.searchParams,
    store,
  };

  const response = dispatch(ctx);
  log(`${ctx.method} ${ctx.path} → ${response.status}`);

  res.writeHead(response.status, {
    'Content-Type': 'application/fhir+json; charset=utf-8',
  });
  res.end(JSON.stringify(response.body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    return undefined;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  const text = Buffer.concat(chunks).toString('utf-8');
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function resolvePfx(pfx: Buffer | string | undefined): Buffer | undefined {
  if (!pfx) {
    return undefined;
  }
  if (typeof pfx === 'string') {
    return fs.readFileSync(pfx);
  }
  return pfx;
}
