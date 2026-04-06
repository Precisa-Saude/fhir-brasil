import { type ReactNode, useEffect, useRef } from 'react';

const GRID_COLS = 16;
const GAP = 16; // 1rem
const MAX_W = 1440;
const HOLD_MS = 5000; // how long each pattern is held
const FADE_MS = 1500; // transition duration between patterns
const STAGGER = 0.4; // how much the fade spreads across added/removed rows

export interface MosaicBgProps {
  children: ReactNode;
  className?: string;
  /**
   * Gradient color stops — at least 2 CSS color values.
   * Supports any valid CSS color including `var()` references.
   * The mosaic interpolates between them from top to bottom.
   * @example ['#6B21A8', '#34D399']
   * @example ['var(--ps-violet)', 'var(--ps-mint)']
   */
  colors: string[];
  /** Number of square columns to draw on each side (default 3). */
  cols?: number;
  /**
   * Minimum viewport width (in px) for the mosaic to be visible.
   * Defaults to 1440 for outer placement and 768 for inner placement.
   */
  minWidth?: number;
  /**
   * Where to draw the mosaic squares relative to the content area.
   * - `"outer"` (default): squares in viewport margins outside the content (3xl+ only)
   * - `"inner"`: squares inside the content grid's empty edge columns (md+ viewports)
   */
  placement?: 'inner' | 'outer';
  /** Max number of squares to stack vertically. When set, the canvas height
   *  is computed as `rows * colW` instead of using CSS 50% height. */
  rows?: number;
}

function getColW() {
  return (Math.min(window.innerWidth, MAX_W) - (GRID_COLS - 1) * GAP) / GRID_COLS;
}

/** Deterministic pseudo-random value from a simple integer hash. */
function hash(n: number) {
  let h = n;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return Math.abs(h);
}

/** Deterministic pseudo-random color offset per column. */
function columnOffset(col: number, seed: number, rows: number) {
  return hash(col + 1 + seed * 97) % rows;
}

/** Deterministic heights for all columns, no two adjacent columns share the same height. */
function columnHeights(count: number, seed: number, rows: number): number[] {
  const min = Math.max(1, Math.ceil(rows * 0.3));
  const range = rows - min + 1;
  if (range <= 1) return Array<number>(count).fill(min);

  const heights: number[] = [];
  for (let col = 0; col < count; col++) {
    if (col === 0) {
      heights.push(min + (hash(col + 1 + seed * 53) % range));
    } else {
      // Pick from range-1 values, then skip the previous height
      const prev = heights[col - 1]!;
      const pick = hash(col + 1 + seed * 53) % (range - 1);
      let h = min + pick;
      if (h >= prev) h += 1;
      heights.push(h);
    }
  }
  return heights;
}

/**
 * Resolve any var() references in a color string.
 * Must only be called in browser context (e.g. inside useEffect).
 * Note: only handles simple `var(--name)` — nested fallbacks like
 * `var(--a, rgb(0,0,0))` or `var(--a, var(--b))` are not supported.
 */
function resolveColor(color: string): string {
  if (!color.includes('var(')) return color;
  const style = getComputedStyle(document.documentElement);
  return color.replace(/var\(([^)]+)\)/g, (_match, name: string) => {
    return style.getPropertyValue(name).trim() || _match;
  });
}

/**
 * Build one resolved color per row by interpolating between the given stops.
 * E.g. 3 stops [A, B, C] across 10 rows → rows 0-4 blend A→B, rows 5-9 blend B→C.
 */
function buildColors(stops: string[], rows: number): string[] {
  const resolved = stops.map(resolveColor);
  if (rows <= 1) return [resolved[0]!];
  const segments = resolved.length - 1;

  return Array.from({ length: rows }, (_, i) => {
    const t = i / (rows - 1); // 0 → 1
    const seg = Math.min(Math.floor(t * segments), segments - 1);
    const localT = t * segments - seg;
    const pct = Math.round((1 - localT) * 100);
    const a = resolved[seg]!;
    const b = resolved[seg + 1]!;

    if (pct === 100) return a;
    if (pct === 0) return b;
    return `color-mix(in oklch, ${a} ${pct}%, ${b})`;
  });
}

interface MosaicParams {
  cols: number;
  colW: number;
  /** X coordinate where left panel starts drawing. */
  leftX: number;
  /** X coordinate where right panel starts drawing. */
  rightX: number;
  rows: number;
  /** Vertical offset to anchor squares to the bottom of the canvas. */
  yOffset: number;
}

type Ctx2D = CanvasRenderingContext2D;

