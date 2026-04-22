import { describe, expect, it } from 'vitest';

import { parseArgs } from '../cli';

describe('cli — parseArgs', () => {
  it('reconhece subcomando start', () => {
    const r = parseArgs(['start']);
    expect(r.command).toBe('start');
    expect(r.errors).toEqual([]);
  });

  it('reconhece scenarios e help', () => {
    expect(parseArgs(['scenarios']).command).toBe('scenarios');
    expect(parseArgs(['help']).command).toBe('help');
    expect(parseArgs(['--help']).command).toBe('help');
    expect(parseArgs(['-h']).command).toBe('help');
  });

  it('parseia --port numérico', () => {
    const r = parseArgs(['start', '--port', '9000']);
    expect(r.options.port).toBe(9000);
    expect(r.errors).toEqual([]);
  });

  it('rejeita --port não-numérico', () => {
    const r = parseArgs(['start', '--port', 'abc']);
    expect(r.errors[0]).toContain('--port');
  });

  it('parseia --scenario válido', () => {
    const r = parseArgs(['start', '--scenario', 'internacao']);
    expect(r.options.scenario).toBe('internacao');
  });

  it('rejeita --scenario inválido com lista de opções', () => {
    const r = parseArgs(['start', '--scenario', 'inexistente']);
    expect(r.errors[0]).toContain('paciente-com-exames');
    expect(r.errors[0]).toContain('inexistente');
  });

  it('parseia flags booleanas --mtls e --strict', () => {
    const r = parseArgs(['start', '--mtls', '--strict']);
    expect(r.options.mtls).toBe(true);
    expect(r.options.strict).toBe(true);
  });

  it('parseia argumentos string (PFX, PEM, JWT keys)', () => {
    const r = parseArgs([
      'start',
      '--pfx',
      'cert.pfx',
      '--pfx-password',
      's3cret',
      '--server-key',
      's.key',
      '--server-cert',
      's.crt',
      '--jwt-private-key',
      'jwt.pem',
      '--jwt-public-key',
      'jwt.pub',
      '--jwt-key-id',
      'k1',
    ]);
    expect(r.errors).toEqual([]);
    expect(r.options.serverPfx).toBe('cert.pfx');
    expect(r.options.serverPfxPassword).toBe('s3cret');
    expect(r.options.serverKey).toBe('s.key');
    expect(r.options.serverCert).toBe('s.crt');
    expect(r.options.jwtPrivateKey).toBe('jwt.pem');
    expect(r.options.jwtPublicKey).toBe('jwt.pub');
    expect(r.options.jwtKeyId).toBe('k1');
  });

  it('rejeita argumentos string sem valor', () => {
    const r = parseArgs(['start', '--pfx']);
    expect(r.errors[0]).toContain('--pfx');
  });

  it('rejeita flag desconhecida', () => {
    const r = parseArgs(['start', '--xyz']);
    expect(r.errors[0]).toContain('--xyz');
  });
});
