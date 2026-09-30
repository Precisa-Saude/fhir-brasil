import { createContext, type ReactNode, useContext, useId } from 'react';

/**
 * Peças de diagrama de fluxo em SVG: caixa, conector com seta e rótulo de
 * aresta. As cores vêm dos tokens do tema, então o diagrama acompanha a
 * paleta da marca sem cor escrita à mão. As misturas são em oklab: em oklch
 * o matiz faria arco entre o bege do cartão e o violeta ou a menta, e o
 * tom sairia rosado ou esverdeado.
 */

/** Tons de caixa. `coral` marca o desfecho ruim; `menta`, o resultado. */
export type FlowTone = 'coral' | 'lavanda' | 'menta' | 'neutro' | 'roxo';

/** Coral da marca: o `--destructive` do tema é o mesmo coral. */
const CORAL = 'var(--destructive)';

const TONES: Record<FlowTone, { fill: string; stroke: string; sub: string; title: string }> = {
  coral: {
    fill: 'color-mix(in oklab, var(--destructive) 12%, var(--card))',
    stroke: CORAL,
    sub: 'color-mix(in oklab, var(--foreground) 72%, transparent)',
    title: 'var(--foreground)',
  },
  lavanda: {
    fill: 'color-mix(in oklab, var(--ps-violet) 14%, var(--card))',
    stroke: 'var(--ps-violet)',
    sub: 'color-mix(in oklab, var(--foreground) 72%, transparent)',
    title: 'var(--foreground)',
  },
  menta: {
    fill: 'color-mix(in oklab, var(--ps-mint) 55%, var(--card))',
    stroke: 'color-mix(in oklab, var(--ps-mint) 70%, var(--foreground))',
    sub: 'color-mix(in oklab, var(--foreground) 78%, transparent)',
    title: 'var(--foreground)',
  },
  neutro: {
    fill: 'var(--background)',
    stroke: 'var(--border)',
    sub: 'color-mix(in oklab, var(--foreground) 68%, transparent)',
    title: 'var(--foreground)',
  },
  roxo: {
    fill: 'var(--primary)',
    stroke: 'var(--primary)',
    sub: 'color-mix(in oklab, var(--primary-foreground) 80%, transparent)',
    title: 'var(--primary-foreground)',
  },
};

/** Tons de conector: neutro no fluxo comum, coral no elo quebrado. */
export type ConnectorTone = 'coral' | 'lavanda' | 'neutro';

const CONNECTOR_COLOR: Record<ConnectorTone, string> = {
  coral: CORAL,
  lavanda: 'var(--ps-violet)',
  neutro: 'color-mix(in oklab, var(--foreground) 45%, transparent)',
};

const LINE_HEIGHT = 16;
const TITLE_SIZE = 13.5;
const SUB_SIZE = 12;

const MarkerContext = createContext('flow');

function markerId(prefix: string, tone: ConnectorTone) {
  return `${prefix}-seta-${tone}`;
}

export interface FlowDiagramProps {
  children: ReactNode;
  /** Descrição longa do fluxo, lida por leitores de tela. */
  description: string;
  height: number;
  title: string;
  width: number;
}

