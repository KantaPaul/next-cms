'use server';

import { z } from 'zod';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';

/** Blocks whose canvas data can be re-fetched while editing. */
const RELOADABLE_BLOCKS = [
  'LoopGrid',
  'QueryLoop',
  'PostTypeEntries',
  'CollectionBlock',
  'QueryFilter',
] as const;

/**
 * Re-runs one block's server loader with its current (unsaved) props, so the
 * editor canvas shows the right items as query settings change. Editor-only:
 * draft Loop Item templates are included.
 */
export const reloadNodeData = permissionProcedure(PERMISSIONS.PAGES_EDIT)
  .input(
    z.object({
      type: z.enum(RELOADABLE_BLOCKS),
      props: z.record(z.string(), z.unknown()),
      language: z.string().max(20).optional(),
      /** Collection entry the canvas renders for (entry and block builders). */
      entryId: z.string().max(64).optional(),
    })
  )
  .action(async ({ input }) => {
    const { getBatchBlockLoader, getBlockLoader } =
      await import('@/builder/loaders');
    const { entryRenderContext } =
      await import('@/app/(admin)/dashboard/(fullscreen)/_editor/entry-context');
    const entry = input.entryId
      ? await entryRenderContext(input.entryId)
      : null;
    const ctx = {
      editor: true,
      language: input.language,
      ...(entry && {
        collectionEntry: entry.collectionEntry,
        post: entry.post,
      }),
    };
    const batch = getBatchBlockLoader(input.type);
    if (batch) {
      const patches = await batch([{ id: 'live', props: input.props }], ctx);
      return { patch: (patches.live ?? {}) as Record<string, unknown> };
    }
    const loader = getBlockLoader(input.type);
    if (!loader) return { patch: {} as Record<string, unknown> };
    const patch = await loader(input.props, ctx);
    return { patch };
  });
