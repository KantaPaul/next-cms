import 'server-only';
import type { NormalizedListingItem } from '@nextcms/builder-core';
import { SAMPLE_LOOP_ITEMS } from '@/builder/blocks/loop-shared';
import type { LoopItemFieldOption } from '@/builder/controls/loop-preview';
import {
  normalizePostTypeSupports,
  readMediaFieldConfig,
  readTextFieldMode,
  readUrlFieldMode,
} from '@/config/post-types';
import type { LoopTemplateSource } from '@/db/schema';
import {
  buildFieldMetaFromApiFields,
  shortLabelForApiKeyPath,
} from '@/lib/external-api-schema';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { collectionsService } from '@/server/services/collections.service';
import { externalApisService } from '@/server/services/external-apis.service';
import { listingQueryService } from '@/server/services/listing-query.service';
import { adminSiteId, siteContext } from '@/server/services/site-context';

const POST_FIELDS: LoopItemFieldOption[] = [
  { path: 'title', label: 'Title', type: 'text', fieldType: 'text' },
  { path: 'url', label: 'Permalink', type: 'url', fieldType: 'permalink' },
  { path: 'excerpt', label: 'Excerpt', type: 'text', fieldType: 'excerpt' },
  {
    path: 'image',
    label: 'Featured image',
    type: 'image',
    fieldType: 'media',
    config: { isFeatured: true, multiple: false },
  },
  {
    path: 'publishedAt',
    label: 'Published date',
    type: 'date',
    fieldType: 'date',
  },
  {
    path: 'authorName',
    label: 'Author name',
    type: 'text',
    fieldType: 'author',
  },
  {
    path: 'authorImage',
    label: 'Author avatar',
    type: 'image',
    fieldType: 'media',
    config: { multiple: false },
  },
  { path: 'category', label: 'Categories', type: 'text', fieldType: 'terms' },
  { path: 'tags', label: 'Tags', type: 'text', fieldType: 'terms' },
];

const ENTRY_BASE_FIELDS: LoopItemFieldOption[] = [
  { path: 'title', label: 'Title', type: 'text', fieldType: 'text' },
  { path: 'url', label: 'Permalink', type: 'url', fieldType: 'permalink' },
  { path: 'excerpt', label: 'Excerpt', type: 'text', fieldType: 'excerpt' },
  {
    path: 'image',
    label: 'Featured image',
    type: 'image',
    fieldType: 'media',
    config: { isFeatured: true, multiple: false },
  },
  {
    path: 'publishedAt',
    label: 'Published date',
    type: 'date',
    fieldType: 'date',
  },
  {
    path: 'authorName',
    label: 'Author name',
    type: 'text',
    fieldType: 'author',
  },
  { path: 'terms', label: 'Terms', type: 'text', fieldType: 'terms' },
];

const FIELD_TYPE_TO_DYNAMIC: Record<string, string> = {
  media: 'image',
  url: 'url',
  date: 'date',
  number: 'number',
};

