/**
 * Testes para os CodeSystems e ValueSets FSH do IG.
 *
 * Validam que os arquivos FSH comitados contêm os dados esperados:
 * - Contagem de códigos para CodeSystems #complete
 * - Amostras conhecidas (spot checks)
 * - Campos obrigatórios (copyright, publisher, etc.)
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FSH_DIR = resolve(__dirname, '..', '..', 'input', 'fsh');

function readFsh(subdir: string, filename: string): string {
  return readFileSync(resolve(FSH_DIR, subdir, filename), 'utf-8');
}

function countCodes(content: string): number {
  // Conta linhas que começam com * # (códigos FSH)
  return content.split('\n').filter((line) => /^\* (?:\$\w+)?#/.test(line.trim())).length;
}

describe('BRSUSRacaCorCS', () => {
  const content = readFsh('codesystems', 'BRSUSRacaCorCS.fsh');

  it('contém exatamente 5 códigos', () => {
    expect(countCodes(content)).toBe(5);
  });

  it('contém as 5 categorias IBGE', () => {
    expect(content).toContain('#01 "Branca"');
    expect(content).toContain('#02 "Preta"');
    expect(content).toContain('#03 "Parda"');
    expect(content).toContain('#04 "Amarela"');
    expect(content).toContain('#05 "Indígena"');
  });

  it('declara content = #complete', () => {
    expect(content).toContain('#complete');
  });
});

describe('BRTISSCS', () => {
  const content = readFsh('codesystems', 'BRTISSCS.fsh');

  it('contém pelo menos 6 tipos de guia', () => {
    expect(countCodes(content)).toBeGreaterThanOrEqual(6);
  });

  it('contém guia de consulta e SP/SADT', () => {
    expect(content).toContain('Guia de Consulta');
    expect(content).toContain('Guia de SP/SADT');
  });

  it('referencia a ANS como publisher', () => {
    expect(content).toContain('Agência Nacional de Saúde Suplementar');
  });
});

describe('BRCNESCS', () => {
  const content = readFsh('codesystems', 'BRCNESCS.fsh');

  it('contém pelo menos 20 tipos de estabelecimento', () => {
    expect(countCodes(content)).toBeGreaterThanOrEqual(20);
  });

  it('contém tipos essenciais', () => {
    expect(content).toContain('Hospital Geral');
    expect(content).toContain('Posto de Saúde');
    expect(content).toContain('Laboratório Central de Saúde Pública');
  });
});

describe('BRTUSSCS (stub)', () => {
  const content = readFsh('codesystems', 'BRTUSSCS.fsh');

  it('declara content = #not-present', () => {
    expect(content).toContain('#not-present');
  });

  it('referencia a ANS', () => {
    expect(content).toContain('Agência Nacional de Saúde Suplementar');
  });
});

describe('BRCID10CS (stub)', () => {
  const content = readFsh('codesystems', 'BRCID10CS.fsh');

  it('declara content = #not-present', () => {
    expect(content).toContain('#not-present');
  });

  it('contém copyright DATASUS/Edusp', () => {
    expect(content).toContain('Edusp');
    expect(content).toContain('CBCD');
    expect(content).toContain('devidos créditos');
  });

  it('usa URL canônica internacional', () => {
    expect(content).toContain('http://hl7.org/fhir/sid/icd-10');
  });
});

describe('BRIBGEMunicipioCS (stub)', () => {
  const content = readFsh('codesystems', 'BRIBGEMunicipioCS.fsh');

  it('declara content = #not-present', () => {
    expect(content).toContain('#not-present');
  });

  it('referencia o IBGE', () => {
    expect(content).toContain('Instituto Brasileiro de Geografia e Estatística');
  });
});

describe('BRSUSRacaCorVS', () => {
  const content = readFsh('valuesets', 'BRSUSRacaCorVS.fsh');

  it('inclui todos os códigos do CodeSystem', () => {
    expect(content).toContain('include codes from system $SUSRacaCor');
  });
});

describe('BRTISSGuiasVS', () => {
  const content = readFsh('valuesets', 'BRTISSGuiasVS.fsh');

  it('inclui códigos do CodeSystem TISS', () => {
    expect(content).toContain('include codes from system $TISS');
  });
});

describe('BRTUSSProcedimentosLabVS', () => {
  const content = readFsh('valuesets', 'BRTUSSProcedimentosLabVS.fsh');

  it('contém pelo menos 40 códigos TUSS', () => {
    expect(countCodes(content)).toBeGreaterThanOrEqual(40);
  });

  it('contém códigos de hematologia', () => {
    expect(content).toContain('Hemograma');
  });

  it('contém códigos de perfil lipídico', () => {
    expect(content).toContain('Colesterol total');
    expect(content).toContain('Triglicerídeos');
  });

  it('contém códigos de tireoide', () => {
    expect(content).toContain('TSH');
    expect(content).toContain('T4 livre');
  });

  it('não contém códigos duplicados', () => {
    const codes = content
      .split('\n')
      .filter((line) => /^\* \$TUSS#/.test(line.trim()))
      .map((line) => {
        const match = line.match(/#(\d+)/);
        return match?.[1];
      })
      .filter(Boolean);
    const unique = new Set(codes);
    expect(codes.length).toBe(unique.size);
  });
});

describe('BRCID10MetabolicoVS', () => {
  const content = readFsh('valuesets', 'BRCID10MetabolicoVS.fsh');

  it('contém pelo menos 50 códigos CID-10', () => {
    expect(countCodes(content)).toBeGreaterThanOrEqual(50);
  });

  it('contém copyright DATASUS/Edusp', () => {
    expect(content).toContain('Edusp');
  });

  it('contém diabetes mellitus tipo 1 e 2', () => {
    expect(content).toContain('E10');
    expect(content).toContain('E11');
  });

  it('contém dislipidemias', () => {
    expect(content).toContain('E78');
    expect(content).toContain('Hipercolesterolemia');
  });

  it('contém hipotireoidismo', () => {
    expect(content).toContain('E03');
  });

  it('contém deficiência de ferro', () => {
    expect(content).toContain('D50');
  });
});
