import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';

function revalidateTagSafe(tag: string) {
  try {
    // Next.js 15+ API
    // @ts-ignore
    revalidateTag(tag);
  } catch {
    try {
      // @ts-ignore
      revalidateTag(tag, 'max');
    } catch {
      // ignore
    }
  }
}

/** Purges public routes for a site after content or settings change.
 *
 * When `siteId` is given only that site is purged (`site:${siteId}` tag plus
 * the host tag for the current request). In path mode this keeps the changed
 * site's prefix cached output isolated from every other site. With no
 * `siteId` every public route is purged (previous behavior).
 */
export function revalidatePublicSite(siteId?: string) {
  try {
    // Purge root layout
    revalidatePath('/', 'layout');

    if (siteId) {
      revalidateTagSafe(`site:${siteId}`);
      revalidateTagSafe(`site-path:${siteId}`);
    }

    try {
      const h = headers();
      const store: any = h;
      const host =
        typeof store.get === 'function'
          ? store.get('x-cms-host') ?? store.get('x-forwarded-host') ?? store.get('host')
          : undefined;
      if (host) {
        const normalized = String(host)
          .split(',')[0]
          .trim()
          .toLowerCase()
          .replace(/:\d+$/, '');
        revalidateTagSafe(`site-host:${normalized}`);
      }
    } catch {
      // ignore outside request scope
    }
    // Also try common path patterns if in path mode context
    try {
      revalidatePath('/[locale]', 'layout');
    } catch {}
  } catch {
    // revalidatePath throws outside a request scope (e.g. scripts); nothing to purge there.
  }
}
