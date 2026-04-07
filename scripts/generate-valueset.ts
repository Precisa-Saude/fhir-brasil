/**
 * Gera o ValueSet BRLabTestVS a partir dos biomarcadores do core.
 *
 * Uso: npx tsx scripts/generate-valueset.ts
 *
 * Lê BIOMARKER_DEFINITIONS, filtra biomarcadores com LOINC,
 * e gera ig/input/fsh/valuesets/BRLabTestVS.fsh com todos os códigos.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { BIOMARKER_DEFINITIONS } from '../packages/core/src/biomarkers';

const biomarkersWithLoinc = BIOMARKER_DEFINITIONS.filter((b) => b.loinc).sort((a, b) => {
  const catA = Array.isArray(a.category) ? a.category[0]! : a.category;
  const catB = Array.isArray(b.category) ? b.category[0]! : b.category;
  if (catA !== catB) return catA.localeCompare(catB);
  return a.code.localeCompare(b.code);
});

const lines: string[] = [
  'ValueSet: BRLabTestVS',
  'Id: br-lab-test-vs',
  'Title: "BR Lab Test ValueSet"',
  `Description: "Códigos LOINC para exames laboratoriais suportados pelo fhir-brasil. Gerado automaticamente a partir de ${biomarkersWithLoinc.length} biomarcadores com código LOINC no pacote core."`,
  '',
];

let currentCategory = '';
for (const b of biomarkersWithLoinc) {
  const cat = Array.isArray(b.category) ? b.category[0]! : b.category;
  if (cat !== currentCategory) {
    currentCategory = cat;
    lines.push(`// ${cat}`);
  }
  const displayName = b.names.pt[0] ?? b.names.en[0] ?? b.code;
  lines.push(`* $LOINC#${b.loinc} "${displayName}"`);
}
lines.push('');

const outputPath = resolve(
  import.meta.dirname,
  '..',
  'ig',
  'input',
  'fsh',
  'valuesets',
  'BRLabTestVS.fsh',
);
writeFileSync(outputPath, lines.join('\n'), 'utf-8');

// eslint-disable-next-line no-console
console.log(
  `Gerado BRLabTestVS.fsh com ${biomarkersWithLoinc.length} códigos LOINC em ${outputPath}`,
);
