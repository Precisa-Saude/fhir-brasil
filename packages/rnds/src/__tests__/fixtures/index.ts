import authError401 from './auth-error-401.json';
import bundleTransaction from './bundle-transaction.json';
import bundleTransactionResponse from './bundle-transaction-response.json';
import operationOutcomeError from './operation-outcome-error.json';
import operationOutcomeNotFound from './operation-outcome-not-found.json';
import organization from './organization.json';
import patientByCns from './patient-by-cns.json';
import patientByCpf from './patient-by-cpf.json';
import practitioner from './practitioner.json';
import tokenResponse from './token-response.json';

export const fixtures = {
  authError401,
  bundleTransaction,
  bundleTransactionResponse,
  operationOutcomeError,
  operationOutcomeNotFound,
  organization,
  patientByCns,
  patientByCpf,
  practitioner,
  tokenResponse,
} as const;
