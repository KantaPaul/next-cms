import 'server-only';
import { createId } from '@paralleldrive/cuid2';
import { and, count, desc, eq, gte, ilike, or, sql } from 'drizzle-orm';
import { PAGES } from '@/config/pages';
import { db } from '@/db';
import {
  collectionEntries,
  collections,
  DEFAULT_SEARCH_SETTINGS,
  pageContents,
  pages,
  postContents,
  posts,
  type SearchSettings,
  searchDocuments,
  searchQueries,
  siteSettings,
  videos,
} from '@/db/schema';
import {
  buildPrefixTsQuery,
  extractDocumentText,
  getPostgresTextSearchConfig,
  highlightTextSnippet,
  matchPinnedResults,
  normalizeSearchQueryLog,
  type SearchDocumentKind,
  stripAccents,
  stripHtml,
} from '@/lib/search-text';
import type { DBTrx } from '@/lib/types';
import { siteHref } from '@/lib/utils/site-href';
import { invalidateListingCache } from '@/server/services/listing-query.service';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';

export {
  buildPrefixTsQuery,
  getPostgresTextSearchConfig,
  highlightTextSnippet,
  matchPinnedResults,
  normalizeSearchQueryLog,
  stripAccents,
  type SearchDocumentKind,
};

type Orm = DBTrx;

export interface SearchDocumentPayload {
  kind: SearchDocumentKind;
  siteId: string;
  pageId?: string | null;
  postId?: string | null;
  collectionEntryId?: string | null;
  videoId?: string | null;
  title: string;
  path: string;
  language: string;
  body: string;
  thumbnailUrl?: string | null;
}

export interface SearchResultItem {
  kind: SearchDocumentKind;
  title: string;
  path: string;
  language: string;
  snippet: string;
  highlightedSnippet: string;
  thumbnailUrl?: string | null;
  pinned?: boolean;
}

export interface SearchCountsByKind {
  all: number;
  page: number;
  post: number;
  collection: number;
  video: number;
}

export interface PaginatedSearchResponse {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  countsByKind: SearchCountsByKind;
  usedTrigramFallback: boolean;
}

export interface SearchQueryInput {
  q: string;
  language?: string | null;
  kind?: 'all' | SearchDocumentKind | null;
  page?: number;
  limit?: number;
  siteId?: string | null;
  recordAnalytics?: boolean;
}

// ---------------------------------------------------------------------------
// SearchAdapter Interface (R594 / QRY-24)
// ---------------------------------------------------------------------------

export interface SearchAdapter {
  indexDocument(doc: SearchDocumentPayload, orm?: Orm): Promise<void>;
  removeDocument(
    target: {
      kind: SearchDocumentKind;
      id: string;
    },
    orm?: Orm
  ): Promise<void>;
  search(input: SearchQueryInput): Promise<PaginatedSearchResponse>;
  suggest(input: {
    q: string;
    language?: string | null;
    limit?: number;
    siteId?: string | null;
  }): Promise<SearchResultItem[]>;
}

async function loadSiteSearchSettings(siteId: string): Promise<SearchSettings> {
  try {
    const [row] = await db
      .select({ searchSettings: siteSettings.searchSettings })
      .from(siteSettings)
      .where(eq(siteSettings.siteId, siteId))
      .limit(1);
    return row?.searchSettings ?? DEFAULT_SEARCH_SETTINGS;
  } catch {
    return DEFAULT_SEARCH_SETTINGS;
  }
}

// ---------------------------------------------------------------------------
// Default Postgres SearchAdapter (R588–R594)
// ---------------------------------------------------------------------------

export class PostgresSearchAdapter implements SearchAdapter {
  async indexDocument(row: SearchDocumentPayload, orm: Orm = db): Promise<void> {
    if (row.pageId) {
      await orm
        .delete(searchDocuments)
        .where(eq(searchDocuments.pageId, row.pageId));
    }
    if (row.postId) {
      await orm
        .delete(searchDocuments)
        .where(eq(searchDocuments.postId, row.postId));
    }
    if (row.collectionEntryId) {
      await orm
        .delete(searchDocuments)
        .where(eq(searchDocuments.collectionEntryId, row.collectionEntryId));
    }
    if (row.videoId) {
      await orm
        .delete(searchDocuments)
        .where(eq(searchDocuments.videoId, row.videoId));
    }

    await orm.insert(searchDocuments).values({
      siteId: row.siteId,
      kind: row.kind,
      pageId: row.pageId ?? null,
      postId: row.postId ?? null,
      collectionEntryId: row.collectionEntryId ?? null,
      videoId: row.videoId ?? null,
      title: row.title,
      path: row.path,
      language: row.language,
      body: row.body,
      thumbnailUrl: row.thumbnailUrl ?? null,
    });
  }

