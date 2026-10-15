import { cn } from '@/lib/utils/cn';
import type { PostCard, PostTerm, PostView } from '../post-template';
import { sanitizeRichText } from '../sanitize';
import { BlogFilters } from './blog-filters-client';
import {
  MotionItem,
  Section,
  SectionHeading,
  type SectionSettings,
} from './section';

type WithSection = { section?: SectionSettings; editing?: boolean };

export type CardOptions = {
  showImage?: boolean;
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
};

const formatDate = (iso: string | null, language: string) =>
  iso
    ? new Date(iso).toLocaleDateString(language, {
        dateStyle: 'medium',
        timeZone: 'UTC',
      })
    : null;

function PostCardItem({
  post,
  layout,
  options,
}: {
  post: PostCard;
  layout: 'grid' | 'list';
  options: CardOptions;
}) {
  const date =
    options.showDate !== false
      ? formatDate(post.publishedAt, post.language)
      : null;
  const author = options.showAuthor !== false ? post.authorName : null;
  const image = options.showImage !== false && post.featuredImage;

  return (
    <MotionItem>
      <article
        className={cn(
          's-surface s-border s-radius group flex h-full overflow-hidden border',
          layout === 'list' ? 'flex-col sm:flex-row' : 'flex-col'
        )}
      >
        {image && (
          <a
            href={post.url}
            tabIndex={-1}
            aria-hidden
            className={cn(
              'block shrink-0 overflow-hidden',
              layout === 'list' && 'sm:w-64'
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.featuredImage ?? undefined}
              alt=""
              loading="lazy"
              className="aspect-video size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </a>
        )}
        <div className="flex flex-1 flex-col gap-3 p-5">
          {post.categories.length > 0 && (
            <p className="s-primary-text text-xs font-semibold uppercase tracking-wider">
              {post.categories.map(c => c.name).join(' · ')}
            </p>
          )}
          <h3 className="text-lg font-bold leading-snug">
            <a href={post.url} className="hover:underline">
              {post.title}
            </a>
          </h3>
          {options.showExcerpt !== false && post.excerpt && (
            <p className="s-muted line-clamp-3 text-sm leading-relaxed">
              {post.excerpt}
            </p>
          )}
          {(date || author) && (
            <p className="s-muted mt-auto text-xs">
              {author}
              {author && date && ' · '}
              {date && (
                <time dateTime={post.publishedAt ?? undefined}>{date}</time>
              )}
            </p>
          )}
        </div>
      </article>
    </MotionItem>
  );
}

const GRID_COLUMNS = {
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
};

function PostGrid({
  posts,
  layout,
  columns,
  options,
}: {
  posts: PostCard[];
  layout: 'grid' | 'list';
  columns: 2 | 3 | 4;
  options: CardOptions;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-6',
        layout === 'grid' ? GRID_COLUMNS[columns] : 'gap-5'
      )}
    >
      {posts.map(post => (
        <PostCardItem
          key={post.id}
          post={post}
          layout={layout}
          options={options}
        />
      ))}
    </div>
  );
}

/* ---------- BlogPosts ---------- */

export type BlogActiveFilters = {
  q?: string;
  category?: string;
  tag?: string;
  sort?: string;
  page?: number;
};

export type BlogPostsProps = WithSection &
  CardOptions & {
    title?: string;
    subtitle?: string;
    layout?: 'grid' | 'list';
    columns?: 2 | 3 | 4;
    pageSize?: number;
    showSearch?: boolean;
    showCategoryFilter?: boolean;
    showTagFilter?: boolean;
    showSort?: boolean;
    showPagination?: boolean;
    lockedCategory?: string;
    lockedTag?: string;
    emptyMessage?: string;
    /** Filled by `resolveData`. */
    posts?: PostCard[];
    totalPages?: number;
    total?: number;
    active?: BlogActiveFilters;
    filterOptions?: { categories: PostTerm[]; tags: PostTerm[] };
  };

function pageHref(active: BlogActiveFilters, page: number) {
  const params = new URLSearchParams();
  if (active.q) params.set('q', active.q);
  if (active.category) params.set('category', active.category);
  if (active.tag) params.set('tag', active.tag);
  if (active.sort) params.set('sort', active.sort);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `?${query}` : '?';
}

function Pagination({
  active,
  totalPages,
  editing,
}: {
  active: BlogActiveFilters;
  totalPages: number;
  editing?: boolean;
}) {
  const page = active.page ?? 1;
  if (totalPages <= 1) return null;
  const link =
    's-border s-radius inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm';

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'mt-10 flex flex-wrap items-center justify-center gap-2',
        editing && 'pointer-events-none'
      )}
    >
      {page > 1 && (
        <a href={pageHref(active, page - 1)} className={link} rel="prev">
          Previous
        </a>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <a
          key={n}
          href={pageHref(active, n)}
          aria-current={n === page ? 'page' : undefined}
          className={cn(link, n === page && 's-btn-primary border-transparent')}
        >
          {n}
        </a>
      ))}
      {page < totalPages && (
        <a href={pageHref(active, page + 1)} className={link} rel="next">
          Next
        </a>
      )}
    </nav>
  );
}

