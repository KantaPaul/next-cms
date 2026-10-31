import 'server-only';
import {
  type ListingQueryConfig,
  type ListingQueryResult,
  listingQuerySchema,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  type NormalizedListingItem,
  type QueryFilter,
} from '@nextcms/builder-core';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { PAGES } from '@/config/pages';
import { db } from '@/db';
import {
  categories,
  collectionEntries,
  collections,
  pageCategories,
  pages,
  pageTags,
  postCategories,
  posts,
  postTags,
  tags,
  users,
  videos,
} from '@/db/schema';
import { siteHref } from '@/lib/utils/site-href';
import {
  type ResolvedSite,
  siteContext,
  siteSlugPrefix,
} from '@/server/services/site-context';

export interface ListingQueryOptions {
  site?: ResolvedSite;
  language?: string;
  currentId?: string;
}

export const listingQueryService = {
  /**
   * Resolves a listing query configuration against the database with strict
   * site, locale, published, and access boundaries (R572 / QRY-02).
   */
  resolve: async (
    rawConfig: unknown,
    options?: ListingQueryOptions
  ): Promise<ListingQueryResult> => {
    const config: ListingQueryConfig = listingQuerySchema.parse(rawConfig);
    const site = options?.site ?? (await siteContext.publicSite());
    const language = options?.language ?? site.defaultLocale;
    const currentId = options?.currentId ?? config.currentId;

    const pageSize = Math.min(
      Math.max(config.limit ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const page = Math.max(config.page ?? 1, 1);
    const offset = config.offset > 0 ? config.offset : (page - 1) * pageSize;

    switch (config.source) {
      case 'posts':
        return resolvePosts(config, site, language, currentId, pageSize, offset);
      case 'pages':
        return resolvePages(config, site, language, currentId, pageSize, offset);
      case 'collection-entries':
        return resolveCollectionEntries(
          config,
          site,
          currentId,
          pageSize,
          offset
        );
      case 'videos':
        return resolveVideos(config, site, currentId, pageSize, offset);
    }
  },
};

// ---------------------------------------------------------------------------
// Source Resolvers
// ---------------------------------------------------------------------------

async function resolvePosts(
  config: ListingQueryConfig,
  site: ResolvedSite,
  language: string,
  currentId: string | undefined,
  pageSize: number,
  offset: number
): Promise<ListingQueryResult> {
  const now = new Date();
  const conditions: (SQL | undefined)[] = [
    eq(posts.siteId, site.id),
    eq(posts.language, language),
    eq(posts.status, 'published'),
    lte(posts.publishedAt, now),
    isNull(posts.deletedAt),
    eq(posts.visibility, 'public'),
  ];

  if (config.excludeCurrent && currentId) {
    conditions.push(ne(posts.id, currentId));
  }

  for (const filter of config.filters) {
    applyFilter(conditions, filter, {
      search: val =>
        or(
          ilike(posts.title, `%${val}%`),
          ilike(posts.excerpt, `%${val}%`)
        ),
      authorId: val => eq(posts.createdBy, String(val)),
      publishedAfter: val => gte(posts.publishedAt, new Date(String(val))),
      publishedBefore: val => lte(posts.publishedAt, new Date(String(val))),
      categories: val => {
        const values = Array.isArray(val) ? val.map(String) : [String(val)];
        const subquery = db
          .select({ postId: postCategories.postId })
          .from(postCategories)
          .innerJoin(categories, eq(categories.id, postCategories.categoryId))
          .where(
            or(
              inArray(postCategories.categoryId, values),
              inArray(categories.slug, values)
            )
          );
        return inArray(posts.id, subquery);
      },
      tags: val => {
        const values = Array.isArray(val) ? val.map(String) : [String(val)];
        const subquery = db
          .select({ postId: postTags.postId })
          .from(postTags)
          .innerJoin(tags, eq(tags.id, postTags.tagId))
          .where(
            or(
              inArray(postTags.tagId, values),
              inArray(tags.slug, values)
            )
          );
        return inArray(posts.id, subquery);
      },
    });
  }

  const where = and(...conditions);

  // Sorting
  const sortOrder = config.sortOrder === 'asc' ? asc : desc;
  let orderByClause: SQL[];
  if (config.sortField === 'title') {
    orderByClause = [sortOrder(posts.title)];
  } else if (config.sortField === 'createdAt') {
    orderByClause = [sortOrder(posts.createdAt)];
  } else if (config.sortField === 'updatedAt') {
    orderByClause = [sortOrder(posts.updatedAt)];
  } else {
    // default publishedAt
    orderByClause = [sortOrder(posts.publishedAt), sortOrder(posts.createdAt)];
  }

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        featuredImage: posts.featuredImage,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        language: posts.language,
        authorId: users.id,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(posts)
      .leftJoin(users, eq(users.id, posts.createdBy))
      .where(where)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(posts).where(where),
  ]);

  const postIds = rows.map(r => r.id);
  const termsMap = await loadPostTerms(postIds);

  const prefix = siteSlugPrefix(site);
  const items: NormalizedListingItem[] = rows.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    url: PAGES.SITE.post(r.slug, r.language, site.defaultLocale, prefix),
    excerpt: r.excerpt,
    image: r.featuredImage,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    author: r.authorId
      ? {
          id: r.authorId,
          name: r.authorName ?? 'Anonymous',
          image: r.authorImage,
        }
      : null,
    terms: termsMap.get(r.id) ?? [],
    source: 'posts',
    raw: {
      createdAt: r.createdAt?.toISOString(),
      updatedAt: r.updatedAt?.toISOString(),
    },
  }));

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  return {
    items,
    total,
    page: Math.floor(offset / pageSize) + 1,
    pageSize,
    totalPages,
    hasMore: offset + items.length < total,
  };
}

