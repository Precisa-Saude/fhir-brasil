/**
 * Agrupamento de categorias clínicas em 10 grupos de alto nível.
 *
 * `BiomarkerDefinition.category` armazena 20 sub-categorias (granularidade
 * fina, ex: `tireoide`, `pancreas`). Este módulo agrupa essas
 * sub-categorias em 10 buckets clínicos amplos para apresentação no
 * site, na API pública e em material de divulgação.
 *
 * As sub-categorias permanecem como fonte da verdade nos dados; este
 * agrupamento é uma camada derivada.
 */

export type CategoryGroup =
  | 'cardiovascular'
  | 'metabolico-endocrino'
  | 'renal-eletrolitico'
  | 'hepatico-biliar'
  | 'hematologico'
  | 'imunologico'
  | 'oncologico'
  | 'nutricional-ambiental'
  | 'saude-reprodutiva'
  | 'composicao-envelhecimento';

export interface CategoryGroupInfo {
  /** Sub-categorias da fonte agrupadas neste bucket */
  subcategories: readonly string[];
  /** Slug (kebab-case, sem acento) */
  slug: CategoryGroup;
  /** Rótulo em português */
  pt: string;
  /** Rótulo em inglês */
  en: string;
}

export const CATEGORY_GROUPS: Record<CategoryGroup, CategoryGroupInfo> = {
  cardiovascular: {
    en: 'Cardiovascular',
    pt: 'Cardiovascular',
    slug: 'cardiovascular',
    subcategories: ['coracao'],
  },
  'metabolico-endocrino': {
    en: 'Metabolic & Endocrine',
    pt: 'Metabólico e Endócrino',
    slug: 'metabolico-endocrino',
    subcategories: ['metabolico', 'pancreas', 'hormonios', 'tireoide'],
  },
  'renal-eletrolitico': {
    en: 'Renal & Electrolytes',
    pt: 'Renal e Eletrolítico',
    slug: 'renal-eletrolitico',
    subcategories: ['rins', 'urina', 'eletrolitos'],
  },
  'hepatico-biliar': {
    en: 'Hepatic & Biliary',
    pt: 'Hepático e Biliar',
    slug: 'hepatico-biliar',
    subcategories: ['figado'],
  },
  hematologico: {
    en: 'Hematology',
    pt: 'Hematológico',
    slug: 'hematologico',
    subcategories: ['sangue'],
  },
  imunologico: {
    en: 'Immunology',
    pt: 'Imunológico',
    slug: 'imunologico',
    subcategories: ['autoimunidade', 'regulacao-imunologica'],
  },
  oncologico: {
    en: 'Oncology',
    pt: 'Oncológico',
    slug: 'oncologico',
    subcategories: ['marcadores-tumorais'],
  },
  'nutricional-ambiental': {
    en: 'Nutrition & Environmental Exposure',
    pt: 'Nutricional e Exposição Ambiental',
    slug: 'nutricional-ambiental',
    subcategories: ['nutrientes', 'toxinas-ambientais'],
  },
  'saude-reprodutiva': {
    en: 'Reproductive Health',
    pt: 'Saúde Reprodutiva',
    slug: 'saude-reprodutiva',
    subcategories: ['saude-feminina', 'saude-masculina'],
  },
  'composicao-envelhecimento': {
    en: 'Body Composition & Aging',
    pt: 'Composição Corporal e Envelhecimento',
    slug: 'composicao-envelhecimento',
    subcategories: ['composicao-corporal', 'densidade-ossea', 'estresse-envelhecimento'],
  },
};

const SUBCATEGORY_TO_GROUP = new Map<string, CategoryGroup>();
for (const group of Object.values(CATEGORY_GROUPS)) {
  for (const sub of group.subcategories) {
    SUBCATEGORY_TO_GROUP.set(sub, group.slug);
  }
}

/**
 * Resolve a sub-categoria (granular) para o grupo de alto nível (10 buckets).
 */
export function getCategoryGroup(subcategory: string): CategoryGroup | undefined {
  return SUBCATEGORY_TO_GROUP.get(subcategory);
}

/**
 * Lista todas as sub-categorias mapeadas em algum grupo.
 */
export function listMappedSubcategories(): readonly string[] {
  return [...SUBCATEGORY_TO_GROUP.keys()];
}
