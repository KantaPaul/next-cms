'use server';
import { dynamicRefsService } from '@/server/services/dynamic-refs.service';
import { refsSchema } from './dynamic-refs.schemas';

/**
 * Public reads of the pages and posts that "Specific Page/Blog Post" bindings
 * point at. Called during rendering; only published, public records come back.
 */

export async function loadDynamicRefs(input: Record<string, string[]>) {
  return dynamicRefsService.load(refsSchema.parse(input));
}
