/**
 * Exemplo: Calculadoras Clínicas
 *
 * Demonstra o uso das três calculadoras disponíveis:
 * - PhenoAge (idade biológica)
 * - BrDMrisc (risco de diabetes tipo 2)
 * - Biomarcadores derivados (HOMA-IR, VLDL, IMC)
 *
 * Para executar:
 *   npx tsx examples/calculators-example.ts
 */

import { brdmrisc, computeDerivedBiomarkers, phenoage } from '@precisa-saude/fhir-calculators';

// =============================================================================
// 1. PhenoAge — Idade biológica
// =============================================================================

console.log('=== PhenoAge — Idade Biológica ===\n');

// Cenário: paciente de 45 anos com exames de rotina
// Valores já em unidades SI (como esperado pelo algoritmo)
const resultadoPhenoAge = phenoage.calculatePhenoAge({
  albumin: 42, // g/L
  alkalinePhosphatase: 65, // U/L
  chronologicalAge: 45, // anos
  creatinine: 80, // μmol/L
  crp: 1.5, // mg/L
  glucose: 5.2, // mmol/L
  lymphocytePercent: 30, // %
  mcv: 88, // fL
  rdw: 12.5, // %
  wbc: 6.2, // 10^9/L
});

console.log(`Idade cronológica: ${resultadoPhenoAge.chronologicalAge} anos`);
console.log(`Idade biológica (PhenoAge): ${resultadoPhenoAge.phenoAge} anos`);
console.log(
  `Diferença: ${resultadoPhenoAge.ageDifference > 0 ? '+' : ''}${resultadoPhenoAge.ageDifference} anos`,
);
console.log(`Escore de mortalidade: ${resultadoPhenoAge.mortalityScore}`);
console.log(`Preditor linear: ${resultadoPhenoAge.linearPredictor}`);

if (resultadoPhenoAge.ageDifference < 0) {
  console.log('→ Envelhecimento mais lento que a média');
} else if (resultadoPhenoAge.ageDifference > 0) {
  console.log('→ Envelhecimento mais acelerado que a média');
} else {
  console.log('→ Envelhecimento na média');
}

console.log('\nContribuição de cada biomarcador:');
for (const item of resultadoPhenoAge.breakdown) {
  const sinal = item.contribution >= 0 ? '+' : '';
  console.log(
    `  ${item.name.padEnd(20)} ${item.valueWithUnit.padEnd(15)} ${sinal}${item.contribution.toFixed(4)}`,
  );
}

// =============================================================================
// 2. PhenoAge — Conversão automática de unidades brasileiras
// =============================================================================

console.log('\n=== PhenoAge — Conversão de unidades ===\n');

// Laboratórios brasileiros tipicamente reportam nestas unidades:
const conversoes = [
  { biomarcador: 'albumin', desc: 'Albumina', unidade: 'g/dL', valor: 4.2 },
  { biomarcador: 'creatinine', desc: 'Creatinina', unidade: 'mg/dL', valor: 0.9 },
  { biomarcador: 'glucose', desc: 'Glicose', unidade: 'mg/dL', valor: 92 },
  { biomarcador: 'crp', desc: 'PCR', unidade: 'mg/dL', valor: 0.15 },
  { biomarcador: 'wbc', desc: 'Leucócitos', unidade: '/μL', valor: 6200 },
];

for (const { biomarcador, desc, unidade, valor } of conversoes) {
  const convertido = phenoage.autoConvertToSI(biomarcador, valor, unidade);
  console.log(
    `${desc}: ${valor} ${unidade} → ${convertido.value.toFixed(2)} ${convertido.unit}${
      convertido.wasConverted ? ' (convertido)' : ' (sem conversão)'
    }`,
  );
}

// Construir input PhenoAge a partir de valores em unidades brasileiras
console.log('\nCálculo completo a partir de unidades convencionais:');

const inputConvertido = {
  albumin: phenoage.autoConvertToSI('albumin', 4.2, 'g/dL').value,
  alkalinePhosphatase: 65,
  chronologicalAge: 45,
  creatinine: phenoage.autoConvertToSI('creatinine', 0.9, 'mg/dL').value,
  crp: phenoage.autoConvertToSI('crp', 1.5, 'mg/L').value,
  glucose: phenoage.autoConvertToSI('glucose', 92, 'mg/dL').value,
  lymphocytePercent: 30,
  mcv: 88,
  rdw: 12.5,
  wbc: phenoage.autoConvertToSI('wbc', 6200, '/μL').value,
};

