'use client';

import { useId, useState } from 'react';
import { useCanvasDevice } from './device-row';
import type { ContainerTag, Device, LengthUnit, Responsive } from '../style';
import {
  ALIGN_ITEMS_VALUES,
  BOXED_WIDTH_LIMITS,
  CONTENT_WIDTHS,
  FLEX_DIRECTIONS,
  FLEX_NUMBER_LIMITS,
  FLEX_WRAPS,
  GRID_AUTO_FLOWS,
  JUSTIFY_CONTENTS,
  LANDMARK_TAGS,
  LENGTH_LIMITS,
  LENGTH_UNITS,
  LAYOUT_MODES,
  normalizeResponsiveEnum,
  normalizeResponsiveNumber,
  resolveResponsive,
  safeTrackList,
  type AlignItems,
  type ContainerSettings,
  type ContentWidth,
  type FlexDirection,
  type FlexWrap,
  type GridAutoFlow,
  type JustifyContent,
  type LayoutMode,
} from '../style';
import {
  Choose,
  ControlLabel,
  Description,
  Group,
  Notice,
  ResponsiveChoose,
  ResponsiveSlider,
  ShowWhen,
  UnitSlider,
} from './primitives';
import { UrlField } from '../fields/client-fields';

const MODE_LABELS: Record<LayoutMode, string> = {
  flex: 'Flexbox',
  grid: 'CSS Grid',
};

const DIRECTION_LABELS: Record<FlexDirection, string> = {
  row: 'Row (left to right)',
  'row-reverse': 'Row (right to left)',
  column: 'Column (top to bottom)',
  'column-reverse': 'Column (bottom to top)',
};

const WRAP_LABELS: Record<FlexWrap, string> = {
  nowrap: 'No wrap',
  wrap: 'Wrap',
  'wrap-reverse': 'Wrap reverse',
};

const JUSTIFY_LABELS: Record<JustifyContent, string> = {
  start: 'Start',
  center: 'Center',
  end: 'End',
  between: 'Space between',
  around: 'Space around',
  evenly: 'Space evenly',
};

const ALIGN_LABELS: Record<AlignItems, string> = {
  start: 'Start',
  center: 'Center',
  end: 'End',
  stretch: 'Stretch',
  baseline: 'Baseline',
};

const FLOW_LABELS: Record<GridAutoFlow, string> = {
  row: 'Row',
  'row-dense': 'Row dense',
  column: 'Column',
  'column-dense': 'Column dense',
};

const TAG_LABELS: Record<ContainerTag, string> = {
  div: 'Div',
  section: 'Section',
  article: 'Article',
  header: 'Header',
  footer: 'Footer',
  aside: 'Aside',
  nav: 'Nav',
  main: 'Main',
};

const CONTENT_WIDTH_LABELS: Record<ContentWidth, string> = {
  full: 'Full width',
  boxed: 'Boxed',
};

const BOX_SIZING_LABELS: Record<'border-box' | 'content-box', string> = {
  'border-box': 'Border box',
  'content-box': 'Content box',
};

const GRID_PRESETS: string[] = [
  '1fr 1fr',
  '1fr 2fr',
  'repeat(3, 1fr)',
  'repeat(4, 1fr)',
  'repeat(auto-fit, minmax(200px, 1fr))',
  '200px 200px 200px',
];

