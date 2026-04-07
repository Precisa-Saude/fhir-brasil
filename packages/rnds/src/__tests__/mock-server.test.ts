/**
 * Teste de integração local com dados mock
 *
 * Valida o fluxo completo do RNDSClient usando dados
 * realistas da RNDS sem credenciais reais.
 */

import type { FHIRPatient } from '@precisa-saude/fhir';
import { describe, expect, it, vi } from 'vitest';

import type { FHIROrganization, FHIRPractitioner } from '../types';
import { fixtures } from './fixtures';

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
          body: JSON.stringify(fixtures.tokenResponse),
          headers: {},
          statusCode: 200,
        });

      const token = await auth.getToken();
      expect(token).toBe(fixtures.tokenResponse.access_token);

      // Deve reusar o cache
      const token2 = await auth.getToken();
      expect(token2).toBe(token);
      expect(mockHttps).toHaveBeenCalledTimes(1);

      mockHttps.mockRestore();
    });
  });

  describe('dados FHIR realistas', () => {
    it('Patient com nome, gênero e data de nascimento', () => {
      const patient = fixtures.patientByCpf as FHIRPatient;
      expect(patient.resourceType).toBe('Patient');
      expect(patient.name?.[0]?.family).toBe('Silva');
      expect(patient.name?.[0]?.given).toEqual(['João', 'Carlos']);
      expect(patient.gender).toBe('male');
      expect(patient.birthDate).toBe('1990-05-15');
    });

    it('Organization com CNES no identifier', () => {
      const org = fixtures.organization as FHIROrganization;
      expect(org.resourceType).toBe('Organization');
      expect(org.name).toBe('Hospital São Paulo');
      expect(org.identifier?.[0]?.system).toBe(
        'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cnes',
      );
      expect(org.identifier?.[0]?.value).toBe('1234567');
      expect(org.active).toBe(true);
    });

    it('Practitioner com nome e status ativo', () => {
      const practitioner = fixtures.practitioner as FHIRPractitioner;
      expect(practitioner.resourceType).toBe('Practitioner');
      expect(practitioner.name?.[0]?.family).toBe('Santos');
      expect(practitioner.active).toBe(true);
    });

    it('token tem formato JWT com 3 partes', () => {
      const parts = fixtures.tokenResponse.access_token.split('.');
      expect(parts).toHaveLength(3);

      const header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString()) as Record<
        string,
        string
      >;
      expect(header.alg).toBe('RS256');
      expect(header.typ).toBe('JWT');
    });

    it('expires_in está em milissegundos (padrão RNDS = 30min)', () => {
      expect(fixtures.tokenResponse.expires_in).toBe(1_800_000);
      expect(fixtures.tokenResponse.expires_in / 1000 / 60).toBe(30);
    });
  });
});
