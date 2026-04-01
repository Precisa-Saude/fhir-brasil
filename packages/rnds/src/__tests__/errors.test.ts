import { describe, expect, it } from 'vitest';

import { RNDSAuthError, RNDSError, RNDSNotFoundError, RNDSValidationError } from '../errors';
import type { FHIROperationOutcome } from '../types';

describe('RNDSError', () => {
  it('define name, message e statusCode', () => {
    const err = new RNDSError('erro genérico', 500);
    expect(err.name).toBe('RNDSError');
    expect(err.message).toBe('erro genérico');
    expect(err.statusCode).toBe(500);
    expect(err).toBeInstanceOf(Error);
  });

  it('aceita operationOutcome opcional', () => {
    const outcome: FHIROperationOutcome = {
      issue: [{ code: 'invalid', severity: 'error' }],
      resourceType: 'OperationOutcome',
    };
    const err = new RNDSError('erro', 422, outcome);
    expect(err.operationOutcome).toEqual(outcome);
  });

  it('funciona sem statusCode e operationOutcome', () => {
    const err = new RNDSError('apenas mensagem');
    expect(err.statusCode).toBeUndefined();
    expect(err.operationOutcome).toBeUndefined();
  });
});

describe('RNDSAuthError', () => {
  it('é instância de RNDSError e Error', () => {
    const err = new RNDSAuthError('não autorizado', 401);
    expect(err.name).toBe('RNDSAuthError');
    expect(err.statusCode).toBe(401);
    expect(err).toBeInstanceOf(RNDSError);
    expect(err).toBeInstanceOf(Error);
  });
});

describe('RNDSNotFoundError', () => {
  it('tem statusCode 404', () => {
    const err = new RNDSNotFoundError('paciente não encontrado');
    expect(err.name).toBe('RNDSNotFoundError');
    expect(err.statusCode).toBe(404);
    expect(err).toBeInstanceOf(RNDSError);
  });
});

describe('RNDSValidationError', () => {
  it('tem statusCode 422 e operationOutcome', () => {
    const outcome: FHIROperationOutcome = {
      issue: [{ code: 'required', severity: 'error' }],
      resourceType: 'OperationOutcome',
    };
    const err = new RNDSValidationError('validação falhou', outcome);
    expect(err.name).toBe('RNDSValidationError');
    expect(err.statusCode).toBe(422);
    expect(err.operationOutcome).toEqual(outcome);
    expect(err).toBeInstanceOf(RNDSError);
  });

  it('funciona sem operationOutcome', () => {
    const err = new RNDSValidationError('erro de validação');
    expect(err.operationOutcome).toBeUndefined();
  });
});
