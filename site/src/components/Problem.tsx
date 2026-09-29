import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@precisa-saude/ui/primitives';
import { cn } from '@precisa-saude/ui/utils';
import { useState } from 'react';

import { TYPE } from '../lib/typography';
import { GridSection, INNER_GRID } from './brand/GridSection';

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

export function Problem() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <GridSection
      backdrop={{ cx: 1290, cy: 570, flip: true, mint: true, opacity: 0.5 }}
      tone="muted"
    >
      <div className={INNER_GRID}>
        <h2 className={`col-span-full mb-4 ${TYPE.sectionTitle}`}>O problema</h2>

        <p className="col-span-full mb-8 max-w-[60ch] text-lg leading-relaxed text-pretty text-foreground/75 md:col-span-6">
          O sistema de saúde brasileiro opera como duas redes paralelas com troca mínima de dados.
          Laboratórios privados entregam resultados como PDFs sem formato padrão. Laboratórios do
          SUS usam sistemas internos cada vez mais conectados à RNDS — mas nenhum sistema enxerga o
          outro.
        </p>
        <p className="col-span-full mb-8 max-w-[60ch] text-lg leading-relaxed text-pretty text-foreground/75 md:col-span-6">
          Resultado: exames duplicados. O mesmo hemograma é solicitado pelo endocrinologista
          (privado) e pela UBS (SUS) em questão de semanas, porque não existe uma visão longitudinal
          do paciente.
        </p>

        <div className="col-span-full">
          <div className="mb-4 md:hidden">
            <Select
              value={TABS[activeTab].label}
              onValueChange={(v) => setActiveTab(TABS.findIndex((t) => t.label === v))}
            >
              <SelectTrigger className="w-full bg-card text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABS.map((tab) => (
                  <SelectItem key={tab.label} className="text-sm" value={tab.label}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mb-4 hidden md:flex">
            <div
              className="relative inline-grid min-w-max rounded-full bg-card p-1 ring-1 ring-border"
              role="tablist"
              style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}
            >
              <div
                className="absolute top-1 bottom-1 rounded-full bg-primary transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                  left: `calc(4px + ${activeTab} * ((100% - 8px) / ${TABS.length}))`,
                  width: `calc((100% - 8px) / ${TABS.length})`,
                }}
              />
              {TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  aria-selected={activeTab === i}
                  className={cn(
                    'relative z-10 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-200',
                    activeTab === i
                      ? 'text-primary-foreground'
                      : 'text-foreground/70 hover:text-foreground',
                  )}
                  role="tab"
                  onClick={() => setActiveTab(i)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Diagrama em superfície opaca sobre o fundo geométrico. */}
          <div className="overflow-hidden rounded-md bg-card shadow-[0_0_0_1px_#463c6d24,0_6px_16px_#463c6d12]">
            <div className="flex justify-center overflow-x-auto p-6">
              <pre className="font-mono text-xs leading-relaxed text-foreground/80 sm:text-sm">
                {TABS[activeTab].diagram}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </GridSection>
  );
}
