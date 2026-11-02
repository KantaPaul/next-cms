import type { Metadata } from 'next';
import { getGlobalBlockContent } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.actions';
import { SearchResults } from '@/builder/blocks/search-results';
import { renderBuilderContent } from '@/builder/render-content';
import { PAGES } from '@/config/pages';
import { getPreviewSession } from '@/server/services/preview-session';
import {
  searchIndex,
  type SearchDocumentKind,
} from '@/server/services/search.service';
import { siteContext, siteSlugPrefix } from '@/server/services/site-context';
import {
  localizedSettings,
  siteSettingsService,
} from '@/server/services/site-settings.service';

export const metadata: Metadata = {
  title: 'Search',
  robots: { index: false, follow: true },
};

const VALID_KINDS = new Set<SearchDocumentKind>([
  'page',
  'post',
  'collection',
  'video',
]);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    page?: string;
    lang?: string;
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;
  const rawQ = typeof params.q === 'string' ? params.q : '';
  const query = rawQ.trim();
  const rawKind = typeof params.kind === 'string' ? params.kind : undefined;
  const kind =
    rawKind && VALID_KINDS.has(rawKind as SearchDocumentKind)
      ? (rawKind as SearchDocumentKind)
      : undefined;
  const pageNum = Math.max(
    1,
    Number.parseInt(typeof params.page === 'string' ? params.page : '1', 10) ||
      1
  );

  const [site, settings, preview] = await Promise.all([
    siteContext.publicSite(),
    siteSettingsService.getPublic(),
    getPreviewSession(),
  ]);
  const siteSlug = siteSlugPrefix(site);
  const language =
    typeof params.lang === 'string' && params.lang
      ? params.lang
      : site.defaultLocale;
  const copy = localizedSettings(settings, language, site.defaultLocale);

  // If a custom Search Results builder template is assigned, render it
  const searchTemplateId = copy.searchTemplateId ?? settings.searchTemplateId;
  if (searchTemplateId) {
    try {
      const templateBlock = await getGlobalBlockContent(searchTemplateId, {
        siteId: site.id,
        draft: !!preview,
      });
      if (
        templateBlock &&
        (templateBlock.blocks?.length ||
          (templateBlock.content &&
            typeof templateBlock.content === 'object' &&
            Object.keys(templateBlock.content).length > 0))
      ) {
        const rendered = await renderBuilderContent({
          content: templateBlock.content,
          metadata: {
            themeTokens: settings.themeTokens,
            language,
            searchParams: params,
            siteId: site.id,
            siteSlug,
            site: {
              name: settings.siteName,
              description: settings.siteDescription,
              url: settings.siteUrl,
              logo: settings.logo,
            },
          },
        });
        return <>{rendered}</>;
      }
    } catch {
      // Fall back to default search results layout
    }
  }

  const searchResult = query
    ? await searchIndex.searchPaginated({
        q: query,
        language,
        kind,
        page: pageNum,
        limit: 10,
      })
    : {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        countsByKind: { all: 0, page: 0, post: 0, collection: 0, video: 0 },
        usedTrigramFallback: false,
      };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <SearchResults
        title="Search"
        placeholder="Search pages, posts, collections, and videos..."
        pageSize={10}
        showTabs={true}
        showThumbnails={true}
        showSnippets={true}
        showTypeBadges={true}
        emptyText="No matches."
        query={query}
        activeKind={kind ?? 'all'}
        items={searchResult.items}
        total={searchResult.total}
        page={searchResult.page}
        totalPages={searchResult.totalPages}
        countsByKind={searchResult.countsByKind}
      />
      <p className="s-muted mt-6 text-sm">
        <a
          href={PAGES.SITE.page(
            '',
            language,
            true,
            site.defaultLocale,
            siteSlug
          )}
        >
          Back home
        </a>
      </p>
    </main>
  );
}
