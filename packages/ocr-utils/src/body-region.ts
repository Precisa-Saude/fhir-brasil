/**
 * Qualificador de região do corpo antes de um nome de composição corporal.
 * Separado do `anchor.ts` pelo mesmo motivo do `anchor-lexicon.ts`: manter o
 * arquivo do algoritmo legível.
 */

/**
 * Medidas de corpo inteiro da composição corporal, cujo nome genérico ("Fat
 * Mass", "Total Mass", "Lean Mass") reaparece dentro do rótulo de uma região.
 *
 * Na tabela de equilíbrio muscular do DEXA as linhas se chamam "Arms Total",
 * "Right Arm" e "Arms Difference", e o modelo devolve "Arms Difference Fat
 * Mass" ou "Arms Total Mass". Sem guarda, o "fat mass" de dentro desses rótulos
 * ancorava `FatMass`, que é a gordura do corpo todo.
 */
const WHOLE_BODY_COMPOSITION_CODES = new Set([
  'BMC',
  'BodyFatPct',
  'FatFreeMass',
  'FatMass',
  'LeanMass',
  'TotalMass',
]);

/**
 * Códigos que medem os dois membros somados. Precedidos de um lado só ("Right
 * Arm Fat Mass"), o rótulo fala de um braço, e o código, dos dois.
 */
const LIMB_PAIR_CODES = new Set(['ArmsFatMass', 'ArmsLeanMass', 'LegsFatMass', 'LegsLeanMass']);

/** Região do corpo, normalizada (sem acento, minúscula). */
const BODY_REGION = String.raw`(?:arms?|legs?|trunk|head|android|gynoid|bracos?|pernas?|tronco|cabeca|androide|ginoide)`;

/** Lado do corpo, normalizado. */
const BODY_SIDE = String.raw`(?:right|left|direit[oa]|esquerd[oa])`;

/**
 * Texto que termina numa região do corpo, com qualificadores de linha da
 * tabela no meio ("arms ", "arms total ", "right arm ", "arms difference ").
 * Testado contra o trecho da linha que vem antes do nome casado.
 */
const ENDS_WITH_BODY_REGION = new RegExp(
  String.raw`(?<![\p{L}\p{N}])${BODY_REGION}(?: (?:total|difference|diferenca|${BODY_SIDE}))* ?$`,
  'u',
);

/** Texto que termina num lado do corpo ("right ", "left "). */
const ENDS_WITH_BODY_SIDE = new RegExp(String.raw`(?<![\p{L}\p{N}])${BODY_SIDE} ?$`, 'u');

/**
 * O nome casou dentro do rótulo de uma região ou de um lado do corpo, e o
 * código mede outra coisa.
 *
 * Na densitometria, "Fat Mass" é a gordura do corpo todo, e "Arms Difference
 * Fat Mass" é a diferença entre os braços: o qualificador vem antes do nome, e
 * o casamento por palavra inteira não o enxerga. Do mesmo jeito, "Arm Fat
 * Mass" é sinônimo de `ArmsFatMass`, os dois braços, e em "Right Arm Fat Mass"
 * o rótulo é de um braço só.
 *
 * Só olha o que vem imediatamente antes do nome, na mesma linha. Uma região
 * em outro ponto da linha (o cabeçalho de uma tabela, uma coluna vizinha) não
 * qualifica o nome.
 */
export function qualifiedByBodyRegion(code: string, before: string): boolean {
  if (WHOLE_BODY_COMPOSITION_CODES.has(code)) {
    return ENDS_WITH_BODY_REGION.test(before);
  }
  if (LIMB_PAIR_CODES.has(code)) {
    return ENDS_WITH_BODY_SIDE.test(before);
  }
  return false;
}

/** Medidas de massa do corpo inteiro: as de `WHOLE_BODY_COMPOSITION_CODES` menos o percentual. */
const WHOLE_BODY_MASS_CODES = new Set(
  [...WHOLE_BODY_COMPOSITION_CODES].filter((code) => code !== 'BodyFatPct'),
);

/**
 * Texto que começa num percentual: o sinal sozinho, entre parênteses, ou
 * colado a um número ("%", "(%)", "23.1%", "23,1 %").
 */
const STARTS_WITH_PERCENT = /^ ?(?:\( ?% ?\)|%|[-+]?\d+(?:[.,]\d+)? ?%)/;

/**
 * O nome de uma massa do corpo inteiro casou, e o que vem logo depois dele é
 * um percentual.
 *
 * A tabela de tendência da densitometria Live Lean tem duas colunas "Total
 * Fat", uma em "(%)" e outra em "(lbs)", e só a segunda é a massa de gordura.
 * A citação do percentual chega como "Total Fat 23.1%", e sem esta guarda o
 * "Total Fat" ancorava `FatMass` nela. O percentual tem nome próprio no
 * catálogo quando o laudo o escreve colado ao rótulo ("Total Fat %", "Total
 * Fat (%)"), e o nome mais longo já ganha; esta guarda cobre a citação em que o
 * sinal só aparece no número.
 *
 * Só olha o que vem imediatamente depois do nome, na mesma linha.
 */
export function followedByPercent(code: string, after: string): boolean {
  return WHOLE_BODY_MASS_CODES.has(code) && STARTS_WITH_PERCENT.test(after);
}
