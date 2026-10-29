import { toDocument } from '@nextcms/builder-core';
import { notFound, redirect } from 'next/navigation';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { loadDocumentData } from '@/builder/loaders';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { metaObject } from '@/lib/utils/metadata';
import { accessService } from '@/server/services/access.service';
import { siteSettingsService } from '@/server/services/site-settings.service';
import { NewEditor } from './_components/new-editor';

export const metadata = metaObject('New editor (preview)');

/**
 * Preview of the new editor core (B3: R687–R691) on a page's draft. Editing
 * works in the browser only; saving arrives with the editor chrome (R698).
 */
export default async function NewEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await getCurrentUserAndTeamId();
  const access = await accessService.getUserAccess(userId);
  if (!accessService.can(access, PERMISSIONS.PAGES_EDIT))
    redirect(PAGES.DASHBOARD.PAGES.INDEX);

  const [page, settings] = await Promise.all([
    pagesServices.getById({ id }),
    siteSettingsService.get(),
  ]);
  if (!page) notFound();
  if (page.editorType !== 'builder') redirect(PAGES.DASHBOARD.PAGES.EDIT(id));

  const document = toDocument(page.content);
  // Block data (blog posts, videos, global blocks) is shown in the canvas but
  // never stored in the document.
  const loaded = await loadDocumentData(document, {
    language: page.language,
    themeTokens: settings.themeTokens,
  });

  return (
    <NewEditor
      page={{ id: page.id, title: page.title }}
      document={document}
      loaded={loaded}
      themeTokens={settings.themeTokens}
    />
  );
}