  async removeDocument(
    target: { kind: SearchDocumentKind; id: string },
    orm: Orm = db
  ): Promise<void> {
    switch (target.kind) {
      case 'page':
        await orm
          .delete(searchDocuments)
          .where(eq(searchDocuments.pageId, target.id));
        break;
      case 'post':
        await orm
          .delete(searchDocuments)
          .where(eq(searchDocuments.postId, target.id));
        break;
      case 'collection':
        await orm
          .delete(searchDocuments)
          .where(eq(searchDocuments.collectionEntryId, target.id));
        break;
      case 'video':
        await orm
          .delete(searchDocuments)
          .where(eq(searchDocuments.videoId, target.id));
        break;
    }
  }

  async search(input: SearchQueryInput): Promise<PaginatedSearchResponse> {
    const query = input.q.trim();
    const pageSize = Math.min(Math.max(input.limit ?? 20, 1), 100);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * pageSize;

    const emptyCounts: SearchCountsByKind = {
      all: 0,
      page: 0,
      post: 0,
      collection: 0,
      video: 0,
    };

    if (!query) {
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
        countsByKind: emptyCounts,
        usedTrigramFallback: false,
      };
    }

    const targetSiteId = input.siteId ?? (await siteContext.publicSite()).id;
    const settings = await loadSiteSearchSettings(targetSiteId);
    const tsConfig = getPostgresTextSearchConfig(input.language);
    const prefixTsQueryStr = buildPrefixTsQuery(query, settings.synonyms);

    const tsVectorExpr = sql`(
      setweight(to_tsvector(${sql.raw(`'${tsConfig}'`)}, coalesce(${searchDocuments.title}, '')), 'A') ||
      setweight(to_tsvector(${sql.raw(`'${tsConfig}'`)}, coalesce(${searchDocuments.body}, '')), 'B')
    )`;
    const tsQueryExpr = prefixTsQueryStr
      ? sql`to_tsquery(${sql.raw(`'${tsConfig}'`)}, ${prefixTsQueryStr})`
      : sql`plainto_tsquery(${sql.raw(`'${tsConfig}'`)}, ${query})`;

    const baseScope = and(
      eq(searchDocuments.siteId, targetSiteId),
      input.language ? eq(searchDocuments.language, input.language) : undefined
    );

    const activeKind =
      input.kind && input.kind !== 'all' ? input.kind : undefined;

    const ftsCondition = and(
      baseScope,
      sql`(${tsVectorExpr} @@ ${tsQueryExpr} OR ${searchDocuments.searchVector} @@ plainto_tsquery('simple', ${query}))`
    );

    // Count per kind for FTS
    const kindCountRows = await db
      .select({
        kind: searchDocuments.kind,
        total: count(),
      })
      .from(searchDocuments)
      .where(ftsCondition)
      .groupBy(searchDocuments.kind);

    const countsByKind: SearchCountsByKind = { ...emptyCounts };
    for (const row of kindCountRows) {
      const k = row.kind as SearchDocumentKind;
      if (k in countsByKind) {
        countsByKind[k] = Number(row.total);
        countsByKind.all += Number(row.total);
      }
    }

    let usedTrigramFallback = false;
    let rows: {
      kind: string;
      title: string;
      path: string;
      language: string;
      body: string;
      thumbnailUrl: string | null;
      snippet: string;
    }[] = [];

