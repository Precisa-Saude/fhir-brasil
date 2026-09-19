/**
 * Um limite solto precisa cair do lado que o laudo imprimiu, e quem decide é a
 * linha, não o modelo. Medido: com o campo obrigatório, o `ministral-3-8b`
 * devolve 90 em `referenceMin` para uma linha que diz "< 90", e explicar o
 * sinal na descrição do contrato não mudou o resultado.
 */
import { describe, expect, it } from 'vitest';

import type { ExtractedBiomarker } from '../extraction-schema.js';
import { placeSingleBound } from '../reference-bound.js';

const apo = (extra: Partial<ExtractedBiomarker>): ExtractedBiomarker => ({
  confidence: 0.9,
  loinc: '1884-6',
  name: 'Apolipoprotein B',
  sourceText: 'Apolipoprotein B B, 02 102 High mg/dL <90',
  unit: 'mg/dL',
  value: 102,
  ...extra,
});

describe('placeSingleBound', () => {
  it('move para o teto o número que o laudo imprimiu com "<"', () => {
    const r = placeSingleBound(apo({ referenceMax: null, referenceMin: 90 }));

    expect(r.referenceMax).toBe(90);
    expect(r.referenceMin).toBeNull();
  });

  it('deixa quieto o que já estava do lado certo', () => {
    const r = placeSingleBound(apo({ referenceMax: 90, referenceMin: null }));

    expect(r.referenceMax).toBe(90);
    expect(r.referenceMin).toBeNull();
  });

  // O outro jeito de errar: o modelo não escolheu e repetiu o número nos dois.
  it('desfaz o limite repetido nas duas pontas', () => {
    const r = placeSingleBound(apo({ referenceMax: 90, referenceMin: 90 }));

    expect(r.referenceMax).toBe(90);
    expect(r.referenceMin).toBeNull();
  });

  it('">" manda o número para o piso', () => {
    const r = placeSingleBound(
      apo({
        name: 'HDL',
        referenceMax: 40,
        referenceMin: null,
        sourceText: 'HDL Cholesterol 52 mg/dL >40',
      }),
    );

    expect(r.referenceMin).toBe(40);
    expect(r.referenceMax).toBeNull();
  });

  it.each([
    ['maior que', 'Ferritina 210 ng/mL maior que 30', 'min'],
    ['acima de', 'Ferritina 210 ng/mL acima de 30', 'min'],
    ['menor que', 'Ferritina 210 ng/mL menor que 30', 'max'],
    ['até', 'Ferritina 210 ng/mL até 30', 'max'],
  ])('lê o sinal escrito por extenso: %s', (_label, sourceText, lado) => {
    const r = placeSingleBound(
      apo({ name: 'Ferritina', referenceMax: null, referenceMin: 30, sourceText }),
    );

    expect(lado === 'min' ? r.referenceMin : r.referenceMax).toBe(30);
    expect(lado === 'min' ? r.referenceMax : r.referenceMin).toBeNull();
  });

  it('faixa com as duas pontas não é mexida', () => {
    const r = placeSingleBound(
      apo({
        name: 'Glicose',
        referenceMax: 99,
        referenceMin: 70,
        sourceText: 'Glicose 88 mg/dL 70-99',
      }),
    );

    expect(r.referenceMin).toBe(70);
    expect(r.referenceMax).toBe(99);
  });

  it('sem limite nenhum não inventa lado', () => {
    const r = placeSingleBound(apo({ referenceMax: null, referenceMin: null }));

    expect(r.referenceMin).toBeNull();
    expect(r.referenceMax).toBeNull();
  });

  // Sem sinal impresso não há evidência, e o palpite do modelo fica de pé.
  it('linha sem sinal deixa a resposta do modelo como veio', () => {
    const r = placeSingleBound(
      apo({ referenceMax: null, referenceMin: 90, sourceText: 'Apolipoprotein B 102 mg/dL 90' }),
    );

    expect(r.referenceMin).toBe(90);
    expect(r.referenceMax).toBeNull();
  });

  // Um sinal noutro ponto da linha não pode decidir pelo número do limite.
  it('olha o sinal colado no número, e não qualquer um da linha', () => {
    const r = placeSingleBound(
      apo({
        referenceMax: null,
        referenceMin: 90,
        sourceText: 'ApoB >130 Very High ... Moderate Risk <90',
      }),
    );

    expect(r.referenceMax).toBe(90);
    expect(r.referenceMin).toBeNull();
  });

  // Laudo brasileiro imprime vírgula decimal, e o número chega do JSON com
  // ponto. Procurar só a grafia do JavaScript não achava nada, e a correção
  // não acontecia justamente nos laudos em português.
  it('acha o número impresso com vírgula decimal', () => {
    const r = placeSingleBound(
      apo({
        name: 'Insulina',
        referenceMax: null,
        referenceMin: 24.9,
        sourceText: 'Insulina 3,4 uUI/mL menor que 24,9',
      }),
    );

    expect(r.referenceMax).toBe(24.9);
    expect(r.referenceMin).toBeNull();
  });

  it('o ponto decimal continua valendo', () => {
    const r = placeSingleBound(
      apo({ referenceMax: null, referenceMin: 24.9, sourceText: 'Insulin 3.4 uIU/mL < 24.9' }),
    );

    expect(r.referenceMax).toBe(24.9);
  });

  it.each([
    ['dois-pontos', 'Ferritina 210 ng/mL menor que: 30'],
    ['igual', 'Ferritina 210 ng/mL menor que = 30'],
  ])('atravessa a pontuação entre o sinal e o número: %s', (_label, sourceText) => {
    const r = placeSingleBound(
      apo({ name: 'Ferritina', referenceMax: null, referenceMin: 30, sourceText }),
    );

    expect(r.referenceMax).toBe(30);
  });

  // O número do limite aparece inteiro dentro de outro: a fronteira explícita
  // é o que impede "190" de responder por 90, e "90.5" de responder por 90.
  it.each([
    ['número maior que contém o limite', 'ApoB 102 mg/dL 190'],
    ['decimal que começa com o limite', 'ApoB 102 mg/dL < 90.5'],
  ])('não casa com %s', (_label, sourceText) => {
    const r = placeSingleBound(apo({ referenceMax: null, referenceMin: 90, sourceText }));

    expect(r.referenceMin).toBe(90);
    expect(r.referenceMax).toBeNull();
  });

  // Documenta o desempate: com o mesmo número em dois sinais diferentes vale a
  // primeira ocorrência. É arbitrário, e é melhor estar fixado do que virar
  // surpresa numa mudança de regex.
  it('com o mesmo número em dois sinais, vale o primeiro', () => {
    const r = placeSingleBound(
      apo({ referenceMax: null, referenceMin: 90, sourceText: 'X > 90 e depois Y < 90' }),
    );

    expect(r.referenceMin).toBe(90);
    expect(r.referenceMax).toBeNull();
  });
});
