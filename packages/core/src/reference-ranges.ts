/**
 * Biomarker Reference Ranges
 *
 * Single source of truth for biomarker reference ranges used by both
 * web app (for display) and API (for fallback when LLM doesn't extract ranges).
 *
 * Data sources (priority order):
 * 1. Brazilian Government - SBPC/ML (Sociedade Brasileira de Patologia Clínica) guidelines
 * 2. International Standards - WHO, clinical laboratory guidelines
 * 3. Specific Labs - Fleury, Weinmann, Quest, LabCorp (when above unavailable)
 */

import { getCanonicalUnit as getCanonicalUnitForCode } from './units';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Sex-specific key for reference ranges
 */
export type SexKey = 'M' | 'F' | 'all';

/**
 * Pré-condição de jejum para a faixa de referência.
 *
 * - `strict`: coleta exige jejum mínimo (ex.: glicemia de jejum, insulina).
 * - `preferred`: jejum recomendado, mas faixa aplicável em não-jejum
 *   (ex.: perfil lipídico pós-SBC 2017, com corte de triglicérides distinto).
 * - `not-required`: valor independe do estado prandial (ex.: HbA1c, TSH).
 */
export type FastingRequirement = 'strict' | 'preferred' | 'not-required';

/**
 * Reference range configuration for a biomarker
 */
export interface BiomarkerReferenceRange {
  /**
   * Pré-condição de jejum para a interpretação da faixa. Opcional;
   * consumidores devem aplicar sinalização adequada quando `strict`.
   */
  fastingRequired?: FastingRequirement;
  max?: number;
  min?: number;
  optimalMax?: number;
  optimalMin?: number;
  /**
   * Chave de fonte bibliográfica (ex.: `'sbc-lipids-2025'`). Propagada
   * do `BiomarkerRangeDefinition` no momento da consulta; ausente em
   * faixas declaradas diretamente sem uma definição completa.
   */
  source?: string;
  unit: string;
  warningMax?: number;
  /**
   * Análogo de `warningMax` para marcadores `higher-better`. Define o limite
   * inferior da zona de atenção (âmbar): valores entre `warningMin` e `min`
   * são âmbar e abaixo de `warningMin` são vermelhos. (`warningMax` cobre o
   * caso `lower-better`, com a zona âmbar acima de `max`.)
   */
  warningMin?: number;
}

/**
 * Trimestre gestacional. Usado em variantes e no contexto de consulta
 * para matching de faixas específicas da gestação.
 */
export type PregnancyTrimester = 1 | 2 | 3;

/**
 * A variant of a reference range that applies to a specific sex, age group,
 * and/or pregnancy state.
 *
 * Ordem de avaliação: variantes são processadas na ordem em que aparecem.
 * Para que usuárias gestantes recebam a variante gestacional correta,
 * essas variantes devem ser listadas **antes** das variantes por idade/sexo.
 */
export interface RangeVariant {
  ageMax?: number;
  ageMin?: number;
  pregnancyTrimester?: PregnancyTrimester;
  /**
   * Quando `true`, a variante só se aplica a contextos de gestação.
   * Se `pregnancyTrimester` estiver definido, o trimestre deve coincidir.
   */
  pregnant?: boolean;
  range: BiomarkerReferenceRange;
  sex: SexKey;
}

/**
 * Extended biomarker range definition with sex/age-specific variants
 */
/**
 * Direction indicates whether exceeding the reference range on one side is benign.
 * - 'range': both above-max and below-min are abnormal (default)
 * - 'higher-better': above-max is normal (e.g., BMC, HDL)
 * - 'lower-better': below-min is normal (e.g., LDL, CRP)
 */
export type RangeDirection = 'range' | 'higher-better' | 'lower-better';

export interface BiomarkerRangeDefinition {
  default: BiomarkerReferenceRange;
  direction?: RangeDirection;
  /**
   * Chave de fonte bibliográfica, opcionalmente com localizador.
   *
   * Formato: `'chave'` ou `'chave:localizador'`
   *
   * Exemplos:
   * - `'sbc-lipids-2017'` — fonte sem localização específica
   * - `'sbc-lipids-2017:p15'` — página 15
   * - `'sbpc-ml-2021:t4.1'` — tabela 4.1
   *
   * As chaves devem corresponder a entradas em `SOURCE_REGISTRY` (sources.ts).
   * Consulte `docs/fontes-referencia.md` para a bibliografia completa em formato ABNT.
   */
  source?: string;
  variants?: RangeVariant[];
}

/**
 * User context for personalized reference range lookup.
 *
 * Para gestação, defina `pregnant: true` e, quando disponível,
 * `pregnancyTrimester` para obter a variante trimestre-específica.
 */
export interface ReferenceRangeContext {
  age?: number;
  biologicalSex?: 'M' | 'F';
  pregnancyTrimester?: PregnancyTrimester;
  pregnant?: boolean;
}

// =============================================================================
// BIOMARKER RANGE DEFINITIONS
// =============================================================================

/**
 * Comprehensive biomarker reference range definitions with sex/age-specific variants
 *
 * Each marker has a default range (used as fallback) and optional variants
 * for sex/age-specific ranges.
 */
