import 'server-only';
import {
  type ListingFacets,
  type ListingQueryConfig,
  type ListingQueryResult,
  type ListingSource,
  listingQuerySchema,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  type NormalizedListingItem,
  type QueryFilter,
  fieldSortKey,
} from '@nextcms/builder-core';
import { fieldFilterSql, fieldSortSql } from '@/server/services/listing-field-filters';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { PAGES } from '@/config/pages';
import {
  entryFeaturedMedia,
  entryGalleryMedia,
  entryTitle,
} from '@/config/post-types';
import { db } from '@/db';
import {
  categories,
  collectionEntries,
  collectionEntryTerms,
  collectionFields,
  collections,
  collectionTaxonomies,
  collectionTerms,
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
  includeFacets?: boolean;
  skipCache?: boolean;
}

// ---------------------------------------------------------------------------
// Listing & Search Result Cache (R598 / QRY-28)
// ---------------------------------------------------------------------------

interface CacheEntry {
  result: ListingQueryResult;
  expiresAt: number;
  siteId: string;
  language: string;
  source: ListingSource;
}

const LISTING_CACHE_TTL_MS = 60_000;
const listingCache = new Map<string, CacheEntry>();

export function buildListingCacheKey(
  siteId: string,
  language: string,
  config: ListingQueryConfig,
  currentId?: string,
  includeFacets?: boolean
): string {
  return JSON.stringify({
    siteId,
    language,
    config,
    currentId: currentId ?? null,
    includeFacets: Boolean(includeFacets),
  });
}

/**
 * Revalidates cached listing and search results for a site (and optional source)
 * when content is published, updated, or deleted (R598 / QRY-28).
 */
