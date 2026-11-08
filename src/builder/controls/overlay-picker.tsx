'use client';

import { inputStyle } from '@nextcms/builder-react';
import { ExternalLink, Plus } from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { listOverlayOptions } from '@/app/(admin)/dashboard/(shell)/header-footer/_modules/overlays.actions';
import type { OverlayOption } from '@/app/(admin)/dashboard/(shell)/header-footer/_modules/overlays.service';
import {
  siteTemplateEditHref,
  siteTemplatesHref,
} from '@/app/(admin)/dashboard/(shell)/header-footer/_modules/site-template-href';
import { overlayHref, parseOverlayHref } from '@/lib/overlays/href';

export { overlayHref, parseOverlayHref, type OverlayOption };

let overlayOptionsRequest: Promise<OverlayOption[]> | null = null;

function fetchOverlayOptions(force = false): Promise<OverlayOption[]> {
  if (force || !overlayOptionsRequest) {
    overlayOptionsRequest = listOverlayOptions()
      .then(rows => (Array.isArray(rows) ? rows : []))
      .catch(() => {
        overlayOptionsRequest = null;
        return [];
      });
  }
  return overlayOptionsRequest;
}

export function useOverlayOptions() {
  const [options, setOptions] = useState<OverlayOption[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchOverlayOptions(reloadKey > 0).then(rows => {
      if (active) setOptions(rows);
    });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  // Pick up popups and drawers created in another tab when the editor regains focus.
  useEffect(() => {
    const onFocus = () => setReloadKey(k => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  return options;
}

export type OverlaySelectProps = {
  value?: string;
  onChange: (id: string | undefined) => void;
  options?: OverlayOption[] | null;
  placeholder?: string;
  emptyLabel?: string;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
};

export function OverlaySelect({
  value,
  onChange,
  options: providedOptions,
  placeholder = 'Select a popup or drawer',
  emptyLabel = 'No popups or drawers yet',
  ariaLabel,
  className = 'h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-sm text-foreground dark:border-dark-300 dark:bg-dark-100',
  style,
  disabled,
}: OverlaySelectProps) {
  const fetched = useOverlayOptions();
  const options = providedOptions !== undefined ? providedOptions : fetched;
  const popups = options?.filter(o => o.category === 'Popup') ?? [];
  const drawers = options?.filter(o => o.category === 'Drawer') ?? [];
  const missing =
    !!value && options !== null && !options.some(o => o.id === value);

  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={e => onChange(e.target.value || undefined)}
      className={style ? undefined : className}
      style={style}
      aria-label={ariaLabel}
    >
      <option value="">
        {options === null
          ? 'Loading…'
          : options.length
            ? placeholder
            : emptyLabel}
      </option>
      {missing && <option value={value}>Popup/drawer not found</option>}
      {popups.length > 0 && (
        <optgroup label="Popups">
          {popups.map(o => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.published ? '' : ' (draft)'}
            </option>
          ))}
        </optgroup>
      )}
      {drawers.length > 0 && (
        <optgroup label="Drawers">
          {drawers.map(o => (
            <option key={o.id} value={o.id}>
              {o.name}
              {o.published ? '' : ' (draft)'}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

type OverlayPickerFieldProps = {
  name: string;
  id: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
  field: { label?: string };
};

export function OverlayPickerField({
  value,
  onChange,
  readOnly,
  field,
}: OverlayPickerFieldProps) {
  const options = useOverlayOptions();
  const selected = value ? options?.find(o => o.id === value) : undefined;
  const missing =
    !!value && options !== null && !options.some(o => o.id === value);

  return (
    <div>
      <OverlaySelect
        value={value}
        onChange={onChange}
        options={options}
        disabled={readOnly}
        style={inputStyle}
        ariaLabel={field.label ?? 'Popup / Drawer'}
      />
      <div className="mt-2 flex gap-3 text-xs">
        <a
          href={siteTemplatesHref('popup')}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium hover:underline"
          style={{ color: 'var(--ne-primary, #4f46e5)' }}
        >
          <Plus className="size-3" /> New
        </a>
        {value && !missing && (
          <a
            href={siteTemplateEditHref(value, selected?.category ?? 'Popup')}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium hover:underline"
            style={{ color: 'var(--ne-primary, #4f46e5)' }}
          >
            <ExternalLink className="size-3" /> Edit
          </a>
        )}
      </div>
    </div>
  );
}
