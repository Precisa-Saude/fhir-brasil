import { describe, expect, it } from 'vitest';

import * as pkg from '../index.js';

describe('superfície pública', () => {
  it('exporta o extrator de texto', () => {
    expect(typeof pkg.extractPdfText).toBe('function');
  });
});
