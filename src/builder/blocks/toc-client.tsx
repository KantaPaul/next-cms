'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, List } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { el, type WithSection } from './element';
import { Section } from './section';

export type TocItem = {
  id: string;
  text: string;
  level: 'h2' | 'h3' | 'h4';
};

export type TableOfContentsProps = WithSection & {
  title?: string;
  levels?: ('h2' | 'h3' | 'h4')[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  marker?: 'numbers' | 'bullets' | 'none';
  hierarchical?: boolean;
};

export function TableOfContents(p: TableOfContentsProps) {
  const title = p.title ?? 'Table of Contents';
  const levels = p.levels ?? ['h2', 'h3'];
  const collapsible = p.collapsible ?? true;
  const marker = p.marker ?? 'numbers';
  const hierarchical = p.hierarchical ?? true;

  const [collapsed, setCollapsed] = useState(p.defaultCollapsed ?? false);
  const [headings, setHeadings] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mainEl = document.querySelector('main') || document.body;
    const selector = levels.join(', ');
    const elements = Array.from(mainEl.querySelectorAll<HTMLHeadingElement>(selector));

    const items: TocItem[] = [];
    const usedSlugs = new Set<string>();

    elements.forEach((heading, idx) => {
      let id = heading.id;
      if (!id) {
        const text = heading.textContent || `section-${idx + 1}`;
        let slug = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        if (!slug || usedSlugs.has(slug)) {
          slug = `${slug || 'heading'}-${idx + 1}`;
        }
        id = slug;
        heading.id = id;
      }
      usedSlugs.add(id);

      items.push({
        id,
        text: heading.textContent || '',
        level: heading.tagName.toLowerCase() as 'h2' | 'h3' | 'h4',
      });
    });

    setHeadings(items);

    if (items.length > 0 && !activeId) {
      setActiveId(items[0]?.id || '');
    }

    // Scroll spy using IntersectionObserver
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: '0px 0px -70% 0px',
        threshold: 0,
      }
    );

    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [levels, activeId]);

  const boxEl = el(p, 'box', 'w-full max-w-md rounded-2xl border border-steel-200 bg-white p-5 shadow-sm dark:border-dark-300 dark:bg-dark-100');
  const titleEl = el(p, 'title', 'text-base font-bold tracking-tight text-foreground flex items-center gap-2');
  const linkEl = el(p, 'link');

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      <nav aria-label={title} className={boxEl.className} style={boxEl.style}>
        <div className="flex items-center justify-between">
          <div className={titleEl.className} style={titleEl.style}>
            <List className="size-4.5 s-primary-text" />
            <span>{title}</span>
          </div>
          {collapsible && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded text-steel-400 hover:text-foreground hover:bg-steel-50 dark:hover:bg-dark-200"
              aria-expanded={!collapsed}
              aria-label="Toggle Table of Contents"
            >
              {collapsed ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </button>
          )}
        </div>

        {!collapsed && (
          <ul className="mt-4 space-y-1.5 text-sm border-t border-steel-100 pt-3 dark:border-dark-300">
            {headings.length === 0 ? (
              <li className="text-xs text-steel-400 italic py-2">
                {p.editing
                  ? 'Headings (h2-h4) in page content will appear here.'
                  : 'No sections found.'}
              </li>
            ) : (
              headings.map((item, idx) => {
                const isActive = activeId === item.id;
                const indentClass =
                  hierarchical && item.level === 'h3'
                    ? 'pl-4 text-xs'
                    : hierarchical && item.level === 'h4'
                      ? 'pl-8 text-xs'
                      : '';

                return (
                  <li key={item.id} className={cn('transition-colors', indentClass)}>
                    <a
                      href={`#${item.id}`}
                      onClick={e => scrollToSection(e, item.id)}
                      className={cn(
                        'flex items-center gap-2 py-1 transition-colors rounded px-2',
                        isActive
                          ? 's-primary-text font-semibold bg-primary/5 dark:bg-primary/10'
                          : 'text-steel-600 hover:text-foreground dark:text-steel-400 dark:hover:text-foreground',
                        linkEl.className
                      )}
                      style={linkEl.style}
                    >
                      {marker === 'numbers' && (
                        <span className="text-[11px] font-mono opacity-60">
                          {idx + 1}.
                        </span>
                      )}
                      {marker === 'bullets' && (
                        <span className="size-1.5 rounded-full bg-current opacity-60 shrink-0" />
                      )}
                      <span className="truncate">{item.text}</span>
                    </a>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </nav>
    </Section>
  );
}
