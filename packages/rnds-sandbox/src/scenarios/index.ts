/**
 * Registro de cenários disponíveis no sandbox.
 */

import type { Scenario, ScenarioName } from '../types';

import { internacao } from './internacao';
import { pacienteComExames } from './paciente-com-exames';
import { vacina } from './vacina';

export const SCENARIOS: Record<ScenarioName, Scenario> = {
  'paciente-com-exames': pacienteComExames,
  internacao,
  vacina,
  vazio: {
    description: 'Estado limpo. Útil para testar fluxos do zero.',
    name: 'vazio',
    data: { organizations: [], patients: [], practitioners: [] },
  },
};

export function resolveScenario(name: ScenarioName | undefined): Scenario {
  return SCENARIOS[name ?? 'paciente-com-exames'];
}

export { internacao, pacienteComExames, vacina };