    if (countsByKind.all > 0) {
      const filteredWhere = and(
        ftsCondition,
        activeKind ? eq(searchDocuments.kind, activeKind) : undefined
      );
      rows = await db
        .select({
          kind: searchDocuments.kind,
          title: searchDocuments.title,
          path: searchDocuments.path,
          language: searchDocuments.language,
          body: searchDocuments.body,
          thumbnailUrl: searchDocuments.thumbnailUrl,
          snippet: sql<string>`regexp_replace(ts_headline(${sql.raw(`'${tsConfig}'`)}, ${searchDocuments.body}, ${tsQueryExpr}, 'MaxFragments=1, MaxWords=24, MinWords=8'), '<[^>]+>', '', 'g')`,
        })
        .from(searchDocuments)
        .where(filteredWhere)
        .orderBy(sql`ts_rank_cd(${tsVectorExpr}, ${tsQueryExpr}) desc`)
        .limit(pageSize)
        .offset(offset);
    } else {
      // Typo tolerance fallback with pg_trgm similarity / ILIKE (R589 / QRY-19)
      usedTrigramFallback = true;
      try {
        const trgmCondition = and(
          baseScope,
          activeKind ? eq(searchDocuments.kind, activeKind) : undefined,
          or(
            sql`similarity(${searchDocuments.title}, ${query}) > 0.2`,
            ilike(searchDocuments.title, `%${query}%`),
            ilike(searchDocuments.body, `%${query}%`)
          )
        );
        const [trgmRows, [{ total: trgmTotal }]] = await Promise.all([
          db
            .select({
              kind: searchDocuments.kind,
              title: searchDocuments.title,
              path: searchDocuments.path,
              language: searchDocuments.language,
              body: searchDocuments.body,
              thumbnailUrl: searchDocuments.thumbnailUrl,
              snippet: sql<string>`substring(${searchDocuments.body} from 1 for 160)`,
            })
            .from(searchDocuments)
            .where(trgmCondition)
            .orderBy(sql`similarity(${searchDocuments.title}, ${query}) desc`)
            .limit(pageSize)
            .offset(offset),
          db.select({ total: count() }).from(searchDocuments).where(trgmCondition),
        ]);
        rows = trgmRows;
        countsByKind.all = Number(trgmTotal);
        if (activeKind) countsByKind[activeKind] = Number(trgmTotal);
      } catch {
        // Fallback when pg_trgm is not installed in the current database
        const ilikeCondition = and(
          baseScope,
          activeKind ? eq(searchDocuments.kind, activeKind) : undefined,
          or(
            ilike(searchDocuments.title, `%${query}%`),
            ilike(searchDocuments.body, `%${query}%`)
          )
        );
        rows = await db
          .select({
            kind: searchDocuments.kind,
            title: searchDocuments.title,
            path: searchDocuments.path,
            language: searchDocuments.language,
            body: searchDocuments.body,
            thumbnailUrl: searchDocuments.thumbnailUrl,
            snippet: sql<string>`substring(${searchDocuments.body} from 1 for 160)`,
          })
          .from(searchDocuments)
          .where(ilikeCondition)
          .limit(pageSize)
          .offset(offset);
        countsByKind.all = rows.length;
      }
    }

    // Apply pinned results on page 1 (R593 / QRY-23)
    const pinnedMatches =
      page === 1 ? matchPinnedResults(query, settings.pinnedResults) : [];
    const pinnedPaths = new Set(pinnedMatches.map(p => p.path));

    const pinnedItems: SearchResultItem[] = pinnedMatches
      .filter(p => !activeKind || (p.kind ?? 'page') === activeKind)
      .map(p => ({
        kind: p.kind ?? 'page',
        title: p.title,
        path: p.path,
        language: input.language ?? 'en',
        snippet: '',
        highlightedSnippet: '',
        thumbnailUrl: null,
        pinned: true,
      }));

    const mappedItems: SearchResultItem[] = rows
      .filter(r => !pinnedPaths.has(r.path))
      .map(r => {
        const cleanSnippet = (r.snippet || r.body.slice(0, 160)).trim();
        return {
          kind: r.kind as SearchDocumentKind,
          title: r.title,
          path: r.path,
          language: r.language,
          snippet: cleanSnippet,
          highlightedSnippet: highlightTextSnippet(
            cleanSnippet,
            query,
            settings.synonyms
          ),
          thumbnailUrl: r.thumbnailUrl,
          pinned: false,
        };
      });

    const items = [...pinnedItems, ...mappedItems];
    const total =
      (activeKind ? countsByKind[activeKind] : countsByKind.all) +
      pinnedItems.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);

    if (input.recordAnalytics !== false) {
      await recordSearchQuery({
        siteId: targetSiteId,
        query,
        language: input.language ?? 'en',
        resultCount: total,
      });
    }

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      countsByKind,
      usedTrigramFallback,
    };
  }

  async suggest(input: {
    q: string;
    language?: string | null;
    limit?: number;
    siteId?: string | null;
  }): Promise<SearchResultItem[]> {
    const res = await this.search({
      q: input.q,
      language: input.language,
      limit: input.limit ?? 6,
      siteId: input.siteId,
      recordAnalytics: false,
    });
    return res.items;
  }
}

let activeSearchAdapter: SearchAdapter = new PostgresSearchAdapter();

export function getSearchAdapter(): SearchAdapter {
  return activeSearchAdapter;
}

export function setSearchAdapter(adapter: SearchAdapter): void {
  activeSearchAdapter = adapter;
}

