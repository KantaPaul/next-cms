'use client';

import { type Device, DEVICES, type MotionEffectsSettings } from '../style';
import { DeviceToggles } from './device-row';
import { Choose, ControlLabel, Slider } from './primitives';

export function MotionEffectsControl({
  value,
  onChange,
}: {
  value: MotionEffectsSettings | undefined;
  onChange: (value: MotionEffectsSettings | undefined) => void;
}) {
  const parallaxOpen = Boolean(
    value?.parallax && typeof value.parallax.speed === 'number'
  );
  const mouseTrackOpen = Boolean(
    value?.mouseTrack && typeof value.mouseTrack.strength === 'number'
  );
  const scrollTransformOpen = Boolean(value?.scrollTransform);

  const set = (patch: Partial<MotionEffectsSettings>) => {
    const next: MotionEffectsSettings = { ...value, ...patch };
    const hasAny = Boolean(
      (next.parallax && typeof next.parallax.speed === 'number') ||
        (next.mouseTrack && typeof next.mouseTrack.strength === 'number') ||
        next.scrollTransform
    );
    onChange(hasAny ? next : undefined);
  };

  const devices: Partial<Record<Device, boolean>> = Object.fromEntries(
    DEVICES.map(d => [d, !value?.devices || value.devices.includes(d)])
  );

  return (
    <div className="space-y-4 text-sm">
      {/* Parallax Section */}
      <div className="rounded-md border border-steel-200 p-3 dark:border-dark-300">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Vertical / Horizontal Parallax</span>
          <button
            type="button"
            onClick={() => {
              const next = !parallaxOpen;
              set({
                parallax: next
                  ? { speed: value?.parallax?.speed ?? 2, direction: value?.parallax?.direction ?? 'vertical' }
                  : undefined,
              });
            }}
            className="text-xs text-primary font-semibold hover:underline"
          >
            {parallaxOpen ? 'Disable' : 'Enable'}
          </button>
        </div>
        {parallaxOpen && (
          <div className="mt-3 space-y-3 pt-2 border-t border-steel-100 dark:border-dark-300">
            <Slider
              label="Speed"
              value={value?.parallax?.speed ?? 2}
              min={-10}
              max={10}
              step={0.5}
              unit=""
              onChange={speed =>
                set({
                  parallax: {
                    speed,
                    direction: value?.parallax?.direction ?? 'vertical',
                  },
                })
              }
            />
            <Choose<'vertical' | 'horizontal'>
              label="Direction"
              value={value?.parallax?.direction ?? 'vertical'}
              options={[
                { value: 'vertical', label: 'Vertical' },
                { value: 'horizontal', label: 'Horizontal' },
              ]}
              onChange={direction =>
                set({
                  parallax: {
                    speed: value?.parallax?.speed ?? 2,
                    direction,
                  },
                })
              }
            />
          </div>
        )}
      </div>

      {/* Mouse Track Section */}
      <div className="rounded-md border border-steel-200 p-3 dark:border-dark-300">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Mouse Track</span>
          <button
            type="button"
            onClick={() => {
              const next = !mouseTrackOpen;
              set({
                mouseTrack: next
                  ? { strength: value?.mouseTrack?.strength ?? 15, direction: value?.mouseTrack?.direction ?? 'opposite' }
                  : undefined,
              });
            }}
            className="text-xs text-primary font-semibold hover:underline"
          >
            {mouseTrackOpen ? 'Disable' : 'Enable'}
          </button>
        </div>
        {mouseTrackOpen && (
          <div className="mt-3 space-y-3 pt-2 border-t border-steel-100 dark:border-dark-300">
            <Slider
              label="Strength"
              value={value?.mouseTrack?.strength ?? 15}
              min={1}
              max={50}
              step={1}
              unit=""
              onChange={strength =>
                set({
                  mouseTrack: {
                    strength,
                    direction: value?.mouseTrack?.direction ?? 'opposite',
                  },
                })
              }
            />
            <Choose<'opposite' | 'direct'>
              label="Direction"
              value={value?.mouseTrack?.direction ?? 'opposite'}
              options={[
                { value: 'opposite', label: 'Opposite' },
                { value: 'direct', label: 'Direct' },
              ]}
              onChange={direction =>
                set({
                  mouseTrack: {
                    strength: value?.mouseTrack?.strength ?? 15,
                    direction,
                  },
                })
              }
            />
          </div>
        )}
      </div>

      {/* Scroll Transform Section */}
      <div className="rounded-md border border-steel-200 p-3 dark:border-dark-300">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">Scroll Transform</span>
          <button
            type="button"
            onClick={() => {
              const next = !scrollTransformOpen;
              set({
                scrollTransform: next
                  ? { translateY: 50, scale: 1.1, opacity: 0.5, start: 0, end: 100 }
                  : undefined,
              });
            }}
            className="text-xs text-primary font-semibold hover:underline"
          >
            {scrollTransformOpen ? 'Disable' : 'Enable'}
          </button>
        </div>
        {scrollTransformOpen && (
          <div className="mt-3 space-y-3 pt-2 border-t border-steel-100 dark:border-dark-300">
            <Slider
              label="Translate Y"
              value={value?.scrollTransform?.translateY ?? 0}
              min={-200}
              max={200}
              step={5}
              unit="px"
              onChange={translateY =>
                set({
                  scrollTransform: {
                    ...value?.scrollTransform,
                    translateY,
                  },
                })
              }
            />
            <Slider
              label="Rotate"
              value={value?.scrollTransform?.rotate ?? 0}
              min={-180}
              max={180}
              step={5}
              unit="°"
              onChange={rotate =>
                set({
                  scrollTransform: {
                    ...value?.scrollTransform,
                    rotate,
                  },
                })
              }
            />
            <Slider
              label="Scale"
              value={value?.scrollTransform?.scale ?? 1}
              min={0.5}
              max={2}
              step={0.05}
              unit="x"
              onChange={scale =>
                set({
                  scrollTransform: {
                    ...value?.scrollTransform,
                    scale,
                  },
                })
              }
            />
            <Slider
              label="Opacity"
              value={value?.scrollTransform?.opacity ?? 1}
              min={0}
              max={1}
              step={0.05}
              unit=""
              onChange={opacity =>
                set({
                  scrollTransform: {
                    ...value?.scrollTransform,
                    opacity,
                  },
                })
              }
            />
            <Slider
              label="Viewport Start"
              value={value?.scrollTransform?.start ?? 0}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={start =>
                set({
                  scrollTransform: {
                    ...value?.scrollTransform,
                    start,
                  },
                })
              }
            />
            <Slider
              label="Viewport End"
              value={value?.scrollTransform?.end ?? 100}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={end =>
                set({
                  scrollTransform: {
                    ...value?.scrollTransform,
                    end,
                  },
                })
              }
            />
          </div>
        )}
      </div>

      {/* Device Visibility */}
      <div>
        <ControlLabel label="Active Devices" />
        <DeviceToggles
          value={devices}
          onChange={next =>
            set({
              devices: DEVICES.filter(d => next[d] !== false),
            })
          }
        />
      </div>
    </div>
  );
}
