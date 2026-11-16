/**
 * Provedor de teste em memória.
 *
 * Simula só o que os testes precisam do lado do laboratório: metadados, PAR,
 * token, consentimentos e uma API FHIR programável. Não é um servidor e não
 * sai deste diretório de testes.
 */

import { createHash, randomUUID } from 'node:crypto';

import { jwtVerify } from 'jose';

import { LabAccessClient, type LabAccessClientConfig } from '../client';
import { PATIENT_SCOPES, type PatientScope } from '../constants';
import { LabAccessTransportError } from '../errors';
import { verifyRegistry } from '../registry';
import type { RegistryDocument } from '../registry-types';
import type { LabAccessResponse } from '../transport';
import {
  API_BASE,
  buildRegistryDocument,
  CLIENT_ID,
  CPF_PATIENT,
  encodeJson,
  EXAMPLE_NOW,
  type FakeTransport,
  fakeTransport,
  FHIR_BASE,
  ISSUER,
  jsonResponse,
  operationOutcome,
  PROVIDER_ID,
  type RecordedCall,
  REDIRECT_URI,
  signDetached,
  testKey,
} from './helpers';

export const TOKEN_ENDPOINT = 'https://mtls.auth.laboratorio.example/token';
export const PAR_ENDPOINT = 'https://mtls.auth.laboratorio.example/par';
export const AUTHORIZATION_ENDPOINT = `${ISSUER}/authorize`;

interface StoredConsent {
  body: Record<string, unknown>;
  patient?: { cpf: string; fhir_id: string };
}

interface StoredToken {
  consentId?: string;
  kind: 'patient' | 'provider';
  scope: string;
}

type Fault = LabAccessResponse | 'network';
type FhirHandler = (call: RecordedCall, url: URL) => LabAccessResponse | undefined;

