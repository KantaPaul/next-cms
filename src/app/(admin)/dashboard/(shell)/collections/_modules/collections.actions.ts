'use server';

import { z } from 'zod';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { collectionsService } from '@/server/services/collections.service';
import { collectionTemplatesService } from '@/server/services/collection-templates.service';
import { accessService } from '@/server/services/access.service';
import { slugify } from '@/lib/utils/slugify';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PAGES } from '@/config/pages';
import { fieldKeyFromLabel } from '@/config/post-types';
import {
  collectionFieldSchema,
  createCollectionSchema,
  updateCollectionSchema,
  entryEditorSchema,
} from './collections.schemas';

/** Every post type screen (list, entries, create, edit, settings). */
function revalidatePostTypes() {
  revalidatePath(PAGES.DASHBOARD.COLLECTIONS, 'layout');
}

async function actorId() {
  const { userId } = await getCurrentUserAndTeamId();
  return userId;
}

export async function createCollection(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  let slug = String(formData.get('slug') ?? '').trim();
  const templatePageId = formData.get('templatePageId') || undefined;
  const singularName =
    String(formData.get('singularName') ?? '').trim() || undefined;
  const icon = formData.get('icon') || undefined;
  const description =
    String(formData.get('description') ?? '').trim() || undefined;

  if (!slug && name) {
    slug = slugify(name);
  }

  const parsed = createCollectionSchema.safeParse({
    name,
    slug,
    templatePageId,
    singularName,
    icon,
    description,
  });
  if (!parsed.success) {
    return { ok: false, error: 'Invalid name or slug.' };
  }

  try {
    const finalSlug = parsed.data.slug || slugify(parsed.data.name);
    const row = await collectionsService.create(
      {
        name: parsed.data.name,
        slug: finalSlug,
        singularName: parsed.data.singularName,
        icon: parsed.data.icon,
        description: parsed.data.description,
        templatePageId: parsed.data.templatePageId,
      },
      await actorId()
    );
    revalidatePostTypes();
    return { ok: true, id: row.id, slug: row.slug };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message ?? 'Failed to create collection.',
    };
  }
}

/** One-click install of a ready-made post type (Team, Testimonials, FAQ). */
export async function createPostTypeFromPreset(formData: FormData) {
  const presetId = String(formData.get('presetId') ?? '');
  try {
    const row = await collectionsService.createFromPreset(
      presetId,
      await actorId()
    );
    revalidatePostTypes();
    return { ok: true, id: row.id, slug: row.slug };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to add post type.' };
  }
}

export async function updateCollection(formData: FormData) {
  const id = formData.get('id');
  const name = formData.get('name') || undefined;
  const slug = formData.get('slug') || undefined;
  // Missing keys leave the value unchanged; an empty string clears it.
  const optional = (key: string) => {
    const v = formData.get(key);
    return v === null ? undefined : String(v);
  };
  const singularName = optional('singularName');
  const icon = optional('icon') || undefined;
  const description = optional('description');
  // An empty selection ("None") clears the template; a missing key leaves it unchanged.
  const rawTemplatePageId = formData.get('templatePageId');
  const templatePageId =
    rawTemplatePageId === null ? undefined : rawTemplatePageId || null;

  const parsed = updateCollectionSchema.safeParse({
    id: id ?? undefined,
    name,
    slug,
    singularName,
    icon,
    description,
    templatePageId,
  });
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input.' };
  }

  if (!parsed.data.id) {
    return { ok: false, error: 'Missing collection id.' };
  }

  try {
    const updated = await collectionsService.update(
      parsed.data.id,
      {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        ...(parsed.data.singularName !== undefined
          ? { singularName: parsed.data.singularName }
          : {}),
        ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.templatePageId !== undefined
          ? { templatePageId: parsed.data.templatePageId }
          : {}),
      },
      await actorId()
    );
    revalidatePostTypes();
    return { ok: true, slug: updated.slug };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message ?? 'Failed to update collection.',
    };
  }
}

export async function deleteCollection(collectionId: string) {
  try {
    await collectionsService.delete(collectionId, await actorId());
    revalidatePostTypes();
    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message ?? 'Failed to delete collection.',
    };
  }
}

function isChecked(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true';
}

