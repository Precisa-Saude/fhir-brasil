/**
 * Roteador HTTP do sandbox.
 *
 * Mapeia o subset de endpoints da RNDS consumidos por
 * @precisa-saude/fhir-rnds. Aplica autenticação por rota:
 *
 *  - /api/token: exige certificado mTLS quando o sandbox roda em modo
 *    `--mtls` (RNDS de fato exige nesse endpoint).
 *  - /api/fhir/r4/*: em modo `strict`, exige bearer token assinado +
 *    header `Authorization: <CNS>` (igual à API real). Em modo
 *    permissivo (padrão sem flags), aceita sem auth — útil para
 *    curl / aulas sem fricção.
 *  - /.well-known/jwks.json: público sempre.
 */

import { issueToken, verifyToken } from './auth';
import { buildJwks } from './jwks';
import type { SigningKeys } from './keys';
import type { SandboxStore } from './store';
import type { SandboxBundle, SandboxBundleEntry } from './types';

const FHIR_PREFIX = '/api/fhir/r4';
const TOKEN_PATH = '/api/token';
const JWKS_PATH = '/.well-known/jwks.json';

const NS = {
  cns: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
  cpf: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
} as const;

export interface PeerCertInfo {
  /** Common Name (subject.CN) do cert apresentado, se houver */
  cn?: string;
  /** CNES de 7 dígitos extraído do CN (heurística), se encontrado */
  cnes?: string;
  /** True quando o cliente apresentou um certificado válido (qualquer CA) */
  presented: boolean;
}

export interface RouteContext {
  body?: unknown;
  /** Cabeçalhos HTTP recebidos (chaves em lowercase) */
  headers: Record<string, string | undefined>;
  keys: SigningKeys;
  method: string;
  path: string;
  /** Informação extraída do certificado mTLS, quando o servidor está em modo mtls */
  peerCert?: PeerCertInfo;
  query: URLSearchParams;
  store: SandboxStore;
  /** Quando true, /api/token requer cert apresentado e FHIR exige bearer + CNS */
  strict: boolean;
}

export interface RouteResponse {
  body: unknown;
  status: number;
}

export function dispatch(ctx: RouteContext): RouteResponse {
  if (ctx.method === 'GET' && ctx.path === JWKS_PATH) {
    return { body: buildJwks(ctx.keys), status: 200 };
  }

  if (ctx.method === 'POST' && ctx.path === TOKEN_PATH) {
    return handleToken(ctx);
  }

  if (!ctx.path.startsWith(FHIR_PREFIX)) {
    return notFound(`Recurso não encontrado: ${ctx.path}`);
  }

  if (ctx.strict) {
    const authError = enforceFhirAuth(ctx);
    if (authError) {
      return authError;
    }
  }

  const fhirPath = ctx.path.slice(FHIR_PREFIX.length);

  if (ctx.method === 'GET') {
    return handleFhirGet(fhirPath, ctx);
  }
  if (ctx.method === 'POST' && fhirPath === '/Bundle') {
    return handleSubmitBundle(ctx);
  }

  return {
    body: operationOutcome('error', 'not-supported', `${ctx.method} ${ctx.path} não suportado`),
    status: 405,
  };
}

function handleToken(ctx: RouteContext): RouteResponse {
  if (ctx.strict && !ctx.peerCert?.presented) {
    return {
      body: operationOutcome(
        'error',
        'security',
        'Certificado mTLS é obrigatório em /api/token quando o sandbox está em modo --mtls',
      ),
      status: 401,
    };
  }
  const tokenPayload = issueToken(ctx.keys, {
    identity: ctx.peerCert?.presented
      ? { cn: ctx.peerCert.cn, cnes: ctx.peerCert.cnes }
      : undefined,
  });
  return { body: tokenPayload, status: 200 };
}

function enforceFhirAuth(ctx: RouteContext): RouteResponse | null {
  const bearerHeader = ctx.headers['x-authorization-server'];
  if (!bearerHeader) {
    return {
      body: operationOutcome(
        'error',
        'security',
        'header X-Authorization-Server: Bearer <token> é obrigatório',
      ),
      status: 401,
    };
  }
  const match = /^Bearer\s+(.+)$/i.exec(bearerHeader);
  if (!match) {
    return {
      body: operationOutcome(
        'error',
        'security',
        'X-Authorization-Server deve usar o esquema "Bearer <token>"',
      ),
      status: 401,
    };
  }
  const token = match[1]!.trim();
  const verification = verifyToken(token, ctx.keys);
  if (!verification.valid) {
    return {
      body: operationOutcome('error', 'security', `Token inválido (${verification.reason})`),
      status: 401,
    };
  }

  const cnsHeader = ctx.headers['authorization'];
  if (!cnsHeader) {
    return {
      body: operationOutcome(
        'error',
        'required',
        'header Authorization: <CNS-do-profissional> é obrigatório',
      ),
      status: 400,
    };
  }
  if (!/^\d{15}$/.test(cnsHeader.trim())) {
    return {
      body: operationOutcome('error', 'invalid', 'Authorization deve conter um CNS de 15 dígitos'),
      status: 400,
    };
  }

  return null;
}

/**
 * Tipos cuja busca por paciente o sandbox suporta. Cada um aceita
 * `?subject=Patient/{cns}` ou `?patient=Patient/{cns}` (também tolera
 * só o CNS sem prefixo).
 */
const SEARCHABLE_BY_PATIENT = new Set([
  'Observation',
  'DiagnosticReport',
  'Immunization',
  'Condition',
  'Encounter',
]);

