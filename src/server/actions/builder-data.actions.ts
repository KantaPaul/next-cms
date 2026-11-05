'use server';

import { z } from 'zod';
import { PERMISSIONS } from '@/config/permissions';
import { permissionProcedure } from '@/server/procedures/permission.procedure';

/** Blocks whose canvas data can be re-fetched while editing. */
const RELOADABLE_BLOCKS = ['LoopGrid', 'QueryLoop', 'PostTypeEntries'] as const;

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
    })
  )
  .action(async ({ input }) => {
    const { getBlockLoader } = await import('@/builder/loaders');
    const loader = getBlockLoader(input.type);
    if (!loader) return { patch: {} as Record<string, unknown> };
    const patch = await loader(input.props, {
      editor: true,
      language: input.language,
    });
    return { patch };
  });
