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

/**
 * Concessões que os metadados não podem anunciar (seção 5.2): a de senha do
 * dono do recurso (RFC 6749, 4.3) e a implícita. O nome aparece aqui só para
 * ser recusado.
 */
const FORBIDDEN_GRANT_TYPES: readonly string[] = ['password', 'implicit'];

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

/**
 * URL `https` absoluta, com host. O texto precisa começar por `https://`: o
 * analisador de URL aceitaria `https:/x` como `https://x/`.
 */
function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('https://')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname !== '';
  } catch {
    return false;
  }
}

function httpsEndpoint(value: unknown, name: string): string {
  if (!isHttpsUrl(value)) {
    throw new ProviderMetadataError(`Os metadados não trazem ${name} como URL https.`);
  }
  return value;
}

function requireTrue(metadata: Record<string, unknown>, field: string): void {
  if (metadata[field] !== true) {
    throw new ProviderMetadataError(`Os metadados deveriam trazer ${field} igual a true.`);
  }
}

function stringList(metadata: Record<string, unknown>, field: string): string[] {
  const values = metadata[field];
  if (!Array.isArray(values) || !values.every((item) => typeof item === 'string')) {
    throw new ProviderMetadataError(`Os metadados deveriam trazer ${field} como lista de textos.`);
  }
  return values as string[];
}

/** A lista é exatamente `[value]`: o valor por omissão de cada campo destes é incompatível. */
function requireExactly(metadata: Record<string, unknown>, field: string, value: string): void {
  const values = stringList(metadata, field);
  if (values.length !== 1 || values[0] !== value) {
    throw new ProviderMetadataError(`Os metadados deveriam trazer ${field} igual a ["${value}"].`);
  }
}

function requireContains(
  metadata: Record<string, unknown>,
  field: string,
  wanted: readonly string[],
): string[] {
  const values = stringList(metadata, field);
  const missing = wanted.filter((item) => !values.includes(item));
  if (missing.length > 0) {
    throw new ProviderMetadataError(`Os metadados não anunciam ${missing.join(', ')} em ${field}.`);
  }
  return values;
}

/**
 * Lê o documento de metadados e devolve os endpoints a usar.
 *
 * Confere cada campo obrigatório da tabela da seção 5.2 com o valor exigido e
 * recusa o provedor se algum faltar ou divergir: `issuer` idêntico ao do
 * registro, endpoints e `jwks_uri` como URL `https`, os três indicadores
 * `true`, `response_types_supported`, os métodos e os algoritmos com valor
 * exato, as três concessões sem `password` nem `implicit`, e
 * `scopes_supported` com todos os escopos do provedor no registro. O
 * `jwks_uri` é conferido e nunca buscado: o receptor não valida JWT do
 * provedor. Quando há `mtls_endpoint_aliases`, os endpoints entre servidores
 * usam os endereços de lá.
 */
export async function discoverAuthorizationServer(
  transport: LabAccessTransport,
  issuer: string,
  registryScopes: readonly string[],
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

  const authorizationEndpoint = httpsEndpoint(
    fields.authorization_endpoint,
    'authorization_endpoint',
  );
  const tokenEndpoint = httpsEndpoint(fields.token_endpoint, 'token_endpoint');
  const parEndpoint = httpsEndpoint(
    fields.pushed_authorization_request_endpoint,
    'pushed_authorization_request_endpoint',
  );
  httpsEndpoint(fields.jwks_uri, 'jwks_uri');
  requireTrue(fields, 'require_pushed_authorization_requests');
  requireTrue(fields, 'authorization_response_iss_parameter_supported');
  requireTrue(fields, 'tls_client_certificate_bound_access_tokens');
  requireExactly(fields, 'response_types_supported', 'code');
  const grants = requireContains(fields, 'grant_types_supported', [
    'authorization_code',
    'refresh_token',
    'client_credentials',
  ]);
  if (grants.some((grant) => FORBIDDEN_GRANT_TYPES.includes(grant))) {
    throw new ProviderMetadataError(
      'Os metadados anunciam em grant_types_supported uma concessão que o perfil proíbe.',
    );
  }
  requireExactly(fields, 'token_endpoint_auth_methods_supported', 'private_key_jwt');
  requireExactly(fields, 'token_endpoint_auth_signing_alg_values_supported', 'PS256');
  requireExactly(fields, 'code_challenge_methods_supported', 'S256');
  requireContains(fields, 'scopes_supported', registryScopes);

  const aliases = fields.mtls_endpoint_aliases;
  if (
    aliases !== undefined &&
    (typeof aliases !== 'object' || aliases === null || Array.isArray(aliases))
  ) {
    throw new ProviderMetadataError('mtls_endpoint_aliases deveria ser um objeto.');
  }
  const alias = (aliases ?? {}) as Record<string, unknown>;
  const mtls = (name: string, fallback: unknown): unknown => alias[name] ?? fallback;

  // `revocation_endpoint` está fora da tabela da seção 5.2 e o cliente não o
  // chama: fica guardado só quando é URL `https`, e nunca recusa o provedor.
  const revocation = mtls('revocation_endpoint', fields.revocation_endpoint);
  return {
    authorizationEndpoint,
    issuer,
    parEndpoint: httpsEndpoint(
      mtls('pushed_authorization_request_endpoint', parEndpoint),
      'pushed_authorization_request_endpoint',
    ),
    revocationEndpoint: isHttpsUrl(revocation) ? revocation : undefined,
    tokenEndpoint: httpsEndpoint(mtls('token_endpoint', tokenEndpoint), 'token_endpoint'),
  };
}
