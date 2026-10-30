import * as React from 'react';
import { cn } from '../lib/cn';
import { Input } from '../primitives/Input';

export interface LibraryItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  category?: string;
  description?: string;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
}

export interface LibraryPanelProps {
  items: LibraryItem[];
  searchPlaceholder?: string;
  categories?: string[];
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
  className?: string;
}

export function LibraryPanel({
  items,
  searchPlaceholder = 'Search widgets…',
  categories,
  selectedCategory,
  onCategoryChange,
  className,
}: LibraryPanelProps) {
  const [search, setSearch] = React.useState('');

  const filtered = items.filter(item => {
    if (search && !item.label.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCategory && selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    return true;
  });

  const grouped = new Map<string, LibraryItem[]>();
  for (const item of filtered) {
    const cat = item.category ?? 'Other';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  return (
    <div className={cn('flex h-full flex-col gap-2 p-2', className)}>
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label="Search library"
      />
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange?.(cat)}
              className={cn(
                'rounded-[var(--ne-radius-sm)] px-2 py-0.5 text-xs transition-colors',
                selectedCategory === cat
                  ? 'bg-[var(--ne-primary-soft)] text-[var(--ne-primary)]'
                  : 'text-[var(--ne-text-muted)] hover:bg-[var(--ne-bg)] hover:text-[var(--ne-text)]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-y-auto ne-scrollbar">
        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category} className="mb-3">
            <h3 className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--ne-text-muted)]">
              {category}
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  draggable
                  onDragStart={item.onDragStart}
                  onClick={item.onClick}
                  className="flex flex-col items-center gap-1 rounded-[var(--ne-radius-sm)] border border-[var(--ne-border)] bg-[var(--ne-surface)] p-2 text-center transition-colors hover:border-[var(--ne-primary)] hover:bg-[var(--ne-primary-soft)]"
                >
                  {item.icon && <span className="text-[var(--ne-text-muted)]">{item.icon}</span>}
                  <span className="text-xs font-medium text-[var(--ne-text)]">{item.label}</span>
                  {item.description && (
                    <span className="text-[10px] text-[var(--ne-text-muted)]">{item.description}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}