/**
 * Tipos públicos do sandbox da RNDS.
 *
 * O sandbox usa Bundle/recursos com estrutura mais permissiva que
 * `@precisa-saude/fhir` (que cobre apenas Patient/Observation/...) —
 * cenários incluem Encounter, Condition, Immunization, etc.
 */

export interface SandboxResource {
  resourceType: string;
  [key: string]: unknown;
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
  /** Habilita verificação mTLS no handshake (cliente precisa apresentar cert). Padrão: false */
  mtls?: boolean;
  /**
   * Se mtls = true, certificado PFX do servidor (mesmo cert que cliente apresentaria,
   * útil para devs que já têm cert ICP-Brasil de homologação). Pode ser caminho ou Buffer.
   */
  serverPfx?: Buffer | string;
  /** Senha do PFX do servidor */
  serverPfxPassword?: string;
  /** Porta para escutar. Padrão: 8443 (mtls) ou 8080 (sem mtls) */
  port?: number;
  /** Hostname para bind. Padrão: '127.0.0.1' */
  host?: string;
  /** Cenário a carregar. Padrão: 'paciente-com-exames' */
  scenario?: ScenarioName;
  /** Logger opcional. Padrão: console.log */
  log?: (msg: string) => void;
  /** Validar bundles submetidos contra perfis da IG (best-effort). Padrão: true */
  validateSubmissions?: boolean;
}
