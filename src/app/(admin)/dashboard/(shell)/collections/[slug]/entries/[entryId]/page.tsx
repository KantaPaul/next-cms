import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { loadPostTypeRoute } from '../../../_modules/post-type-route';

/** Old URL: `/collections/{id}/entries/{entryId}` → the entry's edit screen. */
export default async function LegacyEntryRedirect({
  params,
}: {
  params: Promise<{ slug: string; entryId: string }>;
}) {
  const { slug, entryId } = await params;
  const collection = await loadPostTypeRoute(slug, s =>
    PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(s, entryId)
  );
  redirect(PAGES.DASHBOARD.COLLECTION_ENTRY_EDIT(collection.slug, entryId));
}
