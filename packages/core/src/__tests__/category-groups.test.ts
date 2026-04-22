import { describe, expect, it } from 'vitest';

import { BIOMARKER_DEFINITIONS } from '../biomarkers';
import {
  CATEGORY_GROUPS,
  getCategoryGroup,
  listMappedSubcategories,
} from '../category-groups';

describe('agrupamento de categorias (10 buckets)', () => {
  it('expõe exatamente 10 grupos', () => {
    expect(Object.keys(CATEGORY_GROUPS)).toHaveLength(10);
  });

  it('cada grupo tem rótulos pt/en não vazios', () => {
    for (const group of Object.values(CATEGORY_GROUPS)) {
      expect(group.pt).not.toBe('');
      expect(group.en).not.toBe('');
      expect(group.subcategories.length).toBeGreaterThan(0);
    }
  });

  it('cobre todas as 20 sub-categorias usadas em BIOMARKER_DEFINITIONS', () => {
    const usedSubcategories = new Set<string>();
    for (const def of BIOMARKER_DEFINITIONS) {
      const cats = Array.isArray(def.category) ? def.category : [def.category];
      for (const cat of cats) {
        usedSubcategories.add(cat);
      }
    }
    const mapped = new Set(listMappedSubcategories());
    for (const cat of usedSubcategories) {
      expect(mapped.has(cat), `sub-categoria não mapeada: ${cat}`).toBe(true);
    }
  });

  it('nenhuma sub-categoria pertence a dois grupos', () => {
    const seen = new Set<string>();
    for (const group of Object.values(CATEGORY_GROUPS)) {
      for (const sub of group.subcategories) {
        expect(seen.has(sub), `sub-categoria duplicada: ${sub}`).toBe(false);
        seen.add(sub);
      }
    }
  });

  it('getCategoryGroup retorna undefined para slug desconhecido', () => {
    expect(getCategoryGroup('slug-inexistente')).toBeUndefined();
  });

  it('getCategoryGroup mapeia exemplos conhecidos corretamente', () => {
    expect(getCategoryGroup('coracao')).toBe('cardiovascular');
    expect(getCategoryGroup('pancreas')).toBe('metabolico-endocrino');
    expect(getCategoryGroup('saude-feminina')).toBe('saude-reprodutiva');
    expect(getCategoryGroup('toxinas-ambientais')).toBe('nutricional-ambiental');
  });
});
