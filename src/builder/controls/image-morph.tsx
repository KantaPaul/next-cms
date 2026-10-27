'use client';

import { Choose, ColorInput, Group, SelectInput, Slider, Switcher, type ChooseOption } from './primitives';
import { useInspectorTab } from './inspector-tab';
import { MediaField } from '@/components/media/media-picker';
import type { MediaItem } from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import { extractSvgPath } from '../morph';
import {
  MORPH_DIRECTIONS,
  MORPH_EASINGS,
  DEFAULT_MORPH_SHAPES,
  type MorphData,
  type MorphEffect,
  type MorphTiming,
} from '../morph';

type Props = {
  name: string;
  id: string;
  value: MorphData;
  onChange: (value: MorphData) => void;
  readOnly?: boolean;
  field: { label?: string };
};

const EFFECT_OPTIONS: ChooseOption<MorphEffect>[] = [
  { value: 'image', label: 'Image' },
  { value: 'color', label: 'Color' },
  { value: 'gradient', label: 'Gradient' },
];

const DIRECTION_OPTIONS: ChooseOption<string>[] = MORPH_DIRECTIONS.map(
  direction => ({ value: direction, label: direction })
);

const SHAPE_MODES = [
  { value: 'default', label: 'Default blobs' },
  { value: 'custom', label: 'Custom shapes' },
] as const;

function ContentGroups({
  value,
  onChange,
}: {
  value: MorphData;
  onChange: (value: MorphData) => void;
}) {
  const set = (patch: Partial<MorphData>) => onChange({ ...value, ...patch });

  const handlePickShape = async (item: MediaItem) => {
    const shapes =
      value.shape?.type === 'custom' ? value.shape.shapes : DEFAULT_MORPH_SHAPES;
    if (!item.mime?.startsWith('image/svg')) return;
    try {
      const response = await fetch(item.url);
      const svg = await response.text();
      const d = extractSvgPath(svg);
      if (!d) return;
      onChange({
        ...value,
        shape: {
          type: 'custom',
          shapes: shapes.map((shape, index) => (index === 0 ? { d } : shape)),
        },
      });
    } catch {
      // A failed fetch leaves the current shape untouched.
    }
  };

  return (
    <>
      <Group title="Effect">
        <Choose
          label="Effect"
          value={value.effect ?? 'image'}
          options={EFFECT_OPTIONS}
          onChange={effect => set({ effect })}
        />
      </Group>

      <Group title="Shape">
        <Choose
          label="Source"
          value={(value.shape?.type as string) ?? 'default'}
          options={SHAPE_MODES.map(mode => ({ value: mode.value, label: mode.label })) as ChooseOption<string>[]}
          onChange={type =>
            onChange({
              ...value,
              shape:
                type === 'custom'
                  ? {
                      type: 'custom',
                      shapes: value.shape?.type === 'custom' ? value.shape.shapes : DEFAULT_MORPH_SHAPES,
                    }
                  : { type: 'default', shapes: DEFAULT_MORPH_SHAPES },
            })
          }
        />
        {value.shape?.type === 'custom' ? (
          <MediaField
            value=""
            onChange={() => {}}
            onPickItem={handlePickShape}
          />
        ) : null}
        {value.shape?.type === 'custom' && (value.shape.shapes?.length ?? 0) < 2 ? (
          <p className="text-[11px] text-muted-foreground">
            Pick at least two shapes for the morph to play.
          </p>
        ) : null}
      </Group>

      <Group title="Timing">
        <SelectInput
          label="Easing"
          value={(value.timing?.easing as string) ?? 'ease-in-out'}
          options={MORPH_EASINGS.map(easing => ({ value: easing, label: easing }))}
          onChange={easing =>
            onChange({ ...value, timing: { ...value.timing, easing } as MorphTiming })
          }
        />
        <Choose
          label="Direction"
          value={value.timing?.direction ?? 'normal'}
          options={DIRECTION_OPTIONS}
          onChange={direction =>
            onChange({ ...value, timing: { ...value.timing, direction } as MorphTiming })
          }
        />
        <Switcher
          label="Loop"
          value={value.timing?.loop}
          onChange={loop => onChange({ ...value, timing: { ...value.timing, loop } as MorphTiming })}
        />
        <Slider
          label="Duration"
          value={value.timing?.duration}
          min={0.2}
          max={10}
          step={0.1}
          onChange={duration => onChange({ ...value, timing: { ...value.timing, duration } as MorphTiming })}
        />
        <Slider
          label="Delay"
          value={value.timing?.delay}
          min={0}
          max={10}
          step={0.1}
          onChange={delay => onChange({ ...value, timing: { ...value.timing, delay } as MorphTiming })}
        />
        <Slider
          label="End delay"
          value={value.timing?.endDelay}
          min={0}
          max={10}
          step={0.1}
          onChange={endDelay => onChange({ ...value, timing: { ...value.timing, endDelay } as MorphTiming })}
        />
      </Group>
    </>
  );
}