function handleFhirGet(fhirPath: string, ctx: RouteContext): RouteResponse {
  if (fhirPath === '/Patient') {
    return handlePatientSearch(ctx);
  }
  const patientMatch = /^\/Patient\/([^/]+)$/.exec(fhirPath);
  if (patientMatch) {
    const cns = decodeURIComponent(patientMatch[1]!);
    const patient = ctx.store.findPatientByCns(cns);
    return patient
      ? { body: patient, status: 200 }
      : notFound(`Paciente CNS ${cns} não encontrado`);
  }
  const orgMatch = /^\/Organization\/([^/]+)$/.exec(fhirPath);
  if (orgMatch) {
    const cnes = decodeURIComponent(orgMatch[1]!);
    const org = ctx.store.findOrganizationByCnes(cnes);
    return org ? { body: org, status: 200 } : notFound(`Organização CNES ${cnes} não encontrada`);
  }
  const practMatch = /^\/Practitioner\/([^/]+)$/.exec(fhirPath);
  if (practMatch) {
    const cns = decodeURIComponent(practMatch[1]!);
    const pract = ctx.store.findPractitionerByCns(cns);
    return pract
      ? { body: pract, status: 200 }
      : notFound(`Profissional CNS ${cns} não encontrado`);
  }
  const searchMatch = /^\/([A-Z][A-Za-z]+)$/.exec(fhirPath);
  if (searchMatch) {
    const resourceType = searchMatch[1]!;
    if (SEARCHABLE_BY_PATIENT.has(resourceType)) {
      return handleResourceSearch(resourceType, ctx);
    }
  }
  return notFound(`Recurso FHIR não suportado: ${fhirPath}`);
}

function handleResourceSearch(resourceType: string, ctx: RouteContext): RouteResponse {
  const ref = ctx.query.get('subject') ?? ctx.query.get('patient');
  if (!ref) {
    return {
      body: operationOutcome(
        'error',
        'required',
        `${resourceType} search exige ?subject=Patient/{cns} ou ?patient=Patient/{cns}`,
      ),
      status: 400,
    };
  }
  const cns = ref.startsWith('Patient/') ? ref.slice('Patient/'.length) : ref;
  const matches = ctx.store.searchResourcesByPatient(resourceType, cns);
  const entry: SandboxBundleEntry[] = matches.map((resource) => ({ resource }));
  return {
    body: {
      entry,
      resourceType: 'Bundle',
      total: matches.length,
      type: 'searchset',
    },
    status: 200,
  };
}

function handlePatientSearch(ctx: RouteContext): RouteResponse {
  const identifier = ctx.query.get('identifier');
  if (!identifier) {
    return {
      body: operationOutcome('error', 'required', 'parâmetro identifier é obrigatório em /Patient'),
      status: 400,
    };
  }
  const [system, value] = identifier.split('|');
  if (!system || !value) {
    return {
      body: operationOutcome('error', 'invalid', 'identifier deve ser no formato system|value'),
      status: 400,
    };
  }

  let patient = undefined;
  if (system === NS.cpf) {
    patient = ctx.store.findPatientByCpf(value);
  } else if (system === NS.cns) {
    patient = ctx.store.findPatientByCns(value);
  } else {
    return notFound(`NamingSystem não suportado: ${system}`);
  }

  return patient
    ? { body: patient, status: 200 }
    : notFound(`Paciente ${system}|${value} não encontrado`);
}

function handleSubmitBundle(ctx: RouteContext): RouteResponse {
  if (typeof ctx.body === 'symbol') {
    // sentinela INVALID_BODY de readBody — JSON malformado
    return {
      body: operationOutcome('error', 'structure', 'corpo da requisição não é JSON válido'),
      status: 400,
    };
  }
  const bundle = ctx.body as SandboxBundle | undefined;
  if (!bundle || typeof bundle !== 'object' || bundle.resourceType !== 'Bundle') {
    return {
      body: operationOutcome('error', 'structure', 'corpo da requisição não é um Bundle FHIR'),
      status: 400,
    };
  }
  if (bundle.type !== 'transaction' && bundle.type !== 'batch') {
    return {
      body: operationOutcome(
        'error',
        'invalid',
        `Bundle.type "${String(bundle.type)}" não suportado — use transaction ou batch`,
      ),
      status: 400,
    };
  }

  ctx.store.recordBundle(bundle);

  // As `location`s retornadas são puramente sintéticas — servem só para
  // imitar o formato de transaction-response da RNDS. O sandbox não
  // resolve esses IDs de volta; os recursos submetidos são consultados
  // via `GET /{ResourceType}?subject=Patient/{cns}` (ou similar).
  const responseEntries: SandboxBundleEntry[] = (bundle.entry ?? []).map(() => ({
    response: {
      location: `Resource/sandbox-${ctx.store.nextResourceId()}`,
      status: '201 Created',
    },
  }));
  const response: SandboxBundle = {
    entry: responseEntries,
    resourceType: 'Bundle',
    type: 'transaction-response',
  };
  return { body: response, status: 200 };
}

function notFound(diagnostics: string): RouteResponse {
  return {
    body: operationOutcome('error', 'not-found', diagnostics),
    status: 404,
  };
}

function operationOutcome(
  severity: 'fatal' | 'error' | 'warning' | 'information',
  code: string,
  diagnostics: string,
): unknown {
  return {
    issue: [{ code, diagnostics, severity }],
    resourceType: 'OperationOutcome',
  };
}
