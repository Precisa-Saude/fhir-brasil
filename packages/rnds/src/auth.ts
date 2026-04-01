/**
 * Autenticação RNDS com cache de token JWT
 *
 * Obtém token JWT via mutual TLS no endpoint de autenticação
 * da RNDS. O token é cacheado e renovado automaticamente
 * antes de expirar.
 */

import { RNDSAuthError } from './errors';
import { httpsRequestWithCert } from './http';
import type { RNDSTokenResponse } from './types';

const TOKEN_REFRESH_MARGIN_MS = 60_000;

export class RNDSAuth {
  private token: string | null = null;
  private expiresAt = 0;
  private pendingRefresh: Promise<string> | null = null;

  constructor(
    private readonly pfx: Buffer,
    private readonly passphrase: string,
    private readonly authBaseUrl: string,
  ) {}

  async getToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.token!;
    }

    return this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }

    this.pendingRefresh = this.fetchToken();

    try {
      const token = await this.pendingRefresh;
      return token;
    } finally {
      this.pendingRefresh = null;
    }
  }

  isTokenValid(): boolean {
    return this.token !== null && Date.now() < this.expiresAt - TOKEN_REFRESH_MARGIN_MS;
  }

  private async fetchToken(): Promise<string> {
    const url = `${this.authBaseUrl}/api/token`;

    let response;
    try {
      response = await httpsRequestWithCert(url, {
        passphrase: this.passphrase,
        pfx: this.pfx,
      });
    } catch (err) {
      throw new RNDSAuthError(
        `Falha na autenticação com a RNDS: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (response.statusCode !== 200) {
      throw new RNDSAuthError(
        `Autenticação RNDS falhou com status ${response.statusCode}: ${response.body}`,
        response.statusCode,
      );
    }

    let tokenData: RNDSTokenResponse;
    try {
      tokenData = JSON.parse(response.body) as RNDSTokenResponse;
    } catch {
      throw new RNDSAuthError('Resposta de autenticação RNDS inválida: JSON malformado');
    }

    if (!tokenData.access_token) {
      throw new RNDSAuthError('Resposta de autenticação RNDS não contém access_token');
    }

    this.token = tokenData.access_token;
    this.expiresAt = this.extractExpiry(tokenData);

    return this.token;
  }

  private extractExpiry(tokenData: RNDSTokenResponse): number {
    // RNDS retorna expires_in em milissegundos (ex: 1800000 = 30 min)
    if (tokenData.expires_in) {
      return Date.now() + tokenData.expires_in;
    }

    try {
      const parts = tokenData.access_token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()) as {
          exp?: number;
        };
        if (payload.exp) {
          return payload.exp * 1000;
        }
      }
    } catch {
      // fallback para 30 minutos
    }

    return Date.now() + 30 * 60 * 1000;
  }
}
