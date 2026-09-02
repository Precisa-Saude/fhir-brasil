import { describe, expect, it } from 'vitest';

import {
  CONFIDENCE_AMBIGUOUS,
  CONFIDENCE_NAME_ONLY,
  CONFIDENCE_VALUE_ADJACENT,
  findBiomarkersInText,
  getMatchedCodes,
} from '../anchor';

/** Trecho do laudo de painel genético reportado na issue #59. */
const GENETIC_PANEL_TEXT = `Specimen type: Blood
APOB      NM_000384.2   Familial Hypercholesterolemia
APC       NM_000038.5   Colorectal, Endocrine, Gastric Cancer
This sequence change creates a premature translational stop signal
(p.Trp448*) in the BRIP1 gene. It is expected to result in an absent
or disrupted protein product.`;

describe('findBiomarkersInText', () => {
  it('should find exact English biomarker names', () => {
    const ocrText = 'HDL Cholesterol 55 mg/dL';
    const result = findBiomarkersInText(ocrText);
    expect(result.matches.some((m) => m.code === 'HDL')).toBe(true);
    expect(result.stats.matchedCount).toBeGreaterThan(0);
  });

  it('should find exact Portuguese biomarker names', () => {
    const result = findBiomarkersInText('Hemoglobina 13.2 g/dL');
    expect(result.matches.some((m) => m.code === 'Hgb')).toBe(true);
  });

  it('should find biomarkers with Portuguese diacritics', () => {
    const result = findBiomarkersInText('Colesterol Total 180 mg/dL\nTriglicerídeos 150 mg/dL');
    expect(result.matches.some((m) => m.code === 'Cholesterol')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Triglycerides')).toBe(true);
  });

  it('should handle case insensitivity', () => {
    const result = findBiomarkersInText('GLICOSE 95 mg/dL');
    expect(result.matches.some((m) => m.code === 'Glucose')).toBe(true);
  });

  it('should NOT match biomarkers not in text', () => {
    const result = findBiomarkersInText('Hemoglobina 13.2 g/dL');
    expect(result.matches.some((m) => m.code === 'HDL')).toBe(false);
    expect(result.matches.some((m) => m.code === 'LDL')).toBe(false);
  });

  it('should find multiple biomarkers in a typical lab report', () => {
    const ocrText = `
      RESULTADO DE EXAMES
      Hemoglobina: 14.2 g/dL
      Hematócrito: 42%
      Glicose: 95 mg/dL
      Creatinina: 0.9 mg/dL
      TSH: 2.45 mUI/L
    `;
    const result = findBiomarkersInText(ocrText);
    expect(result.matches.some((m) => m.code === 'Hgb')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Hct')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Glucose')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Creatinine')).toBe(true);
    expect(result.matches.some((m) => m.code === 'TSH')).toBe(true);
    expect(result.stats.matchedCount).toBeGreaterThanOrEqual(5);
  });

  it('should find common abbreviations', () => {
    const result = findBiomarkersInText('HDL 55\nLDL 120\nTSH 2.5\nPCR 0.5');
    expect(result.matches.some((m) => m.code === 'HDL')).toBe(true);
    expect(result.matches.some((m) => m.code === 'LDL')).toBe(true);
    expect(result.matches.some((m) => m.code === 'TSH')).toBe(true);
    expect(result.matches.some((m) => m.code === 'CRP')).toBe(true);
  });

  it('should return empty matches for non-medical text', () => {
    const result = findBiomarkersInText(
      'This is a resume for John Doe. Skills: Python, JavaScript.',
    );
    expect(result.matches.length).toBe(0);
  });

  it('should generate filtered reference only for matched biomarkers', () => {
    const result = findBiomarkersInText('Hemoglobina 14.2 g/dL\nGlicose 95 mg/dL');
    expect(result.filteredReference).toContain('Hgb');
    expect(result.filteredReference).toContain('Glucose');
    expect(result.filteredReference).not.toContain('Cholesterol');
  });

  it('should return NO MATCHING message when no biomarkers found', () => {
    const result = findBiomarkersInText('This document contains no biomarkers');
    expect(result.filteredReference).toContain('NO MATCHING BIOMARKERS');
  });

  it('should not duplicate biomarkers when multiple aliases match', () => {
    const result = findBiomarkersInText('HDL Cholesterol HDL-Colesterol');
    const hdlMatches = result.matches.filter((m) => m.code === 'HDL');
    expect(hdlMatches.length).toBe(1);
  });

  it('should handle OCR text with extra whitespace', () => {
    const result = findBiomarkersInText('Hemoglobina      14.2      g/dL');
    expect(result.matches.some((m) => m.code === 'Hgb')).toBe(true);
  });

  it('should include position of match in result', () => {
    const result = findBiomarkersInText('Hemoglobina 14.2 g/dL');
    const match = result.matches.find((m) => m.code === 'Hgb');
    expect(match?.position).toBeGreaterThanOrEqual(0);
  });

  it('should anchor plural forms printed by labs', () => {
    const result = findBiomarkersInText('Proteínas: Ausente\nCetonas: Negativo');
    expect(result.matches.some((m) => m.code === 'Protein_Urine')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Ketones_Urine')).toBe(true);
  });
});

describe('findBiomarkersInText — falsos positivos (issue #59)', () => {
  it('should return zero anchors for a genetic panel report', () => {
    const result = findBiomarkersInText(GENETIC_PANEL_TEXT);
    expect(result.matches).toEqual([]);
    expect(result.stats.matchedCount).toBe(0);
    expect(result.filteredReference).toContain('NO MATCHING BIOMARKERS');
  });

  it('should require a token boundary instead of matching inside a word', () => {
    // Linhas com número e sem marcador genético: o único mecanismo capaz de
    // barrar a âncora aqui é a fronteira de token.
    const condition = findBiomarkersInText('Hipercolesterolemia familiar: risco 12 pontos');
    expect(condition.matches.some((m) => m.code === 'Cholesterol')).toBe(false);

    const cancer = findBiomarkersInText('Colorectal cancer screening: 3 exames solicitados');
    expect(cancer.matches.some((m) => m.code === 'Color_Urine')).toBe(false);
  });

  it('should not anchor generic names without a value on the line', () => {
    const specimen = findBiomarkersInText('Specimen type: Blood');
    expect(specimen.matches.some((m) => m.code === 'Blood_Urine')).toBe(false);

    const prose = findBiomarkersInText('It is expected to result in a disrupted protein product');
    expect(prose.matches.some((m) => m.code === 'Protein_Urine')).toBe(false);
  });

  it('should still anchor qualitative urine markers next to their result', () => {
    const result = findBiomarkersInText(
      'Cor: Amarelo Citrino\nProteínas: Ausente\nSangue Oculto: Negativo',
    );
    expect(result.matches.some((m) => m.code === 'Color_Urine')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Protein_Urine')).toBe(true);
    expect(result.matches.some((m) => m.code === 'Blood_Urine')).toBe(true);
  });

  it('should suppress a gene symbol that collides with a biomarker name', () => {
    const genetic = findBiomarkersInText('APOB   NM_000384.2   Familial Hypercholesterolemia');
    expect(genetic.matches.some((m) => m.code === 'ApoB')).toBe(false);

    const lipids = findBiomarkersInText('Apolipoproteína B: 85 mg/dL');
    expect(lipids.matches.some((m) => m.code === 'ApoB')).toBe(true);

    // O token que colide com o símbolo do gene é justamente a abreviação:
    // fora de contexto genético ela precisa continuar ancorando.
    const abbreviated = findBiomarkersInText('ApoB: 85 mg/dL');
    expect(abbreviated.matches.some((m) => m.code === 'ApoB')).toBe(true);
  });

  it('should suppress matches inside HGVS and dbSNP notation', () => {
    const hgvs = findBiomarkersInText('Blood 2 variants: c.1234A>G and rs4149056 detected');
    expect(hgvs.matches.some((m) => m.code === 'Blood_Urine')).toBe(false);
  });

  it('should let the longest name win when matches overlap', () => {
    const hdl = findBiomarkersInText('HDL Cholesterol 55 mg/dL');
    expect(hdl.matches.some((m) => m.code === 'HDL')).toBe(true);
    expect(hdl.matches.some((m) => m.code === 'Cholesterol')).toBe(false);

    const bloodGlucose = findBiomarkersInText('Blood Glucose 95 mg/dL');
    expect(bloodGlucose.matches.some((m) => m.code === 'Glucose')).toBe(true);
    expect(bloodGlucose.matches.some((m) => m.code === 'Blood_Urine')).toBe(false);

    const total = findBiomarkersInText('Colesterol Total: 195 mg/dL');
    expect(total.matches.some((m) => m.code === 'Cholesterol')).toBe(true);
  });

  it('should not merge two biomarkers listed on consecutive lines into one name', () => {
    const result = findBiomarkersInText('PERFIL LIPÍDICO\nColesterol\nHDL\nLDL');
    expect(getMatchedCodes(result)).toContain('Cholesterol');
    expect(getMatchedCodes(result)).toContain('HDL');
  });

  it('should grade confidence by match quality instead of always reporting 1.0', () => {
    const withValue = findBiomarkersInText('Glicose: 95 mg/dL');
    expect(withValue.matches.find((m) => m.code === 'Glucose')?.confidence).toBe(
      CONFIDENCE_VALUE_ADJACENT,
    );

    const heading = findBiomarkersInText('PERFIL LIPÍDICO\nColesterol\nHDL');
    expect(heading.matches.find((m) => m.code === 'HDL')?.confidence).toBe(CONFIDENCE_NAME_ONLY);

    const qualitative = findBiomarkersInText('Cor: Amarelo Citrino');
    expect(qualitative.matches.find((m) => m.code === 'Color_Urine')?.confidence).toBe(
      CONFIDENCE_AMBIGUOUS,
    );
  });
});

describe('findBiomarkersInText — dobra cutânea versus circunferência', () => {
  const SITIOS = [
    ['Dobra Cutânea Coxa 18,0 mm', 'SkinfoldThigh'],
    ['Thigh Skinfold 18,0 mm', 'SkinfoldThigh'],
    ['Triceps 12,0 mm', 'SkinfoldTriceps'],
    ['Subscapular 15,0 mm', 'SkinfoldSubscapular'],
    ['Suprailiac 20,0 mm', 'SkinfoldSuprailiac'],
    ['MidAxilla 9,0 mm', 'SkinfoldMidaxillary'],
    ['Skin Fold Thickness Thigh 18,0 mm', 'SkinfoldThigh'],
    ['Pregas cutâneas: Coxa 18,0 mm', 'SkinfoldThigh'],
  ] as const;

  it.each(SITIOS)('anchors %s', (linha, code) => {
    const result = findBiomarkersInText(linha);
    expect(result.matches.some((m) => m.code === code)).toBe(true);
  });

  // O termo nu do sítio é substring do nome da circunferência, então sem a
  // guarda de contexto "Circunferência da Coxa" ancorava SkinfoldThigh com
  // confiança máxima: uma medida em cm apontando para um biomarcador em mm.
  const CIRCUNFERENCIAS = [
    'Circunferência da Coxa 55,0 cm',
    'Perímetro da Coxa 55,0 cm',
    'Thigh Circumference 55,0 cm',
    'Chest Circumference 98,0 cm',
    'Calf Circumference 36,0 cm',
  ];

  it.each(CIRCUNFERENCIAS)('does not anchor a skinfold for %s', (linha) => {
    const result = findBiomarkersInText(linha);
    expect(result.matches.filter((m) => m.code.startsWith('Skinfold'))).toEqual([]);
  });

  // Era um limite conhecido: a guarda olha uma linha por vez, então um
  // cabeçalho "CIRCUNFERENCIAS" acima de linhas com só o sítio não as
  // alcançava. A regra da unidade fechou a lacuna sem precisar de contexto
  // entre linhas, porque o valor em cm já diz que não é dobra.
  it('reads the row by its unit even when the heading is on another line', () => {
    const result = findBiomarkersInText('CIRCUNFERENCIAS\nCoxa 55,0 cm');
    expect(result.matches.filter((m) => m.code.startsWith('Skinfold'))).toEqual([]);
  });

  // Formas que o OCR realmente produz: pipe de extração de tabela, pontilhado
  // de sumário, tab, caixa alta, acento perdido. Todas dependem do mesmo
  // `normalize`, então o teste guarda a normalização, não cada variação.
  const RUIDO_DE_OCR: ReadonlyArray<readonly [string, string]> = [
    ['Thigh    Skinfold    18,0 mm', 'SkinfoldThigh'],
    ['Thigh\tSkinfold\t18,0 mm', 'SkinfoldThigh'],
    ['THIGH SKINFOLD 18.0 MM', 'SkinfoldThigh'],
    ['Dobra Cutanea Coxa 18,0 mm', 'SkinfoldThigh'],
    ['Suprailiac  |  20,0  |  mm', 'SkinfoldSuprailiac'],
    ['Triceps.....12,0 mm', 'SkinfoldTriceps'],
  ];

  it.each(RUIDO_DE_OCR)('anchors through OCR noise: %s', (linha, code) => {
    const result = findBiomarkersInText(linha);
    expect(result.matches.some((m) => m.code === code)).toBe(true);
  });

  // A guarda tem que sobreviver ao mesmo ruído, senão bloqueia só a grafia
  // limpa e deixa passar a suja, que é a que vem de PDF.
  const GIRTH_COM_RUIDO = [
    'Thigh Circumference:  55,0 cm',
    'THIGH CIRCUMFERENCE 55.0 CM',
    'Circunferencia da Coxa 55,0 cm',
  ];

  it.each(GIRTH_COM_RUIDO)('holds the guard through OCR noise: %s', (linha) => {
    const result = findBiomarkersInText(linha);
    expect(result.matches.filter((m) => m.code.startsWith('Skinfold'))).toEqual([]);
  });

  // Sítio de dobra pelo nome nu é parte do corpo antes de ser medida. Num
  // laudo de DEXA real, o parágrafo que explica a região ginoide ancorava
  // dobra da coxa, e o documento não mede dobra nenhuma.
  const PROSA = [
    'Gynoid region is that around the hips and thighs and often the body type',
    'increased fat in the abdominal region.',
    'A avaliação do tríceps braquial faz parte do exame físico.',
  ];

  it.each(PROSA)('does not anchor a skinfold in prose: %s', (linha) => {
    const result = findBiomarkersInText(linha);
    expect(result.matches.filter((m) => m.code.startsWith('Skinfold'))).toEqual([]);
  });

  it('does not match the site inside a longer word', () => {
    const result = findBiomarkersInText('Abdominoplastia realizada em 2024');
    expect(result.matches.filter((m) => m.code.startsWith('Skinfold'))).toEqual([]);
  });

  // A unidade desambigua sem depender da palavra "circunferência": dobra é em
  // milímetros, sempre, e num laudo de antropometria a coluna costuma trazer
  // só o sítio e o número.
  const EM_CENTIMETROS = ['Coxa 55,0 cm', 'Tórax 98 cm', 'Braço 32,5 cm'];

  it.each(EM_CENTIMETROS)('does not read a centimetre value as a skinfold: %s', (linha) => {
    const result = findBiomarkersInText(linha);
    expect(result.matches.filter((m) => m.code.startsWith('Skinfold'))).toEqual([]);
  });

  it('still anchors the same site in millimetres', () => {
    expect(
      findBiomarkersInText('Coxa 18,0 mm').matches.some((m) => m.code === 'SkinfoldThigh'),
    ).toBe(true);
  });

  // Limite conhecido, fixado em teste para não virar surpresa: sítio nu com um
  // número qualquer e sem unidade ainda ancora. Ficha de treino e queixa
  // clínica caem aqui. Resolver exigiria a unidade na linha, o que perderia
  // folha que imprime a unidade só no cabeçalho da coluna.
  it('documents that a bare site with a unitless number still anchors', () => {
    const treino = findBiomarkersInText('Triceps 3 series de 12 repeticoes');
    expect(treino.matches.some((m) => m.code === 'SkinfoldTriceps')).toBe(true);
  });

  it('keeps both anchors when a line names the fold and the girth', () => {
    // Ambígua demais para descartar: preserva a dobra em vez de perder o dado.
    const result = findBiomarkersInText('Dobra Cutânea Coxa e Circunferência da Coxa 18,0 mm');
    expect(result.matches.some((m) => m.code === 'SkinfoldThigh')).toBe(true);
  });
});

describe('getMatchedCodes', () => {
  it('should return array of matched biomarker codes', () => {
    const result = findBiomarkersInText('Hemoglobina 14.2\nGlicose 95');
    const codes = getMatchedCodes(result);
    expect(codes).toContain('Hgb');
    expect(codes).toContain('Glucose');
    expect(codes.length).toBe(result.matches.length);
  });
});

describe('hífen entre palavras equivale a espaço', () => {
  const acha = (texto: string, code: string): boolean =>
    findBiomarkersInText(texto).matches.some((m) => m.code === code);

  // O caso que motivou a mudança: o catálogo tem "Gama-Glutamil Transferase",
  // o laudo imprime sem hífen, e o valor era descartado como alucinação.
  it('ancora o nome do catálogo na grafia sem hífen que o laudo usa', () => {
    expect(acha('Gama glutamil transferase 141 U/L', 'GGT')).toBe(true);
    expect(acha('Gama-Glutamil Transferase 141 U/L', 'GGT')).toBe(true);
  });

  it('vale para os outros nomes compostos do catálogo', () => {
    expect(acha('Proteina C Reativa 3.2 mg/L', 'CRP')).toBe(true);
    expect(acha('High Density Lipoprotein 55 mg/dL', 'HDL')).toBe(true);
    expect(acha('Colesterol Non HDL 120 mg/dL', 'NonHDL_Cholesterol')).toBe(true);
    expect(acha('Anti Thyroglobulin Antibody 20 UI/mL', 'AntiThyroglobulin')).toBe(true);
  });

  // A guarda exige letra antes do hífen. Sem ela, o sinal de um valor negativo
  // viraria espaço, que é bem pior que o problema original.
  it('não toca em hífen que faz parte de número', () => {
    expect(acha('T-Score -2.5', 'TScore_Total')).toBe(true);
    expect(acha('Leucocitos 0-5 p/campo', 'WBC')).toBe(true);
    expect(acha('Hemacias 3-5 /campo', 'RBC')).toBe(true);
  });

  // `CA 19-9` é o nome do ensaio, não duas palavras unidas por hífen. Colapsar
  // aqui inventaria uma grafia que não existe.
  it('preserva o hífen entre dígitos do nome de ensaio', () => {
    expect(acha('CA 19-9 12 U/mL', 'CA199')).toBe(true);
    expect(acha('CA 19 9 12 U/mL', 'CA199')).toBe(false);
  });
});
