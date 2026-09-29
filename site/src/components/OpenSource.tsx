import { Eye, GitFork, Shield, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { TYPE } from '../lib/typography';
import { GridSection, INNER_GRID } from './brand/GridSection';

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
      'Piso de 80% de cobertura em todo pacote publicado, reprovado no CI abaixo disso, e revisão contínua de faixas de referência.',
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

export function OpenSource() {
  return (
    // Encerramento em roxo, como o contato da /laudos: ação principal em menta
    // sobre o roxo (seção 3 do guia).
    <GridSection
      backdrop={{ cx: 1210, cy: 470, mint: true, opacity: 0.6 }}
      className={INNER_GRID}
      id="open-source"
      tone="roxo"
    >
      <h2 className={`col-span-full ${TYPE.sectionTitle}`}>Por que código aberto?</h2>
      <p className="col-span-full mb-8 max-w-[52ch] text-lg leading-relaxed text-pretty text-primary-foreground/80">
        Saúde digital precisa de infraestrutura aberta. Dados clínicos não devem depender de
        implementações proprietárias.
      </p>

      {PILLARS.map((pillar) => (
        <div
          key={pillar.title}
          className="col-span-full flex gap-4 border-t border-primary-foreground/20 py-6 md:col-span-7"
        >
          <span aria-hidden="true" className="mt-0.5 shrink-0 text-ps-mint">
            {pillar.icon}
          </span>
          <div>
            <h3 className={TYPE.h3}>{pillar.title}</h3>
            <p className="mt-1 max-w-[54ch] leading-relaxed text-primary-foreground/80">
              {pillar.description}
            </p>
          </div>
        </div>
      ))}

      <div className="col-span-full mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ps-mint px-8 text-sm font-medium text-primary transition-colors hover:bg-ps-mint/85"
          href="https://github.com/Precisa-Saude/fhir-brasil"
          rel="noopener noreferrer"
          target="_blank"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
          </svg>
          Ver no GitHub
        </a>
        <a
          className="inline-flex h-12 items-center justify-center gap-1 rounded-full border border-primary-foreground/70 px-8 text-sm font-medium text-primary-foreground transition-colors hover:border-ps-mint hover:text-ps-mint"
          href="https://github.com/Precisa-Saude/fhir-brasil/blob/main/docs/contribuindo.md"
          rel="noopener noreferrer"
          target="_blank"
        >
          Contribuir →
        </a>
      </div>
    </GridSection>
  );
}
