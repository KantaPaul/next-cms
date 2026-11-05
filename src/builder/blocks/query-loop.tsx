import {
  type BuilderDocument,
  type BuilderNode,
  formatNamespacedParam,
  type ListingFacets,
  type ListingSource,
  type NodeId,
  type NormalizedListingItem,
  type ParsedListingParams,
  type SlotRender,
} from '@nextcms/builder-core';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  LoopItemProvider,
  QueryLoopCarousel,
  QueryLoopPagination,
} from './query-loop-client';
import { formatLoopDate, SAMPLE_LOOP_ITEMS } from './loop-shared';
import {
  MotionItem,
  Section,
  SectionHeading,
  type SectionSettings,
} from './section';

// ---------------------------------------------------------------------------
// Sample Items for Editor Canvas (R575 / QRY-05)
// ---------------------------------------------------------------------------

export { SAMPLE_LOOP_ITEMS };

// ---------------------------------------------------------------------------
// Dynamic Context & JSON-LD Helpers (R575, R597)
// ---------------------------------------------------------------------------

/** Converts a NormalizedListingItem into a flat + nested record for `{ $dynamic: 'loopItem' }`. */
export function toLoopItemContext(
  item: NormalizedListingItem
): Record<string, unknown> {
  const categories = (item.terms ?? []).filter(t => t.taxonomy === 'category');
  const tags = (item.terms ?? []).filter(t => t.taxonomy === 'tag');
  return {
    ...(item.raw ?? {}),
    id: item.id,
    title: item.title,
    slug: item.slug,
    url: item.url,
    excerpt: item.excerpt ?? '',
    image: item.image ?? '',
    publishedAt: item.publishedAt ?? '',
    authorName: item.author?.name ?? '',
    authorImage: item.author?.image ?? '',
    category: categories.map(c => c.name).join(' · '),
    tags: tags.map(t => t.name).join(', '),
    terms: item.terms ?? [],
    source: item.source,
    raw: item.raw ?? {},
  };
}

