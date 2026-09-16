import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { extractPdfText } from '../extract-text.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Laudo sintético de uma página, sem dado de pessoa real. */
const fixture = async (): Promise<Uint8Array> =>
  new Uint8Array(await readFile(join(HERE, 'fixtures', 'laudo.pdf')));

describe('extractPdfText', () => {
  it('lê a camada de texto de um laudo de uma página', async () => {
    const result = await extractPdfText(await fixture());
    expect(result.pages).toHaveLength(1);
    expect(result.text).toContain('Hemoglobina');
    expect(result.text).toContain('14,5 g/dL');
  });

  it('preserva as quebras de linha que o PDF marca', async () => {
    const { text } = await extractPdfText(await fixture());
    const linhas = text.split('\n').filter(Boolean);
    expect(linhas[0]).toContain('HEMOGRAMA COMPLETO');
    expect(linhas.length).toBeGreaterThan(5);
  });

  it('devolve o texto que a ancoragem espera receber', async () => {
    const { text } = await extractPdfText(await fixture());
    // O acordo entre os dois pacotes é só isto: texto cru, uma linha por
    // resultado. Se a extração passar a emendar linhas, a ancoragem para de
    // achar nome seguido de valor e o teste cai aqui, não em produção.
    expect(text).toMatch(/Glicose\s*\.*\s*99 mg\/dL/);
  });

  it('numera as páginas a partir de 1', async () => {
    const { pages } = await extractPdfText(await fixture());
    expect(pages[0]?.pageNumber).toBe(1);
  });

  it('rejeita conteúdo que não é PDF', async () => {
    await expect(extractPdfText(new TextEncoder().encode('não sou um PDF'))).rejects.toThrow();
  });
});
