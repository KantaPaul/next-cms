import React, { useState, useMemo } from 'react';
import { Search, Star, Clock, Layers, X } from 'lucide-react';
import { LibraryItem, LibraryItemDef } from './LibraryItem';

export interface LibraryPanelProps {
  items: LibraryItemDef[];
  onSelectItem: (item: LibraryItemDef) => void;
  favorites?: string[];
  onToggleFavorite?: (type: string) => void;
  recentTypes?: string[];
  className?: string;
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({
  items,
  onSelectItem,
  favorites = [],
  onToggleFavorite,
  recentTypes = [],
  className = '',
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterView, setFilterView] = useState<'all' | 'favorites' | 'recent'>('all');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    items.forEach((item) => cats.add(item.category));
    return ['all', ...Array.from(cats)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // View filter
      if (filterView === 'favorites' && !favorites.includes(item.type)) return false;
      if (filterView === 'recent' && !recentTypes.includes(item.type)) return false;

      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // Text search
      if (search) {
        const query = search.toLowerCase();
        const matchLabel = item.label.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query) ?? false;
        const matchCat = item.category.toLowerCase().includes(query);
        return matchLabel || matchDesc || matchCat;
      }
      return true;
    });
  }, [items, search, selectedCategory, filterView, favorites, recentTypes]);

  return (
    <div className={`flex flex-col h-full bg-[var(--ne-surface)] select-none ${className}`}>
      {/* Header Search & Filter */}
      <div className="p-3 border-b border-[var(--ne-border)] space-y-2">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2 text-[var(--ne-text-subtle)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components (or / on canvas)..."
            className="w-full h-7 pl-7 pr-7 text-xs bg-[var(--ne-surface-subtle)] border border-[var(--ne-border)] rounded-[var(--ne-radius-md)] text-[var(--ne-text)] placeholder-[var(--ne-text-subtle)] focus:outline-none focus:border-[var(--ne-primary)] focus:bg-[var(--ne-surface)] transition-all font-sans"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 text-[var(--ne-text-muted)] hover:text-[var(--ne-text)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View toggle chips */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterView('all')}
            className={`px-2 py-0.5 text-[11px] rounded-[var(--ne-radius-sm)] transition-colors cursor-pointer ${
              filterView === 'all'
                ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] font-medium'
                : 'text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)]'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterView('favorites')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-[var(--ne-radius-sm)] transition-colors cursor-pointer ${
              filterView === 'favorites'
                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 font-medium'
                : 'text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)]'
            }`}
          >
            <Star className="w-2.5 h-2.5" />
            <span>Favorites</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterView('recent')}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-[var(--ne-radius-sm)] transition-colors cursor-pointer ${
              filterView === 'recent'
                ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)] font-medium'
                : 'text-[var(--ne-text-muted)] hover:bg-[var(--ne-surface-hover)]'
            }`}
          >
            <Clock className="w-2.5 h-2.5" />
            <span>Recent</span>
          </button>
        </div>

        {/* Category Pills */}
        {filterView === 'all' && (
          <div className="flex items-center gap-1 overflow-x-auto ne-scrollbar pb-1 pt-0.5 text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded-[var(--ne-radius-sm)] whitespace-nowrap capitalize transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[var(--ne-surface-hover)] text-[var(--ne-text)] font-medium'
                    : 'text-[var(--ne-text-muted)] hover:text-[var(--ne-text)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 ne-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-xs text-[var(--ne-text-muted)]">
            No items matching "{search}"
          </div>
        ) : (
          filteredItems.map((item) => (
            <LibraryItem
              key={item.type}
              item={item}
              onSelect={onSelectItem}
              onToggleFavorite={onToggleFavorite}
              isFavorite={favorites.includes(item.type)}
            />
          ))
        )}
      </div>

      <div className="p-2 border-t border-[var(--ne-border)] bg-[var(--ne-surface-subtle)] text-[10px] text-[var(--ne-text-subtle)] text-center font-mono">
        Click to insert · Drag onto canvas
      </div>
    </div>
  );
};