// ---------------------------------------------------------------------------
// Privacy-Safe Search Analytics (R592 / QRY-22)
// ---------------------------------------------------------------------------

export async function recordSearchQuery({
  siteId,
  query,
  language = 'en',
  resultCount,
}: {
  siteId: string;
  query: string;
  language?: string;
  resultCount: number;
}): Promise<void> {
  const normalized = normalizeSearchQueryLog(query);
  if (!normalized || normalized.length < 2) return;
  try {
    await db.insert(searchQueries).values({
      id: createId(),
      siteId,
      query: normalized,
      language: language.slice(0, 12),
      resultCount: Math.max(0, resultCount),
    });
  } catch {
    // Non-blocking analytics logging
  }
}

export async function getSearchAnalytics({
  siteId,
  days = 30,
  limit = 10,
}: {
  siteId?: string;
  days?: number;
  limit?: number;
} = {}) {
  try {
    const targetSiteId = siteId ?? (await siteContext.publicSite()).id;
    const since = new Date(Date.now() - days * 86_400_000);

    const [topQueries, zeroResultQueries] = await Promise.all([
      db
        .select({
          query: searchQueries.query,
          searches: count(),
          avgResults: sql<number>`round(avg(${searchQueries.resultCount}))::int`,
        })
        .from(searchQueries)
        .where(
          and(
            eq(searchQueries.siteId, targetSiteId),
            gte(searchQueries.createdAt, since)
          )
        )
        .groupBy(searchQueries.query)
        .orderBy(desc(count()))
        .limit(limit),
      db
        .select({
          query: searchQueries.query,
          searches: count(),
        })
        .from(searchQueries)
        .where(
          and(
            eq(searchQueries.siteId, targetSiteId),
            eq(searchQueries.resultCount, 0),
            gte(searchQueries.createdAt, since)
          )
        )
        .groupBy(searchQueries.query)
        .orderBy(desc(count()))
        .limit(limit),
    ]);

    return {
      topQueries: topQueries.map(r => ({
        query: r.query,
        searches: Number(r.searches),
        avgResults: Number(r.avgResults ?? 0),
      })),
      zeroResultQueries: zeroResultQueries.map(r => ({
        query: r.query,
        searches: Number(r.searches),
      })),
    };
  } catch {
    return { topQueries: [], zeroResultQueries: [] };
  }
}

// ---------------------------------------------------------------------------
// Search Index Sync & Query Facade
// ---------------------------------------------------------------------------

