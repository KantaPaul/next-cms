/**
 * Per-column widths for HeaderBar ("Custom widths" layout) and HeaderColumns.
 * The template string is written to `--hc-cols`; site.css applies it from the
 * stack breakpoint up (`.s-hcols` / `.s-hcols-lg`).
 */

import {
  type Device,
  type MaybeResponsive,
  resolveResponsive,
} from '../style';

export type HeaderColWidth = 'auto' | 'fill' | 'custom';
export type HeaderColAlign = 'start' | 'center' | 'end';

export type HeaderCol = {
  width?: MaybeResponsive<HeaderColWidth | string>;
  size?: MaybeResponsive<string>;
  props?: Record<string, unknown>;
};

export const SIZE_RE = /^\d+(\.\d+)?(px|%|rem|em|fr|ch|vw)$/;

const validString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;

function extractCol(col: HeaderCol | { props?: Record<string, unknown> }): {
  width?: MaybeResponsive<string>;
  size?: MaybeResponsive<string>;
} {
  if (col && typeof col === 'object' && 'props' in col && col.props && typeof col.props === 'object') {
    return {
      width: col.props.width as MaybeResponsive<string> | undefined,
      size: col.props.size as MaybeResponsive<string> | undefined,
    };
  }
  return col as { width?: MaybeResponsive<string>; size?: MaybeResponsive<string> };
}

/** A safe CSS track for one column; unknown or invalid input falls back to `fill`. */
export function headerColumnTrack(
  col: HeaderCol | { props?: Record<string, unknown> },
  device: Device = 'desktop'
): string {
  const { width: rawWidth, size: rawSize } = extractCol(col);
  const width = resolveResponsive(rawWidth, device, validString);
  if (width === 'auto') return 'auto';
  if (width === 'fill') return 'minmax(0,1fr)';
  if (width === 'custom') {
    const size = resolveResponsive(rawSize, device, validString) ?? '';
    if (SIZE_RE.test(size)) return size;
    return 'minmax(0,1fr)';
  }
  if (width && SIZE_RE.test(width)) return width;
  return 'minmax(0,1fr)';
}

export function headerGridTemplate(
  cols: Array<HeaderCol | { props?: Record<string, unknown> }>,
  device: Device = 'desktop'
): string {
  if (!cols.length) return 'minmax(0,1fr)';
  return cols.map(c => headerColumnTrack(c, device)).join(' ');
}

export function headerGridFromColumns(
  columns: Array<{ props?: Record<string, unknown> } | HeaderCol>,
  device: Device = 'desktop'
): string {
  return headerGridTemplate(columns, device);
}

function hasDeviceOverride(
  columns: Array<{ props?: Record<string, unknown> } | HeaderCol>,
  device: Device
): boolean {
  return columns.some(col => {
    const { width } = extractCol(col);
    return (
      !!width &&
      typeof width === 'object' &&
      !Array.isArray(width) &&
      typeof (width as Record<string, unknown>)[device] === 'string' &&
      ((width as Record<string, string>)[device] ?? '').trim().length > 0
    );
  });
}

export function columnsGridStyle(
  columns: Array<{ props?: Record<string, unknown> } | HeaderCol>,
  options?: { tabletFallback?: string; mobileFallback?: string }
): Record<string, string> {
  const style: Record<string, string> = {
    '--hc-cols': headerGridFromColumns(columns, 'desktop'),
  };
  if (hasDeviceOverride(columns, 'tablet')) {
    style['--hc-cols-md'] = headerGridFromColumns(columns, 'tablet');
  } else if (options?.tabletFallback) {
    style['--hc-cols-md'] = options.tabletFallback;
  }
  if (hasDeviceOverride(columns, 'mobile')) {
    style['--hc-cols-sm'] = headerGridFromColumns(columns, 'mobile');
  } else if (options?.mobileFallback) {
    style['--hc-cols-sm'] = options.mobileFallback;
  }
  return style;
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
