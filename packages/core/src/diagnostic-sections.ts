/**
 * Seção de serviço diagnóstico (HL7 v2, tabela 0074) de cada exame do catálogo,
 * a que vai em `DiagnosticReport.category`.
 *
 * Substitui o campo `category` das definições, que agrupava exame por sistema
 * do corpo (coração, fígado). Esse agrupamento é decisão de produto de quem usa
 * o pacote, e não de uma biblioteca de terminologia. A seção de serviço é o
 * agrupamento que o padrão já tem: o US Core pede `LAB` no laudo de
 * laboratório, e as seções (`CH`, `HM`, `URN`…) dizem de que bancada o resultado
 * saiu.
 *
 * Exame com LOINC tira a seção da classe do código (`CLASS` no snapshot do
 * fhir.loinc.org), pela tabela abaixo. Exame sem LOINC declara a seção na
 * definição (`section`). Os códigos são os publicados em
 * https://terminology.hl7.org/CodeSystem-v2-0074.html (v2-0074 3.0.0,
 * conferido em 09/10/2026).
 */
import { BIOMARKER_DEFINITIONS } from './biomarkers';
import { LOINC_SNAPSHOT } from './loinc-snapshot.generated';

export const V2_0074_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v2-0074';

/** As seções da v2-0074 que o catálogo usa. */
export type DiagnosticSection =
  | 'BLB'
  | 'CH'
  | 'CT'
  | 'GE'
  | 'HM'
  | 'IMM'
  | 'LAB'
  | 'MB'
  | 'OTH'
  | 'RAD'
  | 'SR'
  | 'TX'
  | 'URN';

/** O display de cada código, como a tabela publica. */
export const DIAGNOSTIC_SECTION_DISPLAY: Readonly<Record<DiagnosticSection, string>> = {
  BLB: 'Blood Bank',
  CH: 'Chemistry',
  CT: 'CAT Scan',
  GE: 'Genetics',
  HM: 'Hematology',
  IMM: 'Immunology',
  LAB: 'Laboratory',
  MB: 'Microbiology',
  OTH: 'Other',
  RAD: 'Radiology',
  SR: 'Serology',
  TX: 'Toxicology',
  URN: 'Urinalysis',
};

/** Seções de bancada de laboratório: o laudo que as tem leva `LAB` também. */
export const LABORATORY_SECTIONS: ReadonlySet<DiagnosticSection> = new Set([
  'BLB',
  'CH',
  'GE',
  'HM',
  'IMM',
  'LAB',
  'MB',
  'SR',
  'TX',
  'URN',
]);

/**
 * Classe do LOINC → seção. A v2-0074 não tem seção de coagulação, e a
 * coagulação fica na hematologia, como nos laboratórios. Zinco e selênio estão
 * em `DRUG/TOX` porque é ali que o LOINC os classifica.
 */
const SECTION_BY_LOINC_CLASS: Readonly<Record<string, DiagnosticSection>> = {
  ALLERGY: 'IMM',
  BLDBK: 'BLB',
  'CHAL.ROUTINE': 'CH',
  CHEM: 'CH',
  COAG: 'HM',
  'DRUG/TOX': 'TX',
  'HEM/BC': 'HM',
  MICRO: 'MB',
  'MOLPATH.MUT': 'GE',
  SERO: 'SR',
  UA: 'URN',
};

/**
 * Classes clínicas do LOINC (medida do corpo, não exame de bancada): peso,
 * dobra cutânea, circunferência, bioimpedância.
 */
const CLINICAL_CLASS = /^(BDYWGT|BDYCRC|SKNFLD|NUTRITION&DIETETICS)/;

/** A seção de uma classe do LOINC, ou nada quando a tabela não conhece a classe. */
export function sectionOfLoincClass(
  loincClass: string,
  system: string | null,
): DiagnosticSection | undefined {
  const mapped = SECTION_BY_LOINC_CLASS[loincClass];
  if (mapped) return mapped;
  // `SPEC` é característica da amostra: cor e aspecto da urina saem na urinálise.
  if (loincClass === 'SPEC') return system?.startsWith('Urine') ? 'URN' : 'LAB';
  if (CLINICAL_CLASS.test(loincClass)) return 'OTH';
  return undefined;
}

let sectionByCode: Map<string, DiagnosticSection> | undefined;

/** A seção de serviço de um exame do catálogo, pelo código do biomarcador. */
export function diagnosticSectionOf(code: string): DiagnosticSection | undefined {
  if (!sectionByCode) {
    sectionByCode = new Map();
    for (const definition of BIOMARKER_DEFINITIONS) {
      const entry = definition.loinc ? LOINC_SNAPSHOT.codes[definition.loinc] : undefined;
      const section =
        definition.section ??
        (entry?.class ? sectionOfLoincClass(entry.class, entry.system) : undefined);
      if (section) sectionByCode.set(definition.code, section);
    }
  }
  return sectionByCode.get(code);
}

/** O exame é da urinálise (fita e sedimento, cor e aspecto). */
export const isUrinalysisCode = (code: string): boolean => diagnosticSectionOf(code) === 'URN';

/**
 * As seções do laudo, para `DiagnosticReport.category`: `LAB` quando há exame
 * de bancada, seguido das seções na ordem do código. Laudo só de imagem ou de
 * medida corporal fica com as próprias seções, sem `LAB`.
 */
export function diagnosticSectionsOfReport(codes: readonly string[]): DiagnosticSection[] {
  const sections = new Set<DiagnosticSection>();
  for (const code of codes) {
    const section = diagnosticSectionOf(code);
    if (section) sections.add(section);
  }
  const hasLab = [...sections].some((section) => LABORATORY_SECTIONS.has(section));
  sections.delete('LAB');
  const sorted = [...sections].sort();
  return hasLab ? ['LAB', ...sorted] : sorted;
}
