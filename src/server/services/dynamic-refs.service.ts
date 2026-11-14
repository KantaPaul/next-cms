import 'server-only';
import { and, asc, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { PAGES } from '@/config/pages';
import { db } from '@/db';
import { pages, posts, users } from '@/db/schema';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';

/**
 * Records for the "Specific Page" / "Specific Blog Post" dynamic sources
 * (`pageRef`, `postRef`). Only published, public items of the current site,
 * so a binding never leaks a draft.
 */

/** One picked record; the fields match `APPROVED_DYNAMIC_SOURCES`. */
export type DynamicRefItem = { id: string; title: string } & Record<
  string,
  unknown
>;

/** A saved External API preset as offered by the binding picker. */
export type ExternalApiRefOption = {
  id: string;
  title: string;
  fields: { key: string; label: string; type: 'text' | 'image' | 'url' | 'date' | 'number' }[];
};

/** Picker options per kind, for the editor. */
export type DynamicRefOptions = {
  pages: DynamicRefItem[];
  posts: DynamicRefItem[];
  /** Saved External API presets (editor only). */
  externalApis?: ExternalApiRefOption[];
  /** Preview records for External API bindings, by preset id. */
  externalApiRecords?: Record<string, Record<string, unknown>>;
};

type PresetFieldSource = {
  fieldId?: string | null;
  fieldTitle?: string | null;
  fieldUrl?: string | null;
  fieldExcerpt?: string | null;
  fieldImage?: string | null;
  fieldPublishedAt?: string | null;
  fields?: { key?: string; label?: string; fieldType?: string }[] | null;
};

const FIELD_TYPE_MAP: Record<string, ExternalApiRefOption['fields'][number]['type']> = {
  media: 'image',
  url: 'url',
  date: 'date',
  number: 'number',
};

/** Binding fields for a preset: its core mapping first, then mapped fields. */
export function presetBindingFields(preset: PresetFieldSource): ExternalApiRefOption['fields'] {
  const out: ExternalApiRefOption['fields'] = [];
  const seen = new Set<string>();
  const add = (key: string | null | undefined, label: string, type: ExternalApiRefOption['fields'][number]['type']) => {
    const k = key?.trim();
    if (!k || seen.has(k)) return;
    seen.add(k);
    out.push({ key: k, label, type });
  };
  add(preset.fieldTitle || 'title', 'Title', 'text');
  add(preset.fieldImage, 'Image', 'image');
  add(preset.fieldExcerpt, 'Excerpt', 'text');
  add(preset.fieldUrl, 'URL', 'url');
  add(preset.fieldPublishedAt, 'Published date', 'date');
  for (const field of preset.fields ?? []) {
    if (!field?.key) continue;
    add(field.key, field.label?.trim() || field.key, FIELD_TYPE_MAP[field.fieldType ?? ''] ?? 'text');
  }
  add(preset.fieldId || 'id', 'ID', 'text');
  return out;
}

const PICKER_LIMIT = 200;

async function pageItems(where?: SQL, limit?: number) {
  const site = await siteContext.publicSite();
  const query = db
    .select({
      id: pages.id,
      title: pages.title,
      slug: pages.slug,
      language: pages.language,
      isHome: pages.isHome,
      publishedAt: pages.publishedAt,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(
      and(
        eq(pages.siteId, site.id),
        eq(pages.status, 'published'),
        eq(pages.visibility, 'public'),
        isNull(pages.deletedAt),
        where
      )
    )
    .orderBy(asc(pages.title));
  const rows = await (limit ? query.limit(limit) : query);
  return rows.map(
    ({ isHome, language, publishedAt, updatedAt, ...row }): DynamicRefItem => ({
      ...row,
      language,
      url: PAGES.SITE.page(
        row.slug,
        language,
        isHome,
        site.defaultLocale,
        siteSlugPrefix(site)
      ),
      publishedAt: publishedAt?.toISOString() ?? null,
      updatedAt: updatedAt?.toISOString() ?? null,
    })
  );
}

async function postItems(where?: SQL, limit?: number) {
  const site = await siteContext.publicSite();
  const query = db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      language: posts.language,
      excerpt: posts.excerpt,
      featuredImage: posts.featuredImage,
      publishedAt: posts.publishedAt,
      authorName: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(users.id, posts.createdBy))
    .where(
      and(
        eq(posts.siteId, site.id),
        eq(posts.status, 'published'),
        eq(posts.visibility, 'public'),
        isNull(posts.deletedAt),
        where
      )
    )
    .orderBy(desc(posts.publishedAt));
  const rows = await (limit ? query.limit(limit) : query);
  return rows.map(
    ({ publishedAt, ...row }): DynamicRefItem => ({
      ...row,
      url: PAGES.SITE.post(
        row.slug,
        row.language,
        site.defaultLocale,
        siteSlugPrefix(site)
      ),
      publishedAt: publishedAt?.toISOString() ?? null,
    })
  );
}

const byId = (items: DynamicRefItem[]) =>
  Object.fromEntries(items.map(item => [item.id, item]));

export const dynamicRefsService = {
  /** Records keyed by id per source, as `resolveDynamicValue` reads them. */
  load: async (refs: Record<string, string[]>) => {
    const pageIds = refs.pageRef ?? [];
    const postIds = refs.postRef ?? [];
    const [pageRows, postRows] = await Promise.all([
      pageIds.length ? pageItems(inArray(pages.id, pageIds)) : [],
      postIds.length ? postItems(inArray(posts.id, postIds)) : [],
    ]);
    return { pageRef: byId(pageRows), postRef: byId(postRows) };
  },

  /** Recent published items for the editor's picker and canvas preview. */
  options: async (): Promise<DynamicRefOptions> => {
    const [pageRows, postRows] = await Promise.all([
      pageItems(undefined, PICKER_LIMIT),
      postItems(undefined, PICKER_LIMIT),
    ]);
    return { pages: pageRows, posts: postRows };
  },
};
