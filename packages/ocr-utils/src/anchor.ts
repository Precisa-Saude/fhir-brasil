/**
 * OCR Anchor — Biomarker text anchoring
 *
 * Scans OCR text for biomarker names BEFORE sending to LLM.
 * This prevents hallucination by constraining what biomarkers
 * the LLM is allowed to extract.
 */

import {
  type BiomarkerSearchPattern,
  generateFilteredLLMReference,
  getAllSearchPatterns,
} from '@fhir-brasil/core';

export interface AnchorMatch {
  code: string;
  confidence: number;
  loinc?: string;
  matchedName: string;
  position: number;
}

export interface AnchorResult {
  filteredReference: string;
  matches: AnchorMatch[];
  stats: {
    totalPatterns: number;
    matchedCount: number;
    scanTimeMs: number;
  };
}

/**
 * Normalize text for comparison:
 * - Removes diacritics (ã→a, ç→c, é→e)
 * - Converts to lowercase
 * - Normalizes whitespace
 */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const UNAMBIGUOUS_SHORT_NAMES = new Set([
  'hdl', 'ldl', 'lh', 'tsh', 'crp', 'pcr', 'ggt', 'alt', 'ast', 'bun',
  'wbc', 'rbc', 'mcv', 'mch', 'rdw', 'mpv', 'psa', 'fsh', 'hba1c', 'egfr',
  'acr', 'esr', 'vhs', 'bmc', 'bmd', 'vat', 'dxa', 'dmo', 'cmo', 'ffm',
  'lbm', 'mlg', 'tav',
]);

type PatternEntry = { original: string; code: string; loinc?: string };

let cachedPatterns: BiomarkerSearchPattern[] | null = null;
let cachedNormalized: Map<string, PatternEntry[]> | null = null;

function getPatterns(): BiomarkerSearchPattern[] {
  if (!cachedPatterns) {
    cachedPatterns = getAllSearchPatterns();
  }
  return cachedPatterns;
}

function getNormalizedPatterns(): Map<string, PatternEntry[]> {
  if (!cachedNormalized) {
    const patterns = getPatterns();
    const map = new Map<string, PatternEntry[]>();
    for (const pattern of patterns) {
      for (const name of pattern.names) {
        const normalized = normalize(name);
        const existing = map.get(normalized) || [];
        existing.push({
          code: pattern.code,
          ...(pattern.loinc && { loinc: pattern.loinc }),
          original: name,
        });
        map.set(normalized, existing);
      }
    }
    cachedNormalized = map;
  }
  return cachedNormalized;
}

/**
 * Find all biomarker names present in OCR text.
 * Uses exact string matching on normalized text.
 * Returns unique matches (same biomarker won't be matched twice).
 */
export function findBiomarkersInText(ocrText: string): AnchorResult {
  const startTime = Date.now();
  const normalizedText = normalize(ocrText);
  const matchedCodes = new Set<string>();
  const matches: AnchorMatch[] = [];
  const normalizedPatterns = getNormalizedPatterns();

  for (const [normalizedName, entries] of normalizedPatterns) {
    if (normalizedName.length < 3 && !UNAMBIGUOUS_SHORT_NAMES.has(normalizedName)) {
      continue;
    }

    let position = -1;
    if (normalizedName.length <= 4) {
      const regex = new RegExp(`\\b${normalizedName}\\b`);
      const match = regex.exec(normalizedText);
      if (match) {
        position = match.index;
      }
    } else {
      position = normalizedText.indexOf(normalizedName);
    }

    if (position !== -1) {
      for (const entry of entries) {
        if (!matchedCodes.has(entry.code)) {
          matchedCodes.add(entry.code);
          matches.push({
            code: entry.code,
            confidence: 1.0,
            loinc: entry.loinc,
            matchedName: entry.original,
            position,
          });
        }
      }
    }
  }

  const scanTimeMs = Date.now() - startTime;
  const matchedCodesArray = Array.from(matchedCodes);

  return {
    filteredReference: generateFilteredLLMReference(matchedCodesArray),
    matches,
    stats: {
      matchedCount: matches.length,
      scanTimeMs,
      totalPatterns: getPatterns().length,
    },
  };
}

/**
 * Get the list of matched biomarker codes from an anchor result.
 */
export function getMatchedCodes(result: AnchorResult): string[] {
  return result.matches.map((m) => m.code);
}
