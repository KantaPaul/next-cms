import type { PageStatusType } from '@/db/schemas/shared.schema';
import type { WxrPost, WxrTerm } from './wxr';

/**
 * Maps WordPress post/page status to next-cms status.
 */
export function mapWpStatus(
  wpStatus: string,
  importAsDrafts = false
): { status: PageStatusType; visibility: 'public' | 'private' } {
  const normalized = wpStatus.trim().toLowerCase();
  const visibility: 'public' | 'private' =
    normalized === 'private' ? 'private' : 'public';

  if (importAsDrafts) {
    return { status: 'draft', visibility };
  }

  switch (normalized) {
    case 'publish':
      return { status: 'published', visibility };
    case 'future':
      return { status: 'scheduled', visibility };
    case 'draft':
    case 'pending':
    case 'private':
    case 'auto-draft':
    default:
      return { status: 'draft', visibility };
  }
}

/**
 * Resolves a unique slug given a set of already-used slugs, appending `-2`, `-3`, ...
 * on collision. Adds the chosen slug to `usedSlugs`.
 */
export function resolveUniqueSlug(
  desiredSlug: string,
  usedSlugs: Set<string>,
  maxLength = 255
): { slug: string; renamed: boolean } {
  const cleanBase = (desiredSlug || 'item').slice(0, maxLength);
  if (!usedSlugs.has(cleanBase)) {
    usedSlugs.add(cleanBase);
    return { slug: cleanBase, renamed: false };
  }

  let n = 2;
  while (n < 10_000) {
    const suffix = `-${n}`;
    const candidate = `${cleanBase.slice(0, maxLength - suffix.length)}${suffix}`;
    if (!usedSlugs.has(candidate)) {
      usedSlugs.add(candidate);
      return { slug: candidate, renamed: true };
    }
    n += 1;
  }

  const fallback = `${cleanBase.slice(0, maxLength - 10)}-${Date.now().toString(36)}`;
  usedSlugs.add(fallback);
  return { slug: fallback, renamed: true };
}

/**
 * Parses a WordPress date string (`2024-05-12 10:30:00` or RFC2822) into a Date or null.
 */
export function resolveWpDate(
  ...candidates: Array<string | undefined | null>
): Date | null {
  for (const raw of candidates) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('0000-00-00')) continue;
    // WP post_date_gmt is "YYYY-MM-DD HH:MM:SS"
    const isoLike = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
      ? `${trimmed.replace(' ', 'T')}Z`
      : trimmed;
    const d = new Date(isoLike);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function normalizePath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://')) {
    return null;
  }
  if (trimmed.length > 1 && trimmed.endsWith('/')) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

/**
 * Builds candidate 301 redirect `fromPath` values for an imported WordPress post or page.
 * Covers `/YYYY/MM/slug/`, `/slug/`, `/?p=ID`, `/?page_id=ID`, and the original `<link>` path.
 */
export function buildWordPressRedirectPaths(
  post: Pick<
    WxrPost,
    'wpId' | 'postType' | 'slug' | 'link' | 'postDate' | 'postDateGmt' | 'pubDate'
  >,
  newUrl: string
): string[] {
  const paths = new Set<string>();
  const normalizedTarget = normalizePath(newUrl);

  const add = (candidate: string | null | undefined) => {
    if (!candidate) return;
    const norm = normalizePath(candidate);
    if (!norm) return;
    if (norm === '/' || norm === normalizedTarget) return;
    paths.add(norm);
  };

  // 1. Original link pathname from WXR <link>
  if (post.link) {
    try {
      const u = new URL(post.link);
      if (u.searchParams.has('p')) {
        add(`/?p=${u.searchParams.get('p')}`);
      } else if (u.searchParams.has('page_id')) {
        add(`/?page_id=${u.searchParams.get('page_id')}`);
      }
      add(u.pathname);
    } catch {
      if (post.link.startsWith('/')) add(post.link);
    }
  }

  // 2. Query-string permalink styles
  if (post.wpId) {
    add(`/?p=${post.wpId}`);
    if (post.postType === 'page') {
      add(`/?page_id=${post.wpId}`);
    }
  }

  // 3. Slug-only permalink `/slug`
  if (post.slug) {
    add(`/${post.slug}`);
  }

  // 4. Date-based post permalink `/YYYY/MM/slug` and `/YYYY/MM/DD/slug`
  if (post.postType === 'post' && post.slug) {
    const dt = resolveWpDate(post.postDateGmt, post.postDate, post.pubDate);
    if (dt) {
      const yyyy = String(dt.getUTCFullYear());
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      add(`/${yyyy}/${mm}/${post.slug}`);
      add(`/${yyyy}/${mm}/${dd}/${post.slug}`);
    }
  }

  return [...paths];
}

/**
 * Builds redirect paths for imported WordPress categories and tags.
 */
export function buildTaxonomyRedirectPaths(
  term: Pick<WxrTerm, 'taxonomy' | 'slug'>,
  newUrl: string
): string[] {
  if (!term.slug) return [];
  const candidates: string[] = [];
  if (term.taxonomy === 'category') {
    candidates.push(`/category/${term.slug}`);
  } else if (term.taxonomy === 'post_tag') {
    candidates.push(`/tag/${term.slug}`);
  }
  return candidates.filter(p => p !== newUrl);
}

