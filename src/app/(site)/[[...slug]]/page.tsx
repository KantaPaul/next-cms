import { and, eq, isNull } from 'drizzle-orm';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getGlobalBlockContent } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { renderBuilderContent } from '@/builder/render-content';
import { withSingleExtras } from '@/builder/post-template';
import { sanitizeRichText } from '@/builder/sanitize';
import { applyFilters } from '@/server/plugins/hooks';
import {
  type CollectionEntryWithFields,
  EntryProvider,
  useEntry,
} from '@/components/analytics/entry-context';
import { ViewBeacon } from '@/components/analytics/view-beacon';
import { PAGES } from '@/config/pages';
import { normalizePostTypeSupports } from '@/config/post-types';
import { db } from '@/db';
import { pageContents, pageExperiments, pages, users } from '@/db/schema';
import { env } from '@/env.mjs';
import { buildListingSeoMetadata } from '@/lib/listing-seo';
import {
  blogService,
  type PublicArchive,
  type PublicPost,
  resolveArchiveRoute,
  resolvePostRoute,
} from '@/server/services/blog.service';
import { resolveEntryRoute } from '@/server/services/entry-route';
import { templateResolverService } from '@/server/services/template-resolver.service';
import { collectionsService } from '@/server/services/collections.service';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { commentsService } from '@/server/services/comments.service';
import { entryToPostView } from '@/builder/post-template';
import {
  getPreviewPageId,
  getPreviewPostId,
  getPreviewSession,
} from '@/server/services/preview-session';
import {
  type PublicPage,
  publicSiteService,
  resolveRoute,
} from '@/server/services/public-site.service';
import {
  siteContext,
  sitePathSegments,
  siteSlugPrefix,
  routingMode,
} from '@/server/services/site-context';
import {
  localizedSettings,
  siteSettingsService,
} from '@/server/services/site-settings.service';

type SearchParams = Record<string, string | string[] | undefined>;
type Params = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<SearchParams>;
};

async function loadPage(segments?: string[]) {
  const route = resolveRoute(segments, await siteContext.publicSite());
  if (!route) return null;

  const previewPageId = await getPreviewPageId();

  if (previewPageId) {
    const draft = await publicSiteService.getDraft(
      route.language,
      route.slug,
      previewPageId
    );
    if (draft) return draft;
  }

  return publicSiteService.getPublished(route.language, route.slug);
}

async function loadPost(segments?: string[]) {
  const route = resolvePostRoute(segments, await siteContext.publicSite());
  if (!route) return null;

  const previewPostId = await getPreviewPostId();

  if (previewPostId) {
    const draft = await blogService.getDraft(
      route.language,
      route.slug,
      previewPostId
    );
    if (draft) return draft;
  }

  return blogService.getPublished(route.language, route.slug);
}

async function loadArchive(segments?: string[]) {
  const route = resolveArchiveRoute(segments, await siteContext.publicSite());
  if (!route) return null;
  return blogService.getArchive(route);
}

const absolute = (base: string, path: string) =>
  `${base.replace(/\/$/, '')}${path}`;

type Settings = Awaited<ReturnType<typeof siteSettingsService.get>>;

function postMetadata(
  post: PublicPost,
  settings: Settings,
  defaultLocale: string,
  siteSlug: string
): Metadata {
  const copy = localizedSettings(settings, post.view.language, defaultLocale);
  const base = settings.siteUrl || env.SITE_URL;
  const { view, seo } = post;
  const url = absolute(
    base,
    PAGES.SITE.post(view.slug, view.language, defaultLocale, siteSlug)
  );
  const title = seo?.title || view.title;
  const description =
    seo?.description || view.excerpt || copy.siteDescription || undefined;
  const image =
    seo?.ogImage || view.featuredImage || settings.defaultOgImage || undefined;
  const languages = Object.fromEntries(
    post.alternates.map(alt => [
      alt.language,
      absolute(base, PAGES.SITE.post(alt.slug, alt.language, defaultLocale, siteSlug)),
    ])
  );

  return {
    title: `${title} | ${copy.siteName}`,
    description,
    keywords: seo?.keywords || undefined,
    alternates: {
      canonical: seo?.canonicalUrl || url,
      ...(Object.keys(languages).length > 1 && { languages }),
    },
    robots:
      seo?.noIndex || post.isDraft
        ? { index: false, follow: false }
        : undefined,
    openGraph: {
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      type: 'article',
      url,
      siteName: copy.siteName,
      locale: view.language,
      ...(view.publishedAt && { publishedTime: view.publishedAt }),
      ...(view.authorName && { authors: [view.authorName] }),
      ...(view.tags.length && { tags: view.tags.map(t => t.name) }),
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: seo?.twitterCard === 'summary' ? 'summary' : 'summary_large_image',
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      ...(image && { images: [image] }),
    },
    ...(settings.favicon && { icons: { icon: settings.favicon } }),
  };
}

function resolveCollectionAuthorRoute(
  segments: string[] | undefined,
  site: { defaultLocale: string; locales: { code: string }[] }
): CollectionAuthorRoute | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const defaultLocale = site.defaultLocale ?? 'en';
  const codes = site.locales.map(l => l.code) ?? [];
  const parts = segments.map(s => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  let language = defaultLocale;
  let offset = 0;
  if (
    parts.length === 3 &&
    parts[0] !== defaultLocale &&
    codes.includes(parts[0]) &&
    parts[1] !== 'blog'
  ) {
    language = parts[0];
    offset = 1;
  }
  if (parts[offset] === 'collections') offset += 1;
  if (parts.length !== offset + 3) return null;
  if (parts[offset + 1] !== 'author') return null;

  const typeSlug = parts[offset];
  const authorId = parts[offset + 2];
  if (!typeSlug || !authorId || typeSlug === 'blog') return null;
  return { language, typeSlug, authorId };
}

async function loadCollectionAuthorArchive(segments?: string[], site?: any) {
  const currentSite = site ?? (await siteContext.publicSite());
  const route = resolveCollectionAuthorRoute(segments, currentSite);
  if (!route) return null;
  try {
    const collection = await collectionsService.findBySlug(
      route.typeSlug,
      currentSite.id
    );
    if (!collection) return null;
    const [author] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, route.authorId))
      .limit(1);
    if (!author) return null;
    return {
      language: route.language,
      collection,
      author,
      authorId: route.authorId,
    };
  } catch {
    return null;
  }
}

