import { defineConfig } from 'tsup';

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
    dts: false,
    entry: { cli: 'src/cli/index.ts' },
    format: ['esm'],
    sourcemap: false,
    splitting: false,
  },
]);
