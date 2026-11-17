/**
 * Validação do registro de participantes contra o schema da especificação.
 *
 * É uma transcrição à mão do JSON Schema publicado com o protocolo
 * (`participantes.schema.json`, formato 0.x), para não trazer um validador de
 * schema como dependência. Como no schema, campo desconhecido é erro em todos
 * os níveis.
 */

import { PATIENT_SCOPES, PROVIDER_SCOPES } from './constants';

type Json = Record<string, unknown>;
type Check = (value: unknown, path: string, errors: string[]) => void;

const UTC_DATE_TIME =
  /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/;
const DATE = /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HTTPS_URL = /^https:\/\/[^\s#]+$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const SCOPES: readonly string[] = [...PROVIDER_SCOPES, ...PATIENT_SCOPES];

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(pattern: RegExp, limits: { max?: number; min?: number } = {}): Check {
  return (value, path, errors) => {
    if (
      typeof value !== 'string' ||
      !pattern.test(value) ||
      (limits.min !== undefined && value.length < limits.min) ||
      (limits.max !== undefined && value.length > limits.max)
    ) {
      errors.push(`${path}: valor fora do formato esperado`);
    }
  };
}

function oneOf(...allowed: unknown[]): Check {
  return (value, path, errors) => {
    if (!allowed.includes(value)) errors.push(`${path}: valor não permitido`);
  };
}

function list(item: Check, limits: { max?: number; min?: number; unique?: boolean } = {}): Check {
  return (value, path, errors) => {
    if (!Array.isArray(value)) {
      errors.push(`${path}: deveria ser uma lista`);
      return;
    }
    if (limits.min !== undefined && value.length < limits.min) {
      errors.push(`${path}: menos itens que o mínimo`);
    }
    if (limits.max !== undefined && value.length > limits.max) {
      errors.push(`${path}: mais itens que o máximo`);
    }
    if (limits.unique && new Set(value).size !== value.length) {
      errors.push(`${path}: itens repetidos`);
    }
    value.forEach((entry, index) => item(entry, `${path}[${index}]`, errors));
  };
}

/** Objeto fechado: todo campo precisa estar em `required` ou em `optional`. */
function object(required: Record<string, Check>, optional: Record<string, Check> = {}): Check {
  return (value, path, errors) => {
    if (!isObject(value)) {
      errors.push(`${path}: deveria ser um objeto`);
      return;
    }
    for (const [key, check] of Object.entries(required)) {
      if (!(key in value)) errors.push(`${path}.${key}: campo obrigatório ausente`);
      else check(value[key], `${path}.${key}`, errors);
    }
    for (const key of Object.keys(value)) {
      if (key in required) continue;
      const check = optional[key];
      if (check) check(value[key], `${path}.${key}`, errors);
      else errors.push(`${path}.${key}: campo desconhecido`);
    }
  };
}

const anyText = (min: number, max: number) => text(/^[\s\S]*$/, { max, min });
const utcDateTime = text(UTC_DATE_TIME);
const httpsUrl = text(HTTPS_URL, { max: 2048 });
const scope = oneOf(...SCOPES);
const scopeList = list(scope, { min: 1, unique: true });

const registryKey = object({
  alg: oneOf('PS256'),
  e: text(BASE64URL),
  kid: text(BASE64URL, { max: 43, min: 43 }),
  kty: oneOf('RSA'),
  n: text(BASE64URL, { min: 342 }),
  use: oneOf('sig'),
});

const transportCertificate = object({
  not_after: utcDateTime,
  not_before: utcDateTime,
  x5c: list(text(BASE64), { min: 1 }),
  'x5t#S256': text(BASE64URL, { max: 43, min: 43 }),
});

const providerBlock = object(
  {
    api_base_url: httpsUrl,
    consent_management_uri: httpsUrl,
    fhir_base_url: httpsUrl,
    issuer: httpsUrl,
    scopes_supported: scopeList,
  },
  { logo_uri: httpsUrl },
);

const receiverBlock = object(
  {
    client_id: text(UUID),
    client_name: anyText(1, 80),
    eligibility: object({
      declared_at: text(DATE),
      health_plan_operator: oneOf(false),
      patient_facing: oneOf(true),
    }),
    jwks_uri: httpsUrl,
    policy_uri: httpsUrl,
    redirect_uris: list(httpsUrl, { min: 1, unique: true }),
    scopes_allowed: scopeList,
    tos_uri: httpsUrl,
    transport_certificates: list(transportCertificate, { max: 4, min: 1 }),
  },
  { logo_uri: httpsUrl },
);

/** Com uma versão `0.x` na lista, ela é a única (fase 0: uma versão por participante). */
const protocolVersions: Check = (value, path, errors) => {
  list(text(/^[0-9]+\.[0-9]+$/), { min: 1, unique: true })(value, path, errors);
  if (
    Array.isArray(value) &&
    value.length > 1 &&
    value.some((item) => typeof item === 'string' && item.startsWith('0.'))
  ) {
    errors.push(`${path}: com uma versão 0.x, a lista deveria ter só ela`);
  }
};

const participantFields = object(
  {
    cnpj: text(/^[0-9A-Z]{12}[0-9]{2}$/),
    contacts: object({
      security_email: text(EMAIL, { max: 254 }),
      technical_email: text(EMAIL, { max: 254 }),
    }),
    display_name: anyText(1, 80),
    legal_name: anyText(1, 200),
    participant_id: text(UUID),
    protocol_versions: protocolVersions,
    role: oneOf('provider', 'receiver'),
    status: oneOf('active', 'suspended', 'withdrawn'),
    updated_at: utcDateTime,
  },
  { provider: providerBlock, receiver: receiverBlock },
);

/** Cada papel exige o próprio bloco e proíbe o do outro. */
const participant: Check = (value, path, errors) => {
  participantFields(value, path, errors);
  if (!isObject(value)) return;
  for (const [role, other] of [
    ['provider', 'receiver'],
    ['receiver', 'provider'],
  ] as const) {
    if (value.role !== role) continue;
    if (!(role in value)) errors.push(`${path}.${role}: bloco obrigatório para o papel`);
    if (other in value) errors.push(`${path}.${other}: bloco não permitido para o papel`);
  }
};

const sequence: Check = (value, path, errors) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    errors.push(`${path}: deveria ser um inteiro maior ou igual a 1`);
  }
};

const document = object({
  environment: oneOf('pilot', 'production'),
  expires_at: utcDateTime,
  issued_at: utcDateTime,
  participants: list(participant),
  registry_keys: object({ keys: list(registryKey, { max: 4, min: 1 }) }),
  schema_version: text(/^0\.[0-9]+$/),
  sequence,
});

/** Devolve a lista de violações do schema. Lista vazia: documento válido. */
export function validateRegistryDocument(value: unknown): string[] {
  const errors: string[] = [];
  document(value, '$', errors);
  return errors;
}
