import {
  type BreakpointConfig,
  DEVICES,
  type ContainerSettings,
  type Device,
  type FlexDirection,
  type FlexWrap,
  type GridAutoFlow,
  type JustifyContent,
  type LayoutMode,
  type Responsive,
  LAYOUT_MODES,
  FLEX_DIRECTIONS,
  FLEX_WRAPS,
  JUSTIFY_CONTENTS,
  ALIGN_ITEMS_VALUES,
  GRID_AUTO_FLOWS,
  pick,
  resolveResponsive,
  safeTrackList,
} from '../../style';

export type ContainerPresetId =
  | 'stack'
  | 'row'
  | 'cols-2'
  | 'cols-3'
  | 'sidebar-left'
  | 'sidebar-right'
  | 'grid-2x2'
  | 'centered';

export type ContainerPresetMeta = {
  id: ContainerPresetId;
  label: string;
};

export const CONTAINER_PRESETS: readonly ContainerPresetMeta[] = [
  { id: 'stack', label: 'Stack' },
  { id: 'row', label: 'Row' },
  { id: 'cols-2', label: '2 columns' },
  { id: 'cols-3', label: '3 columns' },
  { id: 'sidebar-left', label: 'Sidebar left' },
  { id: 'sidebar-right', label: 'Sidebar right' },
  { id: 'grid-2x2', label: '2×2 grid' },
  { id: 'centered', label: 'Centered' },
] as const;

function withDevice<T>(
  prev: Responsive<T> | undefined,
  device: Device,
  value: T
): Responsive<T> {
  const base =
    prev && typeof prev === 'object' && !Array.isArray(prev) ? { ...prev } : {};
  return { ...base, [device]: value };
}

function clearDevice<T>(
  prev: Responsive<T> | undefined,
  device: Device
): Responsive<T> | undefined {
  if (!prev || typeof prev !== 'object' || Array.isArray(prev)) return undefined;
  const next = { ...prev };
  delete next[device];
  const hasAny = DEVICES.some(d => next[d] !== undefined);
  return hasAny ? next : undefined;
}

type PresetSpec = {
  mode: LayoutMode;
  direction?: FlexDirection;
  wrap?: FlexWrap;
  justify?: JustifyContent;
  alignItems?: (typeof ALIGN_ITEMS_VALUES)[number];
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridAutoFlow?: GridAutoFlow;
  gap: number;
};

const PRESET_SPECS: Record<ContainerPresetId, PresetSpec> = {
  stack: {
    mode: 'flex',
    direction: 'column',
    wrap: 'nowrap',
    justify: 'start',
    alignItems: 'stretch',
    gap: 16,
  },
  row: {
    mode: 'flex',
    direction: 'row',
    wrap: 'nowrap',
    justify: 'start',
    alignItems: 'center',
    gap: 16,
  },
  'cols-2': {
    mode: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridAutoFlow: 'row',
    gap: 24,
  },
  'cols-3': {
    mode: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridAutoFlow: 'row',
    gap: 24,
  },
  'sidebar-left': {
    mode: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gridAutoFlow: 'row',
    gap: 24,
  },
  'sidebar-right': {
    mode: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gridAutoFlow: 'row',
    gap: 24,
  },
  'grid-2x2': {
    mode: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, 1fr)',
    gridAutoFlow: 'row',
    gap: 24,
  },
  centered: {
    mode: 'flex',
    direction: 'column',
    wrap: 'nowrap',
    justify: 'center',
    alignItems: 'center',
    gap: 16,
  },
};

/**
 * Applies a layout preset to `ContainerSettings` for `device`, preserving
 * other devices' values and clearing conflicting gap longhands.
 */
export function applyContainerPreset(
  current: ContainerSettings | undefined,
  preset: ContainerPresetId,
  device: Device
): ContainerSettings {
  const c = current ?? {};
  const spec = PRESET_SPECS[preset];
  const next: ContainerSettings = {
    ...c,
    mode: spec.mode,
    gap: withDevice(c.gap, device, spec.gap),
    gapUnit: 'px',
    columnGap: undefined,
    rowGap: undefined,
  };

  if (spec.mode === 'flex') {
    next.direction = withDevice(c.direction, device, spec.direction ?? 'row');
    next.wrap = withDevice(c.wrap, device, spec.wrap ?? 'nowrap');
    next.justify = withDevice(c.justify, device, spec.justify ?? 'start');
    next.alignItems = withDevice(
      c.alignItems,
      device,
      spec.alignItems ?? 'stretch'
    );
  } else {
    next.gridTemplateColumns = withDevice(
      c.gridTemplateColumns,
      device,
      spec.gridTemplateColumns ?? '1fr 1fr'
    );
    next.gridTemplateRows = spec.gridTemplateRows
      ? withDevice(c.gridTemplateRows, device, spec.gridTemplateRows)
      : clearDevice(c.gridTemplateRows, device);
    next.gridAutoFlow = withDevice(
      c.gridAutoFlow,
      device,
      spec.gridAutoFlow ?? 'row'
    );
  }

  return next;
}

/**
 * Returns the matching preset id when the active device's resolved settings
 * match one of the presets, or `''` otherwise.
 */
export function detectContainerPreset(
  current: ContainerSettings | undefined,
  device: Device,
  breakpoints?: BreakpointConfig
): ContainerPresetId | '' {
  const c = current ?? {};
  const mode =
    resolveResponsive(
      c.mode,
      device,
      v => pick(v, LAYOUT_MODES),
      breakpoints
    ) ?? 'flex';

  if (mode === 'flex') {
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

    for (const id of ['stack', 'row', 'centered'] as const) {
      const spec = PRESET_SPECS[id];
      if (
        direction === spec.direction &&
        wrap === spec.wrap &&
        justify === spec.justify &&
        alignItems === spec.alignItems
      ) {
        return id;
      }
    }
    return '';
  }

  const cols = resolveResponsive(
    c.gridTemplateColumns,
    device,
    safeTrackList,
    breakpoints
  );
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

  if (flow !== 'row') return '';
  if (cols === 'repeat(2, 1fr)' && rows === 'repeat(2, 1fr)') return 'grid-2x2';
  if (rows) return '';
  if (cols === 'repeat(2, 1fr)') return 'cols-2';
  if (cols === 'repeat(3, 1fr)') return 'cols-3';
  if (cols === '1fr 2fr') return 'sidebar-left';
  if (cols === '2fr 1fr') return 'sidebar-right';
  return '';
}
