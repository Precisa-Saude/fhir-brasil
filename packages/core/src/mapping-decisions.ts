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
 * - `no-concept`: nenhum conceito equivalente encontrado nas buscas registradas.
 * - `ambiguous`: há candidatos, mas a equivalência não está estabelecida.
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
  AnionGap: {
    loinc: '33037-3',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [
      {
        loinc: '10466-1',
        reason: 'Calculated.3Ions: o laudo não diz se o potássio entrou na conta',
      },
      { loinc: '1863-0', reason: 'Calculated.4Ions: idem' },
      { loinc: '41276-7', reason: 'sangue total, da gasometria' },
    ],
  },
  AntiCCP: {
    loinc: '33935-8',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,78.',
    settledBy: 'unit',
    siblingsRejected: [{ loinc: '53028-7', reason: 'presença; o laudo imprime unidades' }],
  },
  AntiDsDNA: {
    loinc: '5130-0',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,96.',
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '33800-4', reason: 'específico de IgG; conceito base' },
      { loinc: '32677-7', reason: 'imunoensaio declarado, que o laudo não imprime' },
    ],
  },
  AntiJo1: {
    loinc: '11565-9',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,28.',
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '8076-2', reason: 'presença; o laudo imprime índice' },
      { loinc: '33571-1', reason: 'específico de IgG; conceito base' },
    ],
  },
  AntiRNP: {
    loinc: '29374-6',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,27.',
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '31588-7', reason: 'específico de IgG; conceito base (o Jev propôs este)' },
      { loinc: '8091-1', reason: 'presença; o laudo imprime índice' },
    ],
  },
  AntiScl70: {
    loinc: '27416-7',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,51.',
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '8092-9', reason: 'presença (o Jev propôs este); o laudo imprime índice' },
    ],
  },
  AntiSm: {
    loinc: '11090-8',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,18.',
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '18323-6', reason: 'específico de IgG; conceito base (o Jev propôs este)' },
      { loinc: '31627-3', reason: 'presença; o laudo imprime índice' },
    ],
  },
  AntiSSA: {
    loinc: '17792-3',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,46.',
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '33610-7', reason: 'específico de IgG; conceito base' },
      { loinc: '8093-7', reason: 'presença; o laudo imprime índice' },
    ],
  },
  AntiSSB: {
    loinc: '17791-5',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,49.',
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '33613-1', reason: 'específico de IgG; conceito base' },
      { loinc: '8094-5', reason: 'presença; o laudo imprime índice' },
    ],
  },
  AntiThyroglobulin: nameOnly('8098-6'),
  AntiTPO: nameOnly('8099-4'),
  ApoA1: nameOnly('1869-7'),
  ApoB: nameOnly('1884-6'),
  APOE_Genotype: nameOnly('21619-2'),
  Appearance_Urine: nameOnly('5767-9'),
  APTT: {
    loinc: '14979-9',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,95.',
    settledBy: 'name',
    siblingsRejected: [
      { loinc: '34571-0', reason: 'sensível a anticoagulante lúpico, outro teste' },
      { loinc: '3173-2', reason: 'sangue total' },
    ],
  },
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
  BMD_Arms: {
    evidence: ['name', 'unit'],
    loinc: '46383-6',
    note: 'DXA Bone [Mass/Area] Bone density, sistema XXX>Bone (sítio não especificado). A região vai em Observation.bodySite, SNOMED CT 371195002 (Bone structure of upper limb), e o importador só resolve o código com ela. Proposto na auditoria de 09/10/2026 (PRE-494); sem revisão independente.',
    settledBy: 'name',
    siblingsRejected: [
      {
        loinc: '85385-3',
        reason: 'úmero, um osso só; a região dos braços no DXA de corpo inteiro é maior',
      },
      { loinc: '24890-6', reason: 'rádio e ulna' },
    ],
  },
  BMD_Head: {
    evidence: ['name', 'unit'],
    loinc: '46383-6',
    note: 'DXA Bone [Mass/Area] Bone density, sistema XXX>Bone (sítio não especificado). A região vai em Observation.bodySite, SNOMED CT 69536005 (Head structure), e o importador só resolve o código com ela. Proposto na auditoria de 09/10/2026 (PRE-494); sem revisão independente.',
    settledBy: 'name',
    siblingsRejected: [],
  },
  BMD_Legs: {
    evidence: ['name', 'unit'],
    loinc: '46383-6',
    note: 'DXA Bone [Mass/Area] Bone density, sistema XXX>Bone (sítio não especificado). A região vai em Observation.bodySite, SNOMED CT 72001000 (Bone structure of lower limb), e o importador só resolve o código com ela. Proposto na auditoria de 09/10/2026 (PRE-494); sem revisão independente.',
    settledBy: 'name',
    siblingsRejected: [
      { loinc: '24701-5', reason: 'fêmur, um osso só; a região das pernas é maior' },
    ],
  },
  BMD_Pelvis: {
    evidence: ['name', 'unit'],
    loinc: '46383-6',
    note: 'DXA Bone [Mass/Area] Bone density, sistema XXX>Bone (sítio não especificado). A região vai em Observation.bodySite, SNOMED CT 118645006 (Bone structure of pelvis), e o importador só resolve o código com ela. Proposto na auditoria de 09/10/2026 (PRE-494); sem revisão independente.',
    settledBy: 'name',
    siblingsRejected: [
      {
        loinc: '38261-4',
        reason: 'quadril, sítio da densitometria de fêmur proximal, não a pelve do corpo inteiro',
      },
    ],
  },
  BMD_Ribs: {
    evidence: ['name', 'unit'],
    loinc: '46383-6',
    note: 'DXA Bone [Mass/Area] Bone density, sistema XXX>Bone (sítio não especificado). A região vai em Observation.bodySite, SNOMED CT 113197003 (Bone structure of rib), e o importador só resolve o código com ela. Proposto na auditoria de 09/10/2026 (PRE-494); sem revisão independente.',
    settledBy: 'name',
    siblingsRejected: [],
  },
  BMD_Spine: {
    evidence: ['name', 'unit'],
    loinc: '46383-6',
    note: 'DXA Bone [Mass/Area] Bone density, sistema XXX>Bone (sítio não especificado). A região vai em Observation.bodySite, SNOMED CT 51282000 (Bone structure of spine), e o importador só resolve o código com ela. Proposto na auditoria de 09/10/2026 (PRE-494); sem revisão independente.',
    settledBy: 'name',
    siblingsRejected: [
      { loinc: '24966-4', reason: 'só a coluna lombar' },
      { loinc: '104938-6', reason: 'T-score, outra grandeza' },
    ],
  },
  BMD_Total: {
    evidence: ['name', 'unit'],
    loinc: '46383-6',
    note: 'DXA Bone [Mass/Area] Bone density, sistema XXX>Bone (sítio não especificado). A região vai em Observation.bodySite, SNOMED CT 38266002 (Entire body as a whole), e o importador só resolve o código com ela. Proposto na auditoria de 09/10/2026 (PRE-494); sem revisão independente.',
    settledBy: 'name',
    siblingsRejected: [{ loinc: '38268-9', reason: 'documento, não medida' }],
  },
  BMD_Trunk: {
    evidence: ['name', 'unit'],
    loinc: '46383-6',
    note: 'DXA Bone [Mass/Area] Bone density, sistema XXX>Bone (sítio não especificado). A região vai em Observation.bodySite, SNOMED CT 312763008 (Bone structure of trunk), e o importador só resolve o código com ela. Proposto na auditoria de 09/10/2026 (PRE-494); sem revisão independente.',
    settledBy: 'name',
    siblingsRejected: [],
  },
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
  CPeptide: {
    loinc: '1986-9',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [{ loinc: '14633-2', reason: 'pmol/L, molar; o laudo imprime ng/mL' }],
  },
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
  Estrone: {
    evidence: ['name', 'unit'],
    loinc: '2258-2',
    note: 'Estrona em pg/mL: Estrone:MCnc:Pt:Ser/Plas:Qn, sem fração ou método especificado. Fonte: https://loinc.org/2258-2 e serviço oficial, LOINC 2.83, consulta em 09/10/2026. Corrige a busca anterior, que só havia registrado 2261-6. A consulta terminológica não constitui revisão independente.',
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '2261-6', reason: 'fração não conjugada, que o nome local não especifica' },
      { loinc: '22663-9', reason: 'moles/volume; o catálogo declara pg/mL' },
      { loinc: '15355-1', reason: 'sulfato de estrona, outro componente' },
    ],
  },
  FatFreeMass: {
    evidence: ['name', 'unit', 'method-line'],
    loinc: '91557-9',
    note: 'O modelo de laudo DXA GE Lunar Prodigy define Fat Free como Lean Tissue + BMC e Total Mass como Fat + Lean + BMC. Isso corresponde ao peso menos gordura da fórmula oficial de 88334-8, que compartilha o componente LP94922-9 com 91557-9. A evidência method-line registra essa definição do cálculo; o código canônico não especifica método. Fonte: https://loinc.org/91557-9 e https://loinc.org/88334-8, LOINC 2.83; auditoria de 09/10/2026 em docs/development/loinc-gaps-2026-10-09.md. Não representa tecido magro sem mineral ósseo nem revisão independente.',
    settledBy: 'method-line',
    siblingsRejected: [
      {
        loinc: '88334-8',
        reason: 'método Calculated; a entrada genérica não exige esse método em todos os laudos',
      },
    ],
  },
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
  Glucose_Urine: {
    loinc: '25428-4',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      {
        loinc: '5792-7',
        reason: 'o mesmo exame em mg/dL, e o EAS imprime Negativo, Traços ou cruzes (PrThr)',
      },
    ],
  },
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
  IGF1: {
    loinc: '2484-4',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [{ loinc: '73561-3', reason: 'escore Z, outra grandeza' }],
  },
  IgG: nameOnly('2465-3'),
  IgM: nameOnly('2472-9'),
  ImmatureGranulocytes: {
    loinc: '71695-1',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [
      {
        loinc: '38518-7',
        reason: 'sem método; o leucograma do catálogo usa a contagem automatizada',
      },
    ],
  },
  ImmatureGranulocytes_Abs: {
    loinc: '53115-2',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      {
        loinc: '51584-1',
        reason: 'sem método; o leucograma do catálogo usa a contagem automatizada',
      },
    ],
  },
  INR: nameOnly('6301-6'),
  Insulin: nameOnly('20448-7'),
  IonizedCalcium: {
    loinc: '1995-0',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '1994-3', reason: 'sangue total, da gasometria' },
      { loinc: '12180-6', reason: 'método ISE, que o laudo não imprime' },
      { loinc: '38230-9', reason: 'sangue total, em mg/dL' },
    ],
  },
  Iron: nameOnly('2498-4'),
  Ketones_Urine: {
    loinc: '2514-8',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      {
        loinc: '5797-6',
        reason: 'o mesmo exame em mg/dL, e o EAS imprime Negativo ou cruzes (PrThr)',
      },
    ],
  },
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
  MPO_Antibody: {
    loinc: '6969-0',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,63.',
    settledBy: 'unit',
    siblingsRejected: [{ loinc: '17316-1', reason: 'presença; o laudo imprime índice' }],
  },
  MPV: nameOnly('32623-1'),
  MuscleMass: nameOnly('73964-9'),
  Neutrophils: nameOnly('770-8'),
  Neutrophils_Abs: nameOnly('751-8'),
  Nitrite_Urine: nameOnly('5802-4'),
  NonHDL_Cholesterol: nameOnly('43396-1'),
  NRBC: {
    loinc: '58413-6',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [
      {
        loinc: '19048-8',
        reason: 'sem método; o hemograma do catálogo usa a contagem automatizada',
      },
      { loinc: '18309-5', reason: 'contagem manual' },
    ],
  },
  NRBC_Abs: {
    loinc: '771-6',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      {
        loinc: '30392-5',
        reason: 'sem método; o hemograma do catálogo usa a contagem automatizada',
      },
      { loinc: '772-4', reason: 'contagem manual' },
    ],
  },
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
  pANCA: {
    loinc: '32787-4',
    evidence: ['name', 'unit'],
    note: 'proposto pelo loinc-drilldown com o Jev (PRE-479, segundo nível) e aprovado pelo curador em 09/10/2026; confiança do Jev 0,90.',
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '30539-1', reason: 'presença: vale para laudo que imprime só negativo ou positivo' },
      { loinc: '14278-6', reason: 'imunofluorescência declarada, que o laudo não imprime' },
    ],
  },
  pH_Urine: nameOnly('5803-2'),
  PhaseAngle: {
    loinc: '107160-4',
    evidence: ['name'],
    settledBy: 'name',
    siblingsRejected: [],
    note: 'Único código de ângulo de fase; declara razão e o aparelho imprime graus.',
  },
  Phosphorus: {
    loinc: '2777-1',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [{ loinc: '14879-1', reason: 'mmol/L, molar; o laudo imprime mg/dL' }],
  },
  Platelets: nameOnly('777-3'),
  Potassium: nameOnly('2823-3'),
  Progesterone: nameOnly('2839-9'),
  Prolactin: nameOnly('2842-3'),
  Protein_Urine: {
    loinc: '20454-5',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      {
        loinc: '5804-0',
        reason: 'o mesmo exame em mg/dL, e o EAS imprime Negativo, Traços ou cruzes (PrThr)',
      },
    ],
  },
  ProteinCreatinineRatio_Urine: {
    loinc: '2890-2',
    evidence: ['name', 'unit'],
    settledBy: 'unit',
    siblingsRejected: [
      { loinc: '34366-5', reason: 'g/mmol, outra grandeza' },
      { loinc: '13801-6', reason: 'urina de 24 horas' },
    ],
  },
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
  T3Total: {
    evidence: ['name', 'unit'],
    loinc: '3053-6',
    note: 'T3 total em massa/volume; o livre é o 3051-0. Pedido no fhir-brasil#132.',
    settledBy: 'name',
    siblingsRejected: [],
  },
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
  Transferrin: nameOnly('3034-6'),
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
  VitaminD2: nameOnly('49054-0'),
  VitaminD3: nameOnly('1989-3'),
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

