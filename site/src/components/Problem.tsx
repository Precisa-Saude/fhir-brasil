import { CornerSquares } from '@precisa-saude/ui/decorative';
import { useGridCol } from '@precisa-saude/ui/hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@precisa-saude/ui/primitives';
import { cn } from '@precisa-saude/ui/utils';
import { useState } from 'react';

const TABS = [
  {
    label: 'Hoje: dados fragmentados',
    diagram: `
  Rede Privada                Rede Pública
  ─────────────               ─────────────

  Lab privado                 UBS / Lab SUS
  (grandes redes)               (rede pública)
       |                           |
       ▼                           ▼
  PDF no WhatsApp             Sistema interno
  sem padrão                  dados presos na UBS
  sem LOINC
       |                           |
       ▼                           ▼
  Médico pede exame           UBS pede exame
  sem histórico  ◄── ✕ ──►  sem histórico
  do SUS                      privado
       |                           |
       +─────────────┬─────────────+
                     ▼
            Exames duplicados
            custo desperdiçado
`,
  },
  {
    label: 'Com fhir-brasil',
    diagram: `
  Lab privado       RNDS           UBS / Lab SUS
  PDF upload        FHIR R4        via RNDS ou PDF
       |            nativo              |
       |               |                |
       +───── OCR + parser ── FHIR import
                       |
                       ▼
            fhir-brasil (código aberto)
                       |
                       ▼
            Aplicação
            (proprietário ou terceiros)
                  |              |
                  ▼              ▼
         Visão              Deduplicação
         longitudinal       mesmo LOINC =
         todas as fontes    mesmo exame
         unificadas
`,
  },
] as const;

const gridStyle = {
  gridTemplateColumns: 'repeat(var(--grid-cols), 1fr)',
  maxWidth: 'var(--grid-max-w)',
  width: '100%',
} as const;

export function Problem() {
  const [activeTab, setActiveTab] = useState(0);
  const col = useGridCol();

  return (
    <section className="relative min-h-[50svh] bg-white/30 py-20 sm:py-28">
      <CornerSquares position="top" />
      <div className="mx-auto grid gap-4 px-4 md:px-0" style={gridStyle}>
        <div className="col-span-full text-center md:col-span-12 md:col-start-2 3xl:col-start-3">
          <h2 className="font-margem text-3xl font-bold tracking-tight text-ps-violet-dark sm:text-4xl">
            O problema
          </h2>
        </div>

        <p
          className="col-span-full mb-8 text-pretty font-pausa text-lg leading-relaxed text-ps-violet-dark/70"
          style={col(2, 6)}
        >
          O sistema de saúde brasileiro opera como duas redes paralelas com troca mínima de dados.
          Laboratórios privados entregam resultados como PDFs sem formato padrão. Laboratórios do SUS
          usam sistemas internos cada vez mais conectados à RNDS — mas nenhum sistema enxerga o outro.
        </p>
        <p
          className="col-span-full mb-8 text-pretty font-pausa text-lg leading-relaxed text-ps-violet-dark/70"
          style={col(8, 6)}
        >
          Resultado: exames duplicados. O mesmo hemograma é solicitado pelo endocrinologista (privado)
          e pela UBS (SUS) em questão de semanas, porque não existe uma visão longitudinal do paciente.
        </p>

        <div className="col-span-full md:col-span-10 md:col-start-3 3xl:col-start-4">
          <div className="mb-4 md:hidden">
            <Select value={TABS[activeTab].label} onValueChange={(v) => setActiveTab(TABS.findIndex((t) => t.label === v))}>
              <SelectTrigger className="w-full border-ps-violet-dark/15 bg-white/80 font-margem text-sm text-ps-violet-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((tab) => (
                  <SelectItem key={tab.label} value={tab.label} className="font-margem text-sm">{tab.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4 hidden justify-center md:flex">
            <div
              className="relative inline-grid min-w-max rounded-full border border-ps-violet-dark/10 bg-ps-sand/50 p-1"
              role="tablist"
              style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}
            >
              <div
                className="absolute top-1 bottom-1 rounded-full bg-ps-violet-dark transition-all duration-300 ease-out"
                style={{
                  left: `calc(4px + ${activeTab} * ((100% - 8px) / ${TABS.length}))`,
                  width: `calc((100% - 8px) / ${TABS.length})`,
                }}
              />
              {TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  role="tab"
                  aria-selected={activeTab === i}
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    'relative z-10 whitespace-nowrap rounded-full px-4 py-2 font-margem text-sm font-medium transition-colors duration-300',
                    activeTab === i
                      ? 'text-white'
                      : 'text-ps-violet-dark/60 hover:text-ps-violet-dark',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-ps-violet-dark/10 bg-white/60 backdrop-blur-sm">
            <div className="flex justify-center overflow-x-auto p-6">
              <pre className="font-mono text-xs leading-relaxed text-ps-violet-dark/70 sm:text-sm">
                {TABS[activeTab].diagram}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
