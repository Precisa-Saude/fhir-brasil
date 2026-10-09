/**
 * Biomarker Definitions - Single Source of Truth
 *
 * This file defines all supported biomarkers with:
 * - LOINC codes (canonical identifier for cross-language matching)
 * - Internal codes (for UI display)
 * - Portuguese and English names
 * - Categories
 * - Default units
 *
 * The LLM extraction prompt includes these definitions so it can output
 * LOINC codes directly, eliminating the need for name-matching logic.
 */

/**
 * Um código LOINC irmão do da entrada, que difere só no eixo Method.
 *
 * O `loinc` da entrada é o código sem método, e continua sendo o padrão: a
 * variante só vale quando o laudo afirma o método por escrito. Separado de
 * `loincAliases`, que quer dizer "código antigo para a mesma coisa".
 */
import type { DiagnosticSection } from './diagnostic-sections';

export interface MethodVariant {
  /**
   * Trechos que afirmam o método, comparados por token inteiro como as grafias
   * de `names`, na linha do exame e nas seguintes até o próximo exame. Só entra
   * pista que aparece em laudo real; variante sem pista com evidência fica com
   * as listas vazias e não é escolhida pela varredura.
   */
  cues: { en: string[]; pt: string[] };
  loinc: string;
  /** O texto da parte Method do LOINC, como o snapshot a registra. */
  method: string;
  /** Por que este código, e de onde veio a pista. */
  note?: string;
}

export interface BiomarkerDefinition {
  /**
   * Região do corpo (SNOMED CT) que vai em `Observation.bodySite`, quando o
   * código LOINC não diz o sítio. A densidade óssea por DXA usa o 46383-6, cujo
   * sistema é `XXX>Bone` (osso, sítio não especificado), para as oito regiões
   * do corpo inteiro; a região sai aqui. Ver PRE-494.
   */
  bodySite?: { code: string; display: string };
  code: string;
  codeAliases?: string[];
  hidden?: boolean; // If true, biomarker is extracted but not shown in UI
  loinc?: string; // Optional - some DEXA regional metrics don't have official LOINC codes
  loincAliases?: string[];
  /** Ver `MethodVariant`. */
  methodVariants?: MethodVariant[];
  names: {
    en: string[];
    pt: string[];
  };
  /**
   * Seção de serviço diagnóstico (v2-0074), declarada só onde a classe do LOINC
   * não a dá: exame sem LOINC (densitometria, escore de cálcio, bioimpedância)
   * ou código cuja classe não é a seção em que o laudo o imprime. Ver
   * `diagnostic-sections.ts`.
   */
  section?: DiagnosticSection;
  sex?: 'male' | 'female' | 'both';
  unit?: string;
}

/** @deprecated Use `BiomarkerDefinition` instead */
export type SupportedBiomarker = BiomarkerDefinition;

/**
 * All supported biomarker definitions
 */
