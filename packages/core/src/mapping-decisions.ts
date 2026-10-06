/**
 * Registro de decisão de cada mapeamento LOINC do catálogo.
 *
 * O catálogo em `biomarkers.ts` guarda a conclusão (o código). Este arquivo
 * guarda por que aquele código e não outro: o que o laudo mostrou, o que
 * decidiu, os irmãos descartados e quem revisou. É o diff que uma revisão de
 * mapeamento lê.
 *
 * A maioria das entradas é `nameOnly`: o código foi escolhido pelo nome do
 * exame, sem registro de unidade, método, material ou bula, e ninguém revisou
 * de fora. É o registro honesto do que existe, e não justificativa inventada.
 * As entradas com evidência vieram dos comentários em `biomarkers.ts` que já
 * documentavam a troca. `reviewer` fica vazio até uma revisão independente.
 *
 * `loinc` repete o código do catálogo de propósito: trocar o código em
 * `biomarkers.ts` sem tocar aqui falha em `mapping-decisions.test.ts`, e a
 * troca chega à revisão com o registro ao lado.
 *
 * Sem import em runtime: o `scripts/verify-loinc.ts` lê este arquivo direto com
 * o type stripping do Node, que não resolve import sem extensão. A ficha que
 * junta registro, catálogo e eixos fica em `mapping-sheet.ts`.
 */
/** O que o laudo mostrou e pesou na escolha do código. */
export type MappingEvidence = 'assay-insert' | 'method-line' | 'name' | 'specimen' | 'unit';

export interface RejectedSibling {
  loinc: string;
  reason: string;
}

export interface MappingDecision {
  evidence: MappingEvidence[];
  /** O código escolhido. Tem que ser o `loinc` do biomarcador no catálogo. */
  loinc: string;
  /** Versão do LOINC em que a revisão conferiu o código. */
  loincVersion?: string;
  note?: string;
  reviewedAt?: string;
  reviewer?: string;
  /** Qual evidência decidiu. Está sempre em `evidence`. */
  settledBy: MappingEvidence;
  siblingsRejected: RejectedSibling[];
}

/**
 * Por que uma entrada não tem LOINC.
 *
 * - `no-concept`: procurado, e o LOINC não tem o conceito.
 * - `ambiguous`: há candidatos, e nenhum é a mesma grandeza.
 * - `pending-review`: ninguém registrou a busca.
 * - `not-lab`: fora do escopo de exame laboratorial.
 */
export type NoLoincReason = 'ambiguous' | 'no-concept' | 'not-lab' | 'pending-review';

export interface NoLoincDecision {
  note: string;
  reason: NoLoincReason;
}

/** Escolhido pelo nome, sem outra evidência registrada nem revisão. */
function nameOnly(loinc: string): MappingDecision {
  return { evidence: ['name'], loinc, settledBy: 'name', siblingsRejected: [] };
}

