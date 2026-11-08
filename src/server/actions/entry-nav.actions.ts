'use server';

import { entrySchema } from './entry-nav.schemas';

/** Previous / next published entries of the same post type (Post Navigation block). */
export async function getAdjacentEntries(input: {
  entry: unknown;
  sameTerm?: boolean;
  defaultLocale?: string;
  siteSlug?: string;
}) {
  const parsed = entrySchema.safeParse(input.entry);
  if (!parsed.success) return { previous: null, next: null };
  const { adjacentEntries } =
    await import('@/server/services/entry-adjacent.service');
  return adjacentEntries(
    {
      ...parsed.data,
      publishedAt: parsed.data.publishedAt ?? null,
      createdAt: parsed.data.createdAt ?? null,
    },
    {
      sameTerm: Boolean(input.sameTerm),
      defaultLocale: input.defaultLocale?.slice(0, 10),
      siteSlug: input.siteSlug?.slice(0, 100),
    }
  );
}
