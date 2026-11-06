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
  const collectionId =
    typeof props?.collectionId === 'string' ? props.collectionId : '';
  return { collection, collectionId };
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
  const { collection, collectionId } = gridSource(props);
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
      sourceType: collection ? 'collection' : 'posts',
      collectionId: collection ? collectionId : null,
    })
      .then(rows => {
        if (active) setOptions(Array.isArray(rows) ? rows : []);
      })
      .catch(() => active && setOptions([]));
    return () => {
      active = false;
    };
  }, [collection, collectionId, reloadKey]);

  // Pick up templates created in another tab when the editor regains focus.
  useEffect(() => {
    const onFocus = () => setReloadKey(k => k + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const createHref = `${PAGES.DASHBOARD.LOOP_TEMPLATES}?new=1&source=${
    collection ? 'collection' : 'posts'
  }${collection && collectionId ? `&collectionId=${collectionId}` : ''}`;
  const missing =
    !!value && options !== null && !options.some(o => o.id === value);

  return (
    <div>
      {collection && !collectionId ? (
        <p className="text-xs" style={{ color: 'var(--ne-text-muted, #64748b)' }}>Choose a post type first.</p>
      ) : (
        <>
          <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value || undefined)}
            style={inputStyle}
            aria-label={field.label}
          >
            <option value="">
              {options === null
                ? 'Loading templates…'
                : options.length
                  ? 'Default card (no template)'
                  : 'No templates for this source yet'}
            </option>
            {missing && (
              <option value={value}>Template not found for this source</option>
            )}
            {options?.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.published ? '' : ' (draft)'}
              </option>
            ))}
          </select>
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
      <select
        value={current}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
        aria-label={field.label}
      >
        {!options.some(o => o.value === current) && (
          <option value={current}>{current}</option>
        )}
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
      <select
        style={compactStyle}
        value={filter.value === false || filter.value === 'false' ? 'false' : 'true'}
        onChange={e => onChange(e.target.value === 'true')}
      >
        <option value="true">yes</option>
        <option value="false">no</option>
      </select>
    );
  }
  if (meta?.type === 'boolean') {
    return (
      <select
        style={compactStyle}
        value={String(filter.value ?? 'true')}
        onChange={e => onChange(e.target.value === 'true')}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  if (meta?.type === 'select' && meta.choices.length && filter.operator !== 'in') {
    return (
      <select
        style={compactStyle}
        value={String(filter.value ?? '')}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Choose…</option>
        {meta.choices.map(c => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
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
  field,
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
                <select
                  style={compactStyle}
                  value={filter.key}
                  disabled={readOnly}
                  onChange={e => {
                    const next = fields?.find(f => f.key === e.target.value);
                    update(index, {
                      key: e.target.value,
                      operator: operatorsFor(next?.type ?? 'text')[0].value,
                      value: next?.type === 'boolean' ? true : '',
                    });
                  }}
                  aria-label="Field"
                >
                  {!meta && <option value={filter.key}>{filter.key}</option>}
                  {fields?.map(f => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
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
                <select
                  style={compactStyle}
                  value={filter.operator}
                  disabled={readOnly}
                  onChange={e =>
                    update(index, {
                      operator: e.target.value as FieldFilterOperator,
                      ...(e.target.value === 'exists' ? { value: true } : {}),
                    })
                  }
                  aria-label="Condition"
                >
                  {ops.map(o => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
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
    <select
      style={compactStyle}
      value={value ?? ''}
      disabled={readOnly}
      onChange={e => onChange(e.target.value || undefined)}
      aria-label={field.label ?? 'Lock to term'}
    >
      <option value="">Any term</option>
      {terms?.map(t => (
        <option key={t.id} value={t.slug}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

