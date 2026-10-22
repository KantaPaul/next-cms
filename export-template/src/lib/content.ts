import type { Data } from '@measured/puck';
import type { PostCard, PostView } from '@/builder/post-template';
import type { ThemeTokens } from '@/builder/theme-tokens';

export type SeoMeta = {
  title?: string | null;
  description?: string | null;
  ogImage?: string | null;
  noIndex?: boolean | null;
  structuredDataType?: string | null;
  keywords?: string | null;
} | null;

export type ExportedPage = {
  id: string;
  title: string;
  slug: string;
  language: string;
  isHome: boolean;
  editorType: 'builder' | 'richtext';
  translationGroupId?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  content: Data | string;
  seo: SeoMeta;
  alternates: { language: string; slug: string | null; isHome: boolean; path: string }[];
  path: string;
};

export type ExportedPost = {
  id: string;
  view: PostView;
  seo: SeoMeta;
  layout: Data | null;
  path: string;
  updatedAt?: string | null;
};

export type MenuItem = {
  id: string;
  label: string;
  url: string;
  target?: string | null;
  badge?: string | null;
  children: MenuItem[];
};

export type Menu = {
  id: string;
  title: string;
  items: MenuItem[];
};

export type SiteSettings = {
  siteName: string;
  siteDescription: string | null;
  siteUrl: string;
  logo: string | null;
  favicon: string | null;
  defaultOgImage: string | null;
  headerMenuId: string | null;
  footerMenuId: string | null;
  robotsTxt: string | null;
  googleAnalyticsId: string | null;
  themeTokens: ThemeTokens;
};

export type FilterOptions = {
  categories: { slug: string; name: string; id?: string }[];
  tags: { slug: string; name: string; id?: string }[];
};

import settings from '@/content/settings.json';
import pages from '@/content/pages.json';
import posts from '@/content/posts.json';
import catalog from '@/content/post-catalog.json';
import menus from '@/content/menus.json';
import filterOptions from '@/content/filter-options.json';

export const siteSettings = settings as SiteSettings;
export const allPages = pages as ExportedPage[];
export const allPosts = posts as ExportedPost[];
export const postCatalog = catalog as PostCard[];
export const menusById = menus as Record<string, Menu>;
export const blogFilterOptions = filterOptions as FilterOptions;

const DEFAULT_LANGUAGE = 'en';

export function resolveRoute(segments: string[] = []): {
  language: string;
  slug: string | null;
} | null {
  const parts = segments.map(decodeURIComponent);
  if (parts.length === 0) return { language: DEFAULT_LANGUAGE, slug: null };
  const [first, second] = parts;
  const isLanguage = first !== DEFAULT_LANGUAGE && /^[a-z]{2}(-[a-z]{2})?$/i.test(first);
  if (parts.length === 1)
    return isLanguage
      ? { language: first, slug: null }
      : { language: DEFAULT_LANGUAGE, slug: first };
  if (parts.length === 2 && isLanguage) return { language: first, slug: second };
  return null;
}

export function resolvePostRoute(segments: string[] = []): {
  language: string;
  slug: string;
} | null {
  const parts = segments.map(decodeURIComponent);
  if (parts.length === 2 && parts[0] === 'blog')
    return { language: DEFAULT_LANGUAGE, slug: parts[1] };
  if (
    parts.length === 3 &&
    parts[1] === 'blog' &&
    parts[0] !== DEFAULT_LANGUAGE
  ) {
    return { language: parts[0], slug: parts[2] };
  }
  return null;
}

export function findPage(language: string, slug: string | null) {
  return (
    allPages.find(
      p =>
        p.language === language &&
        (slug === null ? p.isHome : p.slug === slug && !p.isHome)
    ) ?? null
  );
}

export function findPost(language: string, slug: string) {
  return allPosts.find(p => p.view.language === language && p.view.slug === slug) ?? null;
}

export type BlogSort = 'newest' | 'oldest' | 'title';

export function filterCatalog(opts: {
  language?: string;
  q?: string;
  category?: string;
  tag?: string;
  sort?: BlogSort;
  page?: number;
  size?: number;
}) {
  const size = Math.max(1, Math.min(48, opts.size ?? 9));
  const page = Math.max(1, opts.page ?? 1);
  let list = postCatalog.slice();

  if (opts.language) {
    list = list.filter(p => p.language === opts.language);
  }
  if (opts.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    list = list.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt ?? '').toLowerCase().includes(q)
    );
  }
  if (opts.category) {
    const c = opts.category.toLowerCase();
    list = list.filter(p =>
      p.categories.some(
        cat => cat.slug.toLowerCase() === c || cat.id === opts.category
      )
    );
  }
  if (opts.tag) {
    const t = opts.tag.toLowerCase();
    list = list.filter(p =>
      p.tags.some(tag => tag.slug.toLowerCase() === t || tag.id === opts.tag)
    );
  }

  const sort = opts.sort ?? 'newest';
  list.sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return sort === 'oldest' ? da - db : db - da;
  });

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size;
  const posts = list.slice(start, start + size);
  return { posts, total, totalPages, page, size };
}
