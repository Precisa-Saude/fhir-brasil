import { getAllSearchPatterns } from '@precisa-saude/fhir';
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

describe('findBiomarkersInText: sinônimo genérico não puxa linha alheia', () => {
  const codesOf = (text: string) => findBiomarkersInText(text).matches.map((m) => m.code);

  it.each(['Volume Urinario: 1500 mL', 'Volume Prostatico: 28 cm3', 'Volume de Ejaculado: 3.0 mL'])(
    'não casa %p com nada',
    (line) => {
      // O `VATVolume` tinha "Volume" solto entre os sinônimos, então qualquer
      // linha com a palavra entrava no pré-scan como gordura visceral. O
      // pré-scan monta a lista de permissão entregue ao modelo, e um candidato
      // errado ali é um convite a preencher o código errado.
      expect(codesOf(line)).toEqual([]);
    },
  );

  it('continua achando o volume corpuscular médio, que é biomarcador de verdade', () => {
    expect(codesOf('Volume Corpuscular Medio: 89 fL')).toContain('MCV');
  });

  it.each([
    ['Volume de Gordura Visceral: 120 cm3', 'VATVolume'],
    ['Visceral Fat Volume: 120 cm3', 'VATVolume'],
    ['Nivel de Gordura Visceral: 9', 'VisceralFatLevel'],
    ['Visceral Fat Level: 9', 'VisceralFatLevel'],
  ])('resolve %p sem ambiguidade para %s', (line, code) => {
    expect(codesOf(line)).toEqual([code]);
  });

  it.each(['Gordura Visceral: 9', 'Visceral Fat: 9'])(
    'oferece os dois candidatos para o termo nu %p',
    (line) => {
      // Sem qualificador não dá para saber se é o índice adimensional do
      // InBody ou o volume em cm³ do DEXA. Entregar os dois deixa o modelo
      // decidir pela unidade e pela ordem de grandeza; escolher um aqui seria
      // acertar metade das vezes em silêncio.
      expect(codesOf(line).sort()).toEqual(['VATVolume', 'VisceralFatLevel']);
    },
  );
});

describe('findBiomarkersInText: nome quebrado em duas linhas', () => {
  const codesOf = (text: string) => findBiomarkersInText(text).matches.map((m) => m.code);

  // Layout real da Quest (valores alterados): o nome do exame quebra na
  // vírgula e o resultado fica na segunda linha. Antes, o pré-scan não via o
  // tTG e ancorava IgA pelo "IGA" solto da segunda linha.
  const QUEST_TTG = 'TISSUE TRANSGLUTAMINASE\nAB, IGA <1.5 U/mL';

  it('ancora o tTG IgA e não a IgA total', () => {
    const result = findBiomarkersInText(QUEST_TTG);
    expect(getMatchedCodes(result)).toEqual(['tTG_IgA']);
    expect(result.matches[0]?.confidence).toBe(CONFIDENCE_VALUE_ADJACENT);
    expect(result.matches[0]?.position).toBe(0);
  });

  it('vale para o tTG IgG no mesmo layout', () => {
    expect(codesOf('TISSUE TRANSGLUTAMINASE\nAB, IGG 2.4 U/mL')).toEqual(['tTG_IgG']);
  });

  it('aceita espaço sobrando em volta da quebra de linha', () => {
    expect(codesOf('  TISSUE TRANSGLUTAMINASE   \n   AB, IGA <1.5 U/mL')).toEqual(['tTG_IgA']);
  });

  it('continua ancorando a IgA total pela linha própria', () => {
    expect(codesOf('IMMUNOGLOBULIN A 352 H 47-310 mg/dL')).toEqual(['IgA']);
    expect(codesOf(`IMMUNOGLOBULIN A 352 H 47-310 mg/dL\n${QUEST_TTG}`).sort()).toEqual([
      'IgA',
      'tTG_IgA',
    ]);
  });

  it('não junta linhas quando a primeira já é um exame inteiro', () => {
    // "Colesterol" sozinho é nome de catálogo: a linha seguinte é outro exame,
    // e juntar daria "Colesterol HDL".
    const codes = codesOf('Colesterol\nHDL 52 mg/dL');
    expect(codes).toContain('Cholesterol');
    expect(codes).toContain('HDL');
  });

  it('não junta linhas quando a primeira já traz um valor', () => {
    // A linha com valor é um resultado completo; o nome não continua embaixo.
    expect(codesOf('TISSUE 3,1\nTRANSGLUTAMINASE AB, IGA')).not.toContain('tTG_IgA');
  });

  it('não junta mais de duas linhas', () => {
    expect(codesOf('TISSUE\nTRANSGLUTAMINASE\nAB, IGA <1.5 U/mL')).not.toContain('tTG_IgA');
  });
});

