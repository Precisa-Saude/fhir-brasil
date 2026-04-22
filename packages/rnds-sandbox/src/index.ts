/**
 * @precisa-saude/fhir-rnds-sandbox
 *
 * Mock local da RNDS para desenvolvimento, ensino e demos.
 * Sem certificado ICP-Brasil. Sem credenciamento DATASUS.
 */

export { issueToken, verifyToken } from './auth';
export type { IssueTokenOptions, JwtClaims, TokenPayload, VerifyResult } from './auth';
export { buildJwks } from './jwks';
export type { Jwk, JwksDocument } from './jwks';
export { resolveSigningKeys } from './keys';
export type { KeyOptions, SigningKeys } from './keys';
export { dispatch } from './router';
export type { PeerCertInfo, RouteContext, RouteResponse } from './router';
export { internacao, pacienteComExames, resolveScenario, SCENARIOS, vacina } from './scenarios';
export { createSandboxServer } from './server';
export type { SandboxServer } from './server';
export { SandboxStore } from './store';
export type {
  SandboxOptions,
  SandboxOrganization,
  SandboxPractitioner,
  Scenario,
  ScenarioData,
  ScenarioName,
} from './types';