async function resolvePages(
  config: ListingQueryConfig,
  site: ResolvedSite,
  language: string,
  currentId: string | undefined,
  pageSize: number,
  offset: number
): Promise<ListingQueryResult> {
  const conditions: (SQL | undefined)[] = [
    eq(pages.siteId, site.id),
    eq(pages.language, language),
    eq(pages.status, 'published'),
    isNull(pages.deletedAt),
    eq(pages.visibility, 'public'),
  ];

  if (config.excludeCurrent && currentId) {
    conditions.push(ne(pages.id, currentId));
  }

  for (const filter of config.filters) {
    applyFilter(conditions, filter, {
      search: val => ilike(pages.title, `%${val}%`),
      authorId: val => eq(pages.createdBy, String(val)),
      publishedAfter: val => gte(pages.publishedAt, new Date(String(val))),
      publishedBefore: val => lte(pages.publishedAt, new Date(String(val))),
      categories: val => {
        const values = Array.isArray(val) ? val.map(String) : [String(val)];
        const subquery = db
          .select({ pageId: pageCategories.pageId })
          .from(pageCategories)
          .innerJoin(categories, eq(categories.id, pageCategories.categoryId))
          .where(
            or(
              inArray(pageCategories.categoryId, values),
              inArray(categories.slug, values)
            )
          );
        return inArray(pages.id, subquery);
      },
      tags: val => {
        const values = Array.isArray(val) ? val.map(String) : [String(val)];
        const subquery = db
          .select({ pageId: pageTags.pageId })
          .from(pageTags)
          .innerJoin(tags, eq(tags.id, pageTags.tagId))
          .where(
            or(
              inArray(pageTags.tagId, values),
              inArray(tags.slug, values)
            )
          );
        return inArray(pages.id, subquery);
      },
    });
  }

  const where = and(...conditions);

  const sortOrder = config.sortOrder === 'asc' ? asc : desc;
  let orderByClause: SQL[];
  if (config.sortField === 'title') {
    orderByClause = [sortOrder(pages.title)];
  } else if (config.sortField === 'createdAt') {
    orderByClause = [sortOrder(pages.createdAt)];
  } else if (config.sortField === 'updatedAt') {
    orderByClause = [sortOrder(pages.updatedAt)];
  } else {
    orderByClause = [sortOrder(pages.publishedAt), sortOrder(pages.createdAt)];
  }

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        isHome: pages.isHome,
        publishedAt: pages.publishedAt,
        createdAt: pages.createdAt,
        updatedAt: pages.updatedAt,
        language: pages.language,
        authorId: users.id,
        authorName: users.name,
        authorImage: users.image,
      })
      .from(pages)
      .leftJoin(users, eq(users.id, pages.createdBy))
      .where(where)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(pages).where(where),
  ]);

  const prefix = siteSlugPrefix(site);
  const items: NormalizedListingItem[] = rows.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    url: PAGES.SITE.page(
      r.slug,
      r.language,
      r.isHome,
      site.defaultLocale,
      prefix
    ),
    excerpt: null,
    image: null,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    author: r.authorId
      ? {
          id: r.authorId,
          name: r.authorName ?? 'Anonymous',
          image: r.authorImage,
        }
      : null,
    terms: [],
    source: 'pages',
    raw: {
      isHome: r.isHome,
      createdAt: r.createdAt?.toISOString(),
      updatedAt: r.updatedAt?.toISOString(),
    },
  }));

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  return {
    items,
    total,
    page: Math.floor(offset / pageSize) + 1,
    pageSize,
    totalPages,
    hasMore: offset + items.length < total,
  };
}

