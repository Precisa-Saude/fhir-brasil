/**
 * Screening Intervals Configuration
 *
 * Defines recommended screening intervals for different biomarker categories
 * based on clinical guidelines and best practices.
 */

/**
 * Screening interval in months
 */
export type ScreeningIntervalMonths = 3 | 6 | 12;

/**
 * Biomarker category with its recommended screening interval
 */
export interface CategoryScreeningInterval {
  category: string;
  intervalMonths: ScreeningIntervalMonths;
  nameEn: string;
  namePt: string;
}

/**
 * Screening interval configuration for each category
 *
 * Categories are grouped by their recommended screening intervals:
 * - 3 months: Body composition and bone density (frequently changing metrics)
 * - 6 months: Metabolic panel and nutrients (moderate change rate)
 * - 12 months: Standard blood panels (stable long-term markers)
 */
export const CATEGORY_SCREENING_INTERVALS: CategoryScreeningInterval[] = [
  // 3-month intervals - Body composition (frequently changing)
  {
    category: 'composicao-corporal',
    intervalMonths: 3,
    nameEn: 'Body Composition',
    namePt: 'Composição Corporal',
  },
  {
    category: 'densidade-ossea',
    intervalMonths: 3,
    nameEn: 'Bone Density',
    namePt: 'Densidade Óssea',
  },

  // 6-month intervals - Metabolic and nutrients
  {
    category: 'metabolico',
    intervalMonths: 6,
    nameEn: 'Metabolic Panel',
    namePt: 'Painel Metabólico',
  },
  {
    category: 'nutrientes',
    intervalMonths: 6,
    nameEn: 'Nutrients',
    namePt: 'Nutrientes',
  },
  {
    category: 'pancreas',
    intervalMonths: 6,
    nameEn: 'Pancreas',
    namePt: 'Pâncreas',
  },

  // 12-month intervals - Standard blood panels
  {
    category: 'coracao',
    intervalMonths: 12,
    nameEn: 'Heart Health',
    namePt: 'Saúde Cardiovascular',
  },
  {
    category: 'tireoide',
    intervalMonths: 12,
    nameEn: 'Thyroid',
    namePt: 'Tireoide',
  },
  {
    category: 'sangue',
    intervalMonths: 12,
    nameEn: 'Blood Count',
    namePt: 'Hemograma',
  },
  {
    category: 'figado',
    intervalMonths: 12,
    nameEn: 'Liver Function',
    namePt: 'Função Hepática',
  },
  {
    category: 'rins',
    intervalMonths: 12,
    nameEn: 'Kidney Function',
    namePt: 'Função Renal',
  },
  {
    category: 'saude-feminina',
    intervalMonths: 12,
    nameEn: "Women's Health",
    namePt: 'Saúde Feminina',
  },
  {
    category: 'saude-masculina',
    intervalMonths: 12,
    nameEn: "Men's Health",
    namePt: 'Saúde Masculina',
  },
  {
    category: 'eletrolitos',
    intervalMonths: 12,
    nameEn: 'Electrolytes',
    namePt: 'Eletrólitos',
  },
  {
    category: 'estresse-envelhecimento',
    intervalMonths: 12,
    nameEn: 'Stress & Aging',
    namePt: 'Estresse e Envelhecimento',
  },
  {
    category: 'autoimunidade',
    intervalMonths: 12,
    nameEn: 'Autoimmunity',
    namePt: 'Autoimunidade',
  },
  {
    category: 'regulacao-imunologica',
    intervalMonths: 12,
    nameEn: 'Immune Regulation',
    namePt: 'Regulação Imunológica',
  },
  {
    category: 'toxinas-ambientais',
    intervalMonths: 12,
    nameEn: 'Environmental Toxins',
    namePt: 'Toxinas Ambientais',
  },
  {
    category: 'urina',
    intervalMonths: 12,
    nameEn: 'Urinalysis',
    namePt: 'Urina',
  },
];

/**
 * Get screening interval for a category
 */
export const getScreeningInterval = (category: string): CategoryScreeningInterval | undefined => {
  return CATEGORY_SCREENING_INTERVALS.find((c) => c.category === category);
};

/**
 * Get all categories with a specific interval
 */
export const getCategoriesByInterval = (
  intervalMonths: ScreeningIntervalMonths,
): CategoryScreeningInterval[] => {
  return CATEGORY_SCREENING_INTERVALS.filter((c) => c.intervalMonths === intervalMonths);
};

/**
 * Calculate next screening date based on last test date and category
 */
export const calculateNextScreeningDate = (lastTestDate: Date, category: string): Date | null => {
  const interval = getScreeningInterval(category);
  if (!interval) return null;

  const nextDate = new Date(lastTestDate);
  nextDate.setMonth(nextDate.getMonth() + interval.intervalMonths);
  return nextDate;
};

/**
 * Check if a category is due for screening
 */
export const isScreeningDue = (
  lastTestDate: Date,
  category: string,
  referenceDate: Date = new Date(),
): boolean => {
  const nextDate = calculateNextScreeningDate(lastTestDate, category);
  if (!nextDate) return false;
  return referenceDate >= nextDate;
};

/**
 * Get categories that are due for screening based on last test dates
 */
export const getDueCategories = (
  lastTestDates: Record<string, Date>,
  referenceDate: Date = new Date(),
): CategoryScreeningInterval[] => {
  return CATEGORY_SCREENING_INTERVALS.filter((interval) => {
    const lastDate = lastTestDates[interval.category];
    if (!lastDate) return true; // Never tested = due
    return isScreeningDue(lastDate, interval.category, referenceDate);
  });
};

/**
 * Get days until next screening for a category
 */
export const getDaysUntilScreening = (
  lastTestDate: Date,
  category: string,
  referenceDate: Date = new Date(),
): number | null => {
  const nextDate = calculateNextScreeningDate(lastTestDate, category);
  if (!nextDate) return null;

  const diffTime = nextDate.getTime() - referenceDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
