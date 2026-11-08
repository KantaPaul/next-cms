'use client';

import {
  APPROVED_DYNAMIC_SOURCES,
  type DynamicSourceDef,
  type DynamicSourceField,
  type NormalizedListingItem,
} from '@nextcms/builder-core';
import { inputStyle } from '@nextcms/builder-react';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';

export type LoopItemFieldOption = {
  path: string;
  label: string;
  type?: string;
};

type LoopPreviewValue = {
  items: NormalizedListingItem[];
  fields: LoopItemFieldOption[];
};

const LoopPreviewContext = createContext<LoopPreviewValue>({
  items: [],
  fields: [],
});

export function LoopPreviewProvider({
  items,
  fields,
  children,
}: LoopPreviewValue & { children: ReactNode }) {
  const value = useMemo(() => ({ items, fields }), [items, fields]);
  return (
    <LoopPreviewContext.Provider value={value}>
      {children}
    </LoopPreviewContext.Provider>
  );
}

export const useLoopPreview = () => useContext(LoopPreviewContext);

/** Item the canvas previews: the one picked in root settings, else the first. */
export function pickPreviewItem(
  items: NormalizedListingItem[],
  id: unknown
): NormalizedListingItem | null {
  return items.find(item => item.id === id) ?? items[0] ?? null;
}

const DYNAMIC_TYPES = new Set(['text', 'image', 'url', 'date', 'number']);

/**
 * Dynamic sources for the Loop Item editor: "Loop Item" lists the source's
 * real fields (a post type's custom fields included) and comes first.
 */
export function loopItemDynamicSources(
  fields: LoopItemFieldOption[]
): Record<string, DynamicSourceDef> {
  const { loopItem: base, ...rest } = APPROVED_DYNAMIC_SOURCES;
  const loopItem: DynamicSourceDef = {
    ...base,
    label: 'Loop Item',
    description: 'The post or entry this template is rendering',
    fields: fields.length
      ? fields.map(f => ({
          key: f.path,
          label: f.label,
          type: (DYNAMIC_TYPES.has(f.type ?? '')
            ? f.type
            : 'text') as DynamicSourceField['type'],
        }))
      : base.fields,
  };
  return { loopItem, ...rest };
}

/** Root setting: which real post or entry the canvas previews. */
export function LoopPreviewItemField({
  value,
  onChange,
  field,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  field: { label?: string };
}) {
  const { items } = useLoopPreview();
  return (
    <div>
      <SearchableSelect
        value={pickPreviewItem(items, value)?.id}
        onValueChange={v => onChange(v || undefined)}
        options={items.map(item => ({ value: item.id, label: item.title }))}
        placeholder="Sample item (nothing published yet)"
        disabled={items.length === 0}
        aria-label={field.label}
      />
    </div>
  );
}

/**
 * Custom field key for the Loop Item Field block: a list of the source's
 * fields in the Loop Item editor, free text elsewhere.
 */
export function LoopCustomKeyField({
  value,
  onChange,
  field,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  field: { label?: string };
}) {
  const { fields } = useLoopPreview();
  return (
    <div>
      {fields.length ? (
        <SearchableSelect
          value={value}
          onValueChange={v => onChange(v ?? '')}
          options={fields.map(f => ({ value: f.path, label: f.label }))}
          placeholder="Choose a field…"
          emptyOptionLabel="Choose a field…"
          missingLabel={value}
          aria-label={field.label}
        />
      ) : (
        <input
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder="e.g. price, role"
          style={inputStyle}
          aria-label={field.label}
        />
      )}
    </div>
  );
}
