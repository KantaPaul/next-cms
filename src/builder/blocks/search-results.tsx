import type {
  SearchCountsByKind,
  SearchDocumentKind,
  SearchResultItem,
} from '@/server/services/search.service';
import { cn } from '@/lib/utils/cn';
import type { ElementStyle } from '../style';
import { el } from './element';
import { Section, SectionHeading, type SectionSettings } from './section';

export interface SearchResultsBlockProps {
  /** Element styles (`elementStyle()` fields), e.g. the section heading. */
  elements?: Record<string, ElementStyle>;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  placeholder?: string;
  showTabs?: boolean;
  showThumbnails?: boolean;
  showTypeBadges?: boolean;
  showSnippets?: boolean;
  pageSize?: number;
  emptyText?: string;
  // Server-loaded search state
  query?: string;
  activeKind?: 'all' | SearchDocumentKind;
  items?: SearchResultItem[];
  total?: number;
  page?: number;
  totalPages?: number;
  countsByKind?: SearchCountsByKind;
  searchActionPath?: string;
  section?: SectionSettings;
  editing?: boolean;
}

const SAMPLE_SEARCH_ITEMS: SearchResultItem[] = [
  {
    kind: 'post',
    title: 'Getting started with the visual builder',
    path: '/blog/getting-started-visual-builder',
    language: 'en',
    snippet:
      'Learn how to compose pages, configure Query Loops, and customize site templates.',
    highlightedSnippet:
      'Learn how to compose pages, configure <mark>Query</mark> Loops, and customize site templates.',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&auto=format&fit=crop&q=80',
    pinned: true,
  },
  {
    kind: 'page',
    title: 'Documentation & Guides',
    path: '/docs',
    language: 'en',
    snippet:
      'Explore comprehensive guides for multi-site publishing, localization, and search.',
    highlightedSnippet:
      'Explore comprehensive guides for multi-site publishing, localization, and <mark>search</mark>.',
    thumbnailUrl: null,
    pinned: false,
  },
];

const KIND_TABS: { id: 'all' | SearchDocumentKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'page', label: 'Pages' },
  { id: 'post', label: 'Posts' },
  { id: 'collection', label: 'Collections' },
  { id: 'video', label: 'Videos' },
];

const KIND_BADGE_LABELS: Record<SearchDocumentKind, string> = {
  page: 'Page',
  post: 'Post',
  collection: 'Collection',
  video: 'Video',
};