export const BIOMARKER_DEFINITIONS: BiomarkerDefinition[] = [
  // ============================================================================
  // HEART / CORACAO
  // ============================================================================
  {
    code: 'ApoB',
    loinc: '1884-6',
    names: {
      en: ['Apolipoprotein B', 'ApoB'],
      pt: ['Apolipoproteína B', 'ApoB'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'HDL',
    loinc: '2085-9',
    names: {
      en: ['HDL Cholesterol', 'HDL', 'High-Density Lipoprotein'],
      pt: ['Colesterol HDL', 'HDL', 'HDL-Colesterol'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'HDL_Large',
    loinc: '43729-3',
    names: {
      en: ['HDL Large', 'Large HDL Particles'],
      pt: ['HDL Grande', 'Partículas HDL Grandes'],
    },
    unit: 'nmol/L',
  },
  {
    code: 'CRP',
    loinc: '1988-5',
    names: {
      en: [
        'C-Reactive Protein',
        'CRP',
        'hs-CRP',
        'High-Sensitivity CRP',
        'HS CRP',
        'CRP High Sensitivity',
      ],
      pt: ['Proteína C-Reativa', 'PCR', 'PCR-as', 'PCR Ultrassensível'],
    },
    unit: 'mg/L',
  },
  {
    code: 'LDL',
    loinc: '2089-1',
    // Os três irmãos de 2089-1 no eixo Method, conferidos ativos em out/2026.
    // Medido em três dezenas de laudos reais, a única pista escrita foi a
    // nota de rodapé de um laboratório norte-americano que declara o cálculo de
    // Martin-Hopkins. Nenhum laudo brasileiro do corpus imprimiu "calculado",
    // "direto" ou "Método:" perto do LDL, e por isso as outras duas variantes
    // ficam sem pista até aparecer laudo que as afirme.
    methodVariants: [
      {
        cues: { en: ['calculated using the Martin-Hopkins'], pt: [] },
        loinc: '96259-7',
        method: 'Calculated.Martin-Hopkins',
        note: 'Rodapé "LDL-C is now calculated using the Martin-Hopkins calculation", que menciona Friedewald só para comparar. Por isso a pista é a frase afirmativa, e não o nome do método.',
      },
      {
        cues: { en: [], pt: [] },
        loinc: '13457-7',
        method: 'Calculated',
        note: 'Friedewald. Sem pista: nenhum laudo do corpus afirmou o cálculo por escrito.',
      },
      {
        cues: { en: [], pt: [] },
        loinc: '18262-6',
        method: 'Direct assay',
        note: 'Dosagem direta. Sem pista: nenhum laudo do corpus afirmou o método por escrito.',
      },
    ],
    names: {
      en: ['LDL Cholesterol', 'LDL', 'Low-Density Lipoprotein'],
      pt: ['Colesterol LDL', 'LDL', 'LDL-Colesterol'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'LDL_Medium',
    // 96735-6 é "in Serum" só, enquanto as vizinhas LDL_Small (43727-7),
    // LDL_ParticleNumber (54434-6) e HDL_Large (43729-3) são Ser/Plas. É o
    // único código para a subfração média, e o perfil por RMN roda em soro.
    // Material registrado de propósito.
    loinc: '96735-6',
    names: {
      en: ['LDL Medium', 'Medium LDL Particles'],
      pt: ['LDL Médio', 'Partículas LDL Médias'],
    },
    unit: 'nmol/L',
  },
  {
    code: 'LDL_ParticleNumber',
    codeAliases: ['LDL_Particle_Number'],
    loinc: '54434-6',
    names: {
      en: ['LDL Particle Number', 'LDL-P'],
      pt: ['Número de Partículas LDL', 'LDL-P'],
    },
    unit: 'nmol/L',
  },
  {
    code: 'LDL_Pattern',
    loinc: '35505-7',
    names: {
      en: ['LDL Pattern', 'LDL Particle Pattern'],
      pt: ['Padrão LDL', 'Padrão de Partículas LDL'],
    },
  },
  {
    code: 'LDL_Peak_Size',
    loinc: '17782-4',
    names: {
      en: ['LDL Peak Size', 'LDL Particle Size'],
      pt: ['Tamanho de Pico LDL', 'Tamanho de Partícula LDL'],
    },
    unit: 'Angstrom',
  },
  {
    code: 'LDL_Small',
    loinc: '43727-7',
    names: {
      en: ['LDL Small', 'Small Dense LDL'],
      pt: ['LDL Pequeno', 'LDL Denso Pequeno'],
    },
    unit: 'nmol/L',
  },
  {
    // LOINC 43583-4 = "Lipoprotein a [Moles/volume] in Serum or Plasma" (nmol/L).
    // Anteriormente 10835-7 ("Lipoprotein a [Mass/volume]", mg/dL),
    // incompatível com a unidade nmol/L declarada. SBC 2025 recomenda
    // ensaio independente de isoforma reportado em nmol/L.
    code: 'Lipoprotein_a',
    loinc: '43583-4',
    names: {
      en: ['Lipoprotein (a)', 'Lipoprotein(a)', 'Lp(a)'],
      pt: ['Lipoproteína (a)', 'Lipoproteína(a)', 'Lp(a)'],
    },
    unit: 'nmol/L',
  },
  {
    code: 'NonHDL_Cholesterol',
    codeAliases: ['UNKNOWN_Colesterol_no_HDL', 'UNKNOWN_Colesterol_No_HDL'],
    loinc: '43396-1',
    names: {
      en: ['Non-HDL Cholesterol', 'Non HDL Cholesterol', 'NonHDL Cholesterol', 'Non-HDL-C'],
      pt: ['Colesterol Não-HDL', 'Colesterol no HDL', 'Colesterol não HDL', 'Colesterol Non-HDL'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'Cholesterol',
    loinc: '2093-3',
    names: {
      en: ['Total Cholesterol', 'Cholesterol', 'Cholesterol, Total'],
      pt: ['Colesterol Total', 'Colesterol'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'Cholesterol_HDL_Ratio',
    codeAliases: ['CholHDL_Ratio'],
    loinc: '9830-1',
    names: {
      en: [
        'Total Cholesterol / HDL Ratio',
        'Cholesterol/HDL Ratio',
        'Chol/HDL Ratio',
        'CholHDL Ratio',
        'Cholesterol HDL Ratio',
        'Chol/HDLC Ratio',
        'CHOL/HDLC RATIO',
      ],
      pt: ['Razão Colesterol Total / HDL', 'Razão Colesterol/HDL'],
    },
    unit: 'razão',
  },
  {
    code: 'Triglycerides',
    loinc: '2571-8',
    names: {
      en: ['Triglycerides'],
      pt: ['Triglicerídeos', 'Triglicérides'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'VLDL',
    codeAliases: ['VLDL_Cholesterol'],
    loinc: '13458-5',
    names: {
      en: ['VLDL Cholesterol', 'VLDL'],
      pt: ['Colesterol VLDL', 'VLDL'],
    },
    unit: 'mg/dL',
  },

  // ============================================================================
  // CORONARY ARTERY CALCIUM (CAC) SCORE
  // ============================================================================
  {
    code: 'CAC',
    hidden: true,
    names: {
      en: [
        'Coronary Artery Calcium Score',
        'CAC Score',
        'Calcium Score',
        'Agatston Score',
        'Total Agatston Score',
        'CT Calcium Score',
        'Total Coronary Calcium Score',
      ],
      pt: [
        'Escore de Cálcio Coronariano',
        'Escore de Cálcio',
        'Escore CAC',
        'Escore Agatston',
        'Escore de Cálcio Total',
        'Cálcio Coronariano',
      ],
    },
    section: 'CT',
    unit: 'AU',
  },
  {
    code: 'CAC_LMA',
    hidden: true,
    names: {
      en: ['Left Main Artery Calcium', 'LMA Calcium Score', 'Left Main Calcium'],
      pt: ['Cálcio Tronco Coronária Esquerda', 'Cálcio TCE', 'Cálcio Artéria Coronária Esquerda'],
    },
    section: 'CT',
    unit: 'AU',
  },
  {
    code: 'CAC_LAD',
    hidden: true,
    names: {
      en: ['Left Anterior Descending Calcium', 'LAD Calcium Score', 'LAD Calcium'],
      pt: [
        'Cálcio Descendente Anterior Esquerda',
        'Cálcio DA',
        'Cálcio Artéria Descendente Anterior',
      ],
    },
    section: 'CT',
    unit: 'AU',
  },
  {
    code: 'CAC_LCX',
    hidden: true,
    names: {
      en: ['Left Circumflex Calcium', 'LCX Calcium Score', 'LCX Calcium', 'Circumflex Calcium'],
      pt: ['Cálcio Circunflexa', 'Cálcio CX', 'Cálcio Artéria Circunflexa'],
    },
    section: 'CT',
    unit: 'AU',
  },
  {
    code: 'CAC_RCA',
    hidden: true,
    names: {
      en: ['Right Coronary Artery Calcium', 'RCA Calcium Score', 'RCA Calcium'],
      pt: ['Cálcio Coronária Direita', 'Cálcio CD', 'Cálcio Artéria Coronária Direita'],
    },
    section: 'CT',
    unit: 'AU',
  },
  {
    code: 'CAC_Percentile',
    names: {
      en: [
        'CAC Percentile',
        'MESA Percentile',
        'Calcium Score Percentile',
        'Age-Sex-Ethnicity Percentile',
      ],
      pt: ['Percentil CAC', 'Percentil MESA', 'Percentil do Escore de Cálcio'],
    },
    section: 'CT',
    unit: '%',
  },
  {
    code: 'AorticValveCalcium',
    hidden: true,
    names: {
      en: ['Aortic Valve Calcium Score', 'Aortic Valve Calcium', 'AVC Score'],
      pt: ['Cálcio Valva Aórtica', 'Escore de Cálcio Valva Aórtica', 'Cálcio Válvula Aórtica'],
    },
    section: 'CT',
    unit: 'AU',
  },

  {
    code: 'ApoA1',
    codeAliases: ['Apolipoprotein_A1'],
    loinc: '1869-7',
    names: {
      en: ['Apolipoprotein A-1', 'ApoA1', 'Apo A-I', 'Apolipoprotein A1'],
      pt: ['Apolipoproteína A-1', 'ApoA1', 'Apo A-I'],
    },
    unit: 'mg/dL',
  },

  // ============================================================================
  // THYROID / TIREOIDE
  // ============================================================================
  {
    code: 'AntiThyroglobulin',
    loinc: '8098-6',
    names: {
      en: [
        'Thyroglobulin Antibodies',
        'Anti-TgAb',
        'TgAb',
        'Anti-Thyroglobulin Antibody',
        'Anti-Thyroglobulin Antibodies',
      ],
      pt: [
        'Anticorpos Anti-Tireoglobulina',
        'Anti-Tg',
        'TgAb',
        'Anti-Tiroglobulina',
        'Antic anti-tiroglobulina',
        'Anticorpos Antitireoglobulina',
      ],
    },
    unit: 'IU/mL',
  },
  {
    code: 'AntiTPO',
    loinc: '8099-4',
    names: {
      en: ['Thyroid Peroxidase Antibodies', 'TPO Antibodies', 'Anti-TPO'],
      pt: [
        'Anticorpos Anti-Peroxidase Tireoidiana',
        'Anticorpos Anti-Peroxidase Tiroidiana',
        'Anti-TPO',
        'TPO',
      ],
    },
    unit: 'IU/mL',
  },
  {
    code: 'TSH',
    loinc: '3016-3',
    names: {
      en: ['Thyroid-Stimulating Hormone', 'TSH', 'Thyrotropin'],
      pt: ['Hormônio Tireoestimulante', 'Hormônio Tiroestimulante', 'TSH', 'Tireotrofina'],
    },
    unit: 'uIU/mL',
  },
  {
    code: 'T4Free',
    loinc: '3024-7',
    names: {
      en: [
        'Thyroxine Free',
        'Free Thyroxine',
        'Free Thyroxine (T4)',
        'Free T4',
        'T4 Free',
        'T4, Free',
        'T4 FREE',
      ],
      pt: ['Tiroxina Livre', 'T4 Livre'],
    },
    unit: 'ng/dL',
  },
  {
    code: 'Thyroglobulin',
    // 3013-0 é a tireoglobulina sérica em massa/volume (ng/mL), a forma que o
    // laboratório reporta. Não a de moles/volume (14918-7) nem os painéis.
    loinc: '3013-0',
    names: {
      en: ['Thyroglobulin', 'Tg'],
      pt: ['Tireoglobulina', 'Tg'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'T3Free',
    loinc: '3051-0',
    names: {
      en: ['Triiodothyronine Free', 'Free T3', 'T3 Free', 'T3, Free', 'T3 FREE'],
      pt: ['Triiodotironina Livre', 'T3 Livre'],
    },
    unit: 'pg/mL',
  },
  {
    code: 'T3Total',
    // 3053-6 é "Triiodothyronine (T3) [Mass/volume] in Serum or Plasma", o T3
    // total, conferido no fhir.loinc.org em out/2026. O catálogo só tinha o
    // livre (3051-0), e o SUS fatura o T3 num código só (SIGTAP 0202060390,
    // "Dosagem de triiodotironina"), que é o total (fhir-brasil#132). Os nomes
    // seguem os do `T4Total`. Sem faixa por enquanto: nenhuma fonte conferida
    // publica o intervalo do T3 total para adultos aqui.
    loinc: '3053-6',
    names: {
      en: ['Triiodothyronine', 'T3 Total', 'Total T3', 'Triiodothyronine (T3)'],
      pt: ['Triiodotironina', 'T3 Total', 'Triiodotironina Total', 'Triiodotironina (T3)'],
    },
    unit: 'ng/dL',
  },
  {
    code: 'T4Total',
    codeAliases: ['Tiroxina_T4', 'Thyroxine_T4_serum'],
    loinc: '3026-2',
    names: {
      en: ['Thyroxine', 'T4 Total', 'Total T4', 'Thyroxine (T4)', 'Thyroxine (T4), serum'],
      pt: ['Tiroxina', 'T4 Total', 'Tiroxina Total', 'Tiroxina (T4)'],
    },
    unit: 'ug/dL',
  },

  // ============================================================================
  // AUTOIMMUNITY / AUTOIMUNIDADE
  // ============================================================================
  {
    code: 'ANA_Screen',
    loinc: '8061-4',
    names: {
      en: ['Antinuclear Antibodies Screen', 'ANA Screen'],
      pt: ['Triagem de Anticorpos Antinucleares', 'FAN Triagem'],
    },
  },
  {
    code: 'RheumatoidFactor',
    loinc: '11572-5',
    names: {
      en: ['Rheumatoid Factor', 'RF'],
      pt: ['Fator Reumatoide', 'FR'],
    },
    unit: 'IU/mL',
  },
  {
    code: 'AntiCCP',
    loinc: '33935-8',
    names: {
      en: [
        'Anti-CCP',
        'CCP Antibody',
        'Cyclic Citrullinated Peptide Antibody',
        'Cyclic Citrullinated Peptide (CCP) Ab, IgG',
        'CCP Ab IgG',
      ],
      pt: [
        'Anti-CCP',
        'Anticorpo Anti-Peptídeo Citrulinado Cíclico',
        'Anti-Peptídeo Citrulinado Cíclico',
      ],
    },
    unit: 'U/mL',
  },
  {
    code: 'MPO_Antibody',
    loinc: '6969-0',
    names: {
      en: [
        'Myeloperoxidase Antibody',
        'MPO Antibody',
        'Myeloperoxidase Antibody (MPO)',
        'Anti-MPO',
      ],
      pt: ['Anticorpo Antimieloperoxidase', 'Anti-MPO'],
    },
    unit: 'AI',
  },
  {
    code: 'pANCA',
    // Título, como a Quest imprime ("<1:20"). Laudo só com negativo ou positivo
    // pediria o 30539-1 (presença); ver o registro de decisão.
    loinc: '32787-4',
    names: {
      en: ['p-ANCA', 'P-ANCA', 'Perinuclear ANCA', 'ANCA, Perinuclear'],
      pt: ['p-ANCA', 'ANCA Perinuclear'],
    },
    unit: 'titer',
  },
  {
    code: 'AntiDsDNA',
    loinc: '5130-0',
    names: {
      en: [
        'Anti-dsDNA',
        'dsDNA Antibody',
        'DNA (DS) Antibody',
        'Double-Stranded DNA Antibody',
        'Anti-DNA (DS)',
      ],
      pt: ['Anti-DNA Nativo', 'Anti-dsDNA', 'Anticorpo Anti-DNA de Dupla Hélice'],
    },
    unit: 'IU/mL',
  },
  {
    code: 'AntiSm',
    loinc: '11090-8',
    names: {
      en: ['Sm Antibody', 'Anti-Sm', 'Smith Antibody'],
      pt: ['Anti-Sm', 'Anticorpo Anti-Sm'],
    },
    unit: 'AI',
  },
  {
    code: 'AntiRNP',
    loinc: '29374-6',
    names: {
      en: ['RNP Antibody', 'Anti-RNP', 'U1-RNP Antibody'],
      pt: ['Anti-RNP', 'Anticorpo Anti-RNP'],
    },
    unit: 'AI',
  },
  {
    code: 'AntiSSA',
    loinc: '17792-3',
    names: {
      en: [
        "Sjogren's Antibody (SS-A)",
        'SS-A Antibody',
        'Anti-SSA',
        'Anti-Ro',
        'SSA (Ro) Antibody',
      ],
      pt: ['Anti-SSA', 'Anti-Ro', 'Anti-SSA (Ro)'],
    },
    unit: 'AI',
  },
  {
    code: 'AntiSSB',
    loinc: '17791-5',
    names: {
      en: [
        "Sjogren's Antibody (SS-B)",
        'SS-B Antibody',
        'Anti-SSB',
        'Anti-La',
        'SSB (La) Antibody',
      ],
      pt: ['Anti-SSB', 'Anti-La', 'Anti-SSB (La)'],
    },
    unit: 'AI',
  },
  {
    code: 'AntiScl70',
    loinc: '27416-7',
    names: {
      en: ['Scleroderma Antibody (Scl-70)', 'Scl-70 Antibody', 'Anti-Scl-70'],
      pt: ['Anti-Scl-70', 'Anti-Scl 70'],
    },
    unit: 'AI',
  },
  {
    code: 'AntiJo1',
    loinc: '11565-9',
    names: {
      en: ['Jo-1 Antibody', 'Anti-Jo-1'],
      pt: ['Anti-Jo-1', 'Anti-Jo1'],
    },
    unit: 'AI',
  },

  // ============================================================================
  // IMMUNE REGULATION / REGULACAO-IMUNOLOGICA
  // ============================================================================
  // "Basos", "Eos" e "Lymphs", com "(Absolute)" para o absoluto, são como o
  // laudo em colunas da Labcorp imprime o diferencial. Sem eles a âncora não
  // achava a linha e a leitura do modelo era recusada como alucinação.
  {
    code: 'Basophils',
    loinc: '706-2',
    names: {
      en: ['Basophils', 'Basophils %', 'Basos'],
      pt: ['Basófilos', 'Basófilos %'],
    },
    unit: '%',
  },
  {
    code: 'Basophils_Abs',
    hidden: true,
    loinc: '704-7',
    names: {
      en: ['Absolute Basophils', 'Basophils Absolute', 'Baso (Absolute)', 'Basos (Absolute)'],
      pt: ['Basófilos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    code: 'Eosinophils',
    loinc: '713-8',
    names: {
      en: ['Eosinophils', 'Eosinophils %', 'Eos'],
      pt: ['Eosinófilos', 'Eosinófilos %'],
    },
    unit: '%',
  },
  {
    code: 'Eosinophils_Abs',
    hidden: true,
    loinc: '711-2',
    names: {
      en: ['Absolute Eosinophils', 'Eosinophils Absolute', 'Eos (Absolute)'],
      pt: ['Eosinófilos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    code: 'Lymphocytes',
    loinc: '736-9',
    names: {
      en: ['Lymphocytes', 'Lymphocytes %', 'Lymphs'],
      pt: ['Linfócitos', 'Linfócitos %'],
    },
    unit: '%',
  },
  {
    code: 'Lymphocytes_Abs',
    hidden: true,
    loinc: '731-0',
    names: {
      en: ['Absolute Lymphocytes', 'Lymphocytes Absolute', 'Lymphs (Absolute)'],
      pt: ['Linfócitos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    code: 'Monocytes',
    loinc: '5905-5',
    names: {
      en: ['Monocytes', 'Monocytes %'],
      pt: ['Monócitos', 'Monócitos %'],
    },
    unit: '%',
  },
  {
    code: 'Monocytes_Abs',
    hidden: true,
    loinc: '742-7',
    names: {
      en: ['Absolute Monocytes', 'Monocytes Absolute', 'Monocytes (Absolute)'],
      pt: ['Monócitos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    code: 'Neutrophils',
    loinc: '770-8',
    names: {
      en: ['Neutrophils', 'Neutrophils %'],
      // "Segmentados" é como o hemograma brasileiro automatizado imprime os
      // neutrófilos: o bastonete só aparece quando passa de um limiar (o
      // Weinmann informa acima de 5%), e a linha "Segmentados" carrega a
      // contagem. Sem o nome, a leitura de histórico do laudo evolutivo saía
      // `UNKNOWN_Segmentados`. A unidade (/µL) é que separa o absoluto.
      pt: ['Neutrófilos', 'Neutrófilos %', 'Neutrófilos Segmentados', 'Segmentados'],
    },
    unit: '%',
  },
  {
    code: 'Neutrophils_Abs',
    hidden: true,
    loinc: '751-8',
    names: {
      en: ['Absolute Neutrophils', 'Neutrophils Absolute', 'Neutrophils (Absolute)'],
      pt: ['Neutrófilos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    code: 'ImmatureGranulocytes',
    // Contagem automatizada, como o resto do leucograma do catálogo.
    loinc: '71695-1',
    names: {
      en: ['Immature Granulocytes', 'Immature Grans', 'IG %'],
      pt: ['Granulócitos Imaturos', 'Granulócitos Imaturos %'],
    },
    unit: '%',
  },
  {
    code: 'ImmatureGranulocytes_Abs',
    hidden: true,
    loinc: '53115-2',
    names: {
      en: [
        'Absolute Immature Granulocytes',
        'Immature Grans (Abs)',
        'Immature Granulocytes, Absolute',
      ],
      pt: ['Granulócitos Imaturos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    code: 'NRBC',
    loinc: '58413-6',
    names: {
      en: ['NRBC', 'Nucleated RBC', 'Nucleated Red Blood Cells'],
      pt: ['Eritroblastos', 'Hemácias Nucleadas'],
    },
    unit: '/100 WBC',
  },
  {
    code: 'NRBC_Abs',
    hidden: true,
    loinc: '771-6',
    names: {
      en: ['Absolute NRBC', 'NRBC, Absolute', 'Nucleated RBC, Absolute'],
      pt: ['Eritroblastos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    code: 'WBC',
    loinc: '6690-2',
    names: {
      en: ['White Blood Cell Count', 'WBC', 'Leukocytes'],
      pt: ['Contagem de Leucócitos', 'Leucócitos', 'Glóbulos Brancos'],
    },
    unit: 'K/uL',
  },
  {
    code: 'IgA',
    loinc: '2458-8',
    names: {
      en: ['Immunoglobulin A', 'IgA', 'Serum IgA'],
      pt: ['Imunoglobulina A', 'IgA'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'IgG',
    codeAliases: ['IgG_Immunoglobulin', 'Immunoglobulin_G'],
    loinc: '2465-3',
    names: {
      en: ['Immunoglobulin G', 'IgG', 'Serum IgG'],
      pt: ['Imunoglobulina G', 'IgG'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'IgE_Total',
    codeAliases: ['IgE_Immunoglobulin', 'Total_IgE'],
    loinc: '19113-0',
    names: {
      en: ['Total IgE', 'IgE', 'Immunoglobulin E', 'IgE Total'],
      pt: ['IgE Total', 'Imunoglobulina E', 'IgE'],
    },
    unit: 'IU/mL',
  },
  {
    code: 'IgE_E1_CatDander',
    codeAliases: ['IgE_Cat_Dander', 'IgE_E1', 'IgE_Specific_E1__Cat_Dander'],
    loinc: '6833-8',
    names: {
      en: ['IgE E1 Cat Dander', 'Cat Dander IgE', 'Cat Allergy IgE', 'IgE Cat Epithelium'],
      pt: ['IgE E1 Epitélio de Gato', 'IgE Gato', 'Alergia a Gato IgE'],
    },
    unit: 'kU/L',
  },
  {
    code: 'IgE_GX1_Grasses',
    codeAliases: ['IgE_GX1', 'IgE_Grass_Pollen', 'IgE_Specific_GX1__Grasses'],
    loinc: '30189-5',
    names: {
      en: ['IgE GX1 Grasses', 'Grass Pollen IgE', 'Grass Mix IgE', 'IgE GX1 Grass Pollen Mix'],
      pt: ['IgE GX1 Gramíneas', 'IgE Pólen de Gramíneas', 'Painel de Gramíneas IgE'],
    },
    unit: 'kU/L',
  },

  // ============================================================================
  // WOMEN'S HEALTH / SAUDE-FEMININA
  // ============================================================================
  {
    code: 'AMH',
    loinc: '38476-8',
    names: {
      en: ['Anti-Mullerian Hormone', 'AMH'],
      pt: ['Hormônio Anti-Mülleriano', 'AMH'],
    },
    sex: 'female',
    unit: 'ng/mL',
  },
  {
    code: 'DHEAS',
    loinc: '2191-5',
    names: {
      en: ['DHEA-Sulfate', 'DHEAS', 'DHEA-S', 'DHEA Sulfate'],
      pt: ['DHEA-Sulfato', 'DHEAS', 'Sulfato de DHEA'],
    },
    unit: 'mcg/dL',
  },
  {
    code: 'Estradiol',
    loinc: '2243-4',
    names: {
      en: ['Estradiol', 'E2'],
      pt: ['Estradiol', 'E2'],
    },
    unit: 'pg/mL',
  },
  {
    code: 'Estrone',
    // https://loinc.org/2258-2: estrona em soro/plasma, massa/volume,
    // sem fração ou método especificado. Conferido no LOINC 2.83 em
    // 09/10/2026. O 2261-6 é específico da fração não conjugada.
    loinc: '2258-2',
    names: {
      en: ['Estrone', 'E1'],
      pt: ['Estrona', 'E1'],
    },
    unit: 'pg/mL',
  },
  {
    code: 'FSH',
    loinc: '15067-2',
    names: {
      en: ['Follicle Stimulating Hormone', 'FSH'],
      pt: ['Hormônio Folículo-Estimulante', 'FSH', 'Folitropina'],
    },
    unit: 'mIU/mL',
  },
  {
    code: 'LH',
    loinc: '10501-5',
    names: {
      en: ['Luteinizing Hormone', 'LH'],
      pt: ['Hormônio Luteinizante', 'LH', 'Lutropina'],
    },
    unit: 'mIU/mL',
  },
  {
    code: 'Prolactin',
    loinc: '2842-3',
    names: {
      en: ['Prolactin'],
      pt: ['Prolactina'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'SHBG',
    loinc: '13967-5',
    names: {
      en: ['Sex Hormone Binding Globulin', 'SHBG'],
      pt: ['Globulina Ligadora de Hormônios Sexuais', 'SHBG'],
    },
    unit: 'nmol/L',
  },
  {
    code: 'TestosteroneFree',
    loinc: '2991-8',
    names: {
      en: [
        'Testosterone Free',
        'Free Testosterone',
        'Testosterone, Free',
        'Testosterone (Free)',
        'Testosterone Free (Direct)',
        'Free Testosterone (Direct)',
      ],
      pt: ['Testosterona Livre'],
    },
    unit: 'pg/mL',
  },
  {
    code: 'Testosterone',
    loinc: '2986-8',
    names: {
      en: ['Testosterone Total', 'Testosterone'],
      pt: ['Testosterona Total', 'Testosterona'],
    },
    unit: 'ng/dL',
  },
  {
    code: 'Progesterone',
    loinc: '2839-9',
    names: {
      en: ['Progesterone'],
      pt: ['Progesterona'],
    },
    sex: 'female',
    unit: 'ng/mL',
  },

  // ============================================================================
  // MEN'S HEALTH / SAUDE-MASCULINA
  // ============================================================================
  {
    code: 'PSA',
    loinc: '2857-1',
    names: {
      en: ['Prostate Specific Antigen', 'PSA', 'PSA Total'],
      pt: ['Antígeno Prostático Específico', 'PSA', 'PSA Total'],
    },
    sex: 'male',
    unit: 'ng/mL',
  },
  {
    code: 'PSA_Free',
    loinc: '10886-0',
    names: {
      en: ['Prostate Specific Antigen Free', 'PSA Free', 'Free PSA'],
      pt: ['PSA Livre', 'Antígeno Prostático Específico Livre'],
    },
    sex: 'male',
    unit: 'ng/mL',
  },
  {
    code: 'PSA_FreeRatio',
    loinc: '12841-3',
    names: {
      en: ['PSA Free/Total Ratio', 'PSA % Free', 'Free PSA Ratio', 'PSA, % Free'],
      pt: ['Relação PSA Livre/Total', 'PSA % Livre', 'Razão PSA Livre'],
    },
    sex: 'male',
    unit: '%',
  },
  {
    code: 'DHT',
    codeAliases: ['Dihydrotestosterone'],
    loinc: '1848-1',
    names: {
      en: ['Dihydrotestosterone', 'DHT', 'Androstanolone'],
      pt: ['Diidrotestosterona', 'DHT'],
    },
    unit: 'ng/dL',
  },

  // ============================================================================
  // METABOLIC / METABOLICO
  // ============================================================================
  // Glicose e glicemia de jejum são duas definições, e a linha entre elas é o
  // que o laudo **afirma**, não o que provavelmente aconteceu.
  //
  // No LOINC a diferença está no eixo do componente: `2345-7` é `Glucose` e
  // `1558-6` é `Glucose^post CFst`, com o desafio de jejum declarado. Laudo que
  // imprime só "Glicose" não afirma jejum nenhum, mesmo quando a faixa impressa
  // ao lado é de jejum e mesmo sendo jejum na esmagadora maioria dos painéis
  // ambulatoriais brasileiros. Codificar essa linha como `1558-6` afirmaria um
  // jejum de oito horas que ninguém declarou.
  //
  // As duas estavam fundidas numa definição só, que carregava `2345-7` e uma
  // faixa `fastingRequired: 'strict'`: o código dizia genérico e a faixa dizia
  // jejum. A grafia é que decide agora.
  {
    code: 'Glucose',
    loinc: '2345-7',
    names: {
      en: ['Glucose', 'Blood Glucose', 'Random Glucose'],
      pt: ['Glicose', 'Glicemia'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'Glucose_Fasting',
    loinc: '1558-6',
    names: {
      en: ['Fasting Glucose', 'Fasting Blood Glucose', 'Glucose, Fasting'],
      pt: ['Glicemia de Jejum', 'Glicose de Jejum', 'Glicemia em Jejum'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'HbA1c',
    loinc: '4548-4',
    names: {
      en: ['Hemoglobin A1c', 'HbA1c', 'Glycated Hemoglobin'],
      pt: ['Hemoglobina Glicada', 'HbA1c', 'Hemoglobina Glicosilada'],
    },
    unit: '%',
  },
  {
    code: 'eAG',
    codeAliases: ['Estimated_Average_Glucose'],
    loinc: '27353-2',
    names: {
      en: ['Estimated Average Glucose', 'eAG', 'Mean Glucose'],
      pt: ['Glicemia Média Estimada', 'GME', 'Glicose Média Estimada'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'Insulin',
    loinc: '20448-7',
    names: {
      en: ['Insulin', 'Fasting Insulin'],
      pt: ['Insulina', 'Insulina de Jejum'],
    },
    unit: 'uIU/mL',
  },
  {
    code: 'CPeptide',
    loinc: '1986-9',
    names: {
      en: ['C-Peptide', 'C Peptide', 'Connecting Peptide'],
      pt: ['Peptídeo C', 'Peptídeo-C'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'HOMA_IR',
    loinc: '47214-2',
    names: {
      // "Homeostasis model assessment" é o componente do 47214-2 no LOINC; o
      // nome em inglês acima é como os laudos imprimem, e a busca por
      // componente é o que casa o nome do laudo com o código (PRE-486).
      en: [
        'HOMA-IR',
        'Homeostatic Model Assessment for Insulin Resistance',
        'Homeostasis Model Assessment',
      ],
      pt: ['HOMA-IR', 'Índice HOMA'],
    },
    unit: 'índice',
  },
  {
    code: 'Leptin',
    loinc: '21365-2',
    names: {
      en: ['Leptin'],
      pt: ['Leptina'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'UricAcid',
    loinc: '3084-1',
    names: {
      en: ['Uric Acid', 'Urate'],
      pt: ['Ácido Úrico'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'CK',
    codeAliases: ['Creatine_Kinase', 'CK_Total'],
    loinc: '2157-6',
    names: {
      en: ['Creatine Kinase', 'CK', 'CPK', 'CK Total', 'Creatine Phosphokinase'],
      pt: ['Creatina Quinase', 'CK', 'CPK', 'Creatinoquinase', 'CK Total'],
    },
    unit: 'U/L',
  },

  // ============================================================================
  // ENVIRONMENTAL TOXINS / TOXINAS-AMBIENTAIS
  // ============================================================================
  {
    code: 'Lead',
    loinc: '77307-7',
    names: {
      en: ['Lead', 'Blood Lead'],
      pt: ['Chumbo', 'Chumbo no Sangue'],
    },
    unit: 'mcg/dL',
  },
  {
    code: 'Mercury',
    loinc: '5685-3',
    names: {
      en: ['Mercury', 'Blood Mercury'],
      pt: ['Mercúrio', 'Mercúrio no Sangue'],
    },
    unit: 'mcg/L',
  },

  // ============================================================================
  // NUTRIENTS / NUTRIENTES
  // ============================================================================
  {
    code: 'AA_EPA_Ratio',
    codeAliases: ['Arachidonic_AcidEPA_Ratio'],
    loinc: '90909-3',
    names: {
      en: ['Arachidonic Acid/EPA Ratio', 'AA/EPA Ratio', 'Arachidonic Acid EPA Ratio'],
      pt: ['Razão Ácido Araquidônico/EPA', 'Razão AA/EPA'],
    },
    unit: 'razão',
  },
  {
    code: 'Calcium',
    loinc: '17861-6',
    names: {
      en: ['Calcium', 'Serum Calcium'],
      pt: ['Cálcio', 'Cálcio Sérico'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'Phosphorus',
    loinc: '2777-1',
    names: {
      en: ['Phosphorus', 'Phosphate', 'Phosphorus, Serum', 'Inorganic Phosphorus'],
      pt: ['Fósforo', 'Fosfato', 'Fósforo Sérico', 'Fósforo Inorgânico'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'IonizedCalcium',
    // 1995-0 é o conceito base em soro ou plasma, em mmol/L, como o laudo
    // brasileiro imprime. A Quest imprime em mg/dL; a conversão pela massa
    // molar do cálcio leva o valor para mmol/L antes do Bundle.
    loinc: '1995-0',
    names: {
      en: ['Ionized Calcium', 'Calcium, Ionized', 'Calcium Ionized', 'iCa'],
      pt: ['Cálcio Iônico', 'Cálcio Ionizado', 'Cálcio Livre'],
    },
    unit: 'mmol/L',
  },
  {
    code: 'Ferritin',
    loinc: '2276-4',
    names: {
      en: ['Ferritin'],
      pt: ['Ferritina'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'Folate',
    loinc: '2284-8',
    names: {
      en: ['Folate', 'Folic Acid', 'Serum Folate'],
      pt: ['Folato', 'Ácido Fólico', 'Folato Sérico', 'Ac. Fólico', 'Dosagem de Ácido Fólico'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'Homocysteine',
    loinc: '13965-9',
    names: {
      en: ['Homocysteine'],
      pt: ['Homocisteína'],
    },
    unit: 'umol/L',
  },
  {
    code: 'Iron',
    loinc: '2498-4',
    names: {
      en: ['Iron', 'Serum Iron'],
      pt: ['Ferro', 'Ferro Sérico'],
    },
    unit: 'mcg/dL',
  },
  {
    code: 'TransferrinSaturation',
    codeAliases: ['Saturation_of_Transferrin'],
    loinc: '2502-3',
    names: {
      en: [
        'Iron Saturation',
        'Transferrin Saturation',
        'TSAT',
        '% Saturation',
        'Iron % Saturation',
        'Saturation',
        'Saturation of Transferrin',
      ],
      pt: [
        'Saturação de Ferro',
        'Saturação de Transferrina',
        'IST',
        '% Saturação',
        'Ferro - Grau de Saturação',
        'Grau de Saturação do Ferro',
      ],
    },
    unit: '%',
  },
  {
    code: 'TIBC',
    loinc: '2500-7',
    names: {
      en: ['Iron Binding Capacity', 'TIBC', 'Total Iron Binding Capacity'],
      pt: [
        'Capacidade de Ligação do Ferro',
        'TIBC',
        'CTLFe',
        'Capacidade Total de Ligação do Ferro',
        'Ferro - Capac Total ligação',
      ],
    },
    unit: 'mcg/dL',
  },
  {
    code: 'Transferrin',
    loinc: '3034-6',
    names: {
      en: ['Transferrin', 'Transferrin, Serum'],
      pt: ['Transferrina', 'Transferrina Sérica'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'Magnesium_RBC',
    loinc: '26746-8',
    names: {
      en: [
        'Magnesium RBC',
        'Magnesium Red Blood Cells',
        'RBC Magnesium',
        'Magnesium, RBC',
        'Magnesium (RBC)',
      ],
      pt: ['Magnésio RBC', 'Magnésio Eritrocitário', 'Magnésio Intraeritrocitário'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'Magnesium',
    // Magnésio sérico em massa/volume. Distinto do Magnesium_RBC (26746-8),
    // que mede a fração intraeritrocitária.
    loinc: '19123-9',
    names: {
      en: ['Magnesium', 'Serum Magnesium', 'Magnesium, Serum', 'Magnesium Total'],
      pt: ['Magnésio', 'Magnésio Sérico', 'Magnésio Total'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'MMA',
    loinc: '13964-2',
    names: {
      en: ['Methylmalonic Acid', 'MMA'],
      pt: ['Ácido Metilmalônico', 'MMA'],
    },
    unit: 'nmol/L',
  },
  {
    // LOINC 99620-7 = "Omega 3 fatty acids (w3) [Moles/volume] in RBC.lysate".
    // Anteriormente 35178-3 (mesmo analito em Ser/Plas), incompatível com o
    // uso clínico do Índice Ômega-3 (Harris & von Schacky 2004), que é
    // definido em membranas de hemácias.
    //
    // Compromisso declarado, e não erro: o LOINC 2.82 não tem código de fração
    // ("ômega-3 total / ácidos graxos totais") para o total, só para os ácidos
    // individuais e para EPA+DPA+DHA (90911-9). O componente confere; a
    // propriedade é moles/volume enquanto o laudo imprime %. O teste de eixos
    // (`loinc-axes.test.ts`) lista esta entrada como exceção com este motivo.
    // Mesmo compromisso em `Omega6_Total` (99621-5).
    code: 'Omega3_Total',
    loinc: '99620-7',
    names: {
      // O LOINC indexa o 99620-7 como "Omega 3 fatty acids (w3)", sem hífen e
      // sem "total"; o alias segue essa grafia para a busca por nome.
      en: ['Omega-3 Total', 'Total Omega-3', 'Omega 3 Fatty Acids'],
      pt: ['Ômega-3 Total'],
    },
    unit: '%',
  },
  {
    code: 'Omega3_DHA',
    codeAliases: ['DHA'],
    // Ácidos graxos individuais: fração do total (% dos ácidos graxos C14-C22),
    // que é o que o perfil de ácidos graxos e o Índice Ômega-3 imprimem. Os
    // códigos vêm do painel 90918-4 ("Fatty acid omega-3 and omega-6 panel -
    // Blood"), o mesmo de onde já saem as razões AA/EPA (90909-3) e ω6/ω3
    // (90910-1). Até out/2026 apontavam para os códigos [Entitic substance]
    // em hemácias (75095-0, 75097-6, 75110-7, 75117-2), que são quantidade por
    // célula, e para 48371-9, que é moles/volume em soro: componente certo,
    // propriedade errada nos cinco, desde mar/2026. Ficam como alias porque o
    // analito é o mesmo. Material: o painel em soro/plasma (88884-2, C14-C24)
    // existe, e é a troca a fazer se um laboratório imprimir o perfil em soro.
    loinc: '90914-3',
    loincAliases: ['75095-0'],
    names: {
      en: ['Omega-3 DHA', 'DHA', 'Docosahexaenoic Acid'],
      pt: ['Ômega-3: DHA', 'DHA', 'Ácido Docosahexaenoico'],
    },
    unit: '%',
  },
  {
    code: 'Omega3_DPA',
    codeAliases: ['DPA'],
    // Fração em sangue, painel 90918-4. Ver `Omega3_DHA`.
    loinc: '90913-5',
    loincAliases: ['48371-9'],
    names: {
      en: ['Omega-3 DPA', 'DPA', 'Docosapentaenoic Acid'],
      pt: ['Ômega-3: DPA', 'DPA', 'Ácido Docosapentaenoico'],
    },
    unit: '%',
  },
  {
    code: 'Omega3_EPA',
    codeAliases: ['EPA'],
    // Fração em sangue, painel 90918-4. Ver `Omega3_DHA`.
    loinc: '90912-7',
    loincAliases: ['75097-6'],
    names: {
      en: ['Omega-3 EPA', 'EPA', 'Eicosapentaenoic Acid'],
      pt: ['Ômega-3: EPA', 'EPA', 'Ácido Eicosapentaenoico'],
    },
    unit: '%',
  },
  {
    code: 'EPADPADHA',
    // 90911-9 é a fração EPA+DPA+DHA / ácidos graxos C14-C22 em sangue, o
    // valor em %. Até out/2026 apontava para 90908-5, que é a *interpretação*
    // desse mesmo valor (ordinal: risco alto, moderado, baixo), e não o
    // número. Sem alias: código ordinal carregando valor numérico é o erro
    // que se quer parar de aceitar.
    loinc: '90911-9',
    names: {
      en: ['Omega-3 EPA+DPA+DHA', 'EPA+DPA+DHA'],
      pt: ['Ômega-3: EPA+DPA+DHA'],
    },
    unit: '%',
  },
  {
    code: 'Omega6_Omega3_Ratio',
    codeAliases: ['Omega6Omega3_Ratio'],
    loinc: '90910-1',
    names: {
      en: ['Omega-6/Omega-3 Ratio'],
      pt: ['Razão Ômega-6 / Ômega-3'],
    },
    unit: 'razão',
  },
  {
    code: 'Omega6_Total',
    // 99621-5 é "Omega 6 fatty acids (w6) [Moles/volume] in RBC.lysate", o
    // par exato do 99620-7 de `Omega3_Total`, com o mesmo compromisso de
    // propriedade documentado lá. Até out/2026 apontava para 35177-5, que é
    // ácidos graxos poli-insaturados totais em soro: ômega-3 e ômega-6
    // somados, outro componente. Sem alias.
    loinc: '99621-5',
    names: {
      // Mesma grafia do LOINC que em `Omega3_Total`: "Omega 6 fatty acids (w6)".
      en: ['Omega-6 Total', 'Total Omega-6', 'Omega 6 Fatty Acids'],
      pt: ['Ômega-6 Total'],
    },
    unit: '%',
  },
  {
    code: 'Omega6_AA',
    codeAliases: ['Arachidonic_Acid'],
    // Fração em sangue, painel 90918-4. Ver `Omega3_DHA`.
    loinc: '90916-8',
    loincAliases: ['75110-7'],
    names: {
      en: ['Omega-6 Arachidonic Acid', 'Arachidonic Acid', 'AA'],
      pt: ['Ômega-6: Ácido Araquidônico', 'Ácido Araquidônico', 'AA'],
    },
    unit: '%',
  },
  {
    code: 'Omega6_LA',
    codeAliases: ['Linoleic_Acid'],
    // Fração em sangue, painel 90918-4. Ver `Omega3_DHA`.
    loinc: '90917-6',
    loincAliases: ['75117-2'],
    names: {
      en: ['Omega-6 Linoleic Acid', 'Linoleic Acid', 'LA'],
      pt: ['Ômega-6: Ácido Linoleico', 'Ácido Linoleico', 'LA'],
    },
    unit: '%',
  },
  {
    code: 'VitaminA',
    loinc: '2923-1',
    names: {
      en: ['Vitamin A', 'Retinol', 'Serum Retinol'],
      pt: ['Vitamina A', 'Retinol', 'Retinol Sérico', 'Vit A', 'Vit. A', 'Dosagem de Vitamina A'],
    },
    unit: 'mcg/dL',
  },
  {
    code: 'VitaminB12',
    loinc: '2132-9',
    names: {
      en: ['Vitamin B12', 'Vitamin B-12', 'Cobalamin', 'B12', 'Cyanocobalamin'],
      pt: [
        'Vitamina B12',
        'Vitamina B-12',
        'Cobalamina',
        'B12',
        'Cianocobalamina',
        'Vit B12',
        'Vit. B12',
        'Dosagem de Vitamina B12',
      ],
    },
    unit: 'pg/mL',
  },
  {
    code: 'VitaminC',
    loinc: '1903-4',
    names: {
      en: ['Vitamin C', 'Ascorbic Acid'],
      pt: [
        'Vitamina C',
        'Ácido Ascórbico',
        'Vit C',
        'Vit. C',
        'Dosagem de Vitamina C',
        'Dosagem de Ácido Ascórbico',
      ],
    },
    unit: 'mg/dL',
  },
  {
    code: 'VitaminD',
    // 62292-8 é 25(OH)D2 + 25(OH)D3, o total que os imunoensaios reportam
    // como "Vitamina D 25-OH". Até set/2026 apontava para 1989-3, que é só
    // a fração D3: nome parecido, analito diferente.
    loinc: '62292-8',
    names: {
      en: [
        'Vitamin D',
        '25-Hydroxy Vitamin D',
        '25-OH Vitamin D',
        'Vitamin D, 25-Hydroxy',
        '25-Hydroxy Vitamin D, Total',
        'Vitamin D, 25-OH, Total',
        'Vitamin D, 25-OH, Total, IA',
      ],
      pt: [
        'Vitamina D',
        '25-Hidroxivitamina D',
        '25 - Hidroxivitamina D',
        '25-OH Vitamina D',
        'Vitamina D, 25-Hidroxi',
        '25-Hidroxi Vitamina D',
      ],
    },
    unit: 'ng/mL',
  },
  {
    code: 'VitaminD2',
    // A Quest imprime as frações ao lado do total quando a dosagem é por
    // LC/MS/MS. O total continua em `VitaminD` (62292-8).
    loinc: '49054-0',
    names: {
      en: ['Vitamin D2', '25-Hydroxyvitamin D2', '25-OH Vitamin D2', 'Vitamin D, 25-OH, D2'],
      pt: ['Vitamina D2', '25-Hidroxivitamina D2', '25-OH Vitamina D2'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'VitaminD3',
    // 1989-3 é a fração D3, e não o total: até set/2026 era o código errado
    // de `VitaminD`.
    loinc: '1989-3',
    names: {
      en: ['Vitamin D3', '25-Hydroxyvitamin D3', '25-OH Vitamin D3', 'Vitamin D, 25-OH, D3'],
      pt: ['Vitamina D3', '25-Hidroxivitamina D3', '25-OH Vitamina D3'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'Zinc',
    // 5763-8 é "Zinc [Mass/volume] in Serum or Plasma", o zinco sérico da
    // rotina brasileira (o nome em inglês já dizia "Serum Zinc"). Até out/2026
    // apontava para 8245-3, o mesmo analito em sangue total, que tem faixa de
    // referência própria. Sem alias: sangue total é outro material.
    loinc: '5763-8',
    names: {
      en: ['Zinc', 'Serum Zinc'],
      pt: ['Zinco'],
    },
    unit: 'mcg/dL',
  },

  // ============================================================================
  // STRESS & AGING / ESTRESSE-ENVELHECIMENTO
  // ============================================================================
  {
    code: 'Cortisol',
    loinc: '2143-6',
    names: {
      en: ['Cortisol', 'Serum Cortisol'],
      pt: ['Cortisol'],
    },
    unit: 'mcg/dL',
  },
  {
    code: 'IGF1',
    loinc: '2484-4',
    names: {
      en: [
        'IGF-1',
        'IGF-I',
        'IGF 1',
        'Insulin-like Growth Factor 1',
        'Insulin-Like Growth Factor I',
        'Somatomedin C',
      ],
      pt: ['IGF-1', 'IGF-I', 'Fator de Crescimento Semelhante à Insulina 1', 'Somatomedina C'],
    },
    unit: 'ng/mL',
  },

  // ============================================================================
  // LIVER / FIGADO
  // ============================================================================
  {
    code: 'ALT',
    loinc: '1742-6',
    names: {
      en: ['Alanine Transaminase', 'Alanine Aminotransferase', 'ALT', 'SGPT'],
      pt: [
        'Alanina Aminotransferase',
        'Alanina Amino Transferase',
        'ALT',
        'TGP',
        'Transaminase Glutâmico-Pirúvica',
        'Transaminase Pirúvica',
        'TGP/ALT',
      ],
    },
    unit: 'U/L',
  },
  {
    code: 'Albumin',
    loinc: '1751-7',
    names: {
      en: ['Albumin', 'Serum Albumin'],
      pt: ['Albumina'],
    },
    unit: 'g/dL',
  },
  {
    code: 'Albumin_Globulin_Ratio',
    codeAliases: ['AG_Ratio'],
    loinc: '1759-0',
    names: {
      en: ['Albumin/Globulin Ratio', 'A/G Ratio'],
      pt: ['Razão Albumina / Globulina', 'Razão A/G'],
    },
    unit: 'razão',
  },
  {
    code: 'AlkalinePhosphatase',
    loinc: '6768-6',
    names: {
      en: ['Alkaline Phosphatase', 'ALP'],
      pt: ['Fosfatase Alcalina', 'ALP'],
    },
    unit: 'U/L',
  },
  {
    code: 'AST',
    loinc: '1920-8',
    names: {
      en: ['Aspartate Aminotransferase', 'AST', 'SGOT'],
      pt: [
        'Aspartato Aminotransferase',
        'Aspartato Amino Transferase',
        'AST',
        'TGO',
        'Transaminase Glutâmico-Oxalacética',
        'Transaminase Oxalacética',
        'TGO/AST',
      ],
    },
    unit: 'U/L',
  },
  {
    code: 'GGT',
    loinc: '2324-2',
    names: {
      en: ['Gamma-glutamyl Transferase', 'GGT', 'Gamma GT'],
      pt: ['Gama-Glutamil Transferase', 'GGT', 'Gama GT', 'Gama Glutamiltransferase', 'Gama-GT'],
    },
    unit: 'U/L',
  },
  {
    code: 'Globulin',
    // 2336-6 é "Globulin [Mass/volume] in Serum", soro só: o LOINC 2.82 não
    // tem a versão Ser/Plas da globulina total (as frações alfa, beta e gama
    // têm). Material registrado de propósito.
    loinc: '2336-6',
    names: {
      en: ['Globulin', 'Serum Globulin'],
      pt: ['Globulina'],
    },
    unit: 'g/dL',
  },
  {
    code: 'TotalProtein',
    loinc: '2885-2',
    names: {
      // "Protein, Total" é a grafia da Quest, no formato "EXAME, QUALIFICADOR".
      // A troca de vírgula do pré-scan não basta aqui: dobrada, a linha vira
      // "protein total", que não é nome do catálogo, e sobrava o "Protein"
      // solto, sinônimo de `Protein_Urine`. A proteína do soro ancorava como
      // proteína da urina. Com a grafia literal, o nome longo engole o curto.
      en: ['Total Protein', 'Serum Protein', 'Protein, Total'],
      pt: ['Proteína Total', 'Proteínas Totais'],
    },
    unit: 'g/dL',
  },
  {
    code: 'BilirubinTotal',
    loinc: '1975-2',
    names: {
      en: ['Total Bilirubin', 'Bilirubin Total', 'Bilirubin, Total', 'BILIRUBIN TOTAL'],
      pt: ['Bilirrubina Total'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'BilirubinDirect',
    codeAliases: ['Bilirubin_Direct', 'Direct_Bilirubin', 'Bilirrubina_Direta'],
    loinc: '1968-7',
    names: {
      en: ['Direct Bilirubin', 'Bilirubin Direct', 'Conjugated Bilirubin'],
      pt: ['Bilirrubina Direta', 'Bilirrubina Conjugada'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'BilirubinIndirect',
    codeAliases: ['Bilirubin_Indirect', 'Indirect_Bilirubin', 'Bilirrubina_Indireta'],
    loinc: '1971-1',
    names: {
      en: ['Indirect Bilirubin', 'Bilirubin Indirect', 'Unconjugated Bilirubin'],
      pt: ['Bilirrubina Indireta', 'Bilirrubina Não Conjugada'],
    },
    unit: 'mg/dL',
  },

  // ============================================================================
  // BLOOD / SANGUE
  // ============================================================================
  {
    code: 'Hct',
    loinc: '4544-3',
    names: {
      en: ['Hematocrit', 'Hct', 'HCT'],
      pt: ['Hematócrito', 'Hct'],
    },
    unit: '%',
  },
  {
    code: 'Hgb',
    loinc: '718-7',
    names: {
      en: ['Hemoglobin', 'Hgb', 'HGB'],
      pt: ['Hemoglobina', 'Hgb'],
    },
    unit: 'g/dL',
  },
  {
    code: 'MCH',
    loinc: '785-6',
    names: {
      en: ['Mean Corpuscular Hemoglobin', 'MCH'],
      pt: ['Hemoglobina Corpuscular Média', 'HCM'],
    },
    unit: 'pg',
  },
  {
    code: 'MCHC',
    loinc: '786-4',
    names: {
      en: ['Mean Corpuscular Hemoglobin Concentration', 'MCHC'],
      pt: ['Concentração de Hemoglobina Corpuscular Média', 'CHCM'],
    },
    unit: 'g/dL',
  },
  {
    code: 'MCV',
    loinc: '787-2',
    names: {
      en: ['Mean Corpuscular Volume', 'MCV'],
      pt: ['Volume Corpuscular Médio', 'VCM'],
    },
    unit: 'fL',
  },
  {
    code: 'MPV',
    loinc: '32623-1',
    names: {
      en: ['Mean Platelet Volume', 'MPV'],
      pt: ['Volume Plaquetário Médio', 'VPM'],
    },
    unit: 'fL',
  },
  {
    code: 'Platelets',
    loinc: '777-3',
    names: {
      en: ['Platelet Count', 'Platelets'],
      pt: ['Contagem de Plaquetas', 'Plaquetas'],
    },
    unit: 'K/uL',
  },
  {
    code: 'RBC',
    loinc: '789-8',
    names: {
      en: ['Red Blood Cell Count', 'RBC', 'Erythrocytes'],
      pt: ['Contagem de Hemácias', 'Hemácias', 'Eritrócitos'],
    },
    unit: 'M/uL',
  },
  {
    code: 'RDW',
    loinc: '788-0',
    names: {
      en: ['Red Cell Distribution Width', 'RDW'],
      pt: [
        'Amplitude de Distribuição dos Eritrócitos',
        'RDW',
        'Coeficiente de Variação do Volume Eritrocitário',
      ],
    },
    unit: '%',
  },
  {
    code: 'ABO_Group',
    hidden: true,
    loinc: '883-9',
    names: {
      en: ['ABO Group', 'ABO Blood Group', 'Blood Type ABO'],
      pt: ['Grupo ABO', 'Tipo Sanguíneo ABO', 'Grupo Sanguíneo ABO'],
    },
  },
  {
    code: 'Rh_Type',
    hidden: true,
    loinc: '10331-7',
    names: {
      en: ['Rh Type', 'Rh Factor', 'Rhesus Factor'],
      pt: ['Tipo Rh', 'Fator Rh', 'Fator Rhesus'],
    },
  },
  {
    code: 'ESR',
    codeAliases: ['Erythrocyte_Sedimentation_Rate', 'VHS'],
    loinc: '30341-2',
    names: {
      en: ['Erythrocyte Sedimentation Rate', 'ESR', 'Sed Rate'],
      pt: ['Velocidade de Hemossedimentação', 'VHS', 'VSG'],
    },
    unit: 'mm/hr',
  },
  {
    code: 'INR',
    codeAliases: ['International_Normalized_Ratio'],
    loinc: '6301-6',
    names: {
      en: ['International Normalized Ratio', 'INR'],
      pt: ['Razão Normalizada Internacional', 'INR', 'RNI'],
    },
    unit: 'razão',
  },
  {
    code: 'ProthrombinTime',
    codeAliases: ['Prothrombin_Time', 'PT_Time'],
    loinc: '5902-2',
    names: {
      en: ['Prothrombin Time', 'PT', 'Pro Time'],
      pt: ['Tempo de Protrombina', 'TP', 'TAP'],
    },
    unit: 'segundos',
  },
  {
    code: 'APTT',
    // Plasma pobre em plaquetas, ensaio de coagulação. A variante sensível a
    // anticoagulante lúpico (34571-0) é outro teste.
    loinc: '14979-9',
    names: {
      en: [
        'aPTT',
        'APTT',
        'PTT',
        'PTT, Activated',
        'Activated Partial Thromboplastin Time',
        'Partial Thromboplastin Time',
      ],
      pt: ['TTPA', 'TTPa', 'Tempo de Tromboplastina Parcial Ativada'],
    },
    unit: 's',
  },
  {
    code: 'Reticulocytes',
    codeAliases: ['Reticulocyte_Count', 'Reticulocyte_Fraction'],
    loinc: '4679-7',
    names: {
      en: ['Reticulocytes', 'Reticulocyte Count', 'Reticulocyte Fraction', 'Retic Count'],
      pt: ['Reticulócitos', 'Contagem de Reticulócitos'],
    },
    unit: '%',
  },

  // ============================================================================
  // KIDNEYS / RINS
  // ============================================================================
  {
    code: 'Microalbumin_Urine',
    codeAliases: ['Urine_Microalbumin'],
    loinc: '14957-5',
    names: {
      en: [
        'Microalbumin Urine',
        'Urine Albumin',
        'Urine Microalbumin',
        'Microalbumin',
        'Microalbuminuria',
        'Albumin, Urine',
      ],
      // Todas as formas abaixo, em pt e en, nomeiam o MESMO analito: albumina
      // dosada na urina. Não são exames diferentes.
      //
      // "Microalbumina" e "microalbuminúria" são herança de nomenclatura: o
      // prefixo micro nunca se referiu a uma molécula menor, e sim a uma
      // faixa de excreção. O analito é o mesmo, e por isso as duas formas
      // pertencem a esta entrada e não a uma separada.
      //
      // "Albumina Urinária" vem primeiro de propósito. O gerador do ValueSet
      // do IG usa o primeiro nome pt como display, então a ordem decide o
      // rótulo publicado — e essa é a forma que os laboratórios brasileiros
      // de fato imprimem.
      //
      // As formas foram tiradas de dado real, não inventadas: "Albumin,
      // Urine" e "Albumina Urinária" aparecem como rótulos `UNKNOWN_` na
      // auditoria de cobertura da plataforma, ou seja, chegaram em laudo e
      // não casaram com nada.
      //
      // Sem elas o pré-scan casava "Albumina Urinária" com `Albumin`, a
      // albumina sérica. A troca não é cosmética: albumina na urina é
      // marcador de lesão renal precoce, medida em mg/L, e a sérica é de
      // função hepática e estado nutricional, medida em g/dL.
      pt: [
        'Albumina Urinária',
        'Albumina Urina',
        'Microalbumina',
        'Microalbuminúria',
        'Microalbumina Urina',
        'Microalbumina na Urina',
        'Albumina na Urina',
      ],
    },
    unit: 'mg/L',
  },
  {
    code: 'ProteinCreatinineRatio_Urine',
    loinc: '2890-2',
    names: {
      en: [
        'Protein/Creatinine Ratio',
        'Protein/Creatinine Ratio, Urine',
        'Urine Protein/Creatinine Ratio',
        'UPCR',
      ],
      pt: [
        'Relação Proteína/Creatinina',
        'Relação Proteína/Creatinina Urinária',
        'Relação Proteína Creatinina',
      ],
    },
    unit: 'mg/g',
  },
  {
    // LOINC 3091-6 = "Urea [Mass/volume] in Serum or Plasma" (mg/dL).
    // Anteriormente 3094-0 ("Urea nitrogen", BUN), inconsistente com a faixa
    // de referência brasileira (15-50 mg/dL) e com os nomes pt-BR (Ureia).
    // Aliases 'BUN' e 'Blood Urea Nitrogen' removidos para evitar matching
    // de relatórios de BUN contra faixas de Ureia (BUN ≈ Ureia / 2,14).
    code: 'Urea',
    loinc: '3091-6',
    names: {
      en: ['Urea'],
      pt: ['Ureia', 'Uréia'],
    },
    unit: 'mg/dL',
  },
  {
    // 3094-0 é "Urea nitrogen [Mass/volume] in Serum or Plasma", o BUN que o
    // laudo americano imprime ("UREA NITROGEN (BUN)" na Quest). É outro
    // componente que `Urea` (3091-6): o BUN conta só o nitrogênio da molécula,
    // e ureia ≈ BUN × 2,14. Por isso os nomes de BUN saíram de `Urea` na
    // issue #41, e voltam aqui, numa entrada própria. Sem a entrada, o "urea"
    // de dentro de "UREA NITROGEN" ancorava a ureia, e o valor de BUN era lido
    // contra a faixa de 15-50 mg/dL da ureia.
    //
    // Faixa (out/2026): 5 a 20 mg/dL, de Hosten, "BUN and Creatinine",
    // Clinical Methods, 3. ed., cap. 193: "The normal range of urea nitrogen in
    // blood or serum is 5 to 20 mg/dl, or 1.8 to 7.1 mmol urea per liter." O
    // capítulo não publica intervalo ótimo, e a faixa fica sem um.
    code: 'BUN',
    loinc: '3094-0',
    names: {
      en: ['Urea Nitrogen (BUN)', 'Urea Nitrogen', 'BUN'],
      pt: ['Nitrogênio Ureico'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'BUN_Creatinine_Ratio',
    // 3097-3 é "Urea nitrogen/Creatinine [Mass Ratio]", a razão BUN/creatinina,
    // e a faixa de referência (10-20, Tietz) é a dessa convenção. Até out/2026
    // esta entrada também levava os nomes "Razão Ureia / Creatinina" e
    // "Urea/Creatinine Ratio", e o laudo brasileiro, que dosa ureia e não
    // BUN, caía aqui: como ureia ≈ BUN × 2,14, a razão ureia/creatinina sai
    // cerca de 2,14 vezes maior, e um valor normal era sinalizado como alto
    // contra 10-20. Os nomes de ureia foram para `Urea_Creatinine_Ratio`
    // (56997-0), e aqui ficam só as grafias de BUN, pela mesma regra que
    // tirou "BUN" dos nomes de `Urea`: um nome exato resolve a um exame só.
    loinc: '3097-3',
    names: {
      en: ['BUN/Creatinine Ratio'],
      pt: ['Razão BUN / Creatinina', 'Razão Nitrogênio Ureico / Creatinina'],
    },
    unit: 'razão',
  },
  {
    code: 'Urea_Creatinine_Ratio',
    // 56997-0 é "Urea/Creatinine [Mass Ratio] in Serum or Plasma": a mesma
    // propriedade (MRto) e o mesmo material de 3097-3, com componente ureia
    // em vez de nitrogênio ureico. É a razão que o laudo brasileiro imprime,
    // porque o exame de rotina aqui é a ureia (3091-6), e não o BUN. Sem
    // faixa de referência: o intervalo que circula (cerca de 21-43) é a
    // conversão 10-20 × 2,14, sem fonte publicada em `sources.ts` que o
    // sustente, e uma faixa derivada sem citação é justamente o que o teste
    // de fontes existe para barrar. Sem faixa, o valor sai sem flag, que é
    // melhor que o flag errado de antes.
    loinc: '56997-0',
    names: {
      en: ['Urea/Creatinine Ratio'],
      pt: ['Razão Ureia / Creatinina', 'Relação Ureia / Creatinina'],
    },
    unit: 'razão',
  },
  {
    code: 'Creatinine',
    loinc: '2160-0',
    names: {
      en: ['Creatinine', 'Serum Creatinine'],
      pt: ['Creatinina', 'Creatinina Sérica'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'eGFR',
    codeAliases: ['CKDEPI_2021', 'CKDEPI_eGFR_2021', 'eGFR_CKDEPI_2021', 'eGFR_MDRD'],
    loinc: '98979-8',
    names: {
      en: [
        'Estimated Glomerular Filtration Rate',
        'eGFR',
        'GFR',
        'eGFR CKD-EPI',
        'eGFR CKD-EPI 2021',
        'CKD-EPI 2021',
        // O laudo imprime só "CKD-EPI 2021", e a extração devolve o nome com o
        // "GFR" na frente. Sem esta entrada o exame virava
        // `UNKNOWN_GFR_CKD_EPI_2021` num laudo do Fleury, com valor medido e
        // tudo, porque a resolução por nome não achava a forma composta.
        'GFR CKD-EPI 2021',
        'CKD-EPI eGFR 2021',
        'eGFR (CKD-EPI 2021)',
        'eGFR (MDRD)',
        'Glomerular Filtration Rate',
      ],
      pt: [
        'Taxa de Filtração Glomerular Estimada',
        'TFGe',
        'TFG',
        'TFGe CKD-EPI',
        'Filtração Glomerular',
        'CKD-EPI 2021',
        'TFGe CKD-EPI 2021',
      ],
    },
    unit: 'mL/min/1.73m²',
  },
  {
    code: 'Potassium',
    loinc: '2823-3',
    names: {
      en: ['Potassium', 'K'],
      pt: ['Potássio', 'K'],
    },
    unit: 'mEq/L',
  },
  {
    code: 'Sodium',
    loinc: '2951-2',
    names: {
      en: ['Sodium', 'Na'],
      pt: ['Sódio', 'Na'],
    },
    unit: 'mEq/L',
  },
  {
    code: 'AnionGap',
    // Conceito base, calculado: o laudo não diz se entrou o potássio. O
    // painel metabólico americano imprime o resultado; o brasileiro raramente.
    loinc: '33037-3',
    names: {
      en: ['Anion Gap'],
      pt: ['Ânion Gap', 'Hiato Aniônico', 'Anion Gap'],
    },
    unit: 'mEq/L',
  },
  {
    code: 'Creatinine_Urine',
    codeAliases: ['Urine_Creatinine'],
    loinc: '2161-8',
    names: {
      en: ['Creatinine Urine', 'Urine Creatinine', 'Creatinine Random Urine'],
      pt: ['Creatinina Urinária', 'Creatinina na Urina'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'Albumin_Creatinine_Ratio',
    codeAliases: ['ACR'],
    loinc: '9318-7',
    names: {
      en: [
        'Albumin/Creatinine Ratio',
        'Albumin Creatinine Ratio',
        'ACR',
        'Urine Albumin to Creatinine Ratio',
      ],
      pt: [
        'Razão Albumina/Creatinina',
        'Relação Albumina Creatinina',
        'RAC',
        'Razão Albumina Creatinina Urinária',
      ],
    },
    unit: 'mg/g',
  },

  // ============================================================================
  // PANCREAS
  // ============================================================================
  {
    code: 'Amylase',
    loinc: '1798-8',
    names: {
      en: ['Amylase', 'Serum Amylase'],
      pt: ['Amilase'],
    },
    unit: 'U/L',
  },
  {
    code: 'Lipase',
    loinc: '3040-3',
    names: {
      en: ['Lipase', 'Serum Lipase'],
      pt: ['Lipase'],
    },
    unit: 'U/L',
  },

  // ============================================================================
  // ELECTROLYTES / ELETROLITOS
  // ============================================================================
  {
    code: 'CO2',
    loinc: '2028-9',
    names: {
      en: ['Carbon Dioxide', 'CO2', 'Bicarbonate'],
      pt: ['Dióxido de Carbono', 'CO2', 'Bicarbonato'],
    },
    unit: 'mEq/L',
  },
  {
    code: 'Chloride',
    loinc: '2075-0',
    names: {
      en: ['Chloride', 'Cl'],
      pt: ['Cloreto', 'Cloretos', 'Cl'],
    },
    unit: 'mEq/L',
  },

  // ============================================================================
  // URINE / URINA
  // ============================================================================
  {
    code: 'Appearance_Urine',
    codeAliases: ['UrineAppearance'],
    loinc: '5767-9',
    names: {
      en: ['Urine Appearance', 'Appearance'],
      pt: ['Aparência da Urina', 'Aparência'],
    },
  },
  {
    code: 'Bacteria_Urine',
    codeAliases: ['UrineBacteria'],
    // 5769-5 é "Bacteria [#/area] in Urine sediment by Microscopy high power
    // field", a contagem do sedimento que a unidade /HPF declara. Até out/2026
    // apontava para 630-4, "Bacteria identified in Urine by Culture": outro
    // exame, nominal, que identifica a espécie em cultura. Sem alias:
    // urocultura não é sedimento.
    loinc: '5769-5',
    names: {
      en: ['Urine Bacteria', 'Bacteria Urine', 'Bacteria, Urine', 'Bacteria', 'Bacteriuria'],
      pt: ['Bactérias na Urina', 'Bactérias', 'Bacteriúria'],
    },
    unit: '/HPF',
  },
  {
    code: 'Bilirubin_Urine',
    codeAliases: ['UrineBilirubin'],
    loinc: '5770-3',
    names: {
      en: ['Urine Bilirubin', 'Bilirubin Urine', 'Bilirubin, Urine', 'Bilirubin'],
      pt: ['Bilirrubina na Urina', 'Bilirrubina Urina', 'Bilirrubina'],
    },
  },
  {
    code: 'Blood_Urine',
    codeAliases: ['UrineBlood'],
    loinc: '5794-3',
    names: {
      en: ['Urine Blood', 'Occult Blood in Urine', 'Occult Blood', 'Blood'],
      pt: ['Sangue Oculto na Urina', 'Sangue Oculto'],
    },
  },
  {
    code: 'Color_Urine',
    codeAliases: ['UrineColor'],
    loinc: '5778-6',
    names: {
      en: ['Urine Color', 'Color'],
      pt: ['Cor da Urina', 'Cor'],
    },
  },
  {
    code: 'Glucose_Urine',
    // 25428-4 é "Glucose [Presence] in Urine by Test strip": o EAS brasileiro
    // imprime glicose como Negativo, Traços ou cruzes, resultado qualitativo,
    // propriedade PrThr. Até out/2026 apontava para 5792-7, o mesmo exame em
    // massa/volume (mg/dL), que fica como alias para laudo que imprima o número.
    loinc: '25428-4',
    loincAliases: ['5792-7'],
    names: {
      en: ['Urine Glucose', 'Glucose Urine', 'Glucose, Urine'],
      pt: ['Glicose na Urina', 'Glicose Urina'],
    },
  },
  {
    code: 'HyalineCasts_Urine',
    codeAliases: ['UrineHyalineCast'],
    loinc: '5796-8',
    names: {
      en: ['Hyaline Casts Urine', 'Hyaline Cast', 'Hyaline Casts'],
      pt: ['Cilindros Hialinos na Urina', 'Cilindro Hialino'],
    },
    unit: '/LPF',
  },
  {
    code: 'Ketones_Urine',
    codeAliases: ['UrineKetones'],
    // 2514-8 é "Ketones [Presence] in Urine by Test strip": o EAS imprime
    // Negativo ou cruzes, propriedade PrThr. Até out/2026 apontava para 5797-6,
    // o mesmo exame em mg/dL, que fica como alias (PRE-473, rodada 11).
    loinc: '2514-8',
    loincAliases: ['5797-6'],
    names: {
      en: ['Urine Ketones', 'Ketones Urine', 'Ketones, Urine', 'Ketones'],
      pt: ['Cetonas na Urina', 'Cetonas'],
    },
    // O código é de classe CHEM no LOINC, mas o laudo imprime as cetonas na
    // fita da urina tipo I, e é ali que a ancoragem da urinálise as procura.
    section: 'URN',
  },
  {
    code: 'LeukocyteEsterase_Urine',
    loinc: '5799-2',
    names: {
      en: ['Leukocyte Esterase Urine', 'Leukocyte Esterase', 'Leuk Esterase'],
      pt: ['Esterase Leucocitária na Urina', 'Esterase Leucocitária'],
    },
  },
  {
    code: 'Leukocytes_Urine',
    codeAliases: ['UrineLeukocytes'],
    loinc: '5821-4',
    names: {
      en: ['Urine Leukocytes', 'Urine WBC', 'White Blood Cells in Urine', 'WBC Urine'],
      pt: ['Leucócitos na Urina', 'Leucócitos Urinários'],
    },
    unit: '/HPF',
  },
  {
    code: 'Nitrite_Urine',
    codeAliases: ['UrineNitrite'],
    loinc: '5802-4',
    names: {
      en: ['Urine Nitrite', 'Nitrite Urine', 'Nitrite, Urine', 'Nitrite'],
      pt: ['Nitrito na Urina', 'Nitrito Urina', 'Nitrito'],
    },
  },
  {
    code: 'pH_Urine',
    codeAliases: ['UrinaryPH'],
    loinc: '5803-2',
    names: {
      en: ['Urine pH', 'pH Urine', 'pH, Urine'],
      pt: ['pH Urinário', 'pH da Urina'],
    },
  },
  {
    code: 'Protein_Urine',
    // 20454-5 é "Protein [Presence] in Urine by Test strip": o EAS imprime
    // Negativo, Traços ou cruzes, propriedade PrThr. Até out/2026 apontava para
    // 5804-0, o mesmo exame em mg/dL, que fica como alias (PRE-473, rodada 11).
    loinc: '20454-5',
    loincAliases: ['5804-0'],
    names: {
      en: ['Urine Protein', 'Protein Urine', 'Protein, Urine', 'Protein'],
      pt: ['Proteína na Urina', 'Proteína'],
    },
  },
  {
    code: 'RBC_Urine',
    // 13945-1 é "Erythrocytes [#/area] in Urine sediment by Microscopy high
    // power field", o /HPF que o laudo imprime e que `Leukocytes_Urine` já usa
    // em 5821-4. Até out/2026 apontava para 5808-1, o mesmo exame em #/volume
    // (por mL): analito e material certos, propriedade errada. Fica como alias
    // porque o analito é o mesmo, e laudo de analisador automático que conte
    // por mL continua resolvendo em RBC_Urine.
    loinc: '13945-1',
    loincAliases: ['5808-1'],
    names: {
      en: ['Urine RBC', 'Red Blood Cells in Urine', 'RBC Urine', 'RBC, Urine'],
      pt: ['Hemácias na Urina'],
    },
    unit: '/HPF',
  },
  {
    code: 'SpecificGravity_Urine',
    codeAliases: ['SpecificGravity'],
    loinc: '5811-5',
    names: {
      en: [
        'Urine Specific Gravity',
        'Specific Gravity Urine',
        'Specific Gravity, Urine',
        'Specific Gravity',
      ],
      pt: ['Densidade da Urina', 'Gravidade Específica'],
    },
  },
  {
    code: 'SquamousEpithelial_Urine',
    codeAliases: ['UrineSquamousEpithelial'],
    loinc: '11277-1',
    names: {
      en: [
        'Squamous Epithelial Cells Urine',
        'Squamous Epithelial Cells, Urine',
        'Squamous Epithelial Urine',
        'Squamous Epithelial Cells',
      ],
      pt: ['Células Epiteliais Escamosas na Urina'],
    },
    unit: '/HPF',
  },
  {
    code: 'Urobilinogen_Urine',
    codeAliases: ['Urine_Urobilinogen'],
    loinc: '20405-7',
    names: {
      en: ['Urobilinogen Urine', 'Urine Urobilinogen', 'Urobilinogen'],
      pt: ['Urobilinogênio Urinário', 'Urobilinogênio na Urina', 'Urobilinogênio'],
    },
    unit: 'mg/dL',
  },

  // ============================================================================
  // TUMOR MARKERS / MARCADORES TUMORAIS
  // ============================================================================
  {
    code: 'AFP',
    codeAliases: ['AlfaFetoproteina', 'Alfa_Fetoprotena'],
    loinc: '1834-1',
    names: {
      en: ['Alpha-Fetoprotein', 'AFP', 'Alfa-Fetoprotein'],
      pt: ['Alfa-Fetoproteína', 'AFP', 'Alfafetoproteína'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'CA125',
    codeAliases: ['CA_125'],
    loinc: '10334-1',
    names: {
      en: ['CA-125', 'CA 125', 'Cancer Antigen 125'],
      pt: ['CA-125', 'CA 125', 'Antígeno CA-125'],
    },
    sex: 'female',
    unit: 'U/mL',
  },
  {
    code: 'CEA',
    codeAliases: ['Carcinoembryonic_Antigen_CEA_Serum'],
    loinc: '2039-6',
    names: {
      en: ['Carcinoembryonic Antigen', 'CEA'],
      pt: ['Antígeno Carcinoembrionário', 'CEA'],
    },
    unit: 'ng/mL',
  },

  // ============================================================================
  // ADD-ON TESTS (Commented out for future use)
  // These are specialized tests available as add-ons in Function Health.
  // Uncomment when ready to support in the UI.
  // ============================================================================

  // --- CELIAC / GLUTEN INTOLERANCE (Add-on) ---
  {
    code: 'Gliadin_Deamidated_IgA',
    // 63453-5 e 63459-2 (IgG) afirmam método, "by Immunoassay", e material,
    // "Serum". É o que os kits de DGP usam. A propriedade é unidades
    // arbitrárias por volume, e o laudo imprime U/mL; até out/2026 a unidade
    // declarada era "U", sem o volume.
    loinc: '63453-5',
    names: {
      en: [
        'Gliadin (Deamidated) Antibodies IgA',
        'DGP IgA',
        'Deamidated Gliadin Peptide IgA',
        'Gliadin Deamidated AB IgA',
        'Gliadin Deamidated AB, IgA',
        'Gliadin (Deamidated) AB (IgA)',
        'Gliadin (Deamidated) AB (IGA)',
      ],
      pt: ['Anticorpos Anti-Gliadina Deamidada IgA', 'DGP IgA'],
    },
    unit: 'U/mL',
  },
  {
    code: 'Gliadin_Deamidated_IgG',
    loinc: '63459-2',
    names: {
      en: [
        'Gliadin (Deamidated) Antibodies IgG',
        'DGP IgG',
        'Deamidated Gliadin Peptide IgG',
        'Gliadin Deamidated AB IgG',
        'Gliadin Deamidated AB, IgG',
        'Gliadin (Deamidated) AB (IgG)',
        'Gliadin (Deamidated) AB (IGG)',
      ],
      pt: ['Anticorpos Anti-Gliadina Deamidada IgG', 'DGP IgG'],
    },
    unit: 'U/mL',
  },
  {
    code: 'tTG_IgA',
    loinc: '31017-7',
    names: {
      en: [
        'Tissue Transglutaminase IgA',
        'tTG IgA',
        'Anti-tTG IgA',
        'Tissue Transglutaminase AB, IGA',
        'Tissue Transglutaminase AB IgA',
        'TTG AB IGA',
        'T-Transglutaminase IgA',
        'Transglutaminase IgA',
      ],
      pt: ['Transglutaminase Tecidual IgA', 'tTG IgA', 'Anti-tTG IgA'],
    },
    unit: 'U/mL',
  },
  {
    code: 'tTG_IgG',
    loinc: '32998-7',
    names: {
      en: [
        'Tissue Transglutaminase IgG',
        'tTG IgG',
        'Anti-tTG IgG',
        'Tissue Transglutaminase AB, IGG',
        'Tissue Transglutaminase AB IgG',
        'TTG AB IGG',
        'T-Transglutaminase IgG',
        'Transglutaminase IgG',
      ],
      pt: ['Transglutaminase Tecidual IgG', 'tTG IgG', 'Anti-tTG IgG'],
    },
    unit: 'U/mL',
  },

  // ============================================================================
  // CARDIOVASCULAR GENETICS / GENÉTICA CARDIOVASCULAR
  // ============================================================================
  {
    code: 'APOE_Genotype',
    loinc: '21619-2',
    names: {
      en: [
        'APOE Genotype',
        'Apolipoprotein E Genotype',
        'ApoE Gene',
        'APO E Genotype',
        'Cardio IQ APOE Genotype',
      ],
      pt: ['Genótipo APOE', 'Genótipo Apolipoproteína E'],
    },
  },

  // ============================================================================
  // METABOLIC ADD-ONS / MARCADORES METABÓLICOS ADICIONAIS
  // ============================================================================
  {
    code: 'Adiponectin',
    loinc: '47828-9',
    names: {
      en: ['Adiponectin', 'Serum Adiponectin'],
      pt: ['Adiponectina'],
    },
    unit: 'mcg/mL',
  },

  // ============================================================================
  // BODY COMPOSITION / COMPOSIÇÃO CORPORAL (DEXA Scan)
  // ============================================================================
  {
    code: 'BMI',
    codeAliases: ['Body_Mass_Index'],
    loinc: '39156-5',
    names: {
      en: ['Body Mass Index', 'BMI'],
      pt: ['Índice de Massa Corporal', 'IMC'],
    },
    unit: 'kg/m2',
  },
  {
    code: 'BodyFatPct',
    loinc: '41982-0',
    names: {
      en: [
        'Body Fat Percentage',
        'Body Fat %',
        'Total Body Fat %',
        'Body Fat',
        'Fat Percentage',
        'Percent Body Fat',
        'Fat Mass Percentage',
        '% Body Fat',
        'Total Body % Fat',
        // A Live Lean imprime "Total Fat %" na tabela regional da página 1 (a
        // linha "Total" é o percentual do corpo inteiro) e "Total Fat (%)" na
        // tabela de tendência. Os dois são o "Total Body Fat %" da mesma data.
        // Sem eles, o "Total Fat" da massa de gordura, logo abaixo, ancorava
        // `FatMass` na citação do percentual.
        'Total Fat %',
        'Total Fat (%)',
      ],
      pt: [
        'Percentual de Gordura Corporal',
        '% Gordura Corporal',
        'Gordura Corporal Total %',
        'Percentual de Gordura',
        '% Gordura Total',
        'Gordura Corporal',
      ],
    },
    unit: '%',
  },
  {
    code: 'FatMass',
    loinc: '73708-0',
    names: {
      // "Total Fat" é a coluna "Total Fat (lbs)" da tabela de tendência da
      // densitometria Live Lean, e traz o mesmo número do "Fat Mass" da página
      // 1 em todas as datas que as duas tabelas imprimem.
      en: ['Fat Mass', 'Total Fat Mass', 'Body Fat Mass', 'Fat Tissue Mass', 'Total Fat'],
      pt: ['Massa de Gordura', 'Massa Gorda', 'Massa de Gordura Total', 'Tecido Adiposo'],
    },
    unit: 'kg',
  },
  // Sem `loinc` de propósito. A entrada apontava para 73964-9, cujo nome
  // oficial é "Body muscle mass Calculated", e massa magra não é massa
  // muscular: em DEXA, massa magra é tudo que não é gordura nem mineral
  // ósseo, incluindo órgãos, água e tecido conjuntivo. Massa muscular é um
  // subconjunto dela.
  //
  // O 91557-9 representa peso menos gordura, incluindo BMC, e pertence a
  // FatFreeMass. O laudo DXA GE Lunar Prodigy separa esse total do tecido
  // magro sem mineral ósseo; ver a auditoria de 09/10/2026.
  // Quem quer massa muscular usa MuscleMass, abaixo.
  {
    code: 'LeanMass',
    names: {
      // "Total Lean" é a coluna "Total Lean (lbs)" da mesma tabela de
      // tendência: tecido magro, igual ao "Lean Mass" da página 1, e não a
      // massa livre de gordura, que soma o mineral ósseo e fica em
      // `FatFreeMass`.
      en: [
        'Lean Mass',
        'Lean Body Mass',
        'Lean Tissue Mass',
        'Total Lean Mass',
        'LBM',
        'Total Lean',
      ],
      pt: ['Massa Magra', 'Massa Corporal Magra', 'Tecido Magro', 'Massa Magra Total'],
    },
    section: 'OTH',
    unit: 'kg',
  },
  {
    code: 'BMC',
    // 101685-6 (Body bone mass) é candidato, mas não explicita mineral ósseo.
    // A equivalência com BMC de DXA permanece em revisão.
    names: {
      en: [
        'Bone Mineral Content',
        'BMC',
        'Total Body BMC',
        'Bone Mass',
        'Total Bone Mineral Content',
      ],
      pt: [
        'Conteúdo Mineral Ósseo',
        'CMO',
        'Massa Óssea',
        'Conteúdo Mineral Ósseo Total',
        'CMO Total',
      ],
    },
    section: 'RAD',
    unit: 'kg',
  },
  {
    code: 'FatFreeMass',
    // O laudo DXA define Fat Free como Lean Tissue + BMC, equivalente ao
    // peso total menos gordura. O mesmo componente LOINC aparece na fórmula
    // de 88334-8; 91557-9 preserva a entrada genérica sem afirmar método.
    loinc: '91557-9',
    names: {
      en: ['Fat-Free Mass', 'Fat Free Mass', 'Fat Free', 'FFM', 'Non-Fat Mass'],
      pt: ['Massa Livre de Gordura', 'Massa Isenta de Gordura', 'MLG'],
    },
    unit: 'kg',
  },
  {
    code: 'VATVolume',
    // A tabela de tendência do DEXA traz a seção "Visceral Adipose Tissue (VAT)"
    // com as colunas "Fat Mass" e "Volume", e o modelo nomeia a linha com o
    // prefixo da seção. Antes do nome abaixo, o valor era gravado com o código
    // `UNKNOWN_` que fica aqui como alias, e o `normalizeCode` na leitura
    // devolve as observações já gravadas para este código.
    codeAliases: ['UNKNOWN_Visceral_Adipose_Tissue_VAT_Volume'],
    // No official LOINC code exists for visceral adipose tissue volume
    names: {
      en: [
        'Visceral Fat Volume',
        'VAT Volume',
        'VATVolume',
        'Visceral Adipose Tissue Volume',
        'Visceral Adipose Tissue (VAT) Volume',
        'VAT',
        // "Visceral Fat" e "Gordura Visceral" nus não dizem qual das duas
        // medidas o laudo traz, então também estão no `VisceralFatLevel`. O
        // pré-scan devolve os dois candidatos e o modelo decide pela unidade e
        // pela ordem de grandeza, que é o que separa um índice 9 de 120 cm³.
        'Visceral Fat',
        'Visceral Volume',
      ],
      pt: [
        'Volume de Gordura Visceral',
        'Volume TAV',
        'Tecido Adiposo Visceral Volume',
        'Gordura Visceral',
        'Volume Visceral',
      ],
    },
    section: 'RAD',
    unit: 'cm³',
  },
  {
    code: 'VATMass',
    // Mesmo caso do `VATVolume`: a coluna da tendência do DEXA é "Fat Mass", e
    // o nome chega como "Visceral Adipose Tissue (VAT) Fat Mass".
    codeAliases: ['UNKNOWN_Visceral_Adipose_Tissue_VAT_Fat_Mass'],
    // No official LOINC code exists for visceral adipose tissue mass
    names: {
      en: [
        'Visceral Fat Mass',
        'VAT Mass',
        'VATMass',
        'Visceral Adipose Tissue Mass',
        'Visceral Adipose Tissue (VAT) Fat Mass',
        'Visceral Adipose Tissue Fat Mass',
        'VAT Fat Mass',
        'Visceral Adipose Tissue',
        'Visceral Mass',
      ],
      pt: [
        'Massa de Gordura Visceral',
        'Massa TAV',
        'Tecido Adiposo Visceral Massa',
        'Tecido Adiposo Visceral',
        'Massa Visceral',
      ],
    },
    section: 'RAD',
    unit: 'kg',
  },
  {
    code: 'AndroidGynoidRatio',
    // No official LOINC code exists for android/gynoid ratio
    names: {
      en: [
        'Android/Gynoid Ratio',
        'A/G Ratio',
        'Android Gynoid Ratio',
        'AndroidGynoidRatio',
        'AG Ratio',
        'Android to Gynoid Ratio',
        'AndrogenGynoindRatio',
        'Androgen Gynoid Ratio',
      ],
      pt: [
        'Razão Androide/Ginoide',
        'Razão A/G',
        'Relação Androide Ginoide',
        'Razão AG',
        'Índice Androide/Ginoide',
      ],
    },
    section: 'RAD',
    unit: 'razão',
  },
  {
    code: 'AndroidFatPct',
    // No official LOINC code exists for android region fat percentage
    names: {
      en: [
        'Android Fat Percentage',
        'Android Fat %',
        'AndroidFatPct',
        'AndroidFatPercent',
        'Android Region Fat %',
        'Abdominal Fat %',
        'Android % Fat',
        // A célula da tabela regional da Live Lean: linha "Android", coluna
        // "Total Fat %". Sem o nome, o "Total Fat %" da citação ancorava
        // `BodyFatPct`, e a região bloqueava o casamento sem pôr nada no lugar.
        'Android Total Fat %',
      ],
      pt: [
        'Percentual de Gordura Androide',
        '% Gordura Androide',
        'Gordura Região Androide %',
        '% Gordura Abdominal',
      ],
    },
    section: 'RAD',
    unit: '%',
  },
  {
    code: 'GynoidFatPct',
    // No official LOINC code exists for gynoid region fat percentage
    names: {
      en: [
        'Gynoid Fat Percentage',
        'Gynoid Fat %',
        'GynoidFatPct',
        'GynoidFatPercent',
        'GynoindFatPercent',
        'Gynoid Region Fat %',
        'Hip Fat %',
        'Gynoid % Fat',
        // A célula da tabela regional da Live Lean: linha "Gynoid", coluna
        // "Total Fat %". Sem o nome, o "Total Fat %" da citação ancorava
        // `BodyFatPct`, e a região bloqueava o casamento sem pôr nada no lugar.
        'Gynoid Total Fat %',
      ],
      pt: [
        'Percentual de Gordura Ginoide',
        '% Gordura Ginoide',
        'Gordura Região Ginoide %',
        '% Gordura Quadril',
      ],
    },
    section: 'RAD',
    unit: '%',
  },
  {
    code: 'TotalMass',
    loinc: '29463-7',
    names: {
      en: ['Total Mass', 'Total Body Mass', 'Body Weight', 'Weight'],
      pt: ['Massa Total', 'Massa Corporal Total', 'Peso Corporal', 'Peso'],
    },
    unit: 'kg',
  },

  // ===========================================================================
  // Composição corporal por bioimpedância, adipometria e antropometria
  // ===========================================================================
  //
  // POLÍTICA DE `loinc` AUSENTE, e o que ela custa
  //
  // Várias entradas abaixo não têm `loinc`. Isso não é pendência esquecida: é
  // o resultado de procurar e não achar, e a decisão tem consequência que
  // vale enunciar uma vez.
  //
  // O que muda sem o código: a observação continua sendo exportada em FHIR e
  // continua aparecendo para o usuário, mas o `Observation.code` sai só com o
  // nosso código interno, sem identificador interoperável. Um consumidor
  // externo consegue ler o valor e a unidade, e não consegue mapear a medida
  // para o vocabulário dele sem acordo bilateral. Na prática: exibível
  // sempre, comparável entre sistemas só quando há LOINC.
  //
  // Por que ainda assim é o certo: código errado é pior que código ausente.
  // Ausente o consumidor sabe que precisa perguntar; errado ele integra com
  // confiança e erra em silêncio. Esta mesma PR corrige um caso desses, em
  // que `LeanMass` apontava para "Body muscle mass" e o IG publicava massa
  // muscular sob o rótulo de massa magra.
  //
  // Como preencher depois: quando a LOINC publicar o conceito, basta somar o
  // campo `loinc` — o código interno não muda, e as observações já gravadas
  // não precisam ser reescritas, porque a chave é o nosso código.
  //
  // Todos os códigos aqui foram conferidos na API pública da NLM (Clinical
  // Table Search Service), e a ausência só foi registrada depois de tentar
  // múltiplas formulações: "total body water" não devolve nada, "body water"
  // devolve os dois códigos abaixo.
  //
  // As 13 entradas sem código, e o motivo de cada uma:
  //
  //   MuscleMassIndex       corte publicado é sobre massa apendicular, não total
  //   VisceralFatLevel      índice de 1 a 20; 73707-2 é área, outra grandeza
  //   ResidualMass          conceito de fracionamento antropométrico, não LOINC
  //   BasalMetabolicRate    candidatos são índice ou RMR medido, ver nota local
  //   ExtracellularWater    "extracellular water" não devolve nada
  //   IntracellularWater    "intracellular water" não devolve nada
  //   ECWToTBWRatio         razão derivada, sem conceito próprio
  //   WaistToHeightRatio    "waist to height" não devolve nada
  //   ConicityIndex         índice derivado, sem conceito próprio
  //   SkinfoldSubscapular   LOINC só tem tríceps, coxa e cintura
  //   SkinfoldSuprailiac    idem
  //   SkinfoldChest         idem
  //   SkinfoldMidaxillary   idem

  // Bioimpedância (BIA)
  {
    code: 'TotalBodyWater',
    // 101683-1 é "Body water mass", em kg; o aparelho de bioimpedância imprime
    // litros. É o único código de água corporal total no LOINC 2.82 (o outro,
    // 101684-9, é o percentual), e para água 1 L pesa 1 kg, então o número não
    // muda. O teste de eixos lista a entrada como exceção com este motivo.
    loinc: '101683-1',
    names: {
      en: ['Total Body Water', 'Body Water', 'TBW', 'Total Water'],
      pt: ['Água Corporal Total', 'Água Corporal', 'ACT', 'Água Total'],
    },
    unit: 'L',
  },
  {
    code: 'BodyWaterPct',
    loinc: '101684-9',
    names: {
      en: ['Body Water Percentage', 'Percentage of Body Water', '% Body Water', 'Water %'],
      pt: ['Percentual de Água Corporal', '% Água Corporal', 'Água Corporal %'],
    },
    unit: '%',
  },
  {
    code: 'MuscleMass',
    loinc: '73964-9',
    names: {
      en: ['Muscle Mass', 'Skeletal Muscle Mass', 'SMM', 'Body Muscle Mass'],
      pt: [
        'Massa Muscular',
        'Massa Muscular Esquelética',
        'MME',
        'Massa Muscular Corporal',
        'Músculo',
      ],
    },
    unit: 'kg',
  },
  // Derivado, não extraído: `MuscleMass / altura²`, calculado pelo
  // `calculadoras-clinicas` a partir da altura que o usuário informa no
  // cadastro. Mesmo ajuste que o IMC faz com o peso, e serve para a medida
  // ser comparável entre estaturas diferentes e ao longo do tempo.
  //
  // Sem `loinc` e sem faixa, e agora com fonte para a decisão em vez de só
  // cautela. O EWGSOP2 (Age and Ageing, 2019, DOI 10.1093/ageing/afy169)
  // separa explicitamente "total body Skeletal Muscle Mass (SMM)" de
  // "Appendicular Skeletal Muscle Mass (ASM)", e os cortes publicados são
  // sobre ASM. `MuscleMass` aqui é total, então o corte não se aplica.
  //
  // O mesmo consenso ainda diz, sobre ajustar por tamanho corporal: "The
  // authors make no recommendation to adjust for body size, but adjustment
  // can be made if data are available for a relevant normative population."
  // Não temos população normativa brasileira para bioimpedância, e o
  // consenso registra que a equação de Sergi, padrão do método, foi
  // derivada em europeus idosos.
  //
  // Por isso o índice existe para acompanhar a própria evolução, e não para
  // classificar.
  {
    code: 'MuscleMassIndex',
    names: {
      en: ['Muscle Mass Index', 'Skeletal Muscle Mass Index', 'SMI', 'SMMI'],
      pt: ['Índice de Massa Muscular', 'IMM', 'Índice de Massa Muscular Esquelética'],
    },
    section: 'OTH',
    unit: 'kg/m2',
  },
  {
    code: 'PhaseAngle',
    // 107160-4 é "Phase angle Xc/R [Ratio] Bioelectrical impedance analysis",
    // único código de ângulo de fase. O aparelho imprime graus (arctan Xc/R)
    // e o LOINC declara razão com unidade-exemplo %. Fica em graus, que é o
    // que o laudo traz, e o teste de eixos lista a entrada como exceção.
    loinc: '107160-4',
    names: {
      en: ['Phase Angle', 'Whole Body Phase Angle', 'PhA', 'AnglePhase'],
      pt: ['Ângulo de Fase', 'Ângulo de Fase Corporal'],
    },
    unit: 'deg',
  },
  // O nível de gordura visceral do InBody e similares é um índice
  // adimensional de 1 a 20, e NÃO é o mesmo que VATMass ou VATVolume, que
  // vêm de DEXA em massa e volume. LOINC 73707-2 é "Visceral fat [Area]", em
  // área, então também não serve. Fica sem código, com unidade vazia, para
  // não ser confundido com nenhum dos três.
  {
    code: 'VisceralFatLevel',
    names: {
      en: ['Visceral Fat Level', 'Visceral Fat Index', 'VFL', 'Visceral Fat'],
      pt: [
        'Nível de Gordura Visceral',
        'Índice de Gordura Visceral',
        'Gordura Visceral Nível',
        // Termo nu, compartilhado com o `VATVolume` de propósito. Ver o
        // comentário lá.
        'Gordura Visceral',
      ],
    },
    section: 'OTH',
    unit: '',
  },
  // Compartimentos de água: buscar "fluid" encontra 73706-4 (Measured)
  // e 73705-6 (Estimated). A entrada genérica não declara esses métodos;
  // a adoção depende do laudo/manual, conforme NO_LOINC_DECISIONS.
  {
    code: 'ExtracellularWater',
    names: {
      en: ['Extracellular Water', 'ECW'],
      pt: ['Água Extracelular', 'AEC'],
    },
    section: 'OTH',
    unit: 'L',
  },
  {
    code: 'IntracellularWater',
    names: {
      en: ['Intracellular Water', 'ICW'],
      pt: ['Água Intracelular', 'AIC'],
    },
    section: 'OTH',
    unit: 'L',
  },
  // Razão entre água extracelular e total. É o marcador de retenção hídrica
  // e de estado inflamatório que os aparelhos de bioimpedância reportam, e
  // vem adimensional.
  {
    code: 'ECWToTBWRatio',
    names: {
      en: ['ECW/TBW', 'ECW_TBW', 'ECW to TBW Ratio', 'Extracellular Water Ratio'],
      pt: ['Relação AEC/ACT', 'Razão Água Extracelular'],
    },
    section: 'OTH',
    unit: '',
  },
  {
    code: 'ResidualMass',
    names: {
      en: ['Residual Mass', 'Residual Weight'],
      pt: ['Massa Residual', 'Peso Residual'],
    },
    section: 'OTH',
    unit: 'kg',
  },
  // Sem `loinc` até alguém decidir com a definição completa em mãos. Os
  // candidatos não servem como estão: 50042-1 é "Basal metabolic rate
  // index", um índice e não kcal/dia; 82278-3 é "Measured RMR", medido por
  // calorimetria indireta, enquanto o aparelho de bioimpedância *estima* a
  // partir da massa magra; 82286-6 "Predicted RMR" é o mais próximo, mas
  // ainda é RMR e não TMB. Colocar qualquer um deles repetiria o erro que
  // esta mesma PR corrige em LeanMass.
  {
    code: 'BasalMetabolicRate',
    names: {
      en: ['Basal Metabolic Rate', 'BMR'],
      pt: ['Taxa Metabólica Basal', 'TMB', 'Metabolismo Basal', 'Gasto Energético Basal'],
    },
    section: 'OTH',
    unit: 'kcal/d',
  },

  // Antropometria
  {
    code: 'WaistCircumference',
    // 8280-0 é a medida em si, e afirma sítio e método: "at umbilicus by Tape
    // measure". 56086-2, que parecia o óbvio pela busca, é "Adult Waist
    // Circumference Protocol", um protocolo PhenX e não um resultado.
    loinc: '8280-0',
    names: {
      en: ['Waist Circumference', 'Abdominal Circumference', 'Waist'],
      pt: [
        'Circunferência de Cintura',
        'Circunferência Abdominal',
        'Perímetro Abdominal',
        'Cintura',
      ],
    },
    unit: 'cm',
  },
  // O EWGSOP2 usa a panturrilha como proxy de massa muscular onde não há
  // outro método disponível, o que a torna útil em consulta sem aparelho.
  {
    code: 'CalfCircumference',
    loinc: '107112-5',
    names: {
      en: ['Calf Circumference', 'Calf Girth'],
      pt: ['Circunferência da Panturrilha', 'Perímetro da Panturrilha', 'Panturrilha'],
    },
    unit: 'cm',
  },
  {
    code: 'WaistToHeightRatio',
    names: {
      en: ['Waist to Height Ratio', 'Waist-to-Height Ratio', 'WHtR'],
      pt: ['Razão Cintura-Altura', 'Relação Cintura-Estatura', 'RCEst'],
    },
    section: 'OTH',
    unit: '',
  },
  {
    code: 'ConicityIndex',
    names: {
      en: ['Conicity Index', 'C Index'],
      pt: ['Índice de Conicidade', 'Índice C'],
    },
    section: 'OTH',
    unit: '',
  },

  // Dobras cutâneas (adipometria)
  //
  // A LOINC tem apenas três sítios: tríceps, coxa e cintura. Os outros quatro
  // que os protocolos brasileiros medem ficam sem código, e é por ausência
  // confirmada, não por falta de busca. Entram individualmente porque o
  // protocolo de somatório varia (Pollock 3 ou 7 dobras, Faulkner, Guedes) e
  // guardar só a soma perderia o dado de origem.
  {
    code: 'SkinfoldTriceps',
    loinc: '8354-3',
    names: {
      en: ['Triceps Skinfold', 'Tricipital Skinfold', 'Skin Fold Thickness Triceps', 'Triceps'],
      pt: ['Dobra Tricipital', 'Dobra Cutânea Tricipital', 'Tricipital', 'DCT'],
    },
    unit: 'mm',
  },
  {
    code: 'SkinfoldThigh',
    loinc: '8353-5',
    names: {
      en: ['Thigh Skinfold', 'Skin Fold Thickness Thigh', 'Thigh'],
      pt: ['Dobra da Coxa', 'Dobra Cutânea Coxa', 'Coxa'],
    },
    unit: 'mm',
  },
  {
    code: 'SkinfoldAbdominal',
    loinc: '8355-0',
    names: {
      en: ['Abdominal Skinfold', 'Waist Skinfold', 'Skin Fold Thickness Waist'],
      pt: ['Dobra Abdominal', 'Dobra Cutânea Abdominal', 'Abdominal'],
    },
    unit: 'mm',
  },
  {
    code: 'SkinfoldSubscapular',
    names: {
      en: ['Subscapular Skinfold', 'Subscapular'],
      pt: ['Dobra Subescapular', 'Dobra Cutânea Subescapular', 'Subescapular'],
    },
    section: 'OTH',
    unit: 'mm',
  },
  {
    code: 'SkinfoldSuprailiac',
    names: {
      en: ['Suprailiac Skinfold', 'Supra-iliac Skinfold', 'Suprailiac'],
      pt: ['Dobra Supra-ilíaca', 'Dobra Cutânea Supra-ilíaca', 'Supra-ilíaca', 'Suprailiaca'],
    },
    section: 'OTH',
    unit: 'mm',
  },
  {
    code: 'SkinfoldChest',
    names: {
      en: ['Chest Skinfold', 'Pectoral Skinfold', 'Chest'],
      pt: ['Dobra Peitoral', 'Dobra Cutânea Peitoral', 'Peitoral', 'Dobra Torácica'],
    },
    section: 'OTH',
    unit: 'mm',
  },
  {
    code: 'SkinfoldMidaxillary',
    names: {
      en: ['Midaxillary Skinfold', 'Mid-axillary Skinfold', 'Midaxillary', 'MidAxilla'],
      pt: ['Dobra Axilar Média', 'Dobra Cutânea Axilar Média', 'Axilar Média'],
    },
    section: 'OTH',
    unit: 'mm',
  },

  // Regional Body Composition (DEXA)
  // Note: No official LOINC codes exist for regional lean/fat mass measurements
  // Hidden from UI for now - may be shown in future regional breakdown view
  //
  // "Arms Total" e "Legs Total" são a linha dos dois membros somados na tabela
  // de equilíbrio muscular do laudo da Live Lean (GE Lunar Prodigy). Conferido
  // em cinco laudos: a massa gorda e a magra dessa linha são a soma do lado
  // direito com o esquerdo, e são o mesmo número das colunas "Arms Fat" e
  // "Arms Lean" da tabela de tendência e da linha "Arms" da tabela regional.
  // O modelo nomeia a linha "Arms Total Fat Mass", e sem o nome ela virava
  // `UNKNOWN_`, enquanto a mesma medida em outra página ia para `ArmsFatMass`:
  // a série do gráfico partia em dois códigos. O `codeAliases` cobre o que já
  // foi gravado assim.
  //
  // As outras colunas da mesma linha ficam sem código de propósito. "Fat %" e
  // "Lean %" são percentual do membro, e "Total Mass" é a massa do membro;
  // o catálogo não tem código regional para nenhum dos dois. "Right Arm" e
  // "Left Arm" são um lado só, e "Arms Difference" é direito menos esquerdo.
  {
    code: 'ArmsLeanMass',
    codeAliases: ['UNKNOWN_Arms_Total_Lean_Mass'],
    hidden: true,
    names: {
      en: [
        'Arms Lean Mass',
        'Arms Total Lean Mass',
        'Arms Lean',
        'Arms Lean Tissue',
        'Arm Lean Mass',
        'Arm Lean',
        'Upper Limb Lean Mass',
        'Upper Limbs Lean Mass',
        'Upper Extremity Lean Mass',
        'Lean Arms',
        'Lean Mass Arms',
        'Lean Mass Bracos',
      ],
      pt: [
        'Massa Magra Braços',
        'Tecido Magro Braços',
        'Massa Magra Membros Superiores',
        'Braços Massa Magra',
        'Massa Magra dos Braços',
        'MMSS Massa Magra',
        'Membros Superiores Magro',
      ],
    },
    section: 'RAD',
    unit: 'kg',
  },
  {
    code: 'ArmsFatMass',
    codeAliases: ['UNKNOWN_Arms_Total_Fat_Mass'],
    hidden: true,
    names: {
      en: [
        'Arms Fat Mass',
        'Arms Total Fat Mass',
        'Arms Fat',
        'Arms Fat Tissue',
        'Arm Fat Mass',
        'Arm Fat',
        'Upper Limb Fat Mass',
        'Upper Limbs Fat Mass',
        'Upper Extremity Fat Mass',
        'Fat Arms',
        'Fat Mass Arms',
        'Fat Mass Bracos',
      ],
      pt: [
        'Massa de Gordura Braços',
        'Tecido Adiposo Braços',
        'Gordura Membros Superiores',
        'Braços Gordura',
        'Gordura dos Braços',
        'Braços Massa Gorda',
        'MMSS Gordura',
        'Membros Superiores Gordura',
      ],
    },
    section: 'RAD',
    unit: 'kg',
  },
  {
    code: 'LegsLeanMass',
    codeAliases: ['UNKNOWN_Legs_Total_Lean_Mass'],
    hidden: true,
    names: {
      en: [
        'Legs Lean Mass',
        'Legs Total Lean Mass',
        'Legs Lean',
        'Legs Lean Tissue',
        'Leg Lean Mass',
        'Leg Lean',
        'Lower Limb Lean Mass',
        'Lower Limbs Lean Mass',
        'Lower Extremity Lean Mass',
        'Lean Legs',
        'Lean Mass Legs',
        'Lean Mass Pernas',
      ],
      pt: [
        'Massa Magra Pernas',
        'Tecido Magro Pernas',
        'Massa Magra Membros Inferiores',
        'Pernas Massa Magra',
        'Massa Magra das Pernas',
        'MMII Massa Magra',
        'Membros Inferiores Magro',
      ],
    },
    section: 'RAD',
    unit: 'kg',
  },
  {
    code: 'LegsFatMass',
    codeAliases: ['UNKNOWN_Legs_Total_Fat_Mass'],
    hidden: true,
    names: {
      en: [
        'Legs Fat Mass',
        'Legs Total Fat Mass',
        'Legs Fat',
        'Legs Fat Tissue',
        'Leg Fat Mass',
        'Leg Fat',
        'Lower Limb Fat Mass',
        'Lower Limbs Fat Mass',
        'Lower Extremity Fat Mass',
        'Fat Legs',
        'Fat Mass Legs',
        'Fat Mass Pernas',
      ],
      pt: [
        'Massa de Gordura Pernas',
        'Tecido Adiposo Pernas',
        'Gordura Membros Inferiores',
        'Pernas Gordura',
        'Gordura das Pernas',
        'Pernas Massa Gorda',
        'MMII Gordura',
        'Membros Inferiores Gordura',
      ],
    },
    section: 'RAD',
    unit: 'kg',
  },
  {
    code: 'TrunkLeanMass',
    hidden: true,
    names: {
      en: [
        'Trunk Lean Mass',
        'Trunk Lean',
        'Trunk Lean Tissue',
        'Torso Lean Mass',
        'Core Lean Mass',
        'Lean Trunk',
        'Lean Mass Trunk',
        'Lean Mass Tronco',
      ],
      pt: [
        'Massa Magra Tronco',
        'Tecido Magro Tronco',
        'Massa Magra Core',
        'Tronco Massa Magra',
        'Massa Magra do Tronco',
      ],
    },
    section: 'RAD',
    unit: 'kg',
  },
  {
    code: 'TrunkFatMass',
    hidden: true,
    names: {
      en: [
        'Trunk Fat Mass',
        'Trunk Fat',
        'Trunk Fat Tissue',
        'Torso Fat Mass',
        'Core Fat Mass',
        'Fat Trunk',
        'Fat Mass Trunk',
        'Fat Mass Tronco',
      ],
      pt: [
        'Massa de Gordura Tronco',
        'Tecido Adiposo Tronco',
        'Gordura Core',
        'Tronco Gordura',
        'Gordura do Tronco',
        'Tronco Massa Gorda',
      ],
    },
    section: 'RAD',
    unit: 'kg',
  },

  // ============================================================================
  // BONE DENSITY / DENSIDADE ÓSSEA (DEXA Scan)
  // ============================================================================
  {
    code: 'BMD_Total',
    bodySite: { code: '38266002', display: 'Entire body as a whole' },
    loinc: '46383-6',
    names: {
      en: [
        'Total Body BMD',
        'BMD Total',
        'BMD',
        'TotalBodyBMD',
        'Bone Mineral Density',
        'Total BMD',
        'Bone Density',
        'Total Body Bone Density',
      ],
      pt: [
        'DMO Corpo Total',
        'DMO Total',
        'DMO',
        'Densidade Mineral Óssea',
        'Densidade Óssea Total',
        'Densidade Óssea',
      ],
    },
    section: 'RAD',
    unit: 'g/cm²',
  },
  {
    code: 'TScore_Total',
    // No official LOINC code exists for total body T-score (only site-specific)
    names: {
      en: [
        'Total Body T-Score',
        'T-Score',
        'T Score',
        'TScore',
        'TScore_Total',
        'TotalBodyTScore',
        'BMD T-Score',
        'Bone Density T-Score',
        'T-Score Total Body',
      ],
      pt: ['T-Score Corpo Total', 'T-Score', 'Escore T', 'T-Score DMO', 'T-Score Densidade Óssea'],
    },
    section: 'RAD',
    unit: 'score',
  },
  {
    code: 'ZScore_Total',
    // No official LOINC code exists for total body Z-score (only site-specific)
    names: {
      en: [
        'Total Body Z-Score',
        'Z-Score',
        'Z Score',
        'ZScore',
        'ZScore_Total',
        'TotalBodyZScore',
        'BMD Z-Score',
        'Bone Density Z-Score',
        'Z-Score Total Body',
      ],
      pt: ['Z-Score Corpo Total', 'Z-Score', 'Escore Z', 'Z-Score DMO', 'Z-Score Densidade Óssea'],
    },
    section: 'RAD',
    unit: 'score',
  },
  // Densidade por região da densitometria de corpo inteiro, a tabela "Region /
  // BMD" do relatório. A coluna aqui é a região do corpo inteiro, e não a
  // coluna lombar (L1-L4) do exame de coluna e quadril, que é outro exame.
  {
    code: 'BMD_Arms',
    bodySite: { code: '371195002', display: 'Bone structure of upper limb' },
    hidden: true,
    loinc: '46383-6',
    names: {
      en: ['Arms BMD', 'BMD Arms', 'Arms Bone Mineral Density', 'Arms Bone Density'],
      pt: ['DMO Braços', 'Densidade Mineral Óssea Braços', 'Densidade Óssea Braços'],
    },
    section: 'RAD',
    unit: 'g/cm²',
  },
  {
    code: 'BMD_Head',
    bodySite: { code: '69536005', display: 'Head structure' },
    hidden: true,
    loinc: '46383-6',
    names: {
      en: ['Head BMD', 'BMD Head', 'Head Bone Mineral Density', 'Head Bone Density'],
      pt: ['DMO Cabeça', 'Densidade Mineral Óssea Cabeça', 'Densidade Óssea Cabeça'],
    },
    section: 'RAD',
    unit: 'g/cm²',
  },
  {
    code: 'BMD_Legs',
    bodySite: { code: '72001000', display: 'Bone structure of lower limb' },
    hidden: true,
    loinc: '46383-6',
    names: {
      en: ['Legs BMD', 'BMD Legs', 'Legs Bone Mineral Density', 'Legs Bone Density'],
      pt: ['DMO Pernas', 'Densidade Mineral Óssea Pernas', 'Densidade Óssea Pernas'],
    },
    section: 'RAD',
    unit: 'g/cm²',
  },
  {
    code: 'BMD_Pelvis',
    bodySite: { code: '118645006', display: 'Bone structure of pelvis' },
    hidden: true,
    loinc: '46383-6',
    names: {
      en: ['Pelvis BMD', 'BMD Pelvis', 'Pelvis Bone Mineral Density', 'Pelvis Bone Density'],
      pt: ['DMO Pelve', 'Densidade Mineral Óssea Pelve', 'Densidade Óssea Pelve'],
    },
    section: 'RAD',
    unit: 'g/cm²',
  },
  {
    code: 'BMD_Ribs',
    bodySite: { code: '113197003', display: 'Bone structure of rib' },
    hidden: true,
    loinc: '46383-6',
    names: {
      en: ['Ribs BMD', 'BMD Ribs', 'Ribs Bone Mineral Density', 'Ribs Bone Density'],
      pt: ['DMO Costelas', 'Densidade Mineral Óssea Costelas', 'Densidade Óssea Costelas'],
    },
    section: 'RAD',
    unit: 'g/cm²',
  },
  {
    code: 'BMD_Spine',
    bodySite: { code: '51282000', display: 'Bone structure of spine' },
    hidden: true,
    loinc: '46383-6',
    names: {
      en: ['Spine BMD', 'BMD Spine', 'Spine Bone Mineral Density', 'Spine Bone Density'],
      pt: ['DMO Coluna', 'Densidade Mineral Óssea Coluna', 'Densidade Óssea Coluna'],
    },
    section: 'RAD',
    unit: 'g/cm²',
  },
  {
    code: 'BMD_Trunk',
    bodySite: { code: '312763008', display: 'Bone structure of trunk' },
    hidden: true,
    loinc: '46383-6',
    names: {
      en: ['Trunk BMD', 'BMD Trunk', 'Trunk Bone Mineral Density', 'Trunk Bone Density'],
      pt: ['DMO Tronco', 'Densidade Mineral Óssea Tronco', 'Densidade Óssea Tronco'],
    },
    section: 'RAD',
    unit: 'g/cm²',
  },

  // ============================================================================
  // CARDIOVASCULAR MARKERS — Insuficiência cardíaca e dano miocárdico
  // ============================================================================
  {
    code: 'NTproBNP',
    loinc: '33762-6',
    names: {
      en: ['NT-proBNP', 'N-Terminal pro B-Type Natriuretic Peptide', 'NT-pro-BNP'],
      pt: ['NT-proBNP', 'Peptídeo Natriurético Tipo B N-Terminal', 'Pró-BNP N-Terminal'],
    },
    unit: 'pg/mL',
  },
  {
    code: 'BNP',
    loinc: '30934-4',
    names: {
      en: ['BNP', 'B-Type Natriuretic Peptide', 'Brain Natriuretic Peptide'],
      pt: ['BNP', 'Peptídeo Natriurético Tipo B', 'Peptídeo Natriurético Cerebral'],
    },
    unit: 'pg/mL',
  },
  {
    code: 'TroponinI',
    // 49563-0 afirma método: limite de detecção ≤ 0,01 ng/mL, o ensaio de alta
    // sensibilidade. Um resultado de troponina I convencional pede o código
    // sem método, 10839-9. Assimétrico com `TroponinT`, que fica no 6598-7 sem
    // método de propósito: a hs-cTnT em ng/L é a convenção dos laudos.
    loinc: '49563-0',
    names: {
      en: ['Troponin I', 'cTnI', 'Cardiac Troponin I', 'hs-TnI', 'High-Sensitivity Troponin I'],
      pt: ['Troponina I', 'cTnI', 'Troponina I Cardíaca', 'Troponina I Ultrassensível'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'TroponinT',
    // 6598-7 não afirma método. A unidade ng/L é a convenção do ensaio de alta
    // sensibilidade (hs-cTnT), e o ensaio convencional em ng/mL converte por
    // fator exato (ver `units.ts`). Ver `TroponinI` para a assimetria.
    loinc: '6598-7',
    names: {
      en: ['Troponin T', 'cTnT', 'Cardiac Troponin T', 'hs-TnT', 'High-Sensitivity Troponin T'],
      pt: ['Troponina T', 'cTnT', 'Troponina T Cardíaca', 'Troponina T Ultrassensível'],
    },
    unit: 'ng/L',
  },

  // ============================================================================
  // COAGULATION — Coagulação
  // ============================================================================
  {
    code: 'DDimer',
    // 48065-7 é "Fibrin D-dimer FEU [Mass/volume] in Platelet poor plasma".
    // Até out/2026 apontava para 48066-5, o mesmo analito em DDU (unidades de
    // D-dímero), que vale cerca de metade do FEU. A faixa do catálogo (500
    // ng/mL, com o corte por idade de idade × 10) é da convenção FEU, e um
    // resultado em DDU avaliado contra ela deixaria passar metade dos
    // anormais. Sem alias: DDU é outra grandeza. Quando o laudo imprime só
    // "ng/mL", não há como saber a convenção pelo texto; o FEU é o que a
    // faixa pressupõe.
    loinc: '48065-7',
    names: {
      en: ['D-Dimer', 'D Dimer', 'Fibrin D-Dimer'],
      pt: ['Dímero-D', 'Dímero D', 'D-Dímero'],
    },
    unit: 'ng/mL',
  },
  {
    code: 'Fibrinogen',
    loinc: '3255-7',
    names: {
      en: ['Fibrinogen', 'Fibrinogen Activity'],
      pt: ['Fibrinogênio', 'Atividade do Fibrinogênio'],
    },
    unit: 'mg/dL',
  },

  // ============================================================================
  // HEMATOLOGY — Hematologia adicional
  // ============================================================================
  {
    code: 'LDH',
    // 14804-9 afirma método: reação lactato → piruvato (L→P). O código sem
    // método, 2532-0, está DISCOURAGED, então um método tem que ser escolhido,
    // e L→P é o do procedimento de referência IFCC que os laboratórios
    // brasileiros usam, ainda que o laudo raramente imprima a direção. Se um
    // laudo declarar P→L, o código é outro (14805-6).
    loinc: '14804-9',
    // 2532-0 é o código genérico anterior, que o LOINC marca como DISCOURAGED.
    // Fica como alias para que laudo antigo e dado já armazenado continuem
    // resolvendo em LDH — a troca do código canônico não pode quebrar leitura
    // de histórico.
    loincAliases: ['2532-0'],
    names: {
      en: ['Lactate Dehydrogenase', 'LDH', 'LD'],
      pt: ['Desidrogenase Lática', 'DHL', 'LDH', 'Lactato Desidrogenase'],
    },
    unit: 'U/L',
  },

  // ============================================================================
  // ENDOCRINE — Eixo cálcio/fósforo
  // ============================================================================
  {
    code: 'PTH',
    loinc: '2731-8',
    names: {
      en: ['Parathyroid Hormone', 'PTH', 'Intact PTH'],
      pt: ['Paratormônio', 'PTH', 'Hormônio da Paratireoide', 'PTH Intacto'],
    },
    unit: 'pg/mL',
  },

  // ============================================================================
  // IMMUNOLOGY — Complemento e imunoglobulinas
  // ============================================================================
  {
    code: 'IgM',
    loinc: '2472-9',
    names: {
      en: ['Immunoglobulin M', 'IgM', 'Total IgM'],
      pt: ['Imunoglobulina M', 'IgM', 'IgM Total'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'C3',
    loinc: '4485-9',
    names: {
      en: ['Complement C3', 'C3'],
      pt: ['Complemento C3', 'C3', 'Fração C3 do Complemento'],
    },
    unit: 'mg/dL',
  },
  {
    code: 'C4',
    loinc: '4498-2',
    names: {
      en: ['Complement C4', 'C4'],
      pt: ['Complemento C4', 'C4', 'Fração C4 do Complemento'],
    },
    unit: 'mg/dL',
  },

  // ============================================================================
  // TUMOR MARKERS — Marcadores tumorais adicionais
  // ============================================================================
  {
    code: 'CA199',
    loinc: '24108-3',
    names: {
      en: ['CA 19-9', 'Carbohydrate Antigen 19-9', 'CA19-9'],
      pt: ['CA 19-9', 'Antígeno Carboidrato 19-9', 'CA19-9'],
    },
    unit: 'U/mL',
  },
  {
    code: 'CA153',
    loinc: '6875-9',
    names: {
      en: ['CA 15-3', 'Cancer Antigen 15-3', 'CA15-3'],
      pt: ['CA 15-3', 'Antígeno Câncer 15-3', 'CA15-3'],
    },
    sex: 'female',
    unit: 'U/mL',
  },
  {
    code: 'BetaHCG',
    loinc: '19080-1',
    names: {
      en: ['Beta-hCG', 'Beta Human Chorionic Gonadotropin', 'β-hCG Quantitative', 'hCG'],
      pt: [
        'Beta-hCG',
        'Beta Gonadotrofina Coriônica Humana',
        'β-hCG Quantitativo',
        'hCG',
        'Gonadotrofina Coriônica',
      ],
    },
    unit: 'mIU/mL',
  },

  // ============================================================================
  // RENAL — Filtração glomerular alternativa
  // ============================================================================
  {
    code: 'CystatinC',
    loinc: '33863-2',
    names: {
      en: ['Cystatin C', 'Cystatin-C'],
      pt: ['Cistatina C', 'Cistatina-C'],
    },
    unit: 'mg/L',
  },

  // ============================================================================
  // NUTRIENTS — Oligoelementos adicionais
  // ============================================================================
  {
    code: 'Selenium',
    loinc: '5724-0',
    names: {
      en: ['Selenium', 'Se'],
      pt: ['Selênio', 'Se'],
    },
    unit: 'µg/L',
  },

  // ============================================================================
  // METABOLIC — Cetonas séricas
  // ============================================================================
  {
    code: 'BetaHydroxybutyrate',
    // 6873-4 é "Beta hydroxybutyrate [Moles/volume] in Serum or Plasma", o
    // que o laudo dosa em mmol/L. Até out/2026 apontava para 53060-0, que é
    // butirilcarnitina (C4) em líquido amniótico: analito e material errados
    // desde abr/2026, e nenhum check pegou porque o código existe e está
    // ACTIVE. Sem alias para o código antigo: ele nunca significou BHB, e
    // aceitá-lo na importação faria um laudo de carnitina virar cetona.
    loinc: '6873-4',
    names: {
      en: ['Beta-Hydroxybutyrate', 'β-Hydroxybutyrate', 'BHB', 'Ketone Bodies'],
      pt: ['Beta-Hidroxibutirato', 'β-Hidroxibutirato', 'BHB', 'Corpos Cetônicos'],
    },
    unit: 'mmol/L',
  },
];

// ============================================================================
// LOOKUP MAPS (Generated from definitions)
// ============================================================================

/** Map LOINC code to internal code */
const loincToCodeMap = new Map<string, string>();

/** Map internal code to LOINC */
const codeToLoincMap = new Map<string, string>();

/** Map internal code to definition */
const codeToDefinitionMap = new Map<string, BiomarkerDefinition>();

/** Set of all valid LOINC codes */
const validLoincSet = new Set<string>();

/** LOINC sem sítio, compartilhado por entradas que se distinguem pela região. */
const bodySiteLoincs = new Map<string, BiomarkerDefinition[]>();

/** Map code alias to canonical code */
const codeAliasToCanonicalMap = new Map<string, string>();

/** Set of all valid codes (canonical + aliases) */
const validCodeSet = new Set<string>();

// Initialize maps
for (const def of BIOMARKER_DEFINITIONS) {
  // Only add to LOINC maps if loinc is defined
  if (def.loinc) {
    // Um LOINC sem sítio, compartilhado por regiões diferentes (a densidade
    // óssea por DXA), não entra no mapa reverso: o código sozinho não diz a
    // região. Ver `loincToCodeAt`.
    if (def.bodySite) {
      bodySiteLoincs.set(def.loinc, [...(bodySiteLoincs.get(def.loinc) ?? []), def]);
    } else {
      loincToCodeMap.set(def.loinc, def.code);
    }
    codeToLoincMap.set(def.code, def.loinc);
    validLoincSet.add(def.loinc);
  }

  codeToDefinitionMap.set(def.code, def);
  validCodeSet.add(def.code);

  // Handle LOINC aliases
  if (def.loincAliases) {
    for (const alias of def.loincAliases) {
      loincToCodeMap.set(alias, def.code);
      validLoincSet.add(alias);
    }
  }

  // O código por método resolve para o mesmo biomarcador. O inverso não: o
  // `codeToLoinc` continua devolvendo o código sem método.
  for (const variant of def.methodVariants ?? []) {
    loincToCodeMap.set(variant.loinc, def.code);
    validLoincSet.add(variant.loinc);
  }

  // Handle code aliases
  if (def.codeAliases) {
    for (const alias of def.codeAliases) {
      codeAliasToCanonicalMap.set(alias, def.code);
      validCodeSet.add(alias);
      // Also add alias to definition map for easy lookup
      codeToDefinitionMap.set(alias, def);
    }
  }
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * Convert LOINC code to internal code
 */
export function loincToCode(loinc: string): string | undefined {
  return loincToCodeMap.get(loinc);
}

/**
 * O biomarcador de um LOINC com a região do corpo (código SNOMED CT do
 * `Observation.bodySite`). Para LOINC que já diz o sítio, a região não muda
 * nada. Para o compartilhado entre regiões (46383-6, densidade óssea por DXA),
 * sem região ou com região que nenhuma entrada declara, devolve `undefined`:
 * nunca escolhe uma região por conta própria.
 */
export function loincToCodeAt(loinc: string, bodySiteCode?: string): string | undefined {
  const shared = bodySiteLoincs.get(loinc);
  if (!shared) return loincToCodeMap.get(loinc);
  return bodySiteCode ? shared.find((d) => d.bodySite?.code === bodySiteCode)?.code : undefined;
}

/**
 * A variante por método de um biomarcador, quando `loinc` é uma delas.
 *
 * Devolve `undefined` para o código sem método e para código que não é
 * variante declarada daquele biomarcador.
 */
export function methodVariantOf(code: string, loinc: string): MethodVariant | undefined {
  return codeToDefinitionMap.get(code)?.methodVariants?.find((v) => v.loinc === loinc);
}

/**
 * Convert internal code to LOINC
 */
export function codeToLoinc(code: string): string | undefined {
  return codeToLoincMap.get(code);
}

/**
 * Check if a LOINC code is in our supported list
 */
export function isValidLoinc(loinc: string): boolean {
  return validLoincSet.has(loinc);
}

/**
 * Check if a code is valid (canonical or alias)
 */
export function isValidCode(code: string): boolean {
  return validCodeSet.has(code);
}

/**
 * Normalize a code alias to its canonical form.
 * Returns the canonical code if input is an alias, otherwise returns the input unchanged.
 *
 * Use this at data boundaries (e.g. parsing lab results) to map incoming aliases
 * to canonical codes. Do NOT use this as a fallback inside lookup functions —
 * dictionary keys (e.g. biomarkerRangeDefinitions) must use canonical codes directly.
 */
export function normalizeCode(code: string): string {
  return codeAliasToCanonicalMap.get(code) ?? code;
}

/**
 * Get the sex relevance for a biomarker code
 * @returns 'male', 'female', or 'both' (default)
 */
export function getSexForCode(code: string): 'male' | 'female' | 'both' {
  const def = codeToDefinitionMap.get(code);
  return def?.sex ?? 'both';
}

/**
 * Get all biomarker definitions filtered by sex
 * @param sex - 'male', 'female', or 'both' (returns all)
 */
export function getDefinitionsBySex(sex: 'male' | 'female' | 'both'): BiomarkerDefinition[] {
  if (sex === 'both') {
    return BIOMARKER_DEFINITIONS;
  }
  return BIOMARKER_DEFINITIONS.filter(
    (def) => def.sex === sex || def.sex === undefined || def.sex === 'both',
  );
}

/**
 * Get biomarker definition by code
 */
export function getDefinitionByCode(code: string): BiomarkerDefinition | undefined {
  return codeToDefinitionMap.get(code);
}

/**
 * Get biomarker definition by LOINC
 */
export function getDefinitionByLoinc(loinc: string): BiomarkerDefinition | undefined {
  const code = loincToCodeMap.get(loinc);
  return code ? codeToDefinitionMap.get(code) : undefined;
}

/**
 * Get all biomarker definitions
 */
export function getAllDefinitions(): BiomarkerDefinition[] {
  return BIOMARKER_DEFINITIONS;
}

/**
 * Get all visible biomarker definitions (excludes hidden biomarkers)
 */
export function getVisibleDefinitions(): BiomarkerDefinition[] {
  return BIOMARKER_DEFINITIONS.filter((def) => !def.hidden);
}

/**
 * Get all supported internal codes (canonical codes only, not aliases)
 */
export function getAllCodes(): string[] {
  return BIOMARKER_DEFINITIONS.map((def) => def.code);
}

/**
 * Get all supported LOINC codes
 */
export function getAllLoincCodes(): string[] {
  return Array.from(validLoincSet);
}

/**
 * Normalize text for comparison
 * - Splits camelCase/PascalCase into words (e.g., "ArmsLeanMass" → "arms lean mass")
 * - Removes diacritics
 * - Lowercases
 * - Normalizes whitespace
 */
function normalizeText(text: string): string {
  return (
    text
      // Replace underscores, hyphens, and slashes with spaces (BMD_Total → BMD Total, LDL-Cholesterol → LDL Cholesterol, Omega6/Omega3 → Omega6 Omega3)
      .replace(/[_\-/]/g, ' ')
      // Split camelCase/PascalCase into words (ArmsLeanMass → Arms Lean Mass)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Split uppercase sequences followed by lowercase (VATVolume → VAT Volume)
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      // Remove diacritics
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Chave sem distinção de caixa, para a segunda tentativa do `findCodeByName`.
 *
 * O `normalizeText` separa camelCase antes de baixar a caixa, e por isso a
 * mesma sigla em caixas diferentes vira chaves diferentes: "IgA" vira "ig a",
 * "IGA" vira "iga". Um nome correto escrito na caixa que o catálogo não usa
 * deixava de resolver, e um LOINC errado decidia o código. Aqui a caixa cai
 * primeiro, então "IgA", "IGA" e "iga" dão a mesma chave. A vírgula entre
 * palavras também cai, porque o laudo imprime "PSA, FREE" onde o catálogo
 * tem "PSA Free".
 */
function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_\-/,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Build a normalized name map for fast lookups
const normalizedNameToCodeMap = new Map<string, string>();
// Mesma coisa pela chave sem caixa. Quando dois exames dão a mesma chave, ela
// fica `null`: a busca devolve nada em vez de escolher um pela ordem do
// catálogo.
const foldedNameToCodeMap = new Map<string, string | null>();
// Todos os donos de cada nome. O mapa de cima guarda um só, o último do
// catálogo, e "A/G Ratio" é nome da razão albumina/globulina e da razão
// androide/ginoide da densitometria.
const nameOwners = new Map<string, Set<string>>();
for (const def of BIOMARKER_DEFINITIONS) {
  for (const name of [...def.names.en, ...def.names.pt]) {
    normalizedNameToCodeMap.set(normalizeText(name), def.code);
    const owners = nameOwners.get(normalizeText(name)) ?? new Set<string>();
    nameOwners.set(normalizeText(name), owners.add(def.code));
    const folded = foldText(name);
    const owner = foldedNameToCodeMap.get(folded);
    foldedNameToCodeMap.set(folded, owner === undefined || owner === def.code ? def.code : null);
  }
}

/**
 * Find a biomarker code by name (with normalization)
 * This is a fallback when LOINC lookup fails
 * @param name - The biomarker name from the LLM output
 * @returns The internal code if found, undefined otherwise
 */
export function findCodeByName(name: string): string | undefined {
  // Check if the input is already a valid biomarker code (e.g., "Omega3_DHA")
  if (codeToDefinitionMap.has(name)) {
    return codeToDefinitionMap.get(name)!.code;
  }

  // Check code aliases (e.g., alias → canonical code)
  const canonical = codeAliasToCanonicalMap.get(name);
  if (canonical) {
    return canonical;
  }

  const normalized = normalizedNameToCodeMap.get(normalizeText(name));
  if (normalized) {
    return normalized;
  }
  return foldedNameToCodeMap.get(foldText(name)) ?? undefined;
}

/**
 * Validate that a LOINC code matches a given name
 * Returns the correct code if they match, or the name-based code if they don't
 * This catches cases where LLM provides a valid-but-wrong LOINC
 * @param loinc - The LOINC code provided by LLM
 * @param name - The biomarker name provided by LLM
 * @returns Object with code and whether a correction was made
 */
export function validateLoincNameMatch(
  loinc: string,
  name: string,
): { code: string | undefined; corrected: boolean } {
  const loincCode = loincToCode(loinc);
  const nameCode = findCodeByName(name);

  // If LOINC maps to a code, check if it matches the name-based code
  if (loincCode && nameCode && loincCode !== nameCode) {
    // O nome é de mais de um exame, e o do LOINC é um deles: os dois
    // concordam. Num laudo bioquímico, "A/G Ratio" com 1759-0 é a razão
    // albumina/globulina, e trocar pelo outro dono do nome punha o código da
    // densitometria num laudo de sangue.
    if (nameOwners.get(normalizeText(name))?.has(loincCode)) {
      return { code: loincCode, corrected: false };
    }
    // LOINC and name disagree - trust the name since it's what the LLM saw in the document
    return { code: nameCode, corrected: true };
  }

  // If LOINC is valid, use it
  if (loincCode) {
    return { code: loincCode, corrected: false };
  }

  // Fallback to name-based lookup
  return { code: nameCode, corrected: !!nameCode };
}

/**
 * Check if a biomarker code should be displayed in the UI
 *
 * Returns false for:
 * - UNKNOWN_ codes (unrecognized biomarkers)
 * - Biomarkers marked as hidden in their definition
 *
 * @param code - The biomarker code to check
 * @returns true if the biomarker should be displayed
 */
export function isBiomarkerVisible(code: string): boolean {
  // Filter out UNKNOWN codes
  if (code.startsWith('UNKNOWN_') || code === 'UNKNOWN') {
    return false;
  }

  // Check if the biomarker is marked as hidden
  const definition = codeToDefinitionMap.get(code);
  if (definition?.hidden) {
    return false;
  }

  return true;
}

/**
 * Filter an array of biomarkers to only include visible ones
 *
 * @param biomarkers - Array of objects with a `code` property
 * @returns Filtered array with only visible biomarkers
 */
export function filterVisibleBiomarkers<T extends { code: string }>(biomarkers: T[]): T[] {
  return biomarkers.filter((b) => isBiomarkerVisible(b.code));
}
