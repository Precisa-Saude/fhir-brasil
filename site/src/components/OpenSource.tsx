import { CornerSquares } from '@precisa-saude/ui/decorative';
import { useGridCol } from '@precisa-saude/ui/hooks';
import { Eye, GitFork, Shield, Users } from 'lucide-react';
import type { ReactNode } from 'react';

interface Pillar {
  icon: ReactNode;
  title: string;
  description: string;
}

const PILLARS: Pillar[] = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: 'Transparência',
    description:
      'Código auditável por qualquer desenvolvedor. Sem caixa-preta em decisões clínicas.',
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Confiabilidade',
    description:
      '397 testes automatizados, cobertura acima de 80% e revisão contínua de faixas de referência.',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Colaboração',
    description:
      'Contribuições abertas para novos biomarcadores, calculadoras e integrações regionais.',
  },
  {
    icon: <GitFork className="h-5 w-5" />,
    title: 'Impacto Social',
    description:
      'Infraestrutura compartilhada para healthtechs brasileiras, do SUS às clínicas privadas.',
  },
];

const gridStyle = {
  gridTemplateColumns: 'repeat(var(--grid-cols), 1fr)',
  maxWidth: 'var(--grid-max-w)',
  width: '100%',
} as const;

// Pillar card positions: 2 per row, 6 cols each
const PILLAR_COLS_14 = [
  { start: 2, span: 6 },
  { start: 8, span: 6 },
  { start: 2, span: 6 },
  { start: 8, span: 6 },
] as const;

export function OpenSource() {
  const col = useGridCol();

  return (
    <section id="open-source" className="relative min-h-[50svh] bg-white/30 py-20 sm:py-28">
      <CornerSquares position="top" />
      <div className="mx-auto grid gap-4 px-4 md:px-0" style={gridStyle}>
        <div className="col-span-full text-center md:col-span-12 md:col-start-2 3xl:col-start-3">
          <h2 className="font-margem text-3xl font-bold tracking-tight text-ps-violet-dark sm:text-4xl">
            Por que código aberto?
          </h2>
        </div>
        <p
          className="col-span-full mb-8 text-center text-pretty font-pausa text-lg text-ps-violet-dark/60"
          style={col(4, 8)}
        >
          Saúde digital precisa de infraestrutura aberta. Dados clínicos não devem depender de
          implementações proprietárias.
        </p>

        {PILLARS.map((pillar, i) => (
          <div
            key={pillar.title}
            className="col-span-full flex gap-4 rounded-xl border border-ps-violet-dark/8 bg-white/50 p-6 outline outline-1 outline-ps-violet-dark/5 backdrop-blur-sm transition-colors hover:border-ps-violet-dark/15"
            style={col(PILLAR_COLS_14[i]!.start, PILLAR_COLS_14[i]!.span)}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ps-mint/30 text-ps-violet-dark">
              {pillar.icon}
            </div>
            <div>
              <h3 className="font-margem text-base font-semibold text-ps-violet-dark">
                {pillar.title}
              </h3>
              <p className="mt-1 font-pausa text-base leading-relaxed text-ps-violet-dark/60">
                {pillar.description}
              </p>
            </div>
          </div>
        ))}

        <a
          href="https://github.com/Precisa-Saude/fhir-brasil"
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-full inline-flex items-center justify-center gap-2 rounded-full bg-ps-violet-dark px-6 py-3 font-margem text-sm font-medium text-white transition-all md:col-span-4"
          style={col(4, 4)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
          </svg>
          Ver no GitHub
        </a>
        <a
          href="https://github.com/Precisa-Saude/fhir-brasil/blob/main/docs/contribuindo.md"
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-full inline-flex items-center justify-center gap-1 rounded-full border border-ps-violet-dark/20 bg-transparent px-6 py-3 font-margem text-sm font-medium text-ps-violet-dark transition-colors hover:border-ps-violet-dark hover:bg-ps-violet-dark hover:text-white md:col-span-4"
          style={col(8, 4)}
        >
          Contribuir →
        </a>
      </div>
    </section>
  );
}
