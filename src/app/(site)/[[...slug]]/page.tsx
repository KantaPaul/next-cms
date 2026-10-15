import { Render, resolveAllData, type Data } from '@measured/puck';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { builderConfig } from '@/builder/config';
import { sanitizeRichText } from '@/builder/sanitize';
import { PAGES } from '@/config/pages';
import { env } from '@/env.mjs';
import { getPreviewPageId } from '@/server/services/preview-session';
import { publicSiteService, resolveRoute, type PublicPage } from '@/server/services/public-site.service';
import { siteSettingsService } from '@/server/services/site-settings.service';

type Params = { params: Promise<{ slug?: string[] }> };

async function loadPage(segments?: string[]) {
  const route = resolveRoute(segments);
  if (!route) return null;

  const previewPageId = await getPreviewPageId();
  if (previewPageId) {
    const draft = await publicSiteService.getDraft(route.language, route.slug, previewPageId);
    if (draft) return draft;
  }
  return publicSiteService.getPublished(route.language, route.slug);
}

const absolute = (base: string, path: string) => `${base.replace(/\/$/, '')}${path}`;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [page, settings] = await Promise.all([loadPage(slug), siteSettingsService.get()]);
  if (!page) return { title: 'Not found' };

  const base = settings.siteUrl || env.SITE_URL;
  const path = PAGES.SITE.page(page.slug, page.language, page.isHome);
  const seo = page.seo;
  const title = seo?.title || page.title;
  const description = seo?.description || settings.siteDescription || undefined;
  const image = seo?.ogImage || settings.defaultOgImage || undefined;
  const languages = Object.fromEntries(
    page.alternates.map(alt => [alt.language, absolute(base, PAGES.SITE.page(alt.slug, alt.language, alt.isHome))])
  );

  return {
    title: page.isHome && !seo?.title ? settings.siteName : `${title} | ${settings.siteName}`,
    description,
    keywords: seo?.keywords || undefined,
    alternates: {
      canonical: seo?.canonicalUrl || absolute(base, path),
      ...(Object.keys(languages).length > 1 && { languages }),
    },
    robots: seo?.noIndex || page.isDraft ? { index: false, follow: false } : undefined,
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

function StructuredData({ page, base }: { page: PublicPage | NonNullable<Awaited<ReturnType<typeof loadPage>>>; base: string }) {
  const type = page.seo?.structuredDataType;
  if (!type) return null;
  const json = {
    '@context': 'https://schema.org',
    '@type': type,
    name: page.seo?.title || page.title,
    headline: page.seo?.title || page.title,
    description: page.seo?.description ?? undefined,
    url: absolute(base, PAGES.SITE.page(page.slug, page.language, page.isHome)),
    inLanguage: page.language,
    ...(page.publishedAt && { datePublished: new Date(page.publishedAt).toISOString() }),
    ...(page.updatedAt && { dateModified: new Date(page.updatedAt).toISOString() }),
    ...(page.seo?.ogImage && { image: page.seo.ogImage }),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json).replace(/</g, '\\u003c') }}
    />
  );
}

export default async function SitePage({ params }: Params) {
  const { slug } = await params;
  const [page, settings] = await Promise.all([loadPage(slug), siteSettingsService.get()]);
  if (!page) notFound();

  const base = settings.siteUrl || env.SITE_URL;

  if (page.editorType === 'builder') {
    const data = await resolveAllData(page.content as Data, builderConfig, { themeTokens: settings.themeTokens });
    return (
      <>
        <StructuredData page={page} base={base} />
        <Render config={builderConfig} data={data} metadata={{ themeTokens: settings.themeTokens }} />
      </>
    );
  }

  return (
    <>
      <StructuredData page={page} base={base} />
      <article className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20" lang={page.language}>
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">{page.title}</h1>
          {page.publishedAt && (
            <p className="s-muted mt-4 text-sm">
              <time dateTime={new Date(page.publishedAt).toISOString()}>
                {new Date(page.publishedAt).toLocaleDateString(page.language, { dateStyle: 'long' })}
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
