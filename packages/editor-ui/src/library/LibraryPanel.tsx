import { Clock, Search, Star, X } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { LibraryItem, type LibraryItemDef } from './LibraryItem';

export interface LibraryPanelProps {
  items: LibraryItemDef[];
  onSelectItem: (item: LibraryItemDef) => void;
  /** Host-driven pointer drag for every item; see LibraryItem `onPointerDown`. */
  onItemPointerDown?: (
    item: LibraryItemDef,
    event: React.PointerEvent<HTMLDivElement>
  ) => void;
  /** Extra content under an item, such as preset chips. */
  renderItemExtra?: (item: LibraryItemDef) => React.ReactNode;
  /** Tooltip on each item. */
  itemHint?: string;
  /** Favorites filter and stars appear only when this is passed. */
  favorites?: string[];
  onToggleFavorite?: (type: string) => void;
  /** Recent filter appears only when this is passed. */
  recentTypes?: string[];
  searchPlaceholder?: string;
  /** Footer hint; pass null to hide it. */
  footer?: React.ReactNode;
  className?: string;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  items,
  onSelectItem,
  onItemPointerDown,
  renderItemExtra,
  itemHint,
  favorites,
  onToggleFavorite,
  recentTypes,
  searchPlaceholder = 'Search components…',
  footer = 'Click to insert · Drag onto canvas',
  className = '',
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterView, setFilterView] = useState<'all' | 'favorites' | 'recent'>(
    'all'
  );
  const showFavorites = !!onToggleFavorite;
  const showRecent = recentTypes !== undefined;

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const item of items) cats.add(item.category);
    return ['all', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => {
      if (filterView === 'favorites' && !(favorites ?? []).includes(item.type))
        return false;
      if (filterView === 'recent' && !(recentTypes ?? []).includes(item.type))
        return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory)
        return false;
      if (!query) return true;
      return (
        item.label.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query) ?? false) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [items, search, selectedCategory, filterView, favorites, recentTypes]);

  // Showing everything: keep the host's category order as headings.
  const sections = useMemo(() => {
    if (selectedCategory !== 'all' || filterView !== 'all' || search.trim()) {
      return [{ category: null as string | null, items: filteredItems }];
    }
    const byCategory = new Map<string, LibraryItemDef[]>();
    for (const item of filteredItems) {
      const list = byCategory.get(item.category);
      if (list) list.push(item);
      else byCategory.set(item.category, [item]);
    }
    return [...byCategory.entries()].map(([category, list]) => ({
      category,
      items: list,
    }));
  }, [filteredItems, selectedCategory, filterView, search]);

  const chip = (active: boolean) =>
    `flex cursor-pointer items-center gap-1 rounded-[var(--ne-radius-sm)] px-2 py-0.5 text-[11px] transition-colors ${
      active
        ? 'bg-[var(--ne-primary-soft)] font-medium text-[var(--ne-primary)]'
        : 'text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)]'
    }`;

  return (
    <div
      className={`flex h-full select-none flex-col bg-[var(--ne-surface)] ${className}`}
    >
      <div className="space-y-2 border-b border-[var(--ne-border)] p-3">
        <div className="relative flex items-center">
          <Search
            aria-hidden
            className="pointer-events-none absolute start-2 h-3.5 w-3.5 text-[var(--ne-text-subtle)]"
          />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder.replace(/…$/, '')}
            className="h-7 w-full rounded-[var(--ne-radius-md)] border border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] pe-7 ps-7 text-xs text-[var(--ne-text)] shadow-none transition-all placeholder:text-[var(--ne-text-subtle)] focus:border-[var(--ne-primary)] focus:bg-[var(--ne-surface)] focus:shadow-none focus:outline-none focus:ring-0"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setSearch('')}
              className="absolute end-2 cursor-pointer text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {(showFavorites || showRecent) && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilterView('all')}
              className={chip(filterView === 'all')}
            >
              All
            </button>
            {showFavorites && (
              <button
                type="button"
                onClick={() => setFilterView('favorites')}
                className={chip(filterView === 'favorites')}
              >
                <Star className="h-2.5 w-2.5" />
                <span>Favorites</span>
              </button>
            )}
            {showRecent && (
              <button
                type="button"
                onClick={() => setFilterView('recent')}
                className={chip(filterView === 'recent')}
              >
                <Clock className="h-2.5 w-2.5" />
                <span>Recent</span>
              </button>
            )}
          </div>
        )}

        {filterView === 'all' && categories.length > 2 && (
          <div className="ne-scrollbar flex items-center gap-1 overflow-x-auto pb-1 pt-0.5 text-[11px]">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                aria-pressed={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`cursor-pointer whitespace-nowrap rounded-[var(--ne-radius-sm)] px-2 py-0.5 transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[var(--ne-surface-hover)] font-medium text-[var(--ne-text)]'
                    : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ne-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--ne-text-muted)]">
            {search ? `No items matching “${search}”` : 'No items'}
          </div>
        ) : (
          sections.map(section => (
            <section
              key={section.category ?? 'results'}
              aria-label={section.category ?? 'Results'}
            >
              {section.category && (
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--ne-text-subtle)]">
                  {section.category}
                </h3>
              )}
              <div className="space-y-1.5">
                {section.items.map(item => (
                  <LibraryItem
                    key={item.type}
                    item={item}
                    hint={itemHint}
                    onSelect={onSelectItem}
                    onPointerDown={onItemPointerDown}
                    onToggleFavorite={onToggleFavorite}
                    isFavorite={(favorites ?? []).includes(item.type)}
                    extra={renderItemExtra?.(item)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {footer !== null && (
        <div className="border-t border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] p-2 text-center font-mono text-[10px] text-[var(--ne-text-subtle)]">
          {footer}
        </div>
      )}
    </div>
  );
};