describe('findBiomarkersInText: nome mais específico ganha do mais curto', () => {
  const codesOf = (text: string) => findBiomarkersInText(text).matches.map((m) => m.code);

  it('ancora o PSA livre, e não o PSA total, em "PSA, FREE"', () => {
    expect(codesOf('PSA, FREE 0.4 ng/mL')).toEqual(['PSA_Free']);
  });

  it('separa total, livre e relação no painel da Quest', () => {
    const codes = codesOf('PSA, TOTAL 1.3 ng/mL\nPSA, FREE 0.4 ng/mL\nPSA, % FREE 31 %');
    expect(codes).toEqual(['PSA', 'PSA_Free', 'PSA_FreeRatio']);
  });

  it('casa a grafia com vírgula mesmo quando o catálogo não a traz', () => {
    expect(codesOf('MAGNESIUM, RBC 5.2 mg/dL')).toEqual(['Magnesium_RBC']);
  });

  it('não junta os itens de uma lista separada por vírgula', () => {
    // Depois de cada vírgula vem um exame próprio, então a vírgula fica, e
    // "Colesterol, HDL" não vira o nome "Colesterol HDL".
    expect(codesOf('Colesterol, HDL, LDL').sort()).toEqual(['Cholesterol', 'HDL', 'LDL']);
  });

  // Todo nome do catálogo formado por dois nomes do catálogo ("colesterol" +
  // "hdl", "blood" + "glucose", "bmd" + "t score") é uma lista em potencial.
  // Escrito com vírgula, o primeiro item tem que continuar ancorando, a menos
  // que o catálogo liste a própria grafia com vírgula ("Magnesium, RBC").
  it('nenhum nome composto de dois nomes junta uma lista com vírgula', () => {
    const fold = (text: string) =>
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/(?<=\p{L})-(?=[\p{L}\p{N}])/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const codesByName = new Map<string, Set<string>>();
    for (const pattern of getAllSearchPatterns()) {
      for (const name of pattern.names) {
        const key = fold(name);
        codesByName.set(key, (codesByName.get(key) ?? new Set()).add(pattern.code));
      }
    }
    const compounds: string[] = [];
    const lost: string[] = [];
    for (const name of codesByName.keys()) {
      const words = name.split(' ');
      for (let i = 1; i < words.length; i += 1) {
        const head = words.slice(0, i).join(' ');
        const tail = words.slice(i).join(' ');
        if (!codesByName.has(head) || !codesByName.has(tail)) {
          continue;
        }
        compounds.push(name);
        if (codesByName.has(`${head}, ${tail}`)) {
          continue;
        }
        // O valor no fim da linha libera os nomes genéricos ("Blood", "Lead"),
        // que sem ele não ancoram e dariam falso alarme aqui.
        const found = codesOf(`${head}, ${tail} 12`);
        const missing = [...codesByName.get(head)!].filter((code) => !found.includes(code));
        if (missing.length > 0) {
          lost.push(`${head}, ${tail} -> [${found.join(', ')}]`);
        }
      }
    }
    expect(compounds.length).toBeGreaterThanOrEqual(31);
    expect(lost).toEqual([]);
  });

  it('mantém a vírgula decimal intacta', () => {
    expect(codesOf('PSA Livre 0,4 ng/mL')).toEqual(['PSA_Free']);
  });
});