async function resolveCollectionEntries(
  config: ListingQueryConfig,
  site: ResolvedSite,
  currentId: string | undefined,
  pageSize: number,
  offset: number
): Promise<ListingQueryResult> {
  const collectionId = config.collectionId!;

  // Look up collection metadata
  const [collection] = await db
    .select({ id: collections.id, slug: collections.slug, name: collections.name })
    .from(collections)
    .where(and(eq(collections.id, collectionId), eq(collections.siteId, site.id)))
    .limit(1);

  if (!collection) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
      hasMore: false,
    };
  }

  const conditions: (SQL | undefined)[] = [
    eq(collectionEntries.siteId, site.id),
    eq(collectionEntries.collectionId, collectionId),
    eq(collectionEntries.status, 'published'),
    isNull(collectionEntries.deletedAt),
  ];

  if (config.excludeCurrent && currentId) {
    conditions.push(ne(collectionEntries.id, currentId));
  }

  for (const filter of config.filters) {
    applyFilter(conditions, filter, {
      search: val =>
        or(
          ilike(collectionEntries.slug, `%${val}%`),
          sql`${collectionEntries.data}::text ILIKE ${'%' + val + '%'}`
        ),
      publishedAfter: val =>
        gte(collectionEntries.publishedAt, new Date(String(val))),
      publishedBefore: val =>
        lte(collectionEntries.publishedAt, new Date(String(val))),
    });
  }

  const where = and(...conditions);
  const sortOrder = config.sortOrder === 'asc' ? asc : desc;
  let orderByClause: SQL[];
  if (config.sortField === 'createdAt') {
    orderByClause = [sortOrder(collectionEntries.createdAt)];
  } else if (config.sortField === 'updatedAt') {
    orderByClause = [sortOrder(collectionEntries.updatedAt)];
  } else {
    orderByClause = [
      sortOrder(collectionEntries.publishedAt),
      sortOrder(collectionEntries.createdAt),
    ];
  }

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: collectionEntries.id,
        slug: collectionEntries.slug,
        data: collectionEntries.data,
        publishedAt: collectionEntries.publishedAt,
        createdAt: collectionEntries.createdAt,
        updatedAt: collectionEntries.updatedAt,
      })
      .from(collectionEntries)
      .where(where)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(collectionEntries).where(where),
  ]);

  const prefix = siteSlugPrefix(site);
  const items: NormalizedListingItem[] = rows.map(r => {
    const data = (r.data as Record<string, unknown>) ?? {};
    const title =
      String(data.title || data.name || data.label || r.slug || 'Untitled');
    const excerpt = data.description || data.excerpt || data.summary;
    const image = data.image || data.thumbnail || data.cover;

    return {
      id: r.id,
      title,
      slug: r.slug,
      url: siteHref(`/collections/${collection.slug}/${r.slug}`, prefix),
      excerpt: typeof excerpt === 'string' ? excerpt : null,
      image: typeof image === 'string' ? image : null,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      terms: [],
      source: 'collection-entries',
      raw: {
        ...data,
        createdAt: r.createdAt?.toISOString(),
        updatedAt: r.updatedAt?.toISOString(),
      },
    };
  });

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  return {
    items,
    total,
    page: Math.floor(offset / pageSize) + 1,
    pageSize,
    totalPages,
    hasMore: offset + items.length < total,
  };
}

