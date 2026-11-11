'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  BOXED_WIDTH_LIMITS,
  CONTENT_WIDTHS,
  type ContainerSettings,
  type ContentWidth,
  type Device,
  FLEX_NUMBER_LIMITS,
  LAYOUT_MODES,
  LENGTH_LIMITS,
  LENGTH_UNITS,
  type LengthUnit,
  type LayoutMode,
  normalizeResponsiveNumber,
  pick,
  resolveResponsive,
  type Responsive,
} from '../../style';
import { useCanvasDevice } from '../device-row';
import { useEditorBridge } from '../editor-bridge';
import {
  Choose,
  PanelHeading,
  ResponsiveSlider,
  UnitSlider,
} from '../primitives';
import { HiddenValueHint } from './hint';

const CONTENT_WIDTH_LABELS: Record<ContentWidth, string> = {
  full: 'Full width',
  boxed: 'Boxed',
};

function hasAnyNumber(r: Responsive<number> | undefined): boolean {
  return (
    !!r &&
    typeof r === 'object' &&
    Object.values(r).some(v => typeof v === 'number' && Number.isFinite(v))
  );
}

function setDeviceChip(
  current: Responsive<number> | undefined,
  device: Device,
  val: number | undefined
): Responsive<number> | undefined {
  const isObj = typeof current === 'object' && current !== null;
  const base: Partial<Record<Device, number>> = isObj
    ? { ...(current as Record<Device, number>) }
    : {};
  if (val === undefined) {
    delete base[device];
    return Object.values(base).some(v => v !== undefined) ? base : undefined;
  }
  return { ...base, [device]: val };
}

