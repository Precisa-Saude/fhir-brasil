import { generateKeyPairSync, type KeyObject } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { calculateJwkThumbprint, CompactSign, exportJWK } from 'jose';

import type { RegistryDocument, RegistryKey } from '../registry-types';
import type { LabAccessRequest, LabAccessResponse, LabAccessTransport } from '../transport';

const FIXTURES = new URL('./fixtures/registry/', import.meta.url);

/** Bytes exatos do registro de exemplo da especificação (sintético). */
export function exampleRegistryBytes(): Uint8Array {
  return new Uint8Array(
    readFileSync(fileURLToPath(new URL('participantes.exemplo.json', FIXTURES))),
  );
}

/** Assinatura destacada do registro de exemplo. */
export function exampleRegistrySignature(): string {
  return readFileSync(fileURLToPath(new URL('participantes.exemplo.json.jws', FIXTURES)), 'utf-8');
}

export function exampleRegistryDocument(): RegistryDocument {
  return JSON.parse(Buffer.from(exampleRegistryBytes()).toString('utf-8')) as RegistryDocument;
}

/** Instante em que o registro de exemplo está dentro da validade. */
export const EXAMPLE_NOW = new Date('2026-11-16T12:00:00Z');

export const PROVIDER_ID = '5f0c7c0e-3d1a-4b7e-9a51-2f6d8c1e4a10';
export const CLIENT_ID = 'c2b8f6a4-71de-4c0b-8f3a-9e5d2a7b6c31';
export const ISSUER = 'https://auth.laboratorio.example';
export const FHIR_BASE = 'https://api.laboratorio.example/fhir/r4';
export const API_BASE = 'https://api.laboratorio.example/acesso/v0';
export const REDIRECT_URI = 'https://app-paciente.example/conexoes/retorno';

/** CPFs de teste com dígitos verificadores válidos, já usados no repositório. */
export const CPF_PATIENT = '52998224725';
export const CPF_OTHER = '11144477735';

export interface TestKey {
  jwk: RegistryKey;
  kid: string;
  privateKey: KeyObject;
  publicKey: KeyObject;
}

const keyCache = new Map<string, Promise<TestKey>>();

/** Par RSA de teste. Gerar chave é lento, então cada rótulo é gerado uma vez. */
export function testKey(label = 'default'): Promise<TestKey> {
  let cached = keyCache.get(label);
  if (!cached) {
    cached = (async () => {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const exported = await exportJWK(publicKey);
      const kid = await calculateJwkThumbprint(exported, 'sha256');
      const jwk: RegistryKey = {
        alg: 'PS256',
        e: exported.e!,
        kid,
        kty: 'RSA',
        n: exported.n!,
        use: 'sig',
      };
      return { jwk, kid, privateKey, publicKey };
    })();
    keyCache.set(label, cached);
  }
  return cached;
}

export function encodeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value, null, 2));
}

/** Assina os bytes como JWS de conteúdo destacado (`cabeçalho..assinatura`). */
export async function signDetached(
  bytes: Uint8Array,
  key: TestKey,
  header: Record<string, unknown> = {},
): Promise<string> {
  const jws = await new CompactSign(bytes)
    .setProtectedHeader({ alg: 'PS256', kid: key.kid, typ: 'JOSE', ...header })
    .sign(key.privateKey);
  const [protectedHeader, , signature] = jws.split('.');
  return `${protectedHeader}..${signature}`;
}

/** Documento válido derivado do exemplo, com a chave de teste em `registry_keys`. */
export async function buildRegistryDocument(
  change: (doc: RegistryDocument) => void = () => {},
  keyLabel = 'default',
): Promise<RegistryDocument> {
  const key = await testKey(keyLabel);
  const doc = exampleRegistryDocument();
  doc.registry_keys = { keys: [{ ...key.jwk }] };
  change(doc);
  return doc;
}

export interface RecordedCall extends LabAccessRequest {
  form?: URLSearchParams;
  json?: unknown;
}

export type Handler = (
  request: RecordedCall,
) => LabAccessResponse | Promise<LabAccessResponse | undefined> | undefined;

export interface FakeTransport extends LabAccessTransport {
  calls: RecordedCall[];
}

/** Transporte em memória: registra as chamadas e responde pelo `handler`. */
export function fakeTransport(handler: Handler): FakeTransport {
  const calls: RecordedCall[] = [];
  return {
    calls,
    async request(request) {
      const call: RecordedCall = { ...request, headers: { ...request.headers } };
      const contentType = request.headers['Content-Type'] ?? '';
      if (request.body !== undefined) {
        if (contentType.includes('x-www-form-urlencoded')) {
          call.form = new URLSearchParams(request.body);
        } else {
          call.json = JSON.parse(request.body) as unknown;
        }
      }
      calls.push(call);
      const response = await handler(call);
      if (!response) {
        throw new Error(`Chamada inesperada no teste: ${request.method} ${request.url}`);
      }
      return response;
    },
  };
}

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): LabAccessResponse {
  return {
    body: body === undefined ? '' : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
    status,
  };
}

export function operationOutcome(code: string, issueCode = 'invalid', text = 'Erro de teste.') {
  return {
    issue: [
      {
        code: issueCode,
        details: {
          coding: [{ code, system: 'urn:open-labs-brasil:error-code' }],
          text,
        },
        severity: 'error',
      },
    ],
    resourceType: 'OperationOutcome',
  };
}
