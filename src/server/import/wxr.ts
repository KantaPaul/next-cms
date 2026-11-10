import { XMLParser } from 'fast-xml-parser';

export type WxrAuthor = {
  wpId: string;
  login: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
};

export type WxrTerm = {
  wpId: string;
  taxonomy: string;
  slug: string;
  name: string;
  parentSlug?: string;
  description?: string;
};

export type WxrComment = {
  wpId: string;
  postWpId: string;
  parentWpId: string;
  authorName: string;
  authorEmail: string;
  authorUrl?: string;
  date: string;
  content: string;
  approved: boolean;
  type: string;
};

export type WxrPost = {
  wpId: string;
  postType: string;
  title: string;
  slug: string;
  status: string;
  link: string;
  guid: string;
  creatorLogin: string;
  pubDate: string;
  postDate: string;
  postDateGmt: string;
  content: string;
  excerpt: string;
  postParent: string;
  menuOrder: number;
  attachmentUrl?: string;
  categories: string[];
  tags: string[];
  navMenuSlugs: string[];
  meta: Record<string, string>;
  comments: WxrComment[];
};

export type ParsedWxr = {
  wxrVersion: string;
  siteTitle: string;
  siteUrl: string;
  baseBlogUrl: string;
  authors: WxrAuthor[];
  terms: WxrTerm[];
  posts: WxrPost[];
  comments: WxrComment[];
  meta: Record<string, Record<string, string>>;
  skippedTypes: Record<string, number>;
};

const KNOWN_POST_TYPES = new Set([
  'post',
  'page',
  'attachment',
  'nav_menu_item',
]);

const ARRAY_TAGS = new Set([
  'wp:author',
  'wp:category',
  'wp:tag',
  'wp:term',
  'item',
  'category',
  'wp:postmeta',
  'wp:comment',
  'wp:commentmeta',
]);

function asArray<T>(val: T | T[] | undefined | null): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

function textOf(val: unknown): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    const rec = val as Record<string, unknown>;
    if ('#text' in rec) return textOf(rec['#text']);
  }
  return '';
}

function trimmedText(val: unknown): string {
  return textOf(val).trim();
}

export function slugifyImportValue(input: string, fallback = 'item'): string {
  let decoded = input;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    decoded = input;
  }
  const slug = decoded
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
  return slug || fallback;
}

/**
 * Parses a WordPress WXR XML export string into normalized structures.
 * Disables XML entity expansion to prevent XXE / billion-laughs attacks.
 */