/** Responsive text input for validated CSS track lists. */
function ResponsiveTrackInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Responsive<string> | undefined;
  onChange: (value: Responsive<string> | undefined) => void;
}) {
  const [device] = useCanvasDevice();
  const [draft, setDraft] = useState('');

  const isObject =
    typeof value === 'object' && value !== null && !Array.isArray(value);
  const currentDeviceVal = isObject
    ? (value as Record<Device, string>)[device]
    : undefined;
  const resolvedVal = resolveResponsive(value, device, safeTrackList) ?? '';
  const hasOverride = currentDeviceVal !== undefined;
  const isInherited =
    !hasOverride && resolvedVal !== '' && device !== 'desktop';

  const resetOverride = () => {
    if (!isObject) return;
    const next = { ...(value as Record<Device, string>) };
    delete next[device];
    const remaining = Object.values(next).some(
      v => v !== undefined && v !== ''
    );
    onChange(remaining ? next : undefined);
  };

  const commit = (nextVal: string) => {
    const trimmed = nextVal.trim();

    if (trimmed === '') {
      const base: Partial<Record<Device, string>> = isObject
        ? { ...(value as Record<Device, string>) }
        : {};
      delete base[device];
      const remaining = Object.values(base).some(
        v => v !== undefined && v !== ''
      );
      onChange(remaining ? base : undefined);
      return;
    }

    const safe = safeTrackList(trimmed);
    if (safe === undefined) return;
    const base: Partial<Record<Device, string>> = isObject
      ? { ...(value as Record<Device, string>) }
      : resolvedVal !== '' && device === 'desktop'
        ? { desktop: resolvedVal }
        : {};
    onChange({ ...base, [device]: safe });
  };

  const aside = hasOverride ? (
    <button
      type="button"
      title={`Reset ${device} track override`}
      onClick={resetOverride}
      className="h-auto gap-0.5 px-1 py-0 text-[11px] text-primary hover:text-primary"
    >
      Reset
    </button>
  ) : isInherited ? (
    <span className="text-[10px] italic text-muted-foreground">Inherited</span>
  ) : null;

  return (
    <div>
      <ControlLabel label={label}>
        <div className="flex items-center gap-1.5">{aside}</div>
      </ControlLabel>
      <div className="flex h-8 w-full min-w-0 items-center rounded-md border border-input bg-background pr-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        <input
          type="text"
          value={draft}
          placeholder="e.g. repeat(3, 1fr)"
          onChange={e => setDraft(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && commit(e.currentTarget.value)}
          className="h-full flex-1 border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GRID_PRESETS.map(preset => (
          <button
            key={preset}
            type="button"
            title={`Use ${preset}`}
            onClick={() => {
              const base: Partial<Record<Device, string>> = isObject
                ? { ...(value as Record<Device, string>) }
                : {};
              onChange({ ...base, [device]: preset });
            }}
            className="h-7 min-w-[80px] rounded-none border border-border bg-background px-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {preset}
          </button>
        ))}
      </div>
      <Description>
        Track sizes accept px, rem, em, %, vw, fr, auto, min-content,
        max-content, fit-content(), repeat(), and minmax(). Invalid values are
        ignored.
      </Description>
    </div>
  );
}