/** Moldura do diagrama: viewBox responsivo, fonte do site e acessibilidade. */
export function FlowDiagram({ children, description, height, title, width }: FlowDiagramProps) {
  const id = useId().replace(/:/g, '');
  const titleId = `${id}-titulo`;
  const descId = `${id}-descricao`;

  return (
    <svg
      aria-describedby={descId}
      aria-labelledby={titleId}
      className="mx-auto block h-auto w-full max-w-[34rem]"
      role="img"
      style={{ fontFamily: 'var(--font-sans)' }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>{description}</desc>
      <defs>
        {(Object.keys(CONNECTOR_COLOR) as ConnectorTone[]).map((tone) => (
          <marker
            key={tone}
            id={markerId(id, tone)}
            markerHeight="8"
            markerUnits="userSpaceOnUse"
            markerWidth="8"
            orient="auto-start-reverse"
            refX="7"
            refY="4"
            viewBox="0 0 8 8"
          >
            <path d="M0 0 L8 4 L0 8 Z" fill={CONNECTOR_COLOR[tone]} />
          </marker>
        ))}
      </defs>
      <MarkerContext.Provider value={id}>{children}</MarkerContext.Provider>
    </svg>
  );
}

export interface FlowNodeProps {
  h: number;
  /** Primeira linha em destaque; as demais em tom secundário. */
  lines: readonly [string, ...string[]];
  tone?: FlowTone;
  w: number;
  x: number;
  y: number;
}

/** Caixa de canto arredondado com texto centralizado. */
export function FlowNode({ h, lines, tone = 'neutro', w, x, y }: FlowNodeProps) {
  const colors = TONES[tone];
  const firstBaseline = y + (h - lines.length * LINE_HEIGHT) / 2 + 12;
  const cx = x + w / 2;

  return (
    <g>
      <rect
        fill={colors.fill}
        height={h}
        rx="10"
        stroke={colors.stroke}
        strokeWidth="1.25"
        width={w}
        x={x}
        y={y}
      />
      <text textAnchor="middle">
        {lines.map((line, i) => (
          <tspan
            key={`${i}-${line}`}
            fill={i === 0 ? colors.title : colors.sub}
            fontSize={i === 0 ? TITLE_SIZE : SUB_SIZE}
            fontWeight={i === 0 ? 600 : 400}
            x={cx}
            y={firstBaseline + i * LINE_HEIGHT}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export interface FlowConnectorProps {
  /** Seta também no primeiro ponto. */
  bidirectional?: boolean;
  dashed?: boolean;
  /** Sem seta: trecho que desemboca em outro conector. */
  plain?: boolean;
  /** Pontos da polilinha, em ordem. A seta sai no último ponto. */
  points: readonly (readonly [number, number])[];
  tone?: ConnectorTone;
}

/** Conector ortogonal com ponta de seta. */
export function FlowConnector({
  bidirectional = false,
  dashed = false,
  plain = false,
  points,
  tone = 'neutro',
}: FlowConnectorProps) {
  const prefix = useContext(MarkerContext);
  const marker = `url(#${markerId(prefix, tone)})`;

  return (
    <polyline
      fill="none"
      markerEnd={plain ? undefined : marker}
      markerStart={bidirectional ? marker : undefined}
      points={points.map(([px, py]) => `${px},${py}`).join(' ')}
      stroke={CONNECTOR_COLOR[tone]}
      strokeDasharray={dashed ? '4 4' : undefined}
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  );
}

export interface FlowLabelProps {
  text: string;
  w: number;
  /** Centro do rótulo. */
  x: number;
  y: number;
}

/** Rótulo em pílula sobre um conector, para nomear a etapa do caminho. */
export function FlowLabel({ text, w, x, y }: FlowLabelProps) {
  return (
    <g>
      <rect
        fill="var(--card)"
        height="22"
        rx="11"
        stroke="var(--ps-violet)"
        strokeWidth="1"
        width={w}
        x={x - w / 2}
        y={y - 11}
      />
      <text
        fill="var(--foreground)"
        fontSize="11.5"
        fontWeight={500}
        textAnchor="middle"
        x={x}
        y={y + 4}
      >
        {text}
      </text>
    </g>
  );
}

/** Marca de elo quebrado: círculo coral com um ×. */
export function FlowBreak({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} fill="var(--card)" r="9" stroke={CORAL} strokeWidth="1.5" />
      <path
        d={`M${x - 3.5} ${y - 3.5} L${x + 3.5} ${y + 3.5} M${x + 3.5} ${y - 3.5} L${x - 3.5} ${y + 3.5}`}
        stroke={CORAL}
        strokeLinecap="round"
        strokeWidth="1.75"
      />
    </g>
  );
}

/** Cabeçalho de coluna dentro do diagrama, com fio abaixo. */
export function FlowColumnHeading({ text, w, x, y }: FlowLabelProps) {
  return (
    <g>
      <text
        fill="color-mix(in oklab, var(--foreground) 70%, transparent)"
        fontSize="11"
        fontWeight={600}
        letterSpacing="1.1"
        textAnchor="middle"
        x={x}
        y={y}
      >
        {text.toUpperCase()}
      </text>
      <line
        stroke="var(--border)"
        strokeWidth="1"
        x1={x - w / 2}
        x2={x + w / 2}
        y1={y + 8}
        y2={y + 8}
      />
    </g>
  );
}
