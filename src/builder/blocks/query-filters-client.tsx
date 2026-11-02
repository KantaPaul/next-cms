'use client';

import {
  encodeNamespacedParams,
  type FacetOption,
  formatNamespacedParam,
  type ListingFacets,
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
import { cn } from '@/lib/utils/cn';

export type TaxonomyControlStyle = 'select' | 'checkboxes' | 'chips';

export interface QueryFilterClientProps {
  targetLoopId?: string;
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
  // Server-loaded state
  activeParams?: ParsedListingParams;
  facets?: ListingFacets;
  totalResults?: number;
  preservedHiddenParams?: Record<string, string>;
  editing?: boolean;
}

export function QueryFilterClient({
  targetLoopId = '',
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
  activeParams: serverParams,
  facets,
  totalResults = 0,
  preservedHiddenParams = {},
  editing = false,
}: QueryFilterClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
    () =>
      currentParams.tags ?? (currentParams.tag ? [currentParams.tag] : []),
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
    return chips;
  }, [
    booleanToggleLabel,
    categoryOptions,
    currentParams.from,
    currentParams.max,
    currentParams.min,
    currentParams.search,
    currentParams.to,
    currentParams.toggle,
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
          <span className="s-muted">{label}</span>
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
            className="s-surface s-border s-radius h-10 border px-3 text-sm"
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
          <legend className="s-muted mb-1 text-xs font-medium">{label}</legend>
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
        <span className="s-muted text-xs font-medium">{label}</span>
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
                className={cn(
                  's-radius inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 's-primary-bg border-transparent'
                    : 's-surface s-border hover:opacity-80'
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {showKeyword && (
          <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
            <span className="s-muted">Search</span>
            <div className="relative flex items-center">
              <Search className="s-muted pointer-events-none absolute left-3 size-4" />
              <input
                type="search"
                name={paramName('q')}
                value={draftKeyword}
                onChange={e => setDraftKeyword(e.target.value)}
                placeholder={keywordPlaceholder}
                aria-label={keywordPlaceholder}
                className="s-surface s-border s-radius h-10 w-full border pl-9 pr-3 text-sm"
              />
            </div>
          </label>
        )}

        {showCategories &&
          categoryStyle === 'select' &&
          renderTaxonomyControl(
            'Categories',
            'select',
            categoryOptions,
            selectedCategories,
            'category',
            'categories'
          )}

        {showTags &&
          tagStyle === 'select' &&
          renderTaxonomyControl(
            'Tags',
            'select',
            tagOptions,
            selectedTags,
            'tag',
            'tags'
          )}

        {showSort && (
          <label className="flex flex-col gap-1 text-xs font-medium">
            <span className="s-muted">Sort by</span>
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
              className="s-surface s-border s-radius h-10 border px-3 text-sm"
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
      {showCategories &&
        categoryStyle !== 'select' &&
        renderTaxonomyControl(
          'Categories',
          categoryStyle,
          categoryOptions,
          selectedCategories,
          'category',
          'categories'
        )}

      {showTags &&
        tagStyle !== 'select' &&
        renderTaxonomyControl(
          'Tags',
          tagStyle,
          tagOptions,
          selectedTags,
          'tag',
          'tags'
        )}

      {/* Date Range, Number Range & Boolean Toggle (R581 / QRY-11) */}
      {(showDateRange || showNumberRange || showBooleanToggle) && (
        <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-4">
          {showDateRange && (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span className="s-muted">Published from</span>
                <input
                  type="date"
                  name={paramName('from')}
                  value={currentParams.from ?? ''}
                  onChange={e =>
                    applyParams({ from: e.target.value || undefined })
                  }
                  className="s-surface s-border s-radius h-10 border px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span className="s-muted">Published to</span>
                <input
                  type="date"
                  name={paramName('to')}
                  value={currentParams.to ?? ''}
                  onChange={e =>
                    applyParams({ to: e.target.value || undefined })
                  }
                  className="s-surface s-border s-radius h-10 border px-3 text-sm"
                />
              </label>
            </>
          )}

          {showNumberRange && (
            <>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span className="s-muted">Min {numberRangeLabel}</span>
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
                  className="s-surface s-border s-radius h-10 border px-3 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                <span className="s-muted">Max {numberRangeLabel}</span>
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
                  className="s-surface s-border s-radius h-10 border px-3 text-sm"
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
          className="s-primary-bg s-radius inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
        >
          <Filter className="size-3.5" />
          {applyButtonLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={cn('mb-6 flex flex-col gap-3', isPending && 'opacity-75')}
      data-query-filter={targetLoopId || 'main'}
    >
      {/* Mobile drawer trigger button (R585 / QRY-15) */}
      {mobileDrawer && (
        <div className="flex items-center justify-between sm:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(prev => !prev)}
            aria-expanded={drawerOpen}
            aria-controls={`filter-drawer-${targetLoopId || 'main'}`}
            className="s-surface s-border s-radius inline-flex items-center gap-2 border px-3.5 py-2 text-sm font-medium"
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
            <span className="s-muted text-xs" aria-live="polite">
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
        className={cn(
          's-surface s-border s-radius border p-4',
          mobileDrawer && !drawerOpen && 'hidden sm:block'
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
              className="s-muted font-medium"
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
                    className="s-surface s-border s-radius inline-flex items-center gap-1 border px-2.5 py-1 text-xs font-medium hover:opacity-80"
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
                className="s-primary-text ml-1 font-semibold hover:underline"
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