const resultadoConvertido = phenoage.calculatePhenoAge(inputConvertido);
console.log(
  `PhenoAge: ${resultadoConvertido.phenoAge} anos (diferença: ${resultadoConvertido.ageDifference > 0 ? '+' : ''}${resultadoConvertido.ageDifference})`,
);

// =============================================================================
// 3. PhenoAge — Validação de biomarcadores
// =============================================================================

console.log('\n=== PhenoAge — Validação ===\n');

// Valores válidos
const validacaoOk = phenoage.validateBiomarkers({
  albumin: 42,
  alkalinePhosphatase: 65,
  chronologicalAge: 45,
  creatinine: 80,
  crp: 1.5,
  glucose: 5.2,
  lymphocytePercent: 30,
  mcv: 88,
  rdw: 12.5,
  wbc: 6.2,
});
console.log(`Válido: ${validacaoOk.isValid}`);
console.log(`Erros: ${validacaoOk.errors.length === 0 ? 'nenhum' : validacaoOk.errors.join(', ')}`);

// Valores com problemas
const validacaoErro = phenoage.validateBiomarkers({
  albumin: 2, // Muito baixo para g/L
  alkalinePhosphatase: 65,
  chronologicalAge: 45,
  creatinine: 80,
  crp: -1, // Negativo (inválido)
  glucose: 50, // Muito alto para mmol/L (provavelmente em mg/dL)
  lymphocytePercent: 30,
  mcv: 88,
  rdw: 12.5,
  wbc: 6.2,
});
console.log(`\nVálido: ${validacaoErro.isValid}`);
for (const erro of validacaoErro.errors) {
  console.log(`  ⚠ ${erro}`);
}

// =============================================================================
// 4. BrDMrisc — Risco de diabetes tipo 2
// =============================================================================

console.log('\n=== BrDMrisc — Risco de Diabetes Tipo 2 ===\n');

// Cenário 1: Todos os 4 biomarcadores disponíveis (modelo 6, AUC 0.813)
const risco1 = brdmrisc.calculateBrDMrisc({
  fpg: 102, // Glicemia de jejum (mg/dL)
  hba1c: 5.8, // Hemoglobina glicada (%)
  hdlc: 42, // HDL-colesterol (mg/dL)
  triglycerides: 180, // Triglicerídeos (mg/dL)
});

console.log('Cenário 1 — Todos os biomarcadores:');
console.log(`  Modelo utilizado: ${risco1.modelUsed.namePt} (AUC: ${risco1.modelUsed.auc})`);
console.log(`  Risco em 10 anos: ${risco1.riskPercent}%`);
console.log(`  Categoria: ${risco1.riskCategory}`);

console.log('  Contribuição de cada biomarcador:');
for (const item of risco1.breakdown) {
  const sinal = item.contribution >= 0 ? '+' : '';
  console.log(
    `    ${item.name.padEnd(25)} ${item.valueWithUnit.padEnd(12)} ${sinal}${item.contribution.toFixed(4)}`,
  );
}

// Cenário 2: Apenas glicemia disponível (modelo 1)
console.log('\nCenário 2 — Apenas glicemia:');
const risco2 = brdmrisc.calculateBrDMrisc({ fpg: 95 });
console.log(`  Modelo: ${risco2.modelUsed.namePt} (AUC: ${risco2.modelUsed.auc})`);
console.log(`  Risco: ${risco2.riskPercent}%`);
console.log(`  Categoria: ${risco2.riskCategory}`);

// Cenário 3: Glicemia + HbA1c (modelo 3)
console.log('\nCenário 3 — Glicemia + HbA1c:');
const risco3 = brdmrisc.calculateBrDMrisc({ fpg: 95, hba1c: 5.4 });
console.log(`  Modelo: ${risco3.modelUsed.namePt} (AUC: ${risco3.modelUsed.auc})`);
console.log(`  Risco: ${risco3.riskPercent}%`);
console.log(`  Categoria: ${risco3.riskCategory}`);

// =============================================================================
// 5. BrDMrisc — Seleção automática de modelo
// =============================================================================

console.log('\n=== BrDMrisc — Seleção de modelo ===\n');

const cenariosSeleção = [
  { desc: 'Apenas FPG', input: { fpg: 100 } },
  { desc: 'Apenas HbA1c', input: { hba1c: 5.5 } },
  { desc: 'FPG + HbA1c', input: { fpg: 100, hba1c: 5.5 } },
  { desc: 'FPG + Triglicerídeos', input: { fpg: 100, triglycerides: 150 } },
  { desc: 'FPG + Lipídios', input: { fpg: 100, hdlc: 50, triglycerides: 150 } },
  { desc: 'Todos', input: { fpg: 100, hba1c: 5.5, hdlc: 50, triglycerides: 150 } },
];

