/**
 * Cliente RNDS (Rede Nacional de Dados em Saúde)
 *
 * Cliente HTTP fino para a API FHIR R4 da RNDS,
 * usando fetch nativo para chamadas de dados e
 * node:https para autenticação mTLS.
 */

import fs from 'node:fs';

import type { FHIRBundle, FHIRPatient } from '@precisa-saude/fhir';

import { RNDSAuth } from './auth';
import type { RNDSConfig } from './config';
import { resolveEndpoints, validateConfig } from './config';
import { RNDSAuthError, RNDSError, RNDSValidationError } from './errors';
import type { FHIROperationOutcome, FHIROrganization, FHIRPractitioner } from './types';

const RNDS_NS = {
  cns: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cns',
  cpf: 'http://rnds.saude.gov.br/fhir/r4/NamingSystem/cpf',
} as const;

export class RNDSClient {
  private readonly auth: RNDSAuth;
  private readonly apiBaseUrl: string;
  private readonly cns: string;

  constructor(config: RNDSConfig) {
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new RNDSError(`Configuração inválida: ${validation.errors.join('; ')}`);
    }

    const pfx =
      typeof config.certificate === 'string'
        ? fs.readFileSync(config.certificate)
        : config.certificate;

    const endpoints = resolveEndpoints(config.environment);
    this.apiBaseUrl = endpoints.api;
    this.cns = config.cns;
    this.auth = new RNDSAuth(pfx, config.certificatePassword, endpoints.auth);
  }

  async getPatientByCpf(cpf: string): Promise<FHIRPatient | null> {
    return this.get<FHIRPatient>(`/Patient?identifier=${RNDS_NS.cpf}|${encodeURIComponent(cpf)}`);
  }

  async getPatientByCns(cns: string): Promise<FHIRPatient | null> {
    return this.get<FHIRPatient>(`/Patient/${encodeURIComponent(cns)}`);
  }

  async getOrganizationByCnes(cnes: string): Promise<FHIROrganization | null> {
    return this.get<FHIROrganization>(`/Organization/${encodeURIComponent(cnes)}`);
  }

  async getPractitionerByCns(cns: string): Promise<FHIRPractitioner | null> {
    return this.get<FHIRPractitioner>(`/Practitioner/${encodeURIComponent(cns)}`);
  }

  async submitBundle(bundle: FHIRBundle): Promise<FHIRBundle> {
    return this.post<FHIRBundle>('/Bundle', bundle);
  }

  private async get<T>(path: string): Promise<T | null> {
    const response = await this.request(path, 'GET');

    if (response.status === 404) {
      return null;
    }

    await this.handleErrorResponse(response);
    return (await response.json()) as T;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.request(path, 'POST', body);
    await this.handleErrorResponse(response);
    return (await response.json()) as T;
  }

  private async request(path: string, method: string, body?: unknown): Promise<Response> {
    const headers = await this.buildHeaders();
    const url = `${this.apiBaseUrl}${path}`;

    return fetch(url, {
      body: body ? JSON.stringify(body) : undefined,
      headers,
      method,
    });
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const token = await this.auth.getToken();

    return {
      Accept: 'application/json',
      Authorization: this.cns,
      'Content-Type': 'application/json',
      'X-Authorization-Server': `Bearer ${token}`,
    };
  }

  private async handleErrorResponse(response: Response): Promise<void> {
    if (response.ok) {
      return;
    }

    let body: string;
    try {
      body = await response.text();
    } catch {
      body = '';
    }

    let operationOutcome: FHIROperationOutcome | undefined;
    try {
      const parsed = JSON.parse(body) as { resourceType?: string };
      if (parsed.resourceType === 'OperationOutcome') {
        operationOutcome = parsed as FHIROperationOutcome;
      }
    } catch {
      // corpo não é JSON válido
    }

    if (response.status === 401 || response.status === 403) {
      throw new RNDSAuthError(
        `Autenticação RNDS falhou (${response.status}): ${body}`,
        response.status,
      );
    }

    if (response.status === 422) {
      throw new RNDSValidationError(`Erro de validação FHIR (422): ${body}`, operationOutcome);
    }

    throw new RNDSError(
      `Erro na requisição RNDS (${response.status}): ${body}`,
      response.status,
      operationOutcome,
    );
  }
}
