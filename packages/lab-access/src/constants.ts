/**
 * Constantes do protocolo Open Labs Brasil, versão 0.2.2 da especificação.
 */

/** Versão do documento da especificação que este pacote implementa. */
export const SPEC_VERSION = '0.2.2';

/**
 * Versão de protocolo (`MAJOR.MINOR`) que este pacote implementa, a que vai em
 * `protocol_versions` no registro (seção 9.1). O PATCH do documento não entra.
 */
export const PROTOCOL_VERSION = '0.2';

/** Versões de protocolo com que o pacote sabe operar. */
export const SUPPORTED_PROTOCOL_VERSIONS: readonly string[] = [PROTOCOL_VERSION];

/** Escopos obtidos com `client_credentials`, sem paciente. */
export const PROVIDER_SCOPES = [
  'catalog.read',
  'locations.read',
  'schedule.read',
  'consent.manage',
] as const;

/** Escopos que dependem de um consentimento autorizado pelo paciente. */
export const PATIENT_SCOPES = ['appointment.write', 'results.read', 'consent.read'] as const;

export type ProviderScope = (typeof PROVIDER_SCOPES)[number];
export type PatientScope = (typeof PATIENT_SCOPES)[number];
export type Scope = PatientScope | ProviderScope;

/** Sistema dos códigos de erro em `OperationOutcome.issue.details.coding`. */
export const ERROR_CODE_SYSTEM = 'urn:open-labs-brasil:error-code';

export const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

/** Validade da asserção do cliente, em segundos (seção 7.2). */
export const CLIENT_ASSERTION_LIFETIME_SECONDS = 60;

/** Tolerância de relógio fora de JWT, em milissegundos (seção 7.4). */
export const CLOCK_TOLERANCE_MS = 60_000;

/** Teto da validade de um token de acesso, em segundos (seção 7.4). */
export const MAX_ACCESS_TOKEN_LIFETIME_SECONDS = 900;

/**
 * Antecedência com que o token de acesso deixa de ser usado, contada de
 * `expires_in` (seção 5.3.4). A especificação pede ao menos 30 segundos.
 */
export const ACCESS_TOKEN_EXPIRY_MARGIN_MS = 60_000;

/** Tempo máximo de cache do documento de metadados (seção 5.2). */
export const METADATA_CACHE_MS = 24 * 60 * 60 * 1000;

/** Intervalo máximo entre buscas do registro (seção 8.4). */
export const REGISTRY_MAX_FETCH_INTERVAL_MS = 60 * 60 * 1000;

/** Intervalo mínimo recomendado entre buscas do registro (seção 8.4). */
export const REGISTRY_MIN_FETCH_INTERVAL_MS = 5 * 60 * 1000;

/** Validade máxima de um documento do registro (seção 8.2). */
export const REGISTRY_MAX_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;

/** Tamanho mínimo, em bits, de uma chave RSA de assinatura do registro (seção 8.3, V5). */
export const REGISTRY_KEY_MIN_BITS = 2048;

/**
 * Janela depois de `expires_at` em que a renovação por refresh token e o
 * token de `consent.manage` sozinho seguem permitidos (seção 8.3).
 */
export const REGISTRY_EXPIRED_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** Intervalo entre repetições de uma revogação pendente nas primeiras 24 horas (seção 4.4). */
export const PENDING_REVOCATION_HOURLY_INTERVAL_MS = 60 * 60 * 1000;

/** Por quanto tempo, desde o pedido, a revogação pendente é repetida de hora em hora. */
export const PENDING_REVOCATION_HOURLY_PERIOD_MS = 24 * 60 * 60 * 1000;

/** Intervalo entre repetições de uma revogação pendente depois das primeiras 24 horas. */
export const PENDING_REVOCATION_DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Intervalo máximo entre consultas de estado de um consentimento autorizado (fluxo 2.7). */
export const CONSENT_STATUS_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Janela máxima da busca de horários, em dias (seção 5.5.4). */
export const SLOT_SEARCH_MAX_WINDOW_DAYS = 31;

/** Prazo máximo de um consentimento, em meses (seção 4.4). */
export const CONSENT_MAX_MONTHS = 12;
