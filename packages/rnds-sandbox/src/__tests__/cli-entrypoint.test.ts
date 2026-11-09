import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'tsup';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const directory = mkdtempSync(join(tmpdir(), 'rnds-sandbox-cli-'));
const entrypoint = join(directory, 'cli.mjs');

beforeAll(async () => {
  await build({
    config: false,
    dts: false,
    entry: [fileURLToPath(new URL('../cli.ts', import.meta.url))],
    format: ['esm'],
    outDir: directory,
    outExtension: () => ({ js: '.mjs' }),
    platform: 'node',
    silent: true,
    target: 'node22',
  });
});

afterAll(() => {
  rmSync(directory, { force: true, recursive: true });
});

describe('CLI compilada em subprocesso', () => {
  it.each([
    ['start', '--scenario', 'inexistente'],
    ['start', '--port', 'abc'],
    ['start', '--mtls'],
  ])('retorna status 1 para argumentos inválidos: %j', (...args) => {
    const result = spawnSync(process.execPath, [entrypoint, ...args], {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(result.error).toBeUndefined();
    expect(result.stderr).toContain('erro:');
    expect(result.status).toBe(1);
  });

  it.each([['--help'], ['scenarios']])('retorna status 0 para %s', (...args) => {
    const result = spawnSync(process.execPath, [entrypoint, ...args], {
      encoding: 'utf8',
      timeout: 5000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).not.toBe('');
    expect(result.stderr).toBe('');
  });
});
