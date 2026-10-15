import 'server-only';
import { revalidatePath } from 'next/cache';

/** Purges every public route (pages, sitemap, menus, theme) after content or settings change. */
export function revalidatePublicSite() {
  try {
    revalidatePath('/', 'layout');
  } catch {
    // revalidatePath throws outside a request scope (e.g. scripts); nothing to purge there.
  }
}
