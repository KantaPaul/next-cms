import 'server-only';
import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import {
  collectionEntries,
  collectionEntryTerms,
} from '@/db/schemas/collections.schema';
import { PAGES } from '@/config/pages';
import { entryTitle } from '@/config/post-types';
import type { PostCard } from '@/builder/post-template';

type EntryLike = {
  id: string;
  siteId: string;
  collectionId: string;
  language: string;
  publishedAt: Date | string | null;
  createdAt?: Date | string | null;
  collection: { slug: string; fields?: { key: string; type: string }[] };
};

/**
 * Previous / next published entries in the same post type and language,
 * ordered like the archive (publishedAt, falling back to createdAt).
 */
export async function adjacentEntries(
  entry: EntryLike,
  opts: {
    defaultLocale?: string;
    siteSlug?: string;
    /** Limit to entries sharing this entry's first term. */
    sameTerm?: boolean;
  } = {}
): Promise<{ previous: PostCard | null; next: PostCard | null }> {
  const sortKey = sql`coalesce(${collectionEntries.publishedAt}, ${collectionEntries.createdAt})`;
  const pivotRaw = entry.publishedAt ?? entry.createdAt ?? null;
  if (!pivotRaw) return { previous: null, next: null };
  const pivot = new Date(pivotRaw);

  let termFilter: SQL | undefined;
  if (opts.sameTerm) {
    const [first] = await db
      .select({ termId: collectionEntryTerms.termId })
      .from(collectionEntryTerms)
      .where(eq(collectionEntryTerms.entryId, entry.id))
      .orderBy(asc(collectionEntryTerms.createdAt))
      .limit(1);
    if (first) {
      termFilter = inArray(
        collectionEntries.id,
        db
          .select({ id: collectionEntryTerms.entryId })
          .from(collectionEntryTerms)
          .where(eq(collectionEntryTerms.termId, first.termId))
      );
    }
  }

  const base = and(
    eq(collectionEntries.siteId, entry.siteId),
    eq(collectionEntries.collectionId, entry.collectionId),
    eq(collectionEntries.language, entry.language),
    eq(collectionEntries.status, 'published'),
    eq(collectionEntries.visibility, 'public'),
    isNull(collectionEntries.deletedAt),
    or(
      isNull(collectionEntries.scheduledAt),
      lte(collectionEntries.scheduledAt, new Date())
    ),
    ne(collectionEntries.id, entry.id),
    termFilter
  );

  const one = (where: SQL | undefined, newestFirst: boolean) =>
    db
      .select({
        id: collectionEntries.id,
        slug: collectionEntries.slug,
        data: collectionEntries.data,
        excerpt: collectionEntries.excerpt,
        featuredImage: collectionEntries.featuredImage,
        publishedAt: collectionEntries.publishedAt,
        language: collectionEntries.language,
      })
      .from(collectionEntries)
      .where(where)
      .orderBy(newestFirst ? desc(sortKey) : asc(sortKey), asc(collectionEntries.id))
      .limit(1);

  const [older, newer] = await Promise.all([
    one(and(base, lt(sortKey, pivot)), true),
    one(and(base, gt(sortKey, pivot)), false),
  ]);

  const toCard = (row: (typeof older)[number] | undefined): PostCard | null => {
    if (!row) return null;
    const data = (row.data && typeof row.data === 'object' ? row.data : {}) as Record<string, unknown>;
    return {
      id: row.id,
      slug: row.slug,
      language: row.language,
      title: entryTitle(data, entry.collection.fields ?? []) || row.slug,
      excerpt: row.excerpt ?? null,
      featuredImage: row.featuredImage ?? null,
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      authorName: null,
      categories: [],
      tags: [],
      url: PAGES.SITE.entry(
        entry.collection.slug,
        row.slug,
        row.language,
        opts.defaultLocale ?? 'en',
        opts.siteSlug || undefined
      ),
    };
  };

  return { previous: toCard(older[0]), next: toCard(newer[0]) };
}
