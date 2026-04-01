import type { FHIRBundle, FHIRPatient } from '@precisa-saude/fhir';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RNDSClient } from '../client';
import { RNDSAuthError, RNDSError, RNDSValidationError } from '../errors';
import type { FHIROrganization, FHIRPractitioner } from '../types';

const mockGetToken = vi.fn().mockResolvedValue('mock-jwt-token');

vi.mock('../auth', () => ({
  RNDSAuth: vi.fn().mockImplementation(() => ({
    getToken: mockGetToken,
  })),
}));

vi.mock('node:fs', () => ({
  default: { readFileSync: vi.fn().mockReturnValue(Buffer.from('fake-pfx')) },
  readFileSync: vi.fn().mockReturnValue(Buffer.from('fake-pfx')),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createClient() {
  return new RNDSClient({
    certificate: Buffer.from('fake-pfx'),
    certificatePassword: 'senha123',
    cnes: '1234567',
    cns: '123456789012345',
    environment: 'homologation',
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('RNDSClient', () => {
  let client: RNDSClient;

  beforeEach(() => {
    mockFetch.mockReset();
    mockGetToken.mockReset().mockResolvedValue('mock-jwt-token');
    client = createClient();
  });

  describe('constructor', () => {
    it('cria cliente com configuração válida', () => {
      expect(client).toBeInstanceOf(RNDSClient);
    });

    it('lança erro com configuração inválida', () => {
      expect(
        () =>
          new RNDSClient({
            certificate: Buffer.from('pfx'),
            certificatePassword: 'senha',
            cnes: '123',
            cns: '123',
            environment: 'homologation',
          }),
      ).toThrow(RNDSError);
    });

    it('aceita certificado como caminho de arquivo', () => {
      const fileClient = new RNDSClient({
        certificate: '/path/to/cert.pfx',
        certificatePassword: 'senha',
        cnes: '1234567',
        cns: '123456789012345',
        environment: 'homologation',
      });
      expect(fileClient).toBeInstanceOf(RNDSClient);
    });
  });

  describe('getPatientByCpf', () => {
    it('retorna paciente encontrado', async () => {
      const patient: FHIRPatient = {
        birthDate: '1990-01-01',
        gender: 'male',
        name: [{ family: 'Silva', given: ['João'] }],
        resourceType: 'Patient',
      };

      mockFetch.mockResolvedValue(jsonResponse(patient));
      const result = await client.getPatientByCpf('12345678900');

      expect(result).toEqual(patient);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/Patient?identifier=http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf|12345678900',
        ),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('retorna null para 404', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 404));
      const result = await client.getPatientByCpf('00000000000');
      expect(result).toBeNull();
    });
  });

  describe('getPatientByCns', () => {
    it('retorna paciente por CNS via lookup direto', async () => {
      const patient: FHIRPatient = {
        name: [{ text: 'Maria' }],
        resourceType: 'Patient',
      };

      mockFetch.mockResolvedValue(jsonResponse(patient));
      const result = await client.getPatientByCns('123456789012345');

      expect(result).toEqual(patient);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/Patient/123456789012345'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('retorna null para 404', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 404));
      const result = await client.getPatientByCns('000000000000000');
      expect(result).toBeNull();
    });
  });

  describe('getOrganizationByCnes', () => {
    it('retorna organização via lookup direto por CNES', async () => {
      const org: FHIROrganization = {
        name: 'Hospital ABC',
        resourceType: 'Organization',
      };

      mockFetch.mockResolvedValue(jsonResponse(org));
      const result = await client.getOrganizationByCnes('1234567');

      expect(result).toEqual(org);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/Organization/1234567'),
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('retorna null para 404', async () => {
      mockFetch.mockResolvedValue(jsonResponse({}, 404));
      const result = await client.getOrganizationByCnes('0000000');
      expect(result).toBeNull();
    });
  });

  describe('getPractitionerByCns', () => {
    it('retorna profissional via lookup direto por CNS', async () => {
      const practitioner: FHIRPractitioner = {
        name: [{ text: 'Dr. Carlos' }],
        resourceType: 'Practitioner',
      };

      mockFetch.mockResolvedValue(jsonResponse(practitioner));
      const result = await client.getPractitionerByCns('123456789012345');

      expect(result).toEqual(practitioner);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/Practitioner/123456789012345'),
        expect.objectContaining({ method: 'GET' }),
      );
    });
  });

  describe('submitBundle', () => {
    it('envia bundle com sucesso', async () => {
      const inputBundle: FHIRBundle = {
        entry: [],
        resourceType: 'Bundle',
        type: 'transaction',
      };
      const responseBundle: FHIRBundle = {
        entry: [],
        resourceType: 'Bundle',
        type: 'transaction',
      };

      mockFetch.mockResolvedValue(jsonResponse(responseBundle, 201));
      const result = await client.submitBundle(inputBundle);

      expect(result).toEqual(responseBundle);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/Bundle'),
        expect.objectContaining({
          body: JSON.stringify(inputBundle),
          method: 'POST',
        }),
      );
    });
  });

  describe('headers de autenticação', () => {
    it('inclui X-Authorization-Server e Authorization com Content-Type correto', async () => {
      const patient: FHIRPatient = { resourceType: 'Patient' };
      mockFetch.mockResolvedValue(jsonResponse(patient));
      await client.getPatientByCpf('12345678900');

      const fetchCall = mockFetch.mock.calls[0]!;
      const headers = fetchCall[1]?.headers as Record<string, string>;

      expect(headers['X-Authorization-Server']).toBe('Bearer mock-jwt-token');
      expect(headers['Authorization']).toBe('123456789012345');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
    });
  });

  describe('tratamento de erros HTTP', () => {
    it('lança RNDSAuthError para 401', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      } as Response);

      await expect(client.getPatientByCpf('123')).rejects.toThrow(RNDSAuthError);
    });

    it('lança RNDSAuthError para 403', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      } as Response);

      await expect(client.getPatientByCpf('123')).rejects.toThrow(RNDSAuthError);
    });

    it('lança RNDSValidationError para 422 com OperationOutcome', async () => {
      const outcome = {
        issue: [{ code: 'invalid', severity: 'error' }],
        resourceType: 'OperationOutcome',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: () => Promise.resolve(JSON.stringify(outcome)),
      } as Response);

      await expect(
        client.submitBundle({ entry: [], resourceType: 'Bundle', type: 'transaction' }),
      ).rejects.toThrow(RNDSValidationError);
    });

    it('lança RNDSError para outros status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      } as Response);

      await expect(client.getPatientByCpf('123')).rejects.toThrow(RNDSError);
    });

    it('trata erro ao ler corpo da resposta', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.reject(new Error('read error')),
      } as Response);

      await expect(client.getPatientByCpf('123')).rejects.toThrow(RNDSError);
    });
  });
});
