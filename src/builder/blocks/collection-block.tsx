import { PAGES } from '@/config/pages';
import { cn } from '@/lib/utils/cn';
import type { BuilderItem } from '../data';
import { BlockList } from './block-list';

export type CollectionBlockRefProps = {
  collectionBlockId?: string;
  collectionBlockName?: string;
  /** Publish state from the loader: 'draft-only' never renders on the live site. */
  collectionBlockStatus?: 'published' | 'draft-only' | 'changes' | null;
  /** The picked block no longer exists (deleted, or another site's). */
  collectionBlockMissing?: boolean;
  collectionSlug?: string;
  blocks?: BuilderItem[];
  zones?: Record<string, BuilderItem[]>;
  editing?: boolean;
};

const STATUS_NOTE: Record<'draft-only' | 'changes', string> = {
  'draft-only': 'Not published · hidden on the live site',
  changes: 'Unpublished changes · live site shows the last published version',
};

export function CollectionBlockRef(p: CollectionBlockRefProps) {
  const editHref =
    p.collectionBlockId && p.collectionSlug && !p.collectionBlockMissing
      ? PAGES.DASHBOARD.COLLECTION_BLOCK_BUILDER(
          p.collectionSlug,
          p.collectionBlockId
        )
      : null;
  const note =
    p.collectionBlockStatus && p.collectionBlockStatus !== 'published'
      ? STATUS_NOTE[p.collectionBlockStatus]
      : null;

  if (!p.collectionBlockId || !p.blocks?.length) {
    if (!p.editing) return null;
    const message = !p.collectionBlockId
      ? 'Pick a collection block in the sidebar.'
      : p.collectionBlockMissing
        ? 'This block was deleted. Pick another one in the sidebar.'
        : 'This block is empty. Add content to it in the block builder.';
    return (
      <div className="m-4 rounded-lg border-2 border-dashed border-sky-300 p-8 text-center text-sm text-sky-700">
        <p>{message}</p>
        {note && <p className="mt-1 text-amber-700">{note}</p>}
        {editHref && (
          <a
            href={editHref}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-medium underline"
          >
            Edit block
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        p.editing && 'relative outline-dashed outline-1',
        p.editing && (note ? 'outline-amber-400' : 'outline-sky-400')
      )}
    >
      {p.editing && (
        <span className="absolute right-2 top-2 z-10 flex items-center gap-2">
          {note && (
            <span className="rounded bg-amber-500 px-2 py-0.5 text-[11px] font-medium text-white">
              {note}
            </span>
          )}
          <span className="rounded bg-sky-600 px-2 py-0.5 text-[11px] font-medium text-white">
            Collection block · {p.collectionBlockName || 'block'}
          </span>
          {editHref && (
            <a
              href={editHref}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto rounded bg-white px-2 py-0.5 text-[11px] font-medium text-sky-700 shadow"
            >
              Edit
            </a>
          )}
        </span>
      )}
      <BlockList items={p.blocks} zones={p.zones ?? {}} />
    </div>
  );
}
