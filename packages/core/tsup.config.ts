import { readFileSync } from 'node:fs';

import { defineConfig } from 'tsup';

const { version } = JSON.parse(readFileSync('package.json', 'utf-8'));

export default defineConfig([
  {
    clean: true,
    dts: true,
    entry: {
      biomarkers: 'src/biomarkers.ts',
      'cli-utils': 'src/cli-utils.ts',
      converter: 'src/converter.ts',
      importer: 'src/importer.ts',
      index: 'src/index.ts',
      'reference-ranges': 'src/reference-ranges.ts',
      units: 'src/units.ts',
      validators: 'src/validators.ts',
    },
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
