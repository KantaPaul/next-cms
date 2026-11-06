'use server';

import type {
  ListingQueryResult,
  NormalizedListingItem,
} from '@nextcms/builder-core';
import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { collections } from '@/db/schema';
import { siteContext } from '@/server/services/site-context';
import {
  type ListingQueryOptions,
  listingQueryService,
} from '@/server/services/listing-query.service';
import {
  type PaginatedSearchResponse,
  type SearchQueryInput,
  searchIndex,
} from '@/server/services/search.service';

export async function resolveListingQuery(
  rawConfig: unknown,
  options?: ListingQueryOptions
): Promise<ListingQueryResult> {
  return listingQueryService.resolve(rawConfig, options);
}

export async function resolvePaginatedSearch(
  input: SearchQueryInput
): Promise<PaginatedSearchResponse> {
  return searchIndex.searchPaginated(input);
}

/**
 * Published entries for the Post type entries block. Resolves the post type
 * by id, or by slug for block presets: presets install as `team`, `team-2`…,
 * so the newest matching type wins.
 */
export async function resolvePostTypeEntries(input: {
  collectionId?: string;
  postTypeSlug?: string;
  limit?: number;
  newestFirst?: boolean;
  language?: string;
}): Promise<{ items: NormalizedListingItem[]; resolvedCollectionId: string }> {
  const site = await siteContext.publicSite();
  let collectionId = input.collectionId ?? '';
  const slug = (input.postTypeSlug ?? '').trim().replace(/[^a-z0-9-]/g, '');

  if (!collectionId && slug) {
    const [row] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          or(
            eq(collections.slug, slug),
            sql`${collections.slug} ~ ${`^${slug}-[0-9]+$`}`
          ),
          eq(collections.siteId, site.id),
          eq(collections.status, 'active'),
          isNull(collections.deletedAt)
        )
      )
      .orderBy(desc(collections.createdAt))
      .limit(1);
    collectionId = row?.id ?? '';
  }
  if (!collectionId) return { items: [], resolvedCollectionId: '' };

  const result = await listingQueryService.resolve(
    {
      source: 'collection-entries',
      collectionId,
      sortField: 'createdAt',
      sortOrder: input.newestFirst ? 'desc' : 'asc',
      limit: Math.min(Math.max(input.limit ?? 12, 1), 100),
    },
    { site, language: input.language }
  );
  return { items: result.items, resolvedCollectionId: collectionId };
}

/** Related published collection entries from the same collection/archive. */
export async function resolveRelatedCollectionEntries(input: {
  collectionId: string;
  entryId?: string;
  language?: string;
  limit?: number;
  siteSlug?: string;
}): Promise<import('@/builder/post-template').PostCard[]> {
  const site = await siteContext.publicSite();
  if (!input.collectionId) return [];
  const prefix = input.siteSlug ? `/${input.siteSlug}` : '';

  const result = await listingQueryService.resolve(
    {
      source: 'collection-entries',
      collectionId: input.collectionId,
      sortField: 'publishedAt',
      sortOrder: 'desc',
      limit: Math.min(Math.max(input.limit ?? 3, 1), 12),
      page: 1,
      ...(input.entryId ? { currentId: input.entryId } : {}),
    },
    { site, language: input.language, currentId: input.entryId }
  );

  return result.items.map(item => {
    const raw = (item.raw && typeof item.raw === 'object' ? item.raw : {}) as any;
    const url = prefix
      ? item.url.startsWith(prefix)
        ? item.url
        : `${prefix}${item.url.startsWith('/') ? '' : '/'}${item.url}`
      : item.url;
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      language: raw.language ?? input.language ?? 'en',
      excerpt: item.excerpt ?? raw.excerpt ?? null,
      featuredImage: item.image ?? raw.featuredImage ?? null,
      publishedAt: item.publishedAt ?? null,
      authorName: item.author?.name ?? raw.authorName ?? null,
      authorUrl: raw.authorId
        ? `${prefix}/collections/${raw.collection?.slug ?? raw.collectionSlug ?? ''}/author/${raw.authorId}`
        : null,
      categories: [],
      tags: [],
      url,
    };
  });
}