export const MAPPING_DECISIONS: Record<string, MappingDecision> = {
  AA_EPA_Ratio: nameOnly('90909-3'),
  ABO_Group: nameOnly('883-9'),
  Adiponectin: nameOnly('47828-9'),
  AFP: nameOnly('1834-1'),
  Albumin: nameOnly('1751-7'),
  Albumin_Creatinine_Ratio: nameOnly('9318-7'),
  Albumin_Globulin_Ratio: nameOnly('1759-0'),
  AlkalinePhosphatase: nameOnly('6768-6'),
  ALT: nameOnly('1742-6'),
  AMH: nameOnly('38476-8'),
  Amylase: nameOnly('1798-8'),
  ANA_Screen: nameOnly('8061-4'),
  AntiThyroglobulin: nameOnly('8098-6'),
  AntiTPO: nameOnly('8099-4'),
  ApoA1: nameOnly('1869-7'),
  ApoB: nameOnly('1884-6'),
  APOE_Genotype: nameOnly('21619-2'),
  Appearance_Urine: nameOnly('5767-9'),
  AST: nameOnly('1920-8'),
  Bacteria_Urine: {
    loinc: '5769-5',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      {
        loinc: '630-4',
        reason:
          'urocultura, que identifica a espécie (nominal), e não a contagem do sedimento em /HPF',
      },
    ],
  },
  Basophils: nameOnly('706-2'),
  Basophils_Abs: nameOnly('704-7'),
  BetaHCG: nameOnly('19080-1'),
  BetaHydroxybutyrate: {
    loinc: '6873-4',
    evidence: ['name', 'unit'],
    settledBy: 'name',
    siblingsRejected: [
      {
        loinc: '53060-0',
        reason: 'butirilcarnitina (C4) em líquido amniótico: analito e material errados',
      },
    ],
  },
  Bilirubin_Urine: nameOnly('5770-3'),
  BilirubinDirect: nameOnly('1968-7'),
  BilirubinIndirect: nameOnly('1971-1'),
  BilirubinTotal: nameOnly('1975-2'),
  Blood_Urine: nameOnly('5794-3'),
  BMI: nameOnly('39156-5'),
  BNP: nameOnly('30934-4'),
  BodyFatPct: nameOnly('41982-0'),
  BodyWaterPct: nameOnly('101684-9'),
  BUN: {
    loinc: '3094-0',
    evidence: ['name', 'unit'],
    settledBy: 'name',
    note: 'criado em out/2026 para o BUN dos laudos americanos (Quest imprime "UREA NITROGEN (BUN)" em mg/dL); a ureia dos laudos brasileiros segue em Urea',
    siblingsRejected: [
      {
        loinc: '3091-6',
        reason:
          'ureia: outro componente (a molécula inteira, não só o nitrogênio), valor cerca de 2,14 vezes maior que o BUN',
      },
    ],
  },
  BUN_Creatinine_Ratio: nameOnly('3097-3'),
  C3: nameOnly('4485-9'),
  C4: nameOnly('4498-2'),
  CA125: nameOnly('10334-1'),
  CA153: nameOnly('6875-9'),
  CA199: nameOnly('24108-3'),
  Calcium: nameOnly('17861-6'),
  CalfCircumference: nameOnly('107112-5'),
  CEA: nameOnly('2039-6'),
  Chloride: nameOnly('2075-0'),
  Cholesterol: nameOnly('2093-3'),
  Cholesterol_HDL_Ratio: nameOnly('9830-1'),
  CK: nameOnly('2157-6'),
  CO2: nameOnly('2028-9'),
  Color_Urine: nameOnly('5778-6'),
  Cortisol: nameOnly('2143-6'),
  Creatinine: nameOnly('2160-0'),
  Creatinine_Urine: nameOnly('2161-8'),
  CRP: nameOnly('1988-5'),
  CystatinC: nameOnly('33863-2'),
  DDimer: {
    loinc: '48065-7',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      {
        loinc: '48066-5',
        reason: 'DDU, que vale cerca de metade do FEU que a faixa do catálogo pressupõe',
      },
    ],
    note: 'Laudo que imprime só "ng/mL" não diz a convenção; o FEU é o que a faixa pressupõe.',
  },
  DHEAS: nameOnly('2191-5'),
  DHT: nameOnly('1848-1'),
  eAG: nameOnly('27353-2'),
  eGFR: nameOnly('98979-8'),
  Eosinophils: nameOnly('713-8'),
  Eosinophils_Abs: nameOnly('711-2'),
  EPADPADHA: {
    loinc: '90911-9',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      {
        loinc: '90908-5',
        reason:
          'interpretação ordinal do mesmo valor (risco alto, moderado, baixo), e não o número',
      },
    ],
  },
  ESR: nameOnly('30341-2'),
  Estradiol: nameOnly('2243-4'),
  FatMass: nameOnly('73708-0'),
  Ferritin: nameOnly('2276-4'),
  Fibrinogen: nameOnly('3255-7'),
  Folate: nameOnly('2284-8'),
  FSH: nameOnly('15067-2'),
  GGT: nameOnly('2324-2'),
  Gliadin_Deamidated_IgA: nameOnly('63453-5'),
  Gliadin_Deamidated_IgG: nameOnly('63459-2'),
  Globulin: nameOnly('2336-6'),
  Glucose: {
    loinc: '2345-7',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [
      {
        loinc: '1558-6',
        reason: 'afirma jejum (Glucose^post CFst), e a grafia "Glicose" não declara jejum',
      },
    ],
  },
  Glucose_Fasting: {
    loinc: '1558-6',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [{ loinc: '2345-7', reason: 'não afirma jejum, e a grafia declara' }],
  },
  Glucose_Urine: nameOnly('5792-7'),
  HbA1c: nameOnly('4548-4'),
  Hct: nameOnly('4544-3'),
  HDL: nameOnly('2085-9'),
  HDL_Large: nameOnly('43729-3'),
  Hgb: nameOnly('718-7'),
  HOMA_IR: nameOnly('47214-2'),
  Homocysteine: nameOnly('13965-9'),
  HyalineCasts_Urine: nameOnly('5796-8'),
  IgA: nameOnly('2458-8'),
  IgE_E1_CatDander: nameOnly('6833-8'),
  IgE_GX1_Grasses: nameOnly('30189-5'),
  IgE_Total: nameOnly('19113-0'),
  IgG: nameOnly('2465-3'),
  IgM: nameOnly('2472-9'),
  INR: nameOnly('6301-6'),
  Insulin: nameOnly('20448-7'),
  Iron: nameOnly('2498-4'),
  Ketones_Urine: nameOnly('5797-6'),
  LDH: nameOnly('14804-9'),
  LDL: {
    loinc: '2089-1',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [],
    note: 'Código sem método. A linha de método do laudo escolhe a variante (13457-7, 18262-6, 96259-7).',
  },
  LDL_Medium: nameOnly('96735-6'),
  LDL_ParticleNumber: nameOnly('54434-6'),
  LDL_Pattern: nameOnly('35505-7'),
  LDL_Peak_Size: nameOnly('17782-4'),
  LDL_Small: nameOnly('43727-7'),
  Lead: nameOnly('77307-7'),
  Leptin: nameOnly('21365-2'),
  LeukocyteEsterase_Urine: nameOnly('5799-2'),
  Leukocytes_Urine: nameOnly('5821-4'),
  LH: nameOnly('10501-5'),
  Lipase: nameOnly('3040-3'),
  Lipoprotein_a: {
    loinc: '43583-4',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      {
        loinc: '10835-7',
        reason:
          'massa/volume (mg/dL), incompatível com o nmol/L declarado; a SBC 2025 recomenda ensaio independente de isoforma em nmol/L',
      },
    ],
  },
  Lymphocytes: nameOnly('736-9'),
  Lymphocytes_Abs: nameOnly('731-0'),
  Magnesium: nameOnly('19123-9'),
  Magnesium_RBC: nameOnly('26746-8'),
  MCH: nameOnly('785-6'),
  MCHC: nameOnly('786-4'),
  MCV: nameOnly('787-2'),
  Mercury: nameOnly('5685-3'),
  Microalbumin_Urine: nameOnly('14957-5'),
  MMA: nameOnly('13964-2'),
  Monocytes: nameOnly('5905-5'),
  Monocytes_Abs: nameOnly('742-7'),
  MPV: nameOnly('32623-1'),
  MuscleMass: nameOnly('73964-9'),
  Neutrophils: nameOnly('770-8'),
  Neutrophils_Abs: nameOnly('751-8'),
  Nitrite_Urine: nameOnly('5802-4'),
  NonHDL_Cholesterol: nameOnly('43396-1'),
  NTproBNP: nameOnly('33762-6'),
  Omega3_DHA: {
    loinc: '90914-3',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [],
    note: 'Fração do total de ácidos graxos (painel 90918-4), que é o % impresso.',
  },
  Omega3_DPA: {
    loinc: '90913-5',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [],
    note: 'Fração do total de ácidos graxos (painel 90918-4), que é o % impresso.',
  },
  Omega3_EPA: {
    loinc: '90912-7',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [],
    note: 'Fração do total de ácidos graxos (painel 90918-4), que é o % impresso.',
  },
  Omega3_Total: {
    loinc: '99620-7',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [],
    note: 'Moles/volume em RBC.lysate, e o laudo imprime %: não há código de fração para o total.',
  },
  Omega6_AA: {
    loinc: '90916-8',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [],
    note: 'Fração do total de ácidos graxos (painel 90918-4), que é o % impresso.',
  },
  Omega6_LA: {
    loinc: '90917-6',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [],
    note: 'Fração do total de ácidos graxos (painel 90918-4), que é o % impresso.',
  },
  Omega6_Omega3_Ratio: nameOnly('90910-1'),
  Omega6_Total: {
    loinc: '99621-5',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [
      {
        loinc: '35177-5',
        reason:
          'ácidos graxos poli-insaturados totais, ômega-3 e ômega-6 somados: outro componente',
      },
    ],
    note: 'Moles/volume em RBC.lysate, e o laudo imprime %: não há código de fração para o total.',
  },
  pH_Urine: nameOnly('5803-2'),
  PhaseAngle: {
    loinc: '107160-4',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [],
    note: 'Único código de ângulo de fase; declara razão e o aparelho imprime graus.',
  },
  Platelets: nameOnly('777-3'),
  Potassium: nameOnly('2823-3'),
  Progesterone: nameOnly('2839-9'),
  Prolactin: nameOnly('2842-3'),
  Protein_Urine: nameOnly('5804-0'),
  ProthrombinTime: nameOnly('5902-2'),
  PSA: nameOnly('2857-1'),
  PSA_Free: nameOnly('10886-0'),
  PSA_FreeRatio: nameOnly('12841-3'),
  PTH: nameOnly('2731-8'),
  RBC: nameOnly('789-8'),
  RBC_Urine: {
    loinc: '13945-1',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '5808-1', reason: 'o mesmo exame em #/volume (por mL), e o laudo imprime /HPF' },
    ],
  },
  RDW: nameOnly('788-0'),
  Reticulocytes: nameOnly('4679-7'),
  Rh_Type: nameOnly('10331-7'),
  RheumatoidFactor: nameOnly('11572-5'),
  Selenium: nameOnly('5724-0'),
  SHBG: nameOnly('13967-5'),
  SkinfoldAbdominal: nameOnly('8355-0'),
  SkinfoldThigh: nameOnly('8353-5'),
  SkinfoldTriceps: nameOnly('8354-3'),
  Sodium: nameOnly('2951-2'),
  SpecificGravity_Urine: nameOnly('5811-5'),
  SquamousEpithelial_Urine: nameOnly('11277-1'),
  T3Free: nameOnly('3051-0'),
  T4Free: nameOnly('3024-7'),
  T4Total: nameOnly('3026-2'),
  Testosterone: nameOnly('2986-8'),
  TestosteroneFree: nameOnly('2991-8'),
  Thyroglobulin: nameOnly('3013-0'),
  TIBC: nameOnly('2500-7'),
  TotalBodyWater: {
    loinc: '101683-1',
    evidence: ['name', 'unit'],
    settledBy: 'name',
    siblingsRejected: [],
    note: 'Único código de água corporal total; é massa (kg) e o aparelho imprime litros, o mesmo número para água.',
  },
  TotalMass: nameOnly('29463-7'),
  TotalProtein: nameOnly('2885-2'),
  TransferrinSaturation: nameOnly('2502-3'),
  Triglycerides: nameOnly('2571-8'),
  TroponinI: {
    loinc: '49563-0',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [],
    note: '49563-0 afirma o ensaio de alta sensibilidade; troponina I convencional pede 10839-9, sem método.',
  },
  TroponinT: {
    loinc: '6598-7',
    evidence: ['name', 'unit'],
    settledBy: 'name',
    siblingsRejected: [],
    note: '6598-7 não afirma método e cobre o ensaio convencional e o ultrassensível; o código hs entra como variante por método.',
  },
  TSH: nameOnly('3016-3'),
  tTG_IgA: nameOnly('31017-7'),
  tTG_IgG: nameOnly('32998-7'),
  Urea: nameOnly('3091-6'),
  Urea_Creatinine_Ratio: {
    loinc: '56997-0',
    evidence: ['name'],
    settledBy: 'name',
    note: 'separado de BUN_Creatinine_Ratio em out/2026: o laudo brasileiro dosa ureia (3091-6), e a razão impressa é ureia/creatinina',
    siblingsRejected: [
      {
        loinc: '3097-3',
        reason:
          'nitrogênio ureico (BUN)/creatinina: outro componente, valor cerca de 2,14 vezes menor e faixa da convenção BUN',
      },
    ],
  },
  UricAcid: nameOnly('3084-1'),
  Urobilinogen_Urine: nameOnly('20405-7'),
  VitaminA: nameOnly('2923-1'),
  VitaminB12: nameOnly('2132-9'),
  VitaminC: nameOnly('1903-4'),
  VitaminD: {
    loinc: '62292-8',
    evidence: ['name', 'assay-insert'],
    settledBy: 'assay-insert',
    siblingsRejected: [
      { loinc: '1989-3', reason: 'só a fração D3; os imunoensaios reportam D2 + D3' },
    ],
  },
  VLDL: nameOnly('13458-5'),
  WaistCircumference: nameOnly('8280-0'),
  WBC: nameOnly('6690-2'),
  Zinc: {
    loinc: '5763-8',
    evidence: ['name', 'specimen'],
    settledBy: 'specimen',
    siblingsRejected: [
      { loinc: '8245-3', reason: 'sangue total, outro material com faixa própria' },
    ],
  },
};

