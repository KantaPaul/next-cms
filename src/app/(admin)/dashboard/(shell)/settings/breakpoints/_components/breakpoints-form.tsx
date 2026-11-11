'use client';

import {
  type BreakpointConfig,
  DEFAULT_BREAKPOINTS,
  type Device,
  normalizeBreakpointConfig,
  validateBreakpoints,
} from '@nextcms/builder-core';
import {
  Laptop,
  Monitor,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  TabletSmartphone,
  Tv,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormInput as Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { updateBreakpoints } from '../../_modules/settings.actions';

const DEVICE_ICONS: Record<Device, typeof Monitor> = {
  widescreen: Tv,
  desktop: Monitor,
  laptop: Laptop,
  tablet_extra: TabletSmartphone,
  tablet: Tablet,
  mobile_extra: TabletSmartphone,
  mobile: Smartphone,
};

function hintFor(device: Device, width: number, enabled: boolean): string {
  if (device === 'desktop') {
    return 'Base viewport (always enabled). Inherits nothing; smaller devices and Widescreen inherit from it.';
  }
  if (!enabled) {
    return 'Disabled in the editor. Any saved style values are kept and will apply again if re-enabled.';
  }
  if (device === 'widescreen') {
    return `Applies to screens ≥ ${width} px`;
  }
  return `Applies to screens ≤ ${width} px`;
}

export function BreakpointsForm({
  initialBreakpoints,
}: {
  initialBreakpoints: BreakpointConfig;
}) {
  const router = useRouter();
  const [items, setItems] = useState<BreakpointConfig>(() =>
    normalizeBreakpointConfig(initialBreakpoints)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const updateItem = (
    device: Device,
    patch: Partial<{ width: number; enabled: boolean }>
  ) => {
    setError(null);
    setItems(prev =>
      prev.map(entry =>
        entry.device === device ? { ...entry, ...patch } : entry
      )
    );
  };

  const handleReset = () => {
    setError(null);
    setItems(DEFAULT_BREAKPOINTS.map(entry => ({ ...entry })));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateBreakpoints(items);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = (await updateBreakpoints({ breakpoints: items })) as {
        ok?: boolean;
        error?: string;
        data?: BreakpointConfig;
      };
      if (!res?.ok) {
        const msg = res?.error || 'Failed to save breakpoints.';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (res.data) {
        setItems(normalizeBreakpointConfig(res.data));
      }
      toast.success('Breakpoints updated.');
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSave} className="max-w-3xl space-y-6">
      <div className="rounded-lg border border-steel-200 bg-white p-6 dark:border-dark-300 dark:bg-dark-100">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-steel-100 pb-4 dark:border-dark-300">
          <div>
            <h3 className="text-base font-semibold">Responsive Breakpoints</h3>
            <p className="mt-1 text-sm text-steel-500">
              Enable up to 7 device breakpoints and customize their pixel widths. Widths must be strictly ordered from Widescreen down to Mobile.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isPending}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        </div>

        <div className="mt-4 divide-y divide-steel-100 dark:divide-dark-300">
          {items.map(entry => {
            const Icon = DEVICE_ICONS[entry.device];
            const isDesktop = entry.device === 'desktop';
            return (
              <div
                key={entry.device}
                data-breakpoint-row={entry.device}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-steel-200 bg-steel-50 text-steel-700 dark:border-dark-300 dark:bg-dark-200 dark:text-steel-200">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{entry.label}</span>
                      {isDesktop && (
                        <span className="rounded bg-steel-100 px-1.5 py-0.5 text-[11px] font-medium text-steel-600 dark:bg-dark-200 dark:text-steel-300">
                          Base
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-steel-500">
                      {hintFor(entry.device, entry.width, entry.enabled)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  {!isDesktop ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        aria-label={`${entry.label} width (px)`}
                        min={200}
                        max={5000}
                        step={1}
                        value={Number.isFinite(entry.width) ? entry.width : ''}
                        onChange={e =>
                          updateItem(entry.device, {
                            width: Number.parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="h-8 w-24 text-right font-mono text-xs"
                      />
                      <span className="text-xs text-steel-500">px</span>
                    </div>
                  ) : (
                    <span className="w-[114px] text-right text-xs text-steel-400">
                      Base width
                    </span>
                  )}

                  <Switch
                    aria-label={`Enable ${entry.label}`}
                    checked={isDesktop ? true : entry.enabled}
                    disabled={isDesktop}
                    onChange={checked =>
                      updateItem(entry.device, { enabled: checked })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-steel-100 pt-4 dark:border-dark-300">
          <Button type="submit" disabled={isPending}>
            <Save className="mr-1.5 h-4 w-4" />
            {isPending ? 'Saving…' : 'Save breakpoints'}
          </Button>
        </div>
      </div>
    </form>
  );
}
