/**
 * Exemplo: Faixas de Referência
 *
 * Demonstra como consultar faixas de referência de biomarcadores,
 * personalizar por sexo/idade e verificar se um valor está na faixa.
 *
 * Para executar:
 *   npx tsx examples/reference-ranges-example.ts
 */

import {
  getReferenceRange,
  getRangeDirection,
  getFallbackReferenceRange,
  getDefinitionByCode,
  getDefinitionByLoinc,
  normalizeCode,
  codeToLoinc,
  getAllCodes,
  type BiomarkerReferenceRange,
  type ReferenceRangeContext,
} from '@precisa-saude/fhir';

// =============================================================================
// 1. Consultar faixa de referência padrão
// =============================================================================

console.log('=== Faixas de referência padrão ===\n');

const biomarcadores = ['Glucose', 'HDL', 'LDL', 'CRP', 'TSH', 'Creatinine'];

for (const codigo of biomarcadores) {
  const faixa = getReferenceRange(codigo);
  const def = getDefinitionByCode(codigo);

  if (faixa && def) {
    console.log(`${def.names.pt[0]} (${codigo}):`);
    console.log(`  Faixa normal: ${faixa.min ?? '—'} – ${faixa.max ?? '—'} ${faixa.unit}`);
    if (faixa.optimalMin !== undefined && faixa.optimalMax !== undefined) {
      console.log(`  Faixa ótima:  ${faixa.optimalMin} – ${faixa.optimalMax} ${faixa.unit}`);
    }
    console.log(`  LOINC: ${def.loinc}`);
    console.log();
  }
}

// =============================================================================
// 2. Faixas personalizadas por sexo e idade
// =============================================================================

console.log('=== Faixas personalizadas por contexto ===\n');

// Testosterona varia significativamente entre sexos
const contextosTestosterona: Array<{ desc: string; ctx: ReferenceRangeContext }> = [
  { desc: 'Homem, 35 anos', ctx: { biologicalSex: 'M', age: 35 } },
  { desc: 'Mulher, 35 anos', ctx: { biologicalSex: 'F', age: 35 } },
  { desc: 'Sem contexto (padrão)', ctx: {} },
];

for (const { desc, ctx } of contextosTestosterona) {
  const faixa = getReferenceRange('Testosterone', ctx);
  if (faixa) {
    console.log(`Testosterona — ${desc}:`);
    console.log(`  ${faixa.min ?? '—'} – ${faixa.max ?? '—'} ${faixa.unit}`);
    console.log();
  }
}

// =============================================================================
// 3. Verificar se um valor está na faixa
// =============================================================================

console.log('=== Verificação de valores ===\n');

/**
 * Verifica se um valor está dentro da faixa de referência,
 * levando em conta a direção (range, higher-better, lower-better).
 */
function verificarValor(
  codigo: string,
  valor: number,
  contexto?: ReferenceRangeContext,
): { status: string; mensagem: string } {
  const faixa = getReferenceRange(codigo, contexto);
  if (!faixa) {
    return { status: 'desconhecido', mensagem: 'Faixa de referência não encontrada' };
  }

  const direcao = getRangeDirection(codigo);

  // Verificar se está acima do máximo
  if (faixa.max !== undefined && valor > faixa.max) {
    if (direcao === 'higher-better') {
      return { status: 'normal', mensagem: `${valor} > ${faixa.max} (acima é benéfico)` };
    }
    return { status: 'alto', mensagem: `${valor} > ${faixa.max} ${faixa.unit}` };
  }

  // Verificar se está abaixo do mínimo
  if (faixa.min !== undefined && valor < faixa.min) {
    if (direcao === 'lower-better') {
      return { status: 'normal', mensagem: `${valor} < ${faixa.min} (abaixo é benéfico)` };
    }
    return { status: 'baixo', mensagem: `${valor} < ${faixa.min} ${faixa.unit}` };
  }

  // Verificar faixa ótima
  if (faixa.optimalMin !== undefined && faixa.optimalMax !== undefined) {
    if (valor >= faixa.optimalMin && valor <= faixa.optimalMax) {
      return { status: 'ótimo', mensagem: `${valor} na faixa ótima` };
    }
    return { status: 'normal', mensagem: `${valor} na faixa normal (fora da ótima)` };
  }

  return { status: 'normal', mensagem: `${valor} na faixa normal` };
}

// Cenários de exemplo
const cenarios = [
  { codigo: 'Glucose', valor: 85, desc: 'Glicose normal' },
  { codigo: 'Glucose', valor: 110, desc: 'Glicose elevada' },
  { codigo: 'Glucose', valor: 60, desc: 'Glicose baixa' },
  { codigo: 'HDL', valor: 70, desc: 'HDL acima da faixa (benéfico)' },
  { codigo: 'LDL', valor: 85, desc: 'LDL abaixo da faixa (benéfico)' },
  { codigo: 'CRP', valor: 0.3, desc: 'PCR baixo (benéfico)' },
  { codigo: 'CRP', valor: 8.5, desc: 'PCR elevado' },
];

for (const { codigo, valor, desc } of cenarios) {
  const resultado = verificarValor(codigo, valor);
  const def = getDefinitionByCode(codigo);
  console.log(`${def?.names.pt[0]} = ${valor}: [${resultado.status}] ${resultado.mensagem}`);
}

// =============================================================================
// 4. Normalização de códigos (aliases)
// =============================================================================

console.log('\n=== Normalização de códigos ===\n');

const aliases = ['HDL', 'Glicose', 'PCR', 'VitD'];

for (const alias of aliases) {
  const canonico = normalizeCode(alias);
  const loinc = codeToLoinc(canonico);
  console.log(`"${alias}" → código: "${canonico}", LOINC: ${loinc ?? 'N/A'}`);
}

// =============================================================================
// 5. Busca por LOINC
// =============================================================================

console.log('\n=== Busca por código LOINC ===\n');

const loincCodes = ['2085-9', '2089-1', '4548-4', '2160-0'];

for (const loinc of loincCodes) {
  const def = getDefinitionByLoinc(loinc);
  if (def) {
    console.log(`LOINC ${loinc}: ${def.names.pt[0]} (${def.code})`);
  } else {
    console.log(`LOINC ${loinc}: não encontrado`);
  }
}

// =============================================================================
// 6. Estatísticas do catálogo
// =============================================================================

console.log('\n=== Estatísticas do catálogo ===\n');

const todosOsCodigos = getAllCodes();
console.log(`Total de biomarcadores definidos: ${todosOsCodigos.length}`);

// Contar biomarcadores com faixa de referência
let comFaixa = 0;
for (const codigo of todosOsCodigos) {
  if (getReferenceRange(codigo)) {
    comFaixa++;
  }
}
console.log(`Com faixa de referência: ${comFaixa}`);
console.log(`Sem faixa de referência: ${todosOsCodigos.length - comFaixa}`);
