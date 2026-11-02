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

  const [page, settings] = await Promise.all([
    loadPage(segments),
    siteSettingsService.getPublic(),
  ]);
  if (!page) return { title: 'Not found' };

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
          urlNamespace: 'archive-loop',
          source: 'posts',
          showSearch: true,
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
          source: 'posts',
          heading: archive.title,
          layout: 'grid',
          columns: 3,
          gap: 'md',
          pageSize: 9,
          sortField: 'publishedAt',
          sortDirection: 'desc',
          paginationMode: 'numbered',
          urlNamespace: 'archive-loop',
          showExcerpt: true,
          showImage: true,
          showDate: true,
          showAuthor: true,
          showCategories: true,
          emptyHeading: 'No posts in this archive yet.',
          emptyBody: 'Try adjusting your filters or check back soon.',
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
    // Collection route: /{collectionSlug}/{entrySlug}
    const localeCodes = site.locales.map(l => l.code) ?? [];
    if (
      Array.isArray(segments) &&
      segments.length === 2 &&
      segments[0] &&
      segments[1] &&
      !localeCodes.includes(segments[0]) &&
      segments[0] !== 'blog'
    ) {
      try {
        const entry = await collectionsService.getPublishedEntry(
          segments[0],
          segments[1]
        );
        const base = settings.siteUrl || env.SITE_URL;
        const path = `/${segments[0]}/${segments[1]}`;

        if (entry.collection.templatePageId) {
          const template = await publicSiteService.getPublished(
            site.defaultLocale,
            ''
          );
          // Find the template page by id - getPublished looks up by slug,
          // so we need to query pages directly for the template page.
          const [templatePage] = await db
            .select()
            .from(pages)
            .where(
              and(
                eq(pages.id, entry.collection.templatePageId),
                eq(pages.siteId, site.id),
                isNull(pages.deletedAt),
                eq(pages.status, 'published')
              )
            )
            .limit(1);

          if (templatePage) {
            const [contentRow] = await db
              .select({ content: pageContents.content })
              .from(pageContents)
              .where(
                and(
                  eq(pageContents.pageId, templatePage.id),
                  eq(pageContents.kind, 'published')
                )
              )
              .limit(1);

            const metadata = {
              themeTokens: settings.themeTokens,
              searchParams: await searchParams,
              language: templatePage.language,
              custom: entry?.data,
              site: {
                name: settings.siteName,
                description: settings.siteDescription,
                url: settings.siteUrl,
                logo: settings.logo,
              },
            };
            const rendered = await renderBuilderContent({
              content: contentRow?.content,
              metadata,
            });
            return (
              <EntryProvider entry={entry}>
                {beaconForEntry(entry, path)}
                {rendered}
              </EntryProvider>
            );
          }
        }

        // No template page - render plain field list
        return (
          <EntryProvider entry={entry}>
            <CollectionEntryList entry={entry} base={base} />
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
    const metadata = {
      themeTokens: settings.themeTokens,
      searchParams: await searchParams,
      language: page.language,
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
      <>
        {beacon}
        <StructuredData page={page} base={base} siteSlug={siteSlug ?? ''} />
        {rendered}
      </>
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
