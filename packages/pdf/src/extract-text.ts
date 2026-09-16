/**
 * Camada de texto de um PDF de laudo.
 *
 * Isto **não é OCR**. A maior parte dos laudos que os laboratórios brasileiros
 * entregam já vem com camada de texto, e ler essa camada é determinístico,
 * offline e barato. Laudo digitalizado não tem camada nenhuma: aqui ele volta
 * vazio, e o consumidor decide se quer rodar um OCR por fora. Devolver string
 * vazia é melhor do que devolver lixo de reconhecimento que a ancoragem depois
 * trataria como se fosse texto de verdade.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface PdfPage {
  pageNumber: number;
  text: string;
}

export interface PdfText {
  pages: PdfPage[];
  /** As páginas com conteúdo, emendadas na ordem, separadas por linha em branco. */
  text: string;
}

/** Junta os fragmentos de uma página preservando as quebras que o PDF marca. */
function joinItems(items: { hasEOL?: boolean; str?: string }[]): string {
  let out = '';
  for (const item of items) {
    out += item.str ?? '';
    if (item.hasEOL) out += '\n';
  }
  return out;
}

/**
 * Lê a camada de texto de um PDF em memória.
 *
 * `useSystemFonts` fica desligado porque o texto não depende de fonte para ser
 * extraído, e ligá-lo faz o pdf.js procurar fontes no sistema, o que muda o
 * resultado conforme a máquina.
 *
 * `isEvalSupported: false` desliga a avaliação de JavaScript embutido no PDF.
 * Laudo é documento de terceiro, então o parser não tem por que executar código
 * que veio junto, e desligar também tira uma fonte de variação entre máquinas.
 *
 * `verbosity: 0` não é cosmético. O pdf.js escreve aviso em `console.warn`, que
 * no Node cai no mesmo lugar que o resto, e laudo que usa fonte padrão não
 * embutida gera um aviso por página. Sem isto, os avisos entram no texto
 * extraído e a ancoragem passa a varrer mensagem de biblioteca junto com o
 * laudo. Apareceu num relatório real de 68 páginas, não no PDF de exemplo.
 */
export async function extractPdfText(data: Uint8Array): Promise<PdfText> {
  const doc = await getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;

  try {
    const pages: PdfPage[] = [];
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items = content.items as { hasEOL?: boolean; str?: string }[];
      pages.push({ pageNumber: n, text: joinItems(items).trim() });
    }

    return {
      pages,
      text: pages
        .map((p) => p.text)
        .filter(Boolean)
        .join('\n\n'),
    };
  } finally {
    await doc.destroy();
  }
}