for (const { desc, input } of cenariosSeleção) {
  const modelo = brdmrisc.selectModel(input);
  if (modelo) {
    console.log(`${desc.padEnd(25)} → Modelo ${modelo.id}: ${modelo.namePt} (AUC: ${modelo.auc})`);
  } else {
    console.log(`${desc.padEnd(25)} → Nenhum modelo disponível`);
  }
}

// =============================================================================
// 6. BrDMrisc — Conversão automática de unidades
// =============================================================================

console.log('\n=== BrDMrisc — Conversão de unidades ===\n');

// Glicose em mmol/L → mg/dL
const fpg = brdmrisc.autoConvertToTarget('fpg', 5.5, 'mmol/L');
console.log(
  `Glicose: 5.5 mmol/L → ${fpg.value.toFixed(1)} ${fpg.unit} (convertido: ${fpg.wasConverted})`,
);

// HbA1c em mmol/mol (IFCC) → % (NGSP)
const hba1c = brdmrisc.autoConvertToTarget('hba1c', 42, 'mmol/mol');
console.log(
  `HbA1c: 42 mmol/mol → ${hba1c.value.toFixed(2)} ${hba1c.unit} (convertido: ${hba1c.wasConverted})`,
);

// Triglicerídeos em mmol/L → mg/dL
const tg = brdmrisc.autoConvertToTarget('triglycerides', 2.0, 'mmol/L');
console.log(
  `Triglicerídeos: 2.0 mmol/L → ${tg.value.toFixed(1)} ${tg.unit} (convertido: ${tg.wasConverted})`,
);

// HDL em mmol/L → mg/dL
const hdl = brdmrisc.autoConvertToTarget('hdlc', 1.3, 'mmol/L');
console.log(
  `HDL: 1.3 mmol/L → ${hdl.value.toFixed(1)} ${hdl.unit} (convertido: ${hdl.wasConverted})`,
);

// =============================================================================
// 7. Biomarcadores derivados
// =============================================================================

console.log('\n=== Biomarcadores Derivados ===\n');

// Cenário 1: HOMA-IR e VLDL
console.log('Cenário 1 — HOMA-IR e VLDL:');
const extraidos1 = [
  { code: 'Glucose', unit: 'mg/dL', value: 92 as number | string },
  { code: 'Insulin', unit: 'μUI/mL', value: 8.5 as number | string },
  { code: 'Triglycerides', unit: 'mg/dL', value: 150 as number | string },
];

const derivados1 = computeDerivedBiomarkers(extraidos1);
for (const d of derivados1) {
  console.log(`  ${d.code}: ${d.value.toFixed(2)} ${d.unit}`);
}

// Cenário 2: IMC com contexto do usuário
console.log('\nCenário 2 — IMC (requer altura do usuário):');
const extraidos2 = [{ code: 'TotalMass', unit: 'kg', value: 72 as number | string }];

const derivados2 = computeDerivedBiomarkers(extraidos2, {
  userContext: { heightCm: 170 },
});
for (const d of derivados2) {
  console.log(`  ${d.code}: ${d.value.toFixed(1)} ${d.unit}`);
}

// Cenário 3: Biomarcador já existente não é recalculado
console.log('\nCenário 3 — VLDL já presente (não recalcula):');
const extraidos3 = [
  { code: 'Triglycerides', unit: 'mg/dL', value: 150 as number | string },
  { code: 'VLDL', unit: 'mg/dL', value: 28 as number | string }, // Já existe no laudo
];

const derivados3 = computeDerivedBiomarkers(extraidos3);
console.log(`  Derivados calculados: ${derivados3.length}`);
console.log(`  (VLDL já existe no laudo, portanto não foi recalculado)`);

// Cenário 4: Biomarcadores insuficientes para HOMA-IR
console.log('\nCenário 4 — Glicose sem Insulina (HOMA-IR não calculado):');
const extraidos4 = [
  { code: 'Glucose', unit: 'mg/dL', value: 92 as number | string },
  // Insulina ausente — HOMA-IR não pode ser calculado
];

const derivados4 = computeDerivedBiomarkers(extraidos4);
console.log(`  Derivados calculados: ${derivados4.length}`);
if (derivados4.length === 0) {
  console.log(`  (Insulina ausente — HOMA-IR requer Glicose + Insulina)`);
}
