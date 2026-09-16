const base = require('@precisa-saude/commitlint-config');

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  ...base,
  rules: {
    ...base.rules,
    'scope-enum': [
      2,
      'always',
      ['core', 'ocr-utils', 'pdf', 'rnds', 'rnds-sandbox', 'docs', 'ci', 'deps', 'lint', 'config'],
    ],
  },
};