export type MappedMenuItemNode = {
  label: string;
  url: string;
  target: '_self' | '_blank';
  children: Array<{
    label: string;
    url: string;
    target: '_self' | '_blank';
  }>;
};

/**
 * Resolves a WordPress `nav_menu_item` list into next-cms's 2-level menu tree.
 * Rewrites internal post/page/category links using `idMap` and `termUrlMap`.
 */
export function buildMenuTree(
  items: WxrPost[],
  maps: {
    postUrlByWpId: Map<string, string>;
    termUrlByWpId: Map<string, string>;
    urlByOldUrl: Map<string, string>;
    postTitleByWpId?: Map<string, string>;
    termNameByWpId?: Map<string, string>;
  }
): MappedMenuItemNode[] {
  const sorted = [...items].sort((a, b) => a.menuOrder - b.menuOrder);

  type RawNode = {
    wpId: string;
    parentMenuItemId: string;
    label: string;
    url: string;
    target: '_self' | '_blank';
  };

  const nodes: RawNode[] = sorted.map(item => {
    const m = item.meta;
    const itemType = m._menu_item_type || 'custom';
    const objectId = m._menu_item_object_id || '';
    const objectKind = m._menu_item_object || '';
    const parentMenuItemId = m._menu_item_menu_item_parent || '0';
    const target: '_self' | '_blank' =
      m._menu_item_target === '_blank' ? '_blank' : '_self';

    let url = m._menu_item_url || item.link || '#';
    if (itemType === 'post_type' && objectId && maps.postUrlByWpId.has(objectId)) {
      url = maps.postUrlByWpId.get(objectId)!;
    } else if (
      itemType === 'taxonomy' &&
      objectId &&
      maps.termUrlByWpId.has(objectId)
    ) {
      url = maps.termUrlByWpId.get(objectId)!;
    } else if (url && maps.urlByOldUrl.has(url)) {
      url = maps.urlByOldUrl.get(url)!;
    } else if (url) {
      // Strip trailing slash on normalized match
      const trimmed = url.endsWith('/') && url.length > 1 ? url.slice(0, -1) : url;
      if (maps.urlByOldUrl.has(trimmed)) {
        url = maps.urlByOldUrl.get(trimmed)!;
      } else if (
        (itemType === 'post_type' || itemType === 'taxonomy') &&
        url.startsWith('http')
      ) {
        try {
          const parsed = new URL(url);
          const p =
            parsed.pathname.length > 1 && parsed.pathname.endsWith('/')
              ? parsed.pathname.slice(0, -1)
              : parsed.pathname;
          if (maps.urlByOldUrl.has(p)) {
            url = maps.urlByOldUrl.get(p)!;
          } else if (objectKind === 'category' && p.includes('/category/')) {
            const slug = p.split('/').pop();
            if (slug) url = `/blog/category/${slug}`;
          }
        } catch {
          // keep original url
        }
      }
    }

    const fallbackLabel =
      (objectId && maps.postTitleByWpId?.get(objectId)) ||
      (objectId && maps.termNameByWpId?.get(objectId)) ||
      'Menu item';

    const label = (item.title && item.title !== item.slug ? item.title : '') ||
      item.title ||
      fallbackLabel;

    return {
      wpId: item.wpId,
      parentMenuItemId,
      label: label.slice(0, 100),
      url: url.slice(0, 500),
      target,
    };
  });

  const byWpId = new Map(nodes.map(n => [n.wpId, n]));

  // Find root ancestor (max 2 levels in next-cms)
  const rootIdFor = (node: RawNode): string | null => {
    let cur: RawNode | undefined = node;
    const seen = new Set<string>();
    while (
      cur &&
      cur.parentMenuItemId &&
      cur.parentMenuItemId !== '0' &&
      !seen.has(cur.wpId)
    ) {
      seen.add(cur.wpId);
      const parent = byWpId.get(cur.parentMenuItemId);
      if (!parent) return null;
      if (!parent.parentMenuItemId || parent.parentMenuItemId === '0') {
        return parent.wpId;
      }
      cur = parent;
    }
    return null;
  };

  const topLevel = nodes.filter(
    n => !n.parentMenuItemId || n.parentMenuItemId === '0' || !byWpId.has(n.parentMenuItemId)
  );
  const childrenByTop = new Map<string, Array<{ label: string; url: string; target: '_self' | '_blank' }>>();

  for (const n of nodes) {
    if (topLevel.includes(n)) continue;
    const rootId = rootIdFor(n);
    if (rootId) {
      const list = childrenByTop.get(rootId) ?? [];
      list.push({ label: n.label, url: n.url, target: n.target });
      childrenByTop.set(rootId, list);
    } else {
      topLevel.push(n);
    }
  }

  return topLevel.map(top => ({
    label: top.label,
    url: top.url,
    target: top.target,
    children: childrenByTop.get(top.wpId) ?? [],
  }));
}
