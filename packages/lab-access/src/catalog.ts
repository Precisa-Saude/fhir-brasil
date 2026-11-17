/**
 * Alcance de um preço do catálogo (seção 5.5.2 e perfil
 * `br-lab-charge-item-definition`).
 *
 * O FHIR R4 não tem parâmetro de busca para contexto de uso com referência,
 * então o receptor sincroniza o catálogo e filtra localmente. Para isso ele
 * precisa ler os três alcances que o perfil prevê, e não pode supor que um
 * preço com contexto vale para todas as unidades.
 */

import type { FHIRChargeItemDefinition } from './fhir-types';

/** Sistema dos tipos de contexto de uso do FHIR R4, onde está `venue`. */
export const USAGE_CONTEXT_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/usage-context-type';

/** Sistema de códigos do guia para o contexto de marca do preço. */
export const LAB_PRICE_CONTEXT_SYSTEM = 'https://fhir-brasil.dev.br/CodeSystem/lab-price-context';

export interface ChargeItemScope {
  /** Referências às `Organization` das marcas em que o preço vale (`useContext` `brand`). */
  brands: string[];
  /** Municípios em que o preço vale (`jurisdiction`), como `system` e `code`. */
  jurisdictions: { code: string; system: string }[];
  /**
   * Contextos que o cliente não sabe interpretar: tipo desconhecido, ou
   * `venue` e `brand` sem referência, ou município sem código. Com qualquer um
   * deles, o preço não é dado como geral.
   */
  unrecognizedContexts: number;
  /** `true` só quando o preço não traz contexto nenhum: aí vale para todas as unidades. */
  unrestricted: boolean;
  /** Referências aos `Location` de unidade ou região em que o preço vale (`useContext` `venue`). */
  venues: string[];
}

/** Lê unidade ou região, marca e municípios de um `ChargeItemDefinition`. */
export function chargeItemScope(definition: FHIRChargeItemDefinition): ChargeItemScope {
  const scope: ChargeItemScope = {
    brands: [],
    jurisdictions: [],
    unrecognizedContexts: 0,
    unrestricted: false,
    venues: [],
  };

  for (const context of definition.useContext ?? []) {
    const { code, system } = context?.code ?? {};
    const reference = context?.valueReference?.reference;
    if (system === USAGE_CONTEXT_TYPE_SYSTEM && code === 'venue' && reference) {
      scope.venues.push(reference);
    } else if (system === LAB_PRICE_CONTEXT_SYSTEM && code === 'brand' && reference) {
      scope.brands.push(reference);
    } else {
      scope.unrecognizedContexts += 1;
    }
  }

  for (const jurisdiction of definition.jurisdiction ?? []) {
    const codings = (jurisdiction?.coding ?? []).filter(
      (coding): coding is { code: string; system: string } =>
        typeof coding?.system === 'string' && typeof coding.code === 'string',
    );
    if (codings.length === 0) scope.unrecognizedContexts += 1;
    for (const { code, system } of codings) scope.jurisdictions.push({ code, system });
  }

  scope.unrestricted =
    scope.venues.length === 0 &&
    scope.brands.length === 0 &&
    scope.jurisdictions.length === 0 &&
    scope.unrecognizedContexts === 0;
  return scope;
}