export const searchIndex = {
  syncPage: async (id: string, orm: Orm = db) => {
    const [page] = await orm
      .select()
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);
    if (
      !page ||
      page.deletedAt ||
      page.status !== 'published' ||
      page.visibility !== 'public'
    ) {
      await activeSearchAdapter.removeDocument({ kind: 'page', id }, orm);
      invalidateListingCache(page?.siteId, 'pages');
      return;
    }
    const [content] = await orm
      .select({ content: pageContents.content })
      .from(pageContents)
      .where(
        and(eq(pageContents.pageId, id), eq(pageContents.kind, 'published'))
      )
      .limit(1);
    const site = await siteContext.getById(page.siteId);
    await activeSearchAdapter.indexDocument(
      {
        kind: 'page',
        pageId: page.id,
        siteId: page.siteId,
        title: page.title,
        path: PAGES.SITE.page(
          page.slug,
          page.language,
          page.isHome,
          site?.defaultLocale ?? 'en',
          site ? siteSlugPrefix(site) : undefined
        ),
        language: page.language,
        body: extractDocumentText(content?.content),
      },
      orm
    );
    invalidateListingCache(page.siteId, 'pages');
  },

  syncPost: async (id: string, orm: Orm = db) => {
    const [post] = await orm
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);
    if (
      !post ||
      post.deletedAt ||
      post.status !== 'published' ||
      post.visibility !== 'public'
    ) {
      await activeSearchAdapter.removeDocument({ kind: 'post', id }, orm);
      invalidateListingCache(post?.siteId, 'posts');
      return;
    }
    const [content] = await orm
      .select({ body: postContents.body, canvas: postContents.canvas })
      .from(postContents)
      .where(
        and(eq(postContents.postId, id), eq(postContents.kind, 'published'))
      )
      .limit(1);
    const body = [
      stripHtml(content?.body ?? ''),
      extractDocumentText(content?.canvas),
    ]
      .filter(Boolean)
      .join(' ');
    const site = await siteContext.getById(post.siteId);
    await activeSearchAdapter.indexDocument(
      {
        kind: 'post',
        postId: post.id,
        siteId: post.siteId,
        title: post.title,
        path: PAGES.SITE.post(
          post.slug,
          post.language,
          site?.defaultLocale ?? 'en',
          site ? siteSlugPrefix(site) : undefined
        ),
        language: post.language,
        body,
        thumbnailUrl: post.featuredImage,
      },
      orm
    );
    invalidateListingCache(post.siteId, 'posts');
  },

  /** Indexes a published collection entry (`R590 / QRY-20`). */
  syncCollectionEntry: async (id: string, orm: Orm = db) => {
    const [entry] = await orm
      .select()
      .from(collectionEntries)
      .where(eq(collectionEntries.id, id))
      .limit(1);
    if (!entry || entry.deletedAt || entry.status !== 'published') {
      await activeSearchAdapter.removeDocument({ kind: 'collection', id }, orm);
      invalidateListingCache(entry?.siteId, 'collection-entries');
      return;
    }
    const [collection] = await orm
      .select()
      .from(collections)
      .where(eq(collections.id, entry.collectionId))
      .limit(1);
    if (!collection) return;

    const data = (entry.data as Record<string, unknown>) ?? {};
    const title = String(
      data.title || data.name || data.label || entry.slug || 'Untitled'
    );
    const thumbnail = data.image || data.thumbnail || data.cover;
    const site = await siteContext.getById(entry.siteId);
    const prefix = site ? siteSlugPrefix(site) : undefined;

    await activeSearchAdapter.indexDocument(
      {
        kind: 'collection',
        collectionEntryId: entry.id,
        siteId: entry.siteId,
        title,
        path: siteHref(`/collections/${collection.slug}/${entry.slug}`, prefix),
        language: site?.defaultLocale ?? 'en',
        body: extractDocumentText(data),
        thumbnailUrl: typeof thumbnail === 'string' ? thumbnail : null,
      },
      orm
    );
    invalidateListingCache(entry.siteId, 'collection-entries');
  },

  /** Indexes a published public video (`R590 / QRY-20`). */
  syncVideo: async (id: string, orm: Orm = db) => {
    const [video] = await orm
      .select()
      .from(videos)
      .where(eq(videos.id, id))
      .limit(1);
    if (
      !video ||
      video.deletedAt ||
      video.status !== 'published' ||
      video.visibility !== 'public'
    ) {
      await activeSearchAdapter.removeDocument({ kind: 'video', id }, orm);
      invalidateListingCache(video?.siteId, 'videos');
      return;
    }
    const site = await siteContext.getById(video.siteId);
    const prefix = site ? siteSlugPrefix(site) : undefined;

    await activeSearchAdapter.indexDocument(
      {
        kind: 'video',
        videoId: video.id,
        siteId: video.siteId,
        title: video.title,
        path: siteHref(`/videos/${video.slug}`, prefix),
        language: site?.defaultLocale ?? 'en',
        body: stripHtml(
          (video as { description?: string | null }).description ??
            `${video.title} ${video.provider}`
        ),
        thumbnailUrl: video.thumbnailUrl,
      },
      orm
    );
    invalidateListingCache(video.siteId, 'videos');
  },

  removePage: async (id: string, orm: Orm = db) => {
    await activeSearchAdapter.removeDocument({ kind: 'page', id }, orm);
    invalidateListingCache(undefined, 'pages');
  },

  removePost: async (id: string, orm: Orm = db) => {
    await activeSearchAdapter.removeDocument({ kind: 'post', id }, orm);
    invalidateListingCache(undefined, 'posts');
  },

  removeCollectionEntry: async (id: string, orm: Orm = db) => {
    await activeSearchAdapter.removeDocument({ kind: 'collection', id }, orm);
    invalidateListingCache(undefined, 'collection-entries');
  },

  removeVideo: async (id: string, orm: Orm = db) => {
    await activeSearchAdapter.removeDocument({ kind: 'video', id }, orm);
    invalidateListingCache(undefined, 'videos');
  },

  search: async (input: SearchQueryInput): Promise<SearchResultItem[]> => {
    const res = await activeSearchAdapter.search(input);
    return res.items;
  },

  searchPaginated: async (
    input: SearchQueryInput
  ): Promise<PaginatedSearchResponse> => {
    return activeSearchAdapter.search(input);
  },

  suggest: async (input: {
    q: string;
    language?: string | null;
    limit?: number;
    siteId?: string | null;
  }): Promise<SearchResultItem[]> => {
    return activeSearchAdapter.suggest(input);
  },

  getAnalytics: getSearchAnalytics,
};