function buildSearchHref(
  basePath: string,
  params: {
    q?: string;
    kind?: 'all' | SearchDocumentKind;
    page?: number;
  }
): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set('q', params.q);
  if (params.kind && params.kind !== 'all') sp.set('kind', params.kind);
  if (params.page && params.page > 1) sp.set('page', String(params.page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function SearchResults({
  eyebrow,
  title = 'Search',
  subtitle,
  placeholder = 'Search pages, posts, collections, and videos…',
  showTabs = true,
  showThumbnails = true,
  showTypeBadges = true,
  showSnippets = true,
  emptyText = 'No matching results found.',
  query = '',
  activeKind = 'all',
  items: loadedItems,
  total: loadedTotal,
  page = 1,
  totalPages = 1,
  countsByKind,
  searchActionPath = '/search',
  section,
  elements,
  editing = false,
}: SearchResultsBlockProps) {
  const items =
    loadedItems !== undefined
      ? loadedItems
      : editing
        ? SAMPLE_SEARCH_ITEMS
        : [];
  const total = loadedTotal ?? items.length;
  const counts: SearchCountsByKind = countsByKind ?? {
    all: items.length,
    page: items.filter(i => i.kind === 'page').length,
    post: items.filter(i => i.kind === 'post').length,
    collection: items.filter(i => i.kind === 'collection').length,
    video: items.filter(i => i.kind === 'video').length,
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const styled = { elements };
  const pageLinkEl = el(
    styled,
    'pagination',
    's-border s-surface s-radius rounded border px-3 py-1.5 font-medium'
  );

  return (
    <Section section={section} editing={editing}>
      <SectionHeading
        elements={elements}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {/* Search Form */}
        <form
          action={searchActionPath}
          method="GET"
          role="search"
          aria-label="Site search"
          className="flex gap-2"
        >
          {activeKind !== 'all' && (
            <input type="hidden" name="kind" value={activeKind} />
          )}
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={placeholder}
            aria-label={placeholder}
            {...el(
              styled,
              'input',
              's-surface s-border s-radius h-11 flex-1 border px-4 text-sm'
            )}
          />
          <button
            type="submit"
            {...el(
              styled,
              'button',
              's-primary-bg s-radius h-11 px-6 text-sm font-semibold transition-opacity hover:opacity-90'
            )}
          >
            Search
          </button>
        </form>

        {/* Result Type Tabs (R590 / QRY-20) */}
        {showTabs && (query || editing) && (
          <div
            role="tablist"
            aria-label="Filter results by content type"
            className="s-border flex flex-wrap gap-2 border-b pb-3"
          >
            {KIND_TABS.map(tab => {
              const isSelected = activeKind === tab.id;
              const countForTab = counts[tab.id] ?? 0;
              return (
                <a
                  key={tab.id}
                  role="tab"
                  aria-selected={isSelected}
                  href={buildSearchHref(searchActionPath, {
                    q: query,
                    kind: tab.id,
                    page: 1,
                  })}
                  {...(isSelected
                    ? {
                        className:
                          's-radius inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors s-primary-bg',
                      }
                    : el(
                        styled,
                        'tab',
                        's-radius inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors s-surface s-border border hover:opacity-80'
                      ))}
                >
                  <span>{tab.label}</span>
                  <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                    {countForTab}
                  </span>
                </a>
              );
            })}
          </div>
        )}

        {/* Accessible live announcement (R599 / QRY-29) */}
        <div
          aria-live="polite"
          aria-atomic="true"
          {...el(styled, 'count', 's-muted text-xs font-medium')}
        >
          {query
            ? `Found ${total} ${total === 1 ? 'result' : 'results'} for “${query}”`
            : editing
              ? 'Previewing sample search results'
              : 'Enter a keyword above to search the site.'}
        </div>

        {/* Results List (R591 / QRY-21) */}
        {(query || editing) && items.length === 0 ? (
          <div className="s-surface s-border s-radius border p-12 text-center">
            <p className="s-muted text-base">{emptyText}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map(item => (
              <li
                key={`${item.kind}-${item.path}`}
                {...el(
                  styled,
                  'card',
                  's-surface s-border s-radius flex flex-col gap-4 border p-5 sm:flex-row sm:items-start'
                )}
              >
                {showThumbnails && item.thumbnailUrl && (
                  <a
                    href={item.path}
                    tabIndex={-1}
                    aria-hidden
                    className="s-radius block shrink-0 overflow-hidden sm:w-40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      {...el(
                        styled,
                        'thumbnail',
                        'aspect-video size-full object-cover'
                      )}
                    />
                  </a>
                )}

                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.pinned && (
                      <span
                        {...el(
                          styled,
                          'badge',
                          's-primary-bg rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider'
                        )}
                      >
                        Pinned
                      </span>
                    )}
                    {showTypeBadges && (
                      <span
                        {...el(
                          styled,
                          'badge',
                          's-border rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider'
                        )}
                      >
                        {KIND_BADGE_LABELS[item.kind] ?? item.kind}
                      </span>
                    )}
                    <span {...el(styled, 'path', 's-muted truncate text-xs')}>
                      {item.path}
                    </span>
                  </div>

                  <h2
                    {...el(
                      styled,
                      'title',
                      's-card-title text-lg leading-snug'
                    )}
                  >
                    <a href={item.path} className="hover:underline">
                      {item.title}
                    </a>
                  </h2>

                  {showSnippets &&
                    (item.highlightedSnippet || item.snippet) && (
                      <p
                        {...el(
                          styled,
                          'snippet',
                          's-muted text-sm leading-relaxed [&_mark]:rounded [&_mark]:bg-amber-200/70 [&_mark]:px-1 [&_mark]:font-medium [&_mark]:text-current'
                        )}
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML-escaped snippet with <mark> tags from highlightTextSnippet
                        dangerouslySetInnerHTML={{
                          __html: item.highlightedSnippet || item.snippet,
                        }}
                      />
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination (R591 / QRY-21) */}
        {totalPages > 1 && (
          <nav
            aria-label="Search results pagination"
            className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm"
          >
            {page > 1 && (
              <a
                href={buildSearchHref(searchActionPath, {
                  q: query,
                  kind: activeKind,
                  page: page - 1,
                })}
                rel="prev"
                {...pageLinkEl}
              >
                Previous
              </a>
            )}
            {pages.map(n => (
              <a
                key={n}
                href={buildSearchHref(searchActionPath, {
                  q: query,
                  kind: activeKind,
                  page: n,
                })}
                aria-current={n === page ? 'page' : undefined}
                {...(n === page
                  ? {
                      className:
                        's-radius min-w-9 rounded px-3 py-1.5 text-center font-medium s-primary-bg',
                    }
                  : el(
                      styled,
                      'pagination',
                      's-radius min-w-9 rounded px-3 py-1.5 text-center font-medium s-surface s-border border hover:opacity-80'
                    ))}
              >
                {n}
              </a>
            ))}
            {page < totalPages && (
              <a
                href={buildSearchHref(searchActionPath, {
                  q: query,
                  kind: activeKind,
                  page: page + 1,
                })}
                rel="next"
                {...pageLinkEl}
              >
                Next
              </a>
            )}
          </nav>
        )}
      </div>
    </Section>
  );
}