/** Builds Schema.org ItemList JSON-LD containing only the currently visible items (R597 / QRY-27). */
export function buildItemListJsonLd(
  items: NormalizedListingItem[],
  listTitle?: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(listTitle ? { name: listTitle } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: item.url,
      name: item.title,
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}

// ---------------------------------------------------------------------------
// Loading Skeleton (R578 / QRY-08)
// ---------------------------------------------------------------------------

export function QueryLoopSkeleton({
  layout = 'grid',
  count = 6,
  columnsDesktop = 3,
}: {
  layout?: 'grid' | 'list' | 'masonry' | 'carousel' | 'table';
  count?: number;
  columnsDesktop?: number;
}) {
  const items = Array.from({ length: count }, (_, i) => i);
  if (layout === 'table') {
    return (
      <div
        role="status"
        aria-label="Loading items"
        className="s-border s-surface s-radius animate-pulse overflow-hidden border"
      >
        <div className="s-border border-b p-4">
          <div className="h-4 w-1/3 rounded bg-current/10" />
        </div>
        {items.map(i => (
          <div key={i} className="s-border flex items-center gap-4 border-b p-4 last:border-b-0">
            <div className="h-4 w-2/5 rounded bg-current/10" />
            <div className="h-4 w-1/4 rounded bg-current/10" />
            <div className="h-4 w-1/5 rounded bg-current/10" />
          </div>
        ))}
      </div>
    );
  }

  const colClass =
    layout === 'list'
      ? 'grid-cols-1'
      : columnsDesktop === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : columnsDesktop === 4
          ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div
      role="status"
      aria-label="Loading items"
      className={cn('grid animate-pulse gap-6', colClass)}
    >
      {items.map(i => (
        <div
          key={i}
          className="s-surface s-border s-radius flex flex-col overflow-hidden border"
        >
          <div className="aspect-video w-full bg-current/10" />
          <div className="flex flex-col gap-3 p-5">
            <div className="h-3 w-20 rounded bg-current/10" />
            <div className="h-5 w-4/5 rounded bg-current/10" />
            <div className="h-4 w-full rounded bg-current/10" />
            <div className="h-3 w-1/3 rounded bg-current/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export { LoopItemField, type LoopItemFieldProps } from './loop-item-field';

// ---------------------------------------------------------------------------
// Default Item Card & Table Row (R575, R576)
// ---------------------------------------------------------------------------

interface DefaultItemCardProps {
  item: NormalizedListingItem;
  layout: 'grid' | 'list' | 'masonry' | 'carousel' | 'table';
  showImage?: boolean;
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
  showTerms?: boolean;
  language?: string;
}

function DefaultItemCard({
  item,
  layout,
  showImage = true,
  showExcerpt = true,
  showAuthor = true,
  showDate = true,
  showTerms = true,
  language = 'en',
}: DefaultItemCardProps) {
  const date = showDate ? formatLoopDate(item.publishedAt, language) : null;
  const author = showAuthor ? item.author?.name : null;
  const categories = (item.terms ?? []).filter(t => t.taxonomy === 'category');
  const hasImg = showImage && Boolean(item.image);

  return (
    <MotionItem>
      <article
        className={cn(
          's-surface s-border s-radius group flex h-full overflow-hidden border',
          layout === 'list' ? 'flex-col sm:flex-row' : 'flex-col'
        )}
      >
        {hasImg && (
          <a
            href={item.url}
            tabIndex={-1}
            aria-hidden
            className={cn(
              'block shrink-0 overflow-hidden',
              layout === 'list' && 'sm:w-64'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image ?? undefined}
              alt=""
              loading="lazy"
              className="aspect-video size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </a>
        )}
        <div className="flex flex-1 flex-col gap-3 p-5">
          {showTerms && categories.length > 0 && (
            <p className="s-primary-text text-xs font-semibold uppercase tracking-wider">
              {categories.map(c => c.name).join(' · ')}
            </p>
          )}
          <h3 className="text-lg font-bold leading-snug">
            <a href={item.url} className="hover:underline">
              {item.title}
            </a>
          </h3>
          {showExcerpt && item.excerpt && (
            <p className="s-muted line-clamp-3 text-sm leading-relaxed">
              {item.excerpt}
            </p>
          )}
          {(date || author) && (
            <p className="s-muted mt-auto text-xs">
              {author}
              {author && date && ' · '}
              {date && (
                <time dateTime={item.publishedAt ?? undefined}>{date}</time>
              )}
            </p>
          )}
        </div>
      </article>
    </MotionItem>
  );
}

// ---------------------------------------------------------------------------
// QueryLoop Block Component (R575–R579, R597, R599)
// ---------------------------------------------------------------------------

export type QueryLoopLayout =
  | 'grid'
  | 'list'
  | 'masonry'
  | 'carousel'
  | 'table';

export type QueryLoopPaginationStyle =
  | 'numbered'
  | 'load-more'
  | 'infinite-scroll'
  | 'none';

export type QueryLoopGap = 'sm' | 'md' | 'lg' | 'xl';

export interface QueryLoopProps {
  loopId?: string;
  source?: ListingSource;
  collectionId?: string;
  playlistId?: string;
  lockedCategory?: string;
  lockedTag?: string;
  lockedAuthorId?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  offset?: number;
  excludeCurrent?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  layout?: QueryLoopLayout;
  columnsDesktop?: number;
  columnsTablet?: number;
  columnsMobile?: number;
  gap?: QueryLoopGap;
  pagination?: QueryLoopPaginationStyle;
  loadMoreLabel?: string;
  showImage?: boolean;
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
  showTerms?: boolean;
  emptyText?: string;
  isLoading?: boolean;
  // Slots
  card?: SlotRender;
  emptyState?: SlotRender;
  hasCustomCard?: boolean;
  hasCustomEmptyState?: boolean;
  /** Class for the wrapper around each custom card (Loop Grid drops the default chrome). */
  cardClassName?: string;
  // Server-loaded data
  items?: NormalizedListingItem[];
  total?: number;
  page?: number;
  totalPages?: number;
  facets?: ListingFacets;
  activeParams?: ParsedListingParams;
  pageHrefs?: Record<number, string>;
  clearFiltersHref?: string;
  language?: string;
  section?: SectionSettings;
  editing?: boolean;
}

const GAP_CLASSES: Record<QueryLoopGap, string> = {
  sm: 'gap-3',
  md: 'gap-6',
  lg: 'gap-8',
  xl: 'gap-10',
};

const MASONRY_GAP_CLASSES: Record<QueryLoopGap, string> = {
  sm: 'gap-3 space-y-3',
  md: 'gap-6 space-y-6',
  lg: 'gap-8 space-y-8',
  xl: 'gap-10 space-y-10',
};

function resolveGridColumnsClass(
  desktop = 3,
  tablet = 2,
  mobile = 1
): string {
  const m = mobile === 2 ? 'grid-cols-2' : 'grid-cols-1';
  const t =
    tablet === 1
      ? 'md:grid-cols-1'
      : tablet === 3
        ? 'md:grid-cols-3'
        : 'md:grid-cols-2';
  const d =
    desktop === 1
      ? 'lg:grid-cols-1'
      : desktop === 2
        ? 'lg:grid-cols-2'
        : desktop === 4
          ? 'lg:grid-cols-4'
          : 'lg:grid-cols-3';
  return `${m} ${t} ${d}`;
}

function resolveMasonryColumnsClass(
  desktop = 3,
  tablet = 2,
  mobile = 1
): string {
  const m = mobile === 2 ? 'columns-2' : 'columns-1';
  const t =
    tablet === 1
      ? 'md:columns-1'
      : tablet === 3
        ? 'md:columns-3'
        : 'md:columns-2';
  const d =
    desktop === 1
      ? 'lg:columns-1'
      : desktop === 2
        ? 'lg:columns-2'
        : desktop === 4
          ? 'lg:columns-4'
          : 'lg:columns-3';
  return `${m} ${t} ${d}`;
}

export function QueryLoop({
  loopId = '',
  eyebrow,
  title,
  subtitle,
  layout = 'grid',
  columnsDesktop = 3,
  columnsTablet = 2,
  columnsMobile = 1,
  gap = 'md',
  pagination = 'numbered',
  loadMoreLabel = 'Load more',
  showImage = true,
  showExcerpt = true,
  showAuthor = true,
  showDate = true,
  showTerms = true,
  emptyText = 'No matching items found.',
  isLoading = false,
  card,
  emptyState,
  hasCustomCard = false,
  hasCustomEmptyState = false,
  cardClassName = 's-surface s-border s-radius h-full overflow-hidden border p-4',
  items: loadedItems,
  total: loadedTotal,
  page = 1,
  totalPages = 1,
  activeParams,
  pageHrefs = {},
  clearFiltersHref = '?',
  language = 'en',
  section,
  editing,
}: QueryLoopProps) {
  const items =
    loadedItems !== undefined
      ? loadedItems
      : editing
        ? SAMPLE_LOOP_ITEMS
        : [];
  const total = loadedTotal ?? items.length;
  const regionId = `query-loop-${loopId || 'main'}`;
  const pageParamKey = formatNamespacedParam('page', loopId);
  const gapClass = GAP_CLASSES[gap] ?? GAP_CLASSES.md;

  const hasActiveFilter = Boolean(
    activeParams?.search ||
      activeParams?.category ||
      activeParams?.categories?.length ||
      activeParams?.tag ||
      activeParams?.tags?.length ||
      activeParams?.author ||
      activeParams?.from ||
      activeParams?.to ||
      activeParams?.min !== undefined ||
      activeParams?.max !== undefined ||
      activeParams?.toggle !== undefined
  );

  // Render an item using either the custom `card` slot or the default card
  const renderCardForItem = (
    item: NormalizedListingItem,
    index: number
  ): ReactNode => {
    const loopItemData = toLoopItemContext(item);
    if (typeof card === 'function' && hasCustomCard) {
      return (
        <LoopItemProvider key={item.id} item={item}>
          <article className={cardClassName}>
            {card({
              itemContext: {
                loopItem: loopItemData,
                custom: item.raw ?? {},
              },
              itemIndex: index,
            })}
          </article>
        </LoopItemProvider>
      );
    }

    return (
      <LoopItemProvider key={item.id} item={item}>
        <DefaultItemCard
          item={item}
          layout={layout}
          showImage={showImage}
          showExcerpt={showExcerpt}
          showAuthor={showAuthor}
          showDate={showDate}
          showTerms={showTerms}
          language={language}
        />
      </LoopItemProvider>
    );
  };

  // Structured data JSON-LD for visible items (R597 / QRY-27)
  const jsonLd =
    !editing && items.length > 0
      ? buildItemListJsonLd(items, title)
      : null;

  return (
    <Section section={section} editing={editing}>
      <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />

      {jsonLd && (
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: serialized JSON-LD object
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Accessible live region for filter & pagination updates (R599 / QRY-29) */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        data-query-loop-live={loopId || 'main'}
      >
        {`Showing ${items.length} of ${total} results`}
      </div>

      {/* Editor drop zone for customizing the card template when using default card */}
      {editing && typeof card === 'function' && !hasCustomCard && (
        <div className="mb-4 rounded-lg border border-dashed border-blue-300/70 bg-blue-50/30 p-3 text-xs text-slate-600">
          <p className="mb-1.5 font-medium text-slate-700">
            Card template slot (optional — drop blocks here to customize each item card):
          </p>
          {card({
            itemContext: {
              loopItem: toLoopItemContext(items[0] ?? SAMPLE_LOOP_ITEMS[0]),
            },
            itemIndex: 0,
            minEmptyHeight: 48,
          })}
        </div>
      )}

      <div
        id={regionId}
        tabIndex={-1}
        data-query-loop={loopId || 'main'}
        className="outline-none"
      >
        {isLoading ? (
          <QueryLoopSkeleton
            layout={layout}
            count={Math.min(items.length || 6, 12)}
            columnsDesktop={columnsDesktop}
          />
        ) : items.length === 0 ? (
          /* Empty state slot (R578 / QRY-08) */
          <div
            data-query-loop-empty
            className="s-surface s-border s-radius border p-12 text-center"
          >
            {typeof emptyState === 'function' && (hasCustomEmptyState || editing) ? (
              emptyState({ minEmptyHeight: 64 })
            ) : (
              <div>
                <p className="s-muted text-base">{emptyText}</p>
                {hasActiveFilter && (
                  <a
                    href={clearFiltersHref}
                    className="s-primary-text mt-3 inline-block text-sm font-semibold hover:underline"
                  >
                    Clear active filters
                  </a>
                )}
              </div>
            )}
          </div>
        ) : layout === 'table' ? (
          /* Table layout (R576 / QRY-06) */
          <div className="s-border s-surface s-radius overflow-x-auto border">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="s-border border-b font-semibold">
                  <th className="px-4 py-3">Title</th>
                  {showTerms && <th className="px-4 py-3">Category</th>}
                  {showAuthor && <th className="px-4 py-3">Author</th>}
                  {showDate && <th className="px-4 py-3">Published</th>}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const cats = (item.terms ?? [])
                    .filter(t => t.taxonomy === 'category')
                    .map(c => c.name)
                    .join(', ');
                  const date = formatLoopDate(item.publishedAt, language);
                  return (
                    <tr
                      key={item.id}
                      className="s-border border-b last:border-b-0 hover:bg-black/[0.02]"
                    >
                      <td className="px-4 py-3 font-medium">
                        <a href={item.url} className="hover:underline">
                          {item.title}
                        </a>
                        {showExcerpt && item.excerpt && (
                          <p className="s-muted mt-0.5 line-clamp-1 text-xs">
                            {item.excerpt}
                          </p>
                        )}
                      </td>
                      {showTerms && (
                        <td className="s-muted px-4 py-3">{cats || '—'}</td>
                      )}
                      {showAuthor && (
                        <td className="s-muted px-4 py-3">
                          {item.author?.name || '—'}
                        </td>
                      )}
                      {showDate && (
                        <td className="s-muted whitespace-nowrap px-4 py-3">
                          {date || '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : layout === 'carousel' ? (
          /* Carousel layout (R576 / QRY-06) */
          <QueryLoopCarousel
            gapClass={gapClass}
            columnsDesktop={columnsDesktop}
          >
            {items.map((item, idx) => renderCardForItem(item, idx))}
          </QueryLoopCarousel>
        ) : layout === 'masonry' ? (
          /* Masonry layout (R576 / QRY-06) */
          <div
            className={cn(
              resolveMasonryColumnsClass(
                columnsDesktop,
                columnsTablet,
                columnsMobile
              ),
              MASONRY_GAP_CLASSES[gap] ?? MASONRY_GAP_CLASSES.md
            )}
          >
            {items.map((item, idx) => (
              <div key={item.id} className="break-inside-avoid">
                {renderCardForItem(item, idx)}
              </div>
            ))}
          </div>
        ) : (
          /* Grid & List layouts (R576 / QRY-06) */
          <div
            className={cn(
              'grid',
              layout === 'list'
                ? 'grid-cols-1'
                : resolveGridColumnsClass(
                    columnsDesktop,
                    columnsTablet,
                    columnsMobile
                  ),
              gapClass
            )}
          >
            {items.map((item, idx) => renderCardForItem(item, idx))}
          </div>
        )}

        {/* Pagination (R577 / QRY-07) */}
        {pagination !== 'none' && totalPages > 1 && (
          <QueryLoopPagination
            mode={pagination}
            page={page}
            totalPages={totalPages}
            pageParamKey={pageParamKey}
            loadMoreLabel={loadMoreLabel}
            regionId={regionId}
            editing={editing}
            pageHrefs={pageHrefs}
          />
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Legacy BlogPosts & RelatedPosts → QueryLoop Converter (R580 / QRY-10)
// ---------------------------------------------------------------------------

export function blogNodeToQueryLoopProps(
  node: BuilderNode
): Record<string, unknown> {
  const p = node.props ?? {};

  if (node.type === 'RelatedPosts') {
    return {
      loopId: '',
      source: 'posts',
      excludeCurrent: true,
      title: typeof p.title === 'string' ? p.title : 'Related posts',
      layout: 'grid',
      columnsDesktop: Number(p.columns) || 3,
      columnsTablet: 2,
      columnsMobile: 1,
      gap: 'md',
      pageSize: Number(p.limit) || 3,
      sortField: 'publishedAt',
      sortOrder: 'desc',
      pagination: 'none',
      showImage: p.showImage !== false,
      showExcerpt: p.showExcerpt !== false,
      showAuthor: p.showAuthor !== false,
      showDate: p.showDate !== false,
      showTerms: true,
      ...(p.section ? { section: p.section } : {}),
    };
  }

  // Default: BlogPosts
  return {
    loopId: '',
    source: 'posts',
    excludeCurrent: false,
    eyebrow: typeof p.eyebrow === 'string' ? p.eyebrow : '',
    title: typeof p.title === 'string' ? p.title : '',
    subtitle: typeof p.subtitle === 'string' ? p.subtitle : '',
    layout: p.layout === 'list' ? 'list' : 'grid',
    columnsDesktop: Number(p.columns) || 3,
    columnsTablet: 2,
    columnsMobile: 1,
    gap: 'md',
    pageSize: Number(p.pageSize) || 9,
    lockedCategory: typeof p.lockedCategory === 'string' ? p.lockedCategory : '',
    lockedTag: typeof p.lockedTag === 'string' ? p.lockedTag : '',
    sortField: 'publishedAt',
    sortOrder: 'desc',
    pagination: p.showPagination === false ? 'none' : 'numbered',
    showImage: p.showImage !== false,
    showExcerpt: p.showExcerpt !== false,
    showAuthor: p.showAuthor !== false,
    showDate: p.showDate !== false,
    showTerms: true,
    emptyText:
      typeof p.emptyText === 'string' && p.emptyText
        ? p.emptyText
        : 'No matching items found.',
    ...(p.section ? { section: p.section } : {}),
  };
}

/**
 * Pure document transformer that converts a `BlogPosts` or `RelatedPosts` node
 * into a `QueryLoop` node in-place while preserving node ID and parent slot position (R580 / QRY-10).
 */
export function convertBlogBlockToQueryLoop(
  doc: BuilderDocument,
  nodeId: NodeId
): BuilderDocument {
  const node = doc.nodes[nodeId];
  if (!node || (node.type !== 'BlogPosts' && node.type !== 'RelatedPosts')) {
    return doc;
  }

  const convertedNode: BuilderNode = {
    id: node.id,
    type: 'QueryLoop',
    props: blogNodeToQueryLoopProps(node),
    slots: {
      card: node.slots?.card ?? [],
      emptyState: node.slots?.emptyState ?? [],
    },
  };

  return {
    ...doc,
    nodes: {
      ...doc.nodes,
      [nodeId]: convertedNode,
    },
  };
}
