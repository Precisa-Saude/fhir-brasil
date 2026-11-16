/**
 * Transporte HTTPS com mTLS.
 *
 * Toda chamada do cliente passa por `LabAccessTransport`. A implementação
 * padrão usa `node:https` e apresenta o certificado de cliente em toda
 * conexão: o protocolo exige mTLS em todos os endpoints entre servidores
 * (PAR, token, revogação, consentimento e API FHIR).
 */

import { X509Certificate } from 'node:crypto';
import https from 'node:https';

import { LabAccessConfigError, LabAccessTransportError } from './errors';

export interface LabAccessRequest {
  body?: string;
  headers: Record<string, string>;
  method: 'DELETE' | 'GET' | 'POST' | 'PUT';
  url: string;
}

export interface LabAccessResponse {
  body: string;
  headers: Record<string, string | string[] | undefined>;
  status: number;
}

export interface LabAccessTransport {
  /**
   * Certificado de cliente em DER, quando o transporte o conhece. O cliente
   * usa esse valor para conferir o certificado contra o registro.
   */
  readonly clientCertificate?: Uint8Array;
  request(request: LabAccessRequest): Promise<LabAccessResponse>;
}

export interface MtlsTransportOptions {
  /** Autoridades certificadoras aceitas para o servidor. Padrão: as do Node. */
  ca?: Buffer | string | (Buffer | string)[];
  /** Certificado de cliente em PEM, o mesmo registrado em `transport_certificates`. */
  cert: Buffer | string;
  /** Chave privada do certificado de cliente, em PEM. */
  key: Buffer | string;
  /** Senha da chave privada, quando cifrada. */
  passphrase?: string;
  /** Tempo limite por requisição, em milissegundos. Padrão: 30 000. */
  timeoutMs?: number;
}

/**
 * Suítes oferecidas. No TLS 1.2, só as quatro que a seção 7.5 admite entre
 * servidores. As três primeiras são as do TLS 1.3.
 */
const CIPHERS = [
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'TLS_AES_128_GCM_SHA256',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES256-GCM-SHA384',
].join(':');

/**
 * Cria o transporte padrão. O certificado do servidor é sempre conferido e
 * não há opção para desligar a conferência.
 */
export function createMtlsTransport(options: MtlsTransportOptions): LabAccessTransport {
  let clientCertificate: Uint8Array;
  try {
    clientCertificate = new Uint8Array(new X509Certificate(options.cert).raw);
  } catch (cause) {
    throw new LabAccessConfigError('O certificado de cliente não é um certificado X.509 válido.', {
      cause,
    });
  }

  return {
    clientCertificate,
    request(request) {
      return new Promise((resolve, reject) => {
        const url = new URL(request.url);
        if (url.protocol !== 'https:') {
          reject(new LabAccessConfigError(`Só HTTPS é aceito: ${url.origin}`));
          return;
        }

        const req = https.request(
          {
            ca: options.ca,
            cert: options.cert,
            ciphers: CIPHERS,
            headers: request.headers,
            hostname: url.hostname,
            key: options.key,
            method: request.method,
            minVersion: 'TLSv1.2',
            passphrase: options.passphrase,
            path: url.pathname + url.search,
            port: Number(url.port) || 443,
            rejectUnauthorized: true,
            timeout: options.timeoutMs ?? 30_000,
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('error', (cause) => {
              reject(new LabAccessTransportError('Erro ao ler a resposta HTTPS.', { cause }));
            });
            res.on('end', () => {
              resolve({
                body: Buffer.concat(chunks).toString('utf-8'),
                headers: res.headers,
                status: res.statusCode ?? 0,
              });
            });
          },
        );

        req.on('error', (cause) => {
          reject(new LabAccessTransportError('Erro na requisição HTTPS.', { cause }));
        });
        req.on('timeout', () => {
          req.destroy();
          reject(new LabAccessTransportError('Tempo limite da requisição HTTPS esgotado.'));
        });

        if (request.body !== undefined) req.write(request.body);
        req.end();
      });
    },
  };
}

/** Lê um cabeçalho de resposta sem depender de maiúsculas e minúsculas. */
export function header(response: LabAccessResponse, name: string): string | undefined {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(response.headers)) {
    if (key.toLowerCase() === wanted) return Array.isArray(value) ? value[0] : value;
  }
  return undefined;
}
