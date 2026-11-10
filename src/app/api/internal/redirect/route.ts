import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import {
  evaluateSiteModeAccess,
  SITE_MODE_BYPASS_COOKIE,
  SITE_MODE_BYPASS_QUERY,
} from '@/lib/site-mode-gate';
import { accessService } from '@/server/services/access.service';
import { redirectsService } from '@/server/services/redirects.service';
import {
  siteBySlug,
  siteContext,
  siteSlugPrefix,
} from '@/server/services/site-context';
import { siteSettingsService } from '@/server/services/site-settings.service';

/** Edge proxy cannot use the Node Postgres driver, so it asks this route for one indexed lookup. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') ?? '';
  const pathOnly = path.split('?')[0] || '/';
  const siteSlug = request.headers.get('x-cms-site-slug')?.trim() || null;
  const hostHeader = request.headers.get('x-cms-host');

  // Strip the site segment so redirects are matched within the site
  // (`/{site}/from` matches stored `from`), then re-prefix the target.
  const lookupPath =
    siteSlug && path.startsWith(`/${siteSlug}/`)
      ? path.slice(siteSlug.length + 1)
      : path;

  let siteModeResult: ReturnType<typeof evaluateSiteModeAccess> = {
    mode: 'live',
    blocked: false,
    status: 200,
    noindex: false,
  };

  try {
    const resolvedSite = siteSlug
      ? (await siteBySlug(siteSlug).catch(() => null)) ??
        (await siteContext.siteForHost(hostHeader).catch(() => null))
      : await siteContext.siteForHost(hostHeader).catch(() => null);

    if (resolvedSite) {
      const settings = await siteSettingsService
        .getForSite(resolvedSite.id)
        .catch(() => null);
      if (settings?.siteMode && settings.siteMode.mode !== 'live') {
        const jar = await cookies();
        const bypassCookie = jar.get(SITE_MODE_BYPASS_COOKIE)?.value ?? null;
        const bypassParam =
          request.headers.get('x-cms-site-mode-bypass') ??
          url.searchParams.get(SITE_MODE_BYPASS_QUERY);

        let hasStaffSession = false;
        const session = await validateSession().catch(() => null);
        if (session?.user?.id) {
          const access = await accessService
            .getUserAccess(session.user.id)
            .catch(() => null);
          hasStaffSession = Boolean(access?.role);
        }

        siteModeResult = evaluateSiteModeAccess({
          siteMode: settings.siteMode,
          pathname: pathOnly,
          siteSlug,
          bypassParam,
          bypassCookie,
          hasStaffSession,
        });
      }
    }
  } catch {
    // Never fail the lookup route on site mode evaluation error.
  }

  try {
    const row = await redirectsService.find(lookupPath);
    if (!row) {
      return NextResponse.json({ to: null, siteMode: siteModeResult });
    }
    let to = row.toPath;
    if (siteSlug) to = `/${siteSlug}${to}`;
    return NextResponse.json({
      to,
      status: row.statusCode,
      siteMode: siteModeResult,
    });
  } catch {
    // If siteSlug was guessed from a non-site path segment (e.g. /2024/05/slug),
    // fall back to checking the full path on the host's default site.
    if (siteSlug && lookupPath !== path) {
      try {
        const site = await siteContext.siteForHost(hostHeader);
        const row = await redirectsService.findForSite(site.id, path);
        if (row) {
          const prefix = siteSlugPrefix(site);
          const to = prefix ? `/${prefix}${row.toPath}` : row.toPath;
          return NextResponse.json({
            to,
            status: row.statusCode,
            siteMode: siteModeResult,
          });
        }
      } catch {
        // fall through
      }
    }
    return NextResponse.json({ to: null, siteMode: siteModeResult });
  }
}
