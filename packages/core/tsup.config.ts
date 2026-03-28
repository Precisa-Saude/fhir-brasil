import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    biomarkers: 'src/biomarkers.ts',
    'reference-ranges': 'src/reference-ranges.ts',
    converter: 'src/converter.ts',
    importer: 'src/importer.ts',
    units: 'src/units.ts',
    validators: 'src/validators.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true,
  sourcemap: true,
});
