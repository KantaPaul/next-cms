'use client';

import type { ReactNode } from 'react';
import {
  type ContainerSettings,
  DEFAULT_CONTAINER,
  LAYOUT_MODES,
  type LayoutMode,
  pick,
  resolveResponsive,
  safeTrackList,
} from '../../style';
import { useCanvasDevice } from '../device-row';
import { useEditorBridge } from '../editor-bridge';
import { Choose, VisualChoose, type VisualOption } from '../primitives';
import { HiddenValueHint } from './hint';
import {
  applyContainerPreset,
  CONTAINER_PRESETS,
  type ContainerPresetId,
  detectContainerPreset,
} from './presets';
import { ContainerPreview } from './preview';

function thumbBox(className: string) {
  return <span className={`rounded-[2px] bg-current/30 ${className}`} />;
}

const PRESET_THUMBS: Record<ContainerPresetId, ReactNode> = {
  stack: (
    <span className="flex h-6 w-9 flex-col gap-0.5 rounded border border-current/25 p-0.5">
      {thumbBox('h-1.5 w-full')}
      {thumbBox('h-1.5 w-full')}
      {thumbBox('h-1.5 w-full')}
    </span>
  ),
  row: (
    <span className="flex h-6 w-9 items-center gap-0.5 rounded border border-current/25 p-0.5">
      {thumbBox('h-3.5 flex-1')}
      {thumbBox('h-3.5 flex-1')}
      {thumbBox('h-3.5 flex-1')}
    </span>
  ),
  'cols-2': (
    <span className="grid h-6 w-9 grid-cols-2 gap-0.5 rounded border border-current/25 p-0.5">
      {thumbBox('h-full')}
      {thumbBox('h-full')}
    </span>
  ),
  'cols-3': (
    <span className="grid h-6 w-9 grid-cols-3 gap-0.5 rounded border border-current/25 p-0.5">
      {thumbBox('h-full')}
      {thumbBox('h-full')}
      {thumbBox('h-full')}
    </span>
  ),
  'sidebar-left': (
    <span className="grid h-6 w-9 grid-cols-3 gap-0.5 rounded border border-current/25 p-0.5">
      {thumbBox('col-span-1 h-full')}
      {thumbBox('col-span-2 h-full')}
    </span>
  ),
  'sidebar-right': (
    <span className="grid h-6 w-9 grid-cols-3 gap-0.5 rounded border border-current/25 p-0.5">
      {thumbBox('col-span-2 h-full')}
      {thumbBox('col-span-1 h-full')}
    </span>
  ),
  'grid-2x2': (
    <span className="grid h-6 w-9 grid-cols-2 grid-rows-2 gap-0.5 rounded border border-current/25 p-0.5">
      {thumbBox('h-full')}
      {thumbBox('h-full')}
      {thumbBox('h-full')}
      {thumbBox('h-full')}
    </span>
  ),
  centered: (
    <span className="flex h-6 w-9 flex-col items-center justify-center gap-0.5 rounded border border-current/25 p-0.5">
      {thumbBox('h-1.5 w-5')}
      {thumbBox('h-1.5 w-3.5')}
    </span>
  ),
};

const PRESET_OPTIONS: VisualOption<ContainerPresetId>[] = CONTAINER_PRESETS.map(
  preset => ({
    value: preset.id,
    label: preset.label,
    thumb: PRESET_THUMBS[preset.id],
  })
);

function hasNonDefaultFlexSettings(c: ContainerSettings): boolean {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  return (
    (c.direction !== undefined && !same(c.direction, DEFAULT_CONTAINER.direction)) ||
    (c.wrap !== undefined && !same(c.wrap, DEFAULT_CONTAINER.wrap)) ||
    (c.justify !== undefined && !same(c.justify, DEFAULT_CONTAINER.justify)) ||
    (c.alignItems !== undefined && !same(c.alignItems, DEFAULT_CONTAINER.alignItems)) ||
    (c.alignContent !== undefined && !same(c.alignContent, DEFAULT_CONTAINER.alignContent))
  );
}

function hasGridSettings(c: ContainerSettings): boolean {
  const hasCols =
    c.gridTemplateColumns !== undefined &&
    Object.values(c.gridTemplateColumns).some(v => safeTrackList(v) !== undefined);
  const hasRows =
    c.gridTemplateRows !== undefined &&
    Object.values(c.gridTemplateRows).some(v => safeTrackList(v) !== undefined);
  const hasNonDefaultFlow =
    c.gridAutoFlow !== undefined &&
    Object.values(c.gridAutoFlow).some(v => v && v !== 'row');
  return hasCols || hasRows || hasNonDefaultFlow;
}

export function ContainerStructureControl({
  value,
  onChange,
}: {
  value: ContainerSettings | undefined;
  onChange: (value: ContainerSettings) => void;
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

  const activePreset = detectContainerPreset(c, device, breakpoints);

  const set = (patch: Partial<ContainerSettings>) =>
    onChange({ ...c, ...patch });

  return (
    <div className="space-y-3">
      <ContainerPreview value={c} />

      <VisualChoose<ContainerPresetId | ''>
        label="Layout presets"
        value={activePreset}
        columns={4}
        options={PRESET_OPTIONS as VisualOption<ContainerPresetId | ''>[]}
        onChange={preset => {
          if (!preset) return;
          onChange(applyContainerPreset(c, preset, device));
        }}
      />

      <Choose<LayoutMode>
        label="Layout mode"
        value={mode}
        options={[
          { value: 'flex', label: 'Flexbox' },
          { value: 'grid', label: 'CSS Grid' },
        ]}
        onChange={next => set({ mode: next })}
      />

      {mode === 'flex' && hasGridSettings(c) && (
        <HiddenValueHint
          message="Grid tracks are set on Grid mode"
          onClear={() =>
            set({
              gridTemplateColumns: undefined,
              gridTemplateRows: undefined,
              gridAutoFlow: undefined,
            })
          }
        />
      )}

      {mode === 'grid' && hasNonDefaultFlexSettings(c) && (
        <HiddenValueHint
          message="Flex alignment is set on Flex mode"
          onClear={() =>
            set({
              direction: DEFAULT_CONTAINER.direction,
              wrap: DEFAULT_CONTAINER.wrap,
              justify: DEFAULT_CONTAINER.justify,
              alignItems: DEFAULT_CONTAINER.alignItems,
              alignContent: DEFAULT_CONTAINER.alignContent,
            })
          }
        />
      )}
    </div>
  );
}
