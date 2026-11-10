/**
 * Post types are the dashboard-facing name for collections: admin-defined
 * content types (Team, Testimonials, FAQ…) with their own fields and entries.
 * This module is shared by the dashboard (client + server) and the builder.
 */

export const POST_TYPE_FIELD_TYPES = [
  { value: 'text', label: 'Text', hint: 'A single line of text' },
  { value: 'richtext', label: 'Rich text', hint: 'Formatted paragraphs' },
  { value: 'media', label: 'Image / media', hint: 'Pick from the media library' },
  { value: 'number', label: 'Number', hint: 'Whole or decimal number' },
  { value: 'date', label: 'Date', hint: 'A calendar date' },
  { value: 'url', label: 'URL', hint: 'A web address' },
  { value: 'boolean', label: 'Yes / no', hint: 'A checkbox' },
  { value: 'select', label: 'Select', hint: 'One option from a list' },
  { value: 'relation', label: 'Relation', hint: 'Link to an entry of another type' },
] as const;

export type PostTypeFieldType = (typeof POST_TYPE_FIELD_TYPES)[number]['value'];

export type PostTypeSupports = {
  template: boolean;
  taxonomies: boolean;
  excerpt: boolean;
  author: boolean;
  status: boolean;
  seo: boolean;
  comments: boolean;
};

export const DEFAULT_POST_TYPE_SUPPORTS: PostTypeSupports = {
  template: true,
  taxonomies: true,
  excerpt: true,
  author: true,
  status: true,
  seo: true,
  comments: true,
};

export function normalizePostTypeSupports(raw: unknown): PostTypeSupports {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<PostTypeSupports>;
  return {
    template: obj.template ?? true,
    taxonomies: obj.taxonomies ?? true,
    excerpt: obj.excerpt ?? true,
    author: obj.author ?? true,
    status: obj.status ?? true,
    seo: obj.seo ?? true,
    comments: obj.comments ?? true,
  };
}

export const POST_TYPE_SUPPORT_FEATURES: {
  key: keyof PostTypeSupports;
  label: string;
  description: string;
}[] = [
  {
    key: 'template',
    label: 'Single template & custom layout',
    description: 'Build layouts per post type with the single template editor or custom canvas.',
  },
  {
    key: 'taxonomies',
    label: 'Taxonomies',
    description: 'Categories, tags, and custom hierarchical or flat taxonomies for this post type.',
  },
  {
    key: 'excerpt',
    label: 'Excerpt',
    description: 'Short summary or teaser text used on archive pages and meta descriptions.',
  },
  {
    key: 'author',
    label: 'Author attribution',
    description: 'Records and displays the user who created or authored each entry.',
  },
  {
    key: 'status',
    label: 'Status, visibility & schedule',
    description: 'Draft, review, scheduled, and published statuses with future release scheduling.',
  },
  {
    key: 'seo',
    label: 'SEO & social sharing',
    description: 'Custom SEO title, description, keywords, canonical URLs, and Open Graph previews.',
  },
  {
    key: 'comments',
    label: 'Comments',
    description: 'Visitor comments on entries when site-wide comments are enabled, with per-entry control.',
  },
];

export const POST_TYPE_FIELD_TYPE_VALUES = POST_TYPE_FIELD_TYPES.map(
  t => t.value
) as [PostTypeFieldType, ...PostTypeFieldType[]];

/** Icons an admin can pick for a post type (lucide icon names). */
export const POST_TYPE_ICONS = [
  'database',
  'users',
  'message-square-quote',
  'circle-help',
  'briefcase',
  'calendar',
  'star',
  'map-pin',
  'book-open',
  'package',
  'award',
  'image',
] as const;

export type PostTypeIcon = (typeof POST_TYPE_ICONS)[number];

export type PostTypePresetField = {
  key: string;
  label: string;
  type: PostTypeFieldType;
  required?: boolean;
  config?: Record<string, unknown>;
};

export type PostTypePreset = {
  id: string;
  name: string;
  singularName: string;
  slug: string;
  icon: PostTypeIcon;
  description: string;
  fields: PostTypePresetField[];
};

export const POST_TYPE_PRESETS: PostTypePreset[] = [
  {
    id: 'team',
    name: 'Team members',
    singularName: 'Team member',
    slug: 'team',
    icon: 'users',
    description: 'People on your team, with photo, role and a short bio.',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'photo', label: 'Photo', type: 'media' },
      { key: 'bio', label: 'Bio', type: 'richtext' },
      { key: 'linkedin', label: 'LinkedIn URL', type: 'url' },
    ],
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    singularName: 'Testimonial',
    slug: 'testimonials',
    icon: 'message-square-quote',
    description: 'Customer quotes with name, company and photo.',
    fields: [
      { key: 'quote', label: 'Quote', type: 'richtext', required: true },
      { key: 'author', label: 'Author', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'avatar', label: 'Photo', type: 'media' },
      { key: 'rating', label: 'Rating (1–5)', type: 'number' },
    ],
  },
  {
    id: 'faq',
    name: 'FAQs',
    singularName: 'FAQ',
    slug: 'faq',
    icon: 'circle-help',
    description: 'Frequently asked questions and their answers.',
    fields: [
      { key: 'question', label: 'Question', type: 'text', required: true },
      { key: 'answer', label: 'Answer', type: 'richtext', required: true },
    ],
  },
];