describe('findBiomarkersInText: rótulo de região na densitometria', () => {
  const codesOf = (text: string) => findBiomarkersInText(text).matches.map((m) => m.code);

  // A tabela de equilíbrio muscular tem linhas "Arms Total", "Right Arm" e
  // "Arms Difference", e o modelo junta a linha com a coluna no nome. O "fat
  // mass" de dentro desses rótulos ancorava a gordura do corpo inteiro.
  it.each([
    ['Arms Total Fat Mass 4.8 lbs', ['ArmsFatMass']],
    ['Arms Total Lean Mass 16.9 lbs', ['ArmsLeanMass']],
    ['Legs Total Fat Mass 17.9 lbs', ['LegsFatMass']],
    ['Legs Total Lean Mass 50.8 lbs', ['LegsLeanMass']],
  ])('anchors %s to the regional code only', (line, codes) => {
    expect(codesOf(line)).toEqual(codes);
  });

  it.each([
    'Arms Total Mass 22.7 lbs',
    'Legs Total Mass 71.7 lbs',
    'Arms Difference Fat Mass 0.2 lbs',
    'Arms Difference Lean Mass 0.4 lbs',
    'Legs Difference Total Mass -2.8%',
    'Right Arm Total Mass 11.3 lbs',
  ])('does not anchor a whole-body code inside %s', (line) => {
    expect(codesOf(line)).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^(FatMass|LeanMass|TotalMass)$/)]),
    );
  });

  // "Arm Fat Mass" é sinônimo de `ArmsFatMass`, os dois braços somados. Com o
  // lado na frente, a linha é de um braço só.
  it.each(['Right Arm Fat Mass 2.4 lbs', 'Left Leg Lean Mass 25.3 lbs'])(
    'does not anchor the two-limb code for one side: %s',
    (line) => {
      expect(codesOf(line)).toEqual([]);
    },
  );

  // A região pode vir no singular ou no plural, em inglês ou em português, e
  // com o lado ou a linha da tabela entre ela e o nome.
  it.each([
    'Arm Total Mass 22.7 lbs',
    'Leg Difference Lean Mass 0.4 lbs',
    'Trunk Total Mass 91.6 lbs',
    'Braço Direito Massa Magra 8,4 kg',
    'Braços Massa Total 10,3 kg',
    'Pernas Massa Total 32,5 kg',
    'Perna Esquerda Massa Gorda 4,0 kg',
    'Tronco Massa Total 41,5 kg',
  ])('does not anchor a whole-body code after a region spelled as in %s', (line) => {
    expect(codesOf(line).filter((c) => ['FatMass', 'LeanMass', 'TotalMass'].includes(c))).toEqual(
      [],
    );
  });

  it('still anchors the whole-body names in the table header', () => {
    const header =
      'Left / Right Side Date Lean Mass (lbs) Lean % Fat Mass (lbs) Fat % Total Mass (lbs)';
    expect(codesOf(header).sort()).toEqual(['FatMass', 'LeanMass', 'TotalMass']);
  });

  it('still anchors whole-body and regional names on their own', () => {
    expect(codesOf('Fat Mass 45.6 lbs')).toEqual(['FatMass']);
    expect(codesOf('Total Mass 193.9 lbs')).toEqual(['TotalMass']);
    expect(codesOf('Arms Fat Mass 4.2 lbs')).toEqual(['ArmsFatMass']);
    expect(codesOf('Arm Lean Mass 18.5 lbs')).toEqual(['ArmsLeanMass']);
  });

  it('ignores a region elsewhere on the line', () => {
    // Só o que vem logo antes do nome qualifica: a região numa coluna vizinha
    // não transforma a medida do corpo todo em regional.
    expect(codesOf('Trunk 26.8%   Fat Mass 45.6 lbs')).toContain('FatMass');
    expect(codesOf('Arms 17.6% Total Fat Mass 45.6 lbs')).toContain('FatMass');
  });
});