export function BlogPosts(p: BlogPostsProps) {
  const active = p.active ?? {};
  const posts = p.posts ?? [];
  const options = p.filterOptions ?? { categories: [], tags: [] };
  const filtering = !!(active.q || active.category || active.tag);

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading title={p.title} subtitle={p.subtitle} />
      <BlogFilters
        showSearch={!!p.showSearch}
        showCategory={
          !!p.showCategoryFilter &&
          !p.lockedCategory &&
          options.categories.length > 0
        }
        showTag={!!p.showTagFilter && !p.lockedTag && options.tags.length > 0}
        showSort={!!p.showSort}
        categories={options.categories}
        tags={options.tags}
        active={active}
        editing={p.editing}
      />
      {posts.length ? (
        <PostGrid
          posts={posts}
          layout={p.layout ?? 'grid'}
          columns={p.columns ?? 3}
          options={p}
        />
      ) : (
        <div className="s-border s-muted s-radius rounded-lg border border-dashed px-6 py-14 text-center text-sm">
          {filtering
            ? 'No posts match these filters.'
            : p.emptyMessage ||
              (p.editing ? 'Published posts appear here.' : 'No posts yet.')}
          {filtering && !p.editing && (
            <a href="?" className="s-primary-text ml-1 underline">
              Clear filters
            </a>
          )}
        </div>
      )}
      {p.showPagination !== false && (
        <Pagination
          active={active}
          totalPages={p.totalPages ?? 1}
          editing={p.editing}
        />
      )}
    </Section>
  );
}

/* ---------- single-post blocks ---------- */

type PostBlock = WithSection & { post: PostView };

export function PostTitle(
  p: PostBlock & {
    showBackLink?: boolean;
    showExcerpt?: boolean;
    alignment?: 'left' | 'center';
  }
) {
  const center = p.alignment === 'center';
  return (
    <Section section={p.section} editing={p.editing} innerClassName="max-w-3xl">
      <header className={cn(center && 'text-center')}>
        {p.showBackLink !== false && p.post.blogUrl && (
          <a
            href={p.post.blogUrl}
            className="s-primary-text mb-6 inline-block text-sm font-medium hover:underline"
          >
            ← All posts
          </a>
        )}
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
          {p.post.title}
        </h1>
        {p.showExcerpt !== false && p.post.excerpt && (
          <p className="s-muted mt-5 text-lg leading-relaxed md:text-xl">
            {p.post.excerpt}
          </p>
        )}
      </header>
    </Section>
  );
}

const ASPECT = {
  auto: '',
  video: 'aspect-video',
  wide: 'aspect-[21/9]',
  square: 'aspect-square',
};

export function PostFeaturedImage(
  p: PostBlock & {
    aspect?: keyof typeof ASPECT;
    width?: 'normal' | 'wide' | 'full';
  }
) {
  if (!p.post.featuredImage) {
    return p.editing ? (
      <Section section={p.section} editing innerClassName="max-w-5xl">
        <div className="s-surface s-border s-muted s-radius flex aspect-[21/9] items-center justify-center border border-dashed text-sm">
          The post’s featured image appears here
        </div>
      </Section>
    ) : null;
  }

  const width = { normal: 'max-w-3xl', wide: 'max-w-5xl', full: 'max-w-none' }[
    p.width ?? 'wide'
  ];
  return (
    <Section section={p.section} editing={p.editing} innerClassName={width}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.post.featuredImage}
        alt=""
        className={cn(
          's-radius w-full object-cover',
          ASPECT[p.aspect ?? 'wide']
        )}
      />
    </Section>
  );
}

export function PostMeta(
  p: PostBlock & {
    showDate?: boolean;
    showAuthor?: boolean;
    showCategories?: boolean;
    showTags?: boolean;
  }
) {
  const date =
    p.showDate !== false
      ? formatDate(p.post.publishedAt, p.post.language)
      : null;
  const author = p.showAuthor !== false ? p.post.authorName : null;
  const categories = p.showCategories !== false ? p.post.categories : [];
  const tags = p.showTags !== false ? p.post.tags : [];
  if (!date && !author && !categories.length && !tags.length) return null;

  return (
    <Section section={p.section} editing={p.editing} innerClassName="max-w-3xl">
      <div className="s-border flex flex-wrap items-center gap-x-4 gap-y-2 border-y py-4 text-sm">
        {author && <span className="font-medium">By {author}</span>}
        {date && (
          <time dateTime={p.post.publishedAt ?? undefined} className="s-muted">
            {date}
          </time>
        )}
        {categories.length > 0 && (
          <span className="s-primary-text font-semibold">
            {categories.map(c => c.name).join(', ')}
          </span>
        )}
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {tags.map(t => (
              <li
                key={t.id}
                className="s-soft-primary rounded-full px-2.5 py-0.5 text-xs font-medium"
              >
                #{t.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

const CONTENT_WIDTH = {
  narrow: 'max-w-2xl',
  normal: 'max-w-3xl',
  wide: 'max-w-5xl',
};

export function PostContent(
  p: PostBlock & { width?: keyof typeof CONTENT_WIDTH }
) {
  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={CONTENT_WIDTH[p.width ?? 'normal']}
    >
      <article
        lang={p.post.language}
        className="s-prose prose prose-lg max-w-none [&_p]:text-[length:inherit]"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(p.post.body) }}
      />
    </Section>
  );
}

export function RelatedPosts(
  p: WithSection &
    CardOptions & {
      title?: string;
      limit?: number;
      columns?: 2 | 3 | 4;
      posts?: PostCard[];
    }
) {
  const posts = p.posts ?? [];

  if (!posts.length) {
    return p.editing ? (
      <Section section={p.section} editing>
        <SectionHeading title={p.title} />
        <p className="s-muted text-center text-sm">
          Related posts from the same category appear here once more posts are
          published.
        </p>
      </Section>
    ) : null;
  }

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading title={p.title} />
      <PostGrid
        posts={posts}
        layout="grid"
        columns={p.columns ?? 3}
        options={p}
      />
    </Section>
  );
}
