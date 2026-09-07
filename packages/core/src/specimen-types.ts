/**
 * Código do tipo de amostra a partir do material impresso no laudo.
 *
 * O perfil `BRAmostraBiologica-1.0` da RNDS vincula `Specimen.type` ao ValueSet
 * `BRTipoAmostra-1.0` com força `required`, exige `type.coding` (1..1) e proíbe
 * `type.text` (0..0). Um `Specimen` só com o texto do laudo não passa, e é o que
 * a extração produzia.
 *
 * O ValueSet tem 63 códigos, e quase todos são de vigilância respiratória vindos
 * do GAL: swab nasofaríngeo, lavado brônquico, fragmento de órgão. Para laudo de
 * rotina sobram seis, e esses seis cobrem o que um painel de sangue e urina
 * imprime.
 *
 * Não há código para fezes no ValueSet. Isso não afeta a extração, cujo catálogo
 * não tem nenhum biomarcador de origem fecal: um parasitológico não vira
 * `Observation`, então não chega a pedir `Specimen`.
 *
 * @see https://rnds-fhir.saude.gov.br/StructureDefinition-BRAmostraBiologica-1.0.html
 * @see https://rnds-fhir.saude.gov.br/ValueSet-BRTipoAmostra-1.0.html
 */
import type { FHIRCoding } from './fhir-types';

/** ValueSet ao qual `Specimen.type` está vinculado no `BRAmostraBiologica`. */
export const BR_TIPO_AMOSTRA_VALUESET = 'https://rnds-fhir.saude.gov.br/ValueSet/BRTipoAmostra-1.0';

/**
 * CodeSystem dos códigos que este módulo emite.
 *
 * O ValueSet também inclui o `BRTipoAmostraGAL`, que traz "Sangue" e "Sangue com
 * EDTA" soltos. Ficaram de fora porque a URL canônica daquele CodeSystem não foi
 * confirmada na fonte, e código de terminologia não se deduz de slug. Material
 * assim cai no caminho de não mapeado até alguém abrir o IG e confirmar.
 */
export const HL7_SPECIMEN_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v2-0487';

/**
 * Os `display` são cópia literal do ValueSet, com a caixa dele.
 *
 * A chave é o texto já normalizado, e por enquanto é só o próprio display. Não
 * há sinônimo inventado aqui: a extração copia o material verbatim do laudo, e a
 * lista de variações que os laboratórios de fato imprimem ainda não foi medida
 * (a captura de material entrou em produção em 05/09/2026). Variação real
 * observada entra depois, com o laudo que a produziu.
 */
const CODINGS: ReadonlyArray<{ code: string; display: string }> = [
  { code: 'SER', display: 'Soro' },
  { code: 'PLAS', display: 'Plasma' },
  { code: 'WB', display: 'Sangue Total' },
  { code: 'UR', display: 'Urina' },
  { code: 'CSF', display: 'Líquor' },
  { code: 'SAL', display: 'Saliva' },
];

/**
 * Caixa, acento e espaço sobrando não distinguem material.
 *
 * Só isso. Não separa `camelCase` nem troca barra por espaço, ao contrário do
 * normalizador de nomes de biomarcador: "Soro/Plasma" impresso numa linha só é
 * ambíguo de verdade, e escolher um dos dois seria inferência. Sem casar, ele
 * segue o caminho do não mapeado.
 */
const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const BY_NORMALIZED_TEXT = new Map(
  CODINGS.map(({ code, display }) => [
    normalize(display),
    { code, display, system: HL7_SPECIMEN_TYPE_SYSTEM } satisfies FHIRCoding,
  ]),
);

/**
 * Coding do ValueSet para o material impresso, ou `undefined` sem casar.
 *
 * `undefined` é resposta legítima e não erro: o laudo pode trazer um material
 * fora do ValueSet, ou uma grafia que ninguém viu ainda. Quem chama decide o que
 * fazer, e a decisão que não existe é preencher com um código aproximado.
 */
export const specimenTypeCoding = (text: string): FHIRCoding | undefined =>
  BY_NORMALIZED_TEXT.get(normalize(text));