describe('findBiomarkersInText: "Total Fat" e "Total Lean" da densitometria', () => {
  const codesOf = (text: string) => findBiomarkersInText(text).matches.map((m) => m.code);
  const WHOLE_BODY = ['BodyFatPct', 'FatMass', 'LeanMass', 'TotalMass'];
  const wholeBodyOf = (text: string) => codesOf(text).filter((c) => WHOLE_BODY.includes(c));

  it('anchors the trend-table columns to the whole-body codes', () => {
    expect(codesOf('Total Fat (lbs) 41.2')).toEqual(['FatMass']);
    expect(codesOf('Total Lean (lbs) 130.5')).toEqual(['LeanMass']);
    expect(codesOf('Total Fat 41.2 lbs')).toEqual(['FatMass']);
    expect(codesOf('Total Lean 130.5 lbs')).toEqual(['LeanMass']);
  });

  // A coluna em percentual tem o mesmo rótulo da coluna em lbs. A citação do
  // percentual não pode ancorar a massa de gordura, senão a leitura do
  // percentual era recusada por citar outro exame.
  it.each(['Total Fat (%) 24.3%', 'Total Fat % 24.3%', 'Total Fat % 24.3'])(
    'anchors the percentage, not the fat mass, in %s',
    (line) => {
      expect(codesOf(line)).toEqual(['BodyFatPct']);
    },
  );

  it.each(['Total Fat 24.3%', 'Total Fat 24,3 %', 'Total Lean 71.8%', 'Fat Mass (%) 24.3'])(
    'does not anchor a whole-body mass when a percentage follows it: %s',
    (line) => {
      expect(codesOf(line)).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/^(FatMass|LeanMass)$/)]),
      );
    },
  );

  it('reads every column of the trend-table header', () => {
    const header =
      'Measured Date Total Mass (lbs) Total Fat (%) Total Fat (lbs) Total Lean (lbs) ' +
      'Trunk Fat (lbs) Trunk Lean (lbs) Arms Fat (lbs) Arms Lean (lbs) Legs Fat (lbs) Legs Lean (lbs)';
    expect(codesOf(header).sort()).toEqual(
      [
        'ArmsFatMass',
        'ArmsLeanMass',
        'BodyFatPct',
        'FatMass',
        'LeanMass',
        'LegsFatMass',
        'LegsLeanMass',
        'TotalMass',
        'TrunkFatMass',
        'TrunkLeanMass',
      ].sort(),
    );
  });

  // Na tabela regional da página 1, "Total Fat %" é o cabeçalho de uma coluna
  // cujas linhas são regiões, e o modelo junta a linha com a coluna no nome.
  // A região na frente tira o nome do corpo inteiro, como no #127.
  it.each([
    'Arms Total Fat % 18.2%',
    'Legs Total Fat % 22.6%',
    'Trunk Total Fat % 27.5%',
    'Android Total Fat % 31.4%',
    'Arms Total Fat 4.4 lbs',
    'Legs Total Lean 46.1 lbs',
    'Arms Total Lean % 77.9%',
  ])('does not anchor a whole-body code inside the regional label %s', (line) => {
    expect(wholeBodyOf(line)).toEqual([]);
  });

  it('anchors the percentage in the regional table header, and not the fat mass', () => {
    const header =
      'Region Total Fat % Total Mass (lbs) Fat Tissue (lbs) Lean Tissue (lbs) BMC (lbs) Fat Free (lbs)';
    const codes = codesOf(header);
    expect(codes).toContain('BodyFatPct');
    expect(codes).toContain('TotalMass');
    expect(codes).not.toContain('FatMass');
  });

  it('keeps the guards of #127 working with the new names', () => {
    expect(codesOf('Arms Total Fat Mass 5.1 lbs')).toEqual(['ArmsFatMass']);
    expect(codesOf('Legs Total Lean Mass 52.3 lbs')).toEqual(['LegsLeanMass']);
    expect(codesOf('Fat Mass 47.9 lbs')).toEqual(['FatMass']);
  });
});

