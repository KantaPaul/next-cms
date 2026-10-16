'use client';

import { ENTRANCE_GROUPS, EXIT_GROUPS, HOVER_GROUPS } from '../animation-catalog';
import {
  resolveAnimation,
  type AnimationSettings,
  type Device,
  type Entrance,
  type Exit,
  type HoverEffect,
} from '../style';
import { DeviceToggles } from './device-row';
import { Choose, ControlLabel, GroupedSelect, Slider } from './primitives';

/** Shown in seconds. Stored in milliseconds, which is what playback reads. */
const DURATION_RANGE = { min: 0.2, max: 5, step: 0.1, fallback: 0.6 };
const DELAY_RANGE = { min: 0, max: 5, step: 0.1, fallback: 0 };
/** Matches the default step in motion playback. 0 means the whole block moves together. */
const STAGGER_MS = 80;

const labelize = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/-/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();

type SelectGroups<T extends string> = { label: string; options: { value: T; label: string }[] }[];

function toGroups<T extends string>(groups: object): SelectGroups<T> {
  const named = Object.entries(groups as Record<string, readonly string[]>).map(([label, keys]) => ({
    label,
    options: keys.map(value => ({ value: value as T, label: labelize(value) })),
  }));
  return [{ label: 'None', options: [{ value: 'none' as T, label: 'None' }] }, ...named];
}

const ENTRANCE_SELECT = toGroups<Entrance>(ENTRANCE_GROUPS);
const EXIT_SELECT = toGroups<Exit>(EXIT_GROUPS);
const HOVER_SELECT = toGroups<HoverEffect>(HOVER_GROUPS);

function effect<T extends string>(value: T | '' | undefined): T | 'none' {
  if (!value || value === 'none') return 'none';
  return value;
}

const toMs = (seconds: number) => Math.round(seconds * 1000);
const toSeconds = (ms: number | undefined, fallback: number) => (ms === undefined ? fallback : ms / 1000);

/** Preset motion for a block. Editors pick named effects; durations and delays stay inside fixed ranges. */
export function AnimationControl({
  value,
  onChange,
  supportsStagger,
}: {
  value: AnimationSettings | undefined;
  onChange: (value: AnimationSettings | undefined) => void;
  supportsStagger: boolean;
}) {
  const entrance = effect(value?.entrance);
  const exit = effect(value?.exit);
  const hover = effect(value?.hover);
  const devices: Record<Device, boolean> = {
    desktop: value?.devices?.desktop !== false,
    tablet: value?.devices?.tablet !== false,
    mobile: value?.devices?.mobile !== false,
  };

  const set = (patch: Partial<AnimationSettings>) => {
    const next = { ...value, ...patch };
    onChange(resolveAnimation(next) ? next : undefined);
  };

  const hasMotion = entrance !== 'none' || exit !== 'none';
  const hasAny = hasMotion || hover !== 'none';

  return (
    <div className="space-y-4">
      <GroupedSelect<Entrance>
        label="Entrance"
        value={entrance}
        groups={ENTRANCE_SELECT}
        onChange={next => set({ entrance: next })}
      />
      <GroupedSelect<Exit>
        label="Exit"
        value={exit}
        groups={EXIT_SELECT}
        onChange={next => set({ exit: next })}
      />

      {hasMotion && (
        <>
          <Choose
            label="Trigger"
            value={value?.trigger ?? 'scroll'}
            options={[
              { value: 'load', label: 'On load' },
              { value: 'scroll', label: 'On scroll' },
              { value: 'hover', label: 'On hover' },
              { value: 'click', label: 'On click' },
            ]}
            onChange={trigger => set({ trigger })}
          />
          <Slider
            label="Duration"
            value={toSeconds(value?.duration, DURATION_RANGE.fallback)}
            min={DURATION_RANGE.min}
            max={DURATION_RANGE.max}
            step={DURATION_RANGE.step}
            unit="s"
            onChange={duration => set({ duration: toMs(duration ?? DURATION_RANGE.fallback) })}
          />
          <Slider
            label="Delay"
            value={toSeconds(value?.delay, DELAY_RANGE.fallback)}
            min={DELAY_RANGE.min}
            max={DELAY_RANGE.max}
            step={DELAY_RANGE.step}
            unit="s"
            onChange={delay => set({ delay: toMs(delay ?? DELAY_RANGE.fallback) })}
          />
          <Choose
            label="Easing"
            value={value?.easing ?? 'ease-out'}
            options={[
              { value: 'ease-out', label: 'Ease out' },
              { value: 'spring', label: 'Spring' },
            ]}
            onChange={easing => set({ easing })}
          />
          {supportsStagger && (
            <Choose
              label="Stagger"
              value={(value?.stagger ?? STAGGER_MS) > 0 ? 'children' : 'none'}
              options={[
                { value: 'none', label: 'Whole block' },
                { value: 'children', label: 'One by one' },
              ]}
              onChange={stagger => set({ stagger: stagger === 'children' ? STAGGER_MS : 0 })}
            />
          )}
        </>
      )}

      <GroupedSelect<HoverEffect>
        label={supportsStagger ? 'Hover (each item)' : 'Hover'}
        value={hover}
        groups={HOVER_SELECT}
        onChange={next => set({ hover: next })}
      />

      {hasAny && (
        <div>
          <ControlLabel label="Play on" />
          <DeviceToggles value={devices} onChange={next => set({ devices: next })} />
        </div>
      )}
    </div>
  );
}
