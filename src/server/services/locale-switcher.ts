'use server';

import { PAGES } from '@/config/pages';
import { SUPPORTED_LANGUAGES } from '@/db/schemas/shared.schema';
import { blogService, resolvePostRoute } from '@/server/services/blog.service';
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

const labels = new Map<string, string>(
  SUPPORTED_LANGUAGES.map(language => [language.value, language.label])
);

function order(links: LocaleLink[]) {
  const rank = new Map<string, number>(
    SUPPORTED_LANGUAGES.map((language, index) => [language.value, index])
  );
  return links.sort(
    (a, b) => (rank.get(a.code) ?? 99) - (rank.get(b.code) ?? 99)
  );
}

/** Locales that have a translation of the current page or post. One language hides the switcher. */
export async function localeLinksForPath(
  pathname: string
): Promise<LocaleLink[]> {
  const segments = pathname.split('/').filter(Boolean);

  const postRoute = resolvePostRoute(segments);
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
            href: PAGES.SITE.post(alt.slug, alt.language),
            current: alt.language === postRoute.language,
          },
        ];
      })
    );
  }

  const pageRoute = resolveRoute(segments);
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
          href: PAGES.SITE.page(alt.slug, alt.language, alt.isHome),
          current: alt.language === pageRoute.language,
        },
      ];
    })
  );
}
