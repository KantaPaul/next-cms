'use client';

import {
  APPROVED_DYNAMIC_SOURCES,
  type DynamicSourceDef,
  type DynamicSourceField,
  type NormalizedListingItem,
} from '@nextcms/builder-core';
import { inputStyle } from '@nextcms/builder-react';
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';

export type LoopItemFieldOption = {
  path: string;
  label: string;
  type?: string;
  /** Underlying collection or item field type (`text`, `richtext`, `media`, `url`, `date`, `number`, `boolean`, `select`, `relation`, `permalink`, `author`, `terms`, `excerpt`). */
  fieldType?: string;
  /** Field configuration JSON (`multiple`, `isFeatured`, `textMode`, `urlMode`, `options`). */
  config?: Record<string, unknown>;
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
  const filteredFields = fields.filter(f => f.path !== 'slug');
  const loopItem: DynamicSourceDef = {
    ...base,
    label: 'Loop Item',
    description: 'The post or entry this template is rendering',
    fields: filteredFields.length
      ? filteredFields.map(f => ({
          key: f.path,
          label: f.label,
          type: (DYNAMIC_TYPES.has(f.type ?? '')
            ? f.type
            : 'text') as DynamicSourceField['type'],
        }))
      : base.fields.filter(f => f.key !== 'slug'),
  };
  return { loopItem, ...rest };
}

/**
 * Dynamic sources for a collection entry or single-entry template editor:
 * surfaces the post type's real fields under `custom` alongside `post`.
 */
