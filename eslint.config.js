import base from '@precisa-saude/eslint-config/base';

export default [
  ...base,
  // Same setup as medbench-brasil: the site is linted with the base preset
  // only. The react preset sets `react.version: 'detect'`, and
  // eslint-plugin-react 7.37 calls `context.getFilename()` to detect it,
  // which ESLint 10 removed — every run over site/** crashed before linting.
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
      'packages/core/src/loinc-snapshot.generated.ts',
      'packages/core/src/mapping-decisions.ts',
      'packages/core/src/reference-ranges.ts',
      'packages/core/src/units.ts',
    ],
    rules: {
      'perfectionist/sort-objects': 'off',
      'max-lines': 'off',
    },
  },
];
