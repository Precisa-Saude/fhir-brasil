import { Activity, ExternalLink, FlaskConical, HeartPulse, Network } from 'lucide-react';
import type { ReactNode } from 'react';
import { useWideGrid } from '@/hooks/useWideGrid';

interface FeatureLink {
  label: string;
  href: string;
}

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
  links?: FeatureLink[];
}

const FEATURES: Feature[] = [
  {
    icon: <HeartPulse className="h-6 w-6" />,
    title: '200+ Biomarcadores',
    description:
      'Códigos LOINC, nomes em pt-BR e en-US, unidades UCUM e 20 categorias clínicas. Catalogo completo com normalização de aliases.',
    links: [
      { label: 'LOINC', href: 'https://loinc.org/' },
      { label: 'UCUM', href: 'https://ucum.org/' },
    ],
  },
  {
    icon: <Activity className="h-6 w-6" />,
    title: 'Faixas de Referência',
    description:
      'Variantes por sexo biológico e faixa etária, baseadas em diretrizes SBPC/ML, SBC e SBD. Inclui faixas ótimas e de alerta.',
    links: [
      { label: 'SBPC/ML', href: 'https://www.sbpc.org.br/' },
    ],
  },
  {
    icon: <FlaskConical className="h-6 w-6" />,
    title: 'Calculadoras Clínicas',
    description:
      'PhenoAge (idade biológica), BrDMrisc (risco de diabetes), HOMA-IR, VLDL e IMC. Conversão automática de unidades brasileiras.',
  },
  {
    icon: <Network className="h-6 w-6" />,
    title: 'Cliente RNDS',
    description:
      'Integração com a Rede Nacional de Dados em Saúde (DATASUS). Autenticação mTLS com certificado ICP-Brasil, zero dependências externas.',
    links: [
      { label: 'RNDS', href: 'https://rnds.saude.gov.br/' },
    ],
  },
];

const gridStyle = {
  gridTemplateColumns: 'repeat(var(--grid-cols), 1fr)',
  maxWidth: 'var(--grid-max-w)',
  width: '100%',
} as const;

const COL_STARTS_14 = [2, 8, 2, 8] as const;

export function Features() {
  const wide = useWideGrid();
  const offset = wide ? 1 : 0;

  return (
    <section className="min-h-[50svh] py-20 sm:py-28">
      <div className="mx-auto flex flex-col gap-4 px-4 md:grid md:px-0" style={gridStyle}>
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-ps-violet-dark/8 bg-white/50 p-8 outline outline-1 outline-ps-violet-dark/5 backdrop-blur-sm transition-colors hover:border-ps-violet-dark/15 md:col-span-6"
            style={{ gridColumnStart: COL_STARTS_14[i]! + offset }}
          >
            <div className="mb-4 inline-flex rounded-full bg-ps-sand p-3 text-ps-violet-dark">
              {feature.icon}
            </div>
            <h3 className="font-margem text-lg font-semibold text-ps-violet-dark">
              {feature.title}
            </h3>
            <p className="mt-2 font-pausa text-base leading-relaxed text-ps-violet-dark/60">
              {feature.description}
            </p>
            {feature.links && feature.links.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {feature.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-ps-violet-dark/10 px-3 py-1 font-pausa text-sm text-ps-violet-dark/70 transition-colors hover:border-ps-violet-dark/25 hover:text-ps-violet-dark"
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
