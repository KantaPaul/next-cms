import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { collectionsService } from '@/server/services/collections.service';

/**
 * Loads the post type for a `[slug]` dashboard route. Old links that still
 * carry the post type's id are redirected to the same screen by slug.
 */
export async function loadPostTypeRoute(
  slugParam: string,
  hrefFor: (slug: string) => string
) {
  const found = await collectionsService.findForAdmin(
    decodeURIComponent(slugParam)
  );
  if (!found) notFound();
  if (found.matchedBy === 'id') redirect(hrefFor(found.collection.slug));
  return found.collection;
}
