'use client';

import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { listGlobalBlockOptions } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { listCollectionOptions } from '@/app/(admin)/dashboard/(shell)/collections/_modules/collections.actions';
import { useEntry } from '@/components/analytics/entry-context';
import { TextEditor } from '@/components/atoms/text-editor';
import { MediaField } from '@/components/media/media-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils/cn';
import { getAllTaxonomyOptions } from '@/server/actions/blog.actions';
import { Switcher } from '../controls/primitives';
import { BLOCK_ICONS, ICON_OPTIONS } from '../icons';
import { normalizeUrlValue, type UrlValue } from '../style';

type CustomFieldProps<T> = {
  name: string;
  id: string;
  value: T;
  onChange: (value: T) => void;
  readOnly?: boolean;
  field: { label?: string };
};

function FieldLabel({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <div className="mb-2 text-sm font-medium text-[var(--puck-color-grey-04,#3a3a3a)]">
      {label}
    </div>
  );
}

export function MediaUrlField({
  value,
  onChange,
  field,
}: CustomFieldProps<string | undefined>) {
  return (
    <div>
      <FieldLabel label={field.label} />
      <MediaField value={value ?? ''} onChange={onChange} />
    </div>
  );
}

export function RichTextField({
  value,
  onChange,
  field,
}: CustomFieldProps<string | undefined>) {
  return (
    <div className="[&_.editor-content]:max-h-[420px] [&_.editor-content]:min-h-48">
      <FieldLabel label={field.label} />
      <TextEditor
        value={value ?? ''}
        onChange={onChange}
        placeholder="Write something…"
      />
    </div>
  );
}

/* ---------- URL (string | { url, newTab, nofollow }) ---------- */

export type { UrlValue };

export function UrlField({
  value,
  onChange,
  field,
}: CustomFieldProps<UrlValue | undefined>) {
  const v = normalizeUrlValue(value);

  const commit = (patch: Partial<typeof v>) => {
    const next = { ...v, ...patch };
    if (!next.newTab && !next.nofollow) {
      onChange(next.url || undefined);
      return;
    }
    onChange({
      url: next.url || undefined,
      newTab: next.newTab || undefined,
      nofollow: next.nofollow || undefined,
    });
  };

  return (
    <div className="space-y-2">
      <FieldLabel label={field.label} />
      <input
        type="url"
        value={v.url}
        placeholder="https://… or /path"
        onChange={e => commit({ url: e.target.value })}
        className="h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-sm"
      />
      <Switcher
        label="Open in new tab"
        value={v.newTab}
        onChange={newTab => commit({ newTab })}
      />
      <Switcher
        label="Add nofollow"
        value={v.nofollow}
        onChange={nofollow => commit({ nofollow })}
      />
    </div>
  );
}

/* ---------- Icon picker ---------- */

