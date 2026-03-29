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
  /** Chave curta usada no campo `source` de BiomarkerRangeDefinition */
  key: string;
  /** Citação completa em formato ABNT (NBR 6023) */
  abnt: string;
  /** DOI, quando disponível */
  doi?: string;
  /** URL de acesso */
  url?: string;
  /** ISBN, quando aplicável */
  isbn?: string;
}

/**
 * Registro central de todas as fontes bibliográficas utilizadas nas faixas de referência.
 *
 * Cada chave corresponde ao valor usado no campo `source` de `BiomarkerRangeDefinition`
 * (sem o sufixo de localização, ex: `'sbc-lipids-2017'` sem `':p15'`).
 */
export const SOURCE_REGISTRY: Record<string, SourceReference> = {
  // ---------------------------------------------------------------------------
  // Sociedade Brasileira de Patologia Clínica / Medicina Laboratorial
  // ---------------------------------------------------------------------------
  'sbpc-ml-2021': {
    key: 'sbpc-ml-2021',
    // TODO: Verificar título exato e dados completos na biblioteca SBPC
    // https://www.bibliotecasbpc.org.br/index.php?P=4&C=0.2
    abnt: 'SOCIEDADE BRASILEIRA DE PATOLOGIA CLÍNICA/MEDICINA LABORATORIAL (SBPC/ML). Recomendações da SBPC/ML. São Paulo: SBPC/ML, 2021.',
    url: 'https://www.bibliotecasbpc.org.br/index.php?P=4&C=0.2',
  },

  // ---------------------------------------------------------------------------
  // Sociedade Brasileira de Cardiologia
  // ---------------------------------------------------------------------------
  'sbc-lipids-2017': {
    key: 'sbc-lipids-2017',
    abnt: 'FALUDI, A. A. et al. Atualização da Diretriz Brasileira de Dislipidemias e Prevenção da Aterosclerose – 2017. Arquivos Brasileiros de Cardiologia, São Paulo, v. 109, n. 2, supl. 1, p. 1-76, ago. 2017.',
    doi: '10.5935/abc.20170121',
    url: 'https://www.scielo.br/j/abc/a/whBsCyzTDzGYJcsBY7YVkWn/?lang=pt',
  },

  // ---------------------------------------------------------------------------
  // Sociedade Brasileira de Diabetes
  // ---------------------------------------------------------------------------
  'sbd-diabetes-2024': {
    key: 'sbd-diabetes-2024',
    // TODO: Verificar edição exata e dados completos
    abnt: 'SOCIEDADE BRASILEIRA DE DIABETES (SBD). Diretrizes da Sociedade Brasileira de Diabetes 2024. São Paulo: SBD, 2024.',
    url: 'https://diretriz.diabetes.org.br',
  },

  // ---------------------------------------------------------------------------
  // Sociedade Brasileira de Endocrinologia e Metabologia
  // ---------------------------------------------------------------------------
  'sbem-thyroid-2013': {
    key: 'sbem-thyroid-2013',
    // TODO: Verificar referência exata do consenso de tireoide
    abnt: 'SOCIEDADE BRASILEIRA DE ENDOCRINOLOGIA E METABOLOGIA (SBEM). Consenso Brasileiro para a Abordagem Clínica e Tratamento do Hipotireoidismo Subclínico em Adultos. Arquivos Brasileiros de Endocrinologia & Metabologia, v. 57, n. 3, 2013.',
    url: 'https://www.sbem.org.br',
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
  return source.split(':')[0]!;
}