function resolveCollectionsIndexRoute(
  segments: string[] | undefined,
  site: { defaultLocale: string; locales: { code: string }[] }
): { language: string } | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const defaultLocale = site.defaultLocale ?? 'en';
  const codes = site.locales.map(l => l.code) ?? [];
  const parts = segments.map(s => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  let language = defaultLocale;
  let offset = 0;
  if (parts.length === 2 && parts[0] !== defaultLocale && codes.includes(parts[0])) {
    language = parts[0];
    offset = 1;
  }
  return parts[offset] === 'collections' && parts.length === offset + 1
    ? { language }
    : null;
}

function resolveCollectionArchiveRoute(
  segments: string[] | undefined,
  site: { defaultLocale: string; locales: { code: string }[] }
): CollectionArchiveRoute | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const defaultLocale = site.defaultLocale ?? 'en';
  const codes = site.locales.map(l => l.code) ?? [];
  const parts = segments.map(s => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  let language = defaultLocale;
  let offset = 0;
  if (parts.length === 3 && parts[0] !== defaultLocale && codes.includes(parts[0])) {
    language = parts[0];
    offset = 1;
  }
  if (parts[offset] !== 'collections') return null;
  if (parts.length !== offset + 2) return null;
  const typeSlug = parts[offset + 1];
  if (!typeSlug || typeSlug === 'blog' || typeSlug === 'author') return null;
  return { language, typeSlug };
}


async function loadCollectionsIndex(segments?: string[], site?: any) {
  const currentSite = site ?? (await siteContext.publicSite());
  const route = resolveCollectionsIndexRoute(segments, currentSite);
  if (!route) return null;
  const collections = await collectionsService.list(currentSite.id);
  return { language: route.language, collections };
}

async function loadCollectionArchive(segments?: string[], site?: any) {
  const currentSite = site ?? (await siteContext.publicSite());
  const route = resolveCollectionArchiveRoute(segments, currentSite);
  if (!route) return null;
  try {
    const collection = await collectionsService.findBySlug(
      route.typeSlug,
      currentSite.id
    );
    if (!collection) return null;
    return { language: route.language, collection };
  } catch {
    return null;
  }
}

type TermArchiveRoute = {
  language: string;
  typeSlug: string;
  taxonomyKey: string;
  termSlug: string;
};

type CollectionArchiveRoute = {
  language: string;
  typeSlug: string;
};

type CollectionAuthorRoute = {
  language: string;
  typeSlug: string;
  authorId: string;
};

