'use client';

import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import type { TextFieldMode, UrlFieldMode } from '@/config/post-types';

const TEXT_MODES: TextFieldMode[] = ['plain', 'video', 'embed'];
const URL_MODES: UrlFieldMode[] = ['video', 'other'];

/** Mutually exclusive switch group for `text` fields: Plain text, Video URL, or Embed URL. */
export function TextModeSwitches({
  value,
  onChange,
  compact = false,
}: {
  value: TextFieldMode;
  onChange: (next: TextFieldMode) => void;
  compact?: boolean;
}) {
  const t = useTranslations('collections.modes');
  return (
    <div
      className={
        compact
          ? 'flex flex-wrap items-center gap-5 rounded-md bg-muted/30 px-3 py-2 text-xs'
          : 'sm:col-span-2 flex flex-wrap items-center gap-6 rounded-md border border-dashed bg-muted/20 px-3 py-2.5'
      }
    >
      {TEXT_MODES.map(mode => {
        const active = value === mode;
        return (
          <label
            key={mode}
            className="flex cursor-pointer items-center gap-2 font-normal"
          >
            <Switch
              checked={active}
              onChange={checked => {
                if (checked) onChange(mode);
                else if (active && mode !== 'plain') onChange('plain');
              }}
            />
            <span className={compact ? 'text-xs' : 'text-sm'}>{t(mode)}</span>
          </label>
        );
      })}
    </div>
  );
}

/** Mutually exclusive switch group for `url` fields: Video URL or Other URL. */
export function UrlModeSwitches({
  value,
  onChange,
  compact = false,
}: {
  value: UrlFieldMode;
  onChange: (next: UrlFieldMode) => void;
  compact?: boolean;
}) {
  const t = useTranslations('collections.modes');
  return (
    <div
      className={
        compact
          ? 'flex flex-wrap items-center gap-5 rounded-md bg-muted/30 px-3 py-2 text-xs'
          : 'sm:col-span-2 flex flex-wrap items-center gap-6 rounded-md border border-dashed bg-muted/20 px-3 py-2.5'
      }
    >
      {URL_MODES.map(mode => {
        const active = value === mode;
        return (
          <label
            key={mode}
            className="flex cursor-pointer items-center gap-2 font-normal"
          >
            <Switch
              checked={active}
              onChange={checked => {
                if (checked) onChange(mode);
                else onChange(mode === 'video' ? 'other' : 'video');
              }}
            />
            <span className={compact ? 'text-xs' : 'text-sm'}>{t(mode)}</span>
          </label>
        );
      })}
    </div>
  );
}
