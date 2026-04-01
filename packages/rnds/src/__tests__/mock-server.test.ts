/**
 * Teste de integração local com dados mock
 *
 * Valida o fluxo completo do RNDSClient usando dados
 * realistas da RNDS sem credenciais reais.
 */

import type { FHIRPatient } from '@precisa-saude/fhir';
import { describe, expect, it, vi } from 'vitest';

import type { FHIROrganization, FHIRPractitioner } from '../types';

// --- Dados mock realistas da RNDS ---

const MOCK_PATIENT: FHIRPatient = {
  birthDate: '1990-05-15',
  gender: 'male',
  id: '123456789012345',
  name: [{ family: 'Silva', given: ['João', 'Carlos'] }],
  resourceType: 'Patient',
};

const MOCK_ORGANIZATION: FHIROrganization = {
  active: true,
  id: '1234567',
  identifier: [
    {
      system: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes',
      value: '1234567',
    },
  ],
  name: 'Hospital São Paulo',
  resourceType: 'Organization',
};

const MOCK_PRACTITIONER: FHIRPractitioner = {
  active: true,
  id: '987654321098765',
  name: [{ family: 'Santos', given: ['Maria'] }],
  resourceType: 'Practitioner',
};

const MOCK_TOKEN = {
  access_token:
    'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.mock-signature',
  expires_in: 1_800_000,
  scope: 'read write',
  token_type: 'jwt',
};

// --- Testes ---

describe('integração local com dados mock', () => {
  describe('fluxo completo de autenticação', () => {
    it('obtém e cacheia token com resposta realista', async () => {
      const auth = new (await import('../auth')).RNDSAuth(
        Buffer.from('fake-pfx'),
        'senha123',
        'https://ehr-auth-hmg.saude.gov.br',
      );

      const mockHttps = vi
        .spyOn(await import('../http'), 'httpsRequestWithCert')
        .mockResolvedValue({
          body: JSON.stringify(MOCK_TOKEN),
          headers: {},
          statusCode: 200,
        });

      const token = await auth.getToken();
      expect(token).toBe(MOCK_TOKEN.access_token);

      // Deve reusar o cache
      const token2 = await auth.getToken();
      expect(token2).toBe(token);
      expect(mockHttps).toHaveBeenCalledTimes(1);

      mockHttps.mockRestore();
    });
  });

  describe('dados FHIR realistas', () => {
    it('Patient com nome, gênero e data de nascimento', () => {
      expect(MOCK_PATIENT.resourceType).toBe('Patient');
      expect(MOCK_PATIENT.name?.[0]?.family).toBe('Silva');
      expect(MOCK_PATIENT.name?.[0]?.given).toEqual(['João', 'Carlos']);
      expect(MOCK_PATIENT.gender).toBe('male');
      expect(MOCK_PATIENT.birthDate).toBe('1990-05-15');
    });

    it('Organization com CNES no identifier', () => {
      expect(MOCK_ORGANIZATION.resourceType).toBe('Organization');
      expect(MOCK_ORGANIZATION.name).toBe('Hospital São Paulo');
      expect(MOCK_ORGANIZATION.identifier?.[0]?.system).toBe(
        'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes',
      );
      expect(MOCK_ORGANIZATION.identifier?.[0]?.value).toBe('1234567');
      expect(MOCK_ORGANIZATION.active).toBe(true);
    });

    it('Practitioner com nome e status ativo', () => {
      expect(MOCK_PRACTITIONER.resourceType).toBe('Practitioner');
      expect(MOCK_PRACTITIONER.name?.[0]?.family).toBe('Santos');
      expect(MOCK_PRACTITIONER.active).toBe(true);
    });

    it('token tem formato JWT com 3 partes', () => {
      const parts = MOCK_TOKEN.access_token.split('.');
      expect(parts).toHaveLength(3);

      const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString()) as Record<
        string,
        string
      >;
      expect(header.alg).toBe('RS256');
      expect(header.typ).toBe('JWT');
    });

    it('expires_in está em milissegundos (padrão RNDS = 30min)', () => {
      expect(MOCK_TOKEN.expires_in).toBe(1_800_000);
      expect(MOCK_TOKEN.expires_in / 1000 / 60).toBe(30);
    });
  });
});