function resolveTermArchiveRoute(
  segments: string[] | undefined,
  site: { defaultLocale: string; locales: { code: string }[] }
): TermArchiveRoute | null {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  const defaultLocale = site.defaultLocale ?? 'en';
  const codes = site.locales.map(l => l.code) ?? [];
  const parts = segments.map(s => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  let language = defaultLocale;
  let offset = 0;

  if (
    parts.length >= 4 &&
    parts[0] !== defaultLocale &&
    codes.includes(parts[0]) &&
    parts[1] !== 'blog'
  ) {
    language = parts[0];
    offset = 1;
  }

  if (parts[offset] === 'collections') {
    offset += 1;
  }

  if (parts.length !== offset + 3) {
    return null;
  }

  const typeSlug = parts[offset];
  const taxonomyKey = parts[offset + 1];
  const termSlug = parts[offset + 2];

  if (
    typeSlug === 'blog' ||
    typeSlug === 'api' ||
    typeSlug === 'dashboard' ||
    !typeSlug ||
    !taxonomyKey ||
    !termSlug
  ) {
    return null;
  }

  return { language, typeSlug, taxonomyKey, termSlug };
}

async function loadTermArchive(segments?: string[], site?: any) {
  const currentSite = site ?? (await siteContext.publicSite());
  const route = resolveTermArchiveRoute(segments, currentSite);
  if (!route) return null;

  try {
    const collection = await collectionsService.findBySlug(
      route.typeSlug,
      currentSite.id
    );
    if (!collection) return null;

    const taxonomy = await collectionTaxonomiesService.getTaxonomyByKey(
      collection.id,
      route.taxonomyKey,
      currentSite.id
    );
    if (!taxonomy) return null;

    const term = await collectionTaxonomiesService.getTermBySlug(
      taxonomy.id,
      route.termSlug,
      currentSite.id
    );
    if (!term) return null;

    return {
      language: route.language,
      collection,
      taxonomy,
      term,
    };
  } catch {
    return null;
  }
}

function entryMetadata(
  entry: any,
  collection: any,
  settings: Settings,
  defaultLocale: string,
  siteSlug: string,
  alternates: { language: string; slug: string }[] = []
): Metadata {
  const language: string = entry.language || defaultLocale;
  const copy = localizedSettings(settings, language, defaultLocale);
  const base = settings.siteUrl || env.SITE_URL;
  const path = PAGES.SITE.entry(
    collection.slug,
    entry.slug,
    language,
    defaultLocale,
    siteSlug || undefined
  );
  const url = absolute(base, path);
  // hreflang: every published language version of this entry.
  const languages =
    alternates.length > 1
      ? Object.fromEntries(
          alternates.map(alt => [
            alt.language,
            absolute(
              base,
              PAGES.SITE.entry(
                collection.slug,
                alt.slug,
                alt.language,
                defaultLocale,
                siteSlug || undefined
              )
            ),
          ])
        )
      : undefined;
  const seo = entry.seo;
  const entryTitle = entry.data?.title || entry.data?.name || entry.slug;
  const title = seo?.title || entryTitle;
  const description =
    seo?.description || entry.excerpt || copy.siteDescription || undefined;
  const firstMediaField = collection?.fields?.find(
    (f: any) => f.type === 'media'
  );
  const customImage = firstMediaField
    ? (entry.data?.[firstMediaField.key] as string)
    : undefined;
  const image =
    seo?.ogImage ||
    entry.featuredImage ||
    customImage ||
    (entry.data?.photo as string) ||
    (entry.data?.image as string) ||
    (entry.data?.cover as string) ||
    settings.defaultOgImage ||
    undefined;

  return {
    title: `${title} | ${copy.siteName}`,
    description,
    keywords: seo?.keywords || undefined,
    alternates: {
      canonical: seo?.canonicalUrl || url,
      ...(languages && { languages }),
    },
    robots:
      seo?.noIndex || entry.status !== 'published'
        ? { index: false, follow: false }
        : undefined,
    openGraph: {
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      type: seo?.ogType === 'article' ? 'article' : 'website',
      url,
      siteName: copy.siteName,
      locale: language,
      ...(entry.publishedAt && {
        publishedTime: new Date(entry.publishedAt).toISOString(),
      }),
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: seo?.twitterCard === 'summary' ? 'summary' : 'summary_large_image',
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      ...(image && { images: [image] }),
    },
    ...(settings.favicon && { icons: { icon: settings.favicon } }),
  };
}

export async function generateMetadata({
  params,
  searchParams,
}: Params): Promise<Metadata> {
  const [{ slug }, queryParams] = await Promise.all([params, searchParams]);
  const site = await siteContext.publicSite();
  const siteSlug = siteSlugPrefix(site);
  const segments = sitePathSegments((slug?.join('/') ?? '/'), site);
  const post = await loadPost(segments);
  if (post)
    return postMetadata(
      post,
      await siteSettingsService.getPublic(),
      site.defaultLocale,
      siteSlug ?? ''
    );

  const archive = await loadArchive(segments);
  if (archive) {
    const settings = await siteSettingsService.getPublic();
    const copy = localizedSettings(settings, archive.language, site.defaultLocale);
    const base = settings.siteUrl || env.SITE_URL;
    const baseCanonical = absolute(base, archive.path);
    const listingSeo = buildListingSeoMetadata({
      baseCanonicalUrl: baseCanonical,
      searchParams: queryParams,
    });
    return {
      title: `${archive.title} | ${copy.siteName}`,
      description: archive.description || copy.seoDescription || undefined,
      alternates: {
        canonical: listingSeo.canonicalUrl,
      },
      robots: listingSeo.noIndex ? { index: false, follow: true } : undefined,
      openGraph: {
        title: `${archive.title} | ${copy.siteName}`,
        description: archive.description || copy.seoDescription || undefined,
        type: 'website',
        url: listingSeo.canonicalUrl,
        siteName: copy.siteName,
        locale: archive.language,
      },
      ...(settings.favicon && { icons: { icon: settings.favicon } }),
    };
  }

  const termArchive = await loadTermArchive(segments, site);
  if (termArchive) {
    const { collection, taxonomy, term, language } = termArchive;
    const settings = await siteSettingsService.getPublic();
    const copy = localizedSettings(settings, language, site.defaultLocale);
    const base = settings.siteUrl || env.SITE_URL;
    const path = PAGES.SITE.collectionTerm(
      collection.slug,
      taxonomy.key,
      term.slug,
      language,
      site.defaultLocale,
      siteSlug ?? undefined
    );
    const url = absolute(base, path);
    const listingSeo = buildListingSeoMetadata({
      baseCanonicalUrl: url,
      searchParams: queryParams,
    });
    const title = `${term.name} · ${collection.name}`;
    const description =
      term.description || `${collection.name} entries tagged with ${term.name}`;

    return {
      title: `${title} | ${copy.siteName}`,
      description,
      alternates: {
        canonical: listingSeo.canonicalUrl,
      },
      robots: listingSeo.noIndex ? { index: false, follow: true } : undefined,
      openGraph: {
        title: `${title} | ${copy.siteName}`,
        description,
        type: 'website',
        url: listingSeo.canonicalUrl,
        siteName: copy.siteName,
        locale: language,
      },
      ...(settings.favicon && { icons: { icon: settings.favicon } }),
    };
  }


  const authorArchive = await loadCollectionAuthorArchive(segments, site);
  if (authorArchive) {
    const { collection, author, authorId, language } = authorArchive;
    const settings = await siteSettingsService.getPublic();
    const copy = localizedSettings(settings, language, site.defaultLocale);
    const base = settings.siteUrl || env.SITE_URL;
    const path = PAGES.SITE.collectionAuthor(
      collection.slug,
      authorId,
      language,
      site.defaultLocale,
      siteSlug ?? undefined
    );
    const url = absolute(base, path);
    const listingSeo = buildListingSeoMetadata({
      baseCanonicalUrl: url,
      searchParams: queryParams,
    });
    const authorName = author.name || 'Author';
    const title = `${authorName} · ${collection.name}`;
    const description = `${collection.name} entries by ${authorName}`;
    return {
      title: `${title} | ${copy.siteName}`,
      description,
      alternates: { canonical: listingSeo.canonicalUrl },
      robots: listingSeo.noIndex ? { index: false, follow: true } : undefined,
      openGraph: {
        title: `${title} | ${copy.siteName}`,
        description,
        type: 'website',
        url: listingSeo.canonicalUrl,
        siteName: copy.siteName,
        locale: language,
      },
      ...(settings.favicon && { icons: { icon: settings.favicon } }),
    };
  }

  const collectionsIndex = await loadCollectionsIndex(segments, site);
  if (collectionsIndex) {
    const settings = await siteSettingsService.getPublic();
    const copy = localizedSettings(settings, collectionsIndex.language, site.defaultLocale);
    const base = settings.siteUrl || env.SITE_URL;
    const url = absolute(base, PAGES.SITE.collectionsIndex(collectionsIndex.language, site.defaultLocale, siteSlug ?? undefined));
    const listingSeo = buildListingSeoMetadata({ baseCanonicalUrl: url, searchParams: queryParams });
    return {
      title: `Collections | ${copy.siteName}`,
      description: copy.seoDescription || undefined,
      alternates: { canonical: listingSeo.canonicalUrl },
      robots: listingSeo.noIndex ? { index: false, follow: true } : undefined,
      openGraph: { title: `Collections | ${copy.siteName}`, description: copy.seoDescription || undefined, type: 'website', url: listingSeo.canonicalUrl, siteName: copy.siteName, locale: collectionsIndex.language },
      ...(settings.favicon && { icons: { icon: settings.favicon } }),
    };
  }

  const collectionArchive = await loadCollectionArchive(segments, site);
  if (collectionArchive) {
    const { collection, language } = collectionArchive;
    const settings = await siteSettingsService.getPublic();
    const copy = localizedSettings(settings, language, site.defaultLocale);
    const base = settings.siteUrl || env.SITE_URL;
    const path = PAGES.SITE.collectionArchive(
      collection.slug,
      language,
      site.defaultLocale,
      siteSlug ?? undefined
    );
    const url = absolute(base, path);
    const listingSeo = buildListingSeoMetadata({
      baseCanonicalUrl: url,
      searchParams: queryParams,
    });
    const description =
      collection.description || copy.seoDescription || undefined;
    return {
      title: `${collection.name} | ${copy.siteName}`,
      description,
      alternates: { canonical: listingSeo.canonicalUrl },
      robots: listingSeo.noIndex ? { index: false, follow: true } : undefined,
      openGraph: {
        title: `${collection.name} | ${copy.siteName}`,
        description,
        type: 'website',
        url: listingSeo.canonicalUrl,
        siteName: copy.siteName,
        locale: language,
      },
      ...(settings.favicon && { icons: { icon: settings.favicon } }),
    };
  }

  const [page, settings] = await Promise.all([
    loadPage(segments),
    siteSettingsService.getPublic(),
  ]);
  if (!page) {
    const [colSlug, entSlug, entLanguage] = resolveEntryRoute(segments, site);
    if (colSlug && entSlug) {
      try {
        const entry = await collectionsService.getPublishedEntryByAnySlug(
          colSlug,
          entSlug,
          site.id,
          entLanguage
        );
        if (
          entry &&
          entry.status === 'published' &&
          entry.visibility === 'public' &&
          (!entry.scheduledAt || new Date(entry.scheduledAt) <= new Date())
        ) {
          const alternates =
            await collectionsService.getPublishedEntryAlternates(
              entry.translationGroupId,
              site.id
            );
          return entryMetadata(
            entry,
            entry.collection,
            settings,
            site.defaultLocale,
            siteSlug ?? '',
            alternates
          );
        }
      } catch {
        // Fall through to not found
      }
    }
    return { title: 'Not found' };
  }

  const copy = localizedSettings(settings, page.language, site.defaultLocale);
  const base = settings.siteUrl || env.SITE_URL;
  const path = PAGES.SITE.page(
    page.slug,
    page.language,
    page.isHome,
    site.defaultLocale,
    siteSlug
  );
  const seo = page.seo;
  const title = seo?.title || page.title;
  const description = seo?.description || copy.seoDescription || undefined;
  const image = seo?.ogImage || settings.defaultOgImage || undefined;
  const languages = Object.fromEntries(
    page.alternates.map(alt => [
      alt.language,
      absolute(
        base,
        PAGES.SITE.page(
          alt.slug,
          alt.language,
          alt.isHome,
          site.defaultLocale,
          siteSlug
        ),
      ),
    ])
  );

  const baseCanonical = seo?.canonicalUrl || absolute(base, path);
  const listingSeo = buildListingSeoMetadata({
    baseCanonicalUrl: baseCanonical,
    searchParams: queryParams,
    baseNoIndex: Boolean(seo?.noIndex || page.isDraft),
  });

  return {
    title:
      page.isHome && !seo?.title
        ? copy.seoTitle
        : `${title} | ${copy.siteName}`,
    description,
    keywords: seo?.keywords || undefined,
    alternates: {
      canonical: listingSeo.canonicalUrl,
      ...(Object.keys(languages).length > 1 && { languages }),
    },
    robots:
      seo?.noIndex || page.isDraft
        ? { index: false, follow: false }
        : listingSeo.noIndex
          ? { index: false, follow: true }
          : undefined,
    openGraph: {
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      type: seo?.ogType === 'article' ? 'article' : 'website',
      url: listingSeo.canonicalUrl,
      siteName: copy.siteName,
      locale: page.language,
      ...(image && { images: [{ url: image }] }),
    },
    twitter: {
      card: seo?.twitterCard === 'summary' ? 'summary' : 'summary_large_image',
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      ...(image && { images: [image] }),
    },
    ...(settings.favicon && { icons: { icon: settings.favicon } }),
  };
}

function JsonLd({ json }: { json: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(json).replace(/</g, '\\u003c'),
      }}
    />
  );
}

