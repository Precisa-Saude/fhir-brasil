import { useEffect, useState } from 'react';

const WIDE_GRID_QUERY = '(min-width: 1440px)';

/**
 * Returns true when viewport is 1440px+ (16-column grid mode).
 * Used by JS-positioned elements that need to offset column indices.
 */
export function useWideGrid() {
  const [wide, setWide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(WIDE_GRID_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(WIDE_GRID_QUERY);
    const handler = (e: MediaQueryListEvent) => setWide(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return wide;
}
