import 'server-only';
import { entryToPostView, type PostView } from '@/builder/post-template';
import { collectionsService } from '@/server/services/collections.service';

type CollectionInfo = { id: string; name: string; slug: string };

export type EntryRenderContext = {
  /** The entry with its collection and fields, for `EntryProvider` and loaders. */
  collectionEntry: any;
  /** The entry as a post, for post blocks. */
  post: PostView;
  language: string;
};

/**
 * What an editor canvas needs to render blocks for one collection entry:
 * the entry (with collection + fields) and its post view. Shared by the
 * entry builder, the collection block builder and live canvas reloads.
 */
export async function entryRenderContext(
  entryId: string,
  collection?: CollectionInfo
): Promise<EntryRenderContext | null> {
  const entry = await collectionsService
    .getEntryWithDetails(entryId)
    .catch(() => null);
  if (!entry) return null;
  if (collection && entry.collectionId !== collection.id) return null;

  const info =
    collection ??
    (await collectionsService.get(entry.collectionId).catch(() => null));
  if (!info) return null;

  const fields = await collectionsService.getFields(info.id);
  const collectionInfo = {
    id: info.id,
    name: info.name,
    slug: info.slug,
    fields,
  };
  return {
    collectionEntry: { ...entry, collection: collectionInfo },
    post: entryToPostView(entry, collectionInfo, entry.terms ?? []),
    language: entry.language || 'en',
  };
}

/**
 * Entry to preview a collection block with: the requested one, else the
 * latest published entry in the site's default language, else any entry.
 */
export async function previewEntryId(
  collectionId: string,
  requested: string | undefined,
  defaultLocale: string
): Promise<string | null> {
  const entries = await collectionsService.listEntries(collectionId);
  if (requested && entries.some(entry => entry.id === requested)) {
    return requested;
  }
  const published = entries.filter(entry => entry.status === 'published');
  const pick =
    published.find(entry => (entry.language || 'en') === defaultLocale) ??
    published[0] ??
    entries.find(entry => (entry.language || 'en') === defaultLocale) ??
    entries[0];
  return pick?.id ?? null;
}
