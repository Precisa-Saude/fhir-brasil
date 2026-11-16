/**
 * Descoberta do servidor de autorização (seção 5.2).
 *
 * O `issuer` vem do registro assinado e os endpoints OAuth vêm do documento de
 * metadados desse `issuer`. O cliente não obtém endereços de outra forma.
 */

import { parseJson, toOAuthError } from './error-codes';
import { IssuerMismatchError, ProviderMetadataError } from './errors';
import type { LabAccessTransport } from './transport';

export interface AuthorizationServerEndpoints {
  /** Aberto no navegador do paciente. Não tem alias mTLS. */
  authorizationEndpoint: string;
  issuer: string;
  parEndpoint: string;
  revocationEndpoint?: string;
  tokenEndpoint: string;
}

const WELL_KNOWN = '/.well-known/oauth-authorization-server';

/** Monta a URL do documento de metadados conforme o RFC 8414, seção 3. */
export function metadataUrl(issuer: string): string {
  let url: URL;
  try {
    url = new URL(issuer);
  } catch (cause) {
    throw new ProviderMetadataError('O issuer do provedor não é uma URL.', { cause });
  }
  if (url.protocol !== 'https:' || url.search !== '' || url.hash !== '') {
    throw new ProviderMetadataError(
      'O issuer deveria ser uma URL https sem consulta e sem fragmento.',
    );
  }
  const path = url.pathname === '/' ? '' : url.pathname;
  return `${url.origin}${WELL_KNOWN}${path}`;
}

function httpsEndpoint(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.startsWith('https://')) {
    throw new ProviderMetadataError(`Os metadados não trazem ${name} como URL https.`);
  }
  return value;
}

function requireListed(metadata: Record<string, unknown>, field: string, wanted: string[]): void {
  const values = metadata[field];
  if (!Array.isArray(values) || !wanted.every((item) => values.includes(item))) {
    throw new ProviderMetadataError(`Os metadados não anunciam ${wanted.join(', ')} em ${field}.`);
  }
}

function requireTrue(metadata: Record<string, unknown>, field: string): void {
  if (metadata[field] !== true) {
    throw new ProviderMetadataError(`Os metadados deveriam trazer ${field} igual a true.`);
  }
}

/**
 * Lê o documento de metadados e devolve os endpoints a usar.
 *
 * Recusa o provedor quando o `issuer` do documento não é idêntico ao do
 * registro, e quando o documento não anuncia o perfil de segurança do
 * protocolo. Quando há `mtls_endpoint_aliases`, os endpoints entre servidores
 * usam os endereços de lá.
 */
export async function discoverAuthorizationServer(
  transport: LabAccessTransport,
  issuer: string,
): Promise<AuthorizationServerEndpoints> {
  const response = await transport.request({
    headers: { Accept: 'application/json' },
    method: 'GET',
    url: metadataUrl(issuer),
  });
  if (response.status !== 200) throw toOAuthError(response);

  const metadata = parseJson(response.body);
  if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
    throw new ProviderMetadataError('O documento de metadados não é um objeto JSON.');
  }
  const fields = metadata as Record<string, unknown>;

  if (fields.issuer !== issuer) {
    throw new IssuerMismatchError(
      'metadata',
      'O issuer do documento de metadados não é idêntico ao do registro.',
    );
  }

  requireTrue(fields, 'require_pushed_authorization_requests');
  requireTrue(fields, 'authorization_response_iss_parameter_supported');
  requireTrue(fields, 'tls_client_certificate_bound_access_tokens');
  requireListed(fields, 'response_types_supported', ['code']);
  requireListed(fields, 'grant_types_supported', [
    'authorization_code',
    'refresh_token',
    'client_credentials',
  ]);
  requireListed(fields, 'token_endpoint_auth_methods_supported', ['private_key_jwt']);
  requireListed(fields, 'token_endpoint_auth_signing_alg_values_supported', ['PS256']);
  requireListed(fields, 'code_challenge_methods_supported', ['S256']);

  const aliases = fields.mtls_endpoint_aliases;
  if (aliases !== undefined && (typeof aliases !== 'object' || aliases === null)) {
    throw new ProviderMetadataError('mtls_endpoint_aliases deveria ser um objeto.');
  }
  const alias = (aliases ?? {}) as Record<string, unknown>;
  const mtls = (name: string): unknown => alias[name] ?? fields[name];

  const revocation = mtls('revocation_endpoint');
  return {
    authorizationEndpoint: httpsEndpoint(fields.authorization_endpoint, 'authorization_endpoint'),
    issuer,
    parEndpoint: httpsEndpoint(
      mtls('pushed_authorization_request_endpoint'),
      'pushed_authorization_request_endpoint',
    ),
    revocationEndpoint:
      revocation === undefined ? undefined : httpsEndpoint(revocation, 'revocation_endpoint'),
    tokenEndpoint: httpsEndpoint(mtls('token_endpoint'), 'token_endpoint'),
  };
}
