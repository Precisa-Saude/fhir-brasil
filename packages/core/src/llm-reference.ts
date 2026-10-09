/**
 * O catálogo como texto para o modelo de extração, e os padrões de busca da
 * ancoragem.
 *
 * Saiu de `biomarkers.ts` quando o agrupamento passou a ser a seção de serviço
 * (v2-0074): `biomarkers.ts` fica só com dados e buscas, sem import em
 * runtime, e os scripts de manutenção seguem lendo o source direto com o type
 * stripping do Node.
 */
import { BIOMARKER_DEFINITIONS, type BiomarkerDefinition } from './biomarkers';
import {
  DIAGNOSTIC_SECTION_DISPLAY,
  type DiagnosticSection,
  diagnosticSectionOf,
} from './diagnostic-sections';

/**
 * Imprime o bloco de um biomarcador na referência entregue ao modelo de
 * extração. Compartilhado por generateLLMReference e
 * generateFilteredLLMReference, que antes duplicavam este trecho.
 *
 * Com LOINC, o bloco mantém três linhas (LOINC | Code, EN, PT). Sem LOINC,
 * tudo vai em uma linha só. Medido em produção (PRE-391): 20 observações de
 * 4 usuários gravadas com biomarkerName igual à linha "EN:" inteira, por
 * exemplo "Subscapular Skinfold, Subscapular". O modelo copiava a linha
 * como nome do analito, o code nunca resolvia e a medida se perdia. Só as
 * entradas sem LOINC eram afetadas, então só elas mudam de formato: sem uma
 * linha que comece com "EN:" ou "PT:", não há o que copiar por engano, e os
 * nomes continuam disponíveis para casar com o texto do PDF.
 */
function pushDefinitionReference(lines: string[], def: BiomarkerDefinition): void {
  const ptNames = def.names.pt.join(', ');
  const enNames = def.names.en.join(', ');
  if (def.loinc) {
    lines.push(`- LOINC: ${def.loinc} | Code: ${def.code}`);
    lines.push(`  EN: ${enNames}`);
    lines.push(`  PT: ${ptNames}`);
    return;
  }
  lines.push(`- Code: ${def.code} (no LOINC, use the Code) | EN: ${enNames} | PT: ${ptNames}`);
}

/**
 * Generate LLM reference prompt for biomarker extraction
 * This is included in the extraction prompt so the LLM can output LOINC codes directly
 */
/**
 * As definições agrupadas pela seção de serviço (v2-0074), com o nome da seção
 * em maiúsculas como cabeçalho: "[CHEMISTRY]", "[URINALYSIS]". Até out/2026 o
 * agrupamento era pela categoria clínica, que saiu do catálogo.
 */
function pushSectionGroups(lines: string[], definitions: readonly BiomarkerDefinition[]): void {
  const bySection = new Map<string, BiomarkerDefinition[]>();
  for (const def of definitions) {
    const section = diagnosticSectionOf(def.code);
    const header = section ? DIAGNOSTIC_SECTION_DISPLAY[section] : 'Other';
    bySection.set(header, [...(bySection.get(header) ?? []), def]);
  }
  for (const [header, defs] of bySection) {
    lines.push(`[${header.toUpperCase()}]`);
    for (const def of defs) {
      pushDefinitionReference(lines, def);
    }
    lines.push('');
  }
}

export function generateLLMReference(): string {
  const lines: string[] = [
    'SUPPORTED BIOMARKERS (output the LOINC code or internal Code for each matched biomarker):',
    '',
  ];

  pushSectionGroups(lines, BIOMARKER_DEFINITIONS);

  return lines.join('\n');
}

/**
 * Biomarker search pattern for OCR text anchoring
 */
export interface BiomarkerSearchPattern {
  code: string;
  loinc?: string;
  names: string[]; // All names (EN + PT) for this biomarker
  /** Seção de serviço (v2-0074); `URN` marca a urinálise. */
  section?: DiagnosticSection;
  unit?: string; // Absent for qualitative biomarkers (urine dipstick, etc.)
}

/**
 * Get all biomarker search patterns for OCR text anchoring
 * Returns a flat list of all biomarker codes with their searchable names
 *
 * `section` and `unit` are exposed so anchoring consumers can tell
 * quantitative biomarkers from qualitative ones (which need different
 * matching rules — a qualitative marker has no number next to it).
 */
export function getAllSearchPatterns(): BiomarkerSearchPattern[] {
  return BIOMARKER_DEFINITIONS.map((def) => {
    const section = diagnosticSectionOf(def.code);
    return {
      code: def.code,
      ...(def.loinc && { loinc: def.loinc }),
      names: [...def.names.en, ...def.names.pt],
      ...(section && { section }),
      ...(def.unit && { unit: def.unit }),
    };
  });
}