/** Turns a label into a field key: "LinkedIn URL" → "linkedin_url". */
export function fieldKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

/** Keys checked, in order, when picking an entry's display title. */
export const ENTRY_TITLE_KEYS = [
  'title',
  'name',
  'label',
  'heading',
  'question',
  'author',
] as const;

/** Best display title for an entry: a conventional key, else the first text field. */
export function entryTitle(
  data: unknown,
  fields: { key: string; type: string }[]
): string {
  const d = (data && typeof data === 'object' ? data : {}) as Record<
    string,
    unknown
  >;
  for (const key of ENTRY_TITLE_KEYS) {
    if (typeof d[key] === 'string' && d[key]) return d[key] as string;
  }
  const firstText = fields.find(
    f => f.type === 'text' && typeof d[f.key] === 'string' && d[f.key]
  );
  return firstText ? String(d[firstText.key]) : '';
}

export interface CollectionFieldConfigMeta {
  multiple?: boolean;
  isFeatured?: boolean;
}

export interface MediaFieldDescriptor {
  key: string;
  type: string;
  config?: unknown;
}

/** Reads media-specific flags (`multiple`, `isFeatured`) from a field's config JSON. */
export function readMediaFieldConfig(config: unknown): CollectionFieldConfigMeta {
  if (!config || typeof config !== 'object') return {};
  const c = config as Record<string, unknown>;
  return {
    multiple: Boolean(c.multiple),
    isFeatured: Boolean(c.isFeatured),
  };
}

/** Normalizes a media field value (`string | string[]`) into a deduplicated list of non-empty URLs. */
export function entryMediaValues(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Conventional keys checked when picking an entry's featured image if no field is flagged `isFeatured`. */
export const ENTRY_MEDIA_KEYS = [
  'image',
  'photo',
  'avatar',
  'thumbnail',
  'cover',
] as const;

/** Picks an entry's featured image URL: explicit `isFeatured` media field first, then conventional keys, then first media field. */
export function entryFeaturedMedia(
  data: unknown,
  fields: MediaFieldDescriptor[]
): string | null {
  const d = (data && typeof data === 'object' ? data : {}) as Record<
    string,
    unknown
  >;
  const featuredField = fields.find(
    f => f.type === 'media' && readMediaFieldConfig(f.config).isFeatured
  );
  if (featuredField) {
    const urls = entryMediaValues(d[featuredField.key]);
    if (urls.length > 0) return urls[0];
  }
  for (const key of ENTRY_MEDIA_KEYS) {
    const urls = entryMediaValues(d[key]);
    if (urls.length > 0) return urls[0];
  }
  for (const f of fields) {
    if (f.type !== 'media') continue;
    const urls = entryMediaValues(d[f.key]);
    if (urls.length > 0) return urls[0];
  }
  return null;
}

/**
 * Collects gallery image URLs for an entry with the featured image always placed first.
 * `hasGallery` is true when there are multiple images or a populated `multiple` media field with >1 image.
 */
export function entryGalleryMedia(
  data: unknown,
  fields: MediaFieldDescriptor[]
): { images: string[]; featuredImage: string | null; hasGallery: boolean } {
  const d = (data && typeof data === 'object' ? data : {}) as Record<
    string,
    unknown
  >;
  const featuredImage = entryFeaturedMedia(d, fields);
  const seen = new Set<string>();
  const images: string[] = [];
  const push = (url: string | null) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    images.push(url);
  };
  push(featuredImage);
  for (const f of fields) {
    if (f.type !== 'media') continue;
    for (const url of entryMediaValues(d[f.key])) {
      push(url);
    }
  }
  return {
    images,
    featuredImage,
    hasGallery: images.length > 1,
  };
}

/**
 * Merges a single media field's values with an optional entry featured image so
 * the featured image is always first in a single-view gallery.
 */
export function mergeFeaturedWithFieldMedia(
  value: unknown,
  featuredImage: string | null
): string[] {
  const fieldImages = entryMediaValues(value);
  if (!featuredImage) return fieldImages;
  if (!fieldImages.length) return [featuredImage];
  return [featuredImage, ...fieldImages.filter(u => u !== featuredImage)];
}

export type TextFieldMode = 'plain' | 'video' | 'embed';
export type UrlFieldMode = 'video' | 'other';

/** Reads `textMode` (`plain` | `video` | `embed`) from a `text` field config JSON. */
export function readTextFieldMode(config: unknown): TextFieldMode {
  if (!config || typeof config !== 'object') return 'plain';
  const mode = (config as Record<string, unknown>).textMode;
  return mode === 'video' || mode === 'embed' ? mode : 'plain';
}

