import 'server-only';
import type { NormalizedListingItem } from '@nextcms/builder-core';
import { SAMPLE_LOOP_ITEMS } from '@/builder/blocks/loop-shared';
import type { LoopItemFieldOption } from '@/builder/controls/loop-preview';
import type { LoopTemplateSource } from '@/db/schema';
import { collectionsService } from '@/server/services/collections.service';
import { listingQueryService } from '@/server/services/listing-query.service';
import { adminSiteId, siteContext } from '@/server/services/site-context';

const POST_FIELDS: LoopItemFieldOption[] = [
  { path: 'title', label: 'Title', type: 'text' },
  { path: 'url', label: 'Permalink', type: 'url' },
  { path: 'slug', label: 'Slug', type: 'text' },
  { path: 'excerpt', label: 'Excerpt', type: 'text' },
  { path: 'image', label: 'Featured image', type: 'image' },
  { path: 'publishedAt', label: 'Published date', type: 'date' },
  { path: 'authorName', label: 'Author name', type: 'text' },
  { path: 'authorImage', label: 'Author avatar', type: 'image' },
  { path: 'category', label: 'Categories', type: 'text' },
  { path: 'tags', label: 'Tags', type: 'text' },
];

const ENTRY_BASE_FIELDS: LoopItemFieldOption[] = [
  { path: 'title', label: 'Title', type: 'text' },
  { path: 'url', label: 'Permalink', type: 'url' },
  { path: 'slug', label: 'Slug', type: 'text' },
  { path: 'image', label: 'Image (first media field)', type: 'image' },
  { path: 'publishedAt', label: 'Published date', type: 'date' },
];

const FIELD_TYPE_TO_DYNAMIC: Record<string, string> = {
  media: 'image',
  url: 'url',
  date: 'date',
  number: 'number',
};

/** Sample entry so an empty post type still previews something. */
function sampleEntry(fields: { key: string; label: string; type: string }[]): NormalizedListingItem {
  const raw: Record<string, unknown> = {};
  for (const f of fields) {
    raw[f.key] =
      f.type === 'number'
        ? 42
        : f.type === 'boolean'
          ? true
          : f.type === 'date'
            ? new Date().toISOString()
            : f.type === 'media'
              ? SAMPLE_LOOP_ITEMS[0]?.image ?? ''
              : `Sample ${f.label.toLowerCase()}`;
  }
  return {
    id: 'sample-entry',
    title: 'Sample entry',
    slug: 'sample-entry',
    url: '#',
    image: SAMPLE_LOOP_ITEMS[0]?.image ?? null,
    publishedAt: new Date().toISOString(),
    terms: [],
    source: 'collection-entries',
    raw,
  };
}

/**
 * Data the Loop Item editor needs: up to 20 real items to preview with, and
 * the fields its dynamic tags can bind to.
 */
export async function loopTemplatePreviewData(
  sourceType: LoopTemplateSource,
  collectionId: string | null
): Promise<{ items: NormalizedListingItem[]; fields: LoopItemFieldOption[] }> {
  const site = await siteContext.getById(await adminSiteId());
  const options = { ...(site ? { site } : {}), skipCache: true };

  if (sourceType === 'collection' && collectionId) {
    const collectionFields = await collectionsService.getFields(collectionId);
    const fields: LoopItemFieldOption[] = [
      ...ENTRY_BASE_FIELDS,
      ...collectionFields.map(f => ({
        path: f.key,
        label: f.label,
        type: FIELD_TYPE_TO_DYNAMIC[f.type] ?? 'text',
      })),
    ];
    const result = await listingQueryService
      .resolve({ source: 'collection-entries', collectionId, limit: 20 }, options)
      .catch(() => null);
    const items = result?.items.length
      ? result.items
      : [sampleEntry(collectionFields)];
    return { items, fields };
  }

  const result = await listingQueryService
    .resolve({ source: 'posts', limit: 20 }, options)
    .catch(() => null);
  return {
    items: result?.items.length ? result.items : SAMPLE_LOOP_ITEMS,
    fields: POST_FIELDS,
  };
}
