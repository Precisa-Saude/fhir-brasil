/**
 * Erros customizados para o cliente RNDS
 */

import type { FHIROperationOutcome } from './types';

export class RNDSError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly operationOutcome?: FHIROperationOutcome,
  ) {
    super(message);
    this.name = 'RNDSError';
  }
}

export class RNDSAuthError extends RNDSError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode);
    this.name = 'RNDSAuthError';
  }
}

export class RNDSNotFoundError extends RNDSError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'RNDSNotFoundError';
  }
}

export class RNDSValidationError extends RNDSError {
  constructor(message: string, operationOutcome?: FHIROperationOutcome) {
    super(message, 422, operationOutcome);
    this.name = 'RNDSValidationError';
  }
}