export function ContainerSizeControl({
  value,
  onChange,
}: {
  value: ContainerSettings | undefined;
  onChange: (value: ContainerSettings) => void;
}) {
  const c = value ?? {};
  const [device] = useCanvasDevice();
  const { breakpoints, parentType, parentProps } = useEditorBridge();

  const hasMinMax =
    hasAnyNumber(c.minWidth) ||
    hasAnyNumber(c.maxWidth) ||
    hasAnyNumber(c.minHeight) ||
    hasAnyNumber(c.maxHeight);
  const [showMore, setShowMore] = useState(hasMinMax);

  const set = (patch: Partial<ContainerSettings>) =>
    onChange({ ...c, ...patch });

  const parentContainer =
    parentType === 'Container'
      ? (parentProps?.container as ContainerSettings | undefined)
      : undefined;
  const parentMode = parentContainer
    ? (resolveResponsive(
        parentContainer.mode,
        device,
        v => pick(v, LAYOUT_MODES) as LayoutMode | undefined,
        breakpoints
      ) ?? 'flex')
    : undefined;
  const isInFlexContainer =
    parentType === 'Container' && parentMode === 'flex';

  const hasFlexItemValues =
    hasAnyNumber(c.grow) || hasAnyNumber(c.shrink) || hasAnyNumber(c.basis);

  const widthUnit = c.widthUnit ?? c.sizeUnit;
  const heightUnit = c.heightUnit ?? c.sizeUnit;
  const minWidthUnit = c.minWidthUnit ?? c.sizeUnit;
  const maxWidthUnit = c.maxWidthUnit ?? c.sizeUnit;
  const minHeightUnit = c.minHeightUnit ?? c.sizeUnit;
  const maxHeightUnit = c.maxHeightUnit ?? c.sizeUnit;

  return (
    <div className="space-y-3.5">
      <Choose<ContentWidth>
        label="Content width"
        value={c.contentWidth ?? 'full'}
        options={CONTENT_WIDTHS.map(v => ({
          value: v,
          label: CONTENT_WIDTH_LABELS[v],
        }))}
        onChange={contentWidth => set({ contentWidth })}
      />

      {c.contentWidth === 'boxed' ? (
        <ResponsiveSlider
          label="Boxed width (px)"
          value={c.boxedWidth}
          min={BOXED_WIDTH_LIMITS.min}
          max={BOXED_WIDTH_LIMITS.max}
          step={BOXED_WIDTH_LIMITS.step}
          unit="px"
          onChange={next =>
            set({
              boxedWidth: normalizeResponsiveNumber(next, BOXED_WIDTH_LIMITS),
            })
          }
        />
      ) : hasAnyNumber(c.boxedWidth) ? (
        <HiddenValueHint
          message="Boxed width is set on Boxed mode"
          onClear={() => set({ boxedWidth: undefined })}
        />
      ) : null}

      <div className="space-y-1.5">
        <UnitSlider<LengthUnit>
          label="Width"
          value={c.width}
          unit={widthUnit}
          units={LENGTH_UNITS}
          limits={LENGTH_LIMITS}
          onChange={(width, nextUnit) => set({ width, widthUnit: nextUnit })}
        />
        <div className="flex flex-wrap gap-1">
          {[
            {
              label: 'Auto',
              value: undefined,
              unit: widthUnit ?? ('px' as const),
            },
            { label: '25%', value: 25, unit: '%' as const },
            { label: '50%', value: 50, unit: '%' as const },
            { label: '75%', value: 75, unit: '%' as const },
            { label: '100%', value: 100, unit: '%' as const },
          ].map(p => (
            <button
              key={p.label}
              type="button"
              title={`Set width to ${p.label}`}
              onClick={() =>
                set({
                  width: setDeviceChip(c.width, device, p.value),
                  widthUnit: p.unit,
                })
              }
              className="h-6 rounded border border-border bg-background px-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <UnitSlider<LengthUnit>
          label="Height"
          value={c.height}
          unit={heightUnit}
          units={LENGTH_UNITS}
          limits={LENGTH_LIMITS}
          onChange={(height, nextUnit) =>
            set({ height, heightUnit: nextUnit })
          }
        />
        <div className="flex flex-wrap gap-1">
          {[
            {
              label: 'Auto',
              value: undefined,
              unit: heightUnit ?? ('px' as const),
            },
            { label: '50vh', value: 50, unit: 'vh' as const },
            { label: '100vh', value: 100, unit: 'vh' as const },
          ].map(p => (
            <button
              key={p.label}
              type="button"
              title={`Set height to ${p.label}`}
              onClick={() =>
                set({
                  height: setDeviceChip(c.height, device, p.value),
                  heightUnit: p.unit,
                })
              }
              className="h-6 rounded border border-border bg-background px-1.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore(v => !v)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              'size-3.5 transition-transform',
              showMore && 'rotate-180'
            )}
          />
          More (Min / Max)
        </button>

        {showMore && (
          <div className="mt-2.5 space-y-3 rounded-md border border-border bg-muted/25 p-2.5">
            <UnitSlider<LengthUnit>
              label="Min width"
              value={c.minWidth}
              unit={minWidthUnit}
              units={LENGTH_UNITS}
              limits={LENGTH_LIMITS}
              onChange={(minWidth, nextUnit) =>
                set({ minWidth, minWidthUnit: nextUnit })
              }
            />
            <UnitSlider<LengthUnit>
              label="Max width"
              value={c.maxWidth}
              unit={maxWidthUnit}
              units={LENGTH_UNITS}
              limits={LENGTH_LIMITS}
              onChange={(maxWidth, nextUnit) =>
                set({ maxWidth, maxWidthUnit: nextUnit })
              }
            />
            <UnitSlider<LengthUnit>
              label="Min height"
              value={c.minHeight}
              unit={minHeightUnit}
              units={LENGTH_UNITS}
              limits={LENGTH_LIMITS}
              onChange={(minHeight, nextUnit) =>
                set({ minHeight, minHeightUnit: nextUnit })
              }
            />
            <UnitSlider<LengthUnit>
              label="Max height"
              value={c.maxHeight}
              unit={maxHeightUnit}
              units={LENGTH_UNITS}
              limits={LENGTH_LIMITS}
              onChange={(maxHeight, nextUnit) =>
                set({ maxHeight, maxHeightUnit: nextUnit })
              }
            />
          </div>
        )}
      </div>

      {isInFlexContainer ? (
        <div className="space-y-3 border-t border-border pt-3">
          <PanelHeading>As a flex item</PanelHeading>
          <ResponsiveSlider
            label="Flex grow"
            value={c.grow}
            min={FLEX_NUMBER_LIMITS.min}
            max={FLEX_NUMBER_LIMITS.max}
            step={FLEX_NUMBER_LIMITS.step}
            onChange={next =>
              set({ grow: normalizeResponsiveNumber(next, FLEX_NUMBER_LIMITS) })
            }
          />
          <ResponsiveSlider
            label="Flex shrink"
            value={c.shrink}
            min={FLEX_NUMBER_LIMITS.min}
            max={FLEX_NUMBER_LIMITS.max}
            step={FLEX_NUMBER_LIMITS.step}
            onChange={next =>
              set({
                shrink: normalizeResponsiveNumber(next, FLEX_NUMBER_LIMITS),
              })
            }
          />
          <UnitSlider<LengthUnit>
            label="Flex basis"
            value={c.basis}
            unit={c.basisUnit}
            units={LENGTH_UNITS}
            limits={LENGTH_LIMITS}
            onChange={(basis, basisUnit) => set({ basis, basisUnit })}
          />
        </div>
      ) : hasFlexItemValues ? (
        <HiddenValueHint
          message="Flex-item sizing is set (parent is not a flex Container)"
          onClear={() =>
            set({
              grow: undefined,
              shrink: undefined,
              basis: undefined,
              basisUnit: undefined,
            })
          }
        />
      ) : null}
    </div>
  );
}
