import { TYPE } from '../lib/typography';
import { GridSection, INNER_GRID } from './brand/GridSection';

const STANDARDS = [
  {
    label: 'FHIR R4',
    description: 'HL7 Fast Healthcare Interoperability Resources',
    href: 'https://hl7.org/fhir/R4/',
  },
  {
    label: 'LOINC',
    description: 'Logical Observation Identifiers Names and Codes',
    href: 'https://loinc.org/',
  },
  {
    label: 'TUSS / TISS',
    description: 'Terminologias ANS para saúde suplementar',
    href: 'https://www.gov.br/ans/pt-br/assuntos/prestadores/padrao-para-troca-de-informacao-de-saude-suplementar-2013-tiss',
  },
  {
    label: 'CID-10 pt-BR',
    description: 'Classificação Internacional de Doenças (DATASUS)',
    href: 'https://datasus.saude.gov.br/',
  },
  {
    label: 'SBPC/ML',
    description: 'Sociedade Brasileira de Patologia Clínica',
    href: 'https://www.sbpc.org.br/',
  },
  {
    label: 'UCUM',
    description: 'Unified Code for Units of Measure',
    href: 'https://ucum.org/',
  },
  {
    label: 'Apache-2.0',
    description: 'Licença de código aberto permissiva',
    href: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
] as const;

export function Standards() {
  return (
    <GridSection
      backdrop={{ cx: 1260, cy: 530, opacity: 0.72 }}
      className={INNER_GRID}
      id="padroes"
    >
      <h2 className={`col-span-full ${TYPE.sectionTitle}`}>Padrões &amp; Conformidade</h2>
      <p className="col-span-full mb-8 max-w-[52ch] text-lg leading-relaxed text-pretty text-foreground/75">
        Construído sobre padrões internacionais de interoperabilidade em saúde, adaptado para o
        contexto brasileiro.
      </p>

      {/* Sem aparência de selo (seção 9 do guia): cartões chapados, texto à
          esquerda, a mesma superfície opaca dos objetos da /laudos. */}
      {STANDARDS.map((standard) => (
        <a
          key={standard.label}
          className="col-span-full flex flex-col gap-1.5 rounded-md bg-card p-5 shadow-[0_0_0_1px_#463c6d24,0_6px_16px_#463c6d12] transition-shadow hover:shadow-[0_0_0_1px_#463c6d52,0_6px_16px_#463c6d12] md:col-span-4"
          href={standard.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          <span className="text-base font-semibold text-primary">{standard.label}</span>
          <span className="text-sm leading-snug text-foreground/70">{standard.description}</span>
        </a>
      ))}
    </GridSection>
  );
}
