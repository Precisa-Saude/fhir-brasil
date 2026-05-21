#!/usr/bin/env node

/**
 * Syncs the root package.json version to all workspace packages.
 * Called by semantic-release via @semantic-release/git before committing.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rootPkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const version = rootPkg.version;

const packages = ['packages/core', 'packages/calculators', 'packages/ocr-utils', 'packages/rnds'];

for (const dir of packages) {
  const pkgPath = join(dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`${pkg.name}@${version}`);
}
