'use server';

import { z } from 'zod';

const entrySchema = z.object({
  id: z.string().max(100),
  siteId: z.string().max(100),
  collectionId: z.string().max(100),
  language: z.string().max(10),
  publishedAt: z.union([z.string(), z.date()]).nullable().optional(),
  createdAt: z.union([z.string(), z.date()]).nullable().optional(),
  collection: z.object({
    slug: z.string().max(200),
    fields: z.array(z.object({ key: z.string(), type: z.string() })).optional(),
  }),
});

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
