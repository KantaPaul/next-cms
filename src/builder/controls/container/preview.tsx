'use client';

import type { CSSProperties } from 'react';
import {
  ALIGN_CONTENTS,
  ALIGN_ITEMS_VALUES,
  type ContainerSettings,
  FLEX_DIRECTIONS,
  FLEX_WRAPS,
  GRID_AUTO_FLOWS,
  JUSTIFY_CONTENTS,
  LAYOUT_MODES,
  pick,
  resolveResponsive,
  safeTrackList,
} from '../../style';
import { useCanvasDevice } from '../device-row';
import { useEditorBridge } from '../editor-bridge';

const CSS_JUSTIFY: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

const CSS_ALIGN: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const validNum = (x: unknown): number | undefined =>
  typeof x === 'number' && Number.isFinite(x) ? x : undefined;

function scaleGapPx(n: number | undefined): string {
  if (n === undefined || n <= 0) return '2px';
  return `${Math.min(12, Math.max(2, Math.round(n / 4)))}px`;
}

/**
 * CSS-only live mini diagram of the Container's children direction, alignment,
 * wrap, gap, and grid tracks for the active device.
 */
export function ContainerPreview({
  value,
}: {
  value: ContainerSettings | undefined;
}) {
  const c = value ?? {};
  const [device] = useCanvasDevice();
  const { breakpoints } = useEditorBridge();

  const mode =
    resolveResponsive(
      c.mode,
      device,
      v => pick(v, LAYOUT_MODES),
      breakpoints
    ) ?? 'flex';

  const gapVal = resolveResponsive(c.gap, device, validNum, breakpoints);
  const colGapVal = resolveResponsive(c.columnGap, device, validNum, breakpoints);
  const rowGapVal = resolveResponsive(c.rowGap, device, validNum, breakpoints);

  const direction =
    resolveResponsive(
      c.direction,
      device,
      v => pick(v, FLEX_DIRECTIONS),
      breakpoints
    ) ?? 'row';
  const wrap =
    resolveResponsive(
      c.wrap,
      device,
      v => pick(v, FLEX_WRAPS),
      breakpoints
    ) ?? 'nowrap';
  const justify =
    resolveResponsive(
      c.justify,
      device,
      v => pick(v, JUSTIFY_CONTENTS),
      breakpoints
    ) ?? 'start';
  const alignItems =
    resolveResponsive(
      c.alignItems,
      device,
      v => pick(v, ALIGN_ITEMS_VALUES),
      breakpoints
    ) ?? 'stretch';
  const alignContent =
    resolveResponsive(
      c.alignContent,
      device,
      v => pick(v, ALIGN_CONTENTS),
      breakpoints
    ) ?? 'start';

  const cols =
    resolveResponsive(
      c.gridTemplateColumns,
      device,
      safeTrackList,
      breakpoints
    ) ?? '1fr 1fr';
  const rows = resolveResponsive(
    c.gridTemplateRows,
    device,
    safeTrackList,
    breakpoints
  );
  const flow =
    resolveResponsive(
      c.gridAutoFlow,
      device,
      v => pick(v, GRID_AUTO_FLOWS),
      breakpoints
    ) ?? 'row';

  const hasLonghandGap = colGapVal !== undefined || rowGapVal !== undefined;
  const gapStyles: CSSProperties = hasLonghandGap
    ? {
        columnGap: scaleGapPx(colGapVal ?? gapVal),
        rowGap: scaleGapPx(rowGapVal ?? gapVal),
      }
    : { gap: scaleGapPx(gapVal) };

  const containerStyle: CSSProperties =
    mode === 'grid'
      ? {
          display: 'grid',
          gridTemplateColumns: cols,
          ...(rows ? { gridTemplateRows: rows } : {}),
          gridAutoFlow: flow.replace('-', ' '),
          ...gapStyles,
        }
      : {
          display: 'flex',
          flexDirection: direction,
          flexWrap: wrap,
          justifyContent: CSS_JUSTIFY[justify] ?? 'flex-start',
          alignItems: CSS_ALIGN[alignItems] ?? 'stretch',
          alignContent:
            wrap === 'nowrap' ? undefined : (CSS_JUSTIFY[alignContent] ?? 'flex-start'),
          ...gapStyles,
        };

  const isRow = mode === 'flex' && (direction === 'row' || direction === 'row-reverse');
  const isWrap = mode === 'flex' && wrap !== 'nowrap';
  const itemCount = mode === 'grid' ? 4 : isWrap ? 5 : 3;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="font-medium capitalize">{device}</span>
        <span>
          {mode === 'grid'
            ? `Grid · ${cols}`
            : `Flex · ${direction}${wrap !== 'nowrap' ? ` · ${wrap}` : ''}`}
        </span>
      </div>
      <div
        aria-label="Container layout preview"
        data-preview-mode={mode}
        data-preview-device={device}
        className="h-20 w-full overflow-hidden rounded-md border border-border bg-muted/40 p-2"
        style={containerStyle}
      >
        {Array.from({ length: itemCount }, (_, i) => (
          <div
            key={i}
            className="rounded-sm border border-primary/35 bg-primary/15"
            style={{
              minWidth: mode === 'grid' ? 0 : isWrap ? '30%' : isRow ? 16 : 24,
              minHeight: mode === 'grid' ? 14 : isRow ? 16 : 12,
              flexShrink: isWrap ? 0 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
