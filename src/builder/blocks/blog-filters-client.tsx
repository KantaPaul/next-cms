'use client';

import { Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { cn } from '@/lib/utils/cn';

type Option = { slug: string; name: string };

export type BlogFiltersProps = {
  showSearch: boolean;
  showCategory: boolean;
  showTag: boolean;
  showSort: boolean;
  categories: Option[];
  tags: Option[];
  active: { q?: string; category?: string; tag?: string; sort?: string };
  editing?: boolean;
};

const fieldClass =
  's-border s-radius h-10 rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-2';
const selectClass = `${fieldClass} pr-8`;

/**
 * A GET form on the current page, so filters work without JavaScript. Selects submit on change;
 * empty values are dropped so URLs stay short. In the builder the form never navigates.
 */
export function BlogFilters(p: BlogFiltersProps) {
  if (!p.showSearch && !p.showCategory && !p.showTag && !p.showSort)
    return null;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (p.editing) {
      event.preventDefault();
      return;
    }

    for (const el of Array.from(event.currentTarget.elements)) {
      if (
        (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) &&
        el.name &&
        !el.value
      )
        el.disabled = true;
    }
  };

  const submitOnChange = (event: React.ChangeEvent<HTMLSelectElement>) =>
    event.currentTarget.form?.requestSubmit();

  return (
    <form
      method="get"
      role="search"
      aria-label="Filter posts"
      onSubmit={onSubmit}
      className={cn(
        'mb-10 flex flex-wrap items-end gap-3',
        p.editing && 'pointer-events-none'
      )}
    >
      {p.showSearch && (
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search posts</span>
          <Search className="s-muted pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <input
            type="search"
            name="q"
            defaultValue={p.active.q ?? ''}
            placeholder="Search posts"
            className={cn(fieldClass, 'w-full pl-9')}
          />
        </label>
      )}
      {p.showCategory && (
        <label className="flex flex-col gap-1">
          <span className="sr-only">Category</span>
          <select
            name="category"
            defaultValue={p.active.category ?? ''}
            onChange={submitOnChange}
            className={selectClass}
          >
            <option value="">All categories</option>
            {p.categories.map(c => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {p.showTag && (
        <label className="flex flex-col gap-1">
          <span className="sr-only">Tag</span>
          <select
            name="tag"
            defaultValue={p.active.tag ?? ''}
            onChange={submitOnChange}
            className={selectClass}
          >
            <option value="">All tags</option>
            {p.tags.map(t => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {p.showSort && (
        <label className="flex flex-col gap-1">
          <span className="sr-only">Sort</span>
          <select
            name="sort"
            defaultValue={p.active.sort ?? ''}
            onChange={submitOnChange}
            className={selectClass}
          >
            <option value="">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
      )}
      {p.showSearch && (
        <button type="submit" className="s-btn s-btn-primary h-10">
          Search
        </button>
      )}
    </form>
  );
}