/** Draw a static panel of squares using precomputed heights. */
function drawPanel(
  ctx: Ctx2D,
  p: MosaicParams,
  colors: string[],
  seed: number,
  startX: number,
  colOffset: number,
  heights: number[],
) {
  const { cols, colW, rows, yOffset } = p;

  for (let col = 0; col < cols; col++) {
    const globalCol = col + colOffset;
    const height = heights[globalCol]!;
    const startRow = rows - height;
    for (let row = startRow; row < rows; row++) {
      const offset = columnOffset(globalCol, seed, rows);
      const colorIdx = (offset + row) % rows;
      ctx.fillStyle = colors[colorIdx]!;
      ctx.fillRect(startX + col * colW, yOffset + row * colW, colW, colW);
    }
  }
}

/** Draw left and right side panels for a given seed (static, no transition). */
function drawStatic(ctx: Ctx2D, p: MosaicParams, colors: string[], seed: number) {
  const heights = columnHeights(p.cols * 2, seed, p.rows);
  drawPanel(ctx, p, colors, seed, p.leftX, 0, heights);
  drawPanel(ctx, p, colors, seed, p.rightX, p.cols, heights);
}

/** Clamp and remap a value from [start, end] → [0, 1]. */
function remap(t: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (t - start) / (end - start)));
}

/**
 * Draw a transition frame between two seeds in three sequential phases:
 *   Phase 1 (0.0–0.35): removed squares fade out (top-down stagger)
 *   Phase 2 (0.25–0.75): persistent squares blend colors
 *   Phase 3 (0.65–1.0): added squares fade in (bottom-up stagger)
 * Phases overlap slightly for a smoother feel.
 */