function StructuredData({
  page,
  base,
  siteSlug,
}: {
  page: PublicPage | NonNullable<Awaited<ReturnType<typeof loadPage>>>;
  base: string;
  siteSlug: string;
}) {
  const type = page.seo?.structuredDataType;
  if (!type) return null;
  return (
    <JsonLd
      json={{
        '@context': 'https://schema.org',
        '@type': type,
        name: page.seo?.title || page.title,
        headline: page.seo?.title || page.title,
        description: page.seo?.description ?? undefined,
        url: absolute(
          base,
          PAGES.SITE.page(page.slug, page.language, page.isHome, siteSlug)
        ),
        inLanguage: page.language,
        ...(page.publishedAt && {
          datePublished: new Date(page.publishedAt).toISOString(),
        }),
        ...(page.updatedAt && {
          dateModified: new Date(page.updatedAt).toISOString(),
        }),
        ...(page.seo?.ogImage && { image: page.seo.ogImage }),
      }}
    />
  );
}

async function PostRoute({
  post,
  settings,
  siteSlug,
}: {
  post: PublicPost;
  settings: Settings;
  siteSlug: string;
}) {
  const { view, seo } = post;
  const base = settings.siteUrl || env.SITE_URL;
  const path = PAGES.SITE.post(view.slug, view.language, siteSlug);
  const beacon = !post.isDraft ? (
    <ViewBeacon postId={view.id} path={path} />
  ) : null;
  const layout = await blogService.layoutFor(post);
  const metadata = {
    themeTokens: settings.themeTokens,
    siteSlug,
    post: view,
    language: view.language,
    site: {
      name: settings.siteName,
      description: settings.siteDescription,
      url: settings.siteUrl,
      logo: settings.logo,
    },
    author: {
      name: view.authorName,
    },
  };
  const rendered = await renderBuilderContent({
    content: withSingleExtras(layout, {
      postNavigation: settings.readingSettings?.postNavigation,
      share: settings.readingSettings?.share,
      bookmark: settings.readingSettings?.bookmark,
      comments:
        settings.readingSettings?.comments !== false &&
        view.allowComments !== false,
    }),
    kind: 'post',
    metadata,
  });
  const image = seo?.ogImage || view.featuredImage;

  return (
    <>
      <JsonLd
        json={{
          '@context': 'https://schema.org',
          '@type': seo?.structuredDataType || 'BlogPosting',
          headline: seo?.title || view.title,
          description: seo?.description || view.excerpt || undefined,
          url: absolute(base, PAGES.SITE.post(view.slug, view.language, siteSlug)),
          inLanguage: view.language,
          ...(image && { image }),
          ...(view.authorName && {
            author: { '@type': 'Person', name: view.authorName },
          }),
          ...(view.publishedAt && { datePublished: view.publishedAt }),
          ...(post.updatedAt && {
            dateModified: new Date(post.updatedAt).toISOString(),
          }),
          ...(view.tags.length && {
            keywords: view.tags.map(t => t.name).join(', '),
          }),
          ...(view.categories[0] && {
            articleSection: view.categories[0].name,
          }),
        }}
      />
      {beacon}
      {rendered}
    </>
  );
}

