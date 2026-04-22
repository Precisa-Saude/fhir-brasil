import { describe, expect, it } from 'vitest';

import { resolveScenario } from '../scenarios';
import { SandboxStore } from '../store';

function loadedStore() {
  const store = new SandboxStore();
  store.load(resolveScenario('paciente-com-exames'));
  return store;
}

describe('SandboxStore.searchResourcesByPatient — match estrito por path-segment', () => {
  it('encontra Observations por CNS exato', () => {
    const store = loadedStore();
    const obs = store.searchResourcesByPatient('Observation', '700000000000001');
    expect(obs).toHaveLength(4);
  });

  it('NÃO false-matcha por sufixo do CNS (regression: Patient/1700... vs 700...)', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('vazio'));
    store.recordBundle({
      entry: [
        {
          request: { method: 'POST', url: 'Observation' },
          resource: {
            code: { coding: [{ code: '2345-7' }] },
            resourceType: 'Observation',
            // Reference termina em "...700000000000001" mas não é Patient/700000000000001
            subject: { reference: 'Patient/1700000000000001' },
          },
        },
      ],
      resourceType: 'Bundle',
      type: 'transaction',
    });
    const matches = store.searchResourcesByPatient('Observation', '700000000000001');
    expect(matches).toEqual([]);
  });

  it('aceita reference apenas com o CNS (sem prefixo Patient/)', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('vazio'));
    store.recordBundle({
      entry: [
        {
          request: { method: 'POST', url: 'Observation' },
          resource: {
            code: { coding: [{ code: '2345-7' }] },
            resourceType: 'Observation',
            subject: { reference: '700000000000001' },
          },
        },
      ],
      resourceType: 'Bundle',
      type: 'transaction',
    });
    const matches = store.searchResourcesByPatient('Observation', '700000000000001');
    expect(matches).toHaveLength(1);
  });
});

describe('SandboxStore.nextResourceId — sequência global', () => {
  it('incrementa a cada chamada e não reseta entre bundles', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('vazio'));
    expect(store.nextResourceId()).toBe(1);
    expect(store.nextResourceId()).toBe(2);
    expect(store.nextResourceId()).toBe(3);
  });

  it('reseta apenas no `load` (novo cenário)', () => {
    const store = new SandboxStore();
    store.load(resolveScenario('vazio'));
    store.nextResourceId();
    store.nextResourceId();
    store.load(resolveScenario('paciente-com-exames'));
    expect(store.nextResourceId()).toBe(1);
  });
});
