import { ExternalLink } from 'lucide-react';

import catalog from '../data/catalog-counts.json';
import { TYPE } from '../lib/typography';
import { GridSection, INNER_GRID } from './brand/GridSection';

interface FeatureLink {
  label: string;
  href: string;
}

interface Feature {
  title: string;
  description: string;
  links?: FeatureLink[];
}

const FEATURES: Feature[] = [
  {
    title: `${catalog.biomarkers} Biomarcadores`,
    description: `${catalog.withLoinc} dos ${catalog.biomarkers} têm código LOINC. Nomes em pt-BR e en-US, unidades UCUM, seção de serviço HL7 v2-0074 em cada laudo, normalização de aliases.`,
    links: [
      { label: 'LOINC', href: 'https://loinc.org/' },
      { label: 'UCUM', href: 'https://ucum.org/' },
    ],
  },
  {
    title: 'Faixas de Referência',
    description:
      'Variantes por sexo biológico e faixa etária, baseadas em diretrizes SBPC/ML, SBC e SBD. Inclui faixas ótimas e de alerta.',
    links: [{ label: 'SBPC/ML', href: 'https://www.sbpc.org.br/' }],
  },
  {
    title: 'Cliente RNDS',
    description:
      'Integração com a Rede Nacional de Dados em Saúde (DATASUS). Autenticação mTLS com certificado ICP-Brasil, zero dependências externas. Testado contra mock RNDS — validação contra infraestrutura real requer certificado ICP-Brasil.',
    links: [{ label: 'RNDS', href: 'https://rnds.saude.gov.br/' }],
  },
  {
    title: 'Do laudo ao FHIR R4',
    description:
      'O fhir-pdf lê a camada de texto do PDF de laudo e o fhir-ocr-utils ancora os biomarcadores que a página cita. A saída do modelo é conferida contra um contrato público de extração e contra essa ancoragem antes de virar Bundle FHIR R4.',
    links: [{ label: 'FHIR R4', href: 'https://hl7.org/fhir/R4/' }],
  },
];

export function Features() {
  return (
    <GridSection className={INNER_GRID} id="solucao">
      <h2 className={`col-span-full ${TYPE.sectionTitle}`}>A solução</h2>
      <p className="col-span-full mb-8 max-w-[52ch] text-lg leading-relaxed text-pretty text-foreground/75">
        Infraestrutura de código aberto que transforma dados fragmentados em recursos FHIR R4
        padronizados.
      </p>

      {FEATURES.map((feature, i) => (
        <div
          key={feature.title}
          className="relative col-span-full border-t py-8 md:col-span-6 md:pl-16"
        >
          <span
            aria-hidden="true"
            className="mb-2.5 block text-sm text-primary md:absolute md:top-9 md:left-0 md:mb-0"
          >
            0{i + 1}
          </span>
          <h3 className={TYPE.cardTitle}>{feature.title}</h3>
          <p className="mt-4 max-w-[54ch] leading-relaxed text-foreground/75">
            {feature.description}
          </p>
          {feature.links && feature.links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {feature.links.map((link) => (
                <a
                  key={link.href}
                  className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-sm text-primary ring-1 ring-border transition-colors hover:ring-ps-violet"
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {link.label}
                  <ExternalLink aria-hidden="true" className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </GridSection>
  );
}
