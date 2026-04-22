/**
 * Tipos compartilhados pelo validador de perfis FHIR.
 *
 * Espelham o subset de `OperationOutcome` do FHIR R4 que retornamos
 * em respostas de validação. Não pretendem cobrir o spec inteiro.
 */

export type IssueSeverity = 'fatal' | 'error' | 'warning' | 'information';

export interface ValidationIssue {
  /** Código FHIR R4 do tipo do problema (ex: 'required', 'invariant', 'invalid'). */
  code: string;
  /** Mensagem em pt-BR explicando o problema. */
  diagnostics: string;
  /**
   * FHIRPath até o elemento problemático
   * (ex: `Bundle.entry[0].resource.identifier`).
   */
  expression?: string[];
  /** Caminho legível em texto, equivalente a `expression`. */
  location?: string[];
  severity: IssueSeverity;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  /** True quando não há issues `error` ou `fatal`. */
  valid: boolean;
}

export interface ValidationContext {
  /** Caminho do recurso na hierarquia (`Bundle.entry[0].resource`, etc.). */
  path: string;
}
