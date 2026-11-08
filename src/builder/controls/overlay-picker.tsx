'use client';

import { ExternalLink, Plus } from 'lucide-react';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { listOverlayOptions } from '@/app/(admin)/dashboard/(shell)/site-templates/_modules/overlays.actions';
import type { OverlayOption } from '@/app/(admin)/dashboard/(shell)/site-templates/_modules/overlays.service';
import {
  siteTemplateEditHref,
  siteTemplatesHref,
} from '@/app/(admin)/dashboard/(shell)/site-templates/_modules/site-template-href';
import {
  SearchableSelect,
  type SearchableSelectGroup,
} from '@/components/ui/searchable-select';
import { overlayHref, parseOverlayHref } from '@/lib/overlays/href';

export { overlayHref, parseOverlayHref, type OverlayOption };

let overlayOptionsRequest: Promise<OverlayOption[]> | null = null;

function fetchOverlayOptions(force = false): Promise<OverlayOption[]> {
  if (force || !overlayOptionsRequest) {
    overlayOptionsRequest = listOverlayOptions()
      .then(rows => (Array.isArray(rows) ? rows : []))
      .catch(() => [])
      .finally(() => {
        overlayOptionsRequest = null;
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
  className,
  style,
  disabled,
}: OverlaySelectProps) {
  const fetched = useOverlayOptions();
  const options = providedOptions !== undefined ? providedOptions : fetched;

  const activeOptions = useMemo(
    () =>
      options
        ? options.filter(o => o.published && (o.enabled ?? true))
        : null,
    [options]
  );

  const groups = useMemo<SearchableSelectGroup[]>(() => {
    if (!activeOptions?.length) return [];
    const popups = activeOptions
      .filter(o => o.category === 'Popup')
      .map(o => ({
        value: o.id,
        label: o.name,
      }));
    const drawers = activeOptions
      .filter(o => o.category === 'Drawer')
      .map(o => ({
        value: o.id,
        label: o.name,
      }));
    const result: SearchableSelectGroup[] = [];
    if (popups.length) result.push({ label: 'Popups', options: popups });
    if (drawers.length) result.push({ label: 'Drawers', options: drawers });
    return result;
  }, [activeOptions]);

  const topLabel =
    activeOptions === null
      ? 'Loading…'
      : activeOptions.length
        ? placeholder
        : emptyLabel;

  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      groups={groups}
      placeholder={topLabel}
      emptyOptionLabel={activeOptions?.length ? placeholder : undefined}
      missingLabel={activeOptions === null ? 'Loading…' : 'Popup/drawer not found'}
      searchPlaceholder="Search popups & drawers…"
      emptyMessage={emptyLabel}
      disabled={disabled}
      className={className}
      style={style}
      aria-label={ariaLabel}
    />
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
