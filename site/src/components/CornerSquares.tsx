import { useWideGrid } from '@/hooks/useWideGrid';

interface CornerSquaresProps {
  position?: 'bottom' | 'top';
}

const COL_WIDTH = 'var(--col-w)';

const gridContainerStyle = {
  gap: '16px',
  gridTemplateColumns: 'repeat(var(--grid-cols), 1fr)',
  margin: '0 auto',
  maxWidth: 'var(--grid-max-w)',
  width: '100%',
} as const;

export function CornerSquares({ position = 'top' }: CornerSquaresProps) {
  const wide = useWideGrid();
  const offset = wide ? 2 : 0;
  const sq = { height: COL_WIDTH, width: COL_WIDTH };

  if (position === 'bottom') {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden md:grid"
        style={gridContainerStyle}
      >
        <div className="flex flex-col" style={{ gridColumn: `${14 + offset}` }}>
          <div className="bg-ps-mint" style={sq} />
          <div className="bg-ps-violet" style={sq} />
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden overflow-hidden md:grid"
      style={gridContainerStyle}
    >
      <div className="flex justify-end" style={{ gridColumn: `${13 + offset} / span 2` }}>
        <div className="bg-ps-violet" style={sq} />
        <div className="bg-ps-mint" style={sq} />
      </div>
    </div>
  );
}
