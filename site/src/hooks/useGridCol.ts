import { useDesktop, useWideGrid } from './useWideGrid';

/**
 * Returns a gridColumn inline style that only applies on md+ viewports.
 * On mobile, returns undefined so col-span-full takes effect.
 */
export function useGridCol() {
  const desktop = useDesktop();
  const wide = useWideGrid();
  const offset = wide ? 1 : 0;

  return (start: number, span: number) =>
    desktop ? { gridColumn: `${start + offset} / span ${span}` } : undefined;
}
