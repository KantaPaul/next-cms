'use client';

import {
  DEFAULT_ANIMATION,
  DELAY_RANGE,
  DURATION_RANGE,
  ENTRANCE_GROUPS,
  EXIT_GROUPS,
  HOVER_GROUPS,
  resolveAnimation,
  type AnimationSettings,
  type Device,
  type Entrance,
  type Exit,
  type HoverEffect,
} from '../style';
import { DeviceToggles } from './device-row';
import { Choose, ControlLabel, GroupedSelect, Slider } from './primitives';

const labelize = (key: string) =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/-/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();

const toGroups = <T extends string>(groups: Record<string, readonly T[]>) => [
  { label: 'None', options: [{ value: 'none' as T, label: 'None' }] },
  ...Object.entries(groups).map(([label, keys]) => ({
    label,
    options: keys.map(value => ({ value, label: labelize(value) })),
  })),
];

const ENTRANCE_SELECT = toGroups(ENTRANCE_GROUPS);
const EXIT_SELECT = toGroups(EXIT_GROUPS);
const HOVER_SELECT = toGroups(HOVER_GROUPS);

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
  const resolved = resolveAnimation(value) ?? {
    ...DEFAULT_ANIMATION,
    devices: { desktop: true, tablet: true, mobile: true },
  };
  const a = {
    ...resolved,
    devices: { ...DEFAULT_ANIMATION.devices, ...value?.devices, ...resolved.devices },
  };

  const set = (patch: Partial<AnimationSettings>) => {
    const next = { ...value, ...patch };
    onChange(resolveAnimation(next) ? next : undefined);
  };

  const hasMotion = a.entrance !== 'none' || a.exit !== 'none';
  const hasAny = hasMotion || a.hover !== 'none';

  return (
    <div className="space-y-4">
      <GroupedSelect<Entrance>
        label="Entrance"
        value={a.entrance}
        groups={ENTRANCE_SELECT}
        onChange={entrance => set({ entrance })}
      />
      <GroupedSelect<Exit>
        label="Exit"
        value={a.exit}
        groups={EXIT_SELECT}
        onChange={exit => set({ exit })}
      />

      {hasMotion && (
        <>
          <Choose
            label="Trigger"
            value={a.trigger}
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
            value={a.duration}
            min={DURATION_RANGE.min}
            max={DURATION_RANGE.max}
            step={DURATION_RANGE.step}
            unit="s"
            onChange={duration => set({ duration: duration ?? DURATION_RANGE.fallback })}
          />
          <Slider
            label="Delay"
            value={a.delay}
            min={DELAY_RANGE.min}
            max={DELAY_RANGE.max}
            step={DELAY_RANGE.step}
            unit="s"
            onChange={delay => set({ delay: delay ?? DELAY_RANGE.fallback })}
          />
          <Choose
            label="Easing"
            value={a.easing}
            options={[
              { value: 'ease-out', label: 'Ease out' },
              { value: 'spring', label: 'Spring' },
            ]}
            onChange={easing => set({ easing })}
          />
          <Choose
            label={a.trigger === 'click' ? 'Clicking again' : 'Repeat'}
            value={a.once ? 'once' : 'every'}
            options={
              a.trigger === 'click'
                ? [
                    { value: 'once', label: 'Stays shown' },
                    { value: 'every', label: 'Hides again' },
                  ]
                : [
                    { value: 'once', label: 'First time only' },
                    { value: 'every', label: 'Every time' },
                  ]
            }
            onChange={v => set({ once: v === 'once' })}
          />
          {supportsStagger && (
            <Choose
              label="Stagger"
              value={a.stagger}
              options={[
                { value: 'none', label: 'Whole block' },
                { value: 'children', label: 'One by one' },
              ]}
              onChange={stagger => set({ stagger })}
            />
          )}
        </>
      )}

      <GroupedSelect<HoverEffect>
        label={supportsStagger ? 'Hover (each item)' : 'Hover'}
        value={a.hover}
        groups={HOVER_SELECT}
        onChange={hover => set({ hover })}
      />

      {hasAny && (
        <div>
          <ControlLabel label="Play on" />
          <DeviceToggles value={a.devices as Record<Device, boolean>} onChange={devices => set({ devices })} />
        </div>
      )}
    </div>
  );
}