export const NO_LOINC_DECISIONS: Record<string, NoLoincDecision> = {
  AndroidFatPct: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  AndroidGynoidRatio: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  AorticValveCalcium: {
    reason: 'pending-review',
    note: 'Escore de cálcio por tomografia; nenhuma busca registrada.',
  },
  ArmsFatMass: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  ArmsLeanMass: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  BMC: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  BMD_Total: {
    reason: 'no-concept',
    note: 'O LOINC só tem densitometria por sítio, não corpo inteiro.',
  },
  BasalMetabolicRate: {
    reason: 'ambiguous',
    note: 'Candidatos são índice (50042-1) ou RMR medido ou previsto (82278-3, 82286-6), e o aparelho estima TMB.',
  },
  CAC: {
    reason: 'pending-review',
    note: 'Escore de cálcio por tomografia; nenhuma busca registrada.',
  },
  CAC_LAD: {
    reason: 'pending-review',
    note: 'Escore de cálcio por tomografia; nenhuma busca registrada.',
  },
  CAC_LCX: {
    reason: 'pending-review',
    note: 'Escore de cálcio por tomografia; nenhuma busca registrada.',
  },
  CAC_LMA: {
    reason: 'pending-review',
    note: 'Escore de cálcio por tomografia; nenhuma busca registrada.',
  },
  CAC_Percentile: {
    reason: 'pending-review',
    note: 'Escore de cálcio por tomografia; nenhuma busca registrada.',
  },
  CAC_RCA: {
    reason: 'pending-review',
    note: 'Escore de cálcio por tomografia; nenhuma busca registrada.',
  },
  ConicityIndex: { reason: 'no-concept', note: 'Índice derivado, sem conceito próprio.' },
  ECWToTBWRatio: { reason: 'no-concept', note: 'Razão derivada, sem conceito próprio.' },
  Estrone: {
    reason: 'no-concept',
    note: 'Em soro só há a fração não conjugada (2261-6); não há estrona total.',
  },
  ExtracellularWater: { reason: 'no-concept', note: '"extracellular water" não devolve código.' },
  FatFreeMass: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  GynoidFatPct: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  IntracellularWater: { reason: 'no-concept', note: '"intracellular water" não devolve código.' },
  LeanMass: {
    reason: 'no-concept',
    note: 'Massa magra não é massa muscular (73964-9); não há LOINC para massa magra.',
  },
  LegsFatMass: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  LegsLeanMass: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  MuscleMassIndex: {
    reason: 'no-concept',
    note: 'Índice derivado de massa muscular total; os cortes publicados são sobre massa apendicular.',
  },
  ResidualMass: {
    reason: 'no-concept',
    note: 'Conceito de fracionamento antropométrico, sem código.',
  },
  SkinfoldChest: { reason: 'no-concept', note: 'O LOINC só tem dobra de tríceps, coxa e cintura.' },
  SkinfoldMidaxillary: {
    reason: 'no-concept',
    note: 'O LOINC só tem dobra de tríceps, coxa e cintura.',
  },
  SkinfoldSubscapular: {
    reason: 'no-concept',
    note: 'O LOINC só tem dobra de tríceps, coxa e cintura.',
  },
  SkinfoldSuprailiac: {
    reason: 'no-concept',
    note: 'O LOINC só tem dobra de tríceps, coxa e cintura.',
  },
  TScore_Total: {
    reason: 'no-concept',
    note: 'O LOINC só tem densitometria por sítio, não corpo inteiro.',
  },
  TrunkFatMass: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  TrunkLeanMass: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  VATMass: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  VATVolume: {
    reason: 'no-concept',
    note: 'DEXA: o LOINC não tem o conceito para corpo inteiro ou região.',
  },
  VisceralFatLevel: {
    reason: 'no-concept',
    note: 'Índice de 1 a 20; 73707-2 é área, outra grandeza.',
  },
  WaistToHeightRatio: { reason: 'no-concept', note: '"waist to height" não devolve código.' },
  ZScore_Total: {
    reason: 'no-concept',
    note: 'O LOINC só tem densitometria por sítio, não corpo inteiro.',
  },
};

export function getMappingDecision(code: string): MappingDecision | undefined {
  return MAPPING_DECISIONS[code];
}

export function getNoLoincDecision(code: string): NoLoincDecision | undefined {
  return NO_LOINC_DECISIONS[code];
}
