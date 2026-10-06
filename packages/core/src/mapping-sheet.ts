/**
 * A ficha de um mapeamento LOINC no formato da planilha de um mapeador: nome
 * local, unidade, material, método, candidatos com os eixos, escolhido,
 * rejeitados, grupos, revisor e versão. É o que `fhir-bio decision` imprime.
 */
import { type BiomarkerDefinition, getDefinitionByCode, getDefinitionByLoinc } from './biomarkers';
import { getLoincEntry, type LoincEntry } from './loinc-axes';
import {
  getMappingDecision,
  getNoLoincDecision,
  type MappingDecision,
  type NoLoincDecision,
} from './mapping-decisions';

/** Um código candidato com os eixos que o snapshot guarda dele. */
export interface MappingCandidate {
  axes?: LoincEntry;
  loinc: string;
  role: 'chosen' | 'method-variant' | 'rejected';
  /** Pista impressa da variante, ou o motivo da rejeição. */
  why?: string;
}

/** A ficha de um mapeamento, no formato da planilha de um mapeador. */
export interface MappingSheet {
  candidates: MappingCandidate[];
  code: string;
  decision?: MappingDecision;
  /** LOINC Groups do código escolhido. */
  groups: Record<string, string>;
  localNames: string[];
  method: string | null;
  noLoinc?: NoLoincDecision;
  specimen: string | null;
  unit?: string;
}

/** Aceita o código interno ou qualquer LOINC que resolva para o biomarcador. */
export function getMappingSheet(codeOrLoinc: string): MappingSheet | undefined {
  const def: BiomarkerDefinition | undefined =
    getDefinitionByCode(codeOrLoinc) ?? getDefinitionByLoinc(codeOrLoinc);
  if (!def) return undefined;

  const decision = getMappingDecision(def.code);
  const chosen = def.loinc ? getLoincEntry(def.loinc) : undefined;
  const candidates: MappingCandidate[] = [];
  if (def.loinc) candidates.push({ axes: chosen, loinc: def.loinc, role: 'chosen' });
  for (const v of def.methodVariants ?? []) {
    const cues = [...v.cues.pt, ...v.cues.en];
    candidates.push({
      axes: getLoincEntry(v.loinc),
      loinc: v.loinc,
      role: 'method-variant',
      why: cues.length ? cues.join('; ') : undefined,
    });
  }
  for (const s of decision?.siblingsRejected ?? []) {
    candidates.push({
      axes: getLoincEntry(s.loinc),
      loinc: s.loinc,
      role: 'rejected',
      why: s.reason,
    });
  }

  return {
    candidates,
    code: def.code,
    decision,
    groups: chosen?.groups ?? {},
    localNames: def.names.pt,
    method: chosen?.method ?? null,
    noLoinc: getNoLoincDecision(def.code),
    specimen: chosen?.system ?? null,
    unit: def.unit,
  };
}
