import { parseArgs } from 'node:util';

import { getDefinitionByCode } from '../../biomarkers.js';
import { exitWithError, outputJson, outputText } from '../../cli-utils.js';
import { biomarkerRangeDefinitions } from '../../reference-ranges.js';
import { extractSourceKey, SOURCE_REGISTRY, type SourceReference } from '../../sources.js';

/**
 * Resolve a chave que o `range` imprime no campo `source`.
 *
 * Sem este comando a chave era um beco: o `fhir-bio range TSH --json` devolvia
 * `"source": "sbem-thyroid-2013"` e a citação correspondente só existia no
 * `sources.ts`, que nem era exportado. Afirmar que toda faixa carrega citação e
 * não dar como chegar nela é afirmação que o consumidor não consegue conferir.
 */
function render(ref: SourceReference): string {
  const linhas = [`Fonte: ${ref.key}`, '', ref.abnt];
  if (ref.doi) linhas.push('', `DOI:  ${ref.doi}`);
  if (ref.isbn) linhas.push(`ISBN: ${ref.isbn}`);
  if (ref.url) linhas.push(`URL:  ${ref.url}`);
  return linhas.join('\n');
}

export async function source(args: string[], json: boolean): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: { biomarker: { short: 'b', type: 'string' } },
    strict: false,
  });

  // `--biomarker` poupa o passo intermediário: quem tem o código do exame não
  // precisa rodar o `range` só para descobrir a chave e then vir aqui.
  if (values.biomarker) {
    const code = values.biomarker as string;
    if (!getDefinitionByCode(code)) exitWithError(`Biomarcador não encontrado: ${code}`);
    const def = biomarkerRangeDefinitions[code];
    if (!def?.source) exitWithError(`Sem faixa de referência com fonte para: ${code}`);
    const chave = extractSourceKey(def.source);
    const ref = SOURCE_REGISTRY[chave];
    if (!ref) exitWithError(`Fonte não encontrada no registro: ${chave}`);
    if (json) outputJson(ref);
    else outputText(render(ref));
    return;
  }

  const chave = positionals[0];

  if (!chave) {
    const todas = Object.values(SOURCE_REGISTRY).sort((a, b) => a.key.localeCompare(b.key));
    if (json) {
      outputJson(todas);
      return;
    }
    outputText(
      [
        `Fontes no registro: ${todas.length}`,
        '',
        ...todas.map((r) => `  ${r.key.padEnd(28)} ${r.abnt.slice(0, 60)}…`),
        '',
        'Detalhe de uma: fhir-bio source <chave>',
        'A partir do exame:  fhir-bio source --biomarker TSH',
      ].join('\n'),
    );
    return;
  }

  // Aceita tanto a chave limpa quanto o valor cru do campo `source`, que pode
  // trazer localizador de página (`sbc-lipids-2017:p15`).
  const ref = SOURCE_REGISTRY[extractSourceKey(chave)];
  if (!ref) exitWithError(`Fonte não encontrada: ${chave}`);

  if (json) outputJson(ref);
  else outputText(render(ref));
}
