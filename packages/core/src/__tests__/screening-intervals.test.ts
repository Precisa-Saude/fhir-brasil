import { describe, expect, it } from 'vitest';

import {
  calculateNextScreeningDate,
  CATEGORY_SCREENING_INTERVALS,
  getCategoriesByInterval,
  getDaysUntilScreening,
  getDueCategories,
  getScreeningInterval,
  isScreeningDue,
} from '../screening-intervals';

describe('CATEGORY_SCREENING_INTERVALS', () => {
  it('has 18 categories', () => {
    expect(CATEGORY_SCREENING_INTERVALS).toHaveLength(18);
  });

  it('each entry has required fields', () => {
    for (const entry of CATEGORY_SCREENING_INTERVALS) {
      expect(entry).toHaveProperty('category');
      expect(entry).toHaveProperty('intervalMonths');
      expect(entry).toHaveProperty('nameEn');
      expect(entry).toHaveProperty('namePt');
      expect([3, 6, 12]).toContain(entry.intervalMonths);
    }
  });

  it('has unique categories', () => {
    const categories = CATEGORY_SCREENING_INTERVALS.map((c) => c.category);
    expect(new Set(categories).size).toBe(categories.length);
  });
});

describe('getScreeningInterval', () => {
  it('returns interval for metabolico (6 months)', () => {
    const result = getScreeningInterval('metabolico');
    expect(result).toBeDefined();
    expect(result!.intervalMonths).toBe(6);
  });

  it('returns interval for coracao (12 months)', () => {
    const result = getScreeningInterval('coracao');
    expect(result).toBeDefined();
    expect(result!.intervalMonths).toBe(12);
  });

  it('returns interval for composicao-corporal (3 months)', () => {
    const result = getScreeningInterval('composicao-corporal');
    expect(result).toBeDefined();
    expect(result!.intervalMonths).toBe(3);
  });

  it('returns undefined for unknown category', () => {
    expect(getScreeningInterval('unknown')).toBeUndefined();
  });
});

describe('getCategoriesByInterval', () => {
  it('returns 2 categories for 3-month interval', () => {
    const result = getCategoriesByInterval(3);
    expect(result).toHaveLength(2);
    const categories = result.map((c) => c.category);
    expect(categories).toContain('composicao-corporal');
    expect(categories).toContain('densidade-ossea');
  });

  it('returns 3 categories for 6-month interval', () => {
    const result = getCategoriesByInterval(6);
    expect(result).toHaveLength(3);
  });

  it('returns the most categories for 12-month interval', () => {
    const result = getCategoriesByInterval(12);
    expect(result).toHaveLength(13);
    expect(result.length).toBeGreaterThan(getCategoriesByInterval(3).length);
    expect(result.length).toBeGreaterThan(getCategoriesByInterval(6).length);
  });
});

describe('calculateNextScreeningDate', () => {
  it('adds correct months for known category', () => {
    const lastDate = new Date(2024, 0, 15); // Jan 15 2024 local time
    const nextDate = calculateNextScreeningDate(lastDate, 'metabolico');
    expect(nextDate).not.toBeNull();
    expect(nextDate!.getFullYear()).toBe(2024);
    expect(nextDate!.getMonth()).toBe(6); // July (0-indexed)
    expect(nextDate!.getDate()).toBe(15);
  });

  it('adds 3 months for composicao-corporal', () => {
    const lastDate = new Date(2024, 5, 1); // Jun 1 2024 local time
    const nextDate = calculateNextScreeningDate(lastDate, 'composicao-corporal');
    expect(nextDate).not.toBeNull();
    expect(nextDate!.getMonth()).toBe(8); // September
  });

  it('returns null for unknown category', () => {
    const lastDate = new Date('2024-01-15');
    expect(calculateNextScreeningDate(lastDate, 'unknown')).toBeNull();
  });
});

describe('isScreeningDue', () => {
  it('returns true when enough time has passed', () => {
    const lastTest = new Date('2023-01-01');
    const refDate = new Date('2024-01-01'); // 12 months later
    expect(isScreeningDue(lastTest, 'coracao', refDate)).toBe(true);
  });

  it('returns false when not enough time has passed', () => {
    const lastTest = new Date('2024-01-01');
    const refDate = new Date('2024-03-01'); // only 2 months later
    expect(isScreeningDue(lastTest, 'coracao', refDate)).toBe(false);
  });

  it('returns false for unknown category', () => {
    const lastTest = new Date('2023-01-01');
    const refDate = new Date('2024-06-01');
    expect(isScreeningDue(lastTest, 'unknown', refDate)).toBe(false);
  });

  it('returns true when exactly at the due date', () => {
    const lastTest = new Date('2024-01-15');
    const refDate = new Date('2024-07-15'); // exactly 6 months
    expect(isScreeningDue(lastTest, 'metabolico', refDate)).toBe(true);
  });
});

describe('getDueCategories', () => {
  it('returns all categories when no tests have been done', () => {
    const result = getDueCategories({});
    expect(result).toHaveLength(CATEGORY_SCREENING_INTERVALS.length);
  });

  it('excludes categories tested recently', () => {
    const refDate = new Date('2024-06-01');
    const lastTestDates: Record<string, Date> = {
      coracao: new Date('2024-03-01'), // 3 months ago, needs 12 — not due
      metabolico: new Date('2023-06-01'), // 12 months ago, needs 6 — due
    };
    const result = getDueCategories(lastTestDates, refDate);
    const categories = result.map((c) => c.category);
    expect(categories).toContain('metabolico');
    expect(categories).not.toContain('coracao');
  });

  it('includes categories that have never been tested', () => {
    const refDate = new Date('2024-06-01');
    const lastTestDates: Record<string, Date> = {
      coracao: new Date('2024-05-01'),
    };
    const result = getDueCategories(lastTestDates, refDate);
    const categories = result.map((c) => c.category);
    // All except coracao should be due (never tested = due)
    expect(categories).not.toContain('coracao');
    expect(categories).toContain('metabolico');
    expect(categories).toContain('composicao-corporal');
  });
});

describe('getDaysUntilScreening', () => {
  it('returns positive number when not yet due', () => {
    const lastTest = new Date('2024-01-01');
    const refDate = new Date('2024-02-01'); // 1 month later, needs 12
    const days = getDaysUntilScreening(lastTest, 'coracao', refDate);
    expect(days).not.toBeNull();
    expect(days!).toBeGreaterThan(0);
  });

  it('returns negative number when past due', () => {
    const lastTest = new Date('2023-01-01');
    const refDate = new Date('2024-06-01'); // 18 months later, needs 12
    const days = getDaysUntilScreening(lastTest, 'coracao', refDate);
    expect(days).not.toBeNull();
    expect(days!).toBeLessThan(0);
  });

  it('returns null for unknown category', () => {
    const lastTest = new Date('2024-01-01');
    const refDate = new Date('2024-06-01');
    expect(getDaysUntilScreening(lastTest, 'unknown', refDate)).toBeNull();
  });

  it('returns approximately correct days for 6-month interval', () => {
    const lastTest = new Date('2024-01-01');
    const refDate = new Date('2024-01-01'); // same day
    const days = getDaysUntilScreening(lastTest, 'metabolico', refDate);
    expect(days).not.toBeNull();
    // 6 months from Jan 1 is Jul 1 = ~182 days
    expect(days!).toBeGreaterThanOrEqual(180);
    expect(days!).toBeLessThanOrEqual(184);
  });
});
