'use server';

import { type BuilderDocument, toDocument } from '@nextcms/builder-core';
import { cache } from 'react';
import { PERMISSIONS } from '@/config/permissions';
import { validateSession } from '@/lib/auth/auth-utils';
import { accessService } from '@/server/services/access.service';
import { loopTemplatesService } from '@/server/services/loop-templates.service';
import { adminSiteId, siteContext } from '@/server/services/site-context';

/** Drafts are only for people who can edit pages; everyone else gets published content. */
async function canReadDrafts(): Promise<boolean> {
  try {
    const session = await validateSession();
    if (!session?.user?.id) return false;
    const access = await accessService.getUserAccess(session.user.id);
    return access.permissions.includes(PERMISSIONS.PAGES_EDIT);
  } catch {
    return false;
  }
}

const load = cache(
  async (
    id: string,
    wantDraft: boolean
  ): Promise<{
    name: string;
    externalApiId: string | null;
    document: BuilderDocument;
  } | null> => {
    if (typeof id !== 'string' || !id) return null;
    const draft = wantDraft && (await canReadDrafts());
    const siteId = draft
      ? await adminSiteId()
      : (await siteContext.publicSite()).id;
    const row = await loopTemplatesService.getRenderContent(id, {
      siteId,
      draft,
    });
    if (!row) return null;
    return {
      name: row.name,
      externalApiId: row.externalApiId ?? null,
      document: toDocument(row.content),
    };
  }
);

/**
 * A Loop Item template as a builder document, for the Loop Grid loader.
 * Published content by default; the editor asks for the draft, which is
 * only served to users who can edit pages. Cached per request.
 */
export async function getLoopTemplateDocument(id: string, draft = false) {
  return load(id, !!draft);
}
