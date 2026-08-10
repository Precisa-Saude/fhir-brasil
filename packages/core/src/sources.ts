/**
 * Registro de fontes bibliográficas para faixas de referência de biomarcadores.
 *
 * Este arquivo NÃO é exportado na API pública do pacote.
 * Usado apenas para validação em testes e geração de documentação.
 *
 * Todas as citações seguem o formato ABNT (NBR 6023).
 */

/**
 * Referência bibliográfica completa para uma fonte de faixas de referência.
 */
export interface SourceReference {
  /** Citação completa em formato ABNT (NBR 6023) */
  abnt: string;
  /** DOI, quando disponível */
  doi?: string;
  /** ISBN, quando aplicável */
  isbn?: string;
  /** Chave curta usada no campo `source` de BiomarkerRangeDefinition */
  key: string;
  /** URL de acesso */
  url?: string;
}

/**
 * Registro central de todas as fontes bibliográficas utilizadas nas faixas de referência.
 *
 * Cada chave corresponde ao valor usado no campo `source` de `BiomarkerRangeDefinition`
 * (sem o sufixo de localização, ex: `'sbc-lipids-2017'` sem `':p15'`).
 */
export const SOURCE_REGISTRY: Record<string, SourceReference> = {
  // ---------------------------------------------------------------------------
  // Fontes internacionais — Cardiovascular
  // ---------------------------------------------------------------------------
  'agatston-1990': {
    abnt: 'AGATSTON, A. S. et al. Quantification of coronary artery calcium using ultrafast computed tomography. Journal of the American College of Cardiology, v. 15, n. 4, p. 827-832, 1990.',
    doi: '10.1016/0735-1097(90)90282-T',
    key: 'agatston-1990',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2407762/',
  },

  'castelli-ratio-1992': {
    abnt: 'CASTELLI, W. P. et al. Lipids and risk of coronary heart disease: the Framingham Study. Annals of Epidemiology, v. 2, n. 1-2, p. 23-28, 1992.',
    doi: '10.1016/1047-2797(92)90033-M',
    key: 'castelli-ratio-1992',
    url: 'https://pubmed.ncbi.nlm.nih.gov/1342260/',
  },

  'caulfield-ionmobility-2008': {
    abnt: 'CAULFIELD, M. P. et al. Direct determination of lipoprotein particle sizes and concentrations by ion mobility analysis. Clinical Chemistry, v. 54, n. 8, p. 1307-1316, 2008.',
    doi: '10.1373/clinchem.2007.100586',
    key: 'caulfield-ionmobility-2008',
    url: 'https://pubmed.ncbi.nlm.nih.gov/18515257/',
  },

  'contois-apoa1-1996': {
    abnt: 'CONTOIS, J. H. et al. Reference intervals for plasma apolipoprotein A-1 determined with a standardized commercial immunoturbidimetric assay: results from the Framingham Offspring Study. Clinical Chemistry, v. 42, n. 4, p. 507-514, 1996.',
    doi: '10.1093/clinchem/42.4.507',
    key: 'contois-apoa1-1996',
    url: 'https://pubmed.ncbi.nlm.nih.gov/8605666/',
  },

  'ferreira-vitd-2017': {
    abnt: 'FERREIRA, C. E. S. et al. Posicionamento oficial da Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial e da Sociedade Brasileira de Endocrinologia e Metabologia sobre intervalos de referência da vitamina D [25(OH)D]. Archives of Endocrinology and Metabolism, v. 61, n. 6, p. 527-542, 2017.',
    doi: '10.1590/2359-3997000000310',
    key: 'ferreira-vitd-2017',
    url: 'https://pubmed.ncbi.nlm.nih.gov/29412389/',
  },

  'friedewald-1972': {
    abnt: 'FRIEDEWALD, W. T.; LEVY, R. I.; FREDRICKSON, D. S. Estimation of the concentration of low-density lipoprotein cholesterol in plasma, without use of the preparative ultracentrifuge. Clinical Chemistry, v. 18, n. 6, p. 499-502, 1972.',
    doi: '10.1093/clinchem/18.6.499',
    key: 'friedewald-1972',
    url: 'https://pubmed.ncbi.nlm.nih.gov/4337382/',
  },

  'gallagher-bodyfat-2000': {
    abnt: 'GALLAGHER, D. et al. Healthy percentage body fat ranges: an approach for developing guidelines based on body mass index. American Journal of Clinical Nutrition, v. 72, n. 3, p. 694-701, 2000.',
    key: 'gallagher-bodyfat-2000',
    url: 'https://pubmed.ncbi.nlm.nih.gov/10966886/',
  },

  'ge-corescan': {
    abnt: 'GE HEALTHCARE. enCORE Software CoreScan: Visceral Adipose Tissue (VAT) assessment. Madison: GE Medical Systems Lunar, [s. d.]. (Documentação do fabricante do DEXA Lunar Prodigy; classificação Healthy 0–52 in³, Increased Risk 52,15–112,10 in³, At Risk 112,10+ in³, equivalente a 0–852 cm³, 854–1.837 cm³, 1.837+ cm³.)',
    key: 'ge-corescan',
    url: 'https://www.gehealthcare.com/products/bone-and-metabolic-health/encore',
  },

  'geloneze-brams-2009': {
    abnt: 'GELONEZE, B. et al. HOMA1-IR and HOMA2-IR indexes in identifying insulin resistance and metabolic syndrome — Brazilian Metabolic Syndrome Study (BRAMS). Arquivos Brasileiros de Endocrinologia & Metabologia, v. 53, n. 2, p. 281-287, 2009.',
    doi: '10.1590/S0004-27302009000200020',
    key: 'geloneze-brams-2009',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19466221/',
  },

  'george-ck-2016': {
    abnt: 'GEORGE, M. D.; MCGILL, N. K.; BAKER, J. F. Creatine kinase in the U.S. population: impact of demographics, comorbidities, and body composition on the normal range. Medicine, v. 95, n. 33, e4344, 2016.',
    doi: '10.1097/MD.0000000000004344',
    key: 'george-ck-2016',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27537560/',
  },

  'giannitsis-hstnt-2010': {
    abnt: 'GIANNITSIS, E. et al. Analytical validation of a high-sensitivity cardiac troponin T assay. Clinical Chemistry, v. 56, n. 2, p. 254-261, 2010.',
    doi: '10.1373/clinchem.2009.132654',
    key: 'giannitsis-hstnt-2010',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19959623/',
  },
  // ---------------------------------------------------------------------------
  // Fontes internacionais — Ácidos graxos ômega
  // ---------------------------------------------------------------------------
  'harris-omega3-2004': {
    abnt: 'HARRIS, W. S.; VON SCHACKY, C. The Omega-3 Index: a new risk factor for death from coronary heart disease? Preventive Medicine, v. 39, n. 1, p. 212-220, 2004.',
    doi: '10.1016/j.ypmed.2004.02.030',
    key: 'harris-omega3-2004',
    url: 'https://pubmed.ncbi.nlm.nih.gov/15208005/',
  },

  // ---------------------------------------------------------------------------
  // Referência laboratorial geral
  // ---------------------------------------------------------------------------
  'kalaria-ck-ri-2026': {
    abnt: 'KALARIA, T. et al. Age, sex and ethnicity changes in creatine kinase and sex- and ethnicity-specific reference intervals of creatine kinase. Clinical Medicine, v. 26, n. 4, p. 100596, 2026.',
    doi: '10.1016/j.clinme.2026.100596',
    key: 'kalaria-ck-ri-2026',
    url: 'https://pubmed.ncbi.nlm.nih.gov/42142664/',
  },

  // ---------------------------------------------------------------------------
  // Fontes internacionais — Nefrologia
  // ---------------------------------------------------------------------------
  'kdigo-ckd-2024': {
    abnt: 'KIDNEY DISEASE: IMPROVING GLOBAL OUTCOMES (KDIGO) CKD Work Group. KDIGO 2024 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease. Kidney International, v. 105, n. 4S, p. S117-S314, 2024.',
    doi: '10.1016/j.kint.2023.10.018',
    key: 'kdigo-ckd-2024',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38490803/',
  },

  'keller-tni-2013': {
    abnt: 'KELLER, T. et al. Defining a reference population to determine the 99th percentile of a contemporary sensitive cardiac troponin I assay. International Journal of Cardiology, v. 167, n. 4, p. 1423-1429, 2013.',
    doi: '10.1016/j.ijcard.2012.04.063',
    key: 'keller-tni-2013',
    url: 'https://pubmed.ncbi.nlm.nih.gov/22560907/',
  },

  'kelly-dxa-2009': {
    abnt: 'KELLY, T. L. et al. Dual energy X-ray absorptiometry body composition reference values from NHANES. PLoS One, v. 4, n. 9, e7038, 2009.',
    doi: '10.1371/journal.pone.0007038',
    key: 'kelly-dxa-2009',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19753111/',
  },

  'khetarpal-apociii-2016': {
    abnt: 'KHETARPAL, S. A. et al. Why is apolipoprotein CIII emerging as a novel therapeutic target to reduce the burden of cardiovascular disease? Current Atherosclerosis Reports, v. 18, n. 10, p. 59, 2016.',
    key: 'khetarpal-apociii-2016',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5018018/',
  },

  'klee-bhb-2020': {
    abnt: 'KLEE, P. et al. Test validation, method comparison and reference range for the measurement of β-hydroxybutyrate in peripheral blood samples. Practical Laboratory Medicine, v. 18, e00146, 2020.',
    doi: '10.1016/j.plabm.2019.e00146',
    key: 'klee-bhb-2020',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6999181/',
  },

  'maisel-bnp-2002': {
    abnt: 'MAISEL, A. S. et al. Rapid measurement of B-type natriuretic peptide in the emergency diagnosis of heart failure. New England Journal of Medicine, v. 347, n. 3, p. 161-167, 2002.',
    doi: '10.1056/NEJMoa020233',
    key: 'maisel-bnp-2002',
    url: 'https://pubmed.ncbi.nlm.nih.gov/12124404/',
  },

  'meuwese-mpo-2007': {
    abnt: 'MEUWESE, M. C. et al. Serum myeloperoxidase levels are associated with the future risk of coronary artery disease in apparently healthy individuals: the EPIC-Norfolk Prospective Population Study. Journal of the American College of Cardiology, v. 50, n. 2, p. 159-165, 2007.',
    doi: '10.1016/j.jacc.2007.03.033',
    key: 'meuwese-mpo-2007',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17616301/',
  },

  // ---------------------------------------------------------------------------
  // Fontes internacionais — Marcadores metabólicos e inflamatórios
  // ---------------------------------------------------------------------------
  'nemeth-adma-2017': {
    abnt: 'NEMETH, B. et al. The issue of plasma asymmetric dimethylarginine reference range: a systematic review and meta-analysis. PLoS One, v. 12, n. 5, e0177493, 2017.',
    doi: '10.1371/journal.pone.0177493',
    key: 'nemeth-adma-2017',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28494019/',
  },

  // ---------------------------------------------------------------------------
  // Fontes brasileiras — Metais pesados (NR-7)
  // ---------------------------------------------------------------------------
  'nr7-pcmso-2020': {
    abnt: 'BRASIL. Ministério do Trabalho e Emprego. NR-7 — PCMSO, Quadro 1: Indicadores biológicos. Portaria n. 6.734, de 9 de março de 2020. Diário Oficial da União, Brasília, 13 mar. 2020.',
    key: 'nr7-pcmso-2020',
    url: 'https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2022/portaria-no-567-de-10-de-marco-de-2022-alteracoes-na-nr-7.pdf',
  },

  'ofenheimer-vat-2020': {
    abnt: 'OFENHEIMER, A. et al. Reference values of body composition parameters and visceral adipose tissue (VAT) by DXA in adults aged 18-81 years: results from the LEAD cohort. European Journal of Clinical Nutrition, v. 74, p. 1181-1191, 2020.',
    doi: '10.1038/s41430-020-0596-5',
    key: 'ofenheimer-vat-2020',
    url: 'https://pubmed.ncbi.nlm.nih.gov/32123345/',
  },

  'pns-bioquimica-2019': {
    abnt: 'SZWARCWALD, C. L. et al. Valores de referência para exames laboratoriais de colesterol, hemoglobina glicosilada e creatinina da população adulta brasileira. Revista Brasileira de Epidemiologia, v. 22, supl. 2, e190002.supl.2, 2019.',
    doi: '10.1590/1980-549720190002.supl.2',
    key: 'pns-bioquimica-2019',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31596373/',
  },

  // ---------------------------------------------------------------------------
  // Pesquisa Nacional de Saúde (PNS) — Intervalos de referência brasileiros
  // ---------------------------------------------------------------------------
  'pns-hemograma-2019': {
    abnt: 'ROSENFELD, L. G. et al. Valores de referência para exames laboratoriais de hemograma da população adulta brasileira: Pesquisa Nacional de Saúde. Revista Brasileira de Epidemiologia, v. 22, supl. 2, e190003.supl.2, 2019.',
    doi: '10.1590/1980-549720190003.supl.2',
    key: 'pns-hemograma-2019',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31596374/',
  },

  'pns-renal-2019': {
    abnt: 'MALTA, D. C. et al. Evaluation of renal function in the Brazilian adult population, according to laboratory criteria from the National Health Survey. Revista Brasileira de Epidemiologia, v. 22, supl. 2, e190010.supl.2, 2019.',
    doi: '10.1590/1980-549720190010.supl.2',
    key: 'pns-renal-2019',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31596381/',
  },

  'rumberger-cac-1999': {
    abnt: 'RUMBERGER, J. A. et al. Electron beam computed tomographic coronary calcium scanning: a review and guidelines for use in asymptomatic persons. Mayo Clinic Proceedings, v. 74, n. 3, p. 243-252, 1999.',
    doi: '10.4065/74.3.243',
    key: 'rumberger-cac-1999',
    url: 'https://pubmed.ncbi.nlm.nih.gov/10089993/',
  },

  'sbc-ic-2018': {
    abnt: 'ROHDE, L. E. P. et al. Diretriz Brasileira de Insuficiência Cardíaca Crônica e Aguda. Arquivos Brasileiros de Cardiologia, São Paulo, v. 111, n. 3, p. 436-539, set. 2018.',
    doi: '10.5935/abc.20180190',
    key: 'sbc-ic-2018',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30379264/',
  },

  // ---------------------------------------------------------------------------
  // Sociedade Brasileira de Cardiologia
  // ---------------------------------------------------------------------------
  'sbc-lipids-2017': {
    abnt: 'FALUDI, A. A. et al. Atualização da Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose – 2017. Arquivos Brasileiros de Cardiologia, São Paulo, v. 109, n. 2, supl. 1, p. 1-76, ago. 2017.',
    doi: '10.5935/abc.20170121',
    key: 'sbc-lipids-2017',
    url: 'https://www.scielo.br/j/abc/a/whBsCyzTDzGYJcsBY7YVkWn/?lang=pt',
  },

  'sbc-lipids-2025': {
    abnt: 'RACHED, F. H. et al. Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose – 2025. Arquivos Brasileiros de Cardiologia, São Paulo, v. 122, n. 9, e20250640, out. 2025.',
    doi: '10.36660/abc.20250640',
    key: 'sbc-lipids-2025',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12674852/',
  },

  // ---------------------------------------------------------------------------
  // Sociedade Brasileira de Diabetes
  // ---------------------------------------------------------------------------
  'sbd-diabetes-2024': {
    // Chave mantida como 'sbd-diabetes-2024' para compatibilidade com
    // consumidores publicados; a diretriz correspondente é o documento vivo
    // de diretriz.diabetes.org.br, cuja edição citada quando este registro foi
    // atualizado é "Edição 2025". Semelhante ao caso de sbpc-ml-2021 abaixo.
    abnt: 'SOCIEDADE BRASILEIRA DE DIABETES (SBD). Diretriz da Sociedade Brasileira de Diabetes — Edição 2025. São Paulo: SBD, 2025.',
    doi: '10.29327/5660187',
    isbn: '978-65-272-1932-3',
    key: 'sbd-diabetes-2024',
    url: 'https://diretriz.diabetes.org.br',
  },

  // ---------------------------------------------------------------------------
  // Sociedade Brasileira de Endocrinologia e Metabologia
  // ---------------------------------------------------------------------------
  'sbem-thyroid-2013': {
    abnt: 'SGARBI, J. A. et al. Consenso brasileiro para a abordagem clínica e tratamento do hipotireoidismo subclínico em adultos. Arquivos Brasileiros de Endocrinologia & Metabologia, v. 57, n. 3, p. 166-183, 2013.',
    doi: '10.1590/S0004-27302013000300003',
    key: 'sbem-thyroid-2013',
    url: 'https://pubmed.ncbi.nlm.nih.gov/23681263/',
  },
  'sbem-vitamind-2014': {
    abnt: 'MAEDA, S. S. et al. Recomendações da Sociedade Brasileira de Endocrinologia e Metabologia (SBEM) para o diagnóstico e tratamento da hipovitaminose D. Arquivos Brasileiros de Endocrinologia & Metabologia, v. 58, n. 5, p. 411-433, 2014.',
    doi: '10.1590/0004-2730000003388',
    key: 'sbem-vitamind-2014',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25166032/',
  },

  // ---------------------------------------------------------------------------
  // Sociedade Brasileira de Patologia Clínica / Medicina Laboratorial
  // ---------------------------------------------------------------------------
  'sbpc-ml-2021': {
    // Chave mantida como 'sbpc-ml-2021' para compatibilidade com consumidores;
    // a edição autoritativa é de 2020 (verificada na Biblioteca Digital SBPC/ML
    // em 2026-04-18). Ano na citação ABNT reflete a edição real.
    abnt: 'SOCIEDADE BRASILEIRA DE PATOLOGIA CLÍNICA/MEDICINA LABORATORIAL (SBPC/ML). Recomendações da Sociedade Brasileira de Patologia Clínica/Medicina Laboratorial (SBPC/ML): Boas Práticas em Laboratório Clínico. São Paulo: SBPC/ML, 2020.',
    key: 'sbpc-ml-2021',
    url: 'https://bibliotecasbpc.org.br/index.php?P=4&C=0.2.443',
  },

  'schumann-ifcc-ldh-2002': {
    abnt: 'SCHUMANN, G.; KLAUKE, R. New IFCC reference procedures for the determination of catalytic activity concentrations of five enzymes in serum: preliminary upper reference limits obtained in hospitalized subjects. Clinica Chimica Acta, v. 327, n. 1-2, p. 69-79, 2003.',
    doi: '10.1016/S0009-8981(02)00341-8',
    key: 'schumann-ifcc-ldh-2002',
    url: 'https://pubmed.ncbi.nlm.nih.gov/12482620/',
  },

  'schwedhelm-sdma-2011': {
    abnt: 'SCHWEDHELM, E. et al. Plasma symmetric dimethylarginine reference limits from the Framingham Offspring Cohort. Clinical Chemistry and Laboratory Medicine, v. 49, n. 11, p. 1907-1910, 2011.',
    doi: '10.1515/CCLM.2011.679',
    key: 'schwedhelm-sdma-2011',
    url: 'https://pubmed.ncbi.nlm.nih.gov/21864208/',
  },

  'selhub-homocysteine-1999': {
    abnt: 'SELHUB, J. et al. Serum total homocysteine concentrations in the third National Health and Nutrition Examination Survey (1991-1994): population reference ranges and contribution of vitamin status to high serum concentrations. Annals of Internal Medicine, v. 131, n. 5, p. 331-339, 1999.',
    doi: '10.7326/0003-4819-131-5-199909070-00003',
    key: 'selhub-homocysteine-1999',
    url: 'https://pubmed.ncbi.nlm.nih.gov/10475885/',
  },

  'simopoulos-omega-ratio-2002': {
    abnt: 'SIMOPOULOS, A. P. The importance of the ratio of omega-6/omega-3 essential fatty acids. Biomedicine & Pharmacotherapy, v. 56, n. 8, p. 365-379, 2002.',
    doi: '10.1016/S0753-3322(02)00253-6',
    key: 'simopoulos-omega-ratio-2002',
    url: 'https://pubmed.ncbi.nlm.nih.gov/12442909/',
  },

  // ---------------------------------------------------------------------------
  // Fontes internacionais — Marcadores tumorais
  // ---------------------------------------------------------------------------
  'sturgeon-nacb-2008': {
    abnt: 'STURGEON, C. M. et al. National Academy of Clinical Biochemistry Laboratory Medicine Practice Guidelines for use of tumor markers in testicular, prostate, colorectal, breast, and ovarian cancers. Clinical Chemistry, v. 54, n. 12, p. e11-e79, 2008.',
    doi: '10.1373/clinchem.2008.105601',
    key: 'sturgeon-nacb-2008',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19042984/',
  },

  'tietz-7ed-2015': {
    abnt: 'BURTIS, C. A.; BRUNS, D. E. Tietz Fundamentals of Clinical Chemistry and Molecular Diagnostics. 7. ed. St. Louis: Elsevier Saunders, 2015.',
    isbn: '978-1-4557-4165-6',
    key: 'tietz-7ed-2015',
  },

  'torrissen-omega3-dbs-2025': {
    abnt: 'TORRISSEN, M. et al. Global variations in omega-3 fatty acid status and omega-6:omega-3 ratios: insights from > 500,000 whole-blood dried blood spot samples. Lipids in Health and Disease, v. 24, n. 1, p. 260, 2025.',
    doi: '10.1186/s12944-025-02676-6',
    key: 'torrissen-omega3-dbs-2025',
    url: 'https://pubmed.ncbi.nlm.nih.gov/40783537/',
  },
  // ---------------------------------------------------------------------------
  // Fontes internacionais — Coagulação
  // ---------------------------------------------------------------------------
  'wells-ddimer-2003': {
    abnt: 'WELLS, P. S. et al. Evaluation of D-dimer in the diagnosis of suspected deep-vein thrombosis. New England Journal of Medicine, v. 349, p. 1227-1235, 2003.',
    doi: '10.1056/NEJMoa023153',
    key: 'wells-ddimer-2003',
    url: 'https://pubmed.ncbi.nlm.nih.gov/14507948/',
  },

  // ---------------------------------------------------------------------------
  // Fontes internacionais — OMS
  // ---------------------------------------------------------------------------
  'who-iron-2020': {
    abnt: 'WORLD HEALTH ORGANIZATION. WHO guideline on use of ferritin concentrations to assess iron status in individuals and populations. Geneva: WHO, 2020.',
    isbn: '978-92-4-000012-4',
    key: 'who-iron-2020',
    url: 'https://www.who.int/publications/i/item/9789240000124',
  },

  'who-obesity-2000': {
    abnt: 'WORLD HEALTH ORGANIZATION. Obesity: preventing and managing the global epidemic. WHO Technical Report Series, n. 894. Geneva: WHO, 2000.',
    isbn: '92-4-120894-5',
    key: 'who-obesity-2000',
  },

  'who-osteoporosis-1994': {
    abnt: 'WHO STUDY GROUP. Assessment of fracture risk and its application to screening for postmenopausal osteoporosis. WHO Technical Report Series, n. 843. Geneva: WHO, 1994.',
    key: 'who-osteoporosis-1994',
    url: 'https://pubmed.ncbi.nlm.nih.gov/7941614/',
  },
};

/**
 * Extrai a chave de fonte de um valor `source` que pode conter localizador.
 *
 * @example
 * extractSourceKey('sbc-lipids-2017:p15') // 'sbc-lipids-2017'
 * extractSourceKey('sbpc-ml-2021')        // 'sbpc-ml-2021'
 */
export function extractSourceKey(source: string): string {
  return source.split(':')[0] ?? source;
}
