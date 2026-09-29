import { Building2, FlaskConical, GraduationCap, Landmark, Stethoscope, User } from 'lucide-react';
import type { ReactNode } from 'react';

import catalog from '../data/catalog-counts.json';
import { TYPE } from '../lib/typography';
import { GridSection, INNER_GRID } from './brand/GridSection';

interface Actor {
  icon: ReactNode;
  name: string;
  problem: string;
  role: string;
}

const ACTORS: Actor[] = [
  {
    icon: <User className="h-5 w-5" />,
    name: 'Paciente',
    problem: 'Resultados espalhados entre PDFs, WhatsApp, portais',
    role: 'Base para aplicações de consumo',
  },
  {
    icon: <Stethoscope className="h-5 w-5" />,
    name: 'Médico / Clínica',
    problem: 'Sem visão completa do histórico laboratorial entre redes',
    role: 'Camada de normalização entre fontes',
  },
  {
    icon: <FlaskConical className="h-5 w-5" />,
    name: 'Laboratório',
    problem: 'Formatos proprietários, LOINC inconsistente',
    role: `Vocabulário compartilhado com ${catalog.biomarkers} biomarcadores`,
  },
  {
    icon: <Building2 className="h-5 w-5" />,
    name: 'Operadora',
    problem: 'Pagando por exames duplicados entre redes',
    role: 'Infraestrutura para analytics de deduplicação',
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    name: 'Universidade / Pesquisador',
    problem: 'Dados fragmentados em formatos proprietários',
    role: 'Pacotes de código aberto para pesquisa em saúde',
  },
  {
    icon: <Landmark className="h-5 w-5" />,
    name: 'DATASUS / Governo',
    problem: 'Adoção da RNDS ainda lenta',
    role: 'Ferramentas comunitárias que aceleram a adoção',
  },
];

export function Ecosystem() {
  return (
    <GridSection className={INNER_GRID} id="ecossistema" tone="muted">
      <h2 className={`col-span-full ${TYPE.sectionTitle}`}>Ecossistema</h2>
      <p className="col-span-full mb-8 max-w-[52ch] text-lg leading-relaxed text-pretty text-foreground/75">
        O fhir-brasil fornece a base para que cada ator do ecossistema de saúde possa construir
        sobre o mesmo padrão.
      </p>

      {ACTORS.map((actor) => (
        <div key={actor.name} className="col-span-full border-t py-6 md:col-span-6">
          <div className="mb-3 flex items-center gap-3">
            <span aria-hidden="true" className="text-primary">
              {actor.icon}
            </span>
            <h3 className={TYPE.h3}>{actor.name}</h3>
          </div>
          <p className="leading-relaxed text-foreground/70">{actor.problem}</p>
          <p className="mt-2 leading-relaxed font-medium">→ {actor.role}</p>
        </div>
      ))}
    </GridSection>
  );
}
