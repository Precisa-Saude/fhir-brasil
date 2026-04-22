/**
 * Servidor HTTP(S) do sandbox.
 *
 * Cria um http.Server (sem mTLS) ou https.Server (com mTLS opcional)
 * que despacha requisições para o roteador. Em modo mTLS, o cert do
 * cliente apresentado no handshake é repassado ao roteador para que
 * /api/token possa exigir + extrair identidade dele.
 */

import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import http from 'node:http';
import https from 'node:https';
import type { TLSSocket } from 'node:tls';

import { resolveSigningKeys, type SigningKeys } from './keys';
import { dispatch, type PeerCertInfo, type RouteContext } from './router';
import { resolveScenario } from './scenarios';
import { SandboxStore } from './store';
import type { SandboxOptions } from './types';

export interface SandboxServer {
  /** Servidor HTTP(S) subjacente. */
  server: http.Server | https.Server;
  /** Chaves RSA usadas para assinar/validar tokens. */
  signingKeys: SigningKeys;
  /** Inicia o servidor. Retorna quando estiver escutando. */
  start: () => Promise<{ host: string; port: number }>;
  /** Encerra o servidor. */
  stop: () => Promise<void>;
  /** Store em memória — útil para inspeção em testes. */
  store: SandboxStore;
}

export function createSandboxServer(options: SandboxOptions = {}): SandboxServer {
  // eslint-disable-next-line no-console
  const log = options.log ?? ((msg: string) => console.log(`[rnds-sandbox] ${msg}`));
  const useMtls = options.mtls === true;
  const strict = options.strict ?? useMtls;
  const port = options.port ?? (useMtls ? 8443 : 8080);
  const host = options.host ?? '127.0.0.1';

  const store = new SandboxStore();
  store.load(resolveScenario(options.scenario));

  const signingKeys = resolveSigningKeys({
    keyId: options.jwtKeyId,
    privateKey: options.jwtPrivateKey,
    publicKey: options.jwtPublicKey,
  });

  const handler = (req: IncomingMessage, res: ServerResponse) => {
    handleRequest(req, res, { keys: signingKeys, log, store, strict, useMtls }).catch(
      (err: unknown) => {
        log(`erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
        if (res.headersSent) {
          // Headers já foram para o socket — só garante que o response feche
          // para o cliente não pendurar. Sem body novo.
          if (!res.writableEnded) res.end();
          return;
        }
        res.writeHead(500, { 'Content-Type': 'application/fhir+json; charset=utf-8' });
        res.end(
          JSON.stringify({
            issue: [{ code: 'exception', diagnostics: String(err), severity: 'fatal' }],
            resourceType: 'OperationOutcome',
          }),
        );
      },
    );
  };

  const server: http.Server | https.Server = useMtls
    ? https.createServer(buildTlsOptions(options), handler)
    : http.createServer(handler);

  return {
    server,
    signingKeys,
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
              `(cenário: ${options.scenario ?? 'paciente-com-exames'}, strict=${strict}, kid=${signingKeys.keyId})`,
          );
          resolve({ host, port: actualPort });
        });
      }),
    stop: () =>
      new Promise<void>((resolve, reject) => {
        // server.close() para de aceitar novas conexões mas não derruba
        // keep-alive existentes — em testes isso pode prender o vitest.
        server.closeAllConnections?.();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
    store,
  };
}

interface HandlerContext {
  keys: SigningKeys;
  log: (msg: string) => void;
  store: SandboxStore;
  strict: boolean;
  useMtls: boolean;
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: HandlerContext,
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://sandbox.local');
  const body = await readBody(req);
  const peerCert = ctx.useMtls ? extractPeerCert(req) : undefined;
  const headers = lowercaseHeaders(req.headers);

  const routeCtx: RouteContext = {
    body,
    headers,
    keys: ctx.keys,
    method: req.method ?? 'GET',
    path: url.pathname,
    peerCert,
    query: url.searchParams,
    store: ctx.store,
    strict: ctx.strict,
  };

  const response = dispatch(routeCtx);
  ctx.log(`${routeCtx.method} ${routeCtx.path} → ${response.status}`);

  res.writeHead(response.status, {
    'Content-Type': 'application/fhir+json; charset=utf-8',
  });
  res.end(JSON.stringify(response.body));
}

/** Sentinela retornada quando o corpo da requisição não é JSON válido. */
const INVALID_BODY = Symbol.for('rnds-sandbox.invalidBody');

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
    // JSON malformado — retorna sentinela. Handler de POST detecta e
    // devolve OperationOutcome com `code: 'structure'` em vez de tentar
    // tratar a string como Bundle.
    return INVALID_BODY;
  }
}

/** True quando o body é a sentinela INVALID_BODY (JSON malformado). */
export function isInvalidBody(body: unknown): boolean {
  return body === INVALID_BODY;
}

function extractPeerCert(req: IncomingMessage): PeerCertInfo {
  const socket = req.socket as TLSSocket;
  if (typeof socket.getPeerCertificate !== 'function') {
    return { presented: false };
  }
  const cert = socket.getPeerCertificate();
  if (!cert || Object.keys(cert).length === 0) {
    return { presented: false };
  }
  const cn = readCommonName(cert.subject);
  return {
    cn,
    cnes: cn ? extractCnesFromCn(cn) : undefined,
    presented: true,
  };
}

function readCommonName(subject: unknown): string | undefined {
  if (!subject || typeof subject !== 'object') {
    return undefined;
  }
  const cnValue = (subject as Record<string, unknown>).CN;
  if (typeof cnValue === 'string') {
    return cnValue;
  }
  return undefined;
}

function extractCnesFromCn(cn: string): string | undefined {
  // Heurística: CN de cert ICP-Brasil PJ frequentemente embute CNES como
  // sequência de 7 dígitos; se não for o caso, simplesmente não retorna nada.
  const match = /\b(\d{7})\b/.exec(cn);
  return match ? match[1] : undefined;
}

function lowercaseHeaders(headers: http.IncomingHttpHeaders): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      out[key.toLowerCase()] = value.join(', ');
    } else {
      out[key.toLowerCase()] = value;
    }
  }
  return out;
}

function buildTlsOptions(options: SandboxOptions): https.ServerOptions {
  const tlsOptions: https.ServerOptions = {
    rejectUnauthorized: false,
    requestCert: true,
  };
  if (options.serverPfx) {
    tlsOptions.pfx = resolveBuffer(options.serverPfx);
    if (options.serverPfxPassword) {
      tlsOptions.passphrase = options.serverPfxPassword;
    }
  } else if (options.serverKey && options.serverCert) {
    tlsOptions.key = resolveBuffer(options.serverKey);
    tlsOptions.cert = resolveBuffer(options.serverCert);
  } else {
    throw new Error('mTLS requer --pfx + --pfx-password OU --server-key + --server-cert (PEM)');
  }
  return tlsOptions;
}

function resolveBuffer(value: Buffer | string): Buffer {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.includes('-----BEGIN')) {
    return Buffer.from(value);
  }
  return fs.readFileSync(value);
}
