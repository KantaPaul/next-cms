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
