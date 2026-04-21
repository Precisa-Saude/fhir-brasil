import { CornerSquares } from '@precisa-saude/ui/decorative';
import { useGridCol } from '@precisa-saude/ui/hooks';
import { Building2, FlaskConical, GraduationCap, Landmark, Stethoscope, User } from 'lucide-react';
import type { ReactNode } from 'react';

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
    role: 'Vocabulário compartilhado com 180+ biomarcadores',
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

const gridStyle = {
  gridTemplateColumns: 'repeat(var(--grid-cols), 1fr)',
  maxWidth: 'var(--grid-max-w)',
  width: '100%',
} as const;

const CARD_COLS_14 = [
  { start: 2, span: 6 },
  { start: 8, span: 6 },
  { start: 2, span: 6 },
  { start: 8, span: 6 },
  { start: 2, span: 6 },
  { start: 8, span: 6 },
] as const;

export function Ecosystem() {
  const col = useGridCol();

  return (
    <section className="relative min-h-[50svh] bg-white/30 py-20 sm:py-28">
      <CornerSquares position="top" />
      <div className="mx-auto grid gap-4 px-4 md:px-0" style={gridStyle}>
        <div className="col-span-full text-center md:col-span-12 md:col-start-2 3xl:col-start-3">
          <h2 className="font-margem text-3xl font-bold tracking-tight text-ps-violet-dark sm:text-4xl">
            Ecossistema
          </h2>
        </div>
        <p
          className="col-span-full mb-8 text-center text-pretty font-pausa text-lg text-ps-violet-dark/60"
          style={col(4, 8)}
        >
          O fhir-brasil fornece a base para que cada ator do ecossistema de saúde possa construir
          sobre o mesmo padrão.
        </p>

        {ACTORS.map((actor, i) => (
            <div
              key={actor.name}
              className="col-span-full rounded-xl border border-ps-violet-dark/8 bg-white/50 p-6 outline outline-1 outline-ps-violet-dark/5 backdrop-blur-sm transition-colors hover:border-ps-violet-dark/15"
              style={col(CARD_COLS_14[i]!.start, CARD_COLS_14[i]!.span)}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ps-sand text-ps-violet-dark">
                  {actor.icon}
                </div>
                <h3 className="font-margem text-base font-semibold text-ps-violet-dark">
                  {actor.name}
                </h3>
              </div>
              <p className="font-pausa text-sm leading-relaxed text-ps-violet-dark/50">
                {actor.problem}
              </p>
              <p className="mt-2 font-pausa text-sm font-medium leading-relaxed text-ps-violet-dark/80">
                → {actor.role}
              </p>
            </div>
        ))}
      </div>
    </section>
  );
}
