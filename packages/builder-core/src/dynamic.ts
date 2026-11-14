import { z } from 'zod';

/**
 * Dynamic content bindings (R414 / BLD-22).
 *
 * Stores references to CMS data sources rather than snapshots of resolved
 * content. Values are resolved on the server or in loaders (R416 / BLD-24).
 */

export type DynamicTransform =
  | 'uppercase'
  | 'lowercase'
  | 'titlecase'
  | 'date'
  | 'slug';

export interface DynamicBinding {
  $dynamic: string;
  path?: string;
  fallback?: string;
  transform?: DynamicTransform;
  /** Item id for sources that point at one chosen record (`pageRef`, `postRef`). */
  ref?: string;
}

const DISALLOWED_PATH_SEGMENTS = new Set([
  '__proto__',
  'prototype',
  'constructor',
]);

function isSafePath(path: string): boolean {
  const segments = path.split('.');
  return segments.every(
    seg =>
      seg.length > 0 &&
      /^[a-zA-Z0-9_-]+$/.test(seg) &&
      !DISALLOWED_PATH_SEGMENTS.has(seg)
  );
}

export const dynamicBindingSchema = z.object({
  $dynamic: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid dynamic source name'),
  path: z
    .string()
    .max(100)
    .refine(val => !val || isSafePath(val), {
      message: 'Invalid or disallowed path segment',
    })
    .optional(),
  fallback: z.string().max(500).optional(),
  ref: z.string().max(100).optional(),
  transform: z
    .enum(['uppercase', 'lowercase', 'titlecase', 'date', 'slug'])
    .optional(),
});

/** Approved CMS dynamic source fields. */
export interface DynamicSourceField {
  key: string;
  label: string;
  type: 'text' | 'image' | 'url' | 'date' | 'number';
}

export interface DynamicSourceDef {
  id: string;
  label: string;
  description: string;
  fields: DynamicSourceField[];
  /**
   * The binding names one record of this kind in `ref`, picked in the editor
   * (`externalApi`: a saved External API preset).
   */
  pick?: 'page' | 'post' | 'externalApi';
}

export const APPROVED_DYNAMIC_SOURCES: Record<string, DynamicSourceDef> = {
  page: {
    id: 'page',
    label: 'Current Page',
    description: 'Fields of the page being rendered',
    fields: [
      { key: 'title', label: 'Page Title', type: 'text' },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'seoTitle', label: 'SEO Title', type: 'text' },
      { key: 'seoDescription', label: 'SEO Description', type: 'text' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
      { key: 'updatedAt', label: 'Last Updated Date', type: 'date' },
    ],
  },
  post: {
    id: 'post',
    label: 'Current Post',
    description: 'Fields of the blog post being viewed',
    fields: [
      { key: 'title', label: 'Post Title', type: 'text' },
      { key: 'slug', label: 'Post Slug', type: 'text' },
      { key: 'excerpt', label: 'Excerpt', type: 'text' },
      { key: 'content', label: 'Full Content', type: 'text' },
      { key: 'featuredImage', label: 'Featured Image', type: 'image' },
      { key: 'authorName', label: 'Author Name', type: 'text' },
      { key: 'publishedAt', label: 'Published Date', type: 'date' },
      { key: 'createdAt', label: 'Created Date', type: 'date' },
    ],
  },
  postRef: {
    id: 'postRef',
    label: 'Specific Blog Post',
    description: 'Fields of a chosen published blog post',
    pick: 'post',
    fields: [
      { key: 'title', label: 'Post Title', type: 'text' },
      { key: 'url', label: 'Post URL', type: 'url' },
      { key: 'slug', label: 'Post Slug', type: 'text' },
      { key: 'excerpt', label: 'Excerpt', type: 'text' },
      { key: 'featuredImage', label: 'Featured Image', type: 'image' },
      { key: 'authorName', label: 'Author Name', type: 'text' },
      { key: 'publishedAt', label: 'Published Date', type: 'date' },
    ],
  },
  pageRef: {
    id: 'pageRef',
    label: 'Specific Page',
    description: 'Fields of a chosen published page',
    pick: 'page',
    fields: [
      { key: 'title', label: 'Page Title', type: 'text' },
      { key: 'url', label: 'Page URL', type: 'url' },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'publishedAt', label: 'Published Date', type: 'date' },
      { key: 'updatedAt', label: 'Last Updated Date', type: 'date' },
    ],
  },
  site: {
    id: 'site',
    label: 'Site Information',
    description: 'Global site settings and metadata',
    fields: [
      { key: 'name', label: 'Site Name', type: 'text' },
      { key: 'description', label: 'Site Description', type: 'text' },
      { key: 'url', label: 'Site URL', type: 'url' },
      { key: 'logo', label: 'Site Logo', type: 'image' },
    ],
  },
  author: {
    id: 'author',
    label: 'Author',
    description: 'Author of the current content',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'avatar', label: 'Avatar Image', type: 'image' },
    ],
  },
  loopItem: {
    id: 'loopItem',
    label: 'Loop Item (Query Loop)',
    description: 'Current item inside a Query Loop card slot',
    fields: [
      { key: 'title', label: 'Item Title', type: 'text' },
      { key: 'url', label: 'Item URL', type: 'url' },
      { key: 'slug', label: 'Slug', type: 'text' },
      { key: 'excerpt', label: 'Excerpt / Summary', type: 'text' },
      { key: 'image', label: 'Featured Image / Thumbnail', type: 'image' },
      { key: 'publishedAt', label: 'Published Date', type: 'date' },
      { key: 'authorName', label: 'Author Name', type: 'text' },
      { key: 'authorImage', label: 'Author Avatar', type: 'image' },
      { key: 'category', label: 'Primary Category', type: 'text' },
      { key: 'tags', label: 'Tags', type: 'text' },
    ],
  },
  externalApi: {
    id: 'externalApi',
    label: 'External API Item',
    description:
      'A field of a saved External API record: the item a popup was opened from, the ?itemId= item, or the first record',
    pick: 'externalApi',
    // Fields come from the chosen preset's field mapping (any dot path works).
    fields: [],
  },
  custom: {
    id: 'custom',
    label: 'Custom Field',
    description: 'Custom entry or template metadata value',
    fields: [],
  },
};

/** Create a dynamic binding reference. */
export function createDynamicBinding(
  source: string,
  path?: string,
  fallback?: string,
  transform?: DynamicTransform
): DynamicBinding {
  return {
    $dynamic: source,
    ...(path ? { path } : {}),
    ...(fallback !== undefined ? { fallback } : {}),
    ...(transform ? { transform } : {}),
  };
}

/** Check if a value is a dynamic binding reference. */
export function isDynamicBinding(value: unknown): value is DynamicBinding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.$dynamic === 'string' &&
    (obj.path === undefined || typeof obj.path === 'string') &&
    (obj.fallback === undefined || typeof obj.fallback === 'string') &&
    (obj.ref === undefined || typeof obj.ref === 'string')
  );
}
