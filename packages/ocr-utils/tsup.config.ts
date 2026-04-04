import { defineConfig } from 'tsup';

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
    dts: false,
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    sourcemap: false,
    splitting: false,
  },
]);
