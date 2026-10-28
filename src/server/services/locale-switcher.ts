'use server';

import { PAGES } from '@/config/pages';
import { blogService, resolvePostRoute } from '@/server/services/blog.service';
import {
  siteContext,
  sitePathSegments,
  siteSlugPrefix,
} from '@/server/services/site-context';
import {
  getPreviewPageId,
  getPreviewPostId,
} from '@/server/services/preview-session';
import {
  publicSiteService,
  resolveRoute,
} from '@/server/services/public-site.service';

export type LocaleLink = {
  code: string;
  label: string;
  href: string;
  current: boolean;
};

function order(links: LocaleLink[], codes: string[]) {
  const rank = new Map(codes.map((code, index) => [code, index]));
  return links.sort(
    (a, b) => (rank.get(a.code) ?? 99) - (rank.get(b.code) ?? 99)
  );
}

/** Locales that have a translation of the current page or post. One language hides the switcher. */
export async function localeLinksForPath(
  pathname: string
): Promise<LocaleLink[]> {
  const site = await siteContext.publicSite();
  const labels = new Map(site.locales.map(locale => [locale.code, locale.label]));
  const segments = sitePathSegments(pathname, site);

  const postRoute = resolvePostRoute(segments, site);
  if (postRoute) {
    const previewId = await getPreviewPostId();
    const draft = previewId
      ? await blogService.getDraft(
          postRoute.language,
          postRoute.slug,
          previewId
        )
      : null;
    const post =
      draft ??
      (await blogService.getPublished(postRoute.language, postRoute.slug));
    if (!post || post.alternates.length < 2) return [];
    return order(
      post.alternates.flatMap(alt => {
        const label = labels.get(alt.language);
        if (!label) return [];
        return [
          {
            code: alt.language,
            label,
            href: PAGES.SITE.post(
              alt.slug,
              alt.language,
              site.defaultLocale,
              siteSlugPrefix(site)
            ),
            current: alt.language === postRoute.language,
          },
        ];
      })
    , site.locales.map(locale => locale.code));
  }

  const pageRoute = resolveRoute(segments, site);
  if (!pageRoute) return [];

  const previewId = await getPreviewPageId();
  const draft = previewId
    ? await publicSiteService.getDraft(
        pageRoute.language,
        pageRoute.slug,
        previewId
      )
    : null;
  const page =
    draft ??
    (await publicSiteService.getPublished(pageRoute.language, pageRoute.slug));
  if (!page || page.alternates.length < 2) return [];

  return order(
    page.alternates.flatMap(alt => {
      const label = labels.get(alt.language);
      if (!label) return [];
      return [
        {
          code: alt.language,
          label,
          href: PAGES.SITE.page(
            alt.slug,
            alt.language,
            alt.isHome,
            site.defaultLocale,
            siteSlugPrefix(site)
          ),
          current: alt.language === pageRoute.language,
        },
      ];
    }),
    site.locales.map(locale => locale.code)
  );
}
