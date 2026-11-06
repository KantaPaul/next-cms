import { and, eq, isNull } from 'drizzle-orm';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getGlobalBlockContent } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { renderBuilderContent } from '@/builder/render-content';
import { sanitizeRichText } from '@/builder/sanitize';
import {
  type CollectionEntryWithFields,
  EntryProvider,
  useEntry,
} from '@/components/analytics/entry-context';
import { ViewBeacon } from '@/components/analytics/view-beacon';
import { PAGES } from '@/config/pages';
import { db } from '@/db';
import { pageContents, pageExperiments, pages } from '@/db/schema';
import { env } from '@/env.mjs';
import { buildListingSeoMetadata } from '@/lib/listing-seo';
import {
  blogService,
  type PublicArchive,
  type PublicPost,
  resolveArchiveRoute,
  resolvePostRoute,
} from '@/server/services/blog.service';
import { collectionsService } from '@/server/services/collections.service';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
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

function resolveEntryRoute(
  segments: string[] | undefined,
  site: { locales: { code: string }[] }
): [string | undefined, string | undefined] {
  if (!Array.isArray(segments)) return [undefined, undefined];
  const localeCodes = site.locales.map(l => l.code) ?? [];
  if (
    segments.length === 3 &&
    segments[0] === 'collections' &&
    segments[1] &&
    segments[2]
  ) {
    return [segments[1], segments[2]];
  }
  if (
    segments.length === 2 &&
    segments[0] &&
    segments[1] &&
    !localeCodes.includes(segments[0]) &&
    segments[0] !== 'blog'
  ) {
    return [segments[0], segments[1]];
  }
  return [undefined, undefined];
}

type TermArchiveRoute = {
  language: string;
  typeSlug: string;
  taxonomyKey: string;
  termSlug: string;
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
  siteSlug: string
): Metadata {
  const copy = localizedSettings(settings, defaultLocale, defaultLocale);
  const base = settings.siteUrl || env.SITE_URL;
  const path = `/${collection.slug}/${entry.slug}`;
  const url = absolute(base, path);
  const seo = entry.seo;
  const entryTitle = entry.data?.title || entry.data?.name || entry.slug;
  const title = seo?.title || entryTitle;
  const description =
    seo?.description || entry.excerpt || copy.siteDescription || undefined;
  const image =
    seo?.ogImage || entry.featuredImage || settings.defaultOgImage || undefined;

  return {
    title: `${title} | ${copy.siteName}`,
    description,
    keywords: seo?.keywords || undefined,
    alternates: {
      canonical: seo?.canonicalUrl || url,
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
      locale: defaultLocale,
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
    const path = `/${collection.slug}/${taxonomy.key}/${term.slug}`;
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

  const [page, settings] = await Promise.all([
    loadPage(segments),
    siteSettingsService.getPublic(),
  ]);
  if (!page) {
    const [colSlug, entSlug] = resolveEntryRoute(segments, site);
    if (colSlug && entSlug) {
      try {
        const entry = await collectionsService.getPublishedEntryByAnySlug(
          colSlug,
          entSlug,
          site.id
        );
        if (
          entry &&
          entry.status === 'published' &&
          entry.visibility === 'public' &&
          (!entry.scheduledAt || new Date(entry.scheduledAt) <= new Date())
        ) {
          return entryMetadata(
            entry,
            entry.collection,
            settings,
            site.defaultLocale,
            siteSlug ?? ''
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
    content: layout,
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
  const archiveTemplateId =
    copy.archiveTemplateId ?? settings.archiveTemplateId ?? null;
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
    <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">
      {!templateContent && archive.description && (
        <p className="s-muted mb-4 text-base">{archive.description}</p>
      )}
      {rendered}
    </div>
  );
}

function lockLoopToCollectionTerm(
  content: unknown,
  collectionId: string,
  termSlug: string
): unknown {
  if (!content || typeof content !== 'object') return content;
  const doc = content as Record<string, any>;
  if (Array.isArray(doc.content)) {
    return {
      ...doc,
      content: doc.content.map(block => {
        if (block?.type === 'LoopGrid' || block?.type === 'QueryLoop') {
          return {
            ...block,
            props: {
              ...block.props,
              source: 'collection-entries',
              collectionId,
              lockedTerm: termSlug,
            },
          };
        }
        return block;
      }),
    };
  }
  if (doc.nodes && typeof doc.nodes === 'object') {
    const nextNodes = { ...doc.nodes };
    for (const [id, node] of Object.entries(nextNodes) as [string, any][]) {
      if (node?.type === 'LoopGrid' || node?.type === 'QueryLoop') {
        nextNodes[id] = {
          ...node,
          props: {
            ...node.props,
            source: 'collection-entries',
            collectionId,
            lockedTerm: termSlug,
          },
        };
      }
    }
    return { ...doc, nodes: nextNodes };
  }
  return content;
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
  const archiveTemplateId =
    copy.archiveTemplateId ?? settings.archiveTemplateId ?? null;
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
      ? lockLoopToCollectionTerm(templateContent, collection.id, term.slug)
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
    <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">
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
    const [collectionSlug, entrySlug] = resolveEntryRoute(segments, site);

    if (collectionSlug && entrySlug) {
      try {
        const entry = await collectionsService.getPublishedEntryByAnySlug(
          collectionSlug,
          entrySlug,
          site.id
        );

        if (
          entry.visibility === 'private' ||
          entry.status !== 'published' ||
          (entry.scheduledAt && new Date(entry.scheduledAt) > new Date())
        ) {
          notFound();
        }

        const path = `/${collectionSlug}/${entrySlug}`;
        const terms = await collectionTaxonomiesService.getEntryTerms(entry.id);
        const layout = await collectionTemplatesService.layoutForEntry({
          ...entry,
          siteId: site.id,
        });

        const postView = entryToPostView(entry, entry.collection, terms);

        const metadata = {
          themeTokens: settings.themeTokens,
          siteSlug,
          searchParams: await searchParams,
          language: site.defaultLocale,
          custom: entry?.data,
          post: postView,
          site: {
            name: settings.siteName,
            description: settings.siteDescription,
            url: settings.siteUrl,
            logo: settings.logo,
          },
        };

        const rendered = await renderBuilderContent({
          content: layout,
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
          .getPublishedEntry(linkedCollection.slug, requestedSlug, site.id)
          .catch(() => null);
      }
      if (!collectionEntry) {
        collectionEntry = await collectionsService
          .getLatestPublishedEntry(linkedCollection.id, site.id)
          .catch(() => null);
      }
    }

    const metadata = {
      themeTokens: settings.themeTokens,
      siteSlug,
      searchParams: await searchParams,
      language: page.language,
      custom: collectionEntry?.data,
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
          dangerouslySetInnerHTML={{ __html: sanitizeRichText(page.content) }}
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