export function ContainerLayoutControl({
  value,
  onChange,
}: {
  value: ContainerSettings | undefined;
  onChange: (value: ContainerSettings | undefined) => void;
}) {
  const c = value ?? {};
  const [device] = useCanvasDevice();
  const id = useId();
  const mode =
    resolveResponsive(c.mode, device, v => {
      if (typeof v !== 'string') return undefined;
      return LAYOUT_MODES.includes(v as LayoutMode)
        ? (v as LayoutMode)
        : undefined;
    }) ?? 'flex';
  const set = (patch: Partial<ContainerSettings>) =>
    onChange({ ...(c ?? {}), ...patch });

  const widthUnits = LENGTH_UNITS as readonly LengthUnit[];

  const optionLabels = <T extends Record<string, string>>(
    map: T
  ): { value: keyof T; label: string }[] =>
    Object.keys(map).map(value => ({
      value: value as keyof T,
      label: map[value],
    }));

  return (
    <div>
      <Group title="Container" defaultOpen>
        <Choose
          label="HTML tag"
          value={c.tag ?? 'div'}
          options={optionLabels(TAG_LABELS)}
          onChange={next => set({ tag: next })}
          columns={4}
        />
        <Notice>
          Landmark tags ({LANDMARK_TAGS.join(', ')}) should be unique per page.
        </Notice>
        <Choose
          label="Layout mode"
          value={mode}
          options={optionLabels(MODE_LABELS)}
          onChange={next => set({ mode: next })}
        />
        <Choose
          label="Content width"
          value={c.contentWidth ?? 'full'}
          options={optionLabels(CONTENT_WIDTH_LABELS)}
          onChange={next => set({ contentWidth: next })}
        />
        <ShowWhen when={c.contentWidth === 'boxed'}>
          <ResponsiveSlider
            label="Boxed width (px)"
            value={c.boxedWidth}
            min={1}
            max={2000}
            step={1}
            onChange={next =>
              set({
                boxedWidth: normalizeResponsiveNumber(next, BOXED_WIDTH_LIMITS),
              })
            }
          />
        </ShowWhen>
      </Group>

      <ShowWhen when={mode === 'flex'}>
        <Group title="Flexbox" defaultOpen>
          <ResponsiveChoose
            label="Direction"
            value={c.direction}
            options={optionLabels(DIRECTION_LABELS)}
            onChange={next =>
              set({ direction: normalizeResponsiveEnum(next, FLEX_DIRECTIONS) })
            }
          />
          <ResponsiveChoose
            label="Wrap"
            value={c.wrap}
            options={optionLabels(WRAP_LABELS)}
            onChange={next =>
              set({ wrap: normalizeResponsiveEnum(next, FLEX_WRAPS) })
            }
          />
          <ResponsiveChoose
            label="Justify content"
            value={c.justify}
            options={optionLabels(JUSTIFY_LABELS)}
            onChange={next =>
              set({ justify: normalizeResponsiveEnum(next, JUSTIFY_CONTENTS) })
            }
          />
          <ResponsiveChoose
            label="Align items"
            value={c.alignItems}
            options={optionLabels(ALIGN_LABELS)}
            onChange={next =>
              set({
                alignItems: normalizeResponsiveEnum(next, ALIGN_ITEMS_VALUES),
              })
            }
          />
          <ResponsiveChoose
            label="Align content"
            value={c.alignContent}
            options={optionLabels(JUSTIFY_LABELS)}
            onChange={next =>
              set({
                alignContent: normalizeResponsiveEnum(next, JUSTIFY_CONTENTS),
              })
            }
          />
          <UnitSlider
            label="Gap"
            value={c.gap}
            unit={c.gapUnit}
            units={LENGTH_UNITS}
            limits={LENGTH_LIMITS}
            onChange={(gap, gapUnit) => set({ gap, gapUnit })}
          />
          <UnitSlider
            label="Column gap"
            value={c.columnGap}
            unit={c.gapUnit}
            units={LENGTH_UNITS}
            limits={LENGTH_LIMITS}
            onChange={(columnGap, gapUnit) => set({ columnGap, gapUnit })}
          />
          <UnitSlider
            label="Row gap"
            value={c.rowGap}
            unit={c.gapUnit}
            units={LENGTH_UNITS}
            limits={LENGTH_LIMITS}
            onChange={(rowGap, gapUnit) => set({ rowGap, gapUnit })}
          />
        </Group>
      </ShowWhen>

      <ShowWhen when={mode === 'grid'}>
        <Group title="CSS Grid" defaultOpen>
          <ResponsiveTrackInput
            label="Column tracks"
            value={c.gridTemplateColumns}
            onChange={next => set({ gridTemplateColumns: next })}
          />
          <ResponsiveTrackInput
            label="Row tracks"
            value={c.gridTemplateRows}
            onChange={next => set({ gridTemplateRows: next })}
          />
          <ResponsiveChoose
            label="Auto flow"
            value={c.gridAutoFlow}
            options={optionLabels(FLOW_LABELS)}
            onChange={next =>
              set({
                gridAutoFlow: normalizeResponsiveEnum(next, GRID_AUTO_FLOWS),
              })
            }
          />
          <UnitSlider
            label="Column gap"
            value={c.columnGap}
            unit={c.gapUnit}
            units={LENGTH_UNITS}
            limits={LENGTH_LIMITS}
            onChange={(columnGap, gapUnit) => set({ columnGap, gapUnit })}
          />
          <UnitSlider
            label="Row gap"
            value={c.rowGap}
            unit={c.gapUnit}
            units={LENGTH_UNITS}
            limits={LENGTH_LIMITS}
            onChange={(rowGap, gapUnit) => set({ rowGap, gapUnit })}
          />
          <Description>
            Child blocks gain grid placement in the Layout tab of the Style
            inspector (column/row start and span).
          </Description>
        </Group>
      </ShowWhen>

      <Group title="Sizing" defaultOpen>
        <UnitSlider
          label="Width"
          value={c.width}
          unit={c.sizeUnit}
          units={widthUnits}
          limits={LENGTH_LIMITS}
          onChange={(width, sizeUnit) => set({ width, sizeUnit })}
        />
        <UnitSlider
          label="Min width"
          value={c.minWidth}
          unit={c.sizeUnit}
          units={widthUnits}
          limits={LENGTH_LIMITS}
          onChange={(minWidth, sizeUnit) => set({ minWidth, sizeUnit })}
        />
        <UnitSlider
          label="Max width"
          value={c.maxWidth}
          unit={c.sizeUnit}
          units={widthUnits}
          limits={LENGTH_LIMITS}
          onChange={(maxWidth, sizeUnit) => set({ maxWidth, sizeUnit })}
        />
        <UnitSlider
          label="Height"
          value={c.height}
          unit={c.sizeUnit}
          units={widthUnits}
          limits={LENGTH_LIMITS}
          onChange={(height, sizeUnit) => set({ height, sizeUnit })}
        />
        <UnitSlider
          label="Min height"
          value={c.minHeight}
          unit={c.sizeUnit}
          units={widthUnits}
          limits={LENGTH_LIMITS}
          onChange={(minHeight, sizeUnit) => set({ minHeight, sizeUnit })}
        />
        <UnitSlider
          label="Max height"
          value={c.maxHeight}
          unit={c.sizeUnit}
          units={widthUnits}
          limits={LENGTH_LIMITS}
          onChange={(maxHeight, sizeUnit) => set({ maxHeight, sizeUnit })}
        />
        <ResponsiveSlider
          label="Flex grow"
          value={c.grow}
          min={0}
          max={100}
          step={1}
          onChange={next =>
            set({ grow: normalizeResponsiveNumber(next, FLEX_NUMBER_LIMITS) })
          }
        />
        <ResponsiveSlider
          label="Flex shrink"
          value={c.shrink}
          min={0}
          max={100}
          step={1}
          onChange={next =>
            set({ shrink: normalizeResponsiveNumber(next, FLEX_NUMBER_LIMITS) })
          }
        />
        <UnitSlider
          label="Flex basis"
          value={c.basis}
          unit={c.basisUnit}
          units={LENGTH_UNITS}
          limits={LENGTH_LIMITS}
          onChange={(basis, basisUnit) => set({ basis, basisUnit })}
        />
        <Choose
          label="Box sizing"
          value={c.boxSizing ?? 'border-box'}
          options={optionLabels(BOX_SIZING_LABELS)}
          onChange={next => set({ boxSizing: next })}
        />
      </Group>

      <Group title="Link" defaultOpen={false}>
        <ControlLabel label="Whole-container link">
          <span className="text-xs text-muted-foreground">
            Wraps the container in one anchor
          </span>
        </ControlLabel>
        <UrlField
          name={id}
          id={id}
          value={typeof c.link === 'string' ? c.link : (c.link?.url ?? '')}
          field={{ label: 'Link' }}
          onChange={next => set({ link: next || undefined })}
        />
      </Group>
    </div>
  );
}
