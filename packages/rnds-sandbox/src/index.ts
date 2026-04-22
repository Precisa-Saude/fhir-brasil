/**
 * @precisa-saude/fhir-rnds-sandbox
 *
 * Mock local da RNDS para desenvolvimento, ensino e demos.
 * Sem certificado ICP-Brasil. Sem credenciamento DATASUS.
 */

export { issueToken } from './auth';
export type { TokenPayload } from './auth';
export { dispatch } from './router';
export type { RouteContext, RouteResponse } from './router';
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