export function parseWxr(xml: string): ParsedWxr {
  if (typeof xml !== 'string' || !xml.trim()) {
    throw new Error('WXR file is empty.');
  }

  // Reject entity definitions upfront as an extra guard alongside processEntities: false
  if (/<!ENTITY\b/i.test(xml)) {
    throw new Error('XML entity declarations are not permitted.');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    processEntities: false,
    htmlEntities: false,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    isArray: name => ARRAY_TAGS.has(name),
  });

  const parsed = parser.parse(xml) as Record<string, unknown>;
  const rss = (parsed.rss ?? parsed) as Record<string, unknown>;
  const channel = rss?.channel as Record<string, unknown> | undefined;

  if (!channel || typeof channel !== 'object') {
    throw new Error('Invalid WXR file: missing <rss><channel>.');
  }

  const wxrVersion = trimmedText(channel['wp:wxr_version']) || '1.2';
  const siteTitle = trimmedText(channel.title);
  const siteUrl = trimmedText(channel['wp:base_site_url']) || trimmedText(channel.link);
  const baseBlogUrl = trimmedText(channel['wp:base_blog_url']) || siteUrl;

  const authors: WxrAuthor[] = [];
  const seenAuthorKeys = new Set<string>();
  for (const rawAuthor of asArray(channel['wp:author'] as Record<string, unknown>[])) {
    if (!rawAuthor || typeof rawAuthor !== 'object') continue;
    const login = trimmedText(rawAuthor['wp:author_login']);
    const email = trimmedText(rawAuthor['wp:author_email']).toLowerCase();
    const wpId = trimmedText(rawAuthor['wp:author_id']) || login || email;
    const displayName =
      trimmedText(rawAuthor['wp:author_display_name']) || login || email;
    const firstName = trimmedText(rawAuthor['wp:author_first_name']) || undefined;
    const lastName = trimmedText(rawAuthor['wp:author_last_name']) || undefined;
    const dedupeKey = email || login || wpId;
    if (!dedupeKey || seenAuthorKeys.has(dedupeKey)) continue;
    seenAuthorKeys.add(dedupeKey);
    authors.push({
      wpId,
      login,
      email,
      displayName,
      firstName,
      lastName,
    });
  }

  const terms: WxrTerm[] = [];
  const seenTerms = new Set<string>();
  const addTerm = (term: WxrTerm) => {
    if (!term.slug && !term.name) return;
    const slug = slugifyImportValue(term.slug || term.name, `term-${term.wpId || terms.length + 1}`);
    const key = `${term.taxonomy}:${slug}`;
    if (seenTerms.has(key)) return;
    seenTerms.add(key);
    terms.push({ ...term, slug });
  };

  for (const rawCat of asArray(channel['wp:category'] as Record<string, unknown>[])) {
    if (!rawCat || typeof rawCat !== 'object') continue;
    addTerm({
      wpId: trimmedText(rawCat['wp:term_id']),
      taxonomy: 'category',
      slug: trimmedText(rawCat['wp:category_nicename']),
      name: trimmedText(rawCat['wp:cat_name']) || trimmedText(rawCat['wp:category_nicename']),
      parentSlug: trimmedText(rawCat['wp:category_parent']) || undefined,
      description: trimmedText(rawCat['wp:category_description']) || undefined,
    });
  }

  for (const rawTag of asArray(channel['wp:tag'] as Record<string, unknown>[])) {
    if (!rawTag || typeof rawTag !== 'object') continue;
    addTerm({
      wpId: trimmedText(rawTag['wp:term_id']),
      taxonomy: 'post_tag',
      slug: trimmedText(rawTag['wp:tag_slug']),
      name: trimmedText(rawTag['wp:tag_name']) || trimmedText(rawTag['wp:tag_slug']),
      description: trimmedText(rawTag['wp:tag_description']) || undefined,
    });
  }

  for (const rawTerm of asArray(channel['wp:term'] as Record<string, unknown>[])) {
    if (!rawTerm || typeof rawTerm !== 'object') continue;
    const taxonomy = trimmedText(rawTerm['wp:term_taxonomy']) || 'category';
    addTerm({
      wpId: trimmedText(rawTerm['wp:term_id']),
      taxonomy,
      slug: trimmedText(rawTerm['wp:term_slug']),
      name: trimmedText(rawTerm['wp:term_name']) || trimmedText(rawTerm['wp:term_slug']),
      parentSlug: trimmedText(rawTerm['wp:term_parent']) || undefined,
      description: trimmedText(rawTerm['wp:term_description']) || undefined,
    });
  }

  const posts: WxrPost[] = [];
  const allComments: WxrComment[] = [];
  const metaMap: Record<string, Record<string, string>> = {};
  const skippedTypes: Record<string, number> = {};

  for (const rawItem of asArray(channel.item as Record<string, unknown>[])) {
    if (!rawItem || typeof rawItem !== 'object') continue;

    const wpId = trimmedText(rawItem['wp:post_id']);
    const postType = trimmedText(rawItem['wp:post_type']) || 'post';
    const title = trimmedText(rawItem.title);
    const rawSlug = trimmedText(rawItem['wp:post_name']);
    const slug = slugifyImportValue(
      rawSlug || title || `item-${wpId || posts.length + 1}`,
      `item-${wpId || posts.length + 1}`
    );
    const status = trimmedText(rawItem['wp:status']) || 'publish';
    const link = trimmedText(rawItem.link);
    const guid = trimmedText(rawItem.guid);
    const creatorLogin = trimmedText(rawItem['dc:creator']);
    const pubDate = trimmedText(rawItem.pubDate);
    const postDate = trimmedText(rawItem['wp:post_date']);
    const postDateGmt = trimmedText(rawItem['wp:post_date_gmt']);
    const content = textOf(rawItem['content:encoded']);
    const excerpt = textOf(rawItem['excerpt:encoded']);
    const postParent = trimmedText(rawItem['wp:post_parent']) || '0';
    const menuOrder = Number.parseInt(trimmedText(rawItem['wp:menu_order']) || '0', 10) || 0;
    const attachmentUrl = trimmedText(rawItem['wp:attachment_url']) || undefined;

    const itemCategories: string[] = [];
    const itemTags: string[] = [];
    const navMenuSlugs: string[] = [];

    for (const catEl of asArray(rawItem.category as Record<string, unknown>[])) {
      if (!catEl) continue;
      if (typeof catEl === 'string') {
        const s = slugifyImportValue(catEl);
        if (s) itemCategories.push(s);
        continue;
      }
      const domain = trimmedText(catEl['@_domain']);
      const nicename = trimmedText(catEl['@_nicename']);
      const label = trimmedText(catEl['#text']);
      const catSlug = slugifyImportValue(nicename || label);
      if (!catSlug) continue;

      if (domain === 'category') {
        itemCategories.push(catSlug);
        if (!seenTerms.has(`category:${catSlug}`)) {
          addTerm({
            wpId: '',
            taxonomy: 'category',
            slug: catSlug,
            name: label || catSlug,
          });
        }
      } else if (domain === 'post_tag') {
        itemTags.push(catSlug);
        if (!seenTerms.has(`post_tag:${catSlug}`)) {
          addTerm({
            wpId: '',
            taxonomy: 'post_tag',
            slug: catSlug,
            name: label || catSlug,
          });
        }
      } else if (domain === 'nav_menu') {
        navMenuSlugs.push(catSlug);
        if (!seenTerms.has(`nav_menu:${catSlug}`)) {
          addTerm({
            wpId: '',
            taxonomy: 'nav_menu',
            slug: catSlug,
            name: label || catSlug,
          });
        }
      }
    }

    const postMeta: Record<string, string> = {};
    for (const m of asArray(rawItem['wp:postmeta'] as Record<string, unknown>[])) {
      if (!m || typeof m !== 'object') continue;
      const key = trimmedText(m['wp:meta_key']);
      const value = textOf(m['wp:meta_value']);
      if (key) {
        postMeta[key] = value;
      }
    }
    if (wpId) {
      metaMap[wpId] = postMeta;
    }

    const itemComments: WxrComment[] = [];
    for (const c of asArray(rawItem['wp:comment'] as Record<string, unknown>[])) {
      if (!c || typeof c !== 'object') continue;
      const commentType = trimmedText(c['wp:comment_type']).toLowerCase();
      if (commentType === 'pingback' || commentType === 'trackback') continue;

      const approvedRaw = trimmedText(c['wp:comment_approved']).toLowerCase();
      const approved = approvedRaw === '1' || approvedRaw === 'approve';
      const comment: WxrComment = {
        wpId: trimmedText(c['wp:comment_id']),
        postWpId: wpId,
        parentWpId: trimmedText(c['wp:comment_parent']) || '0',
        authorName: trimmedText(c['wp:comment_author']) || 'Anonymous',
        authorEmail: trimmedText(c['wp:comment_author_email']).toLowerCase(),
        authorUrl: trimmedText(c['wp:comment_author_url']) || undefined,
        date:
          trimmedText(c['wp:comment_date_gmt']) ||
          trimmedText(c['wp:comment_date']),
        content: textOf(c['wp:comment_content']).trim(),
        approved,
        type: commentType || 'comment',
      };
      itemComments.push(comment);
      allComments.push(comment);
    }

    if (!KNOWN_POST_TYPES.has(postType)) {
      skippedTypes[postType] = (skippedTypes[postType] ?? 0) + 1;
    }

    posts.push({
      wpId,
      postType,
      title: title || slug,
      slug,
      status,
      link,
      guid,
      creatorLogin,
      pubDate,
      postDate,
      postDateGmt,
      content,
      excerpt,
      postParent,
      menuOrder,
      attachmentUrl,
      categories: [...new Set(itemCategories)],
      tags: [...new Set(itemTags)],
      navMenuSlugs: [...new Set(navMenuSlugs)],
      meta: postMeta,
      comments: itemComments,
    });
  }

  return {
    wxrVersion,
    siteTitle,
    siteUrl,
    baseBlogUrl,
    authors,
    terms,
    posts,
    comments: allComments,
    meta: metaMap,
    skippedTypes,
  };
}
