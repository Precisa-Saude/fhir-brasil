/**
 * Tipos públicos do sandbox da RNDS.
 *
 * O sandbox usa Bundle/recursos com estrutura mais permissiva que
 * `@precisa-saude/fhir` (que cobre apenas Patient/Observation/...) —
 * cenários incluem Encounter, Condition, Immunization, etc.
 */

/**
 * Recurso FHIR genérico armazenado pelo sandbox. `resourceType` é
 * obrigatório; `subject`/`patient` são tipados explicitamente porque o
 * store usa o `.reference` deles em buscas. Demais campos ficam livres.
 */
export interface SandboxResource {
  [key: string]: unknown;
  patient?: { reference?: string };
  resourceType: string;
  subject?: { reference?: string };
}

export interface SandboxBundleEntry {
  fullUrl?: string;
  request?: { method: string; url: string };
  resource?: SandboxResource;
  response?: { status: string; location?: string };
}

export interface SandboxBundle {
  entry?: SandboxBundleEntry[];
  resourceType: 'Bundle';
  type: 'transaction' | 'batch' | 'transaction-response' | 'batch-response' | 'searchset';
}

export interface SandboxPatient {
  birthDate?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  id?: string;
  identifier?: { system?: string; value?: string }[];
  name?: { family?: string; given?: string[] }[];
  resourceType: 'Patient';
}

export type SandboxOrganization = {
  active?: boolean;
  id?: string;
  identifier?: { system?: string; value?: string }[];
  name?: string;
  resourceType: 'Organization';
};

export type SandboxPractitioner = {
  active?: boolean;
  id?: string;
  identifier?: { system?: string; value?: string }[];
  name?: { family?: string; given?: string[] }[];
  resourceType: 'Practitioner';
};

export type ScenarioName = 'paciente-com-exames' | 'internacao' | 'vacina' | 'vazio';

export interface ScenarioData {
  organizations: SandboxOrganization[];
  patients: SandboxPatient[];
  practitioners: SandboxPractitioner[];
  /** Bundles previamente submetidos (e.g. cenário com histórico) */
  submittedBundles?: SandboxBundle[];
}

export interface Scenario {
  data: ScenarioData;
  description: string;
  name: ScenarioName;
}

export interface SandboxOptions {
  /** Hostname para bind. Padrão: '127.0.0.1' */
  host?: string;
  /** Identificador da chave (claim `kid` + `kid` no JWKS). Padrão: 'rnds-sandbox-1' */
  jwtKeyId?: string;
  /**
   * PEM da chave privada usada para assinar JWTs (RS256). Se omitido,
   * é gerada uma chave RSA-2048 no boot.
   */
  jwtPrivateKey?: Buffer | string;
  /** PEM da chave pública correspondente — opcional (derivada da privada) */
  jwtPublicKey?: Buffer | string;
  /** Logger opcional. Padrão: console.log */
  log?: (msg: string) => void;
  /**
   * Habilita HTTPS com mTLS. Cliente é solicitado a apresentar certificado;
   * /api/token o exige (igual à RNDS real). Padrão: false (HTTP puro).
   */
  mtls?: boolean;
  /** Porta para escutar. Padrão: 8443 (mtls) ou 8080 (sem mtls) */
  port?: number;
  /** Cenário a carregar. Padrão: 'paciente-com-exames' */
  scenario?: ScenarioName;
  /** PEM do certificado do servidor (alternativa a `serverPfx`) */
  serverCert?: Buffer | string;
  /** PEM da chave privada do servidor (alternativa a `serverPfx`) */
  serverKey?: Buffer | string;
  /**
   * Certificado PFX do servidor (Buffer ou caminho). Use isso OU `serverKey`+`serverCert`.
   */
  serverPfx?: Buffer | string;
  /** Senha do PFX do servidor */
  serverPfxPassword?: string;
  /**
   * Modo estrito — exige bearer token assinado + header `Authorization: <CNS>`
   * em todos os endpoints `/api/fhir/r4/*`. Implícito quando `mtls = true`.
   * Padrão: igual a `mtls`.
   */
  strict?: boolean;
  /** Validar bundles submetidos contra perfis da IG (best-effort). Padrão: true */
  validateSubmissions?: boolean;
}
