import { DEFAULT_SECTION } from './blocks/section';
import { type BuilderData, isBuilderData } from './data';
import { entryTitle } from '@/config/post-types';

export type PostTerm = {
  id: string;
  name: string;
  slug: string;
  color?: string;
  url?: string;
};

/** The post a single-post layout renders, passed to blocks as Puck metadata. */
export type PostView = {
  id: string;
  title: string;
  slug: string;
  language: string;
  excerpt: string | null;
  featuredImage: string | null;
  body: string;
  publishedAt: string | null;
  authorName: string | null;
  authorUrl?: string | null;
  /** Author avatar URL (users.image). */
  authorImage?: string | null;
  /** Author's public bio (Account → Public author profile). */
  authorBio?: string | null;
  authorId?: string | null;
  authorJobTitle?: string | null;
  authorWebsite?: string | null;
  authorSocial?: { x?: string; linkedin?: string; github?: string; instagram?: string } | null;
  /** Published posts by this author. */
  authorPostCount?: number;
  /** Per-post comments switch (blog posts only). */
  allowComments?: boolean;
  /** Approved comments. */
  commentCount?: number;
  categories: PostTerm[];
  tags: PostTerm[];
  headerTemplateId?: string | null;
  footerTemplateId?: string | null;
  /** URL of the language's blog index page, when one is published. */
  blogUrl?: string | null;
};

/** A post as listed in cards (BlogPosts and RelatedPosts). */
export type PostCard = Omit<PostView, 'body' | 'blogUrl'> & { url: string };

export const SAMPLE_POST: PostView = {
  id: 'sample-post',
  title: 'How we rebuilt our publishing workflow',
  slug: 'sample-post',
  language: 'en',
  excerpt:
    'A short summary of the article appears here, under the title and in post cards.',
  featuredImage: null,
  body: '<p>This is sample copy. Each post that uses the shared template shows its own title, image, and article body in these blocks.</p><h2>A section heading</h2><p>Write posts in the rich-text editor on the post screen. The template decides where that body appears.</p>',
  publishedAt: new Date('2026-01-15T09:00:00Z').toISOString(),
  authorName: 'Jane Writer',
  authorBio:
    'Jane writes about publishing tools and editorial design. This bio comes from the author’s account profile.',
  authorJobTitle: 'Senior editor',
  authorWebsite: 'https://example.com',
  authorSocial: { x: 'https://x.com/example', linkedin: 'https://www.linkedin.com/in/example' },
  authorPostCount: 12,
  allowComments: true,
  commentCount: 2,
  categories: [{ id: 'sample-category', name: 'News', slug: 'news' }],
  tags: [
    { id: 'sample-tag', name: 'Product', slug: 'product', color: '#6366f1' },
  ],
  blogUrl: '/blog',
};

export const POST_BLOCK_TYPES = [
  'PostTitle',
  'PostFeaturedImage',
  'PostMeta',
  'PostContent',
  'RelatedPosts',
  'AuthorBio',
  'AuthorCard',
  'Comments',
  'ShareButtons',
  'PostNavigation',
  'BookmarkButton',
] as const;

/** Used whenever no single-post template has been published yet. */
export const defaultPostTemplate = (): BuilderData => ({
  root: {
    props: {
      maxWidth: 'lg',
      theme: 'site',
      paddingY: 'md',
      pageTransition: 'none',
    },
  },
  content: [
    {
      type: 'PostFeaturedImage',
      props: {
        id: 'PostFeaturedImage-default',
        aspect: 'wide',
        section: { ...DEFAULT_SECTION, paddingY: 'sm' },
      },
    },
    {
      type: 'PostTitle',
      props: {
        id: 'PostTitle-default',
        showBackLink: true,
        showExcerpt: true,
        alignment: 'left',
        section: { ...DEFAULT_SECTION, paddingY: 'none' },
      },
    },
    {
      type: 'PostMeta',
      props: {
        id: 'PostMeta-default',
        showDate: true,
        showAuthor: true,
        showCategories: true,
        showTags: true,
        section: { ...DEFAULT_SECTION, paddingY: 'sm' },
      },
    },
    {
      type: 'PostContent',
      props: {
        id: 'PostContent-default',
        width: 'normal',
        section: { ...DEFAULT_SECTION, paddingY: 'none' },
      },
    },
    {
      type: 'PostNavigation',
      props: {
        id: 'PostNavigation-default',
        previousLabel: 'Previous',
        nextLabel: 'Next',
        width: 'normal',
        section: { ...DEFAULT_SECTION, paddingY: 'sm' },
      },
    },
    {
      type: 'RelatedPosts',
      props: {
        id: 'RelatedPosts-default',
        title: 'Related posts',
        limit: 3,
        posts: [],
        section: { ...DEFAULT_SECTION, paddingY: 'md' },
      },
    },
  ],
  zones: {},
});

const containsBlock = (data: BuilderData, type: string) =>
  data.content.some(n => n.type === type) ||
  Object.values(data.zones ?? {}).some(items =>
    (items as { type: string }[]).some(n => n.type === type)
  );

