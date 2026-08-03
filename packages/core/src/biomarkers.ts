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

export interface BiomarkerDefinition {
  category: string | string[];
  code: string;
  codeAliases?: string[];
  hidden?: boolean; // If true, biomarker is extracted but not shown in UI
  loinc?: string; // Optional - some DEXA regional metrics don't have official LOINC codes
  loincAliases?: string[];
  names: {
    en: string[];
    pt: string[];
  };
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
    category: 'coracao',
    code: 'ApoB',
    loinc: '1884-6',
    names: {
      en: ['Apolipoprotein B', 'ApoB'],
      pt: ['Apolipoproteína B', 'ApoB'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'coracao',
    code: 'HDL',
    loinc: '2085-9',
    names: {
      en: ['HDL Cholesterol', 'HDL', 'High-Density Lipoprotein'],
      pt: ['Colesterol HDL', 'HDL', 'HDL-Colesterol'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'coracao',
    code: 'HDL_Large',
    loinc: '43729-3',
    names: {
      en: ['HDL Large', 'Large HDL Particles'],
      pt: ['HDL Grande', 'Partículas HDL Grandes'],
    },
    unit: 'nmol/L',
  },
  {
    category: 'coracao',
    code: 'CRP',
    loinc: '1988-5',
    names: {
      en: ['C-Reactive Protein', 'CRP', 'hs-CRP', 'High-Sensitivity CRP'],
      pt: ['Proteína C-Reativa', 'PCR', 'PCR-as', 'PCR Ultrassensível'],
    },
    unit: 'mg/L',
  },
  {
    category: 'coracao',
    code: 'LDL',
    loinc: '2089-1',
    names: {
      en: ['LDL Cholesterol', 'LDL', 'Low-Density Lipoprotein'],
      pt: ['Colesterol LDL', 'LDL', 'LDL-Colesterol'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'coracao',
    code: 'LDL_Medium',
    loinc: '96735-6',
    names: {
      en: ['LDL Medium', 'Medium LDL Particles'],
      pt: ['LDL Médio', 'Partículas LDL Médias'],
    },
    unit: 'nmol/L',
  },
  {
    category: 'coracao',
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
    category: 'coracao',
    code: 'LDL_Pattern',
    loinc: '35505-7',
    names: {
      en: ['LDL Pattern', 'LDL Particle Pattern'],
      pt: ['Padrão LDL', 'Padrão de Partículas LDL'],
    },
  },
  {
    category: 'coracao',
    code: 'LDL_Peak_Size',
    loinc: '17782-4',
    names: {
      en: ['LDL Peak Size', 'LDL Particle Size'],
      pt: ['Tamanho de Pico LDL', 'Tamanho de Partícula LDL'],
    },
    unit: 'Angstrom',
  },
  {
    category: 'coracao',
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
    category: 'coracao',
    code: 'Lipoprotein_a',
    loinc: '43583-4',
    names: {
      en: ['Lipoprotein (a)', 'Lp(a)'],
      pt: ['Lipoproteína (a)', 'Lp(a)'],
    },
    unit: 'nmol/L',
  },
  {
    category: 'coracao',
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
    category: 'coracao',
    code: 'Cholesterol',
    loinc: '2093-3',
    names: {
      en: ['Total Cholesterol', 'Cholesterol'],
      pt: ['Colesterol Total', 'Colesterol'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'coracao',
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
    category: 'coracao',
    code: 'Triglycerides',
    loinc: '2571-8',
    names: {
      en: ['Triglycerides'],
      pt: ['Triglicerídeos', 'Triglicérides'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'coracao',
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
    category: 'coracao',
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
    unit: 'AU',
  },
  {
    category: 'coracao',
    code: 'CAC_LMA',
    hidden: true,
    names: {
      en: ['Left Main Artery Calcium', 'LMA Calcium Score', 'Left Main Calcium'],
      pt: ['Cálcio Tronco Coronária Esquerda', 'Cálcio TCE', 'Cálcio Artéria Coronária Esquerda'],
    },
    unit: 'AU',
  },
  {
    category: 'coracao',
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
    unit: 'AU',
  },
  {
    category: 'coracao',
    code: 'CAC_LCX',
    hidden: true,
    names: {
      en: ['Left Circumflex Calcium', 'LCX Calcium Score', 'LCX Calcium', 'Circumflex Calcium'],
      pt: ['Cálcio Circunflexa', 'Cálcio CX', 'Cálcio Artéria Circunflexa'],
    },
    unit: 'AU',
  },
  {
    category: 'coracao',
    code: 'CAC_RCA',
    hidden: true,
    names: {
      en: ['Right Coronary Artery Calcium', 'RCA Calcium Score', 'RCA Calcium'],
      pt: ['Cálcio Coronária Direita', 'Cálcio CD', 'Cálcio Artéria Coronária Direita'],
    },
    unit: 'AU',
  },
  {
    category: 'coracao',
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
    unit: '%',
  },
  {
    category: 'coracao',
    code: 'AorticValveCalcium',
    hidden: true,
    names: {
      en: ['Aortic Valve Calcium Score', 'Aortic Valve Calcium', 'AVC Score'],
      pt: ['Cálcio Valva Aórtica', 'Escore de Cálcio Valva Aórtica', 'Cálcio Válvula Aórtica'],
    },
    unit: 'AU',
  },

  {
    category: 'coracao',
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
    category: 'tireoide',
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
    category: 'tireoide',
    code: 'AntiTPO',
    loinc: '8099-4',
    names: {
      en: ['Thyroid Peroxidase Antibodies', 'TPO Antibodies', 'Anti-TPO'],
      pt: ['Anticorpos Anti-Peroxidase Tireoidiana', 'Anti-TPO', 'TPO'],
    },
    unit: 'IU/mL',
  },
  {
    category: 'tireoide',
    code: 'TSH',
    loinc: '3016-3',
    names: {
      en: ['Thyroid-Stimulating Hormone', 'TSH', 'Thyrotropin'],
      pt: ['Hormônio Tireoestimulante', 'TSH', 'Tireotrofina'],
    },
    unit: 'uIU/mL',
  },
  {
    category: 'tireoide',
    code: 'T4Free',
    loinc: '3024-7',
    names: {
      en: ['Thyroxine Free', 'Free T4', 'T4 Free', 'T4, Free', 'T4 FREE'],
      pt: ['Tiroxina Livre', 'T4 Livre'],
    },
    unit: 'ng/dL',
  },
  {
    category: 'tireoide',
    code: 'T3Free',
    loinc: '3051-0',
    names: {
      en: ['Triiodothyronine Free', 'Free T3', 'T3 Free', 'T3, Free', 'T3 FREE'],
      pt: ['Triiodotironina Livre', 'T3 Livre'],
    },
    unit: 'pg/mL',
  },
  {
    category: 'tireoide',
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
    category: 'autoimunidade',
    code: 'ANA_Screen',
    loinc: '8061-4',
    names: {
      en: ['Antinuclear Antibodies Screen', 'ANA Screen'],
      pt: ['Triagem de Anticorpos Antinucleares', 'FAN Triagem'],
    },
  },
  {
    category: 'autoimunidade',
    code: 'RheumatoidFactor',
    loinc: '11572-5',
    names: {
      en: ['Rheumatoid Factor', 'RF'],
      pt: ['Fator Reumatoide', 'FR'],
    },
    unit: 'IU/mL',
  },

  // ============================================================================
  // IMMUNE REGULATION / REGULACAO-IMUNOLOGICA
  // ============================================================================
  {
    category: 'regulacao-imunologica',
    code: 'Basophils',
    loinc: '706-2',
    names: {
      en: ['Basophils', 'Basophils %'],
      pt: ['Basófilos', 'Basófilos %'],
    },
    unit: '%',
  },
  {
    category: 'regulacao-imunologica',
    code: 'Basophils_Abs',
    hidden: true,
    loinc: '704-7',
    names: {
      en: ['Absolute Basophils', 'Basophils Absolute'],
      pt: ['Basófilos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    category: 'regulacao-imunologica',
    code: 'Eosinophils',
    loinc: '713-8',
    names: {
      en: ['Eosinophils', 'Eosinophils %'],
      pt: ['Eosinófilos', 'Eosinófilos %'],
    },
    unit: '%',
  },
  {
    category: 'regulacao-imunologica',
    code: 'Eosinophils_Abs',
    hidden: true,
    loinc: '711-2',
    names: {
      en: ['Absolute Eosinophils', 'Eosinophils Absolute'],
      pt: ['Eosinófilos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    category: 'regulacao-imunologica',
    code: 'Lymphocytes',
    loinc: '736-9',
    names: {
      en: ['Lymphocytes', 'Lymphocytes %'],
      pt: ['Linfócitos', 'Linfócitos %'],
    },
    unit: '%',
  },
  {
    category: 'regulacao-imunologica',
    code: 'Lymphocytes_Abs',
    hidden: true,
    loinc: '731-0',
    names: {
      en: ['Absolute Lymphocytes', 'Lymphocytes Absolute'],
      pt: ['Linfócitos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    category: 'regulacao-imunologica',
    code: 'Monocytes',
    loinc: '5905-5',
    names: {
      en: ['Monocytes', 'Monocytes %'],
      pt: ['Monócitos', 'Monócitos %'],
    },
    unit: '%',
  },
  {
    category: 'regulacao-imunologica',
    code: 'Monocytes_Abs',
    hidden: true,
    loinc: '742-7',
    names: {
      en: ['Absolute Monocytes', 'Monocytes Absolute'],
      pt: ['Monócitos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    category: 'regulacao-imunologica',
    code: 'Neutrophils',
    loinc: '770-8',
    names: {
      en: ['Neutrophils', 'Neutrophils %'],
      pt: ['Neutrófilos', 'Neutrófilos %'],
    },
    unit: '%',
  },
  {
    category: 'regulacao-imunologica',
    code: 'Neutrophils_Abs',
    hidden: true,
    loinc: '751-8',
    names: {
      en: ['Absolute Neutrophils', 'Neutrophils Absolute'],
      pt: ['Neutrófilos Absolutos'],
    },
    unit: 'K/uL',
  },
  {
    category: 'regulacao-imunologica',
    code: 'WBC',
    loinc: '6690-2',
    names: {
      en: ['White Blood Cell Count', 'WBC', 'Leukocytes'],
      pt: ['Contagem de Leucócitos', 'Leucócitos', 'Glóbulos Brancos'],
    },
    unit: 'K/uL',
  },
  {
    category: 'regulacao-imunologica',
    code: 'IgA',
    loinc: '2458-8',
    names: {
      en: ['Immunoglobulin A', 'IgA', 'Serum IgA'],
      pt: ['Imunoglobulina A', 'IgA'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'regulacao-imunologica',
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
    category: 'regulacao-imunologica',
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
    category: 'regulacao-imunologica',
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
    category: 'regulacao-imunologica',
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
    category: 'saude-feminina',
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
    category: ['saude-feminina', 'saude-masculina'],
    code: 'DHEAS',
    loinc: '2191-5',
    names: {
      en: ['DHEA-Sulfate', 'DHEAS', 'DHEA-S', 'DHEA Sulfate'],
      pt: ['DHEA-Sulfato', 'DHEAS', 'Sulfato de DHEA'],
    },
    unit: 'mcg/dL',
  },
  {
    category: ['saude-feminina', 'saude-masculina'],
    code: 'Estradiol',
    loinc: '2243-4',
    names: {
      en: ['Estradiol', 'E2'],
      pt: ['Estradiol', 'E2'],
    },
    unit: 'pg/mL',
  },
  {
    category: ['saude-feminina', 'saude-masculina'],
    code: 'FSH',
    loinc: '15067-2',
    names: {
      en: ['Follicle Stimulating Hormone', 'FSH'],
      pt: ['Hormônio Folículo-Estimulante', 'FSH', 'Folitropina'],
    },
    unit: 'mIU/mL',
  },
  {
    category: ['saude-feminina', 'saude-masculina'],
    code: 'LH',
    loinc: '10501-5',
    names: {
      en: ['Luteinizing Hormone', 'LH'],
      pt: ['Hormônio Luteinizante', 'LH', 'Lutropina'],
    },
    unit: 'mIU/mL',
  },
  {
    category: ['saude-feminina', 'saude-masculina'],
    code: 'Prolactin',
    loinc: '2842-3',
    names: {
      en: ['Prolactin'],
      pt: ['Prolactina'],
    },
    unit: 'ng/mL',
  },
  {
    category: ['saude-feminina', 'saude-masculina'],
    code: 'SHBG',
    loinc: '13967-5',
    names: {
      en: ['Sex Hormone Binding Globulin', 'SHBG'],
      pt: ['Globulina Ligadora de Hormônios Sexuais', 'SHBG'],
    },
    unit: 'nmol/L',
  },
  {
    category: ['saude-feminina', 'saude-masculina'],
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
    category: ['saude-feminina', 'saude-masculina'],
    code: 'Testosterone',
    loinc: '2986-8',
    names: {
      en: ['Testosterone Total', 'Testosterone'],
      pt: ['Testosterona Total', 'Testosterona'],
    },
    unit: 'ng/dL',
  },
  {
    category: 'saude-feminina',
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
    category: 'saude-masculina',
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
    category: 'saude-masculina',
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
    category: 'saude-masculina',
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
    category: 'hormonios',
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
  {
    category: 'metabolico',
    code: 'Glucose',
    loinc: '2345-7',
    names: {
      en: ['Glucose', 'Blood Glucose', 'Fasting Glucose'],
      pt: ['Glicose', 'Glicemia', 'Glicemia de Jejum'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'metabolico',
    code: 'HbA1c',
    loinc: '4548-4',
    names: {
      en: ['Hemoglobin A1c', 'HbA1c', 'Glycated Hemoglobin'],
      pt: ['Hemoglobina Glicada', 'HbA1c', 'Hemoglobina Glicosilada'],
    },
    unit: '%',
  },
  {
    category: 'metabolico',
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
    category: 'metabolico',
    code: 'Insulin',
    loinc: '20448-7',
    names: {
      en: ['Insulin', 'Fasting Insulin'],
      pt: ['Insulina', 'Insulina de Jejum'],
    },
    unit: 'uIU/mL',
  },
  {
    category: 'metabolico',
    code: 'HOMA_IR',
    loinc: '47214-2',
    names: {
      en: ['HOMA-IR', 'Homeostatic Model Assessment for Insulin Resistance'],
      pt: ['HOMA-IR', 'Índice HOMA'],
    },
    unit: 'índice',
  },
  {
    category: 'metabolico',
    code: 'Leptin',
    loinc: '21365-2',
    names: {
      en: ['Leptin'],
      pt: ['Leptina'],
    },
    unit: 'ng/mL',
  },
  {
    category: 'metabolico',
    code: 'UricAcid',
    loinc: '3084-1',
    names: {
      en: ['Uric Acid', 'Urate'],
      pt: ['Ácido Úrico'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'metabolico',
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
    category: 'toxinas-ambientais',
    code: 'Lead',
    loinc: '77307-7',
    names: {
      en: ['Lead', 'Blood Lead'],
      pt: ['Chumbo', 'Chumbo no Sangue'],
    },
    unit: 'mcg/dL',
  },
  {
    category: 'toxinas-ambientais',
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
    category: 'nutrientes',
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
    category: 'nutrientes',
    code: 'Calcium',
    loinc: '17861-6',
    names: {
      en: ['Calcium', 'Serum Calcium'],
      pt: ['Cálcio', 'Cálcio Sérico'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'nutrientes',
    code: 'Ferritin',
    loinc: '2276-4',
    names: {
      en: ['Ferritin'],
      pt: ['Ferritina'],
    },
    unit: 'ng/mL',
  },
  {
    category: 'nutrientes',
    code: 'Folate',
    loinc: '2284-8',
    names: {
      en: ['Folate', 'Folic Acid', 'Serum Folate'],
      pt: ['Folato', 'Ácido Fólico', 'Folato Sérico', 'Ac. Fólico', 'Dosagem de Ácido Fólico'],
    },
    unit: 'ng/mL',
  },
  {
    category: 'nutrientes',
    code: 'Homocysteine',
    loinc: '13965-9',
    names: {
      en: ['Homocysteine'],
      pt: ['Homocisteína'],
    },
    unit: 'umol/L',
  },
  {
    category: 'nutrientes',
    code: 'Iron',
    loinc: '2498-4',
    names: {
      en: ['Iron', 'Serum Iron'],
      pt: ['Ferro', 'Ferro Sérico'],
    },
    unit: 'mcg/dL',
  },
  {
    category: 'nutrientes',
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
    category: 'nutrientes',
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
    category: 'nutrientes',
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
    category: 'nutrientes',
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
    // Alinha à matriz das entradas irmãs Omega3_EPA (75097-6) e Omega3_DHA
    // (75095-0), ambas em hemácias. Anteriormente 35178-3 (mesmo analito em
    // Ser/Plas), incompatível com o uso clínico do Índice Ômega-3 (Harris &
    // von Schacky 2004), que é definido em membranas de hemácias.
    // Ressalva: LOINC declara moles/volume; o biomarcador armazena %.
    // Não há LOINC vigente para "Omega 3 total em % em RBC" — o `Omega3_Index`
    // (88998-0) cobre apenas EPA+DHA. Mantemos `unit: '%'` por consistência
    // com EPA/DHA (75095-0/75097-6 são [Entitic substance], também não-%).
    category: 'nutrientes',
    code: 'Omega3_Total',
    loinc: '99620-7',
    names: {
      en: ['Omega-3 Total', 'Total Omega-3'],
      pt: ['Ômega-3 Total'],
    },
    unit: '%',
  },
  {
    category: 'nutrientes',
    code: 'Omega3_DHA',
    codeAliases: ['DHA'],
    loinc: '75095-0',
    names: {
      en: ['Omega-3 DHA', 'DHA', 'Docosahexaenoic Acid'],
      pt: ['Ômega-3: DHA', 'DHA', 'Ácido Docosahexaenoico'],
    },
    unit: '%',
  },
  {
    category: 'nutrientes',
    code: 'Omega3_DPA',
    codeAliases: ['DPA'],
    loinc: '48371-9',
    names: {
      en: ['Omega-3 DPA', 'DPA', 'Docosapentaenoic Acid'],
      pt: ['Ômega-3: DPA', 'DPA', 'Ácido Docosapentaenoico'],
    },
    unit: '%',
  },
  {
    category: 'nutrientes',
    code: 'Omega3_EPA',
    codeAliases: ['EPA'],
    loinc: '75097-6',
    names: {
      en: ['Omega-3 EPA', 'EPA', 'Eicosapentaenoic Acid'],
      pt: ['Ômega-3: EPA', 'EPA', 'Ácido Eicosapentaenoico'],
    },
    unit: '%',
  },
  {
    category: 'nutrientes',
    code: 'EPADPADHA',
    loinc: '90908-5',
    names: {
      en: ['Omega-3 EPA+DPA+DHA', 'EPA+DPA+DHA'],
      pt: ['Ômega-3: EPA+DPA+DHA'],
    },
    unit: '%',
  },
  {
    category: 'nutrientes',
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
    category: 'nutrientes',
    code: 'Omega6_Total',
    loinc: '35177-5',
    names: {
      en: ['Omega-6 Total', 'Total Omega-6'],
      pt: ['Ômega-6 Total'],
    },
    unit: '%',
  },
  {
    category: 'nutrientes',
    code: 'Omega6_AA',
    codeAliases: ['Arachidonic_Acid'],
    loinc: '75110-7',
    names: {
      en: ['Omega-6 Arachidonic Acid', 'Arachidonic Acid', 'AA'],
      pt: ['Ômega-6: Ácido Araquidônico', 'Ácido Araquidônico', 'AA'],
    },
    unit: '%',
  },
  {
    category: 'nutrientes',
    code: 'Omega6_LA',
    codeAliases: ['Linoleic_Acid'],
    loinc: '75117-2',
    names: {
      en: ['Omega-6 Linoleic Acid', 'Linoleic Acid', 'LA'],
      pt: ['Ômega-6: Ácido Linoleico', 'Ácido Linoleico', 'LA'],
    },
    unit: '%',
  },
  {
    category: 'nutrientes',
    code: 'VitaminA',
    loinc: '2923-1',
    names: {
      en: ['Vitamin A', 'Retinol', 'Serum Retinol'],
      pt: ['Vitamina A', 'Retinol', 'Retinol Sérico', 'Vit A', 'Vit. A', 'Dosagem de Vitamina A'],
    },
    unit: 'mcg/dL',
  },
  {
    category: 'nutrientes',
    code: 'VitaminB12',
    loinc: '2132-9',
    names: {
      en: ['Vitamin B12', 'Cobalamin', 'B12', 'Cyanocobalamin'],
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
    category: 'nutrientes',
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
    category: 'nutrientes',
    code: 'VitaminD',
    loinc: '1989-3',
    names: {
      en: [
        'Vitamin D',
        '25-Hydroxy Vitamin D',
        '25-OH Vitamin D',
        'Vitamin D, 25-Hydroxy',
        '25-Hydroxy Vitamin D, Total',
      ],
      pt: [
        'Vitamina D',
        '25-Hidroxivitamina D',
        '25-OH Vitamina D',
        'Vitamina D, 25-Hidroxi',
        '25-Hidroxi Vitamina D',
      ],
    },
    unit: 'ng/mL',
  },
  {
    category: 'nutrientes',
    code: 'Zinc',
    loinc: '8245-3',
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
    category: 'estresse-envelhecimento',
    code: 'Cortisol',
    loinc: '2143-6',
    names: {
      en: ['Cortisol', 'Serum Cortisol'],
      pt: ['Cortisol'],
    },
    unit: 'mcg/dL',
  },

  // ============================================================================
  // LIVER / FIGADO
  // ============================================================================
  {
    category: 'figado',
    code: 'ALT',
    loinc: '1742-6',
    names: {
      en: ['Alanine Transaminase', 'ALT', 'SGPT'],
      pt: ['Alanina Aminotransferase', 'ALT', 'TGP'],
    },
    unit: 'U/L',
  },
  {
    category: 'figado',
    code: 'Albumin',
    loinc: '1751-7',
    names: {
      en: ['Albumin', 'Serum Albumin'],
      pt: ['Albumina'],
    },
    unit: 'g/dL',
  },
  {
    category: 'figado',
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
    category: 'figado',
    code: 'AlkalinePhosphatase',
    loinc: '6768-6',
    names: {
      en: ['Alkaline Phosphatase', 'ALP'],
      pt: ['Fosfatase Alcalina', 'ALP'],
    },
    unit: 'U/L',
  },
  {
    category: 'figado',
    code: 'AST',
    loinc: '1920-8',
    names: {
      en: ['Aspartate Aminotransferase', 'AST', 'SGOT'],
      pt: ['Aspartato Aminotransferase', 'AST', 'TGO'],
    },
    unit: 'U/L',
  },
  {
    category: 'figado',
    code: 'GGT',
    loinc: '2324-2',
    names: {
      en: ['Gamma-glutamyl Transferase', 'GGT', 'Gamma GT'],
      pt: ['Gama-Glutamil Transferase', 'GGT', 'Gama GT'],
    },
    unit: 'U/L',
  },
  {
    category: 'figado',
    code: 'Globulin',
    loinc: '2336-6',
    names: {
      en: ['Globulin', 'Serum Globulin'],
      pt: ['Globulina'],
    },
    unit: 'g/dL',
  },
  {
    category: 'figado',
    code: 'TotalProtein',
    loinc: '2885-2',
    names: {
      en: ['Total Protein', 'Serum Protein'],
      pt: ['Proteína Total', 'Proteínas Totais'],
    },
    unit: 'g/dL',
  },
  {
    category: 'figado',
    code: 'BilirubinTotal',
    loinc: '1975-2',
    names: {
      en: ['Total Bilirubin', 'Bilirubin Total', 'Bilirubin, Total', 'BILIRUBIN TOTAL'],
      pt: ['Bilirrubina Total'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'figado',
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
    category: 'figado',
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
    category: 'sangue',
    code: 'Hct',
    loinc: '4544-3',
    names: {
      en: ['Hematocrit', 'Hct', 'HCT'],
      pt: ['Hematócrito', 'Hct'],
    },
    unit: '%',
  },
  {
    category: 'sangue',
    code: 'Hgb',
    loinc: '718-7',
    names: {
      en: ['Hemoglobin', 'Hgb', 'HGB'],
      pt: ['Hemoglobina', 'Hgb'],
    },
    unit: 'g/dL',
  },
  {
    category: 'sangue',
    code: 'MCH',
    loinc: '785-6',
    names: {
      en: ['Mean Corpuscular Hemoglobin', 'MCH'],
      pt: ['Hemoglobina Corpuscular Média', 'HCM'],
    },
    unit: 'pg',
  },
  {
    category: 'sangue',
    code: 'MCHC',
    loinc: '786-4',
    names: {
      en: ['Mean Corpuscular Hemoglobin Concentration', 'MCHC'],
      pt: ['Concentração de Hemoglobina Corpuscular Média', 'CHCM'],
    },
    unit: 'g/dL',
  },
  {
    category: 'sangue',
    code: 'MCV',
    loinc: '787-2',
    names: {
      en: ['Mean Corpuscular Volume', 'MCV'],
      pt: ['Volume Corpuscular Médio', 'VCM'],
    },
    unit: 'fL',
  },
  {
    category: 'sangue',
    code: 'MPV',
    loinc: '32623-1',
    names: {
      en: ['Mean Platelet Volume', 'MPV'],
      pt: ['Volume Plaquetário Médio', 'VPM'],
    },
    unit: 'fL',
  },
  {
    category: 'sangue',
    code: 'Platelets',
    loinc: '777-3',
    names: {
      en: ['Platelet Count', 'Platelets'],
      pt: ['Contagem de Plaquetas', 'Plaquetas'],
    },
    unit: 'K/uL',
  },
  {
    category: 'sangue',
    code: 'RBC',
    loinc: '789-8',
    names: {
      en: ['Red Blood Cell Count', 'RBC', 'Erythrocytes'],
      pt: ['Contagem de Hemácias', 'Hemácias', 'Eritrócitos'],
    },
    unit: 'M/uL',
  },
  {
    category: 'sangue',
    code: 'RDW',
    loinc: '788-0',
    names: {
      en: ['Red Cell Distribution Width', 'RDW'],
      pt: ['Amplitude de Distribuição dos Eritrócitos', 'RDW'],
    },
    unit: '%',
  },
  {
    category: 'sangue',
    code: 'ABO_Group',
    hidden: true,
    loinc: '883-9',
    names: {
      en: ['ABO Group', 'ABO Blood Group', 'Blood Type ABO'],
      pt: ['Grupo ABO', 'Tipo Sanguíneo ABO', 'Grupo Sanguíneo ABO'],
    },
  },
  {
    category: 'sangue',
    code: 'Rh_Type',
    hidden: true,
    loinc: '10331-7',
    names: {
      en: ['Rh Type', 'Rh Factor', 'Rhesus Factor'],
      pt: ['Tipo Rh', 'Fator Rh', 'Fator Rhesus'],
    },
  },
  {
    category: 'sangue',
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
    category: 'sangue',
    code: 'INR',
    codeAliases: ['International_Normalized_Ratio'],
    loinc: '6301-6',
    names: {
      en: ['International Normalized Ratio', 'INR'],
      pt: ['Razão Normalizada Internacional', 'INR', 'RNI'],
    },
    unit: 'ratio',
  },
  {
    category: 'sangue',
    code: 'ProthrombinTime',
    codeAliases: ['Prothrombin_Time', 'PT_Time'],
    loinc: '5902-2',
    names: {
      en: ['Prothrombin Time', 'PT', 'Pro Time'],
      pt: ['Tempo de Protrombina', 'TP', 'TAP'],
    },
    unit: 'seconds',
  },
  {
    category: 'sangue',
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
    category: 'rins',
    code: 'Microalbumin_Urine',
    codeAliases: ['Urine_Microalbumin'],
    loinc: '14957-5',
    names: {
      en: ['Microalbumin Urine', 'Urine Albumin', 'Urine Microalbumin'],
      pt: ['Albumina Urina', 'Microalbumina Urina', 'Microalbumina na Urina'],
    },
    unit: 'mg/L',
  },
  {
    // LOINC 3091-6 = "Urea [Mass/volume] in Serum or Plasma" (mg/dL).
    // Anteriormente 3094-0 ("Urea nitrogen", BUN), inconsistente com a faixa
    // de referência brasileira (15-50 mg/dL) e com os nomes pt-BR (Ureia).
    // Aliases 'BUN' e 'Blood Urea Nitrogen' removidos para evitar matching
    // de relatórios de BUN contra faixas de Ureia (BUN ≈ Ureia / 2,14).
    category: 'rins',
    code: 'Urea',
    loinc: '3091-6',
    names: {
      en: ['Urea'],
      pt: ['Ureia', 'Uréia'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'rins',
    code: 'BUN_Creatinine_Ratio',
    loinc: '3097-3',
    names: {
      en: ['BUN/Creatinine Ratio', 'Urea/Creatinine Ratio'],
      pt: ['Razão Ureia / Creatinina'],
    },
    unit: 'razão',
  },
  {
    category: 'rins',
    code: 'Creatinine',
    loinc: '2160-0',
    names: {
      en: ['Creatinine', 'Serum Creatinine'],
      pt: ['Creatinina', 'Creatinina Sérica'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'rins',
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
    category: 'rins',
    code: 'Potassium',
    loinc: '2823-3',
    names: {
      en: ['Potassium', 'K'],
      pt: ['Potássio', 'K'],
    },
    unit: 'mEq/L',
  },
  {
    category: 'rins',
    code: 'Sodium',
    loinc: '2951-2',
    names: {
      en: ['Sodium', 'Na'],
      pt: ['Sódio', 'Na'],
    },
    unit: 'mEq/L',
  },
  {
    category: 'rins',
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
    category: 'rins',
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
    category: 'pancreas',
    code: 'Amylase',
    loinc: '1798-8',
    names: {
      en: ['Amylase', 'Serum Amylase'],
      pt: ['Amilase'],
    },
    unit: 'U/L',
  },
  {
    category: 'pancreas',
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
    category: 'eletrolitos',
    code: 'CO2',
    loinc: '2028-9',
    names: {
      en: ['Carbon Dioxide', 'CO2', 'Bicarbonate'],
      pt: ['Dióxido de Carbono', 'CO2', 'Bicarbonato'],
    },
    unit: 'mEq/L',
  },
  {
    category: 'eletrolitos',
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
    category: 'urina',
    code: 'Appearance_Urine',
    codeAliases: ['UrineAppearance'],
    loinc: '5767-9',
    names: {
      en: ['Urine Appearance', 'Appearance'],
      pt: ['Aparência da Urina', 'Aparência'],
    },
  },
  {
    category: 'urina',
    code: 'Bacteria_Urine',
    codeAliases: ['UrineBacteria'],
    loinc: '630-4',
    names: {
      en: ['Urine Bacteria', 'Bacteria Urine', 'Bacteria, Urine', 'Bacteria'],
      pt: ['Bactérias na Urina', 'Bactérias'],
    },
    unit: '/HPF',
  },
  {
    category: 'urina',
    code: 'Bilirubin_Urine',
    codeAliases: ['UrineBilirubin'],
    loinc: '5770-3',
    names: {
      en: ['Urine Bilirubin', 'Bilirubin Urine', 'Bilirubin, Urine', 'Bilirubin'],
      pt: ['Bilirrubina na Urina', 'Bilirrubina Urina', 'Bilirrubina'],
    },
  },
  {
    category: 'urina',
    code: 'Blood_Urine',
    codeAliases: ['UrineBlood'],
    loinc: '5794-3',
    names: {
      en: ['Urine Blood', 'Occult Blood in Urine', 'Occult Blood', 'Blood'],
      pt: ['Sangue Oculto na Urina', 'Sangue Oculto'],
    },
  },
  {
    category: 'urina',
    code: 'Color_Urine',
    codeAliases: ['UrineColor'],
    loinc: '5778-6',
    names: {
      en: ['Urine Color', 'Color'],
      pt: ['Cor da Urina', 'Cor'],
    },
  },
  {
    category: 'urina',
    code: 'Glucose_Urine',
    loinc: '5792-7',
    names: {
      en: ['Urine Glucose', 'Glucose Urine', 'Glucose, Urine'],
      pt: ['Glicose na Urina', 'Glicose Urina'],
    },
  },
  {
    category: 'urina',
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
    category: 'urina',
    code: 'Ketones_Urine',
    codeAliases: ['UrineKetones'],
    loinc: '5797-6',
    names: {
      en: ['Urine Ketones', 'Ketones Urine', 'Ketones, Urine', 'Ketones'],
      pt: ['Cetonas na Urina', 'Cetonas'],
    },
  },
  {
    category: 'urina',
    code: 'LeukocyteEsterase_Urine',
    loinc: '5799-2',
    names: {
      en: ['Leukocyte Esterase Urine', 'Leukocyte Esterase', 'Leuk Esterase'],
      pt: ['Esterase Leucocitária na Urina', 'Esterase Leucocitária'],
    },
  },
  {
    category: 'urina',
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
    category: 'urina',
    code: 'Nitrite_Urine',
    codeAliases: ['UrineNitrite'],
    loinc: '5802-4',
    names: {
      en: ['Urine Nitrite', 'Nitrite Urine', 'Nitrite, Urine', 'Nitrite'],
      pt: ['Nitrito na Urina', 'Nitrito Urina', 'Nitrito'],
    },
  },
  {
    category: 'urina',
    code: 'pH_Urine',
    codeAliases: ['UrinaryPH'],
    loinc: '5803-2',
    names: {
      en: ['Urine pH', 'pH Urine', 'pH, Urine'],
      pt: ['pH Urinário', 'pH da Urina'],
    },
  },
  {
    category: 'urina',
    code: 'Protein_Urine',
    loinc: '5804-0',
    names: {
      en: ['Urine Protein', 'Protein Urine', 'Protein, Urine', 'Protein'],
      pt: ['Proteína na Urina', 'Proteína'],
    },
  },
  {
    category: 'urina',
    code: 'RBC_Urine',
    loinc: '5808-1',
    names: {
      en: ['Urine RBC', 'Red Blood Cells in Urine', 'RBC Urine', 'RBC, Urine'],
      pt: ['Hemácias na Urina'],
    },
    unit: '/HPF',
  },
  {
    category: 'urina',
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
    category: 'urina',
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
    category: 'urina',
    code: 'Urobilinogen_Urine',
    codeAliases: ['Urine_Urobilinogen'],
    loinc: '20405-7',
    names: {
      en: ['Urobilinogen Urine', 'Urine Urobilinogen', 'Urobilinogen'],
      pt: ['Urobilinogênio Urinário', 'Urobilinogênio na Urina'],
    },
    unit: 'mg/dL',
  },

  // ============================================================================
  // TUMOR MARKERS / MARCADORES TUMORAIS
  // ============================================================================
  {
    category: 'marcadores-tumorais',
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
    category: 'marcadores-tumorais',
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
    category: 'marcadores-tumorais',
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
    category: 'autoimunidade',
    code: 'Gliadin_Deamidated_IgA',
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
    unit: 'U',
  },
  {
    category: 'autoimunidade',
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
    unit: 'U',
  },
  {
    category: 'autoimunidade',
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
    category: 'autoimunidade',
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
    category: 'coracao',
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
    category: 'metabolico',
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
    category: 'composicao-corporal',
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
    category: 'composicao-corporal',
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
        '% Body Fat',
        'Total Body % Fat',
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
    category: 'composicao-corporal',
    code: 'FatMass',
    loinc: '73708-0',
    names: {
      en: ['Fat Mass', 'Total Fat Mass', 'Body Fat Mass', 'Fat Tissue Mass'],
      pt: ['Massa de Gordura', 'Massa Gorda', 'Massa de Gordura Total', 'Tecido Adiposo'],
    },
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
    code: 'LeanMass',
    loinc: '73964-9',
    names: {
      en: ['Lean Mass', 'Lean Body Mass', 'Lean Tissue Mass', 'Total Lean Mass', 'LBM'],
      pt: ['Massa Magra', 'Massa Corporal Magra', 'Tecido Magro', 'Massa Magra Total'],
    },
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
    code: 'BMC',
    // No official LOINC code exists for total body BMC from DEXA
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
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
    code: 'FatFreeMass',
    // No official LOINC code exists for fat-free mass from DEXA
    names: {
      en: ['Fat-Free Mass', 'Fat Free Mass', 'Fat Free', 'FFM', 'Non-Fat Mass'],
      pt: ['Massa Livre de Gordura', 'Massa Isenta de Gordura', 'MLG'],
    },
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
    code: 'VATVolume',
    // No official LOINC code exists for visceral adipose tissue volume
    names: {
      en: [
        'Visceral Fat Volume',
        'VAT Volume',
        'VATVolume',
        'Visceral Adipose Tissue Volume',
        'VAT',
        'Visceral Fat',
        'Visceral Volume',
        'Volume',
      ],
      pt: [
        'Volume de Gordura Visceral',
        'Volume TAV',
        'Tecido Adiposo Visceral Volume',
        'Gordura Visceral',
        'Volume Visceral',
      ],
    },
    unit: 'cm³',
  },
  {
    category: 'composicao-corporal',
    code: 'VATMass',
    // No official LOINC code exists for visceral adipose tissue mass
    names: {
      en: [
        'Visceral Fat Mass',
        'VAT Mass',
        'VATMass',
        'Visceral Adipose Tissue Mass',
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
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
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
    unit: 'ratio',
  },
  {
    category: 'composicao-corporal',
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
      ],
      pt: [
        'Percentual de Gordura Androide',
        '% Gordura Androide',
        'Gordura Região Androide %',
        '% Gordura Abdominal',
      ],
    },
    unit: '%',
  },
  {
    category: 'composicao-corporal',
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
      ],
      pt: [
        'Percentual de Gordura Ginoide',
        '% Gordura Ginoide',
        'Gordura Região Ginoide %',
        '% Gordura Quadril',
      ],
    },
    unit: '%',
  },
  {
    category: 'composicao-corporal',
    code: 'TotalMass',
    loinc: '29463-7',
    names: {
      en: ['Total Mass', 'Total Body Mass', 'Body Weight', 'Weight'],
      pt: ['Massa Total', 'Massa Corporal Total', 'Peso Corporal', 'Peso'],
    },
    unit: 'kg',
  },

  // Regional Body Composition (DEXA)
  // Note: No official LOINC codes exist for regional lean/fat mass measurements
  // Hidden from UI for now - may be shown in future regional breakdown view
  {
    category: 'composicao-corporal',
    code: 'ArmsLeanMass',
    hidden: true,
    names: {
      en: [
        'Arms Lean Mass',
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
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
    code: 'ArmsFatMass',
    hidden: true,
    names: {
      en: [
        'Arms Fat Mass',
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
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
    code: 'LegsLeanMass',
    hidden: true,
    names: {
      en: [
        'Legs Lean Mass',
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
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
    code: 'LegsFatMass',
    hidden: true,
    names: {
      en: [
        'Legs Fat Mass',
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
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
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
    unit: 'kg',
  },
  {
    category: 'composicao-corporal',
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
    unit: 'kg',
  },

  // ============================================================================
  // BONE DENSITY / DENSIDADE ÓSSEA (DEXA Scan)
  // ============================================================================
  {
    category: 'densidade-ossea',
    code: 'BMD_Total',
    // No official LOINC code exists for total body BMD (only site-specific)
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
    unit: 'g/cm²',
  },
  {
    category: 'densidade-ossea',
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
    unit: 'score',
  },
  {
    category: 'densidade-ossea',
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
    unit: 'score',
  },

  // ============================================================================
  // CARDIOVASCULAR MARKERS — Insuficiência cardíaca e dano miocárdico
  // ============================================================================
  {
    category: 'coracao',
    code: 'NTproBNP',
    loinc: '33762-6',
    names: {
      en: ['NT-proBNP', 'N-Terminal pro B-Type Natriuretic Peptide', 'NT-pro-BNP'],
      pt: ['NT-proBNP', 'Peptídeo Natriurético Tipo B N-Terminal', 'Pró-BNP N-Terminal'],
    },
    unit: 'pg/mL',
  },
  {
    category: 'coracao',
    code: 'BNP',
    loinc: '30934-4',
    names: {
      en: ['BNP', 'B-Type Natriuretic Peptide', 'Brain Natriuretic Peptide'],
      pt: ['BNP', 'Peptídeo Natriurético Tipo B', 'Peptídeo Natriurético Cerebral'],
    },
    unit: 'pg/mL',
  },
  {
    category: 'coracao',
    code: 'TroponinI',
    loinc: '49563-0',
    names: {
      en: ['Troponin I', 'cTnI', 'Cardiac Troponin I', 'hs-TnI', 'High-Sensitivity Troponin I'],
      pt: ['Troponina I', 'cTnI', 'Troponina I Cardíaca', 'Troponina I Ultrassensível'],
    },
    unit: 'ng/mL',
  },
  {
    category: 'coracao',
    code: 'TroponinT',
    loinc: '6598-7',
    names: {
      en: ['Troponin T', 'cTnT', 'Cardiac Troponin T', 'hs-TnT', 'High-Sensitivity Troponin T'],
      pt: ['Troponina T', 'cTnT', 'Troponina T Cardíaca', 'Troponina T Ultrassensível'],
    },
    unit: 'ng/mL',
  },

  // ============================================================================
  // COAGULATION — Coagulação
  // ============================================================================
  {
    category: 'sangue',
    code: 'DDimer',
    loinc: '48066-5',
    names: {
      en: ['D-Dimer', 'D Dimer', 'Fibrin D-Dimer'],
      pt: ['Dímero-D', 'Dímero D', 'D-Dímero'],
    },
    unit: 'ng/mL',
  },
  {
    category: 'sangue',
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
    category: 'figado',
    code: 'LDH',
    loinc: '2532-0',
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
    category: 'hormonios',
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
    category: 'autoimunidade',
    code: 'IgM',
    loinc: '2472-9',
    names: {
      en: ['Immunoglobulin M', 'IgM', 'Total IgM'],
      pt: ['Imunoglobulina M', 'IgM', 'IgM Total'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'autoimunidade',
    code: 'C3',
    loinc: '4485-3',
    names: {
      en: ['Complement C3', 'C3'],
      pt: ['Complemento C3', 'C3', 'Fração C3 do Complemento'],
    },
    unit: 'mg/dL',
  },
  {
    category: 'autoimunidade',
    code: 'C4',
    loinc: '4498-6',
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
    category: 'marcadores-tumorais',
    code: 'CA199',
    loinc: '24108-3',
    names: {
      en: ['CA 19-9', 'Carbohydrate Antigen 19-9', 'CA19-9'],
      pt: ['CA 19-9', 'Antígeno Carboidrato 19-9', 'CA19-9'],
    },
    unit: 'U/mL',
  },
  {
    category: 'marcadores-tumorais',
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
    category: ['saude-feminina', 'marcadores-tumorais'],
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
    category: 'rins',
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
    category: 'nutrientes',
    code: 'Selenium',
    loinc: '5697-7',
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
    category: 'pancreas',
    code: 'BetaHydroxybutyrate',
    loinc: '53060-0',
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

/** Map code alias to canonical code */
const codeAliasToCanonicalMap = new Map<string, string>();

/** Set of all valid codes (canonical + aliases) */
const validCodeSet = new Set<string>();

// Initialize maps
for (const def of BIOMARKER_DEFINITIONS) {
  // Only add to LOINC maps if loinc is defined
  if (def.loinc) {
    loincToCodeMap.set(def.loinc, def.code);
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
 * Generate LLM reference prompt for biomarker extraction
 * This is included in the extraction prompt so the LLM can output LOINC codes directly
 */
export function generateLLMReference(): string {
  const lines: string[] = [
    'SUPPORTED BIOMARKERS (output the LOINC code or internal Code for each matched biomarker):',
    '',
  ];

  // Group by category for better organization
  const byCategory = new Map<string, BiomarkerDefinition[]>();
  for (const def of BIOMARKER_DEFINITIONS) {
    const categories = Array.isArray(def.category) ? def.category : [def.category];
    for (const cat of categories) {
      const existing = byCategory.get(cat) || [];
      existing.push(def);
      byCategory.set(cat, existing);
    }
  }

  for (const [category, defs] of byCategory) {
    lines.push(`[${category.toUpperCase()}]`);
    for (const def of defs) {
      const ptNames = def.names.pt.join(', ');
      const enNames = def.names.en.join(', ');
      if (def.loinc) {
        lines.push(`- LOINC: ${def.loinc} | Code: ${def.code}`);
      } else {
        lines.push(`- Code: ${def.code} (no LOINC - use code only)`);
      }
      lines.push(`  EN: ${enNames}`);
      lines.push(`  PT: ${ptNames}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate biomarkerTests format for UI compatibility
 * This replaces the old hardcoded biomarkerTests.ts
 * Excludes hidden biomarkers from the output
 */
export function toBiomarkerTests(): Record<
  string,
  Array<{ pt: string; en: string; code: string }>
> {
  const result: Record<string, Array<{ pt: string; en: string; code: string }>> = {};

  for (const def of BIOMARKER_DEFINITIONS) {
    // Skip hidden biomarkers
    if (def.hidden) continue;

    const categories = Array.isArray(def.category) ? def.category : [def.category];
    const ptName = def.names.pt[0] ?? def.code;
    const enName = def.names.en[0] ?? def.code;
    for (const category of categories) {
      if (!result[category]) {
        result[category] = [];
      }
      result[category]!.push({
        code: def.code,
        en: enName,
        pt: ptName,
      });
    }
  }

  return result;
}

/**
 * Biomarker search pattern for OCR text anchoring
 */
export interface BiomarkerSearchPattern {
  category: string | string[];
  code: string;
  loinc?: string;
  names: string[]; // All names (EN + PT) for this biomarker
  unit?: string; // Absent for qualitative biomarkers (urine dipstick, etc.)
}

/**
 * Get all biomarker search patterns for OCR text anchoring
 * Returns a flat list of all biomarker codes with their searchable names
 *
 * `category` and `unit` are exposed so anchoring consumers can tell
 * quantitative biomarkers from qualitative ones (which need different
 * matching rules — a qualitative marker has no number next to it).
 */
export function getAllSearchPatterns(): BiomarkerSearchPattern[] {
  return BIOMARKER_DEFINITIONS.map((def) => ({
    category: def.category,
    code: def.code,
    ...(def.loinc && { loinc: def.loinc }),
    names: [...def.names.en, ...def.names.pt],
    ...(def.unit && { unit: def.unit }),
  }));
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

  // Group by category for organization
  const byCategory = new Map<string, BiomarkerDefinition[]>();
  for (const def of filteredDefs) {
    const categories = Array.isArray(def.category) ? def.category : [def.category];
    for (const cat of categories) {
      const existing = byCategory.get(cat) || [];
      existing.push(def);
      byCategory.set(cat, existing);
    }
  }

  for (const [category, defs] of byCategory) {
    lines.push(`[${category.toUpperCase()}]`);
    for (const def of defs) {
      const ptNames = def.names.pt.join(', ');
      const enNames = def.names.en.join(', ');
      if (def.loinc) {
        lines.push(`- LOINC: ${def.loinc} | Code: ${def.code}`);
      } else {
        lines.push(`- Code: ${def.code} (no LOINC - use code only)`);
      }
      lines.push(`  EN: ${enNames}`);
      lines.push(`  PT: ${ptNames}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * DEXA indicator biomarker codes
 * When these are found in OCR text, the document is likely a DEXA/body composition scan
 */
export const DEXA_INDICATOR_CODES = [
  'BodyFatPct',
  'FatMass',
  'LeanMass',
  'BMC',
  'FatFreeMass',
  'TotalMass',
] as const;

/**
 * DEXA-related categories that should be included when a DEXA document is detected
 */
export const DEXA_CATEGORIES = ['composicao-corporal', 'densidade-ossea'] as const;

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
    const categories = Array.isArray(def.category) ? def.category : [def.category];
    return categories.some((cat) =>
      DEXA_CATEGORIES.includes(cat as (typeof DEXA_CATEGORIES)[number]),
    );
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

// Build a normalized name map for fast lookups
const normalizedNameToCodeMap = new Map<string, string>();
for (const def of BIOMARKER_DEFINITIONS) {
  for (const name of [...def.names.en, ...def.names.pt]) {
    normalizedNameToCodeMap.set(normalizeText(name), def.code);
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

  const normalized = normalizeText(name);
  return normalizedNameToCodeMap.get(normalized);
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

/**
 * Get all biomarkers for a specific category
 *
 * @param category - The category slug (e.g., 'coracao', 'tireoide')
 * @param options - Optional filters
 * @param options.includeHidden - Include hidden biomarkers (default: false)
 * @param options.sex - Filter by sex ('male', 'female', or 'both' for all)
 * @returns Array of biomarker definitions for the category
 */
export function getBiomarkersByCategory(
  category: string,
  options?: {
    includeHidden?: boolean;
    sex?: 'male' | 'female' | 'both';
  },
): BiomarkerDefinition[] {
  const { includeHidden = false, sex = 'both' } = options ?? {};

  return BIOMARKER_DEFINITIONS.filter((def) => {
    const categories = Array.isArray(def.category) ? def.category : [def.category];
    if (!categories.includes(category)) return false;
    if (!includeHidden && def.hidden) return false;
    if (sex !== 'both') {
      // Include biomarkers that are for this sex or for 'both' (undefined)
      if (def.sex && def.sex !== sex && def.sex !== 'both') return false;
    }
    return true;
  });
}

/**
 * Get all biomarkers for multiple categories
 *
 * @param categories - Array of category slugs
 * @param options - Optional filters (same as getBiomarkersByCategory)
 * @returns Array of biomarker definitions grouped by category
 */
export function getBiomarkersForCategories(
  categories: string[],
  options?: {
    includeHidden?: boolean;
    sex?: 'male' | 'female' | 'both';
  },
): Record<string, BiomarkerDefinition[]> {
  const result: Record<string, BiomarkerDefinition[]> = {};

  for (const category of categories) {
    const biomarkers = getBiomarkersByCategory(category, options);
    if (biomarkers.length > 0) {
      result[category] = biomarkers;
    }
  }

  return result;
}
