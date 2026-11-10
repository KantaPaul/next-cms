import { cn } from '@/lib/utils/cn';
import type { PostCard, PostTerm, PostView } from '../post-template';
import { sanitizeRichText } from '../sanitize';
import type { ElementStyle } from '../style';
import { el, linkEl } from './element';
import { BlogFilters } from './blog-filters-client';
import {
  MotionItem,
  Section,
  SectionHeading,
  type SectionSettings,
} from './section';

type WithSection = {
  section?: SectionSettings;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
};

export type CardOptions = {
  showImage?: boolean;
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showDate?: boolean;
  elements?: Record<string, ElementStyle>;
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
        {...el(
          options,
          'card',
          cn(
            's-surface s-border s-radius group flex h-full overflow-hidden border',
            layout === 'list' ? 'flex-col sm:flex-row' : 'flex-col'
          )
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
              {...el(
                options,
                'cardImage',
                'aspect-video size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]'
              )}
            />
          </a>
        )}
        <div className="flex flex-1 flex-col gap-3 p-5">
          {post.categories.length > 0 && (
            <p
              {...el(
                options,
                'cardCategory',
                's-primary-text text-xs font-semibold uppercase tracking-wider'
              )}
            >
              {post.categories.map(c => c.name).join(' · ')}
            </p>
          )}
          <h3
            {...el(options, 'cardTitle', 's-card-title text-lg leading-snug')}
          >
            <a
              href={post.url}
              {...linkEl(options, 'cardTitle', 'hover:underline')}
            >
              {post.title}
            </a>
          </h3>
          {options.showExcerpt !== false && post.excerpt && (
            <p
              {...el(
                options,
                'cardExcerpt',
                's-muted line-clamp-3 text-sm leading-relaxed'
              )}
            >
              {post.excerpt}
            </p>
          )}
          {(date || author) && (
            <p {...el(options, 'cardMeta', 's-muted mt-auto text-xs')}>
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
  elements,
}: {
  active: BlogActiveFilters;
  totalPages: number;
  editing?: boolean;
  elements?: Record<string, ElementStyle>;
}) {
  const page = active.page ?? 1;
  if (totalPages <= 1) return null;
  const link =
    's-border s-radius inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm';
  const pageLinkEl = el({ elements }, 'pagination', link);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'mt-10 flex flex-wrap items-center justify-center gap-2',
        editing && 'pointer-events-none'
      )}
    >
      {page > 1 && (
        <a href={pageHref(active, page - 1)} {...pageLinkEl} rel="prev">
          Previous
        </a>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
        <a
          key={n}
          href={pageHref(active, n)}
          aria-current={n === page ? 'page' : undefined}
          {...(n === page
            ? { className: cn(link, 's-btn-primary border-transparent') }
            : pageLinkEl)}
        >
          {n}
        </a>
      ))}
      {page < totalPages && (
        <a href={pageHref(active, page + 1)} {...pageLinkEl} rel="next">
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
      <SectionHeading
        elements={p.elements}
        title={p.title}
        subtitle={p.subtitle}
      />
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
        elements={p.elements}
      />
      {posts.length ? (
        <PostGrid
          posts={posts}
          layout={p.layout ?? 'grid'}
          columns={p.columns ?? 3}
          options={p}
        />
      ) : (
        <div
          {...el(
            p,
            'empty',
            's-border s-muted s-radius rounded-lg border border-dashed px-6 py-14 text-center text-sm'
          )}
        >
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
          elements={p.elements}
        />
      )}
    </Section>
  );
}

/* ---------- single-post blocks ---------- */

