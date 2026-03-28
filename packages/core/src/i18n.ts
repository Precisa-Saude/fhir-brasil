/**
 * Portuguese pluralization utility using native Intl.PluralRules
 * Provides automatic pluralization for common words used in the app
 */

const pluralRules = new Intl.PluralRules('pt-BR');

/**
 * Dictionary of Portuguese words with their plural forms
 * Key is the singular form, value is the plural form
 */
const dictionary: Record<string, string> = {
  // Common nouns
  arquivo: 'arquivos',
  biomarcador: 'biomarcadores',
  // Past participles (masculine)
  cadastrado: 'cadastrados',
  // Past participles (feminine)
  concluída: 'concluídas',
  confirmado: 'confirmados',
  convertido: 'convertidos',
  convidado: 'convidados',
  convite: 'convites',
  disponível: 'disponíveis',
  documento: 'documentos',
  enviado: 'enviados',
  exame: 'exames',
  excluída: 'excluídas',

  excluído: 'excluídos',
  // Verbs (3rd person)
  falhou: 'falharam',
  falta: 'faltam',
  ignorado: 'ignorados',
  item: 'itens',
  outro: 'outros',
  página: 'páginas',
  pendente: 'pendentes',
  registro: 'registros',
  removido: 'removidos',

  resultado: 'resultados',
  revisão: 'revisões',

  revogado: 'revogados',
  usuário: 'usuários',
};

/**
 * Get the plural form of a word from the dictionary
 * Falls back to adding 's' if word is not in dictionary
 */
const getPluralForm = (singular: string): string => {
  return dictionary[singular] ?? `${singular}s`;
};

/**
 * Returns the correct singular or plural form based on count
 * Uses Intl.PluralRules for proper locale-aware pluralization
 *
 * @example
 * plural(1, 'usuário') // 'usuário'
 * plural(3, 'usuário') // 'usuários'
 * plural(0, 'registro') // 'registros'
 */
export const plural = (count: number, word: string): string => {
  const rule = pluralRules.select(count);
  return rule === 'one' ? word : getPluralForm(word);
};

/**
 * Returns count with the correct singular or plural form
 *
 * @example
 * pluralCount(1, 'usuário') // '1 usuário'
 * pluralCount(3, 'usuário') // '3 usuários'
 */
export const pluralCount = (count: number, word: string): string => {
  return `${count} ${plural(count, word)}`;
};

/**
 * Returns the correct form for compound phrases (noun + adjective)
 * Both words are pluralized together
 *
 * @example
 * pluralPhrase(1, 'usuário', 'cadastrado') // 'usuário cadastrado'
 * pluralPhrase(3, 'usuário', 'cadastrado') // 'usuários cadastrados'
 * pluralPhrase(2, 'revisão', 'excluída') // 'revisões excluídas'
 */
export const pluralPhrase = (count: number, noun: string, adjective: string): string => {
  const rule = pluralRules.select(count);
  if (rule === 'one') {
    return `${noun} ${adjective}`;
  }
  return `${getPluralForm(noun)} ${getPluralForm(adjective)}`;
};

/**
 * Returns count with the correct compound phrase form
 *
 * @example
 * pluralPhraseCount(1, 'usuário', 'cadastrado') // '1 usuário cadastrado'
 * pluralPhraseCount(3, 'convite', 'enviado') // '3 convites enviados'
 */
export const pluralPhraseCount = (count: number, noun: string, adjective: string): string => {
  return `${count} ${pluralPhrase(count, noun, adjective)}`;
};
