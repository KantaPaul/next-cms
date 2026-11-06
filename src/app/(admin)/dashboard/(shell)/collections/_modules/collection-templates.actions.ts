'use server';

import { z } from 'zod';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import { accessService } from '@/server/services/access.service';
import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';

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

export async function createCollectionTemplateAction(input: unknown) {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }
  try {
    const access = await getAccess();
    const created = await collectionTemplatesService.create(parsed.data, access);
    return { ok: true, id: created.id };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to create template.' };
  }
}

export async function updateCollectionTemplateAction(input: unknown) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }
  try {
    const access = await getAccess();
    const updated = await collectionTemplatesService.update(parsed.data, access);
    return { ok: true, id: updated.id };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to update template.' };
  }
}

export async function duplicateCollectionTemplateAction(input: { id: string }) {
  try {
    const access = await getAccess();
    const duplicated = await collectionTemplatesService.duplicate(input, access);
    return { ok: true, id: duplicated.id };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to duplicate template.' };
  }
}

export async function setDefaultCollectionTemplateAction(input: { id: string }) {
  try {
    const access = await getAccess();
    const updated = await collectionTemplatesService.setDefault(input, access);
    return { ok: true, id: updated.id };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to set default template.' };
  }
}

export async function deleteCollectionTemplateAction(input: { id: string }) {
  try {
    const access = await getAccess();
    await collectionTemplatesService.delete(input, access);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to delete template.' };
  }
}

export async function saveCollectionTemplateDraftAction(input: {
  id: string;
  content: unknown;
}) {
  try {
    const access = await getAccess();
    const result = await collectionTemplatesService.saveDraft(input, access);
    return { ok: true, savedAt: result.savedAt };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to save draft.' };
  }
}

export async function publishCollectionTemplateAction(input: { id: string }) {
  try {
    const access = await getAccess();
    const result = await collectionTemplatesService.publish(input, access);
    return { ok: true, publishedAt: result.publishedAt };
  } catch (err: any) {
    return { ok: false, error: err.message ?? 'Failed to publish template.' };
  }
}