async function ArchiveRouteView({
  archive,
  settings,
  siteId,
  siteSlug,
  defaultLocale,
  searchParams,
}: {
  archive: PublicArchive;
  settings: Settings;
  siteId: string;
  siteSlug: string;
  defaultLocale: string;
  searchParams: SearchParams;
}) {
  const copy = localizedSettings(settings, archive.language, defaultLocale);
  const ruleTemplateId = await templateResolverService.resolveAreaTemplate(
    siteId,
    'archive',
    {
      archiveType: archive.kind,
      postType: 'post',
      termId:
        archive.kind === 'category' || archive.kind === 'tag'
          ? archive.id
          : undefined,
    }
  );
  const archiveTemplateId =
    ruleTemplateId ?? copy.archiveTemplateId ?? settings.archiveTemplateId ?? null;
  const preview = await getPreviewSession();

  const archiveLoaderContext = {
    kind: archive.kind,
    id: archive.id,
    slug: archive.slug,
    title: archive.title,
    description: archive.description,
    year: archive.kind === 'date' ? archive.year : undefined,
    month: archive.kind === 'date' ? archive.month : undefined,
  };

  let templateContent: unknown = null;
  if (archiveTemplateId) {
    try {
      const templateBlock = await getGlobalBlockContent(archiveTemplateId, {
        siteId,
        draft: !!preview,
      });
      if (
        templateBlock &&
        (templateBlock.blocks?.length ||
          (templateBlock.content &&
            typeof templateBlock.content === 'object' &&
            Object.keys(templateBlock.content).length > 0))
      ) {
        templateContent = templateBlock.content;
      }
    } catch {
      templateContent = null;
    }
  }

  // Fallback default builder archive template with QueryFilter + QueryLoop
  const defaultArchiveContent = {
    root: {
      props: {
        maxWidth: 'xl',
        paddingY: 'md',
      },
    },
    content: [
      {
        type: 'QueryFilter',
        props: {
          id: 'archive-filter',
          targetLoopId: 'archive-loop',
          source: 'posts',
          showKeyword: true,
          showCategories: archive.kind !== 'category',
          showTags: archive.kind !== 'tag',
          showSort: true,
          showResultCount: true,
          showActiveChips: true,
          showFacetCounts: true,
          mobileDrawer: true,
        },
      },
      {
        type: 'QueryLoop',
        props: {
          id: 'archive-loop',
          // Must match the QueryFilter's targetLoopId so both share URL params.
          loopId: 'archive-loop',
          source: 'posts',
          title: archive.title,
          layout: 'grid',
          columnsDesktop: 3,
          columnsTablet: 2,
          columnsMobile: 1,
          gap: 'md',
          pageSize: 9,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'numbered',
          showExcerpt: true,
          showImage: true,
          showDate: true,
          showAuthor: true,
          showTerms: true,
          emptyText: 'No posts in this archive yet.',
        },
      },
    ],
  };

  const rendered = await renderBuilderContent({
    content: templateContent ?? defaultArchiveContent,
    metadata: {
      themeTokens: settings.themeTokens,
      language: archive.language,
      searchParams,
      archive: archiveLoaderContext,
      siteId,
      siteSlug,
      site: {
        name: settings.siteName,
        description: settings.siteDescription,
        url: settings.siteUrl,
        logo: settings.logo,
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-[var(--site-max-width,72rem)] px-5 py-8 md:px-8">
      {!templateContent && archive.description && (
        <p className="s-muted mb-4 text-base">{archive.description}</p>
      )}
      {rendered}
    </div>
  );
}

function lockLoopToCollectionArchive(
  content: unknown,
  collectionId: string,
  opts?: { lockedTerm?: string; lockedAuthorId?: string }
): unknown {
  if (!content || typeof content !== 'object') return content;
  const lock = {
    source: 'collection-entries' as const,
    collectionId,
    ...(opts?.lockedTerm ? { lockedTerm: opts.lockedTerm } : {}),
    ...(opts?.lockedAuthorId ? { lockedAuthorId: opts.lockedAuthorId } : {}),
  };
  const doc = content as Record<string, any>;
  if (Array.isArray(doc.content)) {
    return {
      ...doc,
      content: doc.content.map(block => {
        if (block?.type === 'LoopGrid' || block?.type === 'QueryLoop') {
          return { ...block, props: { ...block.props, ...lock } };
        }
        return block;
      }),
    };
  }
  if (doc.nodes && typeof doc.nodes === 'object') {
    const nextNodes = { ...doc.nodes };
    for (const [id, node] of Object.entries(nextNodes) as [string, any][]) {
      if (node?.type === 'LoopGrid' || node?.type === 'QueryLoop') {
        nextNodes[id] = { ...node, props: { ...node.props, ...lock } };
      }
    }
    return { ...doc, nodes: nextNodes };
  }
  return content;
}

async function CollectionAuthorArchiveRouteView({
  authorArchive,
  settings,
  siteId,
  siteSlug,
  defaultLocale,
  searchParams,
}: {
  authorArchive: {
    language: string;
    collection: any;
    author: { id: string; name: string | null };
    authorId: string;
  };
  settings: Settings;
  siteId: string;
  siteSlug: string;
  defaultLocale: string;
  searchParams: SearchParams;
}) {
  const { collection, author, authorId, language } = authorArchive;
  const copy = localizedSettings(settings, language, defaultLocale);
  const archiveTemplateId =
    (collection.settings as any)?.archiveTemplateId ??
    (await templateResolverService.resolveAreaTemplate(siteId, 'archive', {
      archiveType: 'author',
      postType: collection.slug,
    })) ??
    copy.archiveTemplateId ??
    settings.archiveTemplateId ??
    null;
  const preview = await getPreviewSession();

  let templateContent: unknown = null;
  if (archiveTemplateId) {
    try {
      const templateBlock = await getGlobalBlockContent(archiveTemplateId, {
        siteId,
        draft: !!preview,
      });
      if (
        templateBlock &&
        (templateBlock.blocks?.length ||
          (templateBlock.content &&
            typeof templateBlock.content === 'object' &&
            Object.keys(templateBlock.content).length > 0))
      ) {
        templateContent = templateBlock.content;
      }
    } catch {
      templateContent = null;
    }
  }

  const authorName = author.name || 'Author';
  const defaultArchiveContent = {
    root: { props: { maxWidth: 'xl', paddingY: 'md' } },
    content: [
      {
        type: 'LoopGrid',
        props: {
          id: 'archive-loop',
          loopId: 'archive-loop',
          source: 'collection-entries',
          collectionId: collection.id,
          lockedAuthorId: authorId,
          title: `${authorName} · ${collection.name}`,
          layout: 'grid',
          columnsDesktop: 3,
          columnsTablet: 2,
          columnsMobile: 1,
          gap: 'md',
          pageSize: 12,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'numbered',
          showExcerpt: true,
          showImage: true,
          showDate: true,
          showAuthor: true,
          showTerms: false,
          emptyText: `No ${String(collection.name || 'entries').toLowerCase()} by this author yet.`,
        },
      },
    ],
  };

  const rendered = await renderBuilderContent({
    content: templateContent
      ? lockLoopToCollectionArchive(templateContent, collection.id, {
          lockedAuthorId: authorId,
        })
      : defaultArchiveContent,
    metadata: {
      themeTokens: settings.themeTokens,
      language,
      searchParams,
      siteId,
      siteSlug,
      archive: {
        kind: 'author',
        id: authorId,
        slug: authorId,
        title: authorName,
      },
      site: {
        name: settings.siteName,
        description: settings.siteDescription,
        url: settings.siteUrl,
        logo: settings.logo,
      },
    },
    kind: 'page',
  });

  return <>{rendered}</>;
}

async function CollectionArchiveRouteView({
  collectionArchive,
  settings,
  siteId,
  siteSlug,
  defaultLocale,
  searchParams,
}: {
  collectionArchive: { language: string; collection: any };
  settings: Settings;
  siteId: string;
  siteSlug: string;
  defaultLocale: string;
  searchParams: SearchParams;
}) {
  const { collection, language } = collectionArchive;
  const copy = localizedSettings(settings, language, defaultLocale);
  const archiveTemplateId =
    (collection.settings as any)?.archiveTemplateId ??
    (await templateResolverService.resolveAreaTemplate(siteId, 'archive', {
      archiveType: 'collection',
      postType: collection.slug,
    })) ??
    copy.archiveTemplateId ??
    settings.archiveTemplateId ??
    null;
  const preview = await getPreviewSession();

  let templateContent: unknown = null;
  if (archiveTemplateId) {
    try {
      const templateBlock = await getGlobalBlockContent(archiveTemplateId, {
        siteId,
        draft: !!preview,
      });
      if (
        templateBlock &&
        (templateBlock.blocks?.length ||
          (templateBlock.content &&
            typeof templateBlock.content === 'object' &&
            Object.keys(templateBlock.content).length > 0))
      ) {
        templateContent = templateBlock.content;
      }
    } catch {
      templateContent = null;
    }
  }

  const defaultArchiveContent = {
    root: { props: { maxWidth: 'xl', paddingY: 'md' } },
    content: [
      {
        type: 'LoopGrid',
        props: {
          id: 'archive-loop',
          loopId: 'archive-loop',
          source: 'collection-entries',
          collectionId: collection.id,
          title: collection.name,
          layout: 'grid',
          columnsDesktop: 3,
          columnsTablet: 2,
          columnsMobile: 1,
          gap: 'md',
          pageSize: 12,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'numbered',
          showExcerpt: true,
          showImage: true,
          showDate: true,
          showAuthor: false,
          showTerms: false,
          emptyText: `No ${String(collection.name || 'entries').toLowerCase()} entries yet.`,
        },
      },
    ],
  };

  const rendered = await renderBuilderContent({
    // The archive template is shared with the blog: point its listings at
    // this post type, like the term and author archives do.
    content: templateContent
      ? lockLoopToCollectionArchive(templateContent, collection.id)
      : defaultArchiveContent,
    metadata: {
      themeTokens: settings.themeTokens,
      language,
      searchParams,
      siteId,
      siteSlug,
      site: {
        name: settings.siteName,
        description: settings.siteDescription,
        url: settings.siteUrl,
        logo: settings.logo,
      },
    },
    kind: 'page',
  });

  return <>{rendered}</>;
}

async function TermArchiveRouteView({
  termArchive,
  settings,
  siteId,
  siteSlug,
  defaultLocale,
  searchParams,
}: {
  termArchive: {
    language: string;
    collection: any;
    taxonomy: any;
    term: any;
  };
  settings: Settings;
  siteId: string;
  siteSlug: string;
  defaultLocale: string;
  searchParams: SearchParams;
}) {
  const { collection, taxonomy, term, language } = termArchive;
  const copy = localizedSettings(settings, language, defaultLocale);
  const ruleTemplateId = await templateResolverService.resolveAreaTemplate(
    siteId,
    'archive',
    { archiveType: 'term', postType: collection?.slug, termId: term.id }
  );
  const archiveTemplateId =
    ruleTemplateId ?? copy.archiveTemplateId ?? settings.archiveTemplateId ?? null;
  const preview = await getPreviewSession();

  const archiveLoaderContext = {
    kind: 'term',
    id: term.id,
    slug: term.slug,
    title: term.name,
    description: term.description,
  };

  let templateContent: unknown = null;
  if (archiveTemplateId) {
    try {
      const templateBlock = await getGlobalBlockContent(archiveTemplateId, {
        siteId,
        draft: !!preview,
      });
      if (
        templateBlock &&
        (templateBlock.blocks?.length ||
          (templateBlock.content &&
            typeof templateBlock.content === 'object' &&
            Object.keys(templateBlock.content).length > 0))
      ) {
        templateContent = templateBlock.content;
      }
    } catch {
      templateContent = null;
    }
  }

  // Fallback default archive content: Loop Grid for that post type locked to the term
  const defaultArchiveContent = {
    root: {
      props: {
        maxWidth: 'xl',
        paddingY: 'md',
      },
    },
    content: [
      {
        type: 'LoopGrid',
        props: {
          id: 'archive-loop',
          loopId: 'archive-loop',
          source: 'collection-entries',
          collectionId: collection.id,
          lockedTerm: term.slug,
          title: `${term.name} (${collection.name})`,
          layout: 'grid',
          columnsDesktop: 3,
          columnsTablet: 2,
          columnsMobile: 1,
          gap: 'md',
          pageSize: 9,
          sortField: 'publishedAt',
          sortOrder: 'desc',
          pagination: 'numbered',
          showExcerpt: true,
          showImage: true,
          showDate: true,
          showAuthor: true,
          showTerms: true,
          emptyText: `No ${collection.name.toLowerCase()} entries in this archive yet.`,
        },
      },
    ],
  };

  const rendered = await renderBuilderContent({
    content: templateContent
      ? lockLoopToCollectionArchive(templateContent, collection.id, {
          lockedTerm: term.slug,
        })
      : defaultArchiveContent,
    metadata: {
      themeTokens: settings.themeTokens,
      language,
      searchParams,
      archive: archiveLoaderContext,
      siteId,
      siteSlug,
      site: {
        name: settings.siteName,
        description: settings.siteDescription,
        url: settings.siteUrl,
        logo: settings.logo,
      },
    },
  });

  return (
    <div className="mx-auto w-full max-w-[var(--site-max-width,72rem)] px-5 py-8 md:px-8">
      {!templateContent && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{term.name}</h1>
          <p className="s-muted mt-1 text-sm font-medium">
            {collection.name} · {taxonomy.name}
          </p>
          {term.description && (
            <p className="s-muted mt-2 text-base">{term.description}</p>
          )}
        </div>
      )}
      {rendered}
    </div>
  );
}

export default async function SitePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const settings = await siteSettingsService.getPublic();
  const site = await siteContext.publicSite();
  const siteSlug = siteSlugPrefix(site);
  const segments = sitePathSegments((slug?.join('/') ?? '/'), site);

  const first = segments[0] && decodeURIComponent(segments[0]);
  if (first === site.defaultLocale && site.locales.some(l => l.code === first)) {
    const rest = segments.slice(1).join('/');
    const qs = new URLSearchParams(await searchParams as Record<string, string>).toString();
    redirect((`${siteSlug ? `/${siteSlug}` : ''}/${rest}`.replace(/\/$/, '') || '/') + (qs ? `?${qs}` : ''));
  }


  // Canonical collection URLs live under /collections/...
  {
    const parts = segments.map(s => { try { return decodeURIComponent(s); } catch { return s; } });
    const codes = site.locales.map((l: any) => l.code) ?? [];
    let off = 0;
    let langPrefix = '';
    if (parts.length >= 2 && parts[0] !== site.defaultLocale && codes.includes(parts[0])) {
      off = 1; langPrefix = `/${parts[0]}`;
    }
    const rest = parts.slice(off);
    const sp = siteSlug ? `/${siteSlug}` : '';
    if (rest[0] && rest[0] !== 'collections' && rest[0] !== 'blog' && rest[0] !== 'api' && rest[0] !== 'dashboard' && rest[0] !== 'search') {
      if (rest.length === 1) {
        const col = await collectionsService.findBySlug(rest[0], site.id).catch(() => null);
        if (col) redirect(`${sp}${langPrefix}/collections/${col.slug}`);
      }
      if (rest.length === 2 && rest[1] !== 'author') {
        const ent = await collectionsService
          .getPublishedEntryByAnySlug(
            rest[0],
            rest[1],
            site.id,
            langPrefix ? parts[0] : site.defaultLocale
          )
          .catch(() => null);
        if (ent) redirect(`${sp}${langPrefix}/collections/${rest[0]}/${rest[1]}`);
      }
    }
  }

  // Root URL in path mode redirects to the default (prefixed) site. Only the
  // bare `/` redirects; `/{site}` is already that site's home.
  if (
    (routingMode() === 'path' || routingMode() === 'both') &&
    site.slug &&
    !slug?.length
  ) {
    redirect(`/${site.slug}`);
  }

  const archive = await loadArchive(segments);
  if (archive) {
    return (
      <ArchiveRouteView
        archive={archive}
        settings={settings}
        siteId={site.id}
        siteSlug={siteSlug ?? ''}
        defaultLocale={site.defaultLocale}
        searchParams={await searchParams}
      />
    );
  }

  const termArchive = await loadTermArchive(segments, site);
  if (termArchive) {
    return (
      <TermArchiveRouteView
        termArchive={termArchive}
        settings={settings}
        siteId={site.id}
        siteSlug={siteSlug ?? ''}
        defaultLocale={site.defaultLocale}
        searchParams={await searchParams}
      />
    );
  }

  const authorArchive = await loadCollectionAuthorArchive(segments, site);
  if (authorArchive) {
    return (
      <CollectionAuthorArchiveRouteView
        authorArchive={authorArchive}
        settings={settings}
        siteId={site.id}
        siteSlug={siteSlug ?? ''}
        defaultLocale={site.defaultLocale}
        searchParams={await searchParams}
      />
    );
  }

  const collectionsIndex = await loadCollectionsIndex(segments, site);
  if (collectionsIndex) {
    const copy = localizedSettings(settings, collectionsIndex.language, site.defaultLocale);
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
        {collectionsIndex.collections.length ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collectionsIndex.collections.map((c: any) => (
              <li key={c.id} className="s-border s-radius border p-5">
                <a className="font-semibold hover:underline" href={PAGES.SITE.collectionArchive(c.slug, collectionsIndex.language, site.defaultLocale, siteSlug ?? undefined)}>{c.name}</a>
                {c.description ? <p className="s-muted mt-2 text-sm">{c.description}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="s-muted mt-6">No collections published yet.</p>
        )}
      </div>
    );
  }

  const collectionArchive = await loadCollectionArchive(segments, site);
  if (collectionArchive) {
    return (
      <CollectionArchiveRouteView
        collectionArchive={collectionArchive}
        settings={settings}
        siteId={site.id}
        siteSlug={siteSlug ?? ''}
        defaultLocale={site.defaultLocale}
        searchParams={await searchParams}
      />
    );
  }

  const post = await loadPost(segments);
  if (post)
    return (
      <PostRoute
        post={post}
        settings={settings}
        siteSlug={siteSlug ?? ''}
      />
    );

  const page = await loadPage(segments);
  if (!page) {
    // Collection route: /{collectionSlug}/{entrySlug} OR /collections/{collectionSlug}/{entrySlug}
    const [collectionSlug, entrySlug, entryLanguage] = resolveEntryRoute(
      segments,
      site
    );

    if (collectionSlug && entrySlug) {
      try {
        const entry = await collectionsService.getPublishedEntryByAnySlug(
          collectionSlug,
          entrySlug,
          site.id,
          entryLanguage
        );

        if (
          entry.visibility === 'private' ||
          entry.status !== 'published' ||
          (entry.scheduledAt && new Date(entry.scheduledAt) > new Date())
        ) {
          notFound();
        }

        const path = PAGES.SITE.entry(
          collectionSlug,
          entrySlug,
          entry.language,
          site.defaultLocale,
          siteSlug ?? undefined
        );
        const [terms, layout, commentCount] = await Promise.all([
          collectionTaxonomiesService.getEntryTerms(entry.id),
          collectionTemplatesService.layoutForEntry({
            ...entry,
            siteId: site.id,
          }),
          commentsService.approvedCountForEntry(entry.id),
        ]);

        const supports = normalizePostTypeSupports(entry.collection?.supports);
        const postView = entryToPostView(
          { ...entry, commentCount },
          entry.collection,
          terms,
          { siteSlug: siteSlug ?? undefined }
        );

        const metadata = {
          themeTokens: settings.themeTokens,
          siteSlug,
          siteId: site.id,
          searchParams: await searchParams,
          language: entry.language || site.defaultLocale,
          entry: entry?.data,
          custom: entry?.data,
          post: postView,
          collectionEntry: entry,
          defaultLocale: site.defaultLocale,
          site: {
            name: settings.siteName,
            description: settings.siteDescription,
            url: settings.siteUrl,
            logo: settings.logo,
          },
        };

        const rendered = await renderBuilderContent({
          content: withSingleExtras(layout, {
            postNavigation: settings.readingSettings?.postNavigation,
            share: settings.readingSettings?.share,
            bookmark: settings.readingSettings?.bookmark,
            comments:
              settings.readingSettings?.comments !== false &&
              supports.comments &&
              entry.allowComments !== false,
          }),
          metadata,
          kind: 'post',
        });

        return (
          <EntryProvider entry={entry as any}>
            {beaconForEntry(entry, path)}
            {rendered}
          </EntryProvider>
        );
      } catch {
        notFound();
      }
    }
    notFound();
  }

  const base = settings.siteUrl || env.SITE_URL;
  const path = PAGES.SITE.page(
    page.slug,
    page.language,
    page.isHome,
    site.defaultLocale,
    siteSlug
  );

  // A/B experiment variant for published builder pages
  let variant: 'a' | 'b' | null = null;
  let experimentContent: unknown = null;
  if (!page.isDraft && page.editorType === 'builder') {
    const jar = await cookies();
    const [experiment] = await db
      .select()
      .from(pageExperiments)
      .where(eq(pageExperiments.pageId, page.id))
      .limit(1);

    if (experiment && experiment.status === 'running') {
      const stored = jar.get('cms_ab')?.value;
      const [cookiePageId, cookieVariant] = (stored ?? '').split(':');
      variant =
        cookiePageId === page.id &&
        (cookieVariant === 'a' || cookieVariant === 'b')
          ? (cookieVariant as 'a' | 'b')
          : Math.floor(Math.random() * 100) + 1 <= (experiment.weight ?? 50)
            ? 'b'
            : 'a';

      if (variant === 'b') {
        experimentContent = experiment.variantContent;
      }
    }
  }

  const beacon = !page.isDraft ? (
    <ViewBeacon pageId={page.id} path={path || '/'} variant={variant} />
  ) : null;

  if (page.editorType === 'builder') {
    let collectionEntry = null;
    const linkedCollection = await collectionsService
      .findByTemplatePageId(page.id, site.id)
      .catch(() => null);

    if (linkedCollection) {
      const sParams = await searchParams;
      const requestedSlug =
        typeof sParams.entry === 'string'
          ? sParams.entry
          : typeof sParams.slug === 'string'
            ? sParams.slug
            : undefined;

      if (requestedSlug) {
        collectionEntry = await collectionsService
          .getPublishedEntry(
            linkedCollection.slug,
            requestedSlug,
            site.id,
            page.language
          )
          .catch(() => null);
      }
      if (!collectionEntry) {
        collectionEntry = await collectionsService
          .getLatestPublishedEntry(linkedCollection.id, site.id, page.language)
          .catch(() => null);
      }
    }

    const metadata = {
      themeTokens: settings.themeTokens,
      siteSlug,
      searchParams: await searchParams,
      language: page.language,
      custom: collectionEntry?.data,
      collectionEntry,
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        seoTitle: page.seo?.title,
        seoDescription: page.seo?.description,
        publishedAt: page.publishedAt,
        createdAt: page.seo?.createdAt,
        updatedAt: page.updatedAt,
      },
      site: {
        name: settings.siteName,
        description: settings.siteDescription,
        url: settings.siteUrl,
        logo: settings.logo,
      },
    };
    // Variant B content goes through the same data loading as the page.
    const rendered = await renderBuilderContent({
      content: variant === 'b' ? experimentContent : page.content,
      metadata,
    });
    return (
      <EntryProvider entry={collectionEntry}>
        {beacon}
        <StructuredData page={page} base={base} siteSlug={siteSlug ?? ''} />
        {rendered}
      </EntryProvider>
    );
  }

  const htmlContent = await applyFilters(
    'content.html',
    sanitizeRichText(page.content),
    {
      kind: 'page',
      id: page.id,
      slug: page.slug,
      title: page.title,
      language: page.language,
      siteId: page.siteId,
    }
  );

  return (
    <>
      {beacon}
      <StructuredData page={page} base={base} siteSlug={siteSlug ?? ''} />
      <article
        className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20"
        lang={page.language}
      >
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
            {page.title}
          </h1>
          {page.publishedAt && (
            <p className="s-muted mt-4 text-sm">
              <time dateTime={new Date(page.publishedAt).toISOString()}>
                {new Date(page.publishedAt).toLocaleDateString(page.language, {
                  dateStyle: 'long',
                })}
              </time>
            </p>
          )}
        </header>
        <div
          className="s-prose prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </article>
    </>
  );
}

function beaconForEntry(entry: { id: string }, path: string) {
  return <ViewBeacon pageId={entry.id} path={path} />;
}

function CollectionEntryList({
  entry,
  base,
}: {
  entry: CollectionEntryWithFields;
  base: string;
}) {
  const fields = entry.collection.fields ?? [];
  const entryData = entry.data as Record<string, unknown> | undefined;
  return (
    <article className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
      <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
        Entry
      </h1>
      <div className="mt-6 space-y-4">
        {fields.map((field: { key: string; label: string; type: string }) => {
          const value = entryData?.[field.key];
          return (
            <div key={field.key}>
              <h3 className="text-lg font-semibold">{field.label}</h3>
              {field.type === 'richtext' ? (
                <div
                  className="s-prose prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichText(String(value ?? '')),
                  }}
                />
              ) : field.type === 'media' ? (
                value ? (
                  <img src={String(value)} alt="" className="max-w-full" />
                ) : null
              ) : (
                <p>{String(value ?? '')}</p>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