async function resolveVideos(
  config: ListingQueryConfig,
  site: ResolvedSite,
  currentId: string | undefined,
  pageSize: number,
  offset: number
): Promise<ListingQueryResult> {
  const conditions: (SQL | undefined)[] = [
    eq(videos.siteId, site.id),
    eq(videos.status, 'published'),
    isNull(videos.deletedAt),
    eq(videos.visibility, 'public'),
  ];

  if (config.excludeCurrent && currentId) {
    conditions.push(ne(videos.id, currentId));
  }

  for (const filter of config.filters) {
    applyFilter(conditions, filter, {
      search: val => ilike(videos.title, `%${val}%`),
      playlistId: val => eq(videos.playlistId, String(val)),
      provider: val => eq(videos.provider, String(val)),
      publishedAfter: val => gte(videos.publishedAt, new Date(String(val))),
      publishedBefore: val => lte(videos.publishedAt, new Date(String(val))),
    });
  }

  const where = and(...conditions);
  const sortOrder = config.sortOrder === 'asc' ? asc : desc;
  let orderByClause: SQL[];
  if (config.sortField === 'title') {
    orderByClause = [sortOrder(videos.title)];
  } else if (config.sortField === 'position') {
    orderByClause = [sortOrder(videos.position)];
  } else if (config.sortField === 'duration') {
    orderByClause = [sortOrder(videos.duration)];
  } else if (config.sortField === 'createdAt') {
    orderByClause = [sortOrder(videos.createdAt)];
  } else {
    orderByClause = [sortOrder(videos.publishedAt), sortOrder(videos.createdAt)];
  }

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: videos.id,
        title: videos.title,
        slug: videos.slug,
        url: videos.url,
        provider: videos.provider,
        thumbnailUrl: videos.thumbnailUrl,
        duration: videos.duration,
        position: videos.position,
        publishedAt: videos.publishedAt,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
      })
      .from(videos)
      .where(where)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(videos).where(where),
  ]);

  const prefix = siteSlugPrefix(site);
  const items: NormalizedListingItem[] = rows.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    url: siteHref(`/videos/${r.slug}`, prefix),
    excerpt: null,
    image: r.thumbnailUrl,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    terms: [],
    source: 'videos',
    raw: {
      provider: r.provider,
      videoUrl: r.url,
      duration: r.duration,
      position: r.position,
      createdAt: r.createdAt?.toISOString(),
      updatedAt: r.updatedAt?.toISOString(),
    },
  }));

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  return {
    items,
    total,
    page: Math.floor(offset / pageSize) + 1,
    pageSize,
    totalPages,
    hasMore: offset + items.length < total,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyFilter(
  conditions: (SQL | undefined)[],
  filter: QueryFilter,
  handlers: Record<string, (val: unknown) => SQL | undefined>
) {
  const handler = handlers[filter.field];
  if (handler) {
    const clause = handler(filter.value);
    if (clause) conditions.push(clause);
  }
}

async function loadPostTerms(postIds: string[]) {
  const termsMap = new Map<
    string,
    { id: string; name: string; slug: string; taxonomy: 'category' | 'tag' }[]
  >();
  if (postIds.length === 0) return termsMap;

  const [catRows, tagRows] = await Promise.all([
    db
      .select({
        postId: postCategories.postId,
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(postCategories)
      .innerJoin(categories, eq(categories.id, postCategories.categoryId))
      .where(inArray(postCategories.postId, postIds)),
    db
      .select({
        postId: postTags.postId,
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(postTags)
      .innerJoin(tags, eq(tags.id, postTags.tagId))
      .where(inArray(postTags.postId, postIds)),
  ]);

  for (const cat of catRows) {
    const list = termsMap.get(cat.postId) ?? [];
    list.push({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      taxonomy: 'category',
    });
    termsMap.set(cat.postId, list);
  }

  for (const tag of tagRows) {
    const list = termsMap.get(tag.postId) ?? [];
    list.push({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      taxonomy: 'tag',
    });
    termsMap.set(tag.postId, list);
  }

  return termsMap;
}
