'use server';
import { z } from 'zod';
import { dynamicRefsService } from '@/server/services/dynamic-refs.service';

/**
 * Public reads of the pages and posts that "Specific Page/Blog Post" bindings
 * point at. Called during rendering; only published, public records come back.
 */

const ids = z.array(z.string().max(100)).max(200).catch([]);

const refsSchema = z.object({
  pageRef: ids.optional(),
  postRef: ids.optional(),
});

export async function loadDynamicRefs(input: Record<string, string[]>) {
  return dynamicRefsService.load(refsSchema.parse(input));
}
