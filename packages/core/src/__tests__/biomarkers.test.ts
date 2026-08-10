import { describe, expect, it } from 'vitest';

import {
  BIOMARKER_DEFINITIONS,
  CAC_INDICATOR_CODES,
  codeToLoinc,
  findCodeByName,
  generateCacFullReference,
  generateLLMReference,
  getAllCodes,
  getAllDefinitions,
  getAllLoincCodes,
  getDefinitionByCode,
  getDefinitionByLoinc,
  getDefinitionsBySex,
  getSexForCode,
  isCacDocument,
  isValidCode,
  isValidLoinc,
  loincToCode,
  normalizeCode,
  toBiomarkerTests,
} from '../biomarkers';

describe('BIOMARKER_DEFINITIONS', () => {
  it('should contain biomarker definitions', () => {
    expect(BIOMARKER_DEFINITIONS.length).toBeGreaterThan(100);
  });

  it('should have required fields for all definitions', () => {
    for (const def of BIOMARKER_DEFINITIONS) {
      expect(def.code).toBeDefined();
      // loinc is optional for some DEXA regional biomarkers
      expect(def.category).toBeDefined();
      expect(def.names.en).toBeDefined();
      expect(def.names.pt).toBeDefined();
      expect(def.names.en.length).toBeGreaterThan(0);
      expect(def.names.pt.length).toBeGreaterThan(0);
    }
  });

  it('should have unique LOINC codes (for biomarkers that have them)', () => {
    const loincCodes = BIOMARKER_DEFINITIONS.filter((d) => d.loinc).map((d) => d.loinc);
    const uniqueCodes = new Set(loincCodes);
    expect(uniqueCodes.size).toBe(loincCodes.length);
  });

  // Todo código LOINC termina em dígito verificador Mod 10 ("double-add-double").
  // Conferir isso pega erro de digitação **sem rede e sem credencial**, em todo PR
  // — enquanto o `pnpm loinc:check` contra o servidor oficial é mensal e precisa
  // de conta.
  //
  // Não é hipotético: a primeira execução real do verificador encontrou três
  // códigos inválidos publicados (C3 `4485-3`, C4 `4498-6`, Selênio `5697-7`), e
  // os três falham exatamente neste teste. Teriam sido pegos na entrada.
  it('should have a valid Mod 10 check digit on every LOINC code', () => {
    const digitoEsperado = (numero: string): string => {
      let soma = 0;
      [...numero].reverse().forEach((ch, i) => {
        let d = Number(ch);
        if (i % 2 === 0) {
          d *= 2;
          if (d > 9) d -= 9;
        }
        soma += d;
      });
      return String((10 - (soma % 10)) % 10);
    };

    const invalidos = BIOMARKER_DEFINITIONS.filter((d) => d.loinc)
      .map((d) => {
        const loinc = String(d.loinc);
        const [numero, digito] = loinc.split('-');
        if (!numero || !digito || !/^\d+$/.test(numero) || !/^\d$/.test(digito)) {
          return `${d.code} -> forma inválida: ${loinc}`;
        }
        const esperado = digitoEsperado(numero);
        return esperado === digito
          ? null
          : `${d.code} -> ${loinc} (dígito verificador deveria ser ${esperado})`;
      })
      .filter((x): x is string => x !== null);

    expect(invalidos).toEqual([]);
  });

  it('should have unique internal codes', () => {
    const codes = BIOMARKER_DEFINITIONS.map((d) => d.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });
});

describe('loincToCode', () => {
  it('should convert valid LOINC to internal code', () => {
    expect(loincToCode('2085-9')).toBe('HDL');
    expect(loincToCode('2093-3')).toBe('Cholesterol');
    expect(loincToCode('3016-3')).toBe('TSH');
  });

  it('should return undefined for invalid LOINC', () => {
    expect(loincToCode('invalid')).toBeUndefined();
    expect(loincToCode('99999-9')).toBeUndefined();
  });

  it('should handle LOINC aliases', () => {
    const defWithAlias = BIOMARKER_DEFINITIONS.find((d) => d.loincAliases?.length);
    if (defWithAlias && defWithAlias.loincAliases) {
      const alias = defWithAlias.loincAliases[0];
      expect(loincToCode(alias!)).toBe(defWithAlias.code);
    }
  });
});

describe('codeToLoinc', () => {
  it('should convert internal code to LOINC', () => {
    expect(codeToLoinc('HDL')).toBe('2085-9');
    expect(codeToLoinc('Cholesterol')).toBe('2093-3');
    expect(codeToLoinc('TSH')).toBe('3016-3');
  });

  it('should return undefined for invalid code', () => {
    expect(codeToLoinc('InvalidCode')).toBeUndefined();
    expect(codeToLoinc('')).toBeUndefined();
  });

  it('should return undefined for code aliases (only canonical codes)', () => {
    // Code aliases should NOT be in codeToLoincMap
    const defWithAlias = BIOMARKER_DEFINITIONS.find((d) => d.codeAliases?.length);
    if (defWithAlias && defWithAlias.codeAliases) {
      const alias = defWithAlias.codeAliases[0];
      expect(codeToLoinc(alias!)).toBeUndefined();
    }
  });
});

describe('isValidLoinc', () => {
  it('should return true for valid LOINC codes', () => {
    expect(isValidLoinc('2085-9')).toBe(true);
    expect(isValidLoinc('2093-3')).toBe(true);
    expect(isValidLoinc('3016-3')).toBe(true);
  });

  it('should return false for invalid LOINC codes', () => {
    expect(isValidLoinc('invalid')).toBe(false);
    expect(isValidLoinc('99999-9')).toBe(false);
    expect(isValidLoinc('')).toBe(false);
  });

  it('should return true for LOINC aliases', () => {
    const defWithAlias = BIOMARKER_DEFINITIONS.find((d) => d.loincAliases?.length);
    if (defWithAlias && defWithAlias.loincAliases) {
      expect(isValidLoinc(defWithAlias.loincAliases[0]!)).toBe(true);
    }
  });
});

describe('isValidCode', () => {
  it('should return true for valid internal codes', () => {
    expect(isValidCode('HDL')).toBe(true);
    expect(isValidCode('Cholesterol')).toBe(true);
    expect(isValidCode('TSH')).toBe(true);
  });

  it('should return false for invalid codes', () => {
    expect(isValidCode('InvalidCode')).toBe(false);
    expect(isValidCode('')).toBe(false);
  });

  it('should return true for code aliases', () => {
    const defWithAlias = BIOMARKER_DEFINITIONS.find((d) => d.codeAliases?.length);
    if (defWithAlias && defWithAlias.codeAliases) {
      expect(isValidCode(defWithAlias.codeAliases[0]!)).toBe(true);
    }
  });
});

describe('normalizeCode', () => {
  it('should return canonical code for aliases', () => {
    expect(normalizeCode('CholHDL_Ratio')).toBe('Cholesterol_HDL_Ratio');
    expect(normalizeCode('AG_Ratio')).toBe('Albumin_Globulin_Ratio');
    expect(normalizeCode('LDL_Particle_Number')).toBe('LDL_ParticleNumber');
  });

  it('should return same code for canonical codes', () => {
    expect(normalizeCode('HDL')).toBe('HDL');
    expect(normalizeCode('Cholesterol')).toBe('Cholesterol');
    expect(normalizeCode('TSH')).toBe('TSH');
  });

  it('should return input unchanged for invalid codes', () => {
    expect(normalizeCode('InvalidCode')).toBe('InvalidCode');
    expect(normalizeCode('')).toBe('');
  });
});

describe('getSexForCode', () => {
  it('should return male for male-specific biomarkers', () => {
    expect(getSexForCode('PSA')).toBe('male');
    expect(getSexForCode('PSA_Free')).toBe('male');
  });

  it('should return female for female-specific biomarkers', () => {
    expect(getSexForCode('AMH')).toBe('female');
    expect(getSexForCode('Progesterone')).toBe('female');
  });

  it('should return both for general biomarkers', () => {
    expect(getSexForCode('HDL')).toBe('both');
    expect(getSexForCode('Cholesterol')).toBe('both');
    expect(getSexForCode('TSH')).toBe('both');
  });

  it('should return both for invalid codes', () => {
    expect(getSexForCode('InvalidCode')).toBe('both');
  });
});

describe('getDefinitionsBySex', () => {
  it('should return all definitions for both', () => {
    const all = getDefinitionsBySex('both');
    expect(all).toEqual(BIOMARKER_DEFINITIONS);
  });

  it('should filter male-only biomarkers for female', () => {
    const female = getDefinitionsBySex('female');
    const hasPSA = female.some((d) => d.code === 'PSA');
    expect(hasPSA).toBe(false);
  });

  it('should filter female-only biomarkers for male', () => {
    const male = getDefinitionsBySex('male');
    const hasAMH = male.some((d) => d.code === 'AMH');
    expect(hasAMH).toBe(false);
  });

  it('should include general biomarkers for both sexes', () => {
    const male = getDefinitionsBySex('male');
    const female = getDefinitionsBySex('female');

    expect(male.some((d) => d.code === 'HDL')).toBe(true);
    expect(female.some((d) => d.code === 'HDL')).toBe(true);
  });
});

describe('getDefinitionByCode', () => {
  it('should return definition for valid code', () => {
    const def = getDefinitionByCode('HDL');
    expect(def).toBeDefined();
    expect(def?.loinc).toBe('2085-9');
    expect(def?.category).toBe('coracao');
  });

  it('should return definition for code aliases', () => {
    const def = getDefinitionByCode('CholHDL_Ratio');
    expect(def).toBeDefined();
    expect(def?.code).toBe('Cholesterol_HDL_Ratio');
  });

  it('should return undefined for invalid code', () => {
    expect(getDefinitionByCode('InvalidCode')).toBeUndefined();
  });

  it('Urea usa LOINC 3091-6 (Urea, não BUN/3094-0)', () => {
    // Revisão clínica (issue #41): LOINC 3094-0 é "Urea nitrogen" (BUN).
    // A entrada brasileira deve usar 3091-6 (Urea em mg/dL) para alinhar
    // com a faixa de referência de Ureia (15-50 mg/dL).
    const def = getDefinitionByCode('Urea');
    expect(def?.loinc).toBe('3091-6');
    expect(def?.unit).toBe('mg/dL');
    expect(def?.names.en).not.toContain('BUN');
  });

  it('Lipoprotein_a usa LOINC 43583-4 (nmol/L, não 10835-7 mg/dL)', () => {
    const def = getDefinitionByCode('Lipoprotein_a');
    expect(def?.loinc).toBe('43583-4');
    expect(def?.unit).toBe('nmol/L');
  });

  it('Omega3_Total usa LOINC 99620-7 (RBC, não 35178-3 Ser/Plas)', () => {
    // Revisão clínica (issue #41): Índice Ômega-3 (Harris 2004) é medido
    // em hemácias; 99620-7 alinha à matriz dos sibling EPA (75097-6) e
    // DHA (75095-0).
    const def = getDefinitionByCode('Omega3_Total');
    expect(def?.loinc).toBe('99620-7');
  });
});

describe('getDefinitionByLoinc', () => {
  it('should return definition for valid LOINC', () => {
    const def = getDefinitionByLoinc('2085-9');
    expect(def).toBeDefined();
    expect(def?.code).toBe('HDL');
    expect(def?.category).toBe('coracao');
  });

  it('should return definition for LOINC aliases', () => {
    const defWithAlias = BIOMARKER_DEFINITIONS.find((d) => d.loincAliases?.length);
    if (defWithAlias && defWithAlias.loincAliases) {
      const def = getDefinitionByLoinc(defWithAlias.loincAliases[0]!);
      expect(def).toBeDefined();
      expect(def?.code).toBe(defWithAlias.code);
    }
  });

  it('should return undefined for invalid LOINC', () => {
    expect(getDefinitionByLoinc('99999-9')).toBeUndefined();
  });
});

describe('getAllDefinitions', () => {
  it('should return all biomarker definitions', () => {
    const all = getAllDefinitions();
    expect(all).toBe(BIOMARKER_DEFINITIONS);
    expect(all.length).toBeGreaterThan(100);
  });
});

describe('getAllCodes', () => {
  it('should return all internal codes', () => {
    const codes = getAllCodes();
    expect(codes.length).toBe(BIOMARKER_DEFINITIONS.length);
    expect(codes).toContain('HDL');
    expect(codes).toContain('Cholesterol');
    expect(codes).toContain('TSH');
  });

  it('should NOT include code aliases', () => {
    const codes = getAllCodes();
    expect(codes).not.toContain('CholHDL_Ratio');
  });
});

describe('getAllLoincCodes', () => {
  it('should return all LOINC codes including aliases', () => {
    const loincCodes = getAllLoincCodes();
    // Count biomarkers with LOINC codes
    const biomarkersWithLoinc = BIOMARKER_DEFINITIONS.filter((d) => d.loinc).length;
    expect(loincCodes.length).toBeGreaterThanOrEqual(biomarkersWithLoinc);
    expect(loincCodes).toContain('2085-9');
    expect(loincCodes).toContain('2093-3');
    expect(loincCodes).toContain('3016-3');
  });
});

describe('generateLLMReference', () => {
  it('should generate a non-empty reference string', () => {
    const reference = generateLLMReference();
    expect(reference.length).toBeGreaterThan(0);
  });

  it('should include category headers', () => {
    const reference = generateLLMReference();
    expect(reference).toContain('[CORACAO]');
    expect(reference).toContain('[TIREOIDE]');
    expect(reference).toContain('[METABOLICO]');
  });

  it('should include LOINC codes', () => {
    const reference = generateLLMReference();
    expect(reference).toContain('LOINC: 2085-9');
    expect(reference).toContain('LOINC: 3016-3');
  });

  it('should include Portuguese and English names', () => {
    const reference = generateLLMReference();
    expect(reference).toContain('PT:');
    expect(reference).toContain('EN:');
    expect(reference).toContain('HDL');
    expect(reference).toContain('Colesterol');
  });
});

describe('toBiomarkerTests', () => {
  it('should return biomarker tests grouped by category', () => {
    const tests = toBiomarkerTests();
    expect(Object.keys(tests).length).toBeGreaterThan(0);
    expect(tests.coracao).toBeDefined();
    expect(tests.tireoide).toBeDefined();
  });

  it('should have pt, en, and code for each test', () => {
    const tests = toBiomarkerTests();
    for (const category of Object.keys(tests)) {
      const categoryTests = tests[category];
      expect(categoryTests).toBeDefined();
      for (const test of categoryTests!) {
        expect(test.pt).toBeDefined();
        expect(test.en).toBeDefined();
        expect(test.code).toBeDefined();
      }
    }
  });

  it('should include HDL in coracao category', () => {
    const tests = toBiomarkerTests();
    const hdl = tests.coracao?.find((t) => t.code === 'HDL');
    expect(hdl).toBeDefined();
    expect(hdl?.en).toContain('HDL');
    expect(hdl?.pt).toContain('HDL');
  });
});

describe('findCodeByName', () => {
  it('should find code by English name', () => {
    expect(findCodeByName('Hemoglobin')).toBe('Hgb');
  });

  it('should find code by Portuguese name', () => {
    expect(findCodeByName('Hemoglobina')).toBe('Hgb');
  });

  it('should resolve code-like names that are valid biomarker codes', () => {
    expect(findCodeByName('Omega3_DHA')).toBe('Omega3_DHA');
  });

  it('should resolve hyphenated names like LDL-Cholesterol', () => {
    expect(findCodeByName('LDL-Cholesterol')).toBe('LDL');
  });

  it('should return undefined for unknown names', () => {
    expect(findCodeByName('CompletelyFakeTestXYZ')).toBeUndefined();
  });
});

describe('CAC (Coronary Artery Calcium) support', () => {
  it('should have CAC biomarker definitions in coracao category', () => {
    const cacDefs = BIOMARKER_DEFINITIONS.filter(
      (d) => d.code === 'CAC' || d.code.startsWith('CAC_') || d.code === 'AorticValveCalcium',
    );
    expect(cacDefs.length).toBe(7);
    for (const def of cacDefs) {
      expect(def.category).toBe('coracao');
      expect(def.unit).toBeDefined();
    }
  });

  it('should have CAC_Percentile as visible and CAC + per-vessel scores as hidden', () => {
    const cacPercentile = BIOMARKER_DEFINITIONS.find((d) => d.code === 'CAC_Percentile');
    expect(cacPercentile).toBeDefined();
    expect(cacPercentile!.hidden).toBeUndefined();

    const hiddenCodes = ['CAC', 'CAC_LMA', 'CAC_LAD', 'CAC_LCX', 'CAC_RCA', 'AorticValveCalcium'];
    for (const code of hiddenCodes) {
      const def = BIOMARKER_DEFINITIONS.find((d) => d.code === code);
      expect(def).toBeDefined();
      expect(def!.hidden).toBe(true);
    }
  });

  it('isCacDocument should detect CAC indicator codes', () => {
    expect(isCacDocument(['CAC', 'HDL'])).toBe(true);
    expect(isCacDocument(['CAC_LAD'])).toBe(true);
    expect(isCacDocument(['CAC_Percentile'])).toBe(true);
    expect(isCacDocument(['HDL', 'LDL'])).toBe(false);
    expect(isCacDocument([])).toBe(false);
  });

  it('generateCacFullReference should include all CAC codes', () => {
    const ref = generateCacFullReference();
    expect(ref).toContain('CAC');
    expect(ref).toContain('CAC_LAD');
    expect(ref).toContain('CAC_LCX');
    expect(ref).toContain('CAC_RCA');
    expect(ref).toContain('CAC_LMA');
    expect(ref).toContain('CAC_Percentile');
    expect(ref).toContain('AorticValveCalcium');
    // Should NOT include unrelated biomarkers
    expect(ref).not.toContain('HDL');
    expect(ref).not.toContain('BodyFatPct');
  });

  it('CAC_INDICATOR_CODES should contain expected codes', () => {
    expect(CAC_INDICATOR_CODES).toContain('CAC');
    expect(CAC_INDICATOR_CODES).toContain('CAC_LAD');
    expect(CAC_INDICATOR_CODES).toContain('CAC_LCX');
    expect(CAC_INDICATOR_CODES).toContain('CAC_RCA');
    expect(CAC_INDICATOR_CODES).toContain('CAC_Percentile');
  });
});

describe('alias matching fixes', () => {
  it('should resolve eGFR code aliases', () => {
    expect(normalizeCode('CKDEPI_2021')).toBe('eGFR');
    expect(normalizeCode('eGFR_CKDEPI_2021')).toBe('eGFR');
    expect(normalizeCode('eGFR_MDRD')).toBe('eGFR');
    expect(isValidCode('CKDEPI_eGFR_2021')).toBe(true);
  });

  it('should resolve TransferrinSaturation code alias', () => {
    expect(normalizeCode('Saturation_of_Transferrin')).toBe('TransferrinSaturation');
    expect(isValidCode('Saturation_of_Transferrin')).toBe(true);
  });

  it('should resolve Microalbumin_Urine code alias', () => {
    expect(normalizeCode('Urine_Microalbumin')).toBe('Microalbumin_Urine');
    expect(isValidCode('Urine_Microalbumin')).toBe(true);
  });
});

describe('new biomarker definitions', () => {
  const newBiomarkers = [
    { code: 'ESR', category: 'sangue', loinc: '30341-2' },
    { code: 'AFP', category: 'marcadores-tumorais', loinc: '1834-1' },
    { code: 'CA125', category: 'marcadores-tumorais', loinc: '10334-1' },
    { code: 'CEA', category: 'marcadores-tumorais', loinc: '2039-6' },
    { code: 'ApoA1', category: 'coracao', loinc: '1869-7' },
    { code: 'Reticulocytes', category: 'sangue', loinc: '4679-7' },
    { code: 'Urobilinogen_Urine', category: 'urina', loinc: '20405-7' },
    { code: 'BilirubinDirect', category: 'figado', loinc: '1968-7' },
    { code: 'BilirubinIndirect', category: 'figado', loinc: '1971-1' },
    { code: 'T4Total', category: 'tireoide', loinc: '3026-2' },
    { code: 'CK', category: 'metabolico', loinc: '2157-6' },
  ];

  it.each(newBiomarkers)('should have definition for $code', ({ code, category, loinc }) => {
    const def = getDefinitionByCode(code);
    expect(def).toBeDefined();
    expect(def?.loinc).toBe(loinc);
    const categories = Array.isArray(def?.category) ? def?.category : [def?.category];
    expect(categories).toContain(category);
  });

  it('should resolve new code aliases', () => {
    expect(normalizeCode('Apolipoprotein_A1')).toBe('ApoA1');
    expect(normalizeCode('AlfaFetoproteina')).toBe('AFP');
    expect(normalizeCode('Alfa_Fetoprotena')).toBe('AFP');
    expect(normalizeCode('CA_125')).toBe('CA125');
    expect(normalizeCode('Carcinoembryonic_Antigen_CEA_Serum')).toBe('CEA');
    expect(normalizeCode('Reticulocyte_Count')).toBe('Reticulocytes');
    expect(normalizeCode('Urine_Urobilinogen')).toBe('Urobilinogen_Urine');
    expect(normalizeCode('Bilirubin_Direct')).toBe('BilirubinDirect');
    expect(normalizeCode('Bilirubin_Indirect')).toBe('BilirubinIndirect');
    expect(normalizeCode('Tiroxina_T4')).toBe('T4Total');
    expect(normalizeCode('Creatine_Kinase')).toBe('CK');
    expect(normalizeCode('CK_Total')).toBe('CK');
  });

  it('should resolve LOINC codes for new definitions', () => {
    expect(loincToCode('30341-2')).toBe('ESR');
    expect(loincToCode('1834-1')).toBe('AFP');
    expect(loincToCode('10334-1')).toBe('CA125');
    expect(loincToCode('2039-6')).toBe('CEA');
    expect(loincToCode('1869-7')).toBe('ApoA1');
    expect(loincToCode('4679-7')).toBe('Reticulocytes');
    expect(loincToCode('20405-7')).toBe('Urobilinogen_Urine');
    expect(loincToCode('1968-7')).toBe('BilirubinDirect');
    expect(loincToCode('1971-1')).toBe('BilirubinIndirect');
    expect(loincToCode('3026-2')).toBe('T4Total');
    expect(loincToCode('2157-6')).toBe('CK');
  });

  it('CA125 should be female-specific', () => {
    expect(getSexForCode('CA125')).toBe('female');
  });

  it('should find new biomarkers by name', () => {
    expect(findCodeByName('Erythrocyte Sedimentation Rate')).toBe('ESR');
    expect(findCodeByName('Alpha-Fetoprotein')).toBe('AFP');
    expect(findCodeByName('Creatine Kinase')).toBe('CK');
    expect(findCodeByName('Bilirrubina Direta')).toBe('BilirubinDirect');
    expect(findCodeByName('Velocidade de Hemossedimentação')).toBe('ESR');
  });

  it('tumor markers category should appear in LLM reference', () => {
    const reference = generateLLMReference();
    expect(reference).toContain('[MARCADORES-TUMORAIS]');
    expect(reference).toContain('AFP');
    expect(reference).toContain('CA125');
    expect(reference).toContain('CEA');
  });
});