/** Reads `urlMode` (`video` | `other`) from a `url` field config JSON. */
export function readUrlFieldMode(config: unknown): UrlFieldMode {
  if (!config || typeof config !== 'object') return 'other';
  return (config as Record<string, unknown>).urlMode === 'video'
    ? 'video'
    : 'other';
}

export type ParsedVideoSource = {
  kind: 'youtube' | 'vimeo' | 'file';
  src: string;
};

/** Parses YouTube (watch, shorts, embed, youtu.be), Vimeo, or direct mp4/webm/ogg/mov video URLs. */
export function parseVideoUrl(rawUrl: string): ParsedVideoSource | null {
  const url = rawUrl.trim();
  if (!url) return null;
  if (url.startsWith('/') && /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url)) {
    return { kind: 'file', src: url };
  }

  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');

  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    const id = u.searchParams.get('v');
    if (id)
      return { kind: 'youtube', src: `https://www.youtube.com/embed/${id}` };
    const shortsMatch = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch?.[1]) {
      return {
        kind: 'youtube',
        src: `https://www.youtube.com/embed/${shortsMatch[1]}`,
      };
    }
    if (u.pathname.startsWith('/embed/')) {
      return {
        kind: 'youtube',
        src: `https://www.youtube.com${u.pathname}${u.search}`,
      };
    }
    return null;
  }

  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '');
    if (id)
      return { kind: 'youtube', src: `https://www.youtube.com/embed/${id}` };
    return null;
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const match = u.pathname.match(/(\d+)/);
    if (match)
      return {
        kind: 'vimeo',
        src: `https://player.vimeo.com/video/${match[1]}`,
      };
    return null;
  }

  if (
    (u.protocol === 'https:' || u.protocol === 'http:') &&
    /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(u.pathname)
  ) {
    return { kind: 'file', src: url };
  }

  return null;
}

/** Validates an `http(s)://` URL for iframe / third-party embedding and returns its clean hostname. */
export function safeEmbedHost(rawUrl: string): string | null {
  const url = rawUrl.trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const host = u.hostname.replace(/^www\.|^m\./, '');
    return host || null;
  } catch {
    return null;
  }
}

export type ParsedEmbedInput = {
  src: string;
  host: string;
  title?: string;
};

/**
 * Parses either a direct `http(s)://` URL or a single `<iframe ... src="http(s)://...">...</iframe>`
 * snippet (blocking `<script>` or unsafe protocols like `javascript:`).
 */
export function parseEmbedInput(raw: string): ParsedEmbedInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^<iframe\b/i.test(trimmed)) {
    if (
      !/^<iframe\b[\s\S]*(?:\/>|<\/iframe>)$/i.test(trimmed) ||
      /<script\b/i.test(trimmed)
    ) {
      return null;
    }
    const srcMatch = trimmed.match(
      /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i
    );
    const extracted = (srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? '').trim();
    const host = safeEmbedHost(extracted);
    if (!host) return null;
    const titleMatch = trimmed.match(/\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const title = (titleMatch?.[1] ?? titleMatch?.[2])?.trim() || undefined;
    return { src: extracted, host, title };
  }

  const host = safeEmbedHost(trimmed);
  return host ? { src: trimmed, host } : null;
}

export function isValidEmbedUrl(rawUrl: string): boolean {
  return parseEmbedInput(rawUrl) !== null;
}

export function isValidGeneralUrl(rawUrl: string): boolean {
  return /^(https?:\/\/|mailto:|tel:|\/)/i.test(rawUrl.trim());
}

export const VIDEO_URL_ERROR =
  'Must be a valid YouTube, Vimeo, or direct video (.mp4/.webm/.ogg/.mov) URL.';
export const EMBED_URL_ERROR =
  'Must be a valid <iframe src="https://..."></iframe> snippet or http(s):// URL.';
export const GENERAL_URL_ERROR =
  'Must be a URL starting with http(s)://, mailto:, tel: or /.';

/** Shared client & server validator for `text` and `url` fields based on their configured mode switches. */
export function validateEntryFieldValue(
  type: string,
  value: string,
  config?: { textMode?: TextFieldMode; urlMode?: UrlFieldMode }
): string | true {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (type === 'text') {
    if (config?.textMode === 'video') {
      return parseVideoUrl(trimmed) !== null || VIDEO_URL_ERROR;
    }
    if (config?.textMode === 'embed') {
      return isValidEmbedUrl(trimmed) || EMBED_URL_ERROR;
    }
    return true;
  }
  if (type === 'url') {
    if (config?.urlMode === 'video') {
      return parseVideoUrl(trimmed) !== null || VIDEO_URL_ERROR;
    }
    return isValidGeneralUrl(trimmed) || GENERAL_URL_ERROR;
  }
  return true;
}
