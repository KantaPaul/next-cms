import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { PostView } from '../post-template';
import { el, type WithSection } from './element';
import { Section } from './section';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbsProps = WithSection & {
  homeLabel?: string;
  separator?: string;
  showCurrent?: boolean;
  alignment?: 'left' | 'center' | 'right';
  customItems?: BreadcrumbItem[];
  post?: PostView;
  /** The page being rendered, set by the CMS renderer on public pages. */
  page?: { title: string };
};

/** JSON for an inline script: `<` escaped so a title can't close the tag. */
const scriptJson = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c');

export function Breadcrumbs(p: BreadcrumbsProps) {
  const homeLabel = p.homeLabel || 'Home';
  const sep = p.separator ?? '/';
  const showCurrent = p.showCurrent ?? true;
  const align = p.alignment ?? 'left';

  // Build breadcrumb items:
  // If customItems is provided, use that.
  // Otherwise, if post is provided, build Home -> Category -> Post title.
  // Otherwise, default sample breadcrumbs for editor/page.
  let items: BreadcrumbItem[] = [];

  if (p.customItems && p.customItems.length > 0) {
    items = p.customItems;
  } else if (p.post) {
    items.push({ label: homeLabel, href: '/' });
    if (p.post.categories && p.post.categories.length > 0) {
      const cat = p.post.categories[0];
      items.push({
        label: cat.name,
        href: cat.url || (p.post.blogUrl ? `${p.post.blogUrl}?category=${cat.slug}` : undefined),
      });
    } else if (p.post.blogUrl) {
      items.push({ label: 'Blog', href: p.post.blogUrl });
    }
    if (showCurrent) {
      items.push({ label: p.post.title });
    }
  } else if (p.page) {
    items = [
      { label: homeLabel, href: '/' },
      ...(showCurrent ? [{ label: p.page.title }] : []),
    ];
  } else {
    // No page or post context (the editor canvas): a sample trail, never published as data.
    items = [
      { label: homeLabel, href: '/' },
      { label: 'Parent Page', href: '#' },
      ...(showCurrent ? [{ label: 'Current Page' }] : []),
    ];
  }
  const isSample = !p.customItems?.length && !p.post && !p.page;

  // Generate schema.org BreadcrumbList JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href || undefined,
    })),
  };

  const navEl = el(p, 'nav');
  const linkEl = el(p, 'link', 's-muted hover:text-[var(--site-fg)] transition-colors');
  const currentEl = el(p, 'current', 'font-semibold text-[var(--site-fg)]');
  const sepEl = el(p, 'separator', 'mx-2 s-muted select-none');

  return (
    <Section section={p.section} editing={p.editing} id={p.id ?? p.nodeId}>
      {/* Schema.org JSON-LD Structured Data */}
      {!isSample && items.length > 1 && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD with < escaped
          dangerouslySetInnerHTML={{ __html: scriptJson(jsonLd) }}
        />
      )}
      <nav
        aria-label="Breadcrumb"
        className={cn(
          'w-full text-sm',
          align === 'center'
            ? 'flex justify-center'
            : align === 'right'
              ? 'flex justify-end'
              : 'flex justify-start',
          navEl.className
        )}
        style={navEl.style}
      >
        <ol className="flex flex-wrap items-center">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={index} className="inline-flex items-center">
                {index > 0 && (
                  <span className={sepEl.className} style={sepEl.style} aria-hidden="true">
                    {sep === '>' ? (
                      <ChevronRight className="size-3.5 inline" />
                    ) : (
                      sep
                    )}
                  </span>
                )}
                {isLast || !item.href ? (
                  <span
                    className={cn(currentEl.className)}
                    style={currentEl.style}
                    aria-current={isLast ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    className={linkEl.className}
                    style={linkEl.style}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </Section>
  );
}
