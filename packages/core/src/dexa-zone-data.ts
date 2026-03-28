/**
 * Structured zone data for DEXA body composition and bone density charts.
 *
 * Body fat zones derived from Gallagher et al. Am J Clin Nutr 2000;72:694-701 (PMID: 10966886)
 * and ACSM Guidelines for Exercise Testing, 11th Ed (2021).
 *
 * T-Score zones from WHO criteria (Kanis JA, Osteoporos Int, PMID: 7696835).
 */

export interface BodyFatZone {
  ageMax: number;
  ageMin: number;
  color: string;
  fatPctMax: number;
  fatPctMin: number;
  label: string;
  sex: 'F' | 'M';
}

interface AgeBracket {
  ageMax: number;
  ageMin: number;
  label: string;
}

const AGE_BRACKETS: AgeBracket[] = [
  { ageMax: 25, ageMin: 18, label: '18-25' },
  { ageMax: 35, ageMin: 26, label: '26-35' },
  { ageMax: 45, ageMin: 36, label: '36-45' },
  { ageMax: 55, ageMin: 46, label: '46-55' },
  { ageMax: 99, ageMin: 56, label: '56+' },
];

// Zone boundaries per age bracket for men: [essential, athletic, fitness, average, obese]
// Each value is the upper bound of the zone
const MALE_ZONES: number[][] = [
  [5, 10, 20, 25, 40],
  [5, 11, 21, 26, 40],
  [5, 12, 22, 27, 40],
  [5, 13, 23, 28, 40],
  [5, 14, 24, 29, 40],
];

const FEMALE_ZONES: number[][] = [
  [13, 18, 28, 32, 45],
  [13, 18, 29, 33, 45],
  [13, 19, 30, 34, 45],
  [13, 20, 31, 35, 45],
  [13, 20, 32, 36, 45],
];

interface ZoneDefinition {
  color: string;
  label: string;
}

const ZONE_DEFS: ZoneDefinition[] = [
  { color: '#3b82f6', label: 'Essencial' },
  { color: '#06b6d4', label: 'Atlético' },
  { color: '#22c55e', label: 'Fitness' },
  { color: '#eab308', label: 'Média' },
  { color: '#ef4444', label: 'Obeso' },
];

function buildZones(sex: 'F' | 'M', zoneData: number[][]): BodyFatZone[] {
  const zones: BodyFatZone[] = [];
  for (let i = 0; i < AGE_BRACKETS.length; i++) {
    const bracket = AGE_BRACKETS[i]!;
    const b = zoneData[i]!;
    zones.push({
      ...bracket,
      color: ZONE_DEFS[0]!.color,
      fatPctMax: b[0]!,
      fatPctMin: 0,
      label: ZONE_DEFS[0]!.label,
      sex,
    });
    zones.push({
      ...bracket,
      color: ZONE_DEFS[1]!.color,
      fatPctMax: b[1]!,
      fatPctMin: b[0]!,
      label: ZONE_DEFS[1]!.label,
      sex,
    });
    zones.push({
      ...bracket,
      color: ZONE_DEFS[2]!.color,
      fatPctMax: b[2]!,
      fatPctMin: b[1]!,
      label: ZONE_DEFS[2]!.label,
      sex,
    });
    zones.push({
      ...bracket,
      color: ZONE_DEFS[3]!.color,
      fatPctMax: b[3]!,
      fatPctMin: b[2]!,
      label: ZONE_DEFS[3]!.label,
      sex,
    });
    zones.push({
      ...bracket,
      color: ZONE_DEFS[4]!.color,
      fatPctMax: b[4]!,
      fatPctMin: b[3]!,
      label: ZONE_DEFS[4]!.label,
      sex,
    });
  }
  return zones;
}

export const BODY_FAT_ZONES: BodyFatZone[] = [
  ...buildZones('M', MALE_ZONES),
  ...buildZones('F', FEMALE_ZONES),
];

export { AGE_BRACKETS, ZONE_DEFS };

export interface TScoreZone {
  color: string;
  label: string;
  max: number;
  min: number;
}

export const T_SCORE_ZONES: TScoreZone[] = [
  { color: '#22c55e', label: 'Normal', max: 4, min: -1.0 },
  { color: '#eab308', label: 'Osteopenia', max: -1.0, min: -2.5 },
  { color: '#ef4444', label: 'Osteoporose', max: -2.5, min: -5 },
];
