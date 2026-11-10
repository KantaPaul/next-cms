import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { siteTemplateEditHref } from '@/app/(admin)/dashboard/(shell)/site-templates/_modules/site-template-href';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import { pages, posts, siteSettings } from '@/db/schema';
import { resolveArchiveRoute } from '@/lib/listing-seo';
import { routingMode, sitePathSegments } from '@/lib/utils/site-slug';
import { accessService, type UserAccess } from '@/server/services/access.service';
import { resolvePostRoute } from '@/server/services/blog.service';
import { resolveRoute } from '@/server/services/public-site.service';
import {
  type ResolvedSite,
  siteBySlug,
  siteContext,
} from '@/server/services/site-context';
import { localizedSettings, siteSettingsService } from '@/server/services/site-settings.service';
import type { SiteModeValue } from '@/lib/site-essentials-types';

export type AdminBarEdit = {
  kind: 'page' | 'post' | 'search' | 'archive';
  label: string;
  href: string;
};

export type AdminBarData = {
  user: { name: string; email: string };
  siteName: string;
  siteMode?: SiteModeValue;
  edit: AdminBarEdit | null;
  links: {
    dashboard: string;
    newPage: string | null;
    newPost: string | null;
    siteTemplates: string | null;
    settings: string | null;
    account: string;
  };
};

/** The site a public path belongs to: its slug prefix in path mode, else the host's site. */
async function siteForPath(pathname: string): Promise<ResolvedSite> {
  const mode = routingMode();
  const first = pathname.split('/').filter(Boolean)[0];

  if ((mode === 'path' || mode === 'both') && first) {
    const site = await siteBySlug(first);
    if (site) return site;
  }

  return siteContext.publicSite();
}

async function templateIds(site: ResolvedSite, language: string) {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.siteId, site.id))
    .limit(1);
  if (!row) return { searchTemplateId: null, archiveTemplateId: null };
  return localizedSettings(
    { ...row, translations: row.translations as Parameters<typeof localizedSettings>[0]['translations'] },
    language,
    site.defaultLocale
  );
}

/** The dashboard link that edits whatever renders at `pathname`, when the user may edit it. */
async function editFor(
  pathname: string,
  lang: string | null,
  site: ResolvedSite
): Promise<AdminBarEdit | null> {
  const segments = sitePathSegments(pathname, site);

  if (segments.length === 1 && segments[0] === 'search') {
    const { searchTemplateId } = await templateIds(site, lang || site.defaultLocale);
    // No template assigned: the built-in results render, so point at where one is assigned.
    return {
      kind: 'search',
      label: searchTemplateId ? 'Edit Search template' : 'Assign Search template',
      href: searchTemplateId
        ? siteTemplateEditHref(searchTemplateId, 'Search')
        : PAGES.DASHBOARD.HEADER_FOOTER,
    };
  }

  const archive = resolveArchiveRoute(segments, site);

  if (archive) {
    const { archiveTemplateId } = await templateIds(site, archive.language);
    return {
      kind: 'archive',
      label: archiveTemplateId ? 'Edit Archive template' : 'Assign Archive template',
      href: archiveTemplateId
        ? siteTemplateEditHref(archiveTemplateId, 'Archive')
        : PAGES.DASHBOARD.HEADER_FOOTER,
    };
  }

  const postRoute = resolvePostRoute(segments, site);

  if (postRoute) {
    const [post] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.siteId, site.id),
          eq(posts.language, postRoute.language),
          eq(posts.slug, postRoute.slug),
          isNull(posts.deletedAt)
        )
      )
      .limit(1);
    return post
      ? { kind: 'post', label: 'Edit post', href: PAGES.DASHBOARD.POSTS.EDIT(post.id) }
      : null;
  }

  const pageRoute = resolveRoute(segments, site);

  if (pageRoute) {
    const [page] = await db
      .select({ id: pages.id, editorType: pages.editorType })
      .from(pages)
      .where(
        and(
          eq(pages.siteId, site.id),
          eq(pages.language, pageRoute.language),
          isNull(pages.deletedAt),
          pageRoute.slug === null
            ? eq(pages.isHome, true)
            : eq(pages.slug, pageRoute.slug)
        )
      )
      .limit(1);
    if (!page) return null;
    return {
      kind: 'page',
      label: 'Edit page',
      href:
        page.editorType === 'builder'
          ? PAGES.DASHBOARD.PAGES.BUILDER(page.id)
          : PAGES.DASHBOARD.PAGES.EDIT(page.id),
    };
  }

  return null;
}

export const adminBarService = {
  /** Toolbar contents for a signed-in user viewing `pathname`, or null without dashboard access. */
  forUser: async (
    user: { id: string; name: string | null; email: string },
    pathname: string,
    lang: string | null
  ): Promise<AdminBarData | null> => {
    const access: UserAccess = await accessService.getUserAccess(user.id);
    if (!access.role) return null;
    const can = (key: Parameters<typeof accessService.can>[1]) =>
      accessService.can(access, key);

    const site = await siteForPath(pathname);
    const [edit, siteSettingsRow] = await Promise.all([
      can(PERMISSIONS.PAGES_EDIT) ? editFor(pathname, lang, site) : null,
      siteSettingsService.getForSite(site.id).catch(() => null),
    ]);

    return {
      user: { name: user.name || user.email, email: user.email },
      siteName: site.name,
      siteMode: siteSettingsRow?.siteMode?.mode ?? 'live',
      edit,
      links: {
        dashboard: PAGES.DASHBOARD.ROOT,
        newPage: can(PERMISSIONS.PAGES_CREATE) ? PAGES.DASHBOARD.PAGES.CREATE : null,
        newPost: can(PERMISSIONS.PAGES_CREATE) ? PAGES.DASHBOARD.POSTS.CREATE : null,
        siteTemplates: can(PERMISSIONS.PAGES_EDIT) ? PAGES.DASHBOARD.HEADER_FOOTER : null,
        settings: can(PERMISSIONS.SETTINGS_MANAGE) ? PAGES.DASHBOARD.SETTINGS : null,
        account: PAGES.DASHBOARD.ACCOUNT,
      },
    };
  },
};
