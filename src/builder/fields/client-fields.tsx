'use client';

import { useEffect, useState } from 'react';
import { TextEditor } from '@/components/atoms/text-editor';
import { MediaField } from '@/components/media/media-picker';
import { listGlobalBlockOptions } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { getAllTaxonomyOptions } from '@/server/actions/blog.actions';

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
    const list = options?.[kind] ?? [];
    return (
      <div>
        <FieldLabel label={field.label} />
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value || undefined)}
          className="h-9 w-full rounded-md border border-steel-200 bg-white px-2 text-sm"
          aria-label={field.label}
        >
          <option value="">{options === null ? 'Loading…' : emptyLabel}</option>
          {list.map(o => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
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
