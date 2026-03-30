import { describe, expect, it } from 'vitest';

import { biomarkerRangeDefinitions } from '../reference-ranges';
import { extractSourceKey, SOURCE_REGISTRY } from '../sources';

describe('SOURCE_REGISTRY', () => {
  it('deve conter ao menos uma fonte registrada', () => {
    expect(Object.keys(SOURCE_REGISTRY).length).toBeGreaterThan(0);
  });

  it('cada fonte deve ter chave, citação ABNT e key consistente', () => {
    for (const [key, ref] of Object.entries(SOURCE_REGISTRY)) {
      expect(ref.key).toBe(key);
      expect(ref.abnt).toBeTruthy();
      expect(ref.abnt.length).toBeGreaterThan(10);
    }
  });
});

describe('extractSourceKey', () => {
  it('deve extrair chave sem localizador', () => {
    expect(extractSourceKey('sbc-lipids-2017')).toBe('sbc-lipids-2017');
  });

  it('deve extrair chave removendo localizador', () => {
    expect(extractSourceKey('sbc-lipids-2017:p15')).toBe('sbc-lipids-2017');
    expect(extractSourceKey('sbpc-ml-2021:t4.1')).toBe('sbpc-ml-2021');
  });
});

describe('validação de fontes em biomarkerRangeDefinitions', () => {
  it('toda source referenciada deve existir no SOURCE_REGISTRY', () => {
    const missing: string[] = [];

    for (const [code, def] of Object.entries(biomarkerRangeDefinitions)) {
      if (def.source) {
        const key = extractSourceKey(def.source);
        if (!SOURCE_REGISTRY[key]) {
          missing.push(
            `${code}: source '${def.source}' → chave '${key}' não encontrada no registry`,
          );
        }
      }
    }

    expect(missing).toEqual([]);
  });

  it('relatório de cobertura de fontes', () => {
    const total = Object.keys(biomarkerRangeDefinitions).length;
    const withSource = Object.values(biomarkerRangeDefinitions).filter((d) => d.source).length;
    const withoutSource = total - withSource;
    const coverage = ((withSource / total) * 100).toFixed(1);

    // Relatório informativo — não falha, apenas exibe estatísticas
    console.log(`\n📊 Cobertura de fontes bibliográficas:`);
    console.log(`   Total de biomarcadores: ${total}`);
    console.log(`   Com fonte: ${withSource} (${coverage}%)`);
    console.log(`   Sem fonte: ${withoutSource}`);

    // Garante que não regredimos abaixo do nível atual
    expect(withSource).toBeGreaterThanOrEqual(200);
  });
});
