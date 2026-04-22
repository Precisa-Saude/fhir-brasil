/**
 * @precisa-saude/fhir-rnds-sandbox
 *
 * Mock local da RNDS para desenvolvimento, ensino e demos.
 * Sem certificado ICP-Brasil. Sem credenciamento DATASUS.
 */

export type {
  IssueTokenOptions,
  JwtClaims,
  TokenPayload,
  VerifyOptions,
  VerifyResult,
} from './auth';
export { issueToken, verifyToken } from './auth';
export type { Jwk, JwksDocument } from './jwks';
export { buildJwks } from './jwks';
export type { KeyOptions, SigningKeys } from './keys';
export { resetSigningKeysCache, resolveSigningKeys } from './keys';
export type { PeerCertInfo, RouteContext, RouteResponse } from './router';
export { dispatch } from './router';
export { internacao, pacienteComExames, resolveScenario, SCENARIOS, vacina } from './scenarios';
export type { SandboxServer } from './server';
export { createSandboxServer } from './server';
export { SandboxStore } from './store';
export type {
  SandboxOptions,
  SandboxOrganization,
  SandboxPractitioner,
  Scenario,
  ScenarioData,
  ScenarioName,
} from './types';
export type { IssueSeverity, ValidationIssue, ValidationResult } from './validation';
export {
  validateBRDiagnosticReport,
  validateBRLabObservation,
  validateBRPatient,
  validateBundle,
  validateResource,
} from './validation';
