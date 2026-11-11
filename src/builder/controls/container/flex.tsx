'use client';

import {
  AlignmentPad,
  type AlignOption,
  type JustifyOption,
} from '@nextcms/editor-ui';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  RotateCcw,
  WrapText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ALIGN_CONTENTS,
  ALIGN_ITEMS_VALUES,
  type AlignContent,
  type AlignItems,
  type ContainerSettings,
  type Device,
  FLEX_DIRECTIONS,
  FLEX_WRAPS,
  type FlexDirection,
  type FlexWrap,
  JUSTIFY_CONTENTS,
  type JustifyContent,
  normalizeResponsiveEnum,
  pick,
  resolveResponsive,
} from '../../style';
import { useCanvasDevice } from '../device-row';
import { useEditorBridge } from '../editor-bridge';
import {
  type ChooseOption,
  ControlLabel,
  ResponsiveChoose,
} from '../primitives';
import { LinkedGapInput } from './gap';
import { HiddenValueHint } from './hint';

const DIRECTION_OPTIONS: ChooseOption<FlexDirection>[] = [
  { value: 'row', label: 'Row (left to right)', icon: <ArrowRight /> },
  { value: 'row-reverse', label: 'Row (right to left)', icon: <ArrowLeft /> },
  { value: 'column', label: 'Column (top to bottom)', icon: <ArrowDown /> },
  {
    value: 'column-reverse',
    label: 'Column (bottom to top)',
    icon: <ArrowUp />,
  },
];

const WRAP_OPTIONS: ChooseOption<'nowrap' | 'wrap'>[] = [
  { value: 'nowrap', label: 'No wrap', icon: <ArrowRightToLine /> },
  { value: 'wrap', label: 'Wrap', icon: <WrapText /> },
];

const ALIGN_CONTENT_OPTIONS: ChooseOption<AlignContent>[] = [
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
  { value: 'between', label: 'Between' },
  { value: 'around', label: 'Around' },
  { value: 'evenly', label: 'Evenly' },
];

function toPadJustify(j: JustifyContent): JustifyOption {
  if (j === 'between') return 'space-between';
  if (j === 'around') return 'space-around';
  if (j === 'evenly') return 'space-evenly';
  return j;
}

function fromPadJustify(j: JustifyOption): JustifyContent {
  if (j === 'space-between') return 'between';
  if (j === 'space-around') return 'around';
  if (j === 'space-evenly') return 'evenly';
  return j;
}

function hasCustomAlignContent(
  alignContent: ContainerSettings['alignContent']
): boolean {
  if (!alignContent) return false;
  return Object.entries(alignContent).some(
    ([d, v]) => v !== undefined && !(d === 'desktop' && v === 'start')
  );
}

export function ContainerFlexControl({
  value,
  onChange,
}: {
  value: ContainerSettings | undefined;
  onChange: (value: ContainerSettings) => void;
}) {
  const c = value ?? {};
  const [device] = useCanvasDevice();
  const { breakpoints } = useEditorBridge();

  const set = (patch: Partial<ContainerSettings>) =>
    onChange({ ...c, ...patch });

  const resolvedWrap: FlexWrap =
    resolveResponsive(
      c.wrap,
      device,
      v => pick(v, FLEX_WRAPS),
      breakpoints
    ) ?? 'nowrap';

  const resolvedJustify: JustifyContent =
    resolveResponsive(
      c.justify,
      device,
      v => pick(v, JUSTIFY_CONTENTS),
      breakpoints
    ) ?? 'start';

  const resolvedAlign: AlignItems =
    resolveResponsive(
      c.alignItems,
      device,
      v => pick(v, ALIGN_ITEMS_VALUES),
      breakpoints
    ) ?? 'stretch';

  const hasAlignOverride =
    c.justify?.[device] !== undefined || c.alignItems?.[device] !== undefined;
  const isAlignInherited = !hasAlignOverride && device !== 'desktop';

  const resetAlignOverride = () => {
    const nextJustify = { ...(c.justify ?? {}) } as Record<Device, JustifyContent>;
    const nextAlign = { ...(c.alignItems ?? {}) } as Record<Device, AlignItems>;
    delete nextJustify[device];
    delete nextAlign[device];
    set({
      justify: Object.values(nextJustify).some(Boolean) ? nextJustify : undefined,
      alignItems: Object.values(nextAlign).some(Boolean) ? nextAlign : undefined,
    });
  };

  return (
    <div className="space-y-3.5">
      <ResponsiveChoose<FlexDirection>
        label="Direction"
        value={c.direction}
        options={DIRECTION_OPTIONS}
        onChange={next =>
          set({ direction: normalizeResponsiveEnum(next, FLEX_DIRECTIONS) })
        }
      />

      <ResponsiveChoose<'nowrap' | 'wrap'>
        label="Wrap"
        value={
          c.wrap
            ? (Object.fromEntries(
                Object.entries(c.wrap).map(([d, v]) => [
                  d,
                  v === 'wrap-reverse' ? 'wrap' : v,
                ])
              ) as Partial<Record<Device, 'nowrap' | 'wrap'>>)
            : undefined
        }
        options={WRAP_OPTIONS}
        onChange={next =>
          set({ wrap: normalizeResponsiveEnum(next, FLEX_WRAPS) })
        }
      />

      <div>
        <ControlLabel label="Alignment" responsive>
          {hasAlignOverride ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title={`Reset ${device} alignment override`}
              onClick={resetAlignOverride}
              className="h-auto gap-0.5 px-1 py-0 text-[11px] text-primary hover:text-primary"
            >
              <RotateCcw className="size-2.5" /> Reset
            </Button>
          ) : isAlignInherited ? (
            <span className="text-[10px] italic text-muted-foreground">
              Inherited
            </span>
          ) : null}
        </ControlLabel>
        <AlignmentPad
          value={{
            justify: toPadJustify(resolvedJustify),
            align: resolvedAlign as AlignOption,
          }}
          onChange={next => {
            const mappedJustify = fromPadJustify(next.justify);
            const nextJustify = {
              ...(c.justify ?? {}),
              [device]: mappedJustify,
            };
            const nextAlign = {
              ...(c.alignItems ?? {}),
              [device]: next.align,
            };
            set({
              justify: normalizeResponsiveEnum(nextJustify, JUSTIFY_CONTENTS),
              alignItems: normalizeResponsiveEnum(nextAlign, ALIGN_ITEMS_VALUES),
            });
          }}
        />
      </div>

      {resolvedWrap !== 'nowrap' ? (
        <ResponsiveChoose<AlignContent>
          label="Align content"
          columns={3}
          value={c.alignContent}
          options={ALIGN_CONTENT_OPTIONS}
          onChange={next =>
            set({ alignContent: normalizeResponsiveEnum(next, ALIGN_CONTENTS) })
          }
        />
      ) : hasCustomAlignContent(c.alignContent) ? (
        <HiddenValueHint
          message="Align content is set (applies when wrapping)"
          onClear={() => set({ alignContent: { desktop: 'start' } })}
        />
      ) : null}

      <LinkedGapInput value={c} onChange={set} />
    </div>
  );
}
