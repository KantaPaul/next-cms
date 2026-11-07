/**
 * Per-column widths for HeaderBar ("Custom widths" layout) and HeaderColumns.
 * The template string is written to `--hc-cols`; site.css applies it from the
 * stack breakpoint up (`.s-hcols` / `.s-hcols-lg`).
 */

export type HeaderColWidth = 'auto' | 'fill' | 'custom';
export type HeaderColAlign = 'start' | 'center' | 'end';

export type HeaderCol = {
  width?: HeaderColWidth | string;
  size?: string;
};

const SIZE_RE = /^\d+(\.\d+)?(px|%|rem|em|fr|ch|vw)$/;

/** A safe CSS track for one column; unknown or invalid input falls back to `fill`. */
export function headerColumnTrack(col: HeaderCol): string {
  if (col.width === 'auto') return 'auto';
  if (col.width === 'custom') {
    const size = (col.size ?? '').trim();
    if (SIZE_RE.test(size)) return size;
  }
  return 'minmax(0,1fr)';
}

export function headerGridTemplate(cols: HeaderCol[]): string {
  return cols.map(headerColumnTrack).join(' ');
}

export const HEADER_COL_JUSTIFY: Record<string, string> = {
  start: 'justify-start text-left',
  center: 'justify-center text-center',
  end: 'justify-end text-right',
};

export function headerColJustify(align: unknown, fallback: HeaderColAlign) {
  return (
    HEADER_COL_JUSTIFY[typeof align === 'string' ? align : fallback] ??
    HEADER_COL_JUSTIFY[fallback]
  );
}
