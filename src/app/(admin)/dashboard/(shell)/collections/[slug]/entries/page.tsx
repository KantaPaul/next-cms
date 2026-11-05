import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { loadPostTypeRoute } from '../../_modules/post-type-route';

/** Old URL: `/collections/{id}/entries` → the post type's entry list. */
export default async function LegacyEntriesRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await loadPostTypeRoute(slug, PAGES.DASHBOARD.COLLECTION);
  redirect(PAGES.DASHBOARD.COLLECTION(collection.slug));
}
