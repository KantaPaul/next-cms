'use client';

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Ban,
  Droplet,
  Eye,
  MousePointer2,
  MousePointerClick,
  Maximize2,
  Play,
  ScanLine,
  Sparkles,
  Sun,
  ZoomIn,
} from 'lucide-react';
import {
  DEFAULT_ANIMATION,
  DELAY_RANGE,
  DURATION_RANGE,
  resolveAnimation,
  type AnimationSettings,
  type Device,
  type Entrance,
  type HoverEffect,
  type Trigger,
} from '../style';
import { DeviceToggles } from './device-row';
import { Choose, ControlLabel, Slider } from './primitives';

const ENTRANCE_OPTIONS: { value: Entrance; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'None', icon: <Ban /> },
  { value: 'fade', label: 'Fade', icon: <Eye /> },
  { value: 'fade-up', label: 'Fade up', icon: <ArrowUp /> },
  { value: 'fade-down', label: 'Fade down', icon: <ArrowDown /> },
  { value: 'slide-left', label: 'Slide left', icon: <ArrowLeft /> },
  { value: 'slide-right', label: 'Slide right', icon: <ArrowRight /> },
  { value: 'zoom', label: 'Zoom', icon: <ZoomIn /> },
  { value: 'blur', label: 'Blur', icon: <Droplet /> },
];

const TRIGGER_OPTIONS: { value: Trigger; label: string; icon: React.ReactNode }[] = [
  { value: 'load', label: 'On load', icon: <Play /> },
  { value: 'scroll', label: 'On scroll into view', icon: <ScanLine /> },
  { value: 'hover', label: 'On hover', icon: <MousePointer2 /> },
  { value: 'click', label: 'On click', icon: <MousePointerClick /> },
];

const HOVER_OPTIONS: { value: HoverEffect; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'None', icon: <Ban /> },
  { value: 'lift', label: 'Lift', icon: <ArrowUp /> },
  { value: 'scale', label: 'Scale', icon: <Maximize2 /> },
  { value: 'glow', label: 'Glow', icon: <Sun /> },
];

const ENTRANCE_LABEL = Object.fromEntries(ENTRANCE_OPTIONS.map(o => [o.value, o.label]));
const TRIGGER_LABEL = Object.fromEntries(TRIGGER_OPTIONS.map(o => [o.value, o.label]));

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
  const a = { ...DEFAULT_ANIMATION, ...value, devices: { ...DEFAULT_ANIMATION.devices, ...value?.devices } };

  const set = (patch: Partial<AnimationSettings>) => {
    const next = { ...value, ...patch };
    onChange(resolveAnimation(next) ? next : undefined);
  };

  const hasEntrance = a.entrance !== 'none';

  return (
    <div className="space-y-4">
      <Choose
        label="Entrance"
        value={a.entrance}
        options={ENTRANCE_OPTIONS}
        columns={4}
        onChange={entrance => set({ entrance })}
        aside={<span className="text-[11px] text-steel-400">{ENTRANCE_LABEL[a.entrance]}</span>}
      />

      {hasEntrance && (
        <>
          <Choose
            label="Trigger"
            value={a.trigger}
            options={TRIGGER_OPTIONS}
            onChange={trigger => set({ trigger })}
            aside={<span className="text-[11px] text-steel-400">{TRIGGER_LABEL[a.trigger]}</span>}
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

      <Choose
        label={supportsStagger ? 'Hover (each item)' : 'Hover'}
        value={a.hover}
        options={HOVER_OPTIONS}
        onChange={hover => set({ hover })}
      />

      {(hasEntrance || a.hover !== 'none') && (
        <div>
          <ControlLabel label="Play on">
            <Sparkles className="size-3.5 text-steel-300" aria-hidden />
          </ControlLabel>
          <DeviceToggles value={a.devices as Record<Device, boolean>} onChange={devices => set({ devices })} />
        </div>
      )}
    </div>
  );
}
