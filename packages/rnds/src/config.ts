/**
 * Configuração do cliente RNDS
 *
 * Define tipos de configuração e constantes de ambiente para
 * conexão com a Rede Nacional de Dados em Saúde (RNDS).
 */

export type RNDSEnvironment = 'homologation' | 'production';

export interface RNDSConfig {
  /** Certificado PFX como Buffer ou caminho do arquivo */
  certificate: Buffer | string;
  /** Senha do certificado PFX */
  certificatePassword: string;
  /** CNES do estabelecimento de saúde */
  cnes: string;
  /** CNS do profissional de saúde responsável */
  cns: string;
  /** Ambiente da RNDS */
  environment: RNDSEnvironment;
}

export interface RNDSEndpoints {
  api: string;
  auth: string;
}

export const RNDS_ENDPOINTS: Record<RNDSEnvironment, RNDSEndpoints> = {
  homologation: {
    api: 'https://ehr-services.hmg.saude.gov.br/api/fhir/r4',
    auth: 'https://ehr-auth-hmg.saude.gov.br',
  },
  production: {
    api: 'https://ehr-services.saude.gov.br/api/fhir/r4',
    auth: 'https://ehr-auth.saude.gov.br',
  },
};

export function resolveEndpoints(environment: RNDSEnvironment): RNDSEndpoints {
  return RNDS_ENDPOINTS[environment];
}

export function validateConfig(config: RNDSConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.certificate) {
    errors.push('certificate é obrigatório');
  }

  if (!config.certificatePassword) {
    errors.push('certificatePassword é obrigatório');
  }

  if (!config.cnes) {
    errors.push('cnes é obrigatório');
  } else if (!/^\d{7}$/.test(config.cnes)) {
    errors.push('cnes deve ter exatamente 7 dígitos');
  }

  if (!config.cns) {
    errors.push('cns é obrigatório');
  } else if (!/^\d{15}$/.test(config.cns)) {
    errors.push('cns deve ter exatamente 15 dígitos');
  }

  if (!config.environment) {
    errors.push('environment é obrigatório');
  } else if (config.environment !== 'homologation' && config.environment !== 'production') {
    errors.push('environment deve ser "homologation" ou "production"');
  }

  return { errors, valid: errors.length === 0 };
}
