import { describe, expect, it } from 'vitest';

import {
  AGE_BRACKETS,
  BODY_FAT_ZONES,
  T_SCORE_ZONES,
  ZONE_DEFS,
} from '../dexa-zone-data';
import type { BodyFatZone, TScoreZone } from '../dexa-zone-data';

describe('AGE_BRACKETS', () => {
  it('has 5 brackets', () => {
    expect(AGE_BRACKETS).toHaveLength(5);
  });

  it('covers ages from 18 to 99', () => {
    expect(AGE_BRACKETS[0]!.ageMin).toBe(18);
    expect(AGE_BRACKETS[AGE_BRACKETS.length - 1]!.ageMax).toBe(99);
  });

  it('each bracket has ageMin, ageMax, and label', () => {
    for (const bracket of AGE_BRACKETS) {
      expect(bracket).toHaveProperty('ageMin');
      expect(bracket).toHaveProperty('ageMax');
      expect(bracket).toHaveProperty('label');
      expect(bracket.ageMin).toBeLessThan(bracket.ageMax);
    }
  });
});

describe('ZONE_DEFS', () => {
  it('has 5 zones', () => {
    expect(ZONE_DEFS).toHaveLength(5);
  });

  it('each zone has color and label', () => {
    for (const zone of ZONE_DEFS) {
      expect(zone).toHaveProperty('color');
      expect(zone).toHaveProperty('label');
      expect(zone.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(zone.label).toBeTruthy();
    }
  });

  it('includes expected zone labels', () => {
    const labels = ZONE_DEFS.map((z) => z.label);
    expect(labels).toEqual(['Essencial', 'Atlético', 'Fitness', 'Média', 'Obeso']);
  });
});

describe('BODY_FAT_ZONES', () => {
  it('has entries for both M and F', () => {
    const maleZones = BODY_FAT_ZONES.filter((z) => z.sex === 'M');
    const femaleZones = BODY_FAT_ZONES.filter((z) => z.sex === 'F');
    expect(maleZones.length).toBeGreaterThan(0);
    expect(femaleZones.length).toBeGreaterThan(0);
  });

  it('has 25 zones per sex (5 age brackets x 5 zones)', () => {
    const maleZones = BODY_FAT_ZONES.filter((z) => z.sex === 'M');
    const femaleZones = BODY_FAT_ZONES.filter((z) => z.sex === 'F');
    expect(maleZones).toHaveLength(25);
    expect(femaleZones).toHaveLength(25);
  });

  it('each zone has all required fields', () => {
    for (const zone of BODY_FAT_ZONES) {
      expect(zone).toHaveProperty('ageMin');
      expect(zone).toHaveProperty('ageMax');
      expect(zone).toHaveProperty('fatPctMin');
      expect(zone).toHaveProperty('fatPctMax');
      expect(zone).toHaveProperty('sex');
      expect(zone).toHaveProperty('color');
      expect(zone).toHaveProperty('label');
    }
  });

  it('fatPctMin is less than fatPctMax for each zone', () => {
    for (const zone of BODY_FAT_ZONES) {
      expect(zone.fatPctMin).toBeLessThan(zone.fatPctMax);
    }
  });

  it('male zones have lower fat percentages than female zones for the same age bracket', () => {
    const maleZones = BODY_FAT_ZONES.filter((z) => z.sex === 'M');
    const femaleZones = BODY_FAT_ZONES.filter((z) => z.sex === 'F');

    // Compare the first age bracket (18-25) Essencial zone
    const maleEssential = maleZones.find(
      (z) => z.ageMin === 18 && z.label === 'Essencial',
    ) as BodyFatZone;
    const femaleEssential = femaleZones.find(
      (z) => z.ageMin === 18 && z.label === 'Essencial',
    ) as BodyFatZone;

    expect(maleEssential.fatPctMax).toBeLessThan(femaleEssential.fatPctMax);

    // Compare Obeso zone upper bounds
    const maleObese = maleZones.find(
      (z) => z.ageMin === 18 && z.label === 'Obeso',
    ) as BodyFatZone;
    const femaleObese = femaleZones.find(
      (z) => z.ageMin === 18 && z.label === 'Obeso',
    ) as BodyFatZone;

    expect(maleObese.fatPctMax).toBeLessThan(femaleObese.fatPctMax);
  });
});

describe('T_SCORE_ZONES', () => {
  it('has 3 zones', () => {
    expect(T_SCORE_ZONES).toHaveLength(3);
  });

  it('includes Normal, Osteopenia, and Osteoporose', () => {
    const labels = T_SCORE_ZONES.map((z) => z.label);
    expect(labels).toContain('Normal');
    expect(labels).toContain('Osteopenia');
    expect(labels).toContain('Osteoporose');
  });

  it('each zone has required fields', () => {
    for (const zone of T_SCORE_ZONES) {
      expect(zone).toHaveProperty('color');
      expect(zone).toHaveProperty('label');
      expect(zone).toHaveProperty('min');
      expect(zone).toHaveProperty('max');
      expect(zone.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('zones follow WHO T-score thresholds', () => {
    const normal = T_SCORE_ZONES.find((z) => z.label === 'Normal') as TScoreZone;
    const osteopenia = T_SCORE_ZONES.find((z) => z.label === 'Osteopenia') as TScoreZone;
    const osteoporose = T_SCORE_ZONES.find((z) => z.label === 'Osteoporose') as TScoreZone;

    expect(normal.min).toBe(-1.0);
    expect(osteopenia.max).toBe(-1.0);
    expect(osteopenia.min).toBe(-2.5);
    expect(osteoporose.max).toBe(-2.5);
  });
});
