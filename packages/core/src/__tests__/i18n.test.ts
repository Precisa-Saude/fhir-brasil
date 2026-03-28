import { describe, expect, it } from 'vitest';

import { plural, pluralCount, pluralPhrase, pluralPhraseCount } from '../i18n';

describe('plural', () => {
  it('returns singular form for count of 1', () => {
    expect(plural(1, 'biomarcador')).toBe('biomarcador');
  });

  it('returns plural form for count greater than 1', () => {
    expect(plural(3, 'biomarcador')).toBe('biomarcadores');
  });

  it('returns singular form for count of 0 (pt-BR treats 0 as singular)', () => {
    expect(plural(0, 'exame')).toBe('exame');
  });

  it('handles irregular plural (item -> itens)', () => {
    expect(plural(1, 'item')).toBe('item');
    expect(plural(2, 'item')).toBe('itens');
  });

  it('handles irregular plural (revisão -> revisões)', () => {
    expect(plural(1, 'revisão')).toBe('revisão');
    expect(plural(4, 'revisão')).toBe('revisões');
  });

  it('falls back to adding "s" for unknown words', () => {
    expect(plural(2, 'teste')).toBe('testes');
  });

  it('returns singular for unknown words with count 1', () => {
    expect(plural(1, 'teste')).toBe('teste');
  });
});

describe('pluralCount', () => {
  it('returns count with singular form', () => {
    expect(pluralCount(1, 'resultado')).toBe('1 resultado');
  });

  it('returns count with plural form', () => {
    expect(pluralCount(5, 'resultado')).toBe('5 resultados');
  });

  it('returns count with singular form for zero (pt-BR treats 0 as singular)', () => {
    expect(pluralCount(0, 'arquivo')).toBe('0 arquivo');
  });
});

describe('pluralPhrase', () => {
  it('returns singular noun and adjective for count of 1', () => {
    expect(pluralPhrase(1, 'usuário', 'cadastrado')).toBe('usuário cadastrado');
  });

  it('returns plural noun and adjective for count greater than 1', () => {
    expect(pluralPhrase(3, 'usuário', 'cadastrado')).toBe('usuários cadastrados');
  });

  it('handles feminine forms', () => {
    expect(pluralPhrase(2, 'revisão', 'excluída')).toBe('revisões excluídas');
  });

  it('returns singular for count of 0 (pt-BR treats 0 as singular)', () => {
    expect(pluralPhrase(0, 'convite', 'enviado')).toBe('convite enviado');
  });
});

describe('pluralPhraseCount', () => {
  it('returns count with singular phrase', () => {
    expect(pluralPhraseCount(1, 'convite', 'enviado')).toBe('1 convite enviado');
  });

  it('returns count with plural phrase', () => {
    expect(pluralPhraseCount(2, 'convite', 'enviado')).toBe('2 convites enviados');
  });

  it('returns count with plural phrase for larger numbers', () => {
    expect(pluralPhraseCount(10, 'usuário', 'confirmado')).toBe('10 usuários confirmados');
  });
});
