import { z } from 'zod';

/** Blocks whose canvas data can be re-fetched while editing. */
const RELOADABLE_BLOCKS = [
  'LoopGrid',
  'QueryLoop',
  'PostTypeEntries',
  'CollectionBlock',
  'QueryFilter',
] as const;

export const reloadNodeDataSchema = z.object({
  type: z.enum(RELOADABLE_BLOCKS),
  props: z.record(z.string(), z.unknown()),
  language: z.string().max(20).optional(),
  /** Collection entry the canvas renders for (entry and block builders). */
  entryId: z.string().max(64).optional(),
});
