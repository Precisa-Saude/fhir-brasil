import { describe, expect, it } from 'vitest';

import { discoverAuthorizationServer, metadataUrl } from '../discovery';
import { IssuerMismatchError, LabAccessApiError, ProviderMetadataError } from '../errors';
import { fakeTransport, ISSUER, jsonResponse } from './helpers';

const METADATA = {
  authorization_endpoint: `${ISSUER}/authorize`,
  authorization_response_iss_parameter_supported: true,
  code_challenge_methods_supported: ['S256'],
  grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
  issuer: ISSUER,
  jwks_uri: `${ISSUER}/jwks`,
  pushed_authorization_request_endpoint: 'https://mtls.auth.laboratorio.example/par',
  require_pushed_authorization_requests: true,
  response_types_supported: ['code'],
  scopes_supported: ['catalog.read'],
  tls_client_certificate_bound_access_tokens: true,
  token_endpoint: 'https://mtls.auth.laboratorio.example/token',
  token_endpoint_auth_methods_supported: ['private_key_jwt'],
  token_endpoint_auth_signing_alg_values_supported: ['PS256'],
};

describe('metadataUrl', () => {
  it('usa o caminho do RFC 8414 na raiz do host', () => {
    expect(metadataUrl(ISSUER)).toBe(`${ISSUER}/.well-known/oauth-authorization-server`);
  });

  it('insere o caminho entre o host e o caminho do issuer', () => {
    expect(metadataUrl('https://laboratorio.example/auth')).toBe(
      'https://laboratorio.example/.well-known/oauth-authorization-server/auth',
    );
  });

  it('recusa issuer que não é https ou tem consulta ou fragmento', () => {
    expect(() => metadataUrl('http://laboratorio.example')).toThrowError(ProviderMetadataError);
    expect(() => metadataUrl('https://laboratorio.example?x=1')).toThrowError(
      ProviderMetadataError,
    );
    expect(() => metadataUrl('nada')).toThrowError(ProviderMetadataError);
  });
});

describe('discoverAuthorizationServer', () => {
  it('lê os endpoints do documento de metadados', async () => {
    const transport = fakeTransport(() => jsonResponse(200, { ...METADATA, campo_novo: 1 }));
    const endpoints = await discoverAuthorizationServer(transport, ISSUER);

    expect(transport.calls[0]!.url).toBe(`${ISSUER}/.well-known/oauth-authorization-server`);
    expect(transport.calls[0]!.method).toBe('GET');
    expect(endpoints).toEqual({
      authorizationEndpoint: `${ISSUER}/authorize`,
      issuer: ISSUER,
      parEndpoint: 'https://mtls.auth.laboratorio.example/par',
      revocationEndpoint: undefined,
      tokenEndpoint: 'https://mtls.auth.laboratorio.example/token',
    });
  });

  it('RCP-008: metadados com issuer diferente do registro derrubam o provedor', async () => {
    for (const issuer of ['https://auth.outro.example', `${ISSUER}/`, undefined]) {
      const transport = fakeTransport(() => jsonResponse(200, { ...METADATA, issuer }));
      await expect(discoverAuthorizationServer(transport, ISSUER)).rejects.toBeInstanceOf(
        IssuerMismatchError,
      );
    }
  });

  it('RCP-009: os endpoints entre servidores vêm de mtls_endpoint_aliases quando o documento os traz', async () => {
    const transport = fakeTransport(() =>
      jsonResponse(200, {
        ...METADATA,
        mtls_endpoint_aliases: {
          pushed_authorization_request_endpoint: 'https://mtls2.laboratorio.example/par',
          revocation_endpoint: 'https://mtls2.laboratorio.example/revoke',
          token_endpoint: 'https://mtls2.laboratorio.example/token',
        },
        pushed_authorization_request_endpoint: `${ISSUER}/par`,
        revocation_endpoint: `${ISSUER}/revoke`,
        token_endpoint: `${ISSUER}/token`,
      }),
    );
    const endpoints = await discoverAuthorizationServer(transport, ISSUER);
    expect(endpoints.tokenEndpoint).toBe('https://mtls2.laboratorio.example/token');
    expect(endpoints.parEndpoint).toBe('https://mtls2.laboratorio.example/par');
    expect(endpoints.revocationEndpoint).toBe('https://mtls2.laboratorio.example/revoke');
    // O endpoint de autorização é aberto no navegador e não tem alias mTLS.
    expect(endpoints.authorizationEndpoint).toBe(`${ISSUER}/authorize`);
  });

  it('RCP-009: alias parcial vale só para o endpoint que ele cobre', async () => {
    const transport = fakeTransport(() =>
      jsonResponse(200, {
        ...METADATA,
        mtls_endpoint_aliases: { token_endpoint: 'https://mtls2.laboratorio.example/token' },
      }),
    );
    const endpoints = await discoverAuthorizationServer(transport, ISSUER);
    expect(endpoints.tokenEndpoint).toBe('https://mtls2.laboratorio.example/token');
    expect(endpoints.parEndpoint).toBe('https://mtls.auth.laboratorio.example/par');
  });

  const invalid: [string, Record<string, unknown>][] = [
    ['sem token_endpoint', { token_endpoint: undefined }],
    ['sem endpoint de PAR', { pushed_authorization_request_endpoint: undefined }],
    ['endpoint de autorização sem https', { authorization_endpoint: 'http://x.example/a' }],
    ['alias mTLS sem https', { mtls_endpoint_aliases: { token_endpoint: 'http://x.example/t' } }],
    ['alias mTLS malformado', { mtls_endpoint_aliases: 'x' }],
    ['PAR não obrigatório', { require_pushed_authorization_requests: false }],
    ['sem parâmetro iss na resposta', { authorization_response_iss_parameter_supported: false }],
    ['sem token vinculado ao certificado', { tls_client_certificate_bound_access_tokens: false }],
    ['sem response_type code', { response_types_supported: ['token'] }],
    ['sem private_key_jwt', { token_endpoint_auth_methods_supported: ['client_secret_basic'] }],
    ['sem PS256', { token_endpoint_auth_signing_alg_values_supported: ['RS256'] }],
    ['sem S256', { code_challenge_methods_supported: ['plain'] }],
    ['sem as três concessões', { grant_types_supported: ['authorization_code'] }],
  ];

  it.each(invalid)('recusa metadados %s', async (_name, change) => {
    const transport = fakeTransport(() => jsonResponse(200, { ...METADATA, ...change }));
    await expect(discoverAuthorizationServer(transport, ISSUER)).rejects.toBeInstanceOf(
      ProviderMetadataError,
    );
  });

  it('recusa resposta que não é JSON de objeto', async () => {
    for (const body of ['<html>', '[]']) {
      const transport = fakeTransport(() => ({ body, headers: {}, status: 200 }));
      await expect(discoverAuthorizationServer(transport, ISSUER)).rejects.toBeInstanceOf(
        ProviderMetadataError,
      );
    }
  });

  it('propaga status diferente de 200 como erro', async () => {
    const transport = fakeTransport(() => jsonResponse(503, {}));
    await expect(discoverAuthorizationServer(transport, ISSUER)).rejects.toBeInstanceOf(
      LabAccessApiError,
    );
  });
});