/** Sample entry so an empty post type still previews something. */
function sampleEntry(
  fields: { key: string; label: string; type: string; config?: unknown }[]
): NormalizedListingItem {
  const raw: Record<string, unknown> = {};
  const fieldMeta: Record<
    string,
    { label: string; type: string; config?: Record<string, unknown> }
  > = {};

  for (const f of fields) {
    const cfg = (
      f.config && typeof f.config === 'object' ? f.config : {}
    ) as Record<string, unknown>;
    fieldMeta[f.key] = { label: f.label, type: f.type, config: cfg };

    const mediaMeta = readMediaFieldConfig(cfg);
    const textMode = readTextFieldMode(cfg);
    const urlMode = readUrlFieldMode(cfg);

    if (f.type === 'number') {
      raw[f.key] = 42;
    } else if (f.type === 'boolean') {
      raw[f.key] = true;
    } else if (f.type === 'date') {
      raw[f.key] = new Date().toISOString();
    } else if (f.type === 'media') {
      raw[f.key] = mediaMeta.multiple
        ? SAMPLE_LOOP_ITEMS.map(item => item.image).filter(Boolean)
        : (SAMPLE_LOOP_ITEMS[0]?.image ?? '');
    } else if (f.type === 'richtext') {
      raw[f.key] =
        `<p>Sample rich text content for <strong>${f.label}</strong> with formatted paragraphs.</p>`;
    } else if (f.type === 'url') {
      raw[f.key] =
        urlMode === 'video'
          ? 'https://www.youtube.com/watch?v=ZqiyMsJPKo0'
          : 'https://example.com';
    } else if (f.type === 'text' && textMode === 'video') {
      raw[f.key] = 'https://www.youtube.com/watch?v=ZqiyMsJPKo0';
    } else if (f.type === 'text' && textMode === 'embed') {
      raw[f.key] =
        '<iframe width="560" height="315" src="https://www.youtube.com/embed/MdhjLM-99lQ" title="Embedded player"></iframe>';
    } else if (
      f.type === 'select' &&
      Array.isArray(cfg.options) &&
      cfg.options.length > 0
    ) {
      raw[f.key] = String(cfg.options[0]);
    } else {
      raw[f.key] = `Sample ${f.label.toLowerCase()}`;
    }
  }

  raw.__fieldMeta = fieldMeta;
  raw.authorName = 'Alex Morgan';

  return {
    id: 'sample-entry',
    title: typeof raw.title === 'string' ? raw.title : 'Sample entry',
    slug: 'sample-entry',
    url: '/collections/sample/sample-entry',
    excerpt: 'Sample summary for previewing this loop item layout.',
    image: SAMPLE_LOOP_ITEMS[0]?.image ?? null,
    hasGallery: true,
    galleryCount: 3,
    publishedAt: new Date().toISOString(),
    author: { id: 'sample-author', name: 'Alex Morgan', image: null },
    terms: [
      { id: 'term-1', name: 'Featured', slug: 'featured', taxonomy: 'category' },
      { id: 'term-2', name: 'Showcase', slug: 'showcase', taxonomy: 'tag' },
    ],
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
  collectionId: string | null,
  externalApiId: string | null = null
): Promise<{ items: NormalizedListingItem[]; fields: LoopItemFieldOption[] }> {
  const site = await siteContext.getById(await adminSiteId());
  const options = { ...(site ? { site } : {}), skipCache: true };

  if (sourceType === 'external-api' && externalApiId) {
    const preset = await externalApisService.getById(externalApiId);
    if (preset) {
      const apiFields = Array.isArray(preset.fields) ? preset.fields : [];
      const customMeta = buildFieldMetaFromApiFields(apiFields);
      const customOptions: LoopItemFieldOption[] = apiFields
        .filter(f => f && f.key)
        .map(f => ({
          path: f.key,
          label: f.label?.trim() || shortLabelForApiKeyPath(f.key),
          type: FIELD_TYPE_TO_DYNAMIC[f.fieldType] ?? 'text',
          fieldType: f.fieldType,
          config: customMeta[f.key]?.config ?? {},
        }));

      const customKeySet = new Set(customOptions.map(f => f.path));
      const coreApiFields: LoopItemFieldOption[] = [];
      const addCore = (
        key: string | null | undefined,
        option: LoopItemFieldOption
      ) => {
        if (key && key.trim() && !customKeySet.has(option.path)) {
          coreApiFields.push(option);
          customKeySet.add(option.path);
        }
      };
      addCore(preset.fieldTitle, {
        path: 'title',
        label: 'Title',
        type: 'text',
        fieldType: 'text',
      });
      addCore(preset.fieldUrl, {
        path: 'url',
        label: 'Permalink',
        type: 'url',
        fieldType: 'permalink',
      });
      addCore(preset.fieldExcerpt, {
        path: 'excerpt',
        label: 'Excerpt',
        type: 'text',
        fieldType: 'excerpt',
      });
      addCore(preset.fieldImage, {
        path: 'image',
        label: 'Featured image',
        type: 'image',
        fieldType: 'media',
        config: { isFeatured: true, multiple: false },
      });
      addCore(preset.fieldPublishedAt, {
        path: 'publishedAt',
        label: 'Published date',
        type: 'date',
        fieldType: 'date',
      });

      const fields: LoopItemFieldOption[] = [...coreApiFields, ...customOptions];

      const result = await listingQueryService
        .resolve(
          {
            source: 'external-api',
            apiConfig: {
              endpointUrl: preset.endpointUrl,
              method: preset.method === 'POST' ? 'POST' : 'GET',
              headers: preset.headers ?? {},
              ...(preset.queryParams ? { queryParams: preset.queryParams } : {}),
              ...(Array.isArray(preset.dataFilters)
                ? { dataFilters: preset.dataFilters }
                : {}),
              ...(preset.body ? { body: preset.body } : {}),
              itemsPath: preset.itemsPath ?? '',
              ...(preset.totalPath ? { totalPath: preset.totalPath } : {}),
              fieldMap: {
                id: preset.fieldId || 'id',
                title: preset.fieldTitle || 'title',
                ...(preset.fieldUrl ? { url: preset.fieldUrl } : {}),
                ...(preset.fieldExcerpt ? { excerpt: preset.fieldExcerpt } : {}),
                ...(preset.fieldImage ? { image: preset.fieldImage } : {}),
                ...(preset.fieldPublishedAt
                  ? { publishedAt: preset.fieldPublishedAt }
                  : {}),
              },
              cacheTtlSeconds: preset.cacheTtlSeconds ?? 60,
              timeoutMs: preset.timeoutMs ?? 4000,
            },
            limit: 20,
          },
          options
        )
        .catch(() => null);

      const items = (result?.items ?? []).map(item => ({
        ...item,
        raw: {
          ...(item.raw ?? {}),
          __fieldMeta: {
            ...((item.raw?.__fieldMeta as Record<string, unknown>) ?? {}),
            ...customMeta,
          },
        },
      }));

      return {
        items:
          items.length > 0
            ? items
            : [
                sampleEntry(
                  apiFields.map(f => ({
                    key: f.key,
                    label: f.label?.trim() || shortLabelForApiKeyPath(f.key),
                    type: f.fieldType === 'array' ? 'text' : f.fieldType,
                    config: customMeta[f.key]?.config ?? {},
                  }))
                ),
              ],
        fields,
      };
    }
  }

  if (sourceType === 'collection' && collectionId) {
    const [collection, collectionFields, taxonomies] = await Promise.all([
      collectionsService.get(collectionId),
      collectionsService.getFields(collectionId),
      collectionTaxonomiesService.listTaxonomies(collectionId).catch(() => []),
    ]);
    const supports = normalizePostTypeSupports(collection?.supports);
    const customOptions: LoopItemFieldOption[] = collectionFields
      .filter(f => f.key !== 'slug')
      .map(f => ({
        path: f.key,
        label: f.label,
        type: FIELD_TYPE_TO_DYNAMIC[f.type] ?? 'text',
        fieldType: f.type,
        config: (
          f.config && typeof f.config === 'object' ? f.config : {}
        ) as Record<string, unknown>,
      }));
    const customKeySet = new Set(customOptions.map(f => f.path));
    const hasFeaturedMedia = customOptions.some(
      f => f.fieldType === 'media' && Boolean(f.config?.isFeatured)
    );
    const supportedBaseFields = ENTRY_BASE_FIELDS.filter(b => {
      if (customKeySet.has(b.path)) return false;
      if (b.path === 'excerpt') return supports.excerpt;
      if (b.path === 'image') return hasFeaturedMedia;
      if (b.path === 'authorName') return supports.author;
      if (b.path === 'terms') return supports.taxonomies && taxonomies.length > 0;
      return true;
    });
    const fields: LoopItemFieldOption[] = [
      ...supportedBaseFields,
      ...customOptions,
    ];
    const result = await listingQueryService
      .resolve(
        { source: 'collection-entries', collectionId, limit: 20 },
        options
      )
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