export function invalidateListingCache(
  siteId?: string,
  source?: ListingSource
): void {
  for (const [key, entry] of listingCache.entries()) {
    if (!siteId || entry.siteId === siteId) {
      if (!source || entry.source === source) {
        listingCache.delete(key);
      }
    }
  }
  try {
    if (siteId) {
      revalidateTag(`listing:${siteId}`, 'max');
      revalidateTag(`search:${siteId}`, 'max');
      if (source) {
        revalidateTag(`listing:${siteId}:${source}`, 'max');
      }
    } else {
      revalidateTag('listing', 'max');
      revalidateTag('search', 'max');
    }
  } catch {
    // Next.js revalidateTag may throw outside request/action contexts (e.g. unit tests)
  }
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
    const includeFacets = options?.includeFacets ?? false;

    const cacheKey = buildListingCacheKey(
      site.id,
      language,
      config,
      currentId,
      includeFacets
    );

    if (!options?.skipCache) {
      const cached = listingCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.result;
      }
    }

    const pageSize = Math.min(
      Math.max(config.limit ?? DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE
    );
    const page = Math.max(config.page ?? 1, 1);
    const offset = config.offset > 0 ? config.offset : (page - 1) * pageSize;

    let result: ListingQueryResult;
    switch (config.source) {
      case 'posts':
        result = await resolvePosts(
          config,
          site,
          language,
          currentId,
          pageSize,
          offset,
          includeFacets
        );
        break;
      case 'pages':
        result = await resolvePages(
          config,
          site,
          language,
          currentId,
          pageSize,
          offset,
          includeFacets
        );
        break;
      case 'collection-entries':
        result = await resolveCollectionEntries(
          config,
          site,
          language,
          currentId,
          pageSize,
          offset,
          includeFacets
        );
        break;
      case 'videos':
        result = await resolveVideos(
          config,
          site,
          currentId,
          pageSize,
          offset,
          includeFacets
        );
        break;
    }

    if (!options?.skipCache) {
      listingCache.set(cacheKey, {
        result,
        expiresAt: Date.now() + LISTING_CACHE_TTL_MS,
        siteId: site.id,
        language,
        source: config.source,
      });
    }

    return result;
  },
  invalidateCache: invalidateListingCache,
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
  offset: number,
  includeFacets = false
): Promise<ListingQueryResult> {
  const now = new Date();
  const baseConditions: (SQL | undefined)[] = [
    eq(posts.siteId, site.id),
    eq(posts.language, language),
    eq(posts.status, 'published'),
    lte(posts.publishedAt, now),
    isNull(posts.deletedAt),
    eq(posts.visibility, 'public'),
  ];

  if (config.excludeCurrent && currentId) {
    baseConditions.push(ne(posts.id, currentId));
  }

  const conditions: (SQL | undefined)[] = [...baseConditions];

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
      hasImage: val => {
        const wantImage = val === true || val === 'true' || val === '1' || val === 1;
        return wantImage ? isNotNull(posts.featuredImage) : isNull(posts.featuredImage);
      },
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

  const [rows, [{ total }], facets] = await Promise.all([
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
    includeFacets ? computePostFacets(and(...baseConditions)) : Promise.resolve(undefined),
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
    ...(facets ? { facets } : {}),
  };
}

async function resolvePages(
  config: ListingQueryConfig,
  site: ResolvedSite,
  language: string,
  currentId: string | undefined,
  pageSize: number,
  offset: number,
  includeFacets = false
): Promise<ListingQueryResult> {
  const baseConditions: (SQL | undefined)[] = [
    eq(pages.siteId, site.id),
    eq(pages.language, language),
    eq(pages.status, 'published'),
    isNull(pages.deletedAt),
    eq(pages.visibility, 'public'),
  ];

  if (config.excludeCurrent && currentId) {
    baseConditions.push(ne(pages.id, currentId));
  }

  const conditions: (SQL | undefined)[] = [...baseConditions];

  for (const filter of config.filters) {
    applyFilter(conditions, filter, {
      search: val => ilike(pages.title, `%${val}%`),
      authorId: val => eq(pages.createdBy, String(val)),
      publishedAfter: val => gte(pages.publishedAt, new Date(String(val))),
      publishedBefore: val => lte(pages.publishedAt, new Date(String(val))),
      isHome: val => {
        const wantHome = val === true || val === 'true' || val === '1' || val === 1;
        return eq(pages.isHome, wantHome);
      },
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

  const [rows, [{ total }], facets] = await Promise.all([
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
    includeFacets ? computePageFacets(and(...baseConditions)) : Promise.resolve(undefined),
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
    ...(facets ? { facets } : {}),
  };
}

async function resolveCollectionEntries(
  config: ListingQueryConfig,
  site: ResolvedSite,
  language: string,
  currentId: string | undefined,
  pageSize: number,
  offset: number,
  includeFacets = false
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
    // Only entries in the language being rendered, like posts and pages.
    eq(collectionEntries.language, language),
    eq(collectionEntries.status, 'published'),
    isNull(collectionEntries.deletedAt),
  ];

  if (config.excludeCurrent && currentId) {
    conditions.push(ne(collectionEntries.id, currentId));
  }
  // Facet counts use the loop's scope before the visitor's filters (like posts).
  const baseConditions = [...conditions];

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
      terms: val => {
        const values = Array.isArray(val) ? val.map(String) : [String(val)];
        const subquery = db
          .select({ entryId: collectionEntryTerms.entryId })
          .from(collectionEntryTerms)
          .innerJoin(
            collectionTerms,
            eq(collectionTerms.id, collectionEntryTerms.termId)
          )
          .where(
            and(
              isNull(collectionTerms.deletedAt),
              or(
                inArray(collectionEntryTerms.termId, values),
                inArray(collectionTerms.slug, values)
              )
            )
          );
        return inArray(collectionEntries.id, subquery);
      },
      categories: val => {
        const values = Array.isArray(val) ? val.map(String) : [String(val)];
        const subquery = db
          .select({ entryId: collectionEntryTerms.entryId })
          .from(collectionEntryTerms)
          .innerJoin(
            collectionTerms,
            eq(collectionTerms.id, collectionEntryTerms.termId)
          )
          .where(
            and(
              isNull(collectionTerms.deletedAt),
              or(
                inArray(collectionEntryTerms.termId, values),
                inArray(collectionTerms.slug, values)
              )
            )
          );
        return inArray(collectionEntries.id, subquery);
      },
      tags: val => {
        const values = Array.isArray(val) ? val.map(String) : [String(val)];
        const subquery = db
          .select({ entryId: collectionEntryTerms.entryId })
          .from(collectionEntryTerms)
          .innerJoin(
            collectionTerms,
            eq(collectionTerms.id, collectionEntryTerms.termId)
          )
          .where(
            and(
              isNull(collectionTerms.deletedAt),
              or(
                inArray(collectionEntryTerms.termId, values),
                inArray(collectionTerms.slug, values)
              )
            )
          );
        return inArray(collectionEntries.id, subquery);
      },
      authorId: val => eq(collectionEntries.authorId, String(val)),
      hasImage: val => {
        const wantImage = val === true || val === 'true' || val === '1' || val === 1;
        return wantImage
          ? sql`(${collectionEntries.data}->>'image' IS NOT NULL OR ${collectionEntries.data}->>'thumbnail' IS NOT NULL OR ${collectionEntries.data}->>'cover' IS NOT NULL)`
          : sql`(${collectionEntries.data}->>'image' IS NULL AND ${collectionEntries.data}->>'thumbnail' IS NULL AND ${collectionEntries.data}->>'cover' IS NULL)`;
      },
      booleanToggle: val => {
        const wantTrue = val === true || val === 'true' || val === '1' || val === 1;
        return wantTrue
          ? sql`(${collectionEntries.data}->>'featured' = 'true' OR ${collectionEntries.data}->>'active' = 'true')`
          : undefined;
      },
    });
  }

  const fieldRows = await db
    .select({
      key: collectionFields.key,
      type: collectionFields.type,
      config: collectionFields.config,
    })
    .from(collectionFields)
    .where(eq(collectionFields.collectionId, collectionId))
    .orderBy(collectionFields.position);

  for (const filter of config.fieldFilters ?? []) {
    const cond = fieldFilterSql(collectionEntries.data, fieldRows, filter);
    if (cond) conditions.push(cond);
  }

  const where = and(...conditions);
  const sortOrder = config.sortOrder === 'asc' ? asc : desc;
  const customSortKey = fieldSortKey(config.sortField);
  const customSort = customSortKey
    ? fieldSortSql(collectionEntries.data, fieldRows, customSortKey, config.sortOrder)
    : undefined;
  let orderByClause: SQL[];
  if (customSort) {
    orderByClause = [customSort, desc(collectionEntries.publishedAt)];
  } else if (config.sortField === 'createdAt') {
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
        excerpt: collectionEntries.excerpt,
        featuredImage: collectionEntries.featuredImage,
        authorId: collectionEntries.authorId,
        authorName: users.name,
        publishedAt: collectionEntries.publishedAt,
        createdAt: collectionEntries.createdAt,
        updatedAt: collectionEntries.updatedAt,
      })
      .from(collectionEntries)
      .leftJoin(users, eq(users.id, collectionEntries.authorId))
      .where(where)
      .orderBy(...orderByClause)
      .limit(pageSize)
      .offset(offset),
    db.select({ total: count() }).from(collectionEntries).where(where),
  ]);
  const facets = includeFacets
    ? await computeEntryFacets(collectionId, and(...baseConditions))
    : undefined;

  const entryIds = rows.map(r => r.id);
  const termsMap = await loadCollectionEntryTerms(entryIds);

  const prefix = siteSlugPrefix(site);
  const items: NormalizedListingItem[] = rows.map(r => {
    const data = (r.data as Record<string, unknown>) ?? {};
    const title = entryTitle(data, fieldRows) || r.slug || 'Untitled';
    const excerpt = data.description || data.excerpt || data.summary;
    const featuredFromFields = entryFeaturedMedia(data, fieldRows);
    const gallery = entryGalleryMedia(data, fieldRows);
    const image =
      featuredFromFields || (typeof r.featuredImage === 'string' ? r.featuredImage : null);
    const galleryImages = new Set<string>(gallery.images);
    if (typeof r.featuredImage === 'string' && r.featuredImage.trim()) {
      galleryImages.add(r.featuredImage.trim());
    }

    const itemTerms = termsMap.get(r.id) ?? [];

    return {
      id: r.id,
      title,
      slug: r.slug,
      // Canonical entry URL (`/collections/{type}/{entry}`), so cards don't
      // bounce through the short-URL redirect.
      url: siteHref(
        PAGES.SITE.entry(collection.slug, r.slug, language, site.defaultLocale),
        prefix
      ),
      excerpt:
        (r.excerpt as string) || (typeof excerpt === 'string' ? excerpt : null),
      image,
      hasGallery: galleryImages.size > 1,
      galleryCount: galleryImages.size,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      author: r.authorId
        ? { id: r.authorId, name: r.authorName ?? 'Anonymous' }
        : null,
      terms: itemTerms,
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
    ...(facets ? { facets } : {}),
  };
}

/**
 * Filter options for a post type: terms of its hierarchical taxonomies as
 * "categories", of its flat ones as "tags", plus authors, each with how many
 * entries in scope use it.
 */
async function computeEntryFacets(
  collectionId: string,
  baseScope: SQL | undefined
): Promise<ListingFacets> {
  const termRows = (hierarchical: boolean) =>
    db
      .select({
        slug: collectionTerms.slug,
        name: collectionTerms.name,
        total: count(collectionEntries.id),
      })
      .from(collectionTerms)
      .innerJoin(
        collectionTaxonomies,
        eq(collectionTaxonomies.id, collectionTerms.taxonomyId)
      )
      .innerJoin(
        collectionEntryTerms,
        eq(collectionEntryTerms.termId, collectionTerms.id)
      )
      .innerJoin(
        collectionEntries,
        eq(collectionEntries.id, collectionEntryTerms.entryId)
      )
      .where(
        and(
          baseScope,
          eq(collectionTaxonomies.collectionId, collectionId),
          eq(collectionTaxonomies.hierarchical, hierarchical),
          isNull(collectionTerms.deletedAt)
        )
      )
      .groupBy(collectionTerms.id, collectionTerms.slug, collectionTerms.name)
      .orderBy(asc(collectionTerms.name));

  const [catRows, tagRows, authorRows] = await Promise.all([
    termRows(true),
    termRows(false),
    db
      .select({
        id: users.id,
        name: users.name,
        total: count(collectionEntries.id),
      })
      .from(users)
      .innerJoin(collectionEntries, eq(collectionEntries.authorId, users.id))
      .where(baseScope)
      .groupBy(users.id, users.name)
      .orderBy(asc(users.name)),
  ]);

  const toOptions = (rows: { slug: string; name: string; total: number }[]) =>
    rows.map(r => ({ value: r.slug, label: r.name, count: Number(r.total) }));
  return {
    categories: toOptions(catRows),
    tags: toOptions(tagRows),
    authors: authorRows.map(r => ({
      value: r.id,
      label: r.name ?? 'Anonymous',
      count: Number(r.total),
    })),
  };
}

async function resolveVideos(
  config: ListingQueryConfig,
  site: ResolvedSite,
  currentId: string | undefined,
  pageSize: number,
  offset: number,
  includeFacets = false
): Promise<ListingQueryResult> {
  const baseConditions: (SQL | undefined)[] = [
    eq(videos.siteId, site.id),
    eq(videos.status, 'published'),
    isNull(videos.deletedAt),
    eq(videos.visibility, 'public'),
  ];

  if (config.excludeCurrent && currentId) {
    baseConditions.push(ne(videos.id, currentId));
  }

  const conditions: (SQL | undefined)[] = [...baseConditions];

  for (const filter of config.filters) {
    applyFilter(conditions, filter, {
      search: val => ilike(videos.title, `%${val}%`),
      playlistId: val => eq(videos.playlistId, String(val)),
      provider: val => eq(videos.provider, String(val)),
      publishedAfter: val => gte(videos.publishedAt, new Date(String(val))),
      publishedBefore: val => lte(videos.publishedAt, new Date(String(val))),
      hasImage: val => {
        const wantImage = val === true || val === 'true' || val === '1' || val === 1;
        return wantImage ? isNotNull(videos.thumbnailUrl) : isNull(videos.thumbnailUrl);
      },
      minNumber: val => {
        const num = Number(val);
        return !Number.isNaN(num) ? gte(videos.duration, num) : undefined;
      },
      maxNumber: val => {
        const num = Number(val);
        return !Number.isNaN(num) ? lte(videos.duration, num) : undefined;
      },
      duration: val => {
        if (Array.isArray(val) && val.length === 2) {
          const min = Number(val[0]);
          const max = Number(val[1]);
          if (!Number.isNaN(min) && !Number.isNaN(max)) {
            return and(gte(videos.duration, min), lte(videos.duration, max));
          }
        }
        const num = Number(val);
        return !Number.isNaN(num) ? lte(videos.duration, num) : undefined;
      },
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

  const [rows, [{ total }], facets] = await Promise.all([
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
    includeFacets ? computeVideoFacets(and(...baseConditions)) : Promise.resolve(undefined),
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
    ...(facets ? { facets } : {}),
  };
}

// ---------------------------------------------------------------------------
// Facet Counters (R583 / QRY-13)
// ---------------------------------------------------------------------------

async function computePostFacets(baseScope: SQL | undefined): Promise<ListingFacets> {
  const [catRows, tagRows, authorRows] = await Promise.all([
    db
      .select({
        slug: categories.slug,
        name: categories.name,
        total: count(posts.id),
      })
      .from(categories)
      .innerJoin(postCategories, eq(postCategories.categoryId, categories.id))
      .innerJoin(posts, eq(posts.id, postCategories.postId))
      .where(and(baseScope, isNull(categories.deletedAt)))
      .groupBy(categories.id, categories.slug, categories.name)
      .orderBy(asc(categories.name)),
    db
      .select({
        slug: tags.slug,
        name: tags.name,
        total: count(posts.id),
      })
      .from(tags)
      .innerJoin(postTags, eq(postTags.tagId, tags.id))
      .innerJoin(posts, eq(posts.id, postTags.postId))
      .where(and(baseScope, isNull(tags.deletedAt)))
      .groupBy(tags.id, tags.slug, tags.name)
      .orderBy(asc(tags.name)),
    db
      .select({
        id: users.id,
        name: users.name,
        total: count(posts.id),
      })
      .from(users)
      .innerJoin(posts, eq(posts.createdBy, users.id))
      .where(baseScope)
      .groupBy(users.id, users.name)
      .orderBy(asc(users.name)),
  ]);

  return {
    categories: catRows.map(r => ({
      value: r.slug,
      label: r.name,
      count: Number(r.total),
    })),
    tags: tagRows.map(r => ({
      value: r.slug,
      label: r.name,
      count: Number(r.total),
    })),
    authors: authorRows.map(r => ({
      value: r.id,
      label: r.name ?? 'Anonymous',
      count: Number(r.total),
    })),
  };
}

async function computePageFacets(baseScope: SQL | undefined): Promise<ListingFacets> {
  const [catRows, tagRows] = await Promise.all([
    db
      .select({
        slug: categories.slug,
        name: categories.name,
        total: count(pages.id),
      })
      .from(categories)
      .innerJoin(pageCategories, eq(pageCategories.categoryId, categories.id))
      .innerJoin(pages, eq(pages.id, pageCategories.pageId))
      .where(and(baseScope, isNull(categories.deletedAt)))
      .groupBy(categories.id, categories.slug, categories.name)
      .orderBy(asc(categories.name)),
    db
      .select({
        slug: tags.slug,
        name: tags.name,
        total: count(pages.id),
      })
      .from(tags)
      .innerJoin(pageTags, eq(pageTags.tagId, tags.id))
      .innerJoin(pages, eq(pages.id, pageTags.pageId))
      .where(and(baseScope, isNull(tags.deletedAt)))
      .groupBy(tags.id, tags.slug, tags.name)
      .orderBy(asc(tags.name)),
  ]);

  return {
    categories: catRows.map(r => ({
      value: r.slug,
      label: r.name,
      count: Number(r.total),
    })),
    tags: tagRows.map(r => ({
      value: r.slug,
      label: r.name,
      count: Number(r.total),
    })),
  };
}

async function computeVideoFacets(baseScope: SQL | undefined): Promise<ListingFacets> {
  const providerRows = await db
    .select({
      provider: videos.provider,
      total: count(videos.id),
    })
    .from(videos)
    .where(baseScope)
    .groupBy(videos.provider)
    .orderBy(asc(videos.provider));

  return {
    providers: providerRows.map(r => ({
      value: r.provider,
      label: r.provider,
      count: Number(r.total),
    })),
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

async function loadCollectionEntryTerms(entryIds: string[]) {
  const termsMap = new Map<
    string,
    { id: string; name: string; slug: string; taxonomy: string }[]
  >();
  if (entryIds.length === 0) return termsMap;

  const rows = await db
    .select({
      entryId: collectionEntryTerms.entryId,
      id: collectionTerms.id,
      name: collectionTerms.name,
      slug: collectionTerms.slug,
      taxonomyKey: collectionTaxonomies.key,
    })
    .from(collectionEntryTerms)
    .innerJoin(
      collectionTerms,
      eq(collectionTerms.id, collectionEntryTerms.termId)
    )
    .innerJoin(
      collectionTaxonomies,
      eq(collectionTaxonomies.id, collectionTerms.taxonomyId)
    )
    .where(
      and(
        inArray(collectionEntryTerms.entryId, entryIds),
        isNull(collectionTerms.deletedAt)
      )
    );

  for (const row of rows) {
    const list = termsMap.get(row.entryId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      taxonomy: row.taxonomyKey,
    });
    termsMap.set(row.entryId, list);
  }

  return termsMap;
}