export async function addCollectionField(formData: FormData) {
  const collectionId = String(formData.get('collectionId') ?? '');
  const raw = Object.fromEntries(
    ['key', 'label', 'type', 'choices', 'relationCollectionId'].map(k => [
      k,
      formData.get(k) ? String(formData.get(k)) : undefined,
    ])
  );
  const parsed = collectionFieldSchema.safeParse({
    ...raw,
    required: isChecked(formData.get('required')),
  });
  if (!collectionId || !parsed.success) {
    return {
      ok: false,
      error: parsed.success
        ? 'Missing post type id.'
        : (parsed.error.issues[0]?.message ?? 'Invalid field input.'),
    };
  }

  const { label, type, required, choices, relationCollectionId } = parsed.data;
  const key = parsed.data.key || fieldKeyFromLabel(label);
  if (!key) return { ok: false, error: 'Field key could not be derived.' };

  const config: Record<string, unknown> = {};
  if (type === 'select') {
    const list = (choices ?? '')
      .split(/[\n,]/)
      .map(c => c.trim())
      .filter(Boolean);
    if (!list.length) {
      return {
        ok: false,
        error: 'Add at least one choice for a select field.',
      };
    }
    config.choices = Array.from(new Set(list));
  }
  if (type === 'relation') {
    if (!relationCollectionId) {
      return { ok: false, error: 'Pick the post type this field links to.' };
    }
    config.collectionId = relationCollectionId;
  }

  try {
    await collectionsService.addField(
      collectionId,
      { key, label, type, required, config },
      await actorId()
    );
    revalidatePostTypes();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to add field.' };
  }
}

export async function updateCollectionField(formData: FormData) {
  const fieldId = formData.get('fieldId');
  const collectionId = formData.get('collectionId');
  const label = formData.get('label') || undefined;
  const type = formData.get('type') || undefined;
  // A missing key leaves `required` unchanged; any sent value sets it.
  const rawRequired = formData.get('required');
  const required = rawRequired === null ? undefined : isChecked(rawRequired);

  if (!fieldId || !collectionId) {
    return { ok: false, error: 'Missing field or collection id.' };
  }

  try {
    await collectionsService.updateField(
      String(fieldId),
      {
        ...(label !== undefined ? { label: String(label) } : {}),
        ...(type !== undefined ? { type: type as any } : {}),
        ...(required !== undefined ? { required } : {}),
      },
      await actorId()
    );
    revalidatePostTypes();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to update field.' };
  }
}

export async function deleteCollectionField(formData: FormData) {
  const fieldId = formData.get('fieldId') as string;
  const collectionId = formData.get('collectionId') as string;
  try {
    await collectionsService.deleteField(fieldId, await actorId());
    revalidatePostTypes();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to delete field.' };
  }
}

const createEntrySchema = z.object({
  collectionId: z.string().min(1),
  slug: z.string().trim().max(200).optional(),
});

export async function createCollectionEntry(formData: FormData) {
  const collectionId = formData.get('collectionId');
  let slug = String(formData.get('slug') ?? '').trim();

  const data: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('data-')) {
      data[key.slice(5)] = value;
    }
  }

  if (!slug) {
    const candidate =
      data.title ||
      data.name ||
      data.label ||
      Object.values(data).find(
        v => typeof v === 'string' && v.trim().length > 0
      );
    slug = candidate
      ? slugify(String(candidate))
      : `entry-${Date.now().toString(36)}`;
  }

  const parsed = createEntrySchema.safeParse({ collectionId, slug });
  if (!parsed.success) {
    return { ok: false, error: 'Invalid entry input.' };
  }

  try {
    const entry = await collectionsService.createEntry(
      parsed.data.collectionId,
      { slug: parsed.data.slug || slug, data },
      await actorId()
    );
    revalidatePostTypes();
    return { ok: true, id: entry.id };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to create entry.' };
  }
}

export async function updateCollectionEntry(formData: FormData) {
  const entryId = formData.get('entryId');
  const collectionId = formData.get('collectionId');
  const slug = formData.get('slug') || undefined;

  const parsed = z
    .object({
      entryId: z.string().min(1),
      collectionId: z.string().min(1),
      slug: z.string().trim().min(1).max(200).optional(),
    })
    .safeParse({ entryId, collectionId, slug });
  if (!parsed.success) {
    return { ok: false, error: 'Invalid entry input.' };
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('data-')) {
      data[key.slice(5)] = value;
    }
  }

  try {
    await collectionsService.updateEntry(
      parsed.data.entryId,
      {
        ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
        data,
      },
      await actorId()
    );
    revalidatePostTypes();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to update entry.' };
  }
}

export async function publishCollectionEntry(
  formData: FormData
): Promise<void> {
  const entryId = formData.get('entryId') as string;
  const collectionId = formData.get('collectionId') as string;
  try {
    await collectionsService.publishEntry(entryId, await actorId());
    revalidatePostTypes();
  } catch (error) {
    console.error('Failed to publish collection entry:', error);
  }
}

