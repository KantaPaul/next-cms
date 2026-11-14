'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function BeforeAfterClient({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  aspectRatio = '16/9',
}: {
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  aspectRatio?: string;
}) {
  const [percent, setPercent] = useState(50);

  if (!beforeImage && !afterImage) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Select before and after images to compare.
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border bg-muted select-none"
      style={{ aspectRatio }}
    >
      {afterImage && (
        <img
          src={afterImage}
          alt={afterLabel}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {beforeImage && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {beforeLabel && (
        <span className="pointer-events-none absolute top-3 start-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
          {beforeLabel}
        </span>
      )}
      {afterLabel && (
        <span className="pointer-events-none absolute top-3 end-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
          {afterLabel}
        </span>
      )}

      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
        style={{ left: `${percent}%` }}
      >
        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-white px-1.5 py-1 text-[10px] font-bold text-slate-900 shadow">
          ↔
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        aria-label="Comparison slider"
        onChange={(e) => setPercent(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}

export function ReadingProgressClient({
  color = 'var(--primary, #3B3FD8)',
  height = 3,
}: {
  color?: string;
  height?: number;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      if (max <= 0) {
        setProgress(0);
        return;
      }
      setProgress(Math.min(100, Math.max(0, (window.scrollY / max) * 100)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 inset-x-0 z-50 pointer-events-none bg-transparent"
      style={{ height }}
    >
      <div
        className="h-full transition-[width] duration-75"
        style={{ width: `${progress}%`, backgroundColor: color }}
      />
    </div>
  );
}

export type DocsTreeItem = {
  id: string;
  title: string;
  href: string;
  parentId?: string | null;
  menuOrder?: number;
  children?: DocsTreeItem[];
};

export function DocsSidebarClient({
  items = [],
  currentHref,
  title = 'Documentation',
}: {
  items?: DocsTreeItem[];
  currentHref?: string;
  title?: string;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <aside className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pe-4 text-sm">
      {title && (
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
      )}
      <nav aria-label={title} className="space-y-1">
        {items.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isOpen = !collapsed[item.id];
          const active = currentHref === item.href;
          return (
            <div key={item.id}>
              <div className="flex items-center gap-1">
                {hasChildren && (
                  <button
                    type="button"
                    aria-label="Toggle section"
                    onClick={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
                    )}
                  </button>
                )}
                <a
                  href={item.href}
                  className={cn(
                    'block flex-1 rounded-md px-2.5 py-1.5 transition-colors',
                    active
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.title}
                </a>
              </div>
              {hasChildren && isOpen && (
                <div className="ms-4 mt-1 space-y-1 border-s ps-2">
                  {item.children!.map((child) => (
                    <a
                      key={child.id}
                      href={child.href}
                      className={cn(
                        'block rounded-md px-2.5 py-1 text-[13px] transition-colors',
                        currentHref === child.href
                          ? 'bg-primary/10 font-medium text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {child.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function DocSearchClient({
  placeholder = 'Search docs...',
  locale = 'en',
  siteId,
  staticEntries = [],
}: {
  placeholder?: string;
  locale?: string;
  siteId?: string;
  staticEntries?: Array<{ title: string; href: string; excerpt?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ title: string; href: string; excerpt?: string }>
  >([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults(staticEntries.slice(0, 8));
      return;
    }

    if (staticEntries.length > 0) {
      const lower = q.toLowerCase();
      setResults(
        staticEntries
          .filter(
            (e) =>
              e.title.toLowerCase().includes(lower) ||
              (e.excerpt ?? '').toLowerCase().includes(lower)
          )
          .slice(0, 10)
      );
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ q, locale, type: 'docs' });
    if (siteId) params.set('siteId', siteId);

    fetch(`/api/v1/search?${params.toString()}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => {
        const items = Array.isArray(data.results) ? data.results : [];
        setResults(
          items.map((item: { title?: string; url?: string; slug?: string; excerpt?: string }) => ({
            title: item.title || item.slug || 'Untitled',
            href: item.url || `/${item.slug || ''}`,
            excerpt: item.excerpt,
          }))
        );
      })
      .catch(() => {});

    return () => controller.abort();
  }, [open, query, locale, siteId, staticEntries]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-start">{placeholder}</span>
        <kbd dir="ltr" className="rounded border bg-muted px-1.5 py-0.5 text-[11px] font-mono">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-3 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No matching documentation pages.
                </div>
              ) : (
                results.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2 hover:bg-muted"
                  >
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.excerpt && (
                      <div className="line-clamp-1 text-xs text-muted-foreground">
                        {item.excerpt}
                      </div>
                    )}
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export type PortfolioProjectItem = {
  id: string;
  title: string;
  href: string;
  image?: string;
  discipline?: string;
  year?: string;
};

export function PortfolioGridClient({
  projects = [],
  columns = 3,
}: {
  projects?: PortfolioProjectItem[];
  columns?: number;
}) {
  const disciplines = useMemo(() => {
    const set = new Set<string>();
    for (const p of projects) {
      if (p.discipline) set.add(p.discipline);
    }
    return ['All', ...Array.from(set)];
  }, [projects]);

  const [active, setActive] = useState('All');
  const filtered =
    active === 'All'
      ? projects
      : projects.filter((p) => p.discipline === active);

  const colsClass =
    columns === 2
      ? 'md:grid-cols-2'
      : columns === 4
        ? 'md:grid-cols-4'
        : 'md:grid-cols-3';

  return (
    <div className="space-y-6">
      {disciplines.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {disciplines.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setActive(d)}
              className={cn(
                'rounded-full border px-3.5 py-1 text-xs font-medium transition-colors',
                active === d
                  ? 'border-foreground bg-foreground text-background'
                  : 'hover:bg-muted'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <div className={cn('grid grid-cols-1 gap-6', colsClass)}>
        {filtered.map((item) => (
          <a
            key={item.id}
            href={item.href}
            className="group relative overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-lg"
          >
            {item.image && (
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{item.title}</h3>
                {item.year && (
                  <span dir="ltr" className="text-xs text-muted-foreground">
                    {item.year}
                  </span>
                )}
              </div>
              {item.discipline && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.discipline}
                </p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
