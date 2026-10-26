'use client';

import { createUsePuck } from '@measured/puck';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { DEVICE_WIDTH, type Device, deviceForWidth } from '../style';

const usePuck = createUsePuck();

const ICONS = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
const LABELS: Record<Device, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

/** The device the canvas is showing. Changing it resizes the Puck viewport, so every device row stays in sync. */
export function useCanvasDevice() {
  const width = usePuck(s => s.appState.ui.viewports.current.width);
  const dispatch = usePuck(s => s.dispatch);
  const device = deviceForWidth(width);

  const setDevice = (next: Device) =>
    dispatch({
      type: 'setUi',
      ui: ui => ({
        viewports: {
          ...ui.viewports,
          current: { width: DEVICE_WIDTH[next], height: 'auto' },
        },
      }),
    });

  return [device, setDevice] as const;
}

/** Monitor, tablet, and phone buttons that switch the canvas viewport. */
export function DeviceRow({ className }: { className?: string }) {
  const [device, setDevice] = useCanvasDevice();
  return (
    <fieldset
      className={cn(
        'flex min-w-0 items-center gap-0.5 border-0 p-0',
        className
      )}
      aria-label="Edit for device"
    >
      {(Object.keys(ICONS) as Device[]).map(d => {
        const Icon = ICONS[d];
        return (
          <Button
            key={d}
            type="button"
            variant="ghost"
            size="icon-sm"
            title={LABELS[d]}
            aria-label={LABELS[d]}
            aria-pressed={device === d}
            onClick={() => setDevice(d)}
            className={cn(
              'size-6 text-muted-foreground hover:text-primary',
              device === d &&
                'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            )}
          >
            <Icon className="size-3.5" />
          </Button>
        );
      })}
    </fieldset>
  );
}

/** Per-device toggles, for settings such as "play animation on" that are not tied to the current canvas width. */
export function DeviceToggles({
  value,
  onChange,
}: {
  value: Record<Device, boolean>;
  onChange: (value: Record<Device, boolean>) => void;
}) {
  return (
    <fieldset className="flex min-w-0 gap-1 border-0 p-0" aria-label="Devices">
      {(Object.keys(ICONS) as Device[]).map(d => {
        const Icon = ICONS[d];
        return (
          <Button
            key={d}
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={value[d]}
            title={`${value[d] ? 'Plays' : 'Static'} on ${LABELS[d].toLowerCase()}`}
            onClick={() => onChange({ ...value, [d]: !value[d] })}
            className={cn(
              'h-8 flex-1 gap-1.5 px-2 text-xs',
              value[d]
                ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                : 'text-muted-foreground line-through'
            )}
          >
            <Icon className="size-3.5" /> {LABELS[d]}
          </Button>
        );
      })}
    </fieldset>
  );
}
