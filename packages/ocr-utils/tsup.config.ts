import { readFileSync } from 'node:fs';

import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync('package.json', 'utf-8'));

export default defineConfig([
  {
    clean: true,
    dts: true,
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    sourcemap: true,
    splitting: true,
  },
  {
    banner: { js: '#!/usr/bin/env node' },
    clean: false,
    define: { __VERSION__: JSON.stringify(version) },
    dts: false,
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    sourcemap: false,
    splitting: false,
  },
]);
