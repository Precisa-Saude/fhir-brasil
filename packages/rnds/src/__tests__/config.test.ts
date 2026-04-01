import { describe, expect, it } from 'vitest';

import type { RNDSConfig } from '../config';
import { resolveEndpoints, RNDS_ENDPOINTS, validateConfig } from '../config';

function validConfig(overrides?: Partial<RNDSConfig>): RNDSConfig {
  return {
    certificate: Buffer.from('fake-pfx'),
    certificatePassword: 'senha123',
    cnes: '1234567',
    cns: '123456789012345',
    environment: 'homologation',
    ...overrides,
  };
}

describe('validateConfig', () => {
  it('aceita configuração válida', () => {
    const result = validateConfig(validConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejeita certificate ausente', () => {
    const result = validateConfig(validConfig({ certificate: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('certificate é obrigatório');
  });

  it('rejeita certificatePassword ausente', () => {
    const result = validateConfig(validConfig({ certificatePassword: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('certificatePassword é obrigatório');
  });

  it('rejeita cnes com formato inválido', () => {
    const result = validateConfig(validConfig({ cnes: '123' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('cnes deve ter exatamente 7 dígitos');
  });

  it('rejeita cnes ausente', () => {
    const result = validateConfig(validConfig({ cnes: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('cnes é obrigatório');
  });

  it('rejeita cns com formato inválido', () => {
    const result = validateConfig(validConfig({ cns: '12345' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('cns deve ter exatamente 15 dígitos');
  });

  it('rejeita cns ausente', () => {
    const result = validateConfig(validConfig({ cns: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('cns é obrigatório');
  });

  it('rejeita environment inválido', () => {
    const result = validateConfig(validConfig({ environment: 'staging' as 'homologation' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('environment deve ser "homologation" ou "production"');
  });

  it('retorna múltiplos erros simultaneamente', () => {
    const result = validateConfig(validConfig({ cnes: '', cns: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('aceita certificate como string (caminho do arquivo)', () => {
    const result = validateConfig(validConfig({ certificate: '/path/to/cert.pfx' }));
    expect(result.valid).toBe(true);
  });
});

describe('resolveEndpoints', () => {
  it('retorna endpoints de homologação', () => {
    const endpoints = resolveEndpoints('homologation');
    expect(endpoints).toEqual(RNDS_ENDPOINTS.homologation);
    expect(endpoints.auth).toContain('hmg');
    expect(endpoints.api).toContain('hmg');
  });

  it('retorna endpoints de produção', () => {
    const endpoints = resolveEndpoints('production');
    expect(endpoints).toEqual(RNDS_ENDPOINTS.production);
    expect(endpoints.auth).not.toContain('hmg');
    expect(endpoints.api).not.toContain('hmg');
  });
});

describe('RNDS_ENDPOINTS', () => {
  it('contém URLs válidas para ambos os ambientes', () => {
    for (const env of ['homologation', 'production'] as const) {
      expect(RNDS_ENDPOINTS[env].auth).toMatch(/^https:\/\//);
      expect(RNDS_ENDPOINTS[env].api).toMatch(/^https:\/\//);
      expect(RNDS_ENDPOINTS[env].api).toContain('/api/fhir/r4');
    }
  });
});
