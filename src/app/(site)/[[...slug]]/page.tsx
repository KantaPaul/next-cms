import { type Data, Render, resolveAllData } from '@measured/puck';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { builderConfig, postBuilderConfig } from '@/builder/config';
import { sanitizeRichText } from '@/builder/sanitize';
import { ViewBeacon } from '@/components/analytics/view-beacon';
import { PAGES } from '@/config/pages';
import { env } from '@/env.mjs';
import {
  blogService,
  type PublicPost,
  resolvePostRoute,
} from '@/server/services/blog.service';
import {
  getPreviewPageId,
  getPreviewPostId,
} from '@/server/services/preview-session';
import {
  type PublicPage,
  publicSiteService,
  resolveRoute,
} from '@/server/services/public-site.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

type SearchParams = Record<string, string | string[] | undefined>;
type Params = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<SearchParams>;
};

async function loadPage(segments?: string[]) {
  const route = resolveRoute(segments);
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
  const route = resolvePostRoute(segments);
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

const absolute = (base: string, path: string) =>
  `${base.replace(/\/$/, '')}${path}`;

type Settings = Awaited<ReturnType<typeof siteSettingsService.get>>;

function postMetadata(post: PublicPost, settings: Settings): Metadata {
  const base = settings.siteUrl || env.SITE_URL;
  const { view, seo } = post;
  const url = absolute(base, PAGES.SITE.post(view.slug, view.language));
  const title = seo?.title || view.title;
  const description =
    seo?.description || view.excerpt || settings.siteDescription || undefined;
  const image =
    seo?.ogImage || view.featuredImage || settings.defaultOgImage || undefined;
  const languages = Object.fromEntries(
    post.alternates.map(alt => [
      alt.language,
      absolute(base, PAGES.SITE.post(alt.slug, alt.language)),
    ])
  );

  return {
    title: `${title} | ${settings.siteName}`,
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
      siteName: settings.siteName,
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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (post) return postMetadata(post, await siteSettingsService.get());

  const [page, settings] = await Promise.all([
    loadPage(slug),
    siteSettingsService.get(),
  ]);
  if (!page) return { title: 'Not found' };

  const base = settings.siteUrl || env.SITE_URL;
  const path = PAGES.SITE.page(page.slug, page.language, page.isHome);
  const seo = page.seo;
  const title = seo?.title || page.title;
  const description = seo?.description || settings.siteDescription || undefined;
  const image = seo?.ogImage || settings.defaultOgImage || undefined;
  const languages = Object.fromEntries(
    page.alternates.map(alt => [
      alt.language,
      absolute(base, PAGES.SITE.page(alt.slug, alt.language, alt.isHome)),
    ])
  );

  return {
    title:
      page.isHome && !seo?.title
        ? settings.siteName
        : `${title} | ${settings.siteName}`,
    description,
    keywords: seo?.keywords || undefined,
    alternates: {
      canonical: seo?.canonicalUrl || absolute(base, path),
      ...(Object.keys(languages).length > 1 && { languages }),
    },
    robots:
      seo?.noIndex || page.isDraft
        ? { index: false, follow: false }
        : undefined,
    openGraph: {
      title: seo?.ogTitle || title,
      description: seo?.ogDescription || description,
      type: seo?.ogType === 'article' ? 'article' : 'website',
      url: absolute(base, path),
      siteName: settings.siteName,
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
}: {
  page: PublicPage | NonNullable<Awaited<ReturnType<typeof loadPage>>>;
  base: string;
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
          PAGES.SITE.page(page.slug, page.language, page.isHome)
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
}: {
  post: PublicPost;
  settings: Settings;
}) {
  const { view, seo } = post;
  const base = settings.siteUrl || env.SITE_URL;
  const path = PAGES.SITE.post(view.slug, view.language);
  const beacon = !post.isDraft ? (
    <ViewBeacon postId={view.id} path={path} />
  ) : null;
  const layout = await blogService.layoutFor(post);
  const metadata = {
    themeTokens: settings.themeTokens,
    post: view,
    language: view.language,
  };
  const data = await resolveAllData(
    layout as Data,
    postBuilderConfig,
    metadata
  );
  const image = seo?.ogImage || view.featuredImage;

  return (
    <>
      <JsonLd
        json={{
          '@context': 'https://schema.org',
          '@type': seo?.structuredDataType || 'BlogPosting',
          headline: seo?.title || view.title,
          description: seo?.description || view.excerpt || undefined,
          url: absolute(base, PAGES.SITE.post(view.slug, view.language)),
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
      <Render config={postBuilderConfig} data={data} metadata={metadata} />
    </>
  );
}

export default async function SitePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const settings = await siteSettingsService.get();

  const post = await loadPost(slug);
  if (post) return <PostRoute post={post} settings={settings} />;

  const page = await loadPage(slug);
  if (!page) notFound();

  const base = settings.siteUrl || env.SITE_URL;
  const path = PAGES.SITE.page(page.slug, page.language, page.isHome);
  const beacon = !page.isDraft ? (
    <ViewBeacon pageId={page.id} path={path || '/'} />
  ) : null;

  if (page.editorType === 'builder') {
    const metadata = {
      themeTokens: settings.themeTokens,
      searchParams: await searchParams,
      language: page.language,
    };
    const data = await resolveAllData(
      page.content as Data,
      builderConfig,
      metadata
    );
    return (
      <>
        {beacon}
        <StructuredData page={page} base={base} />
        <Render config={builderConfig} data={data} metadata={metadata} />
      </>
    );
  }

  return (
    <>
      {beacon}
      <StructuredData page={page} base={base} />
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