export const biomarkerRangeDefinitions: Record<string, BiomarkerRangeDefinition> = {
  Albumin_Creatinine_Ratio: {
    default: { max: 30, min: 0, optimalMax: 20, optimalMin: 0, unit: 'mg/g' },
    source: 'tietz-7ed-2015',
  },

  Adiponectin: {
    default: { max: 26, min: 4, optimalMax: 20, optimalMin: 8, unit: 'mcg/mL' },
    source: 'tietz-7ed-2015',
  },

  ADMA: {
    default: { max: 0.7, min: 0.3, optimalMax: 0.55, optimalMin: 0.3, unit: 'umol/L' },
    source: 'nemeth-adma-2017',
  },

  AFP: {
    default: { max: 10, min: 0, optimalMax: 8, optimalMin: 0, unit: 'ng/mL' },
    source: 'sturgeon-nacb-2008',
  },

  Albumin_Globulin_Ratio: {
    default: { max: 2.5, min: 1.0, optimalMax: 2.2, optimalMin: 1.2, unit: '' },
    source: 'tietz-7ed-2015',
  },

  Albumin: {
    default: { max: 5.0, min: 3.5, optimalMax: 4.8, optimalMin: 4.0, unit: 'g/dL' },
    source: 'pns-bioquimica-2019',
  },

  AlkalinePhosphatase: {
    default: { max: 147, min: 44, optimalMax: 120, optimalMin: 50, unit: 'U/L' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 147, min: 44, optimalMax: 120, optimalMin: 50, unit: 'U/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 104, min: 35, optimalMax: 90, optimalMin: 40, unit: 'U/L' },
        sex: 'F',
      },
    ],
  },

  ALT: {
    default: { max: 35, min: 0, optimalMax: 25, optimalMin: 0, unit: 'U/L' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 56, min: 7, optimalMax: 35, optimalMin: 10, unit: 'U/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 45, min: 7, optimalMax: 30, optimalMin: 10, unit: 'U/L' },
        sex: 'F',
      },
    ],
  },

  // AMH — fortemente dependente de idade e sexo. As variantes femininas por
  // faixa etária são a referência clínica; o `default` foi ajustado para
  // refletir uma faixa adulta conservadora (~18-40 anos, mulheres em idade
  // reprodutiva geral). optimalMax anterior (6.9 ng/mL) sobrepunha-se a
  // valores sugestivos de SOP ou risco de OHSS; clinicamente, valores acima
  // de ~4 ng/mL já merecem investigação.
  AMH: {
    default: { max: 6.0, min: 1.0, optimalMax: 4.0, optimalMin: 1.5, unit: 'ng/mL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMax: 24,
        ageMin: 18,
        range: { max: 13.0, min: 1.5, optimalMax: 10.0, optimalMin: 3.0, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMax: 30,
        ageMin: 25,
        range: { max: 10.0, min: 1.5, optimalMax: 8.0, optimalMin: 2.5, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMax: 35,
        ageMin: 31,
        range: { max: 8.0, min: 1.0, optimalMax: 6.0, optimalMin: 2.0, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMax: 40,
        ageMin: 36,
        range: { max: 6.0, min: 0.5, optimalMax: 4.0, optimalMin: 1.0, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMin: 41,
        range: { max: 3.0, min: 0.1, optimalMax: 2.0, optimalMin: 0.5, unit: 'ng/mL' },
        sex: 'F',
      },
    ],
  },

  Ammonia: {
    default: { max: 45, min: 15, optimalMax: 40, optimalMin: 20, unit: 'umol/L' },
    source: 'tietz-7ed-2015',
  },

  AntiThyroglobulin: {
    default: { max: 115, min: 0, optimalMax: 40, optimalMin: 0, unit: 'IU/mL' },
    source: 'tietz-7ed-2015',
  },

  AntiTPO: {
    default: { max: 34, min: 0, optimalMax: 9, optimalMin: 0, unit: 'IU/mL' },
    source: 'tietz-7ed-2015',
  },

  // Aortic valve calcium — no standardized clinical threshold; use mild cutoff
  // Cálcio de válvula aórtica — usa mesma classificação Agatston
  AorticValveCalcium: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  ApoA1: {
    default: { max: 200, min: 100, optimalMax: 180, optimalMin: 120, unit: 'mg/dL' },
    source: 'contois-apoa1-1996',
  },

  ApoB: {
    default: { max: 90, min: 0, optimalMax: 70, optimalMin: 0, unit: 'mg/dL' },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  ApoCIII: {
    default: { max: 10, min: 0, optimalMax: 7, optimalMin: 0, unit: 'mg/dL' },
    source: 'khetarpal-apociii-2016',
  },

  // ApoCIII/ApoA1 Ratio: derivado de ApoCIII (~10 mg/dL) e ApoA1 (~100-150 mg/dL)
  // NOTA: corte de 0.15 sem fonte publicada — valor calculado, não validado clinicamente
  ApoCIII_ApoA1_Ratio: {
    default: { max: 0.15, min: 0, optimalMax: 0.1, optimalMin: 0, unit: '' },
  },

  Omega6_AA: {
    default: { max: 15.0, min: 5.0, optimalMax: 12.0, optimalMin: 7.0, unit: '%' },
    source: 'simopoulos-omega-ratio-2002',
  },

  // Razão Ácido Araquidônico/EPA (sangue total) — `lower-better`: razão menor =
  // menos eicosanoides pró-inflamatórios. NÃO há intervalo de referência
  // validado em periódico para esta razão; o intervalo 3,7–40,7 é o de
  // referência laboratorial do ensaio Quest/Cleveland HeartLab OmegaCheck®
  // (população interna do laboratório, sem fonte primária publicada). É
  // corroborado por Torrissen 2025 (>500 mil amostras de sangue total): a
  // mediana brasileira (≈18,8) e as ocidentais (EUA ≈22,3; Europa ≈14,2) caem
  // dentro do intervalo. Sem `optimal*`: não há corte ótimo de AA/EPA com fonte.
  // Em telas de relatório único, prefira o intervalo impresso pelo laboratório.
  AA_EPA_Ratio: {
    default: { max: 40.7, min: 3.7, unit: '' },
    direction: 'lower-better',
    source: 'torrissen-omega3-dbs-2025',
  },

  Arsenic: {
    default: { max: 35, min: 0, optimalMax: 20, optimalMin: 0, unit: 'mcg/L' },
    source: 'nr7-pcmso-2020',
  },

  AST: {
    default: { max: 35, min: 0, optimalMax: 25, optimalMin: 0, unit: 'U/L' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 40, min: 10, optimalMax: 30, optimalMin: 10, unit: 'U/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 32, min: 9, optimalMax: 25, optimalMin: 10, unit: 'U/L' },
        sex: 'F',
      },
    ],
  },

  Basophils: {
    default: { max: 1, min: 0, optimalMax: 0.5, optimalMin: 0, unit: '%' },
    source: 'pns-hemograma-2019',
  },

  Basophils_Abs: {
    default: { max: 0.1, min: 0, optimalMax: 0.05, optimalMin: 0, unit: 'K/uL' },
    source: 'pns-hemograma-2019',
  },

  Bicarbonate: {
    default: { max: 29, min: 23, optimalMax: 28, optimalMin: 24, unit: 'mEq/L' },
    source: 'tietz-7ed-2015',
  },

  // β-Hidroxibutirato (BHB) sérico — corpos cetônicos. Faixa derivada de
  // amostra populacional não-jejum (German National Cohort, n=304, 20–69 a)
  // como percentis 2,5–97,5: 0,02–0,28 mmol/L. Em jejum prolongado ou
  // cetose nutricional, valores acima de 0,5 mmol/L são esperados; o limite
  // superior aqui reflete estado pós-prandial habitual, não jejum.
  BetaHydroxybutyrate: {
    default: { max: 0.28, min: 0.02, optimalMax: 0.28, optimalMin: 0.02, unit: 'mmol/L' },
    source: 'klee-bhb-2020',
  },

  BilirubinDirect: {
    default: { max: 0.3, min: 0, optimalMax: 0.2, optimalMin: 0, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  BilirubinIndirect: {
    default: { max: 0.8, min: 0, optimalMax: 0.6, optimalMin: 0, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  BilirubinTotal: {
    default: { max: 1.2, min: 0.1, optimalMax: 0.9, optimalMin: 0.2, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  // BNP: 35 pg/mL = corte não-agudo para triagem de IC (SBC IC 2018)
  BNP: {
    default: { max: 35, min: 0, optimalMax: 20, optimalMin: 0, unit: 'pg/mL' },
    source: 'sbc-ic-2018',
  },

  // Razão BUN/Creatinina — faixa 10-20 aplica-se ao Nitrogênio Ureico (BUN).
  // Laboratórios brasileiros que reportam Ureia (e não BUN) usam razão
  // Ureia/Creatinina, cuja faixa normal é aproximadamente 21-43
  // (Ureia ≈ BUN × 2,14). O biomarcador atualmente assume a convenção BUN;
  // consumidores que dosem Ureia devem converter ou reportar como razão
  // distinta. Ver issue #41 para alinhamento de nomenclatura/LOINC.
  BUN_Creatinine_Ratio: {
    default: { max: 20, min: 10, optimalMax: 18, optimalMin: 12, unit: '' },
    source: 'tietz-7ed-2015',
  },

  CA125: {
    default: { max: 35, min: 0, optimalMax: 25, optimalMin: 0, unit: 'U/mL' },
    source: 'sturgeon-nacb-2008',
  },

  CA199: {
    default: { max: 37, min: 0, optimalMax: 30, optimalMin: 0, unit: 'U/mL' },
    source: 'sturgeon-nacb-2008',
  },

  // CAC: Agatston classification — 0=none, 1-99=mild, 100-399=moderate, 400+=severe
  // max=99 so only moderate+ scores (≥100) flag as ANORMAL; optimalMax=0 (zero is ideal)
  CAC: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  // Per-vessel scores — same Agatston classification applied per vessel
  CAC_LAD: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  CAC_LCX: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  CAC_LMA: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  CAC_Percentile: {
    default: { max: 50, min: 0, optimalMax: 25, optimalMin: 0, unit: '%', warningMax: 75 },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  CAC_RCA: {
    default: { max: 99, min: 0, optimalMax: 0, optimalMin: 0, unit: 'AU' },
    direction: 'lower-better',
    source: 'rumberger-cac-1999',
  },

  Cadmium: {
    default: { max: 1.2, min: 0, optimalMax: 0.5, optimalMin: 0, unit: 'mcg/L' },
    source: 'nr7-pcmso-2020',
  },

  Calcium: {
    default: { max: 10.5, min: 8.5, optimalMax: 10.0, optimalMin: 9.0, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  CEA: {
    default: { max: 3.0, min: 0, optimalMax: 2.5, optimalMin: 0, unit: 'ng/mL' },
    source: 'sturgeon-nacb-2008',
  },

  // CK: valores conservadores baseados em faixas laboratoriais típicas
  CK: {
    default: { max: 190, min: 30, optimalMax: 170, optimalMin: 40, unit: 'U/L' },
    source: 'tietz-7ed-2015',
    variants: [
      { sex: 'F', range: { max: 170, min: 30, optimalMax: 150, optimalMin: 40, unit: 'U/L' } },
    ],
  },

  Chloride: {
    default: { max: 106, min: 98, optimalMax: 105, optimalMin: 100, unit: 'mEq/L' },
    source: 'tietz-7ed-2015',
  },

  // Colesterol total — SBC 2017/2025: valor desejável < 190 mg/dL para adultos,
  // com ou sem jejum. Limite anterior (200 mg/dL) refletia a diretriz ATP III
  // (NCEP, 2002), superada pelas atualizações brasileiras.
  Cholesterol: {
    default: { max: 190, min: 0, optimalMax: 170, optimalMin: 0, unit: 'mg/dL' },
    source: 'sbc-lipids-2025',
  },

  // Índice de Castelli I (CT/HDL-c)
  Cholesterol_HDL_Ratio: {
    // Índice de Castelli I — SBC 2017: M <4.9, F <4.3
    default: { max: 4.9, min: 0, optimalMax: 3.5, optimalMin: 0, unit: '' },
    direction: 'lower-better',
    source: 'castelli-ratio-1992',
    variants: [
      {
        ageMin: 18,
        range: { max: 4.9, min: 0, optimalMax: 4.0, optimalMin: 0, unit: '' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 4.3, min: 0, optimalMax: 3.5, optimalMin: 0, unit: '' },
        sex: 'F',
      },
    ],
  },

  CO2: {
    default: { max: 29, min: 23, optimalMax: 28, optimalMin: 24, unit: 'mEq/L' },
    source: 'tietz-7ed-2015',
  },

  Copper: {
    default: { max: 175, min: 70, optimalMax: 150, optimalMin: 85, unit: 'mcg/dL' },
    source: 'tietz-7ed-2015',
  },

  CoQ10: {
    default: { max: 1.5, min: 0.5, optimalMax: 1.3, optimalMin: 0.7, unit: 'mg/L' },
    source: 'tietz-7ed-2015',
  },

  Cortisol: {
    default: { max: 25, min: 5, optimalMax: 20, optimalMin: 10, unit: 'mcg/dL' },
    source: 'tietz-7ed-2015',
  },

  CortisolFree: {
    default: { max: 2.5, min: 0.5, optimalMax: 2.0, optimalMin: 0.8, unit: 'mcg/dL' },
    source: 'tietz-7ed-2015',
  },

  CPeptide: {
    default: {
      fastingRequired: 'strict',
      max: 3.9,
      min: 0.8,
      optimalMax: 3.0,
      optimalMin: 1.0,
      unit: 'ng/mL',
    },
    source: 'tietz-7ed-2015',
  },

  Creatinine: {
    default: { max: 1.2, min: 0.6, optimalMax: 1.0, optimalMin: 0.7, unit: 'mg/dL' },
    source: 'pns-bioquimica-2019',
    variants: [
      // Gestação: hiperfiltração glomerular (↑ 40–50% GFR) reduz a creatinina
      // sérica. Valores "normais" de não-gestante podem sinalizar disfunção
      // renal em gestante. Limites tipicamente citados: 0.4–0.8 mg/dL.
      {
        pregnant: true,
        range: { max: 0.8, min: 0.4, optimalMax: 0.7, optimalMin: 0.5, unit: 'mg/dL' },
        sex: 'F',
      },
      {
        ageMin: 18,
        range: { max: 1.3, min: 0.7, optimalMax: 1.1, optimalMin: 0.8, unit: 'mg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 1.1, min: 0.5, optimalMax: 0.9, optimalMin: 0.6, unit: 'mg/dL' },
        sex: 'F',
      },
    ],
  },

  CRP: {
    default: { max: 3.0, min: 0, optimalMax: 1.0, optimalMin: 0, unit: 'mg/L' },
    direction: 'lower-better',
    source: 'tietz-7ed-2015',
  },

  CystatinC: {
    default: { max: 1.0, min: 0.5, optimalMax: 0.9, optimalMin: 0.6, unit: 'mg/L' },
    source: 'tietz-7ed-2015',
  },

  // D-Dímero — exame de exclusão de TEV (tromboembolismo venoso) com
  // ponto de corte único, não uma faixa graduada. Valores < 500 ng/mL
  // têm alto valor preditivo negativo; acima disso a investigação
  // clínica decide. Removidos `optimalMin/optimalMax` porque a
  // dicotomia clínica (positivo/negativo para exclusão) não é melhor
  // representada por zonas verde/amarela. Em pacientes > 50 anos,
  // diretrizes (ESC 2019, ACEP) recomendam corte ajustado pela idade:
  // idade × 10 ng/mL (até 750 ng/mL aos 75+).
  DDimer: {
    default: { max: 500, min: 0, unit: 'ng/mL' },
    direction: 'lower-better',
    source: 'wells-ddimer-2003',
    variants: [
      // Corte ajustado por idade — ESC 2019 (Konstantinides et al.) e
      // ACEP recomendam em pacientes não gestantes ≥ 50 anos com
      // probabilidade clínica baixa/intermediária de TEV. Fórmula:
      // idade × 10 ng/mL. Aproximação por faixas etárias.
      { ageMax: 59, ageMin: 50, range: { max: 590, min: 0, unit: 'ng/mL' }, sex: 'all' },
      { ageMax: 69, ageMin: 60, range: { max: 690, min: 0, unit: 'ng/mL' }, sex: 'all' },
      { ageMin: 70, range: { max: 750, min: 0, unit: 'ng/mL' }, sex: 'all' },
    ],
  },

  Omega3_DHA: {
    default: { max: 8.0, min: 2.0, optimalMax: 6.5, optimalMin: 3.5, unit: '%' },
    source: 'harris-omega3-2004',
  },

  DHEAS: {
    default: { max: 500, min: 100, optimalMax: 400, optimalMin: 150, unit: 'mcg/dL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMax: 39,
        ageMin: 18,
        range: { max: 640, min: 280, optimalMax: 500, optimalMin: 300, unit: 'mcg/dL' },
        sex: 'M',
      },
      {
        ageMax: 59,
        ageMin: 40,
        range: { max: 520, min: 120, optimalMax: 400, optimalMin: 150, unit: 'mcg/dL' },
        sex: 'M',
      },
      {
        ageMin: 60,
        range: { max: 290, min: 42, optimalMax: 220, optimalMin: 80, unit: 'mcg/dL' },
        sex: 'M',
      },
      {
        ageMax: 39,
        ageMin: 18,
        range: { max: 380, min: 65, optimalMax: 300, optimalMin: 100, unit: 'mcg/dL' },
        sex: 'F',
      },
      {
        ageMax: 59,
        ageMin: 40,
        range: { max: 240, min: 32, optimalMax: 180, optimalMin: 60, unit: 'mcg/dL' },
        sex: 'F',
      },
      {
        ageMin: 60,
        range: { max: 140, min: 18, optimalMax: 100, optimalMin: 30, unit: 'mcg/dL' },
        sex: 'F',
      },
    ],
  },

  Omega3_DPA: {
    default: { max: 2.0, min: 0.3, optimalMax: 1.5, optimalMin: 0.5, unit: '%' },
    source: 'harris-omega3-2004',
  },

  eGFR: {
    default: { max: 120, min: 60, optimalMax: 120, optimalMin: 90, unit: 'mL/min/1.73m²' },
    // KDIGO 2024: TFG 60-89 (G2) sem marcador de lesão renal não é DRC, em
    // nenhuma faixa etária. A variante por idade que existia aqui rebaixava o
    // piso só para 60+ e ainda limitava o teto a 90, o que sinalizava como
    // alterado qualquer idoso com função preservada.
    source: 'kdigo-ckd-2024',
  },

  Eosinophils: {
    default: { max: 5, min: 0, optimalMax: 4, optimalMin: 1, unit: '%' },
    direction: 'lower-better',
    source: 'pns-hemograma-2019',
  },

  Eosinophils_Abs: {
    default: { max: 0.5, min: 0, optimalMax: 0.3, optimalMin: 0, unit: 'K/uL' },
    source: 'pns-hemograma-2019',
  },

  Omega3_EPA: {
    default: { max: 3.5, min: 0.5, optimalMax: 2.5, optimalMin: 1.0, unit: '%' },
    source: 'harris-omega3-2004',
  },

  EPADPADHA: {
    default: { max: 10.0, min: 3.0, optimalMax: 9.0, optimalMin: 5.0, unit: '%' },
    source: 'harris-omega3-2004',
  },

  ESR: {
    default: { max: 20, min: 0, optimalMax: 10, optimalMin: 0, unit: 'mm/hr' },
    source: 'tietz-7ed-2015',
  },

  Estradiol: {
    default: { max: 40, min: 10, optimalMax: 35, optimalMin: 15, unit: 'pg/mL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 40, min: 10, optimalMax: 30, optimalMin: 15, unit: 'pg/mL' },
        sex: 'M',
      },
      {
        ageMax: 50,
        ageMin: 18,
        range: { max: 400, min: 30, optimalMax: 300, optimalMin: 50, unit: 'pg/mL' },
        sex: 'F',
      },
      {
        ageMin: 51,
        range: { max: 30, min: 0, optimalMax: 20, optimalMin: 0, unit: 'pg/mL' },
        sex: 'F',
      },
    ],
  },

  F2Isoprostanes: {
    default: { max: 86, min: 0, optimalMax: 60, optimalMin: 0, unit: 'pg/mL' },
    source: 'tietz-7ed-2015',
  },

  // Ferritina — WHO 2020 é o documento de referência específico para avaliação
  // do status de ferro via ferritina. Importante: inflamação aguda eleva
  // ferritina (proteína de fase aguda); WHO 2020 recomenda dosagem concomitante
  // de PCR para interpretação em contexto inflamatório (fora do escopo deste
  // tipo de faixa, mas documentado aqui para consumidores).
  Ferritin: {
    default: { max: 150, min: 12, optimalMax: 120, optimalMin: 30, unit: 'ng/mL' },
    source: 'who-iron-2020',
    variants: [
      // Gestação: ferritina cai fisiologicamente no 2º/3º trimestre pela expansão
      // do volume plasmático e maior demanda fetal. WHO 2020: <15 ng/mL sugere
      // depleção; muitas diretrizes nacionais usam <30 como gatilho mais sensível
      // na gestação dada a alta prevalência de deficiência subclínica.
      {
        pregnant: true,
        range: { max: 120, min: 15, optimalMax: 80, optimalMin: 30, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMin: 18,
        range: { max: 250, min: 20, optimalMax: 200, optimalMin: 40, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMax: 50,
        ageMin: 18,
        range: { max: 120, min: 10, optimalMax: 80, optimalMin: 20, unit: 'ng/mL' },
        sex: 'F',
      },
      {
        ageMin: 51,
        range: { max: 200, min: 20, optimalMax: 150, optimalMin: 30, unit: 'ng/mL' },
        sex: 'F',
      },
    ],
  },

  // Fibrinogênio: 200-400 mg/dL — faixa de referência padrão (método de Clauss)
  Fibrinogen: {
    default: { max: 400, min: 200, optimalMax: 350, optimalMin: 250, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  FolicAcid: {
    default: { max: 20, min: 3, optimalMax: 15, optimalMin: 5, unit: 'ng/mL' },
    source: 'tietz-7ed-2015',
  },

  FSH: {
    default: { max: 12.4, min: 1.5, optimalMax: 10.0, optimalMin: 3.0, unit: 'mIU/mL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 12.4, min: 1.5, optimalMax: 8.0, optimalMin: 1.5, unit: 'mIU/mL' },
        sex: 'M',
      },
      {
        ageMax: 50,
        ageMin: 18,
        range: { max: 12.5, min: 3.5, optimalMax: 10.0, optimalMin: 3.5, unit: 'mIU/mL' },
        sex: 'F',
      },
      {
        ageMin: 51,
        range: { max: 134.8, min: 25.8, optimalMax: 80.0, optimalMin: 25.8, unit: 'mIU/mL' },
        sex: 'F',
      },
    ],
  },

  GGT: {
    default: { max: 55, min: 0, optimalMax: 30, optimalMin: 0, unit: 'U/L' },
    direction: 'lower-better',
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 61, min: 8, optimalMax: 40, optimalMin: 10, unit: 'U/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 36, min: 5, optimalMax: 25, optimalMin: 8, unit: 'U/L' },
        sex: 'F',
      },
    ],
  },

  Ghrelin: {
    default: { max: 1000, min: 300, optimalMax: 800, optimalMin: 400, unit: 'pg/mL' },
    source: 'tietz-7ed-2015',
  },

  Globulin: {
    default: { max: 3.5, min: 2.0, optimalMax: 3.2, optimalMin: 2.3, unit: 'g/dL' },
    source: 'tietz-7ed-2015',
  },

  // Glicemia de jejum — 70–99 mg/dL é a faixa de normalidade (SBD 2024, ADA);
  // hipoglicemia clinicamente acionável em não-diabético é <54 mg/dL (Level 2
  // ADA/SBD), não 70. O corte 70 era Level 1 (alerta em diabético em tratamento)
  // e gerava falsos "abaixo do normal" em indivíduos saudáveis cuja glicemia
  // em jejum está fisiologicamente entre 54–70. optimalMin preserva o alvo.
  Glucose: {
    default: {
      fastingRequired: 'strict',
      max: 100,
      min: 54,
      optimalMax: 90,
      optimalMin: 70,
      unit: 'mg/dL',
    },
    source: 'sbd-diabetes-2024',
    variants: [
      // Gestação: DMG (IADPSG/SBD 2024) usa cortes mais restritivos na glicemia
      // de jejum — ≥92 mg/dL já indica diabetes mellitus gestacional. Portanto
      // a faixa "normal" em gestante vai até 91 mg/dL no jejum.
      {
        pregnant: true,
        range: {
          fastingRequired: 'strict',
          max: 91,
          min: 54,
          optimalMax: 85,
          optimalMin: 70,
          unit: 'mg/dL',
        },
        sex: 'F',
      },
    ],
  },

  GlycoMark: {
    default: { max: 40, min: 10, optimalMax: 35, optimalMin: 15, unit: 'mcg/mL' },
    source: 'tietz-7ed-2015',
  },

  GrowthHormone: {
    default: { max: 5, min: 0, optimalMax: 3, optimalMin: 0, unit: 'ng/mL' },
    source: 'tietz-7ed-2015',
  },

  // HbA1c — SBD 2024 não estabelece piso de referência clinicamente acionável.
  // Valores <4.0% podem refletir anemia hemolítica, perda sanguínea recente ou
  // hemoglobinopatia, não patologia do metabolismo glicêmico. Usamos min=2 como
  // piso de sanidade (HbA1c <2% é quase sempre erro instrumental/entrada) sem
  // criar flag clínico em valores fisiologicamente baixos. optimalMin preserva
  // o alvo fisiológico da fração glicada.
  HbA1c: {
    default: { max: 5.7, min: 2, optimalMax: 5.3, optimalMin: 4.5, unit: '%' },
    source: 'sbd-diabetes-2024',
  },

  Hct: {
    default: { max: 50, min: 36, optimalMax: 48, optimalMin: 40, unit: '%' },
    source: 'pns-hemograma-2019',
    variants: [
      {
        ageMin: 18,
        range: { max: 54, min: 40, optimalMax: 50, optimalMin: 42, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 48, min: 36, optimalMax: 45, optimalMin: 38, unit: '%' },
        sex: 'F',
      },
    ],
  },

  // HDL — SBC 2017/2025: desejável > 40 mg/dL (♂) e > 50 mg/dL (♀).
  // A diretriz NÃO define teto de normalidade — HDL alto é cardioprotetor.
  // Limites superiores anteriormente fixados em 60 mg/dL geravam falsos
  // alertas. Mantém-se `max` apenas como limite técnico do gauge (100 mg/dL),
  // não como ponto de corte clínico; consumidores devem tratar `direction:
  // higher-better` como sinal autoritativo.
  HDL: {
    default: { max: 100, min: 40, optimalMax: 100, optimalMin: 50, unit: 'mg/dL' },
    direction: 'higher-better',
    source: 'sbc-lipids-2025',
    variants: [
      {
        ageMin: 18,
        range: { max: 100, min: 40, optimalMax: 100, optimalMin: 45, unit: 'mg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 100, min: 50, optimalMax: 100, optimalMin: 55, unit: 'mg/dL' },
        sex: 'F',
      },
    ],
  },

  HDL_Large: {
    // HDL Large: higher is better
    // Quest Ion Mobility reference: Male 4334-10815, Female 5038-17886 nmol/L, optimal >6729
    default: { max: 17886, min: 4334, optimalMax: 17886, optimalMin: 6729, unit: 'nmol/L' },
    direction: 'higher-better',
    source: 'caulfield-ionmobility-2008',
  },

  Hgb: {
    default: { max: 17.5, min: 12.0, optimalMax: 16.0, optimalMin: 13.5, unit: 'g/dL' },
    source: 'pns-hemograma-2019',
    variants: [
      // Gestação: hemodiluição fisiológica reduz o piso aceitável.
      // OMS e CDC: anemia gestacional quando Hgb <11 g/dL (1º e 3º tri) ou
      // <10.5 g/dL (2º tri, dilucional mais acentuada). Catch-all adota a
      // faixa mais conservadora (2º tri) quando trimestre é desconhecido.
      {
        pregnant: true,
        pregnancyTrimester: 1,
        range: { max: 14.0, min: 11.0, optimalMax: 13.0, optimalMin: 11.5, unit: 'g/dL' },
        sex: 'F',
      },
      {
        pregnant: true,
        pregnancyTrimester: 2,
        range: { max: 14.0, min: 10.5, optimalMax: 13.0, optimalMin: 11.0, unit: 'g/dL' },
        sex: 'F',
      },
      {
        pregnant: true,
        pregnancyTrimester: 3,
        range: { max: 14.0, min: 11.0, optimalMax: 13.0, optimalMin: 11.5, unit: 'g/dL' },
        sex: 'F',
      },
      {
        pregnant: true,
        range: { max: 14.0, min: 10.5, optimalMax: 13.0, optimalMin: 11.0, unit: 'g/dL' },
        sex: 'F',
      },
      {
        ageMin: 18,
        range: { max: 17.5, min: 13.5, optimalMax: 16.5, optimalMin: 14.0, unit: 'g/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 15.5, min: 12.0, optimalMax: 14.5, optimalMin: 12.5, unit: 'g/dL' },
        sex: 'F',
      },
    ],
  },

  // HOMA-IR — três faixas do estudo BRAMS (Geloneze et al., 2009) validado em
  // população urbana brasileira: ótimo até 1.5; sensibilidade reduzida (zona de
  // atenção) entre 1.5 e 2.71; resistência à insulina acima de 2.71. Tietz 7ª
  // ed. não publica corte próprio de HOMA-IR. `max` (1.5) delimita o verde,
  // `warningMax` (2.71) o âmbar e acima disso o vermelho.
  HOMA_IR: {
    default: {
      fastingRequired: 'strict',
      max: 1.5,
      min: 0,
      unit: '',
      warningMax: 2.71,
    },
    direction: 'lower-better',
    source: 'geloneze-brams-2009',
  },

  Homocysteine: {
    default: { max: 15, min: 4, optimalMax: 10, optimalMin: 5, unit: 'umol/L' },
    direction: 'lower-better',
    source: 'selhub-homocysteine-1999',
  },

  IGF1: {
    default: { max: 350, min: 100, optimalMax: 300, optimalMin: 150, unit: 'ng/mL' },
    source: 'tietz-7ed-2015',
  },

  ImmatureGranulocytes: {
    default: { max: 1.0, min: 0, optimalMax: 0.5, optimalMin: 0, unit: '%' },
    source: 'tietz-7ed-2015',
  },

  Insulin: {
    default: {
      fastingRequired: 'strict',
      max: 25,
      min: 2,
      optimalMax: 8,
      optimalMin: 3,
      unit: 'uIU/mL',
    },
    source: 'tietz-7ed-2015',
  },

  Iron: {
    default: { max: 170, min: 60, optimalMax: 140, optimalMin: 80, unit: 'mcg/dL' },
    source: 'sbpc-ml-2021',
    variants: [
      {
        ageMin: 18,
        range: { max: 175, min: 65, optimalMax: 150, optimalMin: 80, unit: 'mcg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 170, min: 50, optimalMax: 130, optimalMin: 60, unit: 'mcg/dL' },
        sex: 'F',
      },
    ],
  },

  Lactate: {
    default: { max: 2.2, min: 0.5, optimalMax: 1.8, optimalMin: 0.7, unit: 'mmol/L' },
    source: 'tietz-7ed-2015',
  },

  // DHL/LDH — método IFCC a 37 °C (padrão atual na maioria dos laboratórios
  // brasileiros). Limites superiores de referência (97,5° percentil) obtidos
  // por Schumann & Klauke (2002) em indivíduos ≥17 anos: 247 U/L (mulheres)
  // e 248 U/L (homens). O IFCC publica apenas o limite superior; o limite
  // inferior é fixado em 0 pois DHL baixa não tem significado clínico.
  // Não comparar com método Wróblewski-LaDue (faixas mais antigas, ~240–480).
  LDH: {
    default: { max: 248, min: 0, optimalMax: 248, optimalMin: 0, unit: 'U/L' },
    direction: 'lower-better',
    source: 'schumann-ifcc-ldh-2002',
    variants: [
      {
        ageMin: 17,
        range: { max: 248, min: 0, optimalMax: 248, optimalMin: 0, unit: 'U/L' },
        sex: 'M',
      },
      {
        ageMin: 17,
        range: { max: 247, min: 0, optimalMax: 247, optimalMin: 0, unit: 'U/L' },
        sex: 'F',
      },
    ],
  },

  LDL: {
    default: { max: 100, min: 0, optimalMax: 70, optimalMin: 0, unit: 'mg/dL' },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  LDL_Medium: {
    // LDL Medium (LDL Média): lower is better
    // Quest Ion Mobility reference: Male 167-485, Female 121-397 nmol/L, optimal <215
    default: { max: 485, min: 0, optimalMax: 215, optimalMin: 121, unit: 'nmol/L' },
    direction: 'lower-better',
    source: 'caulfield-ionmobility-2008',
  },

  LDL_ParticleNumber: {
    // LDL Particle Number: lower is better
    // Quest Ion Mobility reference: 1016-2185 nmol/L, optimal <1138
    default: { max: 2185, min: 0, optimalMax: 1138, optimalMin: 1016, unit: 'nmol/L' },
    direction: 'lower-better',
    source: 'caulfield-ionmobility-2008',
  },

  LDL_Peak_Size: {
    // LDL Peak Size: higher is better (larger particles less atherogenic)
    // Quest Ion Mobility reference: optimal >222.9 Å (22.29 nm)
    default: { max: 250.0, min: 217.4, optimalMax: 250.0, optimalMin: 222.9, unit: 'Angstrom' },
    direction: 'higher-better',
    source: 'caulfield-ionmobility-2008',
  },

  LDL_Small: {
    // LDL Small (LDL Pequena): lower is better (small dense LDL is most atherogenic)
    // Quest Ion Mobility reference: Male 123-441, Female 126-382 nmol/L, optimal <142
    default: { max: 441, min: 0, optimalMax: 142, optimalMin: 123, unit: 'nmol/L' },
    direction: 'lower-better',
    source: 'caulfield-ionmobility-2008',
  },

  Lead: {
    default: { max: 5, min: 0, optimalMax: 2, optimalMin: 0, unit: 'mcg/dL' },
    source: 'nr7-pcmso-2020',
  },

  Leptin: {
    default: { max: 15, min: 2, optimalMax: 12, optimalMin: 3, unit: 'ng/mL' },
    direction: 'lower-better',
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 10, min: 1, optimalMax: 8, optimalMin: 2, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 25, min: 4, optimalMax: 18, optimalMin: 5, unit: 'ng/mL' },
        sex: 'F',
      },
    ],
  },

  LH: {
    default: { max: 8.6, min: 1.7, optimalMax: 8.0, optimalMin: 2.0, unit: 'mIU/mL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 8.6, min: 1.7, optimalMax: 6.0, optimalMin: 1.7, unit: 'mIU/mL' },
        sex: 'M',
      },
      {
        ageMax: 50,
        ageMin: 18,
        range: { max: 12.6, min: 2.4, optimalMax: 10.0, optimalMin: 2.4, unit: 'mIU/mL' },
        sex: 'F',
      },
      {
        ageMin: 51,
        range: { max: 58.5, min: 7.7, optimalMax: 40.0, optimalMin: 10.0, unit: 'mIU/mL' },
        sex: 'F',
      },
    ],
  },

  Omega6_LA: {
    default: { max: 35.0, min: 15.0, optimalMax: 28.0, optimalMin: 18.0, unit: '%' },
    source: 'simopoulos-omega-ratio-2002',
  },

  // Lp(a) — SBC 2025 (seção 3.1.1.2.7): níveis ≥ 50 mg/dL ou ≥ 125 nmol/L são
  // considerados aumentados, com indicação de rastreamento em cascata familiar.
  // A diretriz recomenda ensaio independente de isoforma medido em nmol/L; a
  // unidade nmol/L é mantida aqui por refletir o padrão laboratorial atual.
  // Limites anteriores (max=75) refletiam pontos de corte expressos em mg/dL,
  // gerando incompatibilidade com a unidade nmol/L declarada.
  Lipoprotein_a: {
    default: { max: 125, min: 0, optimalMax: 75, optimalMin: 0, unit: 'nmol/L' },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  Lymphocytes: {
    default: { max: 40, min: 20, optimalMax: 35, optimalMin: 25, unit: '%' },
    source: 'pns-hemograma-2019',
  },

  Lymphocytes_Abs: {
    default: { max: 4.0, min: 1.0, optimalMax: 3.0, optimalMin: 1.5, unit: 'K/uL' },
    source: 'pns-hemograma-2019',
  },

  Magnesium: {
    default: { max: 2.2, min: 1.7, optimalMax: 2.1, optimalMin: 1.9, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  Magnesium_RBC: {
    default: { max: 6.8, min: 4.0, optimalMax: 6.0, optimalMin: 4.5, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  MCH: {
    default: { max: 33, min: 27, optimalMax: 32, optimalMin: 28, unit: 'pg' },
    source: 'pns-hemograma-2019',
  },

  MCHC: {
    default: { max: 36, min: 32, optimalMax: 35, optimalMin: 33, unit: 'g/dL' },
    source: 'pns-hemograma-2019',
  },

  MCV: {
    default: { max: 100, min: 80, optimalMax: 98, optimalMin: 82, unit: 'fL' },
    source: 'pns-hemograma-2019',
  },

  Mercury: {
    default: { max: 10, min: 0, optimalMax: 5, optimalMin: 0, unit: 'mcg/L' },
    source: 'nr7-pcmso-2020',
  },

  Microalbumin: {
    default: { max: 30, min: 0, optimalMax: 20, optimalMin: 0, unit: 'mg/L' },
    source: 'kdigo-ckd-2024',
  },

  MMA: {
    default: { max: 378, min: 0, optimalMax: 270, optimalMin: 0, unit: 'nmol/L' },
    source: 'tietz-7ed-2015',
  },

  Monocytes: {
    default: { max: 8, min: 2, optimalMax: 7, optimalMin: 3, unit: '%' },
    source: 'pns-hemograma-2019',
  },

  Monocytes_Abs: {
    default: { max: 0.8, min: 0.2, optimalMax: 0.7, optimalMin: 0.3, unit: 'K/uL' },
    source: 'pns-hemograma-2019',
  },

  MPV: {
    default: { max: 11.5, min: 7.5, optimalMax: 10.5, optimalMin: 8.0, unit: 'fL' },
    source: 'pns-hemograma-2019',
  },

  // MPO: Meuwese 2007 (EPIC-Norfolk) — risco CV elevado >322 pmol/L
  Myeloperoxidase: {
    default: { max: 470, min: 0, optimalMax: 322, optimalMin: 0, unit: 'pmol/L' },
    source: 'meuwese-mpo-2007',
  },

  // WBC Differential (%)
  Neutrophils: {
    default: { max: 70, min: 40, optimalMax: 65, optimalMin: 50, unit: '%' },
    source: 'pns-hemograma-2019',
  },

  // WBC Differential (Absolute)
  Neutrophils_Abs: {
    default: { max: 8.0, min: 1.5, optimalMax: 6.0, optimalMin: 2.0, unit: 'K/uL' },
    source: 'pns-hemograma-2019',
  },

  NonHDL_Cholesterol: {
    default: { max: 130, min: 0, optimalMax: 100, optimalMin: 0, unit: 'mg/dL' },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  NRBC: {
    default: { max: 0, min: 0, optimalMax: 0, optimalMin: 0, unit: '/100WBC' },
    source: 'tietz-7ed-2015',
  },

  NTproBNP: {
    default: { max: 125, min: 0, optimalMax: 75, optimalMin: 0, unit: 'pg/mL' },
    source: 'sbc-ic-2018',
  },

  Oleic_Acid: {
    default: { max: 25.0, min: 15.0, optimalMax: 22.0, optimalMin: 18.0, unit: '%' },
    source: 'tietz-7ed-2015',
  },

  Omega3_Index: {
    default: { max: 8.0, min: 4.0, optimalMax: 8.0, optimalMin: 5.5, unit: '%' },
    source: 'harris-omega3-2004',
  },

  // Ômega-3 Total (% de ácidos graxos eritrocitários) — Harris & von Schacky
  // (2004) propõem ≥ 8% como zona ótima de proteção cardiovascular; valores
  // entre 4% e 8% representam risco intermediário, < 4% risco alto.
  // optimalMin anterior (5.5%) ficava em zona intermediária, contradizendo
  // a literatura e o próprio texto educacional do `platform`.
  Omega3_Total: {
    default: { max: 12.0, min: 3.0, optimalMax: 10.0, optimalMin: 8.0, unit: '%' },
    source: 'harris-omega3-2004',
  },

  Omega6_Total: {
    default: { max: 40.0, min: 20.0, optimalMax: 35.0, optimalMin: 25.0, unit: '%' },
    source: 'simopoulos-omega-ratio-2002',
  },

  Omega6_Omega3_Ratio: {
    default: { max: 10.0, min: 0, optimalMax: 4.0, optimalMin: 1.0, unit: '' },
    direction: 'lower-better',
    source: 'simopoulos-omega-ratio-2002',
  },

  OmegaCheck: {
    default: { max: 8.0, min: 4.0, optimalMax: 8.0, optimalMin: 5.5, unit: '%' },
    source: 'harris-omega3-2004',
  },

  Palmitic_Acid: {
    default: { max: 30.0, min: 20.0, optimalMax: 27.0, optimalMin: 22.0, unit: '%' },
    source: 'tietz-7ed-2015',
  },

  Phosphorus: {
    default: { max: 4.5, min: 2.5, optimalMax: 4.0, optimalMin: 3.0, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  Platelets: {
    default: { max: 400, min: 150, optimalMax: 350, optimalMin: 180, unit: 'K/uL' },
    source: 'pns-hemograma-2019',
  },

  Potassium: {
    default: { max: 5.0, min: 3.5, optimalMax: 4.6, optimalMin: 3.8, unit: 'mEq/L' },
    source: 'tietz-7ed-2015',
  },

  Prealbumin: {
    default: { max: 38, min: 18, optimalMax: 35, optimalMin: 20, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  // Progesterona — varia drasticamente com a fase do ciclo menstrual.
  // O schema atual não modela fase do ciclo, então adotamos faixas amplas
  // por sexo: o `default` cobre homens/fase folicular/pós-menopausa; a
  // variante feminina expande até a faixa esperada de fase lútea
  // (~3-20 ng/mL). Interpretação correta exige correlação com a fase do
  // ciclo, indisponível neste contexto.
  Progesterone: {
    default: { max: 0.9, min: 0.1, optimalMax: 0.7, optimalMin: 0.2, unit: 'ng/mL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 0.9, min: 0.1, optimalMax: 0.6, optimalMin: 0.2, unit: 'ng/mL' },
        sex: 'M',
      },
      // Mulheres em idade reprodutiva: faixa que abarca fases folicular
      // (0.1-0.9 ng/mL) e lútea (3-20 ng/mL). Sem contexto de fase do ciclo,
      // valores intermediários (1-3 ng/mL) ficam em zona ambígua.
      {
        ageMax: 50,
        ageMin: 18,
        range: { max: 20.0, min: 0.1, optimalMax: 15.0, optimalMin: 0.2, unit: 'ng/mL' },
        sex: 'F',
      },
      // Pós-menopausa: valores tipicamente < 0.5 ng/mL (sem ovulação).
      {
        ageMin: 51,
        range: { max: 0.5, min: 0, optimalMax: 0.3, optimalMin: 0, unit: 'ng/mL' },
        sex: 'F',
      },
    ],
  },

  Prolactin: {
    default: { max: 18, min: 2, optimalMax: 15, optimalMin: 4, unit: 'ng/mL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 18, min: 2, optimalMax: 15, optimalMin: 4, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 29, min: 2, optimalMax: 23, optimalMin: 4, unit: 'ng/mL' },
        sex: 'F',
      },
    ],
  },

  PSA: {
    default: { max: 4.0, min: 0, optimalMax: 2.5, optimalMin: 0, unit: 'ng/mL' },
    source: 'sturgeon-nacb-2008',
    variants: [
      {
        ageMax: 49,
        ageMin: 18,
        range: { max: 2.5, min: 0, optimalMax: 1.5, optimalMin: 0, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMax: 59,
        ageMin: 50,
        range: { max: 3.5, min: 0, optimalMax: 2.5, optimalMin: 0, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMax: 69,
        ageMin: 60,
        range: { max: 4.5, min: 0, optimalMax: 3.0, optimalMin: 0, unit: 'ng/mL' },
        sex: 'M',
      },
      {
        ageMin: 70,
        range: { max: 6.5, min: 0, optimalMax: 4.0, optimalMin: 0, unit: 'ng/mL' },
        sex: 'M',
      },
    ],
  },

  RBC: {
    default: { max: 5.5, min: 4.0, optimalMax: 5.2, optimalMin: 4.3, unit: 'M/uL' },
    source: 'pns-hemograma-2019',
    variants: [
      {
        ageMin: 18,
        range: { max: 5.9, min: 4.5, optimalMax: 5.5, optimalMin: 4.7, unit: 'M/uL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 5.2, min: 4.0, optimalMax: 5.0, optimalMin: 4.2, unit: 'M/uL' },
        sex: 'F',
      },
    ],
  },

  RDW: {
    default: { max: 14.5, min: 11.5, optimalMax: 14.0, optimalMin: 12.0, unit: '%' },
    source: 'pns-hemograma-2019',
  },

  Reticulocytes: {
    default: { max: 2.5, min: 0.5, optimalMax: 2.0, optimalMin: 0.8, unit: '%' },
    source: 'pns-hemograma-2019',
  },

  SDMA: {
    default: { max: 0.6, min: 0.3, optimalMax: 0.5, optimalMin: 0.3, unit: 'umol/L' },
    source: 'schwedhelm-sdma-2011',
  },

  Selenium: {
    default: { max: 150, min: 70, optimalMax: 125, optimalMin: 85, unit: 'mcg/L' },
    source: 'tietz-7ed-2015',
  },

  SHBG: {
    default: { max: 54, min: 18, optimalMax: 50, optimalMin: 20, unit: 'nmol/L' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 54, min: 18, optimalMax: 45, optimalMin: 20, unit: 'nmol/L' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 122, min: 24, optimalMax: 90, optimalMin: 30, unit: 'nmol/L' },
        sex: 'F',
      },
    ],
  },

  Sodium: {
    default: { max: 145, min: 136, optimalMax: 143, optimalMin: 138, unit: 'mEq/L' },
    source: 'tietz-7ed-2015',
  },

  SpecificGravity_Urine: {
    default: { max: 1.03, min: 1.005, optimalMax: 1.025, optimalMin: 1.01, unit: 'SG' },
    source: 'tietz-7ed-2015',
  },

  Stearic_Acid: {
    default: { max: 14.0, min: 8.0, optimalMax: 12.0, optimalMin: 10.0, unit: '%' },
    source: 'tietz-7ed-2015',
  },

  T3Free: {
    default: { max: 4.2, min: 2.3, optimalMax: 3.8, optimalMin: 2.8, unit: 'pg/mL' },
    source: 'tietz-7ed-2015',
  },

  T3Reverse: {
    default: { max: 24, min: 10, optimalMax: 20, optimalMin: 12, unit: 'ng/dL' },
    source: 'tietz-7ed-2015',
  },

  T4Free: {
    default: { max: 1.8, min: 0.8, optimalMax: 1.5, optimalMin: 1.0, unit: 'ng/dL' },
    source: 'tietz-7ed-2015',
  },

  T4Total: {
    default: { max: 12.0, min: 4.5, optimalMax: 10.0, optimalMin: 6.0, unit: 'ug/dL' },
    source: 'tietz-7ed-2015',
  },

  Testosterone: {
    default: { max: 1000, min: 300, optimalMax: 800, optimalMin: 500, unit: 'ng/dL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMax: 49,
        ageMin: 18,
        range: { max: 1000, min: 300, optimalMax: 800, optimalMin: 500, unit: 'ng/dL' },
        sex: 'M',
      },
      {
        ageMin: 50,
        range: { max: 800, min: 200, optimalMax: 650, optimalMin: 400, unit: 'ng/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 70, min: 15, optimalMax: 50, optimalMin: 20, unit: 'ng/dL' },
        sex: 'F',
      },
    ],
  },

  TestosteroneBioavailable: {
    default: { max: 200, min: 50, optimalMax: 150, optimalMin: 80, unit: 'ng/dL' },
    source: 'tietz-7ed-2015',
  },

  // TestosteroneFree - using direct immunoassay ranges (Quest/LabCorp standard)
  // Previous values (9.3-26.5 pg/mL) were based on equilibrium dialysis method
  TestosteroneFree: {
    default: { max: 155, min: 35, optimalMax: 120, optimalMin: 50, unit: 'pg/mL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMax: 49,
        ageMin: 18,
        range: { max: 155, min: 35, optimalMax: 120, optimalMin: 50, unit: 'pg/mL' },
        sex: 'M',
      },
      {
        ageMin: 50,
        range: { max: 130, min: 30, optimalMax: 100, optimalMin: 40, unit: 'pg/mL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 5.0, min: 0.2, optimalMax: 3.0, optimalMin: 0.5, unit: 'pg/mL' },
        sex: 'F',
      },
    ],
  },

  TIBC: {
    default: { max: 370, min: 250, optimalMax: 350, optimalMin: 280, unit: 'mcg/dL' },
    source: 'tietz-7ed-2015',
  },

  TotalProtein: {
    default: { max: 8.3, min: 6.0, optimalMax: 7.8, optimalMin: 6.5, unit: 'g/dL' },
    source: 'tietz-7ed-2015',
  },

  Trans_Fat_Index: {
    default: { max: 1.0, min: 0, optimalMax: 0.5, optimalMin: 0, unit: '%' },
    source: 'tietz-7ed-2015',
  },

  Transferrin: {
    default: { max: 360, min: 200, optimalMax: 340, optimalMin: 220, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  TransferrinSaturation: {
    default: { max: 50, min: 20, optimalMax: 45, optimalMin: 25, unit: '%' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 55, min: 20, optimalMax: 45, optimalMin: 25, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 50, min: 15, optimalMax: 40, optimalMin: 20, unit: '%' },
        sex: 'F',
      },
    ],
  },

  // Triglicérides — SBC 2017/2025 permite dosagem não-jejum com corte distinto
  // (<175 mg/dL pós-prandial). Marcamos `preferred` para indicar que a faixa
  // padrão é de jejum, mas não bloqueamos interpretação em não-jejum.
  Triglycerides: {
    default: {
      fastingRequired: 'preferred',
      max: 150,
      min: 0,
      optimalMax: 100,
      optimalMin: 0,
      unit: 'mg/dL',
    },
    direction: 'lower-better',
    source: 'sbc-lipids-2025',
  },

  // TroponinI: 0.04 ng/mL = percentil 99 (ensaio Siemens TnI-Ultra)
  TroponinI: {
    default: { max: 0.04, min: 0, optimalMax: 0.02, optimalMin: 0, unit: 'ng/mL' },
    source: 'keller-tni-2013',
  },

  // TroponinT: 14 ng/L = percentil 99 hs-cTnT (ensaio Roche Elecsys 5ª geração)
  TroponinT: {
    default: { max: 14, min: 0, optimalMax: 10, optimalMin: 0, unit: 'ng/L' },
    source: 'giannitsis-hstnt-2010',
  },

  // TSH — 0.4–4.0 é a faixa de referência adulta geral. O alvo 2.5 µIU/mL é
  // específico do 1º trimestre gestacional (ATA 2017) e não se aplica a
  // não-gestantes; optimalMax=3.0 reflete o limite superior do tercil "ótimo"
  // sem invadir a faixa subclínica. Variante ageMin=65 mantém limite superior
  // expandido (tolerância fisiológica do eixo em idosos, SBEM 2013).
  TSH: {
    default: { max: 4.0, min: 0.4, optimalMax: 3.0, optimalMin: 1.0, unit: 'uIU/mL' },
    source: 'sbem-thyroid-2013',
    variants: [
      // Variantes gestacionais (ATA 2017 / SBEM): supressão fisiológica por hCG
      // no 1º trimestre, recuperação progressiva no 2º/3º. Trimestre-específicas
      // precedem a catch-all; catch-all cobre contexto gestante sem trimestre
      // conhecido.
      // optimalMin/optimalMax definem subfaixa "alvo" mais estreita que o
      // intervalo de referência — ex.: 1º tri aceita 0.1–2.5, mas o alvo
      // terapêutico é 0.5–2.5.
      {
        pregnant: true,
        pregnancyTrimester: 1,
        range: { max: 2.5, min: 0.1, optimalMax: 2.0, optimalMin: 0.5, unit: 'uIU/mL' },
        sex: 'F',
      },
      {
        pregnant: true,
        pregnancyTrimester: 2,
        range: { max: 3.0, min: 0.2, optimalMax: 2.5, optimalMin: 0.5, unit: 'uIU/mL' },
        sex: 'F',
      },
      {
        pregnant: true,
        pregnancyTrimester: 3,
        range: { max: 3.0, min: 0.3, optimalMax: 2.5, optimalMin: 0.5, unit: 'uIU/mL' },
        sex: 'F',
      },
      // Catch-all gestacional — usada quando o trimestre não é informado.
      // Adota a faixa mais conservadora (2º/3º trimestre: 0.2–3.0).
      {
        pregnant: true,
        range: { max: 3.0, min: 0.2, optimalMax: 2.5, optimalMin: 0.5, unit: 'uIU/mL' },
        sex: 'F',
      },
      {
        ageMin: 65,
        range: { max: 6.0, min: 0.4, optimalMax: 4.0, optimalMin: 1.0, unit: 'uIU/mL' },
        sex: 'all',
      },
    ],
  },

  // Ureia — convenção brasileira (laboratórios reportam Ureia, não BUN).
  // Faixa adulta de 15-50 mg/dL (Ureia ≈ BUN × 2,14). Limites anteriores
  // (7-20 mg/dL) refletiam BUN/Nitrogênio Ureico, gerando falsos diagnósticos
  // de azotemia em pacientes com Ureia normal. LOINC 3094-0 (BUN) também
  // deve ser revisto em biomarkers.ts — ver issue #41.
  Urea: {
    default: { max: 50, min: 15, optimalMax: 40, optimalMin: 20, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  UricAcid: {
    default: { max: 7.0, min: 2.5, optimalMax: 5.5, optimalMin: 3.0, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 7.0, min: 3.4, optimalMax: 6.0, optimalMin: 4.0, unit: 'mg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 6.0, min: 2.4, optimalMax: 5.0, optimalMin: 3.0, unit: 'mg/dL' },
        sex: 'F',
      },
    ],
  },

  Urobilinogen_Urine: {
    default: { max: 1.0, min: 0.1, optimalMax: 1.0, optimalMin: 0.1, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  pH_Urine: {
    default: { max: 8.0, min: 4.5, optimalMax: 7.0, optimalMin: 5.5, unit: 'pH' },
    source: 'tietz-7ed-2015',
  },

  HyalineCasts_Urine: {
    default: { max: 2, min: 0, optimalMax: 1, optimalMin: 0, unit: '/LPF' },
    source: 'tietz-7ed-2015',
  },

  RBC_Urine: {
    default: { max: 3, min: 0, optimalMax: 1, optimalMin: 0, unit: '/HPF' },
    source: 'tietz-7ed-2015',
  },

  SquamousEpithelial_Urine: {
    default: { max: 15, min: 0, optimalMax: 5, optimalMin: 0, unit: '/HPF' },
    source: 'tietz-7ed-2015',
  },

  Leukocytes_Urine: {
    default: { max: 5, min: 0, optimalMax: 2, optimalMin: 0, unit: '/HPF' },
    source: 'tietz-7ed-2015',
  },

  Folate: {
    default: { max: 20, min: 3.9, optimalMax: 17, optimalMin: 5, unit: 'ng/mL' },
    source: 'tietz-7ed-2015',
  },

  VitaminA: {
    default: { max: 100, min: 20, optimalMax: 80, optimalMin: 30, unit: 'mcg/dL' },
    source: 'tietz-7ed-2015',
  },

  VitaminB1: {
    default: { max: 180, min: 70, optimalMax: 150, optimalMin: 80, unit: 'nmol/L' },
    source: 'tietz-7ed-2015',
  },

  VitaminB12: {
    default: { max: 900, min: 200, optimalMax: 800, optimalMin: 400, unit: 'pg/mL' },
    source: 'tietz-7ed-2015',
  },

  VitaminB6: {
    default: { max: 50, min: 5, optimalMax: 40, optimalMin: 10, unit: 'ng/mL' },
    source: 'tietz-7ed-2015',
  },

  VitaminC: {
    default: { max: 2.0, min: 0.4, optimalMax: 1.5, optimalMin: 0.6, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  // Vitamina D — posicionamento conjunto SBEM/SBPC-ML 2017:
  // ≥20 ng/mL é desejável para população saudável <60 anos
  // ≥30 ng/mL é recomendado para grupos de risco (idosos, gestantes, DRC,
  // osteoporose, hiperparatireoidismo secundário).
  // A variante ageMin=60 cobre idosos. Gestação, doença renal crônica,
  // osteoporose e hiperparatireoidismo secundário também exigem min=30;
  // o tipo `BiomarkerReferenceRange` atual não expressa esses contextos
  // clínicos além de gestação e idade, portanto consumidores devem aplicar
  // o limiar ≥30 nessas populações quando souberem a comorbidade. Gestação
  // será modelada quando `pregnant: true` — aceita-se TODO até lá.
  // TODO(PR-vitd-pregnancy): adicionar variante `pregnant: true` com min=30
  // quando a modelagem de comorbidades chegar ao schema.
  VitaminD: {
    default: { max: 100, min: 20, optimalMax: 70, optimalMin: 40, unit: 'ng/mL' },
    source: 'ferreira-vitd-2017',
    variants: [
      {
        ageMin: 60,
        range: { max: 100, min: 30, optimalMax: 70, optimalMin: 40, unit: 'ng/mL' },
        sex: 'all',
      },
    ],
  },

  VitaminD_1_25: {
    default: { max: 72, min: 18, optimalMax: 60, optimalMin: 25, unit: 'pg/mL' },
    source: 'tietz-7ed-2015',
  },

  VitaminE: {
    default: { max: 17, min: 5.5, optimalMax: 14, optimalMin: 7, unit: 'mg/L' },
    source: 'tietz-7ed-2015',
  },

  // VLDL — estimado clinicamente via TG/5 (método Friedewald). O corte de
  // referência deriva de triglicérides <150 mg/dL (SBC 2025, dislipidemias),
  // portanto VLDL <30. Friedewald-1972 permanece registrada como fonte do
  // método de cálculo, mas a faixa de referência tem respaldo na diretriz
  // SBC 2025.
  VLDL: {
    default: { max: 30, min: 2, optimalMax: 20, optimalMin: 5, unit: 'mg/dL' },
    source: 'sbc-lipids-2025',
  },

  WBC: {
    default: { max: 11.0, min: 4.0, optimalMax: 8.0, optimalMin: 5.0, unit: 'K/uL' },
    source: 'pns-hemograma-2019',
  },

  Zinc: {
    default: { max: 120, min: 60, optimalMax: 100, optimalMin: 70, unit: 'mcg/dL' },
    source: 'tietz-7ed-2015',
  },

  AndroidFatPct: {
    default: { max: 35, min: 10, optimalMax: 25, optimalMin: 15, unit: '%' },
    direction: 'lower-better',
    source: 'kelly-dxa-2009',
    variants: [
      {
        ageMin: 18,
        range: { max: 30, min: 10, optimalMax: 22, optimalMin: 12, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 42, min: 15, optimalMax: 32, optimalMin: 20, unit: '%' },
        sex: 'F',
      },
    ],
  },

  AndroidGynoidRatio: {
    default: { max: 1.2, min: 0.5, optimalMax: 1.0, optimalMin: 0.6, unit: '' },
    direction: 'lower-better',
    source: 'kelly-dxa-2009',
    variants: [
      {
        ageMin: 18,
        range: { max: 1.2, min: 0.6, optimalMax: 1.0, optimalMin: 0.7, unit: '' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 1.0, min: 0.4, optimalMax: 0.8, optimalMin: 0.5, unit: '' },
        sex: 'F',
      },
    ],
  },

  BMC: {
    default: { max: 3.5, min: 2.0, optimalMax: 3.2, optimalMin: 2.3, unit: 'kg' },
    direction: 'higher-better',
    source: 'kelly-dxa-2009',
    variants: [
      {
        ageMin: 18,
        range: { max: 4.0, min: 2.5, optimalMax: 3.5, optimalMin: 2.8, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 3.0, min: 1.8, optimalMax: 2.7, optimalMin: 2.0, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  // BodyFatPct — Age-bracketed ranges from Gallagher et al. Am J Clin Nutr 2000;72:694-701
  // (PMID: 10966886) and ACSM Guidelines for Exercise Testing, 11th Ed (2021)
  BodyFatPct: {
    default: { max: 30, min: 10, optimalMax: 25, optimalMin: 15, unit: '%' },
    direction: 'lower-better',
    source: 'gallagher-bodyfat-2000',
    variants: [
      // Men — age brackets
      {
        ageMax: 25,
        ageMin: 18,
        range: { max: 25, min: 5, optimalMax: 20, optimalMin: 10, unit: '%' },
        sex: 'M',
      },
      {
        ageMax: 35,
        ageMin: 26,
        range: { max: 26, min: 5, optimalMax: 21, optimalMin: 11, unit: '%' },
        sex: 'M',
      },
      {
        ageMax: 45,
        ageMin: 36,
        range: { max: 27, min: 5, optimalMax: 22, optimalMin: 12, unit: '%' },
        sex: 'M',
      },
      {
        ageMax: 55,
        ageMin: 46,
        range: { max: 28, min: 5, optimalMax: 23, optimalMin: 13, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 56,
        range: { max: 29, min: 5, optimalMax: 24, optimalMin: 14, unit: '%' },
        sex: 'M',
      },
      // Women — age brackets
      {
        ageMax: 25,
        ageMin: 18,
        range: { max: 32, min: 13, optimalMax: 28, optimalMin: 18, unit: '%' },
        sex: 'F',
      },
      {
        ageMax: 35,
        ageMin: 26,
        range: { max: 33, min: 13, optimalMax: 29, optimalMin: 18, unit: '%' },
        sex: 'F',
      },
      {
        ageMax: 45,
        ageMin: 36,
        range: { max: 34, min: 13, optimalMax: 30, optimalMin: 19, unit: '%' },
        sex: 'F',
      },
      {
        ageMax: 55,
        ageMin: 46,
        range: { max: 35, min: 13, optimalMax: 31, optimalMin: 20, unit: '%' },
        sex: 'F',
      },
      {
        ageMin: 56,
        range: { max: 36, min: 13, optimalMax: 32, optimalMin: 20, unit: '%' },
        sex: 'F',
      },
    ],
  },

  FatFreeMass: {
    default: { max: 80, min: 40, optimalMax: 70, optimalMin: 45, unit: 'kg' },
    direction: 'higher-better',
    source: 'kelly-dxa-2009',
    variants: [
      {
        ageMin: 18,
        range: { max: 90, min: 50, optimalMax: 80, optimalMin: 55, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 60, min: 35, optimalMax: 52, optimalMin: 38, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  FatMass: {
    default: { max: 30, min: 5, optimalMax: 20, optimalMin: 8, unit: 'kg' },
    direction: 'lower-better',
    source: 'kelly-dxa-2009',
    variants: [
      {
        ageMin: 18,
        range: { max: 25, min: 5, optimalMax: 18, optimalMin: 7, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 30, min: 8, optimalMax: 22, optimalMin: 10, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  GynoidFatPct: {
    default: { max: 45, min: 15, optimalMax: 35, optimalMin: 20, unit: '%' },
    direction: 'lower-better',
    source: 'kelly-dxa-2009',
    variants: [
      {
        ageMin: 18,
        range: { max: 35, min: 12, optimalMax: 28, optimalMin: 15, unit: '%' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 50, min: 20, optimalMax: 40, optimalMin: 25, unit: '%' },
        sex: 'F',
      },
    ],
  },

  LeanMass: {
    default: { max: 75, min: 35, optimalMax: 65, optimalMin: 40, unit: 'kg' },
    direction: 'higher-better',
    source: 'kelly-dxa-2009',
    variants: [
      {
        ageMin: 18,
        range: { max: 85, min: 45, optimalMax: 75, optimalMin: 50, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 55, min: 30, optimalMax: 48, optimalMin: 35, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  TotalMass: {
    default: { max: 100, min: 50, optimalMax: 85, optimalMin: 55, unit: 'kg' },
    source: 'kelly-dxa-2009',
    variants: [
      {
        ageMin: 18,
        range: { max: 100, min: 55, optimalMax: 90, optimalMin: 60, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 85, min: 45, optimalMax: 75, optimalMin: 50, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  VATMass: {
    default: { max: 1.5, min: 0, optimalMax: 0.8, optimalMin: 0, unit: 'kg' },
    direction: 'lower-better',
    source: 'ofenheimer-vat-2020',
    variants: [
      {
        ageMin: 18,
        range: { max: 1.5, min: 0, optimalMax: 1.0, optimalMin: 0, unit: 'kg' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 1.0, min: 0, optimalMax: 0.5, optimalMin: 0, unit: 'kg' },
        sex: 'F',
      },
    ],
  },

  VATVolume: {
    default: {
      max: 852,
      min: 0,
      optimalMax: 600,
      optimalMin: 0,
      unit: 'cm³',
      warningMax: 1837,
    },
    direction: 'lower-better',
    source: 'ge-corescan',
  },

  BMD_Total: {
    default: { max: 1.4, min: 0.9, optimalMax: 1.3, optimalMin: 1.0, unit: 'g/cm²' },
    direction: 'higher-better',
    source: 'who-osteoporosis-1994',
  },

  TScore_Total: {
    default: { max: 4.0, min: -1.0, optimalMax: 2.0, optimalMin: -0.5, unit: '' },
    direction: 'higher-better',
    source: 'who-osteoporosis-1994',
  },

  ZScore_Total: {
    default: { max: 2.0, min: -2.0, optimalMax: 1.0, optimalMin: -1.0, unit: '' },
    direction: 'higher-better',
    source: 'who-osteoporosis-1994',
  },

  Amylase: {
    default: { max: 100, min: 28, optimalMax: 90, optimalMin: 35, unit: 'U/L' },
    source: 'tietz-7ed-2015',
  },

  Creatinine_Urine: {
    default: { max: 300, min: 20, optimalMax: 250, optimalMin: 40, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 300, min: 40, optimalMax: 260, optimalMin: 60, unit: 'mg/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 220, min: 20, optimalMax: 180, optimalMin: 40, unit: 'mg/dL' },
        sex: 'F',
      },
    ],
  },

  IgA: {
    default: { max: 400, min: 70, optimalMax: 350, optimalMin: 100, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  Lipase: {
    default: { max: 60, min: 0, optimalMax: 50, optimalMin: 10, unit: 'U/L' },
    source: 'tietz-7ed-2015',
  },

  Microalbumin_Urine: {
    default: { max: 30, min: 0, optimalMax: 20, optimalMin: 0, unit: 'mg/L' },
    source: 'kdigo-ckd-2024',
  },

  PSA_Free: {
    default: { max: 1.5, min: 0, optimalMax: 1.0, optimalMin: 0, unit: 'ng/mL' },
    source: 'sturgeon-nacb-2008',
  },

  // Relação PSA livre/total — `higher-better`: razão maior = menor risco de
  // câncer de próstata, logo não há limite superior "ruim" (acima do normal é
  // verde). Faixas alinhadas à tabela clínica: ≥25% baixo risco (verde),
  // 10–25% atenção — intermediário/moderado (âmbar), <10% alto risco >50%
  // (vermelho). Limites: `min` (25) é o piso do verde e `warningMin` (10) o
  // piso do âmbar — o vermelho é estritamente abaixo de 10% (< 10%); 10%
  // pertence ao âmbar, conforme a faixa "10–15% moderado" da tabela.
  PSA_FreeRatio: {
    default: { max: 100, min: 25, optimalMax: 100, optimalMin: 30, unit: '%', warningMin: 10 },
    direction: 'higher-better',
    source: 'sturgeon-nacb-2008',
  },

  // BMI - WHO classification: 18.5–24.9 normal, 25–29.9 overweight, ≥30 obese
  BMI: {
    default: { max: 24.9, min: 18.5, optimalMax: 24.9, optimalMin: 18.5, unit: 'kg/m2' },
    source: 'who-obesity-2000',
  },

  // eAG — Estimated Average Glucose, derivada da HbA1c pela fórmula ADAG:
  // eAG (mg/dL) = 28,7 × HbA1c(%) − 46,7 (NATHAN, D. M. et al. Translating the
  // A1C assay into estimated average glucose values. Diabetes Care, v. 31, n. 8,
  // p. 1473-1478, 2008. DOI: 10.2337/dc08-0545).
  //
  // As faixas espelham os cortes diagnósticos de HbA1c da SBD (ver entrada
  // `HbA1c`) convertidos por essa fórmula, mantendo a eAG coerente com o
  // marcador de origem:
  //   optimalMax 105  ← HbA1c 5,3 % (teto do controle ótimo)
  //   max        117  ← HbA1c 5,7 % (teto do não diabético → início do pré-diabetes)
  //   warningMax 137  ← HbA1c 6,4 % (teto do pré-diabetes → acima disso, diabetes)
  //
  // Substitui a faixa anterior (optimalMax 126 = corte de glicemia de jejum;
  // max 154 = meta terapêutica do diabético, HbA1c 7 %), que classificava como
  // "Normal" valores já pré-diabéticos e diabéticos.
  eAG: {
    default: { max: 117, min: 70, optimalMax: 105, optimalMin: 70, unit: 'mg/dL', warningMax: 137 },
    source: 'sbd-diabetes-2024',
  },

  // INR - International Normalized Ratio (non-anticoagulated patients)
  INR: {
    default: { max: 1.2, min: 0.8, optimalMax: 1.1, optimalMin: 0.9, unit: 'ratio' },
    source: 'tietz-7ed-2015',
  },

  // Prothrombin Time
  ProthrombinTime: {
    default: { max: 13.5, min: 11, optimalMax: 13, optimalMin: 11, unit: 'seconds' },
    source: 'tietz-7ed-2015',
  },

  // DHT - Dihydrotestosterone (adult male reference; female values are much lower)
  DHT: {
    default: { max: 85, min: 30, optimalMax: 85, optimalMin: 30, unit: 'ng/dL' },
    source: 'tietz-7ed-2015',
    variants: [
      {
        ageMin: 18,
        range: { max: 85, min: 30, optimalMax: 85, optimalMin: 30, unit: 'ng/dL' },
        sex: 'M',
      },
      {
        ageMin: 18,
        range: { max: 22, min: 4, optimalMax: 22, optimalMin: 4, unit: 'ng/dL' },
        sex: 'F',
      },
    ],
  },

  // Total IgE - higher values suggest atopy/allergic sensitization
  IgE_Total: {
    default: { max: 100, min: 0, optimalMax: 100, optimalMin: 0, unit: 'IU/mL' },
    direction: 'lower-better',
    source: 'tietz-7ed-2015',
  },

  // IgG - Immunoglobulin G
  IgG: {
    default: { max: 1600, min: 700, optimalMax: 1600, optimalMin: 700, unit: 'mg/dL' },
    source: 'tietz-7ed-2015',
  },

  // IgE E1 Cat Dander - Class 0 (≤0.35 kU/L) = negative
  IgE_E1_CatDander: {
    default: { max: 0.35, min: 0, optimalMax: 0.35, optimalMin: 0, unit: 'kU/L' },
    direction: 'lower-better',
    source: 'tietz-7ed-2015',
  },

  // IgE GX1 Grasses - Class 0 (≤0.35 kU/L) = negative
  IgE_GX1_Grasses: {
    default: { max: 0.35, min: 0, optimalMax: 0.35, optimalMin: 0, unit: 'kU/L' },
    direction: 'lower-better',
    source: 'tietz-7ed-2015',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Legacy flat reference ranges for backward compatibility
 * This is derived from biomarkerRangeDefinitions defaults
 */
export const defaultReferenceRanges: Record<string, BiomarkerReferenceRange> = Object.fromEntries(
  Object.entries(biomarkerRangeDefinitions).map(([code, def]) => [
    code,
    def.source ? { ...def.default, source: def.source } : def.default,
  ]),
);

/**
 * Get the reference range for a biomarker code, optionally personalized for user context
 * @param testCode - The biomarker code (e.g., "HDL", "Testosterone")
 * @param context - Optional user context for personalized ranges
 * @returns Reference range or undefined if not found
 */
export function getReferenceRange(
  testCode: string,
  context?: ReferenceRangeContext,
): BiomarkerReferenceRange | undefined {
  const definition = biomarkerRangeDefinitions[testCode];
  if (!definition) return undefined;

  const withSource = (range: BiomarkerReferenceRange): BiomarkerReferenceRange =>
    definition.source ? { ...range, source: definition.source } : range;

  // If no context or no variants, return default
  if (!context || !definition.variants || definition.variants.length === 0) {
    return withSource(definition.default);
  }

  const { age, biologicalSex, pregnancyTrimester, pregnant } = context;

  // Detect whether the biomarker has pregnancy-specific variants at all.
  // Se o biomarcador não modela gestação, uma usuária gestante deve continuar
  // recebendo a variante por sexo/idade (mais informativa que o default). Apenas
  // quando existe ao menos uma variante gestacional é que bloqueamos as variantes
  // não-gestacionais para contextos gestantes — evitando mistura de faixas.
  //
  // Precedência quando pregnant=true: variantes gestacionais têm precedência
  // absoluta sobre variantes etárias. Uma gestante de 65+ anos consultando
  // TSH recebe a faixa gestacional, não a variante ageMin=65. Isto é
  // intencional — em gestação, o eixo HPG domina sobre o envelhecimento
  // fisiológico. Casos raros de gestação pós-menopausa (FIV) seguem essa
  // regra; o consumidor que precise distinguir deve aplicar lógica de
  // contexto adicional.
  //
  // Tratamento de `pregnant: undefined` vs `false`: ambos são tratados como
  // "não-gestante" (fallback seguro). O consumidor deve setar pregnant: true
  // explicitamente para ativar variantes gestacionais; contexto sem a flag
  // recebe a faixa padrão da população geral.
  const hasPregnancyVariant = definition.variants.some((v) => v.pregnant === true);

  // Find matching variant (first match wins — more specific variants must be
  // listed first). Ordem obrigatória quando há variantes gestacionais:
  //   1. variantes trimestre-específicas (pregnant=true + pregnancyTrimester=N)
  //   2. catch-all gestacional (pregnant=true, sem trimester)
  //   3. variantes por sexo/idade não-gestacionais
  // Reordenar quebraria o matching; a verificação `variant.pregnancyTrimester
  // !== pregnancyTrimester` depende da catch-all vir por último.
  for (const variant of definition.variants) {
    if (variant.pregnant === true) {
      if (!pregnant) continue;
      // Variante com trimestre específico só casa quando o contexto também
      // especifica o mesmo trimestre. Variantes gestacionais sem trimestre
      // (catch-all) casam com qualquer contexto gestante, servindo de fallback.
      if (
        variant.pregnancyTrimester !== undefined &&
        variant.pregnancyTrimester !== pregnancyTrimester
      ) {
        continue;
      }
    } else if (pregnant && hasPregnancyVariant) {
      // Só pulamos variantes não-gestacionais se o biomarcador tem variantes
      // gestacionais; caso contrário, a variante por sexo/idade é aplicável.
      continue;
    }

    // Check sex match ('all' matches everyone)
    if (variant.sex !== 'all' && variant.sex !== biologicalSex) {
      continue;
    }

    // Check age range
    if (variant.ageMin !== undefined && (age === undefined || age < variant.ageMin)) {
      continue;
    }
    if (variant.ageMax !== undefined && (age === undefined || age > variant.ageMax)) {
      continue;
    }

    return withSource(variant.range);
  }

  // No matching variant found - return default
  return withSource(definition.default);
}

/**
 * Get the range direction for a biomarker code.
 * Returns 'range' (default) if not specified.
 */
export function getRangeDirection(testCode: string): RangeDirection {
  return biomarkerRangeDefinitions[testCode]?.direction ?? 'range';
}

/**
 * Get fallback reference range for a biomarker code (default only, no personalization)
 * Used by API when LLM doesn't extract reference values
 * @param biomarkerCode - The biomarker code
 * @returns Reference range with min/max/unit or undefined
 */
export function getFallbackReferenceRange(
  biomarkerCode: string,
): { min: number; max: number; unit: string } | undefined {
  const definition = biomarkerRangeDefinitions[biomarkerCode];
  if (!definition || definition.default.min === undefined || definition.default.max === undefined) {
    return undefined;
  }
  return {
    max: definition.default.max,
    min: definition.default.min,
    unit: definition.default.unit,
  };
}

/**
 * Apply fallback reference ranges to biomarkers that are missing them
 * @param biomarkers - Array of parsed biomarkers
 * @returns Count of biomarkers that received fallback references
 */
export function applyFallbackReferenceRanges<
  T extends {
    code: string;
    referenceMin?: number | null;
    referenceMax?: number | null;
    unit?: string;
  },
>(biomarkers: T[]): number {
  let fallbackCount = 0;

  for (const biomarker of biomarkers) {
    // Skip if already has reference values
    if (biomarker.referenceMin != null && biomarker.referenceMax != null) {
      continue;
    }

    const fallback = getFallbackReferenceRange(biomarker.code);
    if (fallback) {
      // Only apply if units are compatible or biomarker has no unit
      const canonicalUnit = getCanonicalUnitForCode(biomarker.code);
      const unitsMatch =
        !biomarker.unit ||
        biomarker.unit.toLowerCase() === fallback.unit.toLowerCase() ||
        (canonicalUnit && biomarker.unit.toLowerCase() === canonicalUnit.toLowerCase()) ||
        // Handle common unit variations
        (biomarker.unit === '%' && fallback.unit === '%');

      if (unitsMatch) {
        if (biomarker.referenceMin == null) {
          biomarker.referenceMin = fallback.min;
        }
        if (biomarker.referenceMax == null) {
          biomarker.referenceMax = fallback.max;
        }
        fallbackCount++;
      }
    }
  }

  return fallbackCount;
}
