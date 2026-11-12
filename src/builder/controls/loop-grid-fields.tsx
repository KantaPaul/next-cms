'use client';

import type { FieldFilter, FieldFilterOperator } from '@nextcms/builder-core';
import { inputStyle } from '@nextcms/builder-react';
import { ExternalLink, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  listCollectionFieldOptions,
  listLoopTemplateOptions,
} from '@/app/(admin)/dashboard/(shell)/templates/loop/_modules/loop-templates.actions';
import { listCollectionTermOptions } from '@/app/(admin)/dashboard/(shell)/collections/_modules/collection-taxonomies.actions';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { PAGES } from '@/config/pages';

type LoopFieldProps<T> = {
  name: string;
  id: string;
  value: T;
  onChange: (value: T) => void;
  readOnly?: boolean;
  field: { label?: string };
  /** Every prop of the block (source, collectionId…). */
  props?: Record<string, unknown>;
};

export type CollectionFieldOption = {
  key: string;
  label: string;
  type: string;
  choices: string[];
};

const compactStyle = { ...inputStyle, minWidth: 0, fontSize: 12, padding: '5px 6px' };

function gridSource(props?: Record<string, unknown>) {
  const collection = props?.source === 'collection-entries';
  const externalApi = props?.source === 'external-api';
  const collectionId =
    typeof props?.collectionId === 'string' ? props.collectionId : '';
  const externalApiId =
    typeof props?.apiPresetId === 'string' ? props.apiPresetId : '';
  return { collection, externalApi, collectionId, externalApiId };
}

/** Fields of one post type, cached for the session so every control shares one request. */
const fieldCache = new Map<string, Promise<CollectionFieldOption[]>>();
export function useCollectionFields(collectionId: string) {
  const [fields, setFields] = useState<CollectionFieldOption[] | null>(null);
  useEffect(() => {
    if (!collectionId) {
      setFields([]);
      return;
    }
    let active = true;
    let request = fieldCache.get(collectionId);
    if (!request) {
      request = listCollectionFieldOptions({ collectionId }).catch(() => []);
      fieldCache.set(collectionId, request);
    }
    request.then(rows => {
      if (active) setFields(Array.isArray(rows) ? rows : []);
    });
    return () => {
      active = false;
    };
  }, [collectionId]);
  return fields;
}

/* ---------- template picker ---------- */

type TemplateOption = {
  id: string;
  name: string;
  published: boolean;
};