/** Buscas oficiais de 09/10/2026 (LOINC 2.83): docs/development/loinc-gaps-2026-10-09.json. */
export const NO_LOINC_DECISIONS: Record<string, NoLoincDecision> = {
  AndroidFatPct: {
    reason: 'no-concept',
    note: 'Nenhum resultado regional androide/ginoide encontrado; 41982-0 é percentual corporal total.',
  },
  AndroidGynoidRatio: {
    reason: 'no-concept',
    note: 'Nenhum resultado regional androide/ginoide encontrado; 41982-0 é percentual corporal total.',
  },
  AorticValveCalcium: {
    reason: 'no-concept',
    note: '89927-8 é um exame de coração/raiz aórtica (Doc), não o escore numérico da valva aórtica.',
  },
  ArmsFatMass: {
    reason: 'no-concept',
    note: 'Nenhuma massa de gordura regional encontrada; 73708-0 é gordura corporal total.',
  },
  ArmsLeanMass: {
    reason: 'no-concept',
    note: 'Nenhuma massa de tecido magro regional encontrada; 91557-9 é peso magro corporal total.',
  },
  BasalMetabolicRate: {
    reason: 'ambiguous',
    note: '50042-1 é índice; 69429-9, 82278-3 e 82286-6 descrevem metabolismo de repouso. TMB estimada exige confirmar protocolo e fórmula.',
  },
  BMC: {
    reason: 'ambiguous',
    note: 'O laudo DXA define BMC como conteúdo mineral ósseo separado do tecido magro. 101685-6 não esclarece se Body bone mass inclui matriz orgânica; 101686-4 é percentual por BIA.',
  },
  CAC: {
    reason: 'no-concept',
    note: '79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.',
  },
  CAC_LAD: {
    reason: 'no-concept',
    note: '79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.',
  },
  CAC_LCX: {
    reason: 'no-concept',
    note: '79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.',
  },
  CAC_LMA: {
    reason: 'no-concept',
    note: '79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.',
  },
  CAC_Percentile: {
    reason: 'no-concept',
    note: 'Nenhum percentil de Agatston encontrado; o código do exame 79087-3 não representa um percentil.',
  },
  CAC_RCA: {
    reason: 'no-concept',
    note: '79087-3 e 83289-9 descrevem o exame (escala Doc), não o resultado numérico de Agatston.',
  },
  ConicityIndex: {
    reason: 'no-concept',
    note: 'Nenhum índice de conicidade encontrado nas buscas registradas.',
  },
  ECWToTBWRatio: {
    reason: 'no-concept',
    note: 'Sem razão ECW/TBW encontrada; 101684-9 é percentual de água no corpo, com outro denominador.',
  },
  ExtracellularWater: {
    reason: 'ambiguous',
    note: '73706-4 existe como volume de fluido extracelular, método Measured. A entrada genérica não declara medição versus estimativa por BIA.',
  },
  GynoidFatPct: {
    reason: 'no-concept',
    note: 'Nenhum resultado regional androide/ginoide encontrado; 41982-0 é percentual corporal total.',
  },
  IntracellularWater: {
    reason: 'ambiguous',
    note: '73705-6 estima fluido intracelular por água total menos extracelular. Falta confirmar esse método na entrada genérica.',
  },
  LeanMass: {
    reason: 'no-concept',
    note: 'O laudo DXA GE Lunar Prodigy confirma tecido magro separado de BMC. 91557-9 e 88334-8 incluem esse mineral no peso sem gordura; 73964-9 mede massa muscular. Nenhum equivalente de tecido magro sem BMC encontrado nas buscas registradas.',
  },
  LegsFatMass: {
    reason: 'no-concept',
    note: 'Nenhuma massa de gordura regional encontrada; 73708-0 é gordura corporal total.',
  },
  LegsLeanMass: {
    reason: 'no-concept',
    note: 'Nenhuma massa de tecido magro regional encontrada; 91557-9 é peso magro corporal total.',
  },
  MuscleMassIndex: {
    reason: 'no-concept',
    note: 'Os candidatos medem massa muscular ou sua fração do peso; não massa por altura ao quadrado.',
  },
  ResidualMass: {
    reason: 'no-concept',
    note: 'Nenhuma massa residual antropométrica encontrada nas buscas registradas.',
  },
  SkinfoldChest: {
    reason: 'no-concept',
    note: 'Só foram encontradas dobras de coxa, tríceps e cintura; nenhum termo do sítio anatômico desta entrada.',
  },
  SkinfoldMidaxillary: {
    reason: 'no-concept',
    note: 'Só foram encontradas dobras de coxa, tríceps e cintura; nenhum termo do sítio anatômico desta entrada.',
  },
  SkinfoldSubscapular: {
    reason: 'no-concept',
    note: 'Só foram encontradas dobras de coxa, tríceps e cintura; nenhum termo do sítio anatômico desta entrada.',
  },
  SkinfoldSuprailiac: {
    reason: 'no-concept',
    note: 'Só foram encontradas dobras de coxa, tríceps e cintura; nenhum termo do sítio anatômico desta entrada.',
  },
  TrunkFatMass: {
    reason: 'no-concept',
    note: 'Nenhuma massa de gordura regional encontrada; 73708-0 é gordura corporal total.',
  },
  TrunkLeanMass: {
    reason: 'no-concept',
    note: 'Nenhuma massa de tecido magro regional encontrada; 91557-9 é peso magro corporal total.',
  },
  TScore_Total: {
    reason: 'no-concept',
    note: 'Os T-scores encontrados são por sítio (fêmur, quadril ou coluna), não corpo inteiro.',
  },
  VATMass: {
    reason: 'no-concept',
    note: '73707-2 mede área de gordura visceral; não equivale a massa, volume ou índice do aparelho.',
  },
  VATVolume: {
    reason: 'no-concept',
    note: '73707-2 mede área de gordura visceral; não equivale a massa, volume ou índice do aparelho.',
  },
  VisceralFatLevel: {
    reason: 'no-concept',
    note: '73707-2 mede área de gordura visceral; não equivale a massa, volume ou índice do aparelho.',
  },
  WaistToHeightRatio: {
    reason: 'no-concept',
    note: 'Nenhuma razão cintura/altura encontrada; 8280-0 mede só a circunferência da cintura.',
  },
  ZScore_Total: {
    reason: 'no-concept',
    note: 'Os Z-scores encontrados são por sítio (fêmur, quadril ou coluna lombar), não corpo inteiro.',
  },
};

export function getMappingDecision(code: string): MappingDecision | undefined {
  return MAPPING_DECISIONS[code];
}

export function getNoLoincDecision(code: string): NoLoincDecision | undefined {
  return NO_LOINC_DECISIONS[code];
}
