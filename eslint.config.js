import base from '@precisa-saude/eslint-config/base';
import reactConfig from '@precisa-saude/eslint-config/react';

export default [
  ...base,
  // React rules for site/** (Astro/Vite frontend). The preset's
  // REACT_PATHS already includes `site/**/*.{ts,tsx,jsx}`.
  ...reactConfig,
  {
    // Test files are excluded from package tsconfigs (to keep tsc --noEmit tight),
    // so disable type-aware parsing for them or ESLint errors trying to locate a project.
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      parserOptions: { project: false },
    },
  },
  {
    // Example scripts intentionally use console.log to demo behavior.
    files: ['examples/**/*.ts'],
    languageOptions: {
      parserOptions: { project: false },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Large definition arrays — disable object sorting and line limits so the
    // medical-data tables stay readable.
    files: [
      'packages/core/src/biomarkers.ts',
      'packages/core/src/dexa-zone-data.ts',
      'packages/core/src/reference-ranges.ts',
      'packages/core/src/units.ts',
    ],
    rules: {
      'perfectionist/sort-objects': 'off',
      'max-lines': 'off',
    },
  },
];
