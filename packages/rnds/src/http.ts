/**
 * Wrapper mTLS sobre node:https
 *
 * Encapsula node:https.request para fazer chamadas HTTPS
 * com certificado PFX (mutual TLS). Usado apenas para
 * autenticação com a RNDS.
 */

import https from 'node:https';

export interface HttpsResponse {
  body: string;
  headers: Record<string, string | string[] | undefined>;
  statusCode: number;
}

export interface HttpsCertOptions {
  passphrase: string;
  pfx: Buffer;
}

export function httpsRequestWithCert(
  url: string,
  certOptions: HttpsCertOptions,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  },
): Promise<HttpsResponse> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);

    const req = https.request(
      {
        headers: options?.headers,
        hostname: parsedUrl.hostname,
        method: options?.method ?? 'GET',
        passphrase: certOptions.passphrase,
        path: parsedUrl.pathname + parsedUrl.search,
        pfx: certOptions.pfx,
        port: parsedUrl.port || 443,
        timeout: options?.timeout ?? 30_000,
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          resolve({
            body: Buffer.concat(chunks).toString('utf-8'),
            headers: res.headers as Record<string, string | string[] | undefined>,
            statusCode: res.statusCode ?? 0,
          });
        });
      },
    );

    req.on('error', (err) => {
      reject(new Error(`Erro na requisição HTTPS: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout na requisição HTTPS'));
    });

    if (options?.body) {
      req.write(options.body);
    }

    req.end();
  });
}