function StyleGroups({ value, onChange }: { value: MorphData; onChange: (value: MorphData) => void }) {
  const effect = value.effect ?? 'image';

  if (effect === 'image') {
    return (
      <Group title="Image">
        <MediaField
          value={value.image?.url ?? ''}
          onChange={(url: string) => onChange({ ...value, image: { ...value.image, url } })}
          onPickItem={(item: MediaItem) => onChange({ ...value, image: { ...value.image, url: item.url } })}
        />
        <Slider label="Opacity" value={value.image?.opacity} min={0} max={1} step={0.05} onChange={opacity => onChange({ ...value, image: { ...value.image, opacity } })} />
        <Slider label="Zoom" value={value.image?.zoom} min={0.5} max={2} step={0.05} onChange={zoom => onChange({ ...value, image: { ...value.image, zoom } })} />
        <Slider label="Position X" value={value.image?.posX} min={0} max={100} onChange={posX => onChange({ ...value, image: { ...value.image, posX } })} />
        <Slider label="Position Y" value={value.image?.posY} min={0} max={100} onChange={posY => onChange({ ...value, image: { ...value.image, posY } })} />
        <Slider label="Blur" value={value.image?.blur} min={0} max={20} onChange={blur => onChange({ ...value, image: { ...value.image, blur } })} />
        <Slider label="Brightness" value={value.image?.brightness} min={0} max={200} onChange={brightness => onChange({ ...value, image: { ...value.image, brightness } })} />
        <Slider label="Contrast" value={value.image?.contrast} min={0} max={200} onChange={contrast => onChange({ ...value, image: { ...value.image, contrast } })} />
        <Slider label="Saturate" value={value.image?.saturate} min={0} max={200} onChange={saturate => onChange({ ...value, image: { ...value.image, saturate } })} />
        <Slider label="Grayscale" value={value.image?.grayscale} min={0} max={100} onChange={grayscale => onChange({ ...value, image: { ...value.image, grayscale } })} />
      </Group>
    );
  }

  if (effect === 'color') {
    return (
      <Group title="Color">
        <MediaField
          value={value.color?.fill ?? ''}
          onChange={(fill: string) => onChange({ ...value, color: { ...value.color, fill } })}
        />
        <ColorInput
          label="Stroke"
          value={value.color?.stroke}
          onChange={stroke => onChange({ ...value, color: { ...value.color, stroke } })}
        />
        <Slider label="Stroke width" value={value.color?.strokeWidth} min={0} max={20} onChange={strokeWidth => onChange({ ...value, color: { ...value.color, strokeWidth } })} />
        <Slider label="Opacity" value={value.color?.opacity} min={0} max={1} step={0.05} onChange={opacity => onChange({ ...value, color: { ...value.color, opacity } })} />
      </Group>
    );
  }

  return (
    <Group title="Gradient">
      <ColorInput label="From" value={value.gradient?.from} onChange={from => onChange({ ...value, gradient: { ...value.gradient, from } })} />
      <ColorInput label="To" value={value.gradient?.to} onChange={to => onChange({ ...value, gradient: { ...value.gradient, to } })} />
      <Slider label="Angle" value={value.gradient?.angle} min={0} max={360} onChange={angle => onChange({ ...value, gradient: { ...value.gradient, angle } })} />
      <Slider label="Start" value={value.gradient?.start} min={0} max={100} onChange={start => onChange({ ...value, gradient: { ...value.gradient, start } })} />
      <Slider label="End" value={value.gradient?.end} min={0} max={100} onChange={end => onChange({ ...value, gradient: { ...value.gradient, end } })} />
      <Slider label="Opacity" value={value.gradient?.opacity} min={0} max={1} step={0.05} onChange={opacity => onChange({ ...value, gradient: { ...value.gradient, opacity } })} />
    </Group>
  );
}

export function ImageMorphField({ value, onChange, field }: Props) {
  const tab = useInspectorTab();

  const content = <ContentGroups value={value} onChange={onChange} />;
  const style = <StyleGroups value={value} onChange={onChange} />;

  if (tab === 'content') return <>{content}</>;
  if (tab === 'style') return <>{style}</>;

  // No tab (for example the global-block sidebar): every group is visible.
  return (
    <div className="space-y-2">
      {content}
      {style}
    </div>
  );
}