/**
 * Generate filtered LLM reference for specific biomarker codes
 * Only includes biomarkers that were found in the OCR text
 */
export function generateFilteredLLMReference(codes: string[]): string {
  const codeSet = new Set(codes);
  const filteredDefs = BIOMARKER_DEFINITIONS.filter((def) => codeSet.has(def.code));

  if (filteredDefs.length === 0) {
    return 'NO MATCHING BIOMARKERS FOUND IN TEXT - Return empty biomarkers array.';
  }

  const lines: string[] = [
    'ALLOWED BIOMARKERS (ONLY extract these - they were found in the document):',
    '',
  ];

  pushSectionGroups(lines, filteredDefs);

  return lines.join('\n');
}

/**
 * Códigos que identificam um documento de composição corporal.
 *
 * O nome diz DEXA por herança: quando a lista foi escrita, densitometria era a
 * única fonte desse tipo de laudo. Hoje ela decide o caminho para
 * bioimpedância e adipometria também, e a lista tinha ficado para trás.
 *
 * Medido em produção: um laudo de adipometria com sete dobras cutâneas,
 * circunferência de cintura e IMC não casava nenhum indicador e caía no
 * caminho genérico, perdendo a referência filtrada e a extração de tendência.
 * As dobras e as circunferências não aparecem em DEXA, então só elas
 * identificam esse aparelho.
 *
 * Massa muscular e os compartimentos de água entram pela mesma razão: são o
 * que a bioimpedância imprime e o DEXA não.
 */
export const DEXA_INDICATOR_CODES = [
  // Densitometria e composição corporal clássica
  'BodyFatPct',
  'FatMass',
  'LeanMass',
  'BMC',
  'FatFreeMass',
  'TotalMass',
  // Bioimpedância
  'MuscleMass',
  'TotalBodyWater',
  'BodyWaterPct',
  'PhaseAngle',
  'ExtracellularWater',
  'IntracellularWater',
  // Adipometria: sete sítios, e nenhum aparece em laudo de DEXA
  'SkinfoldTriceps',
  'SkinfoldSubscapular',
  'SkinfoldSuprailiac',
  'SkinfoldAbdominal',
  'SkinfoldThigh',
  'SkinfoldChest',
  'SkinfoldMidaxillary',
  // Antropometria
  'WaistCircumference',
  'CalfCircumference',
] as const;

/**
 * Seções dos exames da densitometria e da composição corporal: `RAD` é o que só
 * o DXA produz, `OTH` é medida corporal (bioimpedância, antropometria).
 */
const BODY_COMPOSITION_SECTIONS: ReadonlySet<DiagnosticSection> = new Set(['OTH', 'RAD']);

/**
 * Generate full DEXA/body composition reference for LLM extraction
 * This includes ALL body composition biomarkers (regional metrics, VAT, bone density)
 * that may not be detected by OCR anchoring due to table layouts
 *
 * Use this when DEXA indicator biomarkers (BodyFatPct, FatMass, LeanMass, etc.)
 * are detected in the document
 */
export function generateDexaFullReference(): string {
  const dexaCodes = BIOMARKER_DEFINITIONS.filter((def) => {
    const section = diagnosticSectionOf(def.code);
    return section !== undefined && BODY_COMPOSITION_SECTIONS.has(section);
  }).map((def) => def.code);

  return generateFilteredLLMReference(dexaCodes);
}

/**
 * Check if a list of biomarker codes indicates a DEXA/body composition document
 */
export function isDexaDocument(matchedCodes: string[]): boolean {
  return DEXA_INDICATOR_CODES.some((code) => matchedCodes.includes(code));
}

/**
 * CAC (Coronary Artery Calcium) indicator biomarker codes
 * When these are found in OCR text, the document is likely a CAC scoring report
 */
export const CAC_INDICATOR_CODES = [
  'CAC',
  'CAC_LAD',
  'CAC_LCX',
  'CAC_RCA',
  'CAC_Percentile',
] as const;

/**
 * Generate full CAC reference for LLM extraction
 * This includes all CAC-related biomarkers (total score, per-vessel, percentile, aortic valve)
 */
export function generateCacFullReference(): string {
  const cacCodes = BIOMARKER_DEFINITIONS.filter((def) => {
    return def.code === 'CAC' || def.code.startsWith('CAC_') || def.code === 'AorticValveCalcium';
  }).map((def) => def.code);

  return generateFilteredLLMReference(cacCodes);
}

/**
 * Check if a list of biomarker codes indicates a CAC scoring document
 */
export function isCacDocument(matchedCodes: string[]): boolean {
  return CAC_INDICATOR_CODES.some((code) => matchedCodes.includes(code));
}