function drawTransition(
  ctx: Ctx2D,
  p: MosaicParams,
  colors: string[],
  oldSeed: number,
  newSeed: number,
  fade: number,
) {
  const { cols, colW, leftX, rightX, rows, yOffset } = p;
  const oldHeights = columnHeights(cols * 2, oldSeed, rows);
  const newHeights = columnHeights(cols * 2, newSeed, rows);

  // Phase-local progress values
  const removeT = remap(fade, 0, 0.35);
  const blendT = remap(fade, 0.25, 0.75);
  const addT = remap(fade, 0.65, 1);

  const sides = [
    { colOffset: 0, startX: leftX },
    { colOffset: cols, startX: rightX },
  ];

  for (const { colOffset, startX } of sides) {
    for (let col = 0; col < cols; col++) {
      const globalCol = col + colOffset;
      const oldH = oldHeights[globalCol]!;
      const newH = newHeights[globalCol]!;
      const x = startX + col * colW;

      const oldStart = rows - oldH;
      const newStart = rows - newH;

      // Persistent rows: exist in both old and new — always fully opaque
      const persistStart = Math.max(oldStart, newStart);
      for (let row = persistStart; row < rows; row++) {
        const y = yOffset + row * colW;
        // Old color as opaque base
        const oOff = columnOffset(globalCol, oldSeed, rows);
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors[(oOff + row) % rows]!;
        ctx.fillRect(x, y, colW, colW);

        // New color layered on top during blend phase
        if (blendT > 0) {
          const nOff = columnOffset(globalCol, newSeed, rows);
          ctx.globalAlpha = blendT;
          ctx.fillStyle = colors[(nOff + row) % rows]!;
          ctx.fillRect(x, y, colW, colW);
        }
      }

      // Removed rows: fade out during phase 1 (top-down stagger)
      if (oldH > newH) {
        const removedCount = oldH - newH;
        for (let row = oldStart; row < newStart; row++) {
          const posInRemoved = row - oldStart;
          const rowT = removedCount > 1 ? posInRemoved / (removedCount - 1) : 0;
          const localT = Math.min(1, Math.max(0, removeT * (1 + STAGGER) - rowT * STAGGER));
          const alpha = 1 - localT;
          if (alpha <= 0) continue;

          const oOff = columnOffset(globalCol, oldSeed, rows);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = colors[(oOff + row) % rows]!;
          ctx.fillRect(x, yOffset + row * colW, colW, colW);
        }
      }

      // Added rows: fade in during phase 3 (bottom-up stagger)
      if (newH > oldH) {
        const addedCount = newH - oldH;
        for (let row = newStart; row < oldStart; row++) {
          const posInAdded = oldStart - 1 - row;
          const rowT = addedCount > 1 ? posInAdded / (addedCount - 1) : 0;
          const alpha = Math.min(1, Math.max(0, addT * (1 + STAGGER) - rowT * STAGGER));
          if (alpha <= 0) continue;

          const nOff = columnOffset(globalCol, newSeed, rows);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = colors[(nOff + row) % rows]!;
          ctx.fillRect(x, yOffset + row * colW, colW, colW);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Full-width mosaic of colored squares drawn on a single canvas behind
 * the content. The pattern regenerates periodically with a smooth
 * crossfade for an ambient, organic feel.
 *
 * - `placement="outer"` (default): squares in viewport margins, 3xl+ only
 * - `placement="inner"`: squares inside the content grid columns, md+ viewports
 */
export default function MosaicBg({
  children,
  className,
  colors: colorStops,
  cols: sideCols = 1,
  minWidth,
  placement = 'outer',
  rows: maxRows,
}: MosaicBgProps) {
  const ref = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorsRef = useRef(colorStops);
  colorsRef.current = colorStops;

  useEffect(() => {
    const el = ref.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const isInner = placement === 'inner';
    const defaultMin = isInner ? 768 : 1440;
    const mq = window.matchMedia(`(min-width: ${minWidth ?? defaultMin}px)`);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let rafId = 0;
    let params: MosaicParams | null = null;
    let colors: string[] = [];

    const measure = () => {
      if (!mq.matches) {
        el.style.removeProperty('height');
        canvas.width = 0;
        canvas.height = 0;
        params = null;
        cancelAnimationFrame(rafId);
        return;
      }

      let colW: number;
      let leftX: number;
      let rightX: number;

      if (isInner) {
        // Read colW and gridMaxW from CSS variables so squares match the section's grid
        const computed = getComputedStyle(document.documentElement);
        const gridMaxWRaw = computed.getPropertyValue('--grid-max-w').trim();
        const gridCols = parseInt(computed.getPropertyValue('--grid-cols').trim(), 10) || 14;

        // Parse --grid-max-w: could be "1440px" or a calc() expression
        let gridMaxW: number;
        if (gridMaxWRaw.endsWith('px')) {
          gridMaxW = parseFloat(gridMaxWRaw);
        } else {
          // For calc expressions, measure by creating a temporary element
          gridMaxW = gridCols * 96 - 16; // fallback: 14 * 6rem - 1rem
        }

        colW = (Math.min(el.clientWidth, gridMaxW) - (gridCols - 1) * GAP) / gridCols;
        const contentLeft = (el.clientWidth - Math.min(el.clientWidth, gridMaxW)) / 2;

        leftX = contentLeft;
        rightX = contentLeft + Math.min(el.clientWidth, gridMaxW) - sideCols * colW;
      } else {
        colW = getColW();
        // Use el.clientWidth (CSS layout width) — not window.innerWidth which
        // includes scrollbar width and misaligns with CSS margin: auto.
        const contentLeft = (el.clientWidth - MAX_W) / 2;
        leftX = contentLeft - sideCols * colW;
        rightX = contentLeft + MAX_W;
      }

      let rows: number;
      let canvasH: number;
      let yOffset: number;

      if (maxRows) {
        // Fixed row count: canvas height is exactly rows * colW (perfect squares)
        rows = maxRows;
        canvasH = rows * colW;
        canvas.style.height = `${canvasH}px`;
        yOffset = 0;
      } else {
        // Default: canvas is CSS 50% height, rows derived from available space
        canvasH = canvas.clientHeight;
        rows = Math.max(2, Math.floor(canvasH / colW));
        yOffset = canvasH - rows * colW;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvasH * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        params = null;
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      colors = buildColors(colorsRef.current, rows);
      params = { cols: sideCols, colW, leftX, rightX, rows, yOffset };

      drawStatic(ctx, params, colors, 0);
    };

    const startAnimation = () => {
      if (!params) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let seed = 0;
      let holdDrawn = false;
      const cycleMs = HOLD_MS + FADE_MS;
      const startTime = performance.now();
      const p = params;
      const c = colors;

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const cyclePos = elapsed % cycleMs;
        const currentSeed = Math.floor(elapsed / cycleMs);

        if (currentSeed !== seed) {
          seed = currentSeed;
          holdDrawn = false;
        }

        if (cyclePos < HOLD_MS) {
          if (!holdDrawn) {
            ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
            ctx.globalAlpha = 1;
            drawStatic(ctx, p, c, seed);
            holdDrawn = true;
          }
        } else {
          const fade = (cyclePos - HOLD_MS) / FADE_MS;
          ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
          drawTransition(ctx, p, c, seed, seed + 1, fade);
          holdDrawn = false;
        }

        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);
    };

    const update = () => {
      cancelAnimationFrame(rafId);
      measure();
      if (params && !prefersReducedMotion.matches) {
        startAnimation();
      }
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    mq.addEventListener('change', update);
    prefersReducedMotion.addEventListener('change', update);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mq.removeEventListener('change', update);
      prefersReducedMotion.removeEventListener('change', update);
    };
  }, [sideCols, maxRows, minWidth, placement]);

  const isInner = placement === 'inner';

  return (
    <div
      ref={ref}
      className={['relative flex flex-col overflow-hidden', isInner && 'bg-background', className]
        .filter(Boolean)
        .join(' ')}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={[
          'pointer-events-none absolute inset-x-0 bottom-0 w-full',
          !maxRows && 'h-1/2',
          isInner && 'hidden md:block',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <div className="relative z-10 grid min-h-0 flex-1">{children}</div>
    </div>
  );
}
