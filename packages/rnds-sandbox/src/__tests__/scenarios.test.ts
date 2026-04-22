import { describe, expect, it } from 'vitest';

import { resolveScenario, SCENARIOS } from '../scenarios';
import { SandboxStore } from '../store';

describe('cenários', () => {
  it('cobre os três cenários nomeados + vazio', () => {
    expect(Object.keys(SCENARIOS).sort()).toEqual([
      'internacao',
      'paciente-com-exames',
      'vacina',
      'vazio',
    ]);
  });

  it('paciente-com-exames carrega Bundle de lipidograma + glicemia (4 observations)', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('paciente-com-exames'));
    const submitted = store.getSubmittedBundles();
    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.entry).toHaveLength(4);
  });

  it('internacao inclui Encounter + Condition + 2 Observations', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('internacao'));
    const types = store.getSubmittedBundles()[0]?.entry?.map((e) => e.resource?.resourceType);
    expect(types).toEqual(['Encounter', 'Condition', 'Observation', 'Observation']);
  });

  it('vacina inclui 3 Immunizations', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('vacina'));
    const types = store.getSubmittedBundles()[0]?.entry?.map((e) => e.resource?.resourceType);
    expect(types).toEqual(['Immunization', 'Immunization', 'Immunization']);
  });

  it('vazio carrega zero recursos', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('vazio'));
    expect(store.getSubmittedBundles()).toHaveLength(0);
    expect(store.findPatientByCns('700000000000001')).toBeUndefined();
  });
});
