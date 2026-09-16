import { loincToCode } from '@precisa-saude/fhir';

import type { AnchorResult } from './anchor.js';
import type { ExtractedBiomarker, ExtractionPayload } from './extraction-schema.js';

/**
 * Conferência da saída do modelo contra o contrato e contra a ancoragem.
 *
 * São duas checagens, e as duas são determinísticas:
 *
 * 1. **Forma.** O objeto bate com `LAB_EXTRACTION_SCHEMA`. Modelo que devolve
 *    texto solto, campo faltando ou tipo errado é recusado aqui, o que deixa
 *    a qualidade do modelo virar problema de cobertura e nunca de correção.
 * 2. **Ancoragem.** O código veio da lista que a varredura liberou. Código que
 *    o laudo não mencionou é descartado, que é a falha cara: um valor
 *    plausível pendurado num exame que não estava na página.
 *
 * A validação de citação, a correção de código contra nome impresso e a
 * política de confiança não moram aqui.
 *
 * Sem dependência de runtime além do `@precisa-saude/fhir`: a checagem de
 * forma é escrita à mão porque o schema é pequeno e o pacote não carrega
 * validador de JSON Schema.
 */

/** Por que uma grandeza foi recusada. */
export type RejectionReason = 'not-anchored' | 'schema';

export interface RejectedBiomarker {
  /** Mensagem legível, já em pt-BR, dizendo o que falhou. */
  detail: string;
  /** O que o modelo devolveu, sem alteração, para o consumidor poder logar. */
  raw: unknown;
  reason: RejectionReason;
}

export interface ExtractionValidationResult {
  accepted: ExtractedBiomarker[];
  /** Erros do objeto inteiro, quando nem dá para chegar nas grandezas. */
  errors: string[];
  rejected: RejectedBiomarker[];
  /** `true` quando o objeto tem forma válida, mesmo que toda grandeza caia. */
  valid: boolean;
}

export interface ValidateExtractionOptions {
  /**
   * Resultado da ancoragem sobre o mesmo texto que foi ao modelo. Sem ele a
   * checagem de ancoragem não roda e só a forma é conferida, que é um modo
   * deliberadamente mais fraco: serve para inspecionar saída de modelo sem o
   * laudo em mãos.
   */
  anchors?: AnchorResult;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Confere uma grandeza contra o schema. Devolve a lista de problemas. */
function schemaErrors(raw: unknown): string[] {
  if (!isRecord(raw)) return ['não é um objeto'];

  const errors: string[] = [];
  const { confidence, loinc, name, referenceMax, referenceMin, sourceText, unit, value } = raw;

  if (typeof name !== 'string' || name.length === 0) errors.push('`name` ausente ou vazio');
  if (typeof sourceText !== 'string' || sourceText.length === 0)
    errors.push('`sourceText` ausente ou vazio');
  if (typeof unit !== 'string') errors.push('`unit` ausente');
  if (typeof value !== 'number' && typeof value !== 'string') errors.push('`value` ausente');
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1)
    errors.push('`confidence` fora de 0..1');

  if (loinc !== undefined && loinc !== null && typeof loinc !== 'string')
    errors.push('`loinc` não é string nem null');

  for (const [key, v] of [
    ['referenceMax', referenceMax],
    ['referenceMin', referenceMin],
  ] as const) {
    if (v !== undefined && v !== null && typeof v !== 'number')
      errors.push(`\`${key}\` não é número nem null`);
  }

  return errors;
}

/**
 * O conjunto de códigos que a varredura liberou, pelos dois lados: o LOINC e o
 * código interno. O modelo devolve LOINC, mas aceitar o código interno também
 * evita recusar consumidor que prefira trabalhar com ele.
 */
function allowedKeys(anchors: AnchorResult): Set<string> {
  const allowed = new Set<string>();
  for (const match of anchors.matches) {
    allowed.add(match.code);
    if (match.loinc) allowed.add(match.loinc);
  }
  return allowed;
}

/**
 * Confere a saída de um modelo contra o contrato e, quando a ancoragem é
 * fornecida, contra a lista de códigos que a varredura liberou.
 */
export function validateExtraction(
  raw: unknown,
  options: ValidateExtractionOptions = {},
): ExtractionValidationResult {
  const { anchors } = options;

  if (!isRecord(raw)) {
    return { accepted: [], errors: ['a saída não é um objeto JSON'], rejected: [], valid: false };
  }
  if (!Array.isArray(raw.biomarkers)) {
    return {
      accepted: [],
      errors: ['`biomarkers` ausente ou não é lista'],
      rejected: [],
      valid: false,
    };
  }

  const allowed = anchors ? allowedKeys(anchors) : undefined;
  const accepted: ExtractedBiomarker[] = [];
  const rejected: RejectedBiomarker[] = [];

  for (const entry of raw.biomarkers) {
    const problems = schemaErrors(entry);
    if (problems.length > 0) {
      rejected.push({ detail: problems.join('; '), raw: entry, reason: 'schema' });
      continue;
    }

    const biomarker = entry as unknown as ExtractedBiomarker;

    if (allowed) {
      const loinc = biomarker.loinc ?? undefined;
      // Sem código não há o que conferir contra a ancoragem, e aceitar assim
      // deixaria passar justamente o caso que a varredura existe para pegar.
      if (!loinc) {
        rejected.push({
          detail: `"${biomarker.name}" veio sem código LOINC`,
          raw: entry,
          reason: 'not-anchored',
        });
        continue;
      }
      if (!allowed.has(loinc) && !allowed.has(loincToCode(loinc) ?? '')) {
        rejected.push({
          detail: `${loinc} não foi ancorado no texto de origem`,
          raw: entry,
          reason: 'not-anchored',
        });
        continue;
      }
    }

    accepted.push(biomarker);
  }

  return { accepted, errors: [], rejected, valid: true };
}

/** Só a lista de grandezas aprovadas, para quem não quer o relatório inteiro. */
export function acceptedBiomarkers(
  raw: unknown,
  options: ValidateExtractionOptions = {},
): ExtractedBiomarker[] {
  return validateExtraction(raw, options).accepted;
}

export type { ExtractedBiomarker, ExtractionPayload };