describe('findBiomarkersInText: grafias de laudo americano (layout da Quest)', () => {
  const codesOf = (text: string) => findBiomarkersInText(text).matches.map((m) => m.code);

  // Linhas sintéticas no layout da Quest: nome, resultado, faixa e unidade em
  // colunas separadas por espaço. As grafias são as impressas, em caixa alta.
  it.each([
    ['PROTEIN, TOTAL                 7.1      6.1-8.1 g/dL', 'TotalProtein'],
    ['GLOBULIN                       2.4      1.9-3.7 g/dL (calc)', 'Globulin'],
    ['ALBUMIN/GLOBULIN RATIO         2.0      1.0-2.5 (calc)', 'Albumin_Globulin_Ratio'],
    ['BUN/CREATININE RATIO           NOT APPLICABLE  6-22 (calc)', 'BUN_Creatinine_Ratio'],
    ['GGT                            22       3-70 U/L', 'GGT'],
    ['THYROID PEROXIDASE ANTIBODIES  1        <9 IU/mL', 'AntiTPO'],
    ['SEX HORMONE BINDING GLOBULIN   45       10-50 nmol/L', 'SHBG'],
    ['LDL PARTICLE NUMBER            1200     <1138 nmol/L', 'LDL_ParticleNumber'],
    ['LDL PATTERN                    A        Pattern A', 'LDL_Pattern'],
    ['ALBUMIN, URINE                 0.5      Not Estab. mg/dL', 'Microalbumin_Urine'],
    ['OCCULT BLOOD                   NEGATIVE NEGATIVE', 'Blood_Urine'],
    ['LEUKOCYTE ESTERASE             NEGATIVE NEGATIVE', 'LeukocyteEsterase_Urine'],
    ['SQUAMOUS EPITHELIAL CELLS      NONE SEEN <OR= 5 /HPF', 'SquamousEpithelial_Urine'],
    ['HYALINE CAST                   NONE SEEN NONE SEEN /LPF', 'HyalineCasts_Urine'],
  ])('ancora "%s" em %s, e só nele', (line, code) => {
    expect(codesOf(line)).toEqual([code]);
  });

  it('não ancora a proteína da urina dentro de "PROTEIN, TOTAL"', () => {
    // Antes da grafia com vírgula no catálogo, sobrava o "Protein" solto.
    expect(codesOf('PROTEIN, TOTAL 7.1 6.1-8.1 g/dL')).not.toContain('Protein_Urine');
  });

  it('não ancora a ureia em "UREA NITROGEN (BUN)"', () => {
    // O catálogo não tem BUN (3094-0), e `Urea` é a ureia em mg/dL: deixar o
    // "urea" de dentro ancorar penduraria o valor de BUN na faixa da ureia.
    expect(codesOf('UREA NITROGEN (BUN)            15       7-25 mg/dL')).toEqual([]);
    expect(codesOf('Urea 32 mg/dL')).toEqual(['Urea']);
  });

  describe('diferencial do hemograma com o sinal de percentual', () => {
    it.each([
      ['NEUTROPHILS %                  55.1', 'Neutrophils', '770-8'],
      ['LYMPHOCYTES %                  33.2', 'Lymphocytes', '736-9'],
      ['MONOCYTES %                    8.0', 'Monocytes', '5905-5'],
      ['EOSINOPHILS %                  3.1', 'Eosinophils', '713-8'],
    ])('ancora "%s" no percentual %s (%s)', (line, code, loinc) => {
      const { matches } = findBiomarkersInText(line);
      expect(matches.map((m) => [m.code, m.loinc])).toEqual([[code, loinc]]);
    });

    it.each([
      ['ABSOLUTE NEUTROPHILS           3014     1500-7800 cells/uL', 'Neutrophils_Abs'],
      ['ABSOLUTE LYMPHOCYTES           1821     850-3900 cells/uL', 'Lymphocytes_Abs'],
      ['ABSOLUTE MONOCYTES             440      200-950 cells/uL', 'Monocytes_Abs'],
      ['ABSOLUTE EOSINOPHILS           171      15-500 cells/uL', 'Eosinophils_Abs'],
    ])('ancora a contagem absoluta "%s" em %s, e não no percentual', (line, code) => {
      expect(codesOf(line)).toEqual([code]);
    });
  });

  // Palavras genéricas do exame de urina que também nomeiam exames de sangue.
  // O pacote não tem regra de seção ("URINALYSIS"), então elas não resolvem
  // para o código da urina, e isso é deliberado: ancorar "GLUCOSE" na glicose
  // da urina em qualquer contexto quebraria a glicose do soro. Os testes
  // registram o limite atual até existir uma regra de contexto de seção.
  describe('urinálise sem contexto de seção', () => {
    it('não ancora "PH" sozinho, que é curto demais e ambíguo com gasometria', () => {
      expect(codesOf('PH                             6.0      5.0-8.0')).toEqual([]);
    });

    it.each([
      ['GLUCOSE                        NEGATIVE NEGATIVE', 'Glucose_Urine'],
      ['WBC                            NONE SEEN <OR= 5 /HPF', 'Leukocytes_Urine'],
      ['RBC                            NONE SEEN <OR= 2 /HPF', 'RBC_Urine'],
    ])('"%s" não resolve para %s sem saber que está na urinálise', (line, urineCode) => {
      expect(codesOf(line)).not.toContain(urineCode);
    });

    it.each([
      ['COLOR                          YELLOW   YELLOW', 'Color_Urine'],
      ['BILIRUBIN                      NEGATIVE NEGATIVE', 'Bilirubin_Urine'],
      ['KETONES                        NEGATIVE NEGATIVE', 'Ketones_Urine'],
      ['PROTEIN                        NEGATIVE NEGATIVE', 'Protein_Urine'],
      ['NITRITE                        NEGATIVE NEGATIVE', 'Nitrite_Urine'],
      ['BACTERIA                       NONE SEEN NONE SEEN /HPF', 'Bacteria_Urine'],
    ])('"%s" só ancora %s como nome ambíguo, com valor na linha', (line, code) => {
      const { matches } = findBiomarkersInText(line);
      expect(matches.map((m) => [m.code, m.confidence])).toEqual([[code, CONFIDENCE_AMBIGUOUS]]);
      const nameOnly = line.split(/\s{2,}/)[0]!;
      expect(codesOf(nameOnly)).toEqual([]);
    });
  });
});