/** Rough reading time: ~220 words a minute, at least 1. */
export function readingMinutes(html: string | null | undefined): number {
  if (!html) return 0;
  const words = html
    .replace(/<[^>]*>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return words ? Math.max(1, Math.round(words / 220)) : 0;
}

type PostBlock = WithSection & { post: PostView };

export function PostTitle(
  p: PostBlock & {
    showBackLink?: boolean;
    backLinkLabel?: string;
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
            {...linkEl(
              p,
              'backLink',
              's-primary-text mb-6 inline-block text-sm font-medium hover:underline'
            )}
          >
            {p.backLinkLabel || '← All posts'}
          </a>
        )}
        <h1 {...el(p, 'title', 's-post-title')}>{p.post.title}</h1>
        {p.showExcerpt !== false && p.post.excerpt && (
          <p
            {...el(
              p,
              'excerpt',
              's-muted mt-5 text-lg leading-relaxed md:text-xl'
            )}
          >
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
        {...el(
          p,
          'image',
          cn('s-radius w-full object-cover', ASPECT[p.aspect ?? 'wide'])
        )}
      />
    </Section>
  );
}

export function PostMeta(
  p: PostBlock & {
    showDate?: boolean;
    showAuthor?: boolean;
    showAvatar?: boolean;
    showReadingTime?: boolean;
    showCategories?: boolean;
    showTags?: boolean;
  }
) {
  const date =
    p.showDate !== false
      ? formatDate(p.post.publishedAt, p.post.language)
      : null;
  const author = p.showAuthor !== false ? p.post.authorName : null;
  const authorUrl = p.showAuthor !== false ? p.post.authorUrl : null;
  const categories = p.showCategories !== false ? p.post.categories : [];
  const tags = p.showTags !== false ? p.post.tags : [];
  const minutes = p.showReadingTime ? readingMinutes(p.post.body) : 0;
  const avatar = author && p.showAvatar ? p.post.authorImage : null;
  if (!date && !author && !minutes && !categories.length && !tags.length)
    return null;

  return (
    <Section section={p.section} editing={p.editing} innerClassName="max-w-3xl">
      <div
        {...el(
          p,
          'bar',
          's-border flex flex-wrap items-center gap-x-4 gap-y-2 border-y py-4 text-sm'
        )}
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            {...el(p, 'avatar', '-mr-2 size-9 rounded-full object-cover')}
          />
        ) : null}
        {author &&
          (authorUrl ? (
            <a
              href={authorUrl}
              {...linkEl(p, 'author', 'font-medium hover:underline')}
            >
              By {author}
            </a>
          ) : (
            <span {...el(p, 'author', 'font-medium')}>By {author}</span>
          ))}
        {date && (
          <time
            dateTime={p.post.publishedAt ?? undefined}
            {...el(p, 'date', 's-muted')}
          >
            {date}
          </time>
        )}
        {minutes > 0 && <span className="s-muted">{minutes} min read</span>}
        {categories.length > 0 && (
          <span {...el(p, 'category', 's-primary-text font-semibold')}>
            {categories.map((c, i) => (
              <span key={c.id || c.slug}>
                {c.url ? (
                  <a href={c.url} {...linkEl(p, 'category', 'hover:underline')}>
                    {c.name}
                  </a>
                ) : (
                  c.name
                )}
                {i < categories.length - 1 ? ', ' : ''}
              </span>
            ))}
          </span>
        )}
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {tags.map(t => (
              <li key={t.id || t.slug}>
                {t.url ? (
                  <a
                    href={t.url}
                    {...linkEl(
                      p,
                      'tag',
                      's-soft-primary inline-block rounded-full px-2.5 py-0.5 text-xs font-medium hover:underline'
                    )}
                  >
                    #{t.name}
                  </a>
                ) : (
                  <span
                    {...el(
                      p,
                      'tag',
                      's-soft-primary rounded-full px-2.5 py-0.5 text-xs font-medium'
                    )}
                  >
                    #{t.name}
                  </span>
                )}
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
  p: PostBlock & { width?: keyof typeof CONTENT_WIDTH; dropCap?: boolean }
) {
  return (
    <Section
      section={p.section}
      editing={p.editing}
      innerClassName={CONTENT_WIDTH[p.width ?? 'normal']}
    >
      <article
        lang={p.post.language}
        {...el(
          p,
          'content',
          cn(
            's-prose prose prose-lg max-w-none [&_p]:text-[length:inherit]',
            p.dropCap && 's-prose-dropcap'
          )
        )}
        dangerouslySetInnerHTML={{
          __html: p.post.filteredBody ?? sanitizeRichText(p.post.body),
        }}
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
        <SectionHeading elements={p.elements} title={p.title} />
        <p className="s-muted text-center text-sm">
          Related posts from the same category appear here once more posts are
          published.
        </p>
      </Section>
    ) : null;
  }

  return (
    <Section section={p.section} editing={p.editing} hasItems>
      <SectionHeading elements={p.elements} title={p.title} />
      <PostGrid
        posts={posts}
        layout="grid"
        columns={p.columns ?? 3}
        options={p}
      />
    </Section>
  );
}
