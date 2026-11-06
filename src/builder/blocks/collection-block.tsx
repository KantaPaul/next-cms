import { cn } from '@/lib/utils/cn';
import type { BuilderItem } from '../data';
import { BlockList } from './block-list';

export type CollectionBlockRefProps = {
  collectionBlockId?: string;
  collectionBlockName?: string;
  blocks?: BuilderItem[];
  zones?: Record<string, BuilderItem[]>;
  editing?: boolean;
};

export function CollectionBlockRef(p: CollectionBlockRefProps) {
  if (!p.collectionBlockId || !p.blocks?.length) {
    return p.editing ? (
      <div className="m-4 rounded-lg border-2 border-dashed border-sky-300 p-8 text-center text-sm text-sky-700">
        {p.collectionBlockId
          ? 'This block is empty or was deleted.'
          : 'Pick a collection block in the sidebar.'}
      </div>
    ) : null;
  }

  return (
    <div
      className={cn(
        p.editing && 'relative outline-dashed outline-1 outline-sky-400'
      )}
    >
      {p.editing && (
        <span className="absolute right-2 top-2 z-10 rounded bg-sky-600 px-2 py-0.5 text-[11px] font-medium text-white">
          Collection block · {p.collectionBlockName ?? 'block'}
        </span>
      )}
      <BlockList items={p.blocks} zones={p.zones ?? {}} />
    </div>
  );
}