export function entryDynamicSources(
  collectionName: string,
  fields: { key: string; label: string; type: string }[]
): Record<string, DynamicSourceDef> {
  const { custom: baseCustom, post: basePost, ...rest } = APPROVED_DYNAMIC_SOURCES;
  const mappedFields: DynamicSourceField[] = fields
    .filter(f => f.key !== 'slug')
    .map(f => {
      const mappedType =
        f.type === 'media'
          ? 'image'
          : DYNAMIC_TYPES.has(f.type)
            ? f.type
            : 'text';
      return {
        key: f.key,
        label: f.label,
        type: mappedType as DynamicSourceField['type'],
      };
    });
  const custom: DynamicSourceDef = {
    ...baseCustom,
    label: collectionName ? `${collectionName} Fields` : baseCustom.label,
    description: collectionName
      ? `Custom fields of the current ${collectionName} entry`
      : baseCustom.description,
    fields: mappedFields.length ? mappedFields : baseCustom.fields,
  };
  return { custom, post: basePost, ...rest };
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
 * Dynamic "Item field" selector for LoopItemFieldBlock: only shows built-in item
 * fields that actually exist in the current source (posts, collection, or
 * Saved External API), plus "Custom / Mapped Field".
 */
const ALL_ITEM_FIELD_OPTIONS = [
  { label: 'Title', value: 'title' },
  { label: 'Excerpt / Summary', value: 'excerpt' },
  { label: 'Featured Image', value: 'image' },
  { label: 'Published Date', value: 'publishedAt' },
  { label: 'Author Name', value: 'author' },
  { label: 'Categories & Tags / Terms', value: 'terms' },
  { label: 'Read More / Permalink', value: 'readMore' },
  { label: 'Bookmark Button', value: 'bookmark' },
  { label: 'Custom / Mapped Field', value: 'custom' },
];

export function LoopItemFieldSelect({
  value,
  onChange,
  field,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  field: { label?: string };
}) {
  const { fields, items } = useLoopPreview();

  const options = useMemo(() => {
    if (fields.length === 0) return ALL_ITEM_FIELD_OPTIONS;

    const pathSet = new Set(fields.map(f => f.path));
    const isExternalApi = items.some(it => it.source === 'external-api');
    const hasFeaturedMedia = fields.some(
      f => f.fieldType === 'media' && Boolean(f.config?.isFeatured)
    );
    const hasCustomFields = fields.some(
      f =>
        ![
          'title',
          'url',
          'excerpt',
          'image',
          'publishedAt',
          'authorName',
          'authorImage',
          'category',
          'tags',
          'terms',
          'slug',
        ].includes(f.path)
    );

    const filtered = ALL_ITEM_FIELD_OPTIONS.filter(opt => {
      switch (opt.value) {
        case 'title':
          return pathSet.has('title');
        case 'excerpt':
          return pathSet.has('excerpt');
        case 'image':
          return pathSet.has('image') || hasFeaturedMedia;
        case 'publishedAt':
          return pathSet.has('publishedAt');
        case 'author':
          return pathSet.has('authorName');
        case 'terms':
          return (
            pathSet.has('terms') ||
            pathSet.has('category') ||
            pathSet.has('tags')
          );
        case 'readMore':
          return pathSet.has('url');
        case 'bookmark':
          return !isExternalApi;
        case 'custom':
          return hasCustomFields || fields.length > 0;
        default:
          return true;
      }
    });

    if (value && !filtered.some(o => o.value === value)) {
      const legacy = ALL_ITEM_FIELD_OPTIONS.find(o => o.value === value);
      if (legacy) filtered.push(legacy);
    }

    return filtered.length > 0 ? filtered : ALL_ITEM_FIELD_OPTIONS;
  }, [fields, items, value]);

  return (
    <select
      value={value ?? 'title'}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
      aria-label={field.label}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Custom field key for the Loop Item Field block: a list of the source's
 * fields in the Loop Item editor (excluding slug), free text elsewhere.
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
  const availableFields = useMemo(
    () => fields.filter(f => f.path !== 'slug'),
    [fields]
  );

  const selectedKeys = useMemo(
    () =>
      (value ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
    [value]
  );

  // Detect object-type fields from External API (`fieldType === 'object'`)
  // or nested dot-notation prefixes (e.g. `address` when `address.street` exists).
  const objectParentPaths = useMemo(() => {
    const parents = new Set<string>();
    for (const f of availableFields) {
      if (f.fieldType === 'object') {
        parents.add(f.path);
      } else if (f.path.includes('.')) {
        const dotIdx = f.path.indexOf('.');
        parents.add(f.path.slice(0, dotIdx));
      }
    }
    return parents;
  }, [availableFields]);

  const canMultiSelect = availableFields.length > 1 || objectParentPaths.size > 0;
  const [multiOpen, setMultiOpen] = useState(
    () =>
      selectedKeys.length > 1 ||
      (selectedKeys.length === 1 && objectParentPaths.has(selectedKeys[0]))
  );
  const [searchQuery, setSearchQuery] = useState('');

  const isMultiActive =
    multiOpen ||
    selectedKeys.length > 1 ||
    (selectedKeys.length === 1 && objectParentPaths.has(selectedKeys[0]));

  const toggleKey = (key: string) => {
    const exists = selectedKeys.includes(key);
    const next = exists
      ? selectedKeys.filter(k => k !== key)
      : [...selectedKeys, key];
    onChange(next.join(','));
  };

  const childKeysForObject = (parentPath: string) =>
    availableFields.filter(
      f => f.path !== parentPath && f.path.startsWith(`${parentPath}.`)
    );

  const selectableOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return availableFields.filter(f => {
      if (!q) return true;
      return (
        f.label.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
      );
    });
  }, [availableFields, searchQuery]);

  if (!availableFields.length) {
    return (
      <input
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. price, role (or comma-separated keys)"
        style={inputStyle}
        aria-label={field.label}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {canMultiSelect && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6,
          }}
        >
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {isMultiActive
              ? `${selectedKeys.length} field${selectedKeys.length === 1 ? '' : 's'} selected`
              : 'Single field'}
          </span>
          <button
            type="button"
            onClick={() => setMultiOpen(v => !v)}
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#4f46e5',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            {isMultiActive ? 'Single select' : 'Multi-select'}
          </button>
        </div>
      )}

      {!isMultiActive ? (
        <SearchableSelect
          value={selectedKeys[0]}
          onValueChange={v => {
            const next = v ?? '';
            if (next && objectParentPaths.has(next)) {
              const children = childKeysForObject(next);
              if (children.length > 0) {
                setMultiOpen(true);
                onChange(children.map(c => c.path).join(','));
                return;
              }
              setMultiOpen(true);
            }
            onChange(next);
          }}
          options={availableFields.map(f => ({
            value: f.path,
            label:
              f.fieldType === 'object' || objectParentPaths.has(f.path)
                ? `${f.label} (Object · multi-select)`
                : f.label,
          }))}
          placeholder="Choose a field…"
          emptyOptionLabel="Choose a field…"
          missingLabel={selectedKeys[0]}
          aria-label={field.label}
        />
      ) : (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            background: 'rgba(248, 250, 252, 0.7)',
          }}
        >
          {selectedKeys.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selectedKeys.map(k => {
                const match = availableFields.find(f => f.path === k);
                return (
                  <span
                    key={k}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: '#e0e7ff',
                      color: '#3730a3',
                    }}
                  >
                    <span>{match?.label ?? k}</span>
                    <button
                      type="button"
                      onClick={() => toggleKey(k)}
                      aria-label={`Remove ${k}`}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                        fontWeight: 700,
                      }}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search fields to multi-select…"
            style={{ ...inputStyle, fontSize: 11, padding: '4px 6px' }}
          />
          <div
            style={{
              maxHeight: 160,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {selectableOptions.map(f => {
              const checked = selectedKeys.includes(f.path);
              const isObj =
                f.fieldType === 'object' || objectParentPaths.has(f.path);
              return (
                <label
                  key={f.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    padding: '3px 4px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    background: checked ? '#eef2ff' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (isObj) {
                        const children = childKeysForObject(f.path);
                        if (children.length > 0) {
                          const childPaths = children.map(c => c.path);
                          const allSelected = childPaths.every(cp =>
                            selectedKeys.includes(cp)
                          );
                          const next = allSelected
                            ? selectedKeys.filter(k => !childPaths.includes(k))
                            : Array.from(
                                new Set([...selectedKeys, ...childPaths])
                              );
                          onChange(next.join(','));
                          return;
                        }
                      }
                      toggleKey(f.path);
                    }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {f.label}
                    {isObj ? ' (Object)' : ''}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: '#94a3b8',
                      fontFamily: 'monospace',
                    }}
                  >
                    {f.path}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
