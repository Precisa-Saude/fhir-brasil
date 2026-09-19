/**
 * Põe um limite solto do lado certo, lendo o sinal impresso no laudo.
 *
 * Laudo que publica "< 90" ou "até 90" no lugar de uma faixa não tem limite
 * inferior, e o número sozinho precisa cair em `referenceMax`. Os modelos
 * abertos erram esse lado de um jeito que a descrição do contrato não
 * consertou: medido no mesmo laudo da Labcorp, com o campo obrigatório, o
 * `ministral-3-8b` devolveu 90 em `referenceMin` e o `granite-4.1-8b` devolveu
 * 90 em `referenceMax`, e explicar o sinal na descrição não mudou nenhum dos
 * dois. Por isso a correção é determinística e não mais texto no contrato.
 *
 * A decisão sai do `sourceText`, que já é a linha impressa e já é obrigatório.
 * Sem sinal na linha nada muda: o que o modelo respondeu passa inteiro, porque
 * sem evidência impressa não há o que corrigir.
 *
 * O outro lado fica `null`, e não zero. Zero é um piso que o laudo não
 * publicou, e o contrato promete o que está impresso; quem desenha decide
 * como mostrar a ausência.
 */
import type { ExtractedBiomarker } from './extraction-schema.js';

/**
 * Sinal de limite superior: o valor fica abaixo do número.
 *
 * "até" fecha sem `\b` de propósito: `é` não é caractere de palavra, então não
 * existe fronteira entre ele e o espaço seguinte e o `\b` nunca casava. Quem
 * faz o papel de fronteira aqui é o `\s*$` que fecha o padrão.
 */
const ATE =
  /(?:<|≤|<=|menor\s+que|menor\s+ou\s+igual|abaixo\s+de|at[ée]|under|less\s+than)\s*[:=]?\s*$/iu;

/** Sinal de limite inferior: o valor fica acima do número. */
const ACIMA =
  /(?:>|≥|>=|maior\s+que|maior\s+ou\s+igual|acima\s+de|superior\s+a|over|greater\s+than)\s*[:=]?\s*$/iu;

/**
 * De que lado o número solto cai, lendo o que vem imediatamente antes dele.
 *
 * A linha é varrida por número, e cada um é comparado **por valor** com o
 * limite. Comparar grafia não servia: o laudo imprime "24,9" onde o JSON traz
 * 24.9, e imprime "90,0" onde o modelo devolveu 90.
 *
 * Achado o número, o que decide é o trecho anterior a ele, e por isso a âncora
 * `$` nos dois padrões: numa linha como "Apolipoprotein B 102 High mg/dL < 90"
 * quem manda é o `<` colado no 90, e não um `>` noutro ponto da linha.
 */
const NUMERO = /\d+(?:[.,]\d+)?/gu;

const ladoDoLimite = (sourceText: string, bound: number): 'max' | 'min' | undefined => {
  for (const achado of sourceText.matchAll(NUMERO)) {
    // Comparação por valor, e não por grafia. Laudo brasileiro imprime "24,9"
    // e o número chega como 24.9, e um laudo que escreve "90,0" é o mesmo 90
    // que o modelo devolveu. Procurar a grafia do JavaScript errava os dois.
    if (Number(achado[0].replace(',', '.')) !== bound) continue;

    // Só a primeira ocorrência decide. Com o mesmo número em dois sinais na
    // mesma linha o desempate é arbitrário de qualquer jeito, e parar aqui
    // deixa o comportamento fixo em vez de depender da ordem dos padrões.
    const antes = sourceText.slice(0, achado.index);
    if (ATE.test(antes)) return 'max';
    if (ACIMA.test(antes)) return 'min';
    return undefined;
  }

  return undefined;
};

/**
 * Corrige o lado de uma grandeza que veio com um limite só.
 *
 * Devolve a mesma grandeza quando não há o que decidir: faixa com as duas
 * pontas, faixa sem nenhuma, ou linha sem sinal impresso.
 */
export const placeSingleBound = (biomarker: ExtractedBiomarker): ExtractedBiomarker => {
  const { referenceMax, referenceMin, sourceText } = biomarker;

  const temMin = typeof referenceMin === 'number';
  const temMax = typeof referenceMax === 'number';
  // Os dois preenchidos com o mesmo número é o outro jeito de o modelo errar:
  // ele não soube escolher e repetiu. Conta como limite solto.
  const repetido = temMin && temMax && referenceMin === referenceMax;
  if (!repetido && temMin === temMax) return biomarker;

  // Com as duas pontas repetidas o `temMin` é verdadeiro e o número sai do
  // `referenceMin`, que é o mesmo dos dois lados. Dito aqui porque a expressão
  // sozinha parece escolher um lado quando na verdade tanto faz.
  const bound = (temMin ? referenceMin : referenceMax) as number;
  const lado = ladoDoLimite(sourceText, bound);
  if (lado === undefined) return biomarker;

  return lado === 'max'
    ? { ...biomarker, referenceMax: bound, referenceMin: null }
    : { ...biomarker, referenceMax: null, referenceMin: bound };
};
