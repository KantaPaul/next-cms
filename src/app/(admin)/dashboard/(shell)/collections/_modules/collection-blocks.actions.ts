'use server';

import { z } from 'zod';
import { getCurrentUserAndTeamId, validateSession } from '@/lib/auth';
import { collectionBlocksService } from '@/server/services/collection-blocks.service';
import { accessService } from '@/server/services/access.service';

const createSchema = z.object({
  collectionId: z.string().min(1),
  name: z.string().trim().min(1, 'Name is required').max(150),
  description: z.string().trim().max(500).nullish(),
  fromId: z.string().nullish(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Name is required').max(150),
  description: z.string().trim().max(500).nullish(),
});

async function getAccess() {
  const { userId } = await getCurrentUserAndTeamId();
  return accessService.getUserAccess(userId);
}

export async function createCollectionBlockAction(input: unknown) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }
  try {
    const access = await getAccess();
    const created = await collectionBlocksService.create(parsed.data, access);
    return { ok: true, id: created.id };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to create block.' };
  }
}

export async function updateCollectionBlockAction(input: unknown) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }
  try {
    const access = await getAccess();
    const updated = await collectionBlocksService.update(parsed.data, access);
    return { ok: true, id: updated.id };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to update block.' };
  }
}

export async function duplicateCollectionBlockAction(input: { id: string }) {
  try {
    const access = await getAccess();
    const duplicated = await collectionBlocksService.duplicate(input, access);
    return { ok: true, id: duplicated.id };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to duplicate block.' };
  }
}

export async function deleteCollectionBlockAction(input: { id: string }) {
  try {
    const access = await getAccess();
    await collectionBlocksService.delete(input, access);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to delete block.' };
  }
}

export async function saveCollectionBlockDraftAction(input: {
  id: string;
  content: unknown;
}) {
  try {
    const access = await getAccess();
    const result = await collectionBlocksService.saveDraft(input, access);
    return { ok: true, savedAt: result.savedAt };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to save draft.' };
  }
}

export async function publishCollectionBlockAction(input: { id: string }) {
  try {
    const access = await getAccess();
    const result = await collectionBlocksService.publish(input, access);
    return { ok: true, publishedAt: result.publishedAt };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to publish block.' };
  }
}

export async function listCollectionBlockOptionsAction(collectionId: string) {
  if (typeof collectionId !== 'string' || !collectionId) return [];
  await getAccess();
  return collectionBlocksService.options(collectionId);
}

/**
 * Content for CollectionBlock nodes, used by the block loader in the editor
 * and on the public site. Draft content is only served to signed-in users;
 * everyone else gets the published version.
 */
export async function getCollectionBlockContentAction(
  ids: unknown,
  options?: { draft?: boolean; siteId?: string }
) {
  const list = Array.isArray(ids)
    ? ids.filter((id): id is string => typeof id === 'string' && !!id)
    : [];
  if (!list.length) return {};
  const draft = options?.draft ? Boolean(await validateSession()) : false;
  return collectionBlocksService.getPublishedContent(list, {
    draft,
    siteId: typeof options?.siteId === 'string' ? options.siteId : undefined,
  });
}
