import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'tsup';

const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'package.json');
const { version } = JSON.parse(readFileSync(pkgPath, 'utf-8'));

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