export async function unpublishCollectionEntry(
  formData: FormData
): Promise<void> {
  const entryId = formData.get('entryId') as string;
  const collectionId = formData.get('collectionId') as string;
  try {
    await collectionsService.unpublishEntry(entryId, await actorId());
    revalidatePostTypes();
  } catch (error) {
    console.error('Failed to unpublish collection entry:', error);
  }
}

export async function deleteCollectionEntry(formData: FormData): Promise<void> {
  const entryId = formData.get('entryId') as string;
  const collectionId = formData.get('collectionId') as string;
  let listHref: string | null = null;
  try {
    await collectionsService.deleteEntry(entryId, await actorId());
    revalidatePostTypes();
    const collection = await collectionsService.get(collectionId);
    listHref = PAGES.DASHBOARD.COLLECTION(collection.slug);
  } catch (error) {
    console.error('Failed to delete collection entry:', error);
  }
  // The edit screen is gone; go back to the post type's list (like Pages).
  // redirect() throws, so it runs outside the try.
  if (listHref) redirect(listHref);
}

export async function listCollectionOptions() {
  try {
    const list = await collectionsService.list();
    return list.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
    }));
  } catch {
    return [];
  }
}

export async function saveEntryAction(input: unknown) {
  const parsed = entryEditorSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid entry input.',
    };
  }

  const actor = await actorId();
  try {
    const { id, collectionId, language, ...rest } = parsed.data;
    if (id) {
      const updated = await collectionsService.updateEntry(
        id,
        rest as any,
        actor
      );
      revalidatePostTypes();
      return { ok: true, id: updated.id, slug: updated.slug };
    }
    const created = await collectionsService.createEntry(
      collectionId,
      { ...(rest as any), language },
      actor
    );
    revalidatePostTypes();
    return { ok: true, id: created.id, slug: created.slug };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to save entry.' };
  }
}

export async function deleteEntryAction(input: {
  id: string;
  collectionSlug: string;
}) {
  try {
    await collectionsService.deleteEntry(input.id, await actorId());
    revalidatePostTypes();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to delete entry.' };
  }
}

export async function switchEntryLayoutAction(input: {
  id: string;
  layout: 'template' | 'custom';
}) {
  try {
    const actor = await actorId();
    const access = await accessService.getUserAccess(actor);
    const updated = await collectionTemplatesService.switchEntryLayout(
      { id: input.id, layout: input.layout },
      access
    );
    revalidatePostTypes();
    return { ok: true, layout: updated.layout };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to change layout.' };
  }
}

export async function setEntryTemplateAction(input: {
  id: string;
  templateId: string | null;
}) {
  try {
    const actor = await actorId();
    const access = await accessService.getUserAccess(actor);
    const updated = await collectionTemplatesService.setEntryTemplate(
      { id: input.id, templateId: input.templateId },
      access
    );
    revalidatePostTypes();
    return { ok: true, templateId: updated.templateId };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to set template.' };
  }
}

export async function saveEntryDraftAction(input: {
  id: string;
  canvas?: unknown;
  autosave?: boolean;
}) {
  try {
    const actor = await actorId();
    await collectionsService.updateEntry(
      input.id,
      { draftCanvas: input.canvas },
      actor
    );
    return { ok: true, savedAt: new Date().toISOString() };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to save draft.' };
  }
}

export async function publishEntryAction(input: { id: string }) {
  try {
    const actor = await actorId();
    await collectionsService.publishEntry(input.id, actor);
    revalidatePostTypes();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to publish entry.' };
  }
}

export async function unpublishEntryAction(input: { id: string }) {
  try {
    const actor = await actorId();
    await collectionsService.unpublishEntry(input.id, actor);
    revalidatePostTypes();
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to unpublish entry.' };
  }
}

export async function duplicateEntryAction(input: { id: string }) {
  try {
    const actor = await actorId();
    const duplicated = await collectionsService.duplicateEntry(input.id, actor);
    revalidatePostTypes();
    return { ok: true, id: duplicated.id, slug: duplicated.slug };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to duplicate entry.' };
  }
}

const entryTranslationSchema = z.object({
  id: z.string().min(1),
  language: z.string().regex(/^[a-z]{2,12}$/),
});

/** Copies an entry into another language as a linked draft. */
export async function createEntryTranslationAction(input: unknown) {
  const parsed = entryTranslationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: 'Pick a language for the translation.',
    };
  }
  try {
    const created = await collectionsService.createEntryTranslation(
      parsed.data,
      await actorId()
    );
    revalidatePostTypes();
    return { ok: true as const, id: created.id, language: created.language };
  } catch (error: any) {
    return {
      ok: false as const,
      error: error.message ?? 'Failed to create the translation.',
    };
  }
}