export class FakeLab {
  readonly assertions: Record<string, unknown>[] = [];
  readonly consents = new Map<string, StoredConsent>();
  expiresIn = 600;
  fhir: FhirHandler = () => undefined;
  metadata: Record<string, unknown> = {
    authorization_endpoint: AUTHORIZATION_ENDPOINT,
    authorization_response_iss_parameter_supported: true,
    code_challenge_methods_supported: ['S256'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    issuer: ISSUER,
    jwks_uri: `${ISSUER}/jwks`,
    pushed_authorization_request_endpoint: PAR_ENDPOINT,
    require_pushed_authorization_requests: true,
    response_types_supported: ['code'],
    scopes_supported: [
      'catalog.read',
      'locations.read',
      'schedule.read',
      'consent.manage',
      'appointment.write',
      'results.read',
      'consent.read',
    ],
    tls_client_certificate_bound_access_tokens: true,
    token_endpoint: TOKEN_ENDPOINT,
    token_endpoint_auth_methods_supported: ['private_key_jwt'],
    token_endpoint_auth_signing_alg_values_supported: ['PS256'],
  };
  now = new Date(EXAMPLE_NOW);
  /** Quando definido, a renovação devolve este refresh token no lugar do atual. */
  rotateRefreshTo?: string;
  readonly tokens = new Map<string, StoredToken>();
  readonly transport: FakeTransport;

  private readonly codes = new Map<
    string,
    { challenge: string; consentId: string; scope: string }
  >();
  private counter = 0;
  private readonly faults: {
    fault: Fault;
    match: (call: RecordedCall) => boolean;
    persistent?: boolean;
  }[] = [];
  private readonly pushed = new Map<string, URLSearchParams>();
  private readonly refreshTokens = new Map<string, { consentId: string; scope: string }>();
  private readonly seenJti = new Set<string>();

  constructor() {
    this.transport = fakeTransport((call) => this.handle(call));
  }

  get calls(): RecordedCall[] {
    return this.transport.calls;
  }

  /** Chamadas à API FHIR. */
  get fhirCalls(): RecordedCall[] {
    return this.calls.filter((call) => call.url.startsWith(FHIR_BASE));
  }

  /** Simula o paciente na página do laboratório e devolve a URL de retorno. */
  authorize(
    authorizationUrl: string,
    patient: { cpf: string; fhirId: string },
    change: (params: URLSearchParams) => void = () => {},
  ): string {
    const url = new URL(authorizationUrl);
    const pushed = this.pushed.get(url.searchParams.get('request_uri') ?? '');
    if (!pushed) throw new Error('request_uri desconhecido no provedor de teste');
    const scope = pushed.get('scope')!;
    const consentId = scope.split(' ')[0]!.slice('consent:'.length);
    const consent = this.consents.get(consentId)!;
    consent.body.status = 'AUTHORISED';
    consent.patient = { cpf: patient.cpf, fhir_id: patient.fhirId };

    const code = `code-${++this.counter}`;
    this.codes.set(code, { challenge: pushed.get('code_challenge')!, consentId, scope });
    const callback = new URL(pushed.get('redirect_uri')!);
    callback.searchParams.set('code', code);
    callback.searchParams.set('state', pushed.get('state')!);
    callback.searchParams.set('iss', ISSUER);
    change(callback.searchParams);
    return callback.toString();
  }

  /** Faz a próxima chamada que casar com `match` falhar. */
  failNext(match: (call: RecordedCall) => boolean, fault: Fault): void {
    this.faults.push({ fault, match });
  }

  /** Faz toda chamada que casar com `match` falhar, até a função devolvida ser chamada. */
  failAll(match: (call: RecordedCall) => boolean, fault: Fault): () => void {
    const entry = { fault, match, persistent: true };
    this.faults.push(entry);
    return () => {
      const index = this.faults.indexOf(entry);
      if (index >= 0) this.faults.splice(index, 1);
    };
  }

  /** Encerra um consentimento do lado do provedor e invalida os tokens. */
  endConsent(consentId: string, status: string, code: string, endedVia = 'PROVIDER'): void {
    const consent = this.consents.get(consentId)!;
    consent.body.status = status;
    consent.body.status_reason = { code, ended_via: endedVia };
    for (const [token, stored] of this.tokens) {
      if (stored.consentId === consentId) this.tokens.delete(token);
    }
    for (const [token, stored] of this.refreshTokens) {
      if (stored.consentId === consentId) this.refreshTokens.delete(token);
    }
  }

  /** Invalida os tokens de acesso emitidos, como se tivessem expirado. */
  expireAccessTokens(kind: 'patient' | 'provider'): void {
    for (const [token, stored] of this.tokens) {
      if (stored.kind === kind) this.tokens.delete(token);
    }
  }

  private async handle(call: RecordedCall): Promise<LabAccessResponse | undefined> {
    const index = this.faults.findIndex((fault) => fault.match(call));
    if (index >= 0) {
      const entry = this.faults[index]!;
      if (!entry.persistent) this.faults.splice(index, 1);
      const fault = entry.fault;
      if (fault === 'network') throw new LabAccessTransportError('queda de rede simulada');
      return fault;
    }

    const url = new URL(call.url);
    const target = `${url.origin}${url.pathname}`;
    if (target === `${ISSUER}/.well-known/oauth-authorization-server`) {
      return jsonResponse(200, this.metadata);
    }
    if (target === this.metadata.pushed_authorization_request_endpoint) return this.par(call);
    if (target === this.metadata.token_endpoint) return this.token(call);
    if (target.startsWith(`${API_BASE}/consents`)) return this.consent(call, url);
    if (target.startsWith(FHIR_BASE)) return this.fhirCall(call, url);
    return undefined;
  }

  private async authenticate(call: RecordedCall): Promise<LabAccessResponse | undefined> {
    const form = call.form!;
    const invalid = jsonResponse(401, { error: 'invalid_client' });
    if (
      form.get('client_assertion_type') !== 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
    ) {
      return invalid;
    }
    try {
      const key = await testKey('assinatura');
      const { payload, protectedHeader } = await jwtVerify(
        form.get('client_assertion') ?? '',
        key.publicKey,
        {
          algorithms: ['PS256'],
          currentDate: this.now,
          issuer: CLIENT_ID,
          subject: CLIENT_ID,
        },
      );
      const lifetime = (payload.exp ?? 0) - (payload.iat ?? 0);
      if (payload.aud !== ISSUER || lifetime > 60 || this.seenJti.has(payload.jti ?? ''))
        return invalid;
      this.seenJti.add(payload.jti!);
      this.assertions.push({ ...payload, kid: protectedHeader.kid });
      return undefined;
    } catch {
      return invalid;
    }
  }

  private async par(call: RecordedCall): Promise<LabAccessResponse> {
    const failure = await this.authenticate(call);
    if (failure) return failure;
    const requestUri = `urn:ietf:params:oauth:request_uri:${randomUUID()}`;
    this.pushed.set(requestUri, call.form!);
    return jsonResponse(201, { expires_in: 300, request_uri: requestUri });
  }

  private issue(stored: StoredToken, extra: Record<string, unknown> = {}): LabAccessResponse {
    const token = `${stored.kind}-token-${++this.counter}`;
    this.tokens.set(token, stored);
    return jsonResponse(200, {
      access_token: token,
      expires_in: this.expiresIn,
      scope: stored.scope,
      token_type: 'Bearer',
      ...extra,
    });
  }

  private async token(call: RecordedCall): Promise<LabAccessResponse> {
    const failure = await this.authenticate(call);
    if (failure) return failure;
    const form = call.form!;
    const grant = form.get('grant_type');

    if (grant === 'client_credentials') {
      return this.issue({ kind: 'provider', scope: form.get('scope') ?? '' });
    }
    if (grant === 'authorization_code') {
      const code = this.codes.get(form.get('code') ?? '');
      this.codes.delete(form.get('code') ?? '');
      const challenge = createHash('sha256')
        .update(form.get('code_verifier') ?? '')
        .digest('base64url');
      if (!code || code.challenge !== challenge)
        return jsonResponse(400, { error: 'invalid_grant' });
      const refresh = `refresh-${++this.counter}`;
      this.refreshTokens.set(refresh, { consentId: code.consentId, scope: code.scope });
      return this.issue(
        { consentId: code.consentId, kind: 'patient', scope: code.scope },
        { refresh_token: refresh },
      );
    }
    if (grant === 'refresh_token') {
      const presented = form.get('refresh_token') ?? '';
      const refresh = this.refreshTokens.get(presented);
      if (!refresh) return jsonResponse(400, { error: 'invalid_grant' });
      const extra: Record<string, unknown> = {};
      if (this.rotateRefreshTo) {
        this.refreshTokens.delete(presented);
        this.refreshTokens.set(this.rotateRefreshTo, refresh);
        extra.refresh_token = this.rotateRefreshTo;
        this.rotateRefreshTo = undefined;
      }
      return this.issue(
        { consentId: refresh.consentId, kind: 'patient', scope: refresh.scope },
        extra,
      );
    }
    return jsonResponse(400, { error: 'unsupported_grant_type' });
  }

  private bearer(call: RecordedCall): StoredToken | undefined {
    const value = call.headers.Authorization ?? '';
    return value.startsWith('Bearer ') ? this.tokens.get(value.slice(7)) : undefined;
  }

  private consent(call: RecordedCall, url: URL): LabAccessResponse {
    const echo = { 'x-fapi-interaction-id': call.headers['x-fapi-interaction-id'] ?? '' };
    const token = this.bearer(call);
    if (!token) return jsonResponse(401, operationOutcome('TOKEN_INVALID', 'login'), echo);
    const id = decodeURIComponent(
      url.pathname.slice(new URL(API_BASE).pathname.length + '/consents'.length + 1),
    );

    if (call.method === 'POST') {
      const consentId = randomUUID();
      const body = {
        consent_id: consentId,
        creation_date_time: '2026-11-16T12:00:00Z',
        status: 'AWAITING_AUTHORISATION',
        status_update_date_time: '2026-11-16T12:00:00Z',
        ...(call.json as Record<string, unknown>),
      };
      this.consents.set(consentId, { body });
      return jsonResponse(201, body, { ...echo, Location: `${API_BASE}/consents/${consentId}` });
    }

    const consent = this.consents.get(id);
    const ownPatientToken = token.kind === 'patient' && token.consentId === id;
    const managing = token.kind === 'provider' && token.scope.split(' ').includes('consent.manage');
    if (!consent || !(ownPatientToken || managing)) {
      return jsonResponse(404, operationOutcome('CONSENT_NOT_FOUND', 'not-found'), echo);
    }
    if (call.method === 'GET') {
      const body = ownPatientToken ? { ...consent.body, patient: consent.patient } : consent.body;
      return jsonResponse(200, { ...body, campo_de_versao_futura: true }, echo);
    }
    if (!managing)
      return jsonResponse(403, operationOutcome('SCOPE_INSUFFICIENT', 'forbidden'), echo);
    if (['EXPIRED', 'REJECTED', 'REVOKED'].includes(consent.body.status as string)) {
      return jsonResponse(422, operationOutcome('CONSENT_INVALID_STATE', 'business-rule'), echo);
    }
    const wasAuthorised = consent.body.status === 'AUTHORISED';
    this.endConsent(
      id,
      wasAuthorised ? 'REVOKED' : 'REJECTED',
      wasAuthorised
        ? (url.searchParams.get('reason') ?? 'PATIENT_REQUEST')
        : 'RECEIVER_TERMINATION',
      'RECEIVER',
    );
    return { body: '', headers: echo, status: 204 };
  }

  private fhirCall(call: RecordedCall, url: URL): LabAccessResponse {
    const echo = { 'x-fapi-interaction-id': call.headers['x-fapi-interaction-id'] ?? '' };
    if (url.pathname.endsWith('/metadata')) {
      return jsonResponse(200, { fhirVersion: '4.0.1', resourceType: 'CapabilityStatement' }, echo);
    }
    if (!this.bearer(call)) {
      return jsonResponse(401, operationOutcome('TOKEN_INVALID', 'login'), {
        ...echo,
        'WWW-Authenticate': 'Bearer error="invalid_token"',
      });
    }
    const response = this.fhir(call, url);
    if (!response)
      return jsonResponse(404, operationOutcome('RESOURCE_NOT_FOUND', 'not-found'), echo);
    return { ...response, headers: { ...echo, ...response.headers } };
  }
}

export interface Harness {
  client: LabAccessClient;
  lab: FakeLab;
  sleeps: number[];
}

/** Monta provedor de teste, registro assinado e cliente, com relógio fixo. */
export async function createHarness(
  options: {
    config?: Partial<LabAccessClientConfig>;
    registry?: (doc: RegistryDocument) => void;
  } = {},
): Promise<Harness> {
  const lab = new FakeLab();
  const registryKey = await testKey();
  const signingKey = await testKey('assinatura');
  const bytes = encodeJson(await buildRegistryDocument(options.registry));
  const { registry } = await verifyRegistry({
    now: EXAMPLE_NOW,
    registry: bytes,
    signature: await signDetached(bytes, registryKey),
    trust: { environment: 'pilot' as const, initialKeys: [registryKey.jwk] },
  });
  const sleeps: number[] = [];
  const client = new LabAccessClient({
    clientId: CLIENT_ID,
    now: () => lab.now,
    registry,
    signingKey: { key: signingKey.privateKey, kid: signingKey.kid },
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    transport: lab.transport,
    ...options.config,
  });
  return { client, lab, sleeps };
}

export function bundle(resources: unknown[], next?: string) {
  return {
    entry: resources.map((resource) => ({ resource, search: { mode: 'match' } })),
    link: next ? [{ relation: 'next', url: next }] : [],
    resourceType: 'Bundle',
    type: 'searchset',
  };
}

export const PURPOSE = 'Guardar os resultados dos seus exames no seu histórico pessoal.';
export const PATIENT = { cpf: CPF_PATIENT, fhirId: 'pac-teste-1' };

export async function openJourney(harness: Harness, scopes: PatientScope[] = [...PATIENT_SCOPES]) {
  const provider = harness.client.provider(PROVIDER_ID);
  const consent = await provider.createConsent({
    expirationDateTime: '2027-05-15T03:00:00Z',
    purpose: PURPOSE,
    scopes,
  });
  const journey = await provider.startAuthorization({ consent, redirectUri: REDIRECT_URI });
  return { consent, journey, provider };
}

export async function connect(harness: Harness, scopes?: PatientScope[]) {
  const { consent, journey, provider } = await openJourney(harness, scopes);
  const access = await provider.completeAuthorization({
    callback: harness.lab.authorize(journey.authorizationUrl, PATIENT),
    expectedCpf: CPF_PATIENT,
    journey,
  });
  return { access, consent, journey, provider };
}
