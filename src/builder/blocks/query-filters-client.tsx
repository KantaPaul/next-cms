'use client';

import {
  encodeNamespacedParams,
  EXT_PARAM_PREFIX,
  type ExternalApiFilterFieldConfig,
  type FacetOption,
  formatNamespacedParam,
  type ListingFacets,
  type ListingSource,
  type ParsedListingParams,
  parseNamespacedParams,
} from '@nextcms/builder-core';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import {
  encodeExtRange,
  encodeExtSearch,
  type ExtFilterStyle,
  formatExtValue,
  isExtFilterStyle,
  readExtRange,
  readExtSearch,
} from '@/lib/external-api-visitor-filters';
import { cn } from '@/lib/utils/cn';
import type { ElementStyle } from '../style';
import { el } from './element';

/** External API filter styles shown in the main row next to search and sort. */
const COMPACT_EXT_STYLES = new Set<ExtFilterStyle>(['select', 'search', 'range', 'toggle']);

type ElProps = Record<string, unknown>;

/** Text search on one API field: applies on Enter or when the field loses focus. */
function ExtSearchInput({
  name,
  label,
  initial,
  inputProps,
  labelProps,
  onCommit,
}: {
  name: string;
  label: string;
  initial: string;
  inputProps: ElProps;
  labelProps: ElProps;
  onCommit: (text: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  useEffect(() => setDraft(initial), [initial]);
  const commit = () => {
    if (draft.trim() !== initial) onCommit(draft);
  };
  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      <span {...labelProps}>{label}</span>
      <input
        type="search"
        name={name}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        placeholder={`Search ${label.toLowerCase()}…`}
        aria-label={label}
        {...inputProps}
      />
    </label>
  );
}

/** Min–max number range on one API field: applies on Enter or blur. */
function ExtRangeInput({
  name,
  label,
  initial,
  inputProps,
  labelProps,
  onCommit,
}: {
  name: string;
  label: string;
  initial: { min: string; max: string };
  inputProps: ElProps;
  labelProps: ElProps;
  onCommit: (min: string, max: string) => void;
}) {
  const [min, setMin] = useState(initial.min);
  const [max, setMax] = useState(initial.max);
  useEffect(() => {
    setMin(initial.min);
    setMax(initial.max);
  }, [initial.min, initial.max]);
  const commit = () => {
    if (min !== initial.min || max !== initial.max) onCommit(min, max);
  };
  const onKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
  };
  return (
    <fieldset className="flex flex-col gap-1 text-xs font-medium">
      <legend {...labelProps} className={cn('mb-1', labelProps.className as string)}>
        {label}
      </legend>
      <input type="hidden" name={name} value={encodeExtRange(min, max)} />
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={min}
          onChange={e => setMin(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          placeholder="Min"
          aria-label={`${label} minimum`}
          {...inputProps}
          className={cn(inputProps.className as string, 'w-full min-w-0')}
        />
        <span aria-hidden="true" className="s-muted">–</span>
        <input
          type="number"
          inputMode="decimal"
          value={max}
          onChange={e => setMax(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          placeholder="Max"
          aria-label={`${label} maximum`}
          {...inputProps}
          className={cn(inputProps.className as string, 'w-full min-w-0')}
        />
      </div>
    </fieldset>
  );
}

export type TaxonomyControlStyle = 'select' | 'checkboxes' | 'chips';

export interface QueryFilterClientProps {
  targetLoopId?: string;
  source?: ListingSource;
  apiFilterFields?: ExternalApiFilterFieldConfig[];
  showKeyword?: boolean;
  keywordPlaceholder?: string;
  showCategories?: boolean;
  categoryStyle?: TaxonomyControlStyle;
  showTags?: boolean;
  tagStyle?: TaxonomyControlStyle;
  showDateRange?: boolean;
  showNumberRange?: boolean;
  numberRangeLabel?: string;
  showBooleanToggle?: boolean;
  booleanToggleLabel?: string;
  showSort?: boolean;
  showResultCount?: boolean;
  showActiveChips?: boolean;
  showFacetCounts?: boolean;
  mobileDrawer?: boolean;
  applyButtonLabel?: string;
  /** `vertical` stacks every control in one column (Query Loop sidebar filters). */
  orientation?: 'horizontal' | 'vertical';
  // Server-loaded state
  activeParams?: ParsedListingParams;
  facets?: ListingFacets;
  totalResults?: number;
  preservedHiddenParams?: Record<string, string>;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
}

export function QueryFilterClient({
  targetLoopId = '',
  source,
  apiFilterFields = [],
  showKeyword = true,
  keywordPlaceholder = 'Search items…',
  showCategories = true,
  categoryStyle = 'select',
  showTags = true,
  tagStyle = 'chips',
  showDateRange = false,
  showNumberRange = false,
  numberRangeLabel = 'Duration / Value',
  showBooleanToggle = false,
  booleanToggleLabel = 'With image only',
  showSort = true,
  showResultCount = true,
  showActiveChips = true,
  showFacetCounts = true,
  mobileDrawer = true,
  applyButtonLabel = 'Apply filters',
  orientation = 'horizontal',
  activeParams: serverParams,
  facets,
  totalResults = 0,
  preservedHiddenParams = {},
  editing = false,
  elements,
}: QueryFilterClientProps) {
  const styled = { elements };
  const labelEl = el(styled, 'label', 's-muted');
  const inputEl = el(
    styled,
    'input',
    's-surface s-border s-radius h-10 border px-3 text-sm'
  );
  const router = useRouter();
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const vertical = orientation === 'vertical';
  const fieldGrid = vertical
    ? 'grid grid-cols-1 gap-3'
    : 'grid grid-cols-1 gap-3 sm:grid-cols-2 s-desk-cols-4';

  // Merge URL searchParams with server-provided activeParams
  const currentParams = useMemo(() => {
    if (rawSearchParams && rawSearchParams.toString().length > 0) {
      return parseNamespacedParams(rawSearchParams, targetLoopId);
    }
    return serverParams ?? {};
  }, [rawSearchParams, serverParams, targetLoopId]);

  const [draftKeyword, setDraftKeyword] = useState(currentParams.search ?? '');
  useEffect(() => {
    setDraftKeyword(currentParams.search ?? '');
  }, [currentParams.search]);

  const paramName = useCallback(
    (key: string) => formatNamespacedParam(key, targetLoopId),
    [targetLoopId]
  );

  // Build URL with updated listing params while preserving other namespaces' params
  const buildFilterUrl = useCallback(
    (nextListingParams: ParsedListingParams): string => {
      const next = new URLSearchParams(rawSearchParams?.toString() ?? '');
      // Clear all current namespace keys first
      const keysToClear = [
        'page',
        'q',
        'search',
        'category',
        'tag',
        'author',
        'from',
        'to',
        'min',
        'max',
        'toggle',
        'sort',
        'order',
      ];
      for (const k of keysToClear) {
        next.delete(paramName(k));
      }
      const extPrefix = paramName(EXT_PARAM_PREFIX);
      for (const k of Array.from(next.keys())) {
        if (k.startsWith(extPrefix)) {
          next.delete(k);
        }
      }

      const encoded = encodeNamespacedParams(
        { ...nextListingParams, page: 1 },
        targetLoopId
      );
      for (const [k, v] of Object.entries(encoded)) {
        next.set(k, v);
      }

      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [paramName, pathname, rawSearchParams, targetLoopId]
  );

  const applyParams = useCallback(
    (
      patch: Partial<ParsedListingParams>,
      options?: { focusResults?: boolean; closeDrawer?: boolean }
    ) => {
      if (editing) return;
      const merged: ParsedListingParams = {
        ...currentParams,
        ...patch,
        page: 1,
      };
      const url = buildFilterUrl(merged);
      startTransition(() => {
        router.push(url, { scroll: false });
        if (options?.closeDrawer) {
          setDrawerOpen(false);
        }
        if (options?.focusResults && typeof document !== 'undefined') {
          const region = document.getElementById(
            `query-loop-${targetLoopId || 'main'}`
          );
          region?.focus({ preventScroll: true });
        }
      });
    },
    [buildFilterUrl, currentParams, editing, router, targetLoopId]
  );

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (editing) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const parsed = parseNamespacedParams(
      new URLSearchParams(
        Array.from(formData.entries()).map(([k, v]) => [k, String(v)])
      ),
      targetLoopId
    );
    const url = buildFilterUrl(parsed);
    startTransition(() => {
      router.push(url, { scroll: false });
      setDrawerOpen(false);
      if (typeof document !== 'undefined') {
        const region = document.getElementById(
          `query-loop-${targetLoopId || 'main'}`
        );
        region?.focus({ preventScroll: true });
      }
    });
  };

  const categoryOptions: FacetOption[] = useMemo(
    () =>
      facets?.categories ?? [
        { value: 'engineering', label: 'Engineering', count: 4 },
        { value: 'product', label: 'Product', count: 3 },
        { value: 'design', label: 'Design', count: 2 },
      ],
    [facets?.categories]
  );

  const tagOptions: FacetOption[] = useMemo(
    () =>
      facets?.tags ?? [
        { value: 'architecture', label: 'Architecture', count: 3 },
        { value: 'localization', label: 'Localization', count: 2 },
        { value: 'accessibility', label: 'Accessibility', count: 4 },
      ],
    [facets?.tags]
  );

  const formatOptionLabel = (opt: FacetOption) =>
    showFacetCounts ? `${opt.label} (${opt.count})` : opt.label;

  const selectedCategories = useMemo(
    () =>
      currentParams.categories ??
      (currentParams.category ? [currentParams.category] : []),
    [currentParams.categories, currentParams.category]
  );

  const selectedTags = useMemo(
    () => currentParams.tags ?? (currentParams.tag ? [currentParams.tag] : []),
    [currentParams.tags, currentParams.tag]
  );

  const toggleMultiValue = (
    currentList: string[],
    value: string,
    singleKey: 'category' | 'tag',
    multiKey: 'categories' | 'tags'
  ) => {
    const exists = currentList.includes(value);
    const nextList = exists
      ? currentList.filter(v => v !== value)
      : [...currentList, value];
    applyParams({
      [singleKey]: nextList[0] ?? undefined,
      [multiKey]: nextList.length > 1 ? nextList : undefined,
    });
  };

  // Active filter chips (R582 / QRY-12)
  const activeChips = useMemo(() => {
    const chips: {
      key: string;
      label: string;
      clearPatch: Partial<ParsedListingParams>;
    }[] = [];

    if (currentParams.search) {
      chips.push({
        key: `search:${currentParams.search}`,
        label: `“${currentParams.search}”`,
        clearPatch: { search: undefined },
      });
    }
    for (const cat of selectedCategories) {
      const match = categoryOptions.find(c => c.value === cat);
      const remaining = selectedCategories.filter(v => v !== cat);
      chips.push({
        key: `cat:${cat}`,
        label: `Category: ${match?.label ?? cat}`,
        clearPatch: {
          category: remaining[0] ?? undefined,
          categories: remaining.length > 1 ? remaining : undefined,
        },
      });
    }
    for (const tag of selectedTags) {
      const match = tagOptions.find(t => t.value === tag);
      const remaining = selectedTags.filter(v => v !== tag);
      chips.push({
        key: `tag:${tag}`,
        label: `Tag: ${match?.label ?? tag}`,
        clearPatch: {
          tag: remaining[0] ?? undefined,
          tags: remaining.length > 1 ? remaining : undefined,
        },
      });
    }
    if (currentParams.from || currentParams.to) {
      chips.push({
        key: 'date-range',
        label: `Date: ${currentParams.from || '…'} → ${currentParams.to || '…'}`,
        clearPatch: { from: undefined, to: undefined },
      });
    }
    if (currentParams.min !== undefined || currentParams.max !== undefined) {
      chips.push({
        key: 'number-range',
        label: `${numberRangeLabel}: ${currentParams.min ?? '0'}–${currentParams.max ?? '∞'}`,
        clearPatch: { min: undefined, max: undefined },
      });
    }
    if (currentParams.toggle !== undefined) {
      chips.push({
        key: 'toggle',
        label: `${booleanToggleLabel}: ${currentParams.toggle ? 'Yes' : 'No'}`,
        clearPatch: { toggle: undefined },
      });
    }
    if (currentParams.ext) {
      for (const [fieldKey, values] of Object.entries(currentParams.ext)) {
        const fieldCfg = apiFilterFields.find(f => f.key === fieldKey);
        const fieldLabel =
          fieldCfg?.label?.trim() || fieldKey.split('.').pop() || fieldKey;
        const facetList = facets?.ext?.[fieldKey] ?? [];
        for (const val of values) {
          const match = facetList.find(o => o.value === val);
          const remaining = values.filter(v => v !== val);
          const nextExt = { ...(currentParams.ext ?? {}) };
          if (remaining.length > 0) {
            nextExt[fieldKey] = remaining;
          } else {
            delete nextExt[fieldKey];
          }
          chips.push({
            key: `ext:${fieldKey}:${val}`,
            label: `${fieldLabel}: ${match?.label ?? formatExtValue(val)}`,
            clearPatch: {
              ext: Object.keys(nextExt).length > 0 ? nextExt : undefined,
            },
          });
        }
      }
    }
    return chips;
  }, [
    apiFilterFields,
    booleanToggleLabel,
    categoryOptions,
    currentParams.ext,
    currentParams.from,
    currentParams.max,
    currentParams.min,
    currentParams.search,
    currentParams.to,
    currentParams.toggle,
    facets?.ext,
    numberRangeLabel,
    selectedCategories,
    selectedTags,
    tagOptions,
  ]);

  const clearAllHref = useMemo(() => buildFilterUrl({}), [buildFilterUrl]);

  const renderTaxonomyControl = (
    label: string,
    style: TaxonomyControlStyle,
    options: FacetOption[],
    selected: string[],
    singleKey: 'category' | 'tag',
    multiKey: 'categories' | 'tags'
  ) => {
    const inputName = paramName(singleKey);
    if (style === 'select') {
      return (
        <label className="flex flex-col gap-1 text-xs font-medium">
          <span {...labelEl}>{label}</span>
          <select
            name={inputName}
            value={selected[0] ?? ''}
            onChange={e =>
              applyParams({
                [singleKey]: e.target.value || undefined,
                [multiKey]: undefined,
              })
            }
            aria-label={label}
            {...inputEl}
          >
            <option value="">All {label.toLowerCase()}</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {formatOptionLabel(opt)}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (style === 'checkboxes') {
      return (
        <fieldset className="flex flex-col gap-1.5">
          <legend {...el(styled, 'label', 's-muted mb-1 text-xs font-medium')}>
            {label}
          </legend>
          <div className="flex flex-wrap gap-3">
            {options.map(opt => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    name={inputName}
                    value={opt.value}
                    checked={checked}
                    onChange={() =>
                      toggleMultiValue(selected, opt.value, singleKey, multiKey)
                    }
                    className="rounded border-slate-300"
                  />
                  <span>{formatOptionLabel(opt)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    // Chips style
    return (
      <div className="flex flex-col gap-1.5" role="group" aria-label={label}>
        <span {...el(styled, 'label', 's-muted text-xs font-medium')}>
          {label}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {options.map(opt => {
            const active = selected.includes(opt.value);
            const nextList = active
              ? selected.filter(v => v !== opt.value)
              : [...selected, opt.value];
            const chipHref = buildFilterUrl({
              ...currentParams,
              [singleKey]: nextList[0] ?? undefined,
              [multiKey]: nextList.length > 1 ? nextList : undefined,
            });
            return (
              <a
                key={opt.value}
                href={chipHref}
                aria-pressed={active}
                onClick={e => {
                  e.preventDefault();
                  toggleMultiValue(selected, opt.value, singleKey, multiKey);
                }}
                {...el(
                  styled,
                  active ? 'activeChip' : 'chip',
                  cn(
                    's-radius inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 's-primary-bg border-transparent'
                      : 's-surface s-border hover:opacity-80'
                  )
                )}
              >
                {formatOptionLabel(opt)}
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  const isExternalApi = source === 'external-api';
  const normalizedApiFilterFields = useMemo(
    () =>
      isExternalApi && Array.isArray(apiFilterFields)
        ? apiFilterFields
            .filter(f => f && typeof f.key === 'string' && f.key.trim().length > 0)
            .map(f => ({
              key: f.key.trim(),
              label:
                f.label?.trim() ||
                f.key
                  .trim()
                  .split('.')
                  .pop()
                  ?.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
                  .replace(/[_-]+/g, ' ')
                  .replace(/\b\w/g, c => c.toUpperCase()) ||
                f.key.trim(),
              style: (isExtFilterStyle(f.style) ? f.style : 'select') as ExtFilterStyle,
            }))
        : [],
    [apiFilterFields, isExternalApi]
  );

  const getExtOptions = (fieldKey: string, label: string): FacetOption[] => {
    const live = facets?.ext?.[fieldKey];
    if (live && live.length > 0) return live;
    if (editing) {
      return [
        { value: 'sample-1', label: `${label} 1`, count: 3 },
        { value: 'sample-2', label: `${label} 2`, count: 2 },
      ];
    }
    return [];
  };

  const toggleExtValue = (fieldKey: string, value: string) => {
    const currentList = currentParams.ext?.[fieldKey] ?? [];
    const exists = currentList.includes(value);
    const nextList = exists
      ? currentList.filter(v => v !== value)
      : [...currentList, value];
    const nextExt = { ...(currentParams.ext ?? {}) };
    if (nextList.length > 0) {
      nextExt[fieldKey] = nextList;
    } else {
      delete nextExt[fieldKey];
    }
    applyParams({
      ext: Object.keys(nextExt).length > 0 ? nextExt : undefined,
    });
  };

  const setExtValues = (fieldKey: string, values: string[]) => {
    const nextExt = { ...(currentParams.ext ?? {}) };
    const clean = values.filter(Boolean);
    if (clean.length > 0) {
      nextExt[fieldKey] = clean;
    } else {
      delete nextExt[fieldKey];
    }
    applyParams({
      ext: Object.keys(nextExt).length > 0 ? nextExt : undefined,
    });
  };

  const renderExternalApiFieldControl = (
    fieldKey: string,
    label: string,
    style: ExtFilterStyle,
    options: FacetOption[]
  ) => {
    const selected = currentParams.ext?.[fieldKey] ?? [];
    const inputName = paramName(`${EXT_PARAM_PREFIX}${fieldKey}`);

    if (style === 'search') {
      return (
        <ExtSearchInput
          key={fieldKey}
          name={inputName}
          label={label}
          initial={readExtSearch(selected)}
          inputProps={inputEl}
          labelProps={labelEl}
          onCommit={text => setExtValues(fieldKey, [encodeExtSearch(text)])}
        />
      );
    }

    if (style === 'range') {
      return (
        <ExtRangeInput
          key={fieldKey}
          name={inputName}
          label={label}
          initial={readExtRange(selected)}
          inputProps={inputEl}
          labelProps={labelEl}
          onCommit={(min, max) => setExtValues(fieldKey, [encodeExtRange(min, max)])}
        />
      );
    }

    if (style === 'toggle') {
      const on = selected.includes('true');
      return (
        <label
          key={fieldKey}
          className="inline-flex cursor-pointer items-center gap-2 self-end pb-2 text-sm"
        >
          <input
            type="checkbox"
            name={inputName}
            value="true"
            checked={on}
            onChange={() => setExtValues(fieldKey, on ? [] : ['true'])}
            className="rounded border-slate-300"
          />
          <span {...labelEl}>{label}</span>
        </label>
      );
    }

    if (style === 'radio') {
      const current = selected[0] ?? '';
      const radioOptions = [{ value: '', label: 'All', count: 0 }, ...options];
      return (
        <fieldset key={fieldKey} className="flex flex-col gap-1.5">
          <legend {...el(styled, 'label', 's-muted mb-1 text-xs font-medium')}>
            {label}
          </legend>
          <div className="flex flex-wrap gap-3">
            {radioOptions.map(opt => (
              <label
                key={opt.value || '__all__'}
                className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
              >
                <input
                  type="radio"
                  name={inputName}
                  value={opt.value}
                  checked={current === opt.value}
                  onChange={() => setExtValues(fieldKey, opt.value ? [opt.value] : [])}
                />
                <span>{opt.value ? formatOptionLabel(opt) : opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );
    }

    if (style === 'select') {
      return (
        <label key={fieldKey} className="flex flex-col gap-1 text-xs font-medium">
          <span {...labelEl}>{label}</span>
          <select
            name={inputName}
            value={selected[0] ?? ''}
            onChange={e => {
              const nextVal = e.target.value;
              const nextExt = { ...(currentParams.ext ?? {}) };
              if (nextVal) {
                nextExt[fieldKey] = [nextVal];
              } else {
                delete nextExt[fieldKey];
              }
              applyParams({
                ext: Object.keys(nextExt).length > 0 ? nextExt : undefined,
              });
            }}
            aria-label={label}
            {...inputEl}
          >
            <option value="">All {label.toLowerCase()}</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {formatOptionLabel(opt)}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (style === 'checkboxes') {
      return (
        <fieldset key={fieldKey} className="flex flex-col gap-1.5">
          <legend {...el(styled, 'label', 's-muted mb-1 text-xs font-medium')}>
            {label}
          </legend>
          <div className="flex flex-wrap gap-3">
            {options.map(opt => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    name={inputName}
                    value={opt.value}
                    checked={checked}
                    onChange={() => toggleExtValue(fieldKey, opt.value)}
                    className="rounded border-slate-300"
                  />
                  <span>{formatOptionLabel(opt)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    return (
      <div
        key={fieldKey}
        className="flex flex-col gap-1.5"
        role="group"
        aria-label={label}
      >
        <span {...el(styled, 'label', 's-muted text-xs font-medium')}>
          {label}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {options.map(opt => {
            const active = selected.includes(opt.value);
            const nextList = active
              ? selected.filter(v => v !== opt.value)
              : [...selected, opt.value];
            const nextExt = { ...(currentParams.ext ?? {}) };
            if (nextList.length > 0) {
              nextExt[fieldKey] = nextList;
            } else {
              delete nextExt[fieldKey];
            }
            const chipHref = buildFilterUrl({
              ...currentParams,
              ext: Object.keys(nextExt).length > 0 ? nextExt : undefined,
            });
            return (
              <a
                key={opt.value}
                href={chipHref}
                aria-pressed={active}
                onClick={e => {
                  e.preventDefault();
                  toggleExtValue(fieldKey, opt.value);
                }}
                {...el(
                  styled,
                  active ? 'activeChip' : 'chip',
                  cn(
                    's-radius inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 's-primary-bg border-transparent'
                      : 's-surface s-border hover:opacity-80'
                  )
                )}
              >
                {formatOptionLabel(opt)}
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  const filterControlsContent = (
    <div className="flex flex-col gap-4">
      <div className={fieldGrid}>
        {showKeyword && (
          <label
            className={cn(
              'flex flex-col gap-1 text-xs font-medium',
              !vertical && 'sm:col-span-2'
            )}
          >
            <span {...labelEl}>Search</span>
            <div className="relative flex items-center">
              <Search className="s-muted pointer-events-none absolute start-3 size-4" />
              <input
                type="search"
                name={paramName('q')}
                value={draftKeyword}
                onChange={e => setDraftKeyword(e.target.value)}
                placeholder={keywordPlaceholder}
                aria-label={keywordPlaceholder}
                {...el(
                  styled,
                  'input',
                  's-surface s-border s-radius h-10 w-full border ps-9 pe-3 text-sm'
                )}
              />
            </div>
          </label>
        )}

        {!isExternalApi &&
          showCategories &&
          categoryStyle === 'select' &&
          renderTaxonomyControl(
            'Categories',
            'select',
            categoryOptions,
            selectedCategories,
            'category',
            'categories'
          )}

        {!isExternalApi &&
          showTags &&
          tagStyle === 'select' &&
          renderTaxonomyControl(
            'Tags',
            'select',
            tagOptions,
            selectedTags,
            'tag',
            'tags'
          )}

        {isExternalApi &&
          normalizedApiFilterFields
            .filter(f => COMPACT_EXT_STYLES.has(f.style))
            .map(f =>
              renderExternalApiFieldControl(
                f.key,
                f.label,
                f.style,
                getExtOptions(f.key, f.label)
              )
            )}

        {showSort && (
          <label className="flex flex-col gap-1 text-xs font-medium">
            <span {...labelEl}>Sort by</span>
            <select
              name={paramName('sort')}
              value={
                currentParams.sort
                  ? `${currentParams.sort}:${currentParams.order ?? 'desc'}`
                  : 'publishedAt:desc'
              }
              onChange={e => {
                const [sortField, sortOrder] = e.target.value.split(':');
                applyParams({
                  sort: sortField || undefined,
                  order:
                    sortOrder === 'asc' || sortOrder === 'desc'
                      ? sortOrder
                      : 'desc',
                });
              }}
              aria-label="Sort by"
              {...inputEl}
            >
              <option value="publishedAt:desc">Newest first</option>
              <option value="publishedAt:asc">Oldest first</option>
              <option value="title:asc">Title (A–Z)</option>
              <option value="title:desc">Title (Z–A)</option>
            </select>
          </label>
        )}
      </div>

      {/* Non-select taxonomy controls (checkboxes / chips) */}
      {!isExternalApi &&
        showCategories &&
        categoryStyle !== 'select' &&
        renderTaxonomyControl(
          'Categories',
          categoryStyle,
          categoryOptions,
          selectedCategories,
          'category',
          'categories'
        )}

      {!isExternalApi &&
        showTags &&
        tagStyle !== 'select' &&
        renderTaxonomyControl(
          'Tags',
          tagStyle,
          tagOptions,
          selectedTags,
          'tag',
          'tags'
        )}

      {isExternalApi &&
        normalizedApiFilterFields
          .filter(f => !COMPACT_EXT_STYLES.has(f.style))
          .map(f =>
            renderExternalApiFieldControl(
              f.key,
              f.label,
              f.style,
              getExtOptions(f.key, f.label)
            )
          )}

      {/* Date Range, Number Range & Boolean Toggle (R581 / QRY-11) */}
      {(showDateRange || showNumberRange || showBooleanToggle) && (
        <div className={cn(fieldGrid, 'pt-1')}>
          {showDateRange && (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span {...labelEl}>Published from</span>
                <input
                  type="date"
                  name={paramName('from')}
                  value={currentParams.from ?? ''}
                  onChange={e =>
                    applyParams({ from: e.target.value || undefined })
                  }
                  {...inputEl}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span {...labelEl}>Published to</span>
                <input
                  type="date"
                  name={paramName('to')}
                  value={currentParams.to ?? ''}
                  onChange={e =>
                    applyParams({ to: e.target.value || undefined })
                  }
                  {...inputEl}
                />
              </label>
            </>
          )}

          {showNumberRange && (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span {...labelEl}>Min {numberRangeLabel}</span>
                <input
                  type="number"
                  name={paramName('min')}
                  value={currentParams.min ?? ''}
                  onChange={e =>
                    applyParams({
                      min:
                        e.target.value !== ''
                          ? Number(e.target.value)
                          : undefined,
                    })
                  }
                  placeholder="Min"
                  {...inputEl}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span {...labelEl}>Max {numberRangeLabel}</span>
                <input
                  type="number"
                  name={paramName('max')}
                  value={currentParams.max ?? ''}
                  onChange={e =>
                    applyParams({
                      max:
                        e.target.value !== ''
                          ? Number(e.target.value)
                          : undefined,
                    })
                  }
                  placeholder="Max"
                  {...inputEl}
                />
              </label>
            </>
          )}

          {showBooleanToggle && (
            <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm font-medium">
              <input
                type="checkbox"
                name={paramName('toggle')}
                value="1"
                checked={currentParams.toggle === true}
                onChange={e =>
                  applyParams({
                    toggle: e.target.checked ? true : undefined,
                  })
                }
                className="size-4 rounded border-slate-300"
              />
              <span>{booleanToggleLabel}</span>
            </label>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          {...el(
            styled,
            'button',
            cn(
              's-primary-bg rounded-[var(--site-btn-radius)] inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90',
              vertical && 'w-full'
            )
          )}
        >
          <Filter className="size-3.5" />
          {applyButtonLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        !vertical && 'mb-6',
        isPending && 'opacity-75'
      )}
      data-query-filter={targetLoopId || 'main'}
    >
      {/* Mobile drawer trigger button (R585 / QRY-15) */}
      {mobileDrawer && (
        <div
          className={cn(
            'flex items-center justify-between',
            vertical ? 's-desk-hidden' : 'sm:hidden'
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(prev => !prev)}
            aria-expanded={drawerOpen}
            aria-controls={`filter-drawer-${targetLoopId || 'main'}`}
            {...el(
              styled,
              'drawerToggle',
              's-surface s-border s-radius inline-flex items-center gap-2 border px-3.5 py-2 text-sm font-medium'
            )}
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeChips.length > 0 && (
              <span className="s-primary-bg rounded-full px-1.5 py-0.5 text-xs">
                {activeChips.length}
              </span>
            )}
          </button>
          {showResultCount && (
            <span
              {...el(styled, 'count', 's-muted text-xs')}
              aria-live="polite"
            >
              {totalResults} {totalResults === 1 ? 'result' : 'results'}
            </span>
          )}
        </div>
      )}

      {/* Progressive enhancement GET form (R584 / QRY-14) */}
      <form
        id={`filter-drawer-${targetLoopId || 'main'}`}
        method="GET"
        action={pathname}
        onSubmit={handleFormSubmit}
        role="search"
        aria-label="Filter items"
        {...el(
          styled,
          'panel',
          cn(
            's-surface s-border s-radius border p-4',
            mobileDrawer &&
              !drawerOpen &&
              (vertical ? 'hidden s-desk-block' : 'hidden sm:block')
          )
        )}
      >
        {/* Preserve query params belonging to other QueryLoop namespaces */}
        {Object.entries(preservedHiddenParams).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

        {filterControlsContent}
      </form>

      {/* Result count and Active Filter Chips (R582 / QRY-12, R599 / QRY-29) */}
      {(showResultCount || (showActiveChips && activeChips.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {showResultCount && (
            <p
              {...el(styled, 'count', 's-muted font-medium')}
              aria-live="polite"
              aria-atomic="true"
            >
              {totalResults} {totalResults === 1 ? 'result' : 'results'} found
            </p>
          )}

          {showActiveChips && activeChips.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="region"
              aria-label="Active filters"
            >
              {activeChips.map(chip => {
                const clearHref = buildFilterUrl({
                  ...currentParams,
                  ...chip.clearPatch,
                });
                return (
                  <a
                    key={chip.key}
                    href={clearHref}
                    onClick={e => {
                      e.preventDefault();
                      applyParams(chip.clearPatch, { focusResults: true });
                    }}
                    aria-label={`Remove filter ${chip.label}`}
                    {...el(
                      styled,
                      'chip',
                      's-surface s-border s-radius inline-flex items-center gap-1 border px-2.5 py-1 text-xs font-medium hover:opacity-80'
                    )}
                  >
                    <span>{chip.label}</span>
                    <X className="size-3" />
                  </a>
                );
              })}

              <a
                href={clearAllHref}
                onClick={e => {
                  e.preventDefault();
                  setDraftKeyword('');
                  applyParams(
                    {
                      search: undefined,
                      category: undefined,
                      categories: undefined,
                      tag: undefined,
                      tags: undefined,
                      author: undefined,
                      from: undefined,
                      to: undefined,
                      min: undefined,
                      max: undefined,
                      toggle: undefined,
                    },
                    { focusResults: true }
                  );
                }}
                className="s-primary-text ms-1 font-semibold hover:underline"
              >
                Clear all
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