/**
 * Settings → Single pages: adds Previous / next (and, for blog posts,
 * Comments) to a single-page layout that doesn't already place them, so
 * every single page gets them without editing each template.
 */
export function withSingleExtras(
  layout: BuilderData,
  opts: { postNavigation?: 'auto' | 'off'; comments?: boolean }
): BuilderData {
  const extras: BuilderData['content'] = [];
  if (opts.postNavigation !== 'off' && !containsBlock(layout, 'PostNavigation')) {
    extras.push({
      type: 'PostNavigation',
      props: {
        id: 'PostNavigation-auto',
        previousLabel: 'Previous',
        nextLabel: 'Next',
        width: 'normal',
        section: { ...DEFAULT_SECTION, paddingY: 'sm' },
      },
    });
  }
  if (opts.comments && !containsBlock(layout, 'Comments')) {
    extras.push({
      type: 'Comments',
      props: {
        id: 'Comments-auto',
        heading: 'Comments',
        width: 'normal',
        section: { ...DEFAULT_SECTION, paddingY: 'md' },
      },
    });
  }
  if (!extras.length) return layout;
  const content = [...layout.content];
  const related = content.findIndex(n => n.type === 'RelatedPosts');
  content.splice(related === -1 ? content.length : related, 0, ...extras);
  return { ...layout, content };
}

export const resolvePostTemplate = (value: unknown): BuilderData =>
  isBuilderData(value) && value.content.length ? value : defaultPostTemplate();

export type EntryTermView = {
  id?: string;
  termId?: string;
  name: string;
  slug: string;
  color?: string;
  taxonomyId?: string;
  taxonomyKey?: string;
  hierarchical?: boolean;
};

export function entryToPostView(
  entry: {
    id: string;
    slug: string;
    data?: unknown;
    excerpt?: string | null;
    featuredImage?: string | null;
    publishedAt?: Date | string | null;
    authorName?: string | null;
    authorId?: string | null;
    author?: { id?: string | null; name?: string | null } | null;
  },
  collection: {
    name?: string;
    slug?: string;
    fields?: { key: string; type: string }[];
  },
  terms: EntryTermView[] = [],
  opts?: { siteSlug?: string }
): PostView {
  const fields = collection.fields ?? [];
  const data = (entry.data && typeof entry.data === 'object' ? entry.data : {}) as Record<string, unknown>;
  const title = entryTitle(data, fields) || entry.slug;
  const prefix = opts?.siteSlug ? `/${opts.siteSlug}` : '';
  const colBase = collection.slug ? `${prefix}/collections/${collection.slug}` : '';

  const firstHierarchicalTaxonomyId = terms.find(t => t.hierarchical)?.taxonomyId;
  const firstFlatTaxonomyId = terms.find(t => !t.hierarchical)?.taxonomyId;

  const termUrl = (t: EntryTermView) =>
    colBase && t.taxonomyKey && t.slug
      ? `${colBase}/${t.taxonomyKey}/${t.slug}`
      : undefined;

  const categories: PostTerm[] = terms
    .filter(t => (firstHierarchicalTaxonomyId ? t.taxonomyId === firstHierarchicalTaxonomyId : t.hierarchical))
    .map(t => ({ id: t.id ?? t.termId ?? '', name: t.name, slug: t.slug, color: t.color, url: termUrl(t) }));

  const tags: PostTerm[] = terms
    .filter(t => (firstFlatTaxonomyId ? t.taxonomyId === firstFlatTaxonomyId : !t.hierarchical))
    .map(t => ({ id: t.id ?? t.termId ?? '', name: t.name, slug: t.slug, color: t.color, url: termUrl(t) }));

  const firstRichtextField = fields.find(f => f.type === 'richtext');
  let body = '';
  if (firstRichtextField && data[firstRichtextField.key]) {
    body = String(data[firstRichtextField.key]);
  } else {
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === 'string' && (v.startsWith('<p>') || v.includes('</'))) {
        body = v;
        break;
      }
    }
  }

  const firstMediaField = fields.find(f => f.type === 'media');
  const customImage =
    (firstMediaField && typeof data[firstMediaField.key] === 'string'
      ? (data[firstMediaField.key] as string)
      : null) ??
    (typeof data.image === 'string'
      ? data.image
      : typeof data.photo === 'string'
        ? data.photo
        : typeof data.avatar === 'string'
          ? data.avatar
          : typeof data.thumbnail === 'string'
            ? data.thumbnail
            : typeof data.cover === 'string'
              ? data.cover
              : null);

  const authorId = entry.authorId ?? entry.author?.id ?? null;
  const authorName = entry.authorName ?? entry.author?.name ?? null;
  const authorUrl =
    colBase && authorId ? `${colBase}/author/${authorId}` : null;

  return {
    id: entry.id,
    title,
    slug: entry.slug,
    language: 'en',
    excerpt: entry.excerpt ?? null,
    featuredImage: entry.featuredImage ?? customImage,
    body,
    publishedAt: entry.publishedAt ? new Date(entry.publishedAt).toISOString() : null,
    authorName,
    authorUrl,
    categories,
    tags,
    blogUrl: colBase || null,
  };
}