export function IconPickerField({
  value,
  onChange,
  field,
}: CustomFieldProps<string | undefined>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const icons = useMemo(
    () =>
      ICON_OPTIONS.filter(
        o =>
          o.value &&
          (!query || o.label.toLowerCase().includes(query.toLowerCase()))
      ),
    [query]
  );
  const Current = value ? BLOCK_ICONS[value] : undefined;

  return (
    <div>
      <FieldLabel label={field.label} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-md border border-steel-200 bg-white px-2 text-sm"
          >
            <span className="flex items-center gap-2">
              {Current ? <Current className="size-4" /> : null}
              {value || 'None'}
            </span>
            <ChevronsUpDown className="size-3.5 text-steel-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="mb-2 flex items-center gap-1.5 rounded-md border border-steel-200 px-2">
            <Search className="size-3.5 text-steel-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="h-8 w-full border-0 bg-transparent text-sm focus:ring-0"
            />
          </div>
          <div className="grid max-h-56 grid-cols-5 gap-1 overflow-y-auto">
            <button
              type="button"
              title="None"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
              className={cn(
                'flex size-10 items-center justify-center rounded border text-[10px] text-steel-500',
                !value
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-steel-100 hover:bg-steel-50'
              )}
            >
              —
            </button>
            {icons.map(o => {
              const Icon = BLOCK_ICONS[o.value];
              return (
                <button
                  key={o.value}
                  type="button"
                  title={o.label}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex size-10 items-center justify-center rounded border',
                    value === o.value
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                      : 'border-steel-100 text-steel-600 hover:bg-steel-50'
                  )}
                >
                  {Icon ? <Icon className="size-4" /> : o.label.slice(0, 2)}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------- Date / time ---------- */

export function DateTimeField({
  value,
  onChange,
  field,
}: CustomFieldProps<string | undefined>) {
  const selected = value ? new Date(value) : undefined;
  const valid =
    selected && !Number.isNaN(selected.getTime()) ? selected : undefined;

  return (
    <div>
      <FieldLabel label={field.label} />
      <DayPicker
        mode="single"
        selected={valid}
        onSelect={d => onChange(d ? d.toISOString() : undefined)}
        className="rounded-md border border-steel-200 p-2"
      />
      {valid && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="mt-1 text-[11px] text-indigo-600"
        >
          Clear date
        </button>
      )}
    </div>
  );
}

/* ---------- Searchable select ---------- */

export function SearchableSelectField({
  value,
  onChange,
  field,
  options,
  emptyLabel = 'Any',
}: CustomFieldProps<string | undefined> & {
  options: { value: string; label: string }[];
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () =>
      options.filter(
        o => !query || o.label.toLowerCase().includes(query.toLowerCase())
      ),
    [options, query]
  );
  const current = options.find(o => o.value === value);

  return (
    <div>
      <FieldLabel label={field.label} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between rounded-md border border-steel-200 bg-white px-2 text-sm"
          >
            <span className="truncate">{current?.label ?? emptyLabel}</span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-steel-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-2"
          align="start"
        >
          <div className="mb-2 flex items-center gap-1.5 rounded-md border border-steel-200 px-2">
            <Search className="size-3.5 text-steel-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-8 w-full border-0 bg-transparent text-sm focus:ring-0"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            <li>
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                  !value ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-steel-50'
                )}
              >
                {!value && <Check className="size-3.5" />}
                <span className={!value ? '' : 'pl-5'}>{emptyLabel}</span>
              </button>
            </li>
            {filtered.map(o => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
                    value === o.value
                      ? 'bg-indigo-50 text-indigo-800'
                      : 'hover:bg-steel-50'
                  )}
                >
                  {value === o.value && <Check className="size-3.5" />}
                  <span className={value === o.value ? '' : 'pl-5'}>
                    {o.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------- Taxonomy locks (searchable) ---------- */

type TermOptions = {
  categories: { id: string; name: string }[];
  tags: { id: string; name: string }[];
};
let termOptionsRequest: Promise<TermOptions> | null = null;

function useTermOptions() {
  const [options, setOptions] = useState<TermOptions | null>(null);
  useEffect(() => {
    let active = true;
    termOptionsRequest ??= getAllTaxonomyOptions().catch(() => {
      termOptionsRequest = null;
      return { categories: [], tags: [] };
    });
    termOptionsRequest.then(result => active && setOptions(result));

    return () => {
      active = false;
    };
  }, []);
  return options;
}

const termSelectField = (kind: 'categories' | 'tags', emptyLabel: string) =>
  function TermSelectField({
    value,
    onChange,
    field,
  }: CustomFieldProps<string | undefined>) {
    const options = useTermOptions();
    const list = (options?.[kind] ?? []).map(o => ({
      value: o.id,
      label: o.name,
    }));
    return (
      <SearchableSelectField
        name=""
        id=""
        value={value}
        onChange={onChange}
        field={field}
        options={list}
        emptyLabel={options === null ? 'Loading…' : emptyLabel}
      />
    );
  };

export const CategoryLockField = termSelectField('categories', 'Any category');
export const TagLockField = termSelectField('tags', 'Any tag');

export function GlobalBlockSelectField({
  value,
  onChange,
  field,
}: CustomFieldProps<string | undefined>) {
  const [options, setOptions] = useState<
    { id: string; name: string; category: string }[] | null
  >(null);

  useEffect(() => {
    let active = true;
    listGlobalBlockOptions().then(rows => {
      if (active) setOptions(Array.isArray(rows) ? rows : []);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <FieldLabel label={field.label} />
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-sm"
        aria-label={field.label}
      >
        <option value="">
          {options === null
            ? 'Loading…'
            : options.length
              ? 'Choose a global block'
              : 'No global blocks yet'}
        </option>
        {options?.map(o => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.category})
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs text-steel-500">
        Edits to a global block update every page that uses it.
      </p>
    </div>
  );
}

/* ---------- Video Sources Multi-select (YouTube, Vimeo, Direct) ---------- */

export function VideoSourcesField({
  value,
  onChange,
  field,
}: CustomFieldProps<string[] | string | undefined>) {
  const current: string[] = useMemo(() => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value && value !== 'all') return [value];
    return ['youtube', 'vimeo', 'direct'];
  }, [value]);

  const toggle = (sourceId: string) => {
    let next: string[];
    if (current.includes(sourceId)) {
      next = current.filter(s => s !== sourceId);
      if (next.length === 0) {
        next = ['youtube', 'vimeo', 'direct'];
      }
    } else {
      next = [...current, sourceId];
    }
    onChange(next);
  };

  const selectAll = () => {
    onChange(['youtube', 'vimeo', 'direct']);
  };

  const sourcesList = [
    {
      id: 'youtube',
      label: 'YouTube',
      activeColor:
        'border-red-300 bg-red-50/80 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400',
      dot: 'bg-red-500',
    },
    {
      id: 'vimeo',
      label: 'Vimeo',
      activeColor:
        'border-sky-300 bg-sky-50/80 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400',
      dot: 'bg-sky-500',
    },
    {
      id: 'direct',
      label: 'Direct (MP4/WebM)',
      activeColor:
        'border-violet-300 bg-violet-50/80 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400',
      dot: 'bg-violet-500',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <FieldLabel label={field.label || 'Data sources'} />
        <button
          type="button"
          onClick={selectAll}
          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
        >
          Select all
        </button>
      </div>

      <div className="space-y-1.5">
        {sourcesList.map(item => {
          const isSelected = current.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition',
                isSelected
                  ? item.activeColor
                  : 'border-steel-200 bg-white text-steel-600 hover:bg-steel-50 dark:border-dark-300 dark:bg-dark-100 dark:text-steel-400'
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', item.dot)} />
                {item.label}
              </span>
              <span
                className={cn(
                  'h-4 w-4 rounded flex items-center justify-center border text-[11px]',
                  isSelected
                    ? 'border-current bg-current/15 font-bold'
                    : 'border-steel-300 bg-steel-50 dark:border-dark-300 dark:bg-dark-200'
                )}
              >
                {isSelected ? '✓' : ''}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-steel-500">
        Choose which video sources to pull videos from. You can select multiple.
      </p>
    </div>
  );
}

export function CollectionSelectField({
  value,
  onChange,
  field,
}: CustomFieldProps<string | undefined>) {
  const [options, setOptions] = useState<
    { id: string; name: string; slug: string }[] | null
  >(null);

  useEffect(() => {
    let active = true;
    listCollectionOptions().then(rows => {
      if (active) setOptions(Array.isArray(rows) ? rows : []);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <FieldLabel label={field.label} />
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-sm text-foreground"
        aria-label={field.label}
      >
        <option value="">
          {options === null
            ? 'Loading collections…'
            : options.length
              ? 'Select a collection'
              : 'No collections found'}
        </option>
        {options?.map(o => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.slug})
          </option>
        ))}
      </select>
    </div>
  );
}

export function CollectionItemFieldSelect({
  value,
  onChange,
  field,
}: CustomFieldProps<string | undefined>) {
  const { entry } = useEntry();
  const fields = entry?.collection?.fields ?? [];

  return (
    <div>
      <FieldLabel label={field.label} />
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-sm text-foreground"
        aria-label={field.label}
      >
        <option value="">All fields (full entry preview)</option>
        {fields.map(f => (
          <option key={f.key} value={f.key}>
            {f.label} ({f.key})
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-steel-500">
        Choose a specific field to render, or leave on &ldquo;All fields&rdquo; to show the full entry.
      </p>
    </div>
  );
}
