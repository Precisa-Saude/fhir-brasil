import { exitWithError, outputJson, outputText } from '../../cli-utils.js';
import { LOINC_SNAPSHOT } from '../../loinc-axes.js';
import { getMappingSheet, type MappingCandidate } from '../../mapping-sheet.js';

const PAPEL: Record<MappingCandidate['role'], string> = {
  chosen: 'escolhido',
  'method-variant': 'variante',
  rejected: 'rejeitado',
};

function linhaCandidato(c: MappingCandidate): string[] {
  const a = c.axes;
  const eixos = a
    ? [a.component, a.property, a.time, a.system, a.scale, a.method ?? '—'].join(' | ')
    : 'fora do snapshot';
  const linhas = [`  ${PAPEL[c.role].padEnd(10)} ${c.loinc.padEnd(9)} ${eixos}`];
  if (a) linhas.push(`  ${''.padEnd(20)} ${a.display}`);
  if (c.why) linhas.push(`  ${''.padEnd(20)} ${c.why}`);
  return linhas;
}

export async function decision(args: string[], json: boolean): Promise<void> {
  const alvo = args[0];
  if (!alvo) exitWithError('Uso: fhir-bio decision <código ou LOINC>');

  const ficha = getMappingSheet(alvo);
  if (!ficha) {
    exitWithError(
      `Biomarcador não encontrado: ${alvo}\nAceita o código interno (LDL) ou um LOINC do catálogo (2089-1). Veja os códigos em \`fhir-bio list\` ou \`fhir-bio loinc-map\`.`,
    );
  }

  if (json) {
    outputJson(ficha);
    return;
  }

  const d = ficha.decision;
  const grupos = Object.entries(ficha.groups).map(([lg, nome]) => `${lg} ${nome}`);
  const linhas = [
    `Biomarcador:  ${ficha.code}`,
    `Nome local:   ${ficha.localNames.join(', ')}`,
    `Unidade:      ${ficha.unit ?? '—'}`,
  ];
  if (ficha.noLoinc) {
    linhas.push(`Sem LOINC:    ${ficha.noLoinc.reason}`, `              ${ficha.noLoinc.note}`);
  } else {
    linhas.push(
      `Material:     ${ficha.specimen ?? '—'}`,
      `Método:       ${ficha.method ?? '— (o código não afirma método)'}`,
      'Candidatos:   papel      código    componente | propriedade | tempo | sistema | escala | método',
      ...ficha.candidates.flatMap(linhaCandidato),
      `Grupos:       ${grupos.length ? grupos.join('\n              ') : '—'}`,
      `Evidência:    ${d?.evidence.join(', ') ?? '—'}`,
      `Decidido por: ${d?.settledBy ?? '—'}`,
    );
    if (d?.note) linhas.push(`Nota:         ${d.note}`);
    linhas.push(
      `Revisor:      ${d?.reviewer ?? '— (sem revisão independente)'}`,
      `Revisado em:  ${d?.reviewedAt ?? '—'}`,
      `Versão LOINC: ${d?.loincVersion ?? `— (snapshot em ${LOINC_SNAPSHOT._loincVersion ?? '?'})`}`,
      '',
      LOINC_SNAPSHOT._notice,
    );
  }
  outputText(linhas.join('\n'));
}
