'use client';

import {
  APPROVED_DYNAMIC_SOURCES,
  type DynamicSourceDef,
  type DynamicSourceField,
  type NormalizedListingItem,
} from '@nextcms/builder-core';
import { inputStyle } from '@nextcms/builder-react';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

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
      <select
        value={pickPreviewItem(items, value)?.id ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        style={inputStyle}
        aria-label={field.label}
      >
        {items.length === 0 && <option value="">Sample item (nothing published yet)</option>}
        {items.map(item => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
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
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          style={inputStyle}
          aria-label={field.label}
        >
          <option value="">Choose a field…</option>
          {value && !fields.some(f => f.path === value) && (
            <option value={value}>{value}</option>
          )}
          {fields.map(f => (
            <option key={f.path} value={f.path}>
              {f.label}
            </option>
          ))}
        </select>
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
