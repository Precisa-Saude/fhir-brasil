import { Activity, FlaskConical, HeartPulse } from 'lucide-react';
import type { ReactNode } from 'react';

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: <HeartPulse className="h-6 w-6" />,
    title: '183+ Biomarcadores',
    description:
      'Códigos LOINC, nomes em pt-BR e en-US, unidades UCUM e 20 categorias clínicas. Catalogo completo com normalização de aliases.',
  },
  {
    icon: <Activity className="h-6 w-6" />,
    title: 'Faixas de Referência',
    description:
      'Variantes por sexo biológico e faixa etária, baseadas em diretrizes SBPC/ML, SBC e SBD. Inclui faixas ótimas e de alerta.',
  },
  {
    icon: <FlaskConical className="h-6 w-6" />,
    title: 'Calculadoras Clínicas',
    description:
      'PhenoAge (idade biológica), BrDMrisc (risco de diabetes), HOMA-IR, VLDL e IMC. Conversão automática de unidades brasileiras.',
  },
];

const gridStyle = {
  gridTemplateColumns: 'repeat(var(--grid-cols), 1fr)',
  maxWidth: 'var(--grid-max-w)',
  width: '100%',
} as const;

const COL_STARTS = [
  'md:[grid-column-start:2]',
  'md:[grid-column-start:6]',
  'md:[grid-column-start:10]',
] as const;

export function Features() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto flex flex-col gap-4 px-4 md:grid md:px-0" style={gridStyle}>
        {FEATURES.map((feature, i) => (
          <div
            key={feature.title}
            className={`rounded-2xl border border-ps-violet-dark/8 bg-white/50 p-8 outline outline-1 outline-ps-violet-dark/5 backdrop-blur-sm transition-colors hover:border-ps-violet-dark/15 md:col-span-4 ${COL_STARTS[i]}`}
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
          </div>
        ))}
      </div>
    </section>
  );
}
