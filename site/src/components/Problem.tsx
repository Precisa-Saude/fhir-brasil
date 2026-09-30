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
import {
  FlowBreak,
  FlowColumnHeading,
  FlowConnector,
  FlowDiagram,
  FlowLabel,
  FlowNode,
} from './FlowDiagram';

/** Hoje: duas redes que não se enxergam e desembocam no exame repetido. */
function FragmentedDiagram() {
  return (
    <FlowDiagram
      description="Na rede privada, o lab privado (grandes redes) entrega PDF no WhatsApp, sem padrão e sem LOINC, e o médico pede o exame sem o histórico do SUS. Na rede pública, a UBS ou o lab SUS guarda o resultado num sistema interno, com os dados presos na UBS, e a UBS pede o exame sem o histórico privado. Não há ligação entre os dois lados, e os dois caminhos terminam em exames duplicados e custo desperdiçado."
      height={384}
      title="Hoje: dados fragmentados"
      width={400}
    >
      <FlowColumnHeading text="Rede Privada" w={150} x={100} y={18} />
      <FlowColumnHeading text="Rede Pública" w={150} x={300} y={18} />

      <FlowNode h={50} lines={['Lab privado', '(grandes redes)']} w={150} x={25} y={40} />
      <FlowNode h={50} lines={['UBS / Lab SUS', '(rede pública)']} w={150} x={225} y={40} />
      <FlowConnector
        points={[
          [100, 90],
          [100, 118],
        ]}
      />
      <FlowConnector
        points={[
          [300, 90],
          [300, 118],
        ]}
      />

      <FlowNode
        h={66}
        lines={['PDF no WhatsApp', 'sem padrão', 'sem LOINC']}
        w={150}
        x={25}
        y={118}
      />
      <FlowNode h={66} lines={['Sistema interno', 'dados presos na UBS']} w={150} x={225} y={118} />
      <FlowConnector
        points={[
          [100, 184],
          [100, 212],
        ]}
      />
      <FlowConnector
        points={[
          [300, 184],
          [300, 212],
        ]}
      />

      <FlowNode
        h={66}
        lines={['Médico pede exame', 'sem histórico', 'do SUS']}
        w={150}
        x={25}
        y={212}
      />
      <FlowNode
        h={66}
        lines={['UBS pede exame', 'sem histórico', 'privado']}
        w={150}
        x={225}
        y={212}
      />
      {/* Elo que não existe: tracejado coral com o × no meio. */}
      <FlowConnector
        bidirectional
        dashed
        points={[
          [176, 245],
          [224, 245],
        ]}
        tone="coral"
      />
      <FlowBreak x={200} y={245} />

      <FlowConnector
        plain
        points={[
          [100, 278],
          [100, 298],
          [200, 298],
        ]}
      />
      <FlowConnector
        plain
        points={[
          [300, 278],
          [300, 298],
          [200, 298],
        ]}
      />
      <FlowConnector
        points={[
          [200, 298],
          [200, 322],
        ]}
        tone="coral"
      />

      <FlowNode
        h={50}
        lines={['Exames duplicados', 'custo desperdiçado']}
        tone="coral"
        w={180}
        x={110}
        y={322}
      />
    </FlowDiagram>
  );
}

/** Com fhir-brasil: as três fontes convergem num só formato. */
function UnifiedDiagram() {
  return (
    <FlowDiagram
      description="O lab privado entra por upload de PDF, passando por OCR e parser. A RNDS entra direto, em FHIR R4 nativo. A UBS ou o lab SUS entra via RNDS ou PDF, por importação FHIR. As três fontes chegam ao fhir-brasil, de código aberto, que alimenta uma aplicação, própria ou de terceiros. A aplicação entrega a visão longitudinal, com todas as fontes unificadas, e a deduplicação: mesmo LOINC é mesmo exame."
      height={410}
      title="Com fhir-brasil"
      width={400}
    >
      <FlowNode h={66} lines={['Lab privado', 'PDF upload']} w={120} x={8} y={12} />
      <FlowNode h={66} lines={['RNDS', 'FHIR R4', 'nativo']} w={120} x={140} y={12} />
      <FlowNode h={66} lines={['UBS / Lab SUS', 'via RNDS ou PDF']} w={120} x={272} y={12} />

      <FlowConnector
        points={[
          [68, 78],
          [68, 128],
          [150, 128],
          [150, 166],
        ]}
        tone="lavanda"
      />
      <FlowConnector
        points={[
          [200, 78],
          [200, 166],
        ]}
        tone="lavanda"
      />
      <FlowConnector
        points={[
          [332, 78],
          [332, 128],
          [250, 128],
          [250, 166],
        ]}
        tone="lavanda"
      />
      <FlowLabel text="OCR + parser" w={92} x={68} y={104} />
      <FlowLabel text="FHIR import" w={86} x={332} y={104} />

      <FlowNode
        h={50}
        lines={['fhir-brasil', '(código aberto)']}
        tone="roxo"
        w={200}
        x={100}
        y={166}
      />
      <FlowConnector
        points={[
          [200, 216],
          [200, 242],
        ]}
        tone="lavanda"
      />

      <FlowNode
        h={50}
        lines={['Aplicação', '(proprietário ou terceiros)']}
        tone="lavanda"
        w={220}
        x={90}
        y={242}
      />
      <FlowConnector
        points={[
          [200, 292],
          [200, 308],
          [110, 308],
          [110, 332],
        ]}
        tone="lavanda"
      />
      <FlowConnector
        points={[
          [200, 292],
          [200, 308],
          [290, 308],
          [290, 332],
        ]}
        tone="lavanda"
      />

      <FlowNode
        h={66}
        lines={['Visão longitudinal', 'todas as fontes', 'unificadas']}
        tone="menta"
        w={170}
        x={25}
        y={332}
      />
      <FlowNode
        h={66}
        lines={['Deduplicação', 'mesmo LOINC =', 'mesmo exame']}
        tone="menta"
        w={170}
        x={205}
        y={332}
      />
    </FlowDiagram>
  );
}

const TABS = [
  { Diagram: FragmentedDiagram, label: 'Hoje: dados fragmentados' },
  { Diagram: UnifiedDiagram, label: 'Com fhir-brasil' },
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
          <div className="mb-4 hidden md:flex lg:hidden">
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

          {/* Abaixo de lg, um diagrama por vez pelo seletor; de lg em diante,
              os dois lado a lado, cada um com seu título. Cada diagrama é
              montado uma vez só, e o seletor apenas esconde o outro. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-4">
            {TABS.map(({ Diagram, label }, i) => (
              <div
                key={label}
                className={cn('flex-col lg:flex', activeTab === i ? 'flex' : 'hidden')}
              >
                <h3 className={`mb-4 hidden lg:block ${TYPE.h3}`}>{label}</h3>
                {/* Diagrama em superfície opaca sobre o fundo geométrico. */}
                <div className="flex flex-1 items-center overflow-hidden rounded-md bg-card p-3 shadow-[0_0_0_1px_#463c6d24,0_6px_16px_#463c6d12] sm:p-6">
                  <Diagram />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GridSection>
  );
}
