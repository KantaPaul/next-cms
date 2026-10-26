import 'server-only';
import { cookies, draftMode } from 'next/headers';
import { PERMISSIONS } from '@/config/permissions';
import { validateSession } from '@/lib/auth';
import { accessService } from '@/server/services/access.service';
import {
  type PreviewTarget,
  previewService,
} from '@/server/services/preview.service';

export const PREVIEW_PAGE_COOKIE = 'cms_preview_page';
export const PREVIEW_POST_COOKIE = 'cms_preview_post';
export const PREVIEW_TOKEN_COOKIE = 'cms_preview_token';

/**
 * Returns the page or post the visitor may see as a draft, or null.
 * Editors preview through their session; everyone else needs a valid share token.
 */
export async function getPreviewSession(): Promise<
  (PreviewTarget & { viaToken: boolean }) | null
> {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;

  const jar = await cookies();
  const token = jar.get(PREVIEW_TOKEN_COOKIE)?.value;

  if (token) {
    const target = await previewService.resolve(token);
    return target ? { ...target, viaToken: true } : null;
  }

  const pageId = jar.get(PREVIEW_PAGE_COOKIE)?.value ?? null;
  const postId = jar.get(PREVIEW_POST_COOKIE)?.value ?? null;
  if (!pageId && !postId) return null;

  const session = await validateSession();
  if (!session) return null;
  const access = await accessService.getUserAccess(session.user.id);
  return accessService.can(access, PERMISSIONS.PAGES_EDIT)
    ? { pageId, postId, viaToken: false }
    : null;
}

export async function getPreviewPageId(): Promise<string | null> {
  return (await getPreviewSession())?.pageId ?? null;
}

export async function getPreviewPostId(): Promise<string | null> {
  return (await getPreviewSession())?.postId ?? null;
}