export function LoopTemplatePickerField({
  value,
  onChange,
  field,
  props,
}: LoopFieldProps<string | undefined>) {
  const { collection, externalApi, collectionId, externalApiId } =
    gridSource(props);
  const [options, setOptions] = useState<TemplateOption[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (collection && !collectionId) {
      setOptions([]);
      return;
    }
    let active = true;
    setOptions(null);
    listLoopTemplateOptions({
      sourceType: collection
        ? 'collection'
        : externalApi
          ? 'external-api'
          : 'posts',
      collectionId: collection ? collectionId : null,
      externalApiId: externalApi && externalApiId ? externalApiId : null,
    })
      .then(rows => {
        if (active) setOptions(Array.isArray(rows) ? rows : []);
      })
      .catch(() => active && setOptions([]));
    return () => {
      active = false;
    };
  }, [collection, externalApi, collectionId, externalApiId, reloadKey]);

  // Pick up templates created in another tab when the editor regains focus.
  useEffect(() => {
    const onFocus = () => setReloadKey(k => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const createHref = `${PAGES.DASHBOARD.LOOP_TEMPLATES}?new=1&source=${
    collection ? 'collection' : externalApi ? 'external-api' : 'posts'
  }${collection && collectionId ? `&collectionId=${collectionId}` : ''}${
    externalApi && externalApiId ? `&externalApiId=${externalApiId}` : ''
  }`;
  const missing =
    !!value && options !== null && !options.some(o => o.id === value);

  const selectOptions =
    options?.map(o => ({
      value: o.id,
      label: `${o.name}${o.published ? '' : ' (draft)'}`,
    })) ?? [];

  const placeholderLabel =
    options === null
      ? 'Loading templates…'
      : options.length
        ? 'Default card (no template)'
        : 'No templates for this source yet';

  return (
    <div>
      {collection && !collectionId ? (
        <p className="text-xs" style={{ color: 'var(--ne-text-muted, #64748b)' }}>Choose a post type first.</p>
      ) : (
        <>
          <SearchableSelect
            value={value}
            onValueChange={v => onChange(v || undefined)}
            options={selectOptions}
            placeholder={placeholderLabel}
            emptyOptionLabel={options?.length ? 'Default card (no template)' : undefined}
            missingLabel={
              options === null
                ? 'Loading templates…'
                : 'Template not found for this source'
            }
            searchPlaceholder="Search templates…"
            aria-label={field.label}
          />
          <div className="mt-2 flex gap-3 text-xs">
            <a
              href={createHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: 'var(--ne-primary, #4f46e5)' }}
            >
              <Plus className="size-3" /> New template
            </a>
            {value && !missing && (
              <a
                href={PAGES.DASHBOARD.LOOP_TEMPLATE(value)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium hover:underline" style={{ color: 'var(--ne-primary, #4f46e5)' }}
              >
                <ExternalLink className="size-3" /> Edit template
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- sort field ---------- */

const BASE_SORTS = [
  { label: 'Published date', value: 'publishedAt' },
  { label: 'Created date', value: 'createdAt' },
  { label: 'Updated date', value: 'updatedAt' },
];
const SORTABLE_TYPES = new Set(['text', 'number', 'date', 'select', 'boolean', 'url']);

export function LoopSortField({
  value,
  onChange,
  field,
  props,
}: LoopFieldProps<string | undefined>) {
  const { collection, collectionId } = gridSource(props);
  const fields = useCollectionFields(collection ? collectionId : '');
  const options = collection
    ? [
        ...BASE_SORTS,
        ...(fields ?? [])
          .filter(f => SORTABLE_TYPES.has(f.type))
          .map(f => ({ label: `Field: ${f.label}`, value: `field:${f.key}` })),
      ]
    : [{ label: 'Published date', value: 'publishedAt' }, { label: 'Title', value: 'title' }, ...BASE_SORTS.slice(1)];
  const current = value || 'publishedAt';

  return (
    <div>
      <SearchableSelect
        value={current}
        onValueChange={v => {
          if (v) onChange(v);
        }}
        options={options}
        missingLabel={current}
        searchPlaceholder="Search sort fields…"
        aria-label={field.label}
      />
    </div>
  );
}

/* ---------- custom field filters ---------- */

const OPERATORS: Record<string, { value: FieldFilterOperator; label: string }[]> = {
  text: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'exists', label: 'is set' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'exists', label: 'is set' },
  ],
  date: [
    { value: 'gte', label: 'on or after' },
    { value: 'lte', label: 'on or before' },
    { value: 'eq', label: 'is' },
    { value: 'exists', label: 'is set' },
  ],
  boolean: [{ value: 'eq', label: 'is' }],
  select: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'in', label: 'is any of' },
    { value: 'exists', label: 'is set' },
  ],
  other: [
    { value: 'contains', label: 'contains' },
    { value: 'exists', label: 'is set' },
  ],
};

function operatorsFor(type: string) {
  if (type === 'text' || type === 'url' || type === 'richtext') return OPERATORS.text;
  return OPERATORS[type] ?? OPERATORS.other;
}

function FilterValueInput({
  filter,
  meta,
  onChange,
}: {
  filter: FieldFilter;
  meta?: CollectionFieldOption;
  onChange: (value: FieldFilter['value']) => void;
}) {
  if (filter.operator === 'exists') {
    return (
      <SearchableSelect
        size="sm"
        className="text-xs"
        value={filter.value === false || filter.value === 'false' ? 'false' : 'true'}
        onValueChange={v => onChange(v === 'true')}
        options={[
          { value: 'true', label: 'yes' },
          { value: 'false', label: 'no' },
        ]}
      />
    );
  }
  if (meta?.type === 'boolean') {
    return (
      <SearchableSelect
        size="sm"
        className="text-xs"
        value={String(filter.value ?? 'true')}
        onValueChange={v => onChange(v === 'true')}
        options={[
          { value: 'true', label: 'true' },
          { value: 'false', label: 'false' },
        ]}
      />
    );
  }
  if (meta?.type === 'select' && meta.choices.length && filter.operator !== 'in') {
    return (
      <SearchableSelect
        size="sm"
        className="text-xs"
        value={String(filter.value ?? '')}
        onValueChange={v => onChange(v ?? '')}
        placeholder="Choose…"
        emptyOptionLabel="Choose…"
        options={meta.choices.map(c => ({ value: c, label: c }))}
      />
    );
  }
  return (
    <input
      style={compactStyle}
      type={meta?.type === 'number' ? 'number' : meta?.type === 'date' ? 'date' : 'text'}
      placeholder={filter.operator === 'in' ? 'a, b, c' : 'Value'}
      value={
        Array.isArray(filter.value)
          ? filter.value.join(', ')
          : String(filter.value ?? '')
      }
      onChange={e => onChange(e.target.value)}
    />
  );
}

export function CptFieldFiltersField({
  value,
  onChange,
  props,
  readOnly,
}: LoopFieldProps<FieldFilter[] | undefined>) {
  const { collectionId } = gridSource(props);
  const fields = useCollectionFields(collectionId);
  const filters = Array.isArray(value) ? value : [];

  const update = (index: number, patch: Partial<FieldFilter>) =>
    onChange(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const remove = (index: number) =>
    onChange(filters.filter((_, i) => i !== index));

  if (!collectionId) {
    return (
      <div>
          <p className="text-xs" style={{ color: 'var(--ne-text-muted, #64748b)' }}>Choose a post type first.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-2">
        {filters.map((filter, index) => {
          const meta = fields?.find(f => f.key === filter.key);
          const ops = operatorsFor(meta?.type ?? 'text');
          return (
            <div
              key={index}
              className="grid gap-1.5 rounded-md p-2" style={{ border: '1px solid var(--ne-border, rgba(127,127,127,.35))' }}
            >
              <div className="flex items-center gap-1.5">
                <SearchableSelect
                  size="sm"
                  className="text-xs"
                  value={filter.key}
                  disabled={readOnly}
                  options={
                    fields?.map(f => ({ value: f.key, label: f.label })) ?? []
                  }
                  missingLabel={filter.key}
                  onValueChange={nextKey => {
                    if (!nextKey) return;
                    const next = fields?.find(f => f.key === nextKey);
                    update(index, {
                      key: nextKey,
                      operator: operatorsFor(next?.type ?? 'text')[0].value,
                      value: next?.type === 'boolean' ? true : '',
                    });
                  }}
                  aria-label="Field"
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="shrink-0 rounded p-1 opacity-60 hover:opacity-100"
                  aria-label="Remove filter"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-1.5">
                <SearchableSelect
                  size="sm"
                  className="text-xs"
                  value={filter.operator}
                  disabled={readOnly}
                  options={ops}
                  onValueChange={nextOp => {
                    if (!nextOp) return;
                    update(index, {
                      operator: nextOp as FieldFilterOperator,
                      ...(nextOp === 'exists' ? { value: true } : {}),
                    });
                  }}
                  aria-label="Condition"
                />
                <FilterValueInput
                  filter={filter}
                  meta={meta}
                  onChange={v => update(index, { value: v })}
                />
              </div>
            </div>
          );
        })}
        <button
          type="button"
          disabled={readOnly || !fields?.length}
          onClick={() => {
            const first = fields?.[0];
            if (!first) return;
            onChange([
              ...filters,
              {
                key: first.key,
                operator: operatorsFor(first.type)[0].value,
                value: first.type === 'boolean' ? true : '',
              },
            ]);
          }}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-dashed text-xs font-medium disabled:opacity-50" style={{ borderColor: 'var(--ne-border, rgba(127,127,127,.35))', color: 'inherit', background: 'transparent' }}
        >
          <Plus className="size-3.5" />
          {fields === null
            ? 'Loading fields…'
            : fields.length
              ? 'Add field filter'
              : 'This post type has no fields'}
        </button>
      </div>
    </div>
  );
}

export function CptTermLockField({
  value,
  onChange,
  field,
  props,
  readOnly,
}: LoopFieldProps<string | undefined>) {
  const { collectionId } = gridSource(props);
  const [terms, setTerms] = useState<
    { id: string; name: string; slug: string; taxonomy: string }[] | null
  >(null);

  useEffect(() => {
    if (!collectionId) {
      setTerms([]);
      return;
    }
    let active = true;
    listCollectionTermOptions(collectionId)
      .then(rows => {
        if (active) setTerms(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (active) setTerms([]);
      });
    return () => {
      active = false;
    };
  }, [collectionId]);

  if (!collectionId) {
    return (
      <div>
        <p
          className="text-xs"
          style={{ color: 'var(--ne-text-muted, #64748b)' }}
        >
          Choose a post type first.
        </p>
      </div>
    );
  }

  return (
    <SearchableSelect
      size="sm"
      className="text-xs"
      value={value}
      disabled={readOnly}
      placeholder="Any term"
      emptyOptionLabel="Any term"
      options={terms?.map(t => ({ value: t.slug, label: t.name })) ?? []}
      onValueChange={v => onChange(v || undefined)}
      aria-label={field.label ?? 'Lock to term'}
    />
  );
}
