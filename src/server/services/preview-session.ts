import 'server-only';
import { cookies, draftMode } from 'next/headers';
import { PERMISSIONS } from '@/config/permissions';
import { validateSession } from '@/lib/auth';
import { accessService } from '@/server/services/access.service';
import { previewService } from '@/server/services/preview.service';

export const PREVIEW_PAGE_COOKIE = 'cms_preview_page';
export const PREVIEW_TOKEN_COOKIE = 'cms_preview_token';

/**
 * Returns the page the visitor may see as a draft, or null.
 * Editors preview through their session; everyone else needs a valid share token.
 */
export async function getPreviewSession(): Promise<{ pageId: string; viaToken: boolean } | null> {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;

  const jar = await cookies();
  const token = jar.get(PREVIEW_TOKEN_COOKIE)?.value;
  if (token) {
    const pageId = await previewService.resolve(token);
    return pageId ? { pageId, viaToken: true } : null;
  }

  const pageId = jar.get(PREVIEW_PAGE_COOKIE)?.value;
  if (!pageId) return null;

  const session = await validateSession();
  if (!session) return null;
  const access = await accessService.getUserAccess(session.user.id);
  return accessService.can(access, PERMISSIONS.PAGES_EDIT) ? { pageId, viaToken: false } : null;
}

export async function getPreviewPageId(): Promise<string | null> {
  return (await getPreviewSession())?.pageId ?? null;
}
