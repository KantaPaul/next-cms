'use client';

import {
  BlockManager,
  type BlockManagerEditor,
} from '@/app/(admin)/dashboard/(shell)/settings/blocks/_components/block-manager';
import type { BlockSettings } from '@/config/block-manager';
import { updateCollectionBlockSettingsAction } from '../_modules/collection-taxonomies.actions';

export function CollectionBlockManager({
  collectionId,
  collectionSlug,
  editors,
  initialEditor,
}: {
  collectionId: string;
  collectionSlug: string;
  editors: BlockManagerEditor[];
  initialEditor?: string;
}) {
  return (
    <BlockManager
      editors={editors}
      initialEditor={initialEditor}
      resetLabel="Reset to site default"
      defaultHint="Using site-wide Settings → Blocks."
      successMessage="Post type block settings saved. Editors pick them up on next load."
      onSave={(hidden: BlockSettings['hidden']) =>
        updateCollectionBlockSettingsAction({
          id: collectionId,
          collectionSlug,
          blockSettings: { hidden },
        })
      }
    />
  );
}
