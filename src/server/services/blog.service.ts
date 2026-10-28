import 'server-only';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  ne,
  notInArray,
  or,
  type SQL,
} from 'drizzle-orm';
import { cache } from 'react';
import { postTemplatesService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import { type BuilderData, isBuilderData } from '@/builder/data';
import type { PostCard, PostTerm, PostView } from '@/builder/post-template';
import { PAGES } from '@/config/pages';
import { db } from '@/db';
import {
  categories,
  pages,
  postCategories,
  postContents,
  postSeo,
  posts,
  postTags,
  tags,
  users,
} from '@/db/schema';
import { DEFAULT_LANGUAGE, LANGUAGE_CODES } from '@/db/schemas/shared.schema';
import {
  siteContext,
  siteSlugPrefix,
} from '@/server/services/site-context';

type LocaleSite = {
  defaultLocale: string;
  locales: { code: string }[];
};

/** Maps `/blog/slug` and `/{lang}/blog/slug` segments to a post route. */
export function resolvePostRoute(
  segments: string[] = [],
  site?: LocaleSite
): { language: string; slug: string } | null {
  const defaultLocale = site?.defaultLocale ?? DEFAULT_LANGUAGE;
  const codes = site?.locales.map(locale => locale.code) ?? LANGUAGE_CODES;
  const parts = segments.map(decodeURIComponent);
  if (parts.length === 2 && parts[0] === 'blog')
    return { language: defaultLocale, slug: parts[1] };

  if (
    parts.length === 3 &&
    parts[1] === 'blog' &&
    parts[0] !== defaultLocale &&
    codes.includes(parts[0])
  ) {
    return { language: parts[0], slug: parts[2] };
  }

  return null;
}

export const BLOG_SORTS = ['newest', 'oldest', 'title'] as const;
export type BlogSort = (typeof BLOG_SORTS)[number];

export type BlogQuery = {
  language?: string | null;
  q?: string | null;
  /** Category or tag, matched by id or slug. */
  category?: string | null;
  tag?: string | null;
  sort?: BlogSort | null;
  page?: number;
  size?: number;
  excludeId?: string | null;
};

async function published(extra?: SQL) {
  const site = await siteContext.publicSite();
  return and(
    eq(posts.siteId, site.id),
    eq(posts.status, 'published'),
    eq(posts.visibility, 'public'),
    isNull(posts.deletedAt),
    extra
  );
}

const inCategory = (value: string) =>
  exists(
    db
      .select({ one: postCategories.postId })
      .from(postCategories)
      .innerJoin(categories, eq(categories.id, postCategories.categoryId))
      .where(
        and(
          eq(postCategories.postId, posts.id),
          or(eq(categories.id, value), eq(categories.slug, value))
        )
      )
  );

const hasTag = (value: string) =>
  exists(
    db
      .select({ one: postTags.postId })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(
        and(
          eq(postTags.postId, posts.id),
          or(eq(tags.id, value), eq(tags.slug, value))
        )
      )
  );

const cardSelect = {
  id: posts.id,
  siteId: posts.siteId,
  title: posts.title,
  slug: posts.slug,
  language: posts.language,
  excerpt: posts.excerpt,
  featuredImage: posts.featuredImage,
  publishedAt: posts.publishedAt,
  authorName: users.name,
};

async function loadTerms(postIds: string[]) {
  if (!postIds.length)
    return {
      categoriesByPost: new Map<string, PostTerm[]>(),
      tagsByPost: new Map<string, PostTerm[]>(),
    };

  const [categoryRows, tagRows] = await Promise.all([
    db
      .select({
        postId: postCategories.postId,
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(postCategories)
      .innerJoin(categories, eq(categories.id, postCategories.categoryId))
      .where(
        and(
          inArray(postCategories.postId, postIds),
          isNull(categories.deletedAt)
        )
      )
      .orderBy(asc(categories.name)),
    db
      .select({
        postId: postTags.postId,
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
        color: tags.color,
      })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(and(inArray(postTags.postId, postIds), isNull(tags.deletedAt)))
      .orderBy(asc(tags.name)),
  ]);

  const group = <T extends { postId: string }>(rows: T[]) => {
    const map = new Map<string, PostTerm[]>();

    for (const { postId, ...term } of rows) {
      const list = map.get(postId) ?? [];
      list.push(term as unknown as PostTerm);
      map.set(postId, list);
    }

    return map;
  };

  return { categoriesByPost: group(categoryRows), tagsByPost: group(tagRows) };
}

type CardRow = {
  id: string;
  slug: string;
  language: string;
  publishedAt: Date | null;
} & Omit<PostCard, 'url' | 'publishedAt' | 'categories' | 'tags'>;

async function toCards(rows: CardRow[]): Promise<PostCard[]> {
  const site = await siteContext.publicSite();
  const { categoriesByPost, tagsByPost } = await loadTerms(rows.map(r => r.id));
  return rows.map(row => ({
    ...row,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    url: PAGES.SITE.post(
      row.slug,
      row.language,
      site.defaultLocale,
      siteSlugPrefix(site)
    ),
    categories: categoriesByPost.get(row.id) ?? [],
    tags: tagsByPost.get(row.id) ?? [],
  }));
}

const ORDER: Record<BlogSort, SQL[]> = {
  newest: [desc(posts.publishedAt), desc(posts.createdAt)],
  oldest: [asc(posts.publishedAt), asc(posts.createdAt)],
  title: [asc(posts.title)],
};

const blogIndexUrl = cache(async (language: string) => {
  const site = await siteContext.publicSite();
  const [page] = await db
    .select({
      slug: pages.slug,
      language: pages.language,
      isHome: pages.isHome,
    })
    .from(pages)
    .where(
      and(
        eq(pages.siteId, site.id),
        eq(pages.isBlogIndex, true),
        eq(pages.language, language),
        eq(pages.status, 'published'),
        eq(pages.visibility, 'public'),
        isNull(pages.deletedAt)
      )
    )
    .limit(1);
  return page
    ? PAGES.SITE.page(
        page.slug,
        page.language,
        page.isHome,
        site.defaultLocale,
        siteSlugPrefix(site)
      )
    : null;
});

async function loadPost(where: SQL | undefined, kind: 'draft' | 'published') {
  const [row] = await db
    .select({
      ...cardSelect,
      layout: posts.layout,
      templateId: posts.templateId,
      siteId: posts.siteId,
      status: posts.status,
      updatedAt: posts.updatedAt,
      translationGroupId: posts.translationGroupId,
    })
    .from(posts)
    .leftJoin(users, eq(users.id, posts.createdBy))
    .where(where)
    .limit(1);
  if (!row) return null;

  const contents = await db
    .select()
    .from(postContents)
    .where(eq(postContents.postId, row.id));
  const content =
    contents.find(c => c.kind === kind) ??
    contents.find(c => c.kind === 'published');
  const [[seo], { categoriesByPost, tagsByPost }, blogUrl] = await Promise.all([
    db.select().from(postSeo).where(eq(postSeo.postId, row.id)).limit(1),
    loadTerms([row.id]),
    blogIndexUrl(row.language),
  ]);

  const view: PostView = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    language: row.language,
    excerpt: row.excerpt,
    featuredImage: row.featuredImage,
    body: content?.body ?? '',
    publishedAt: row.publishedAt?.toISOString() ?? null,
    authorName: row.authorName,
    categories: categoriesByPost.get(row.id) ?? [],
    tags: tagsByPost.get(row.id) ?? [],
    blogUrl,
  };

  const alternates = await loadPostAlternates(row, kind === 'published');

  return {
    view,
    siteId: row.siteId,
    layout: row.layout,
    templateId: row.templateId,
    canvas: content?.canvas ?? null,
    seo: seo ?? null,
    updatedAt: row.updatedAt,
    translationGroupId: row.translationGroupId,
    alternates,
    isDraft: kind === 'draft',
  };
}

async function loadPostAlternates(
  post: { translationGroupId: string | null },
  publishedOnly: boolean
) {
  if (!post.translationGroupId) return [];
  return db
    .select({
      language: posts.language,
      slug: posts.slug,
    })
    .from(posts)
    .where(
      and(
        eq(posts.siteId, (await siteContext.publicSite()).id),
        eq(posts.translationGroupId, post.translationGroupId),
        isNull(posts.deletedAt),
        publishedOnly ? await published() : undefined
      )
    );
}

export const blogService = {
  /** One page of published, public posts matching the filters. */
  list: async (query: BlogQuery) => {
    const size = Math.min(Math.max(query.size ?? 9, 1), 48);
    const page = Math.max(query.page ?? 1, 1);
    const term = query.q?.trim();
    const where = and(
      await published(),
      query.language ? eq(posts.language, query.language) : undefined,
      term
        ? or(ilike(posts.title, `%${term}%`), ilike(posts.excerpt, `%${term}%`))
        : undefined,
      query.category ? inCategory(query.category) : undefined,
      query.tag ? hasTag(query.tag) : undefined,
      query.excludeId ? ne(posts.id, query.excludeId) : undefined
    );

    const [rows, [{ total }]] = await Promise.all([
      db
        .select(cardSelect)
        .from(posts)
        .leftJoin(users, eq(users.id, posts.createdBy))
        .where(where)
        .orderBy(...ORDER[query.sort ?? 'newest'])
        .limit(size)
        .offset((page - 1) * size),
      db.select({ total: count() }).from(posts).where(where),
    ]);

    return {
      posts: await toCards(rows),
      total,
      page,
      size,
      totalPages: Math.max(Math.ceil(total / size), 1),
    };
  },

  /** Posts sharing a category with the given post, newest first, falling back to the latest posts. */
  related: async ({
    postId,
    categoryIds,
    language,
    limit,
  }: {
    postId: string;
    categoryIds: string[];
    language: string;
    limit: number;
  }) => {
    const base = and(
      await published(),
      eq(posts.language, language),
      ne(posts.id, postId)
    );
    const sameCategory = categoryIds.length
      ? exists(
          db
            .select({ one: postCategories.postId })
            .from(postCategories)
            .where(
              and(
                eq(postCategories.postId, posts.id),
                inArray(postCategories.categoryId, categoryIds)
              )
            )
        )
      : undefined;

    const query = (where: SQL | undefined, n: number) =>
      db
        .select(cardSelect)
        .from(posts)
        .leftJoin(users, eq(users.id, posts.createdBy))
        .where(where)
        .orderBy(...ORDER.newest)
        .limit(n);

    const rows = sameCategory
      ? await query(and(base, sameCategory), limit)
      : [];

    if (rows.length < limit) {
      const seen = rows.map(r => r.id);
      rows.push(
        ...(await query(
          and(base, seen.length ? notInArray(posts.id, seen) : undefined),
          limit - rows.length
        ))
      );
    }

    return toCards(rows);
  },

  getPublished: cache(async (language: string, slug: string) =>
    loadPost(
      and(await published(), eq(posts.language, language), eq(posts.slug, slug)),
      'published'
    )
  ),

  /** Draft version of the post at a route, only when it is the post being previewed. */
  getDraft: cache(async (language: string, slug: string, postId: string) =>
    loadPost(
      and(
        isNull(posts.deletedAt),
        eq(posts.id, postId),
        eq(posts.language, language),
        eq(posts.slug, slug)
      ),
      'draft'
    )
  ),

  /** Draft view of any post, for the admin post-layout builder. */
  /** The Puck tree a post renders through: its own canvas, or its assigned template (then the default). */
  layoutFor: async (post: {
    layout: string;
    canvas: unknown;
    templateId: string | null;
    siteId: string;
  }): Promise<BuilderData> =>
    post.layout === 'custom' && isBuilderData(post.canvas)
      ? post.canvas
      : postTemplatesService.resolveForPost(post),

  getDraftById: async (postId: string) =>
    loadPost(and(isNull(posts.deletedAt), eq(posts.id, postId)), 'draft'),

  blogIndexUrl,

  getRouteById: async (id: string) => {
    const [row] = await db
      .select({ slug: posts.slug, language: posts.language })
      .from(posts)
      .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
      .limit(1);
    return row ?? null;
  },

  /** Categories and tags used by at least one published post, for filter dropdowns. */
  taxonomy: cache(async (language?: string | null) => {
    const scope = and(
      await published(),
      language ? eq(posts.language, language) : undefined
    );
    const [categoryRows, tagRows] = await Promise.all([
      db
        .selectDistinct({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        })
        .from(categories)
        .innerJoin(postCategories, eq(postCategories.categoryId, categories.id))
        .innerJoin(posts, eq(posts.id, postCategories.postId))
        .where(and(scope, isNull(categories.deletedAt)))
        .orderBy(asc(categories.name)),
      db
        .selectDistinct({ id: tags.id, name: tags.name, slug: tags.slug })
        .from(tags)
        .innerJoin(postTags, eq(postTags.tagId, tags.id))
        .innerJoin(posts, eq(posts.id, postTags.postId))
        .where(and(scope, isNull(tags.deletedAt)))
        .orderBy(asc(tags.name)),
    ]);
    return { categories: categoryRows, tags: tagRows };
  }),

  listPublishedForSitemap: async () =>
    db
      .select({
        id: posts.id,
        slug: posts.slug,
        language: posts.language,
        updatedAt: posts.updatedAt,
        publishedAt: posts.publishedAt,
        translationGroupId: posts.translationGroupId,
        noIndex: postSeo.noIndex,
      })
      .from(posts)
      .leftJoin(postSeo, eq(postSeo.postId, posts.id))
      .where(await published()),
};

export type PublicPost = NonNullable<
  Awaited<ReturnType<typeof blogService.getPublished>>
>;
