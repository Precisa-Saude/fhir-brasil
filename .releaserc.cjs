/**
 * Semantic Release Configuration
 * Automates versioning and changelog generation based on conventional commits
 *
 * Version bumps:
 * - fix: patch release (0.1.0 → 0.1.1)
 * - feat: minor release (0.1.0 → 0.2.0)
 * - BREAKING CHANGE: major release (0.1.0 → 1.0.0)
 * - perf: patch release (performance improvements)
 */

const presetConfig = {
  types: [
    { type: 'feat', section: 'Features' },
    { type: 'fix', section: 'Bug Fixes' },
    { type: 'perf', section: 'Performance' },
    { type: 'refactor', section: 'Refactoring' },
    { type: 'docs', section: 'Documentation' },
    { type: 'style', section: 'Styles' },
    { type: 'test', section: 'Tests' },
    { type: 'ci', section: 'CI/CD' },
    { type: 'chore', section: 'Chores' },
    { type: 'revert', section: 'Reverts' },
    { type: 'build', section: 'Build' },
  ],
};

const releaseRules = [
  { type: 'feat', release: 'minor' },
  { type: 'fix', release: 'patch' },
  { type: 'perf', release: 'patch' },
  { type: 'refactor', release: 'patch' },
  { type: 'docs', release: false },
  { type: 'style', release: false },
  { type: 'test', release: false },
  { type: 'ci', release: false },
  { type: 'chore', release: false },
  { type: 'revert', release: 'patch' },
  { type: 'build', release: false },
];

module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules,
      },
    ],

    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig,
      },
    ],

    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],

    // Bump root package.json version (no npm publish — handled by workflow)
    ['@semantic-release/npm', { npmPublish: false }],

    // Sincroniza a versão nos pacotes e regrava o bloco de contagens.
    //
    // As contagens carregam a versão do `@precisa-saude/fhir` no texto, e ela
    // só muda aqui. Sem regravar, o bloco commitado fica uma versão atrás e o
    // check `catalog` reprova o **próximo** PR, que não tem nada a ver com
    // isso. A ordem importa: o gerador lê a versão de `packages/core`, que o
    // `sync-versions` acabou de escrever.
    [
      '@semantic-release/exec',
      { prepareCmd: 'node scripts/sync-versions.js && pnpm catalog:counts' },
    ],

    [
      '@semantic-release/git',
      {
        assets: [
          'CHANGELOG.md',
          'package.json',
          'packages/*/package.json',
          'README.md',
          'site/src/data/catalog-counts.json',
        ],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],

    [
      '@semantic-release/github',
      {
        successCommentCondition: false,
        releasedLabels: false,
        failComment: false,
      },
    ],
  ],
};
