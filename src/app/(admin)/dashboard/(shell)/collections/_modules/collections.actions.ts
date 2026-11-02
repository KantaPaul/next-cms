'use server';

import { z } from 'zod';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { collectionsService } from '@/server/services/collections.service';
import { slugify } from '@/lib/utils/slugify';
import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import {
  createCollectionSchema,
  updateCollectionSchema,
} from './collections.schemas';

async function actorId() {
  const { userId } = await getCurrentUserAndTeamId();
  return userId;
}

export async function createCollection(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  let slug = String(formData.get('slug') ?? '').trim();
  const templatePageId = formData.get('templatePageId') || undefined;

  if (!slug && name) {
    slug = slugify(name);
  }

  const parsed = createCollectionSchema.safeParse({ name, slug, templatePageId });
  if (!parsed.success) {
    return { ok: false, error: 'Invalid name or slug.' };
  }

  try {
    const finalSlug = parsed.data.slug || slugify(parsed.data.name);
    await collectionsService.create(
      {
        name: parsed.data.name,
        slug: finalSlug,
        templatePageId: parsed.data.templatePageId,
      },
      await actorId()
    );
    revalidatePath(PAGES.DASHBOARD.COLLECTIONS);
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to create collection.' };
  }
}

export async function updateCollection(formData: FormData) {
  const id = formData.get('id');
  const name = formData.get('name') || undefined;
  const slug = formData.get('slug') || undefined;
  // An empty selection ("None") clears the template; a missing key leaves it unchanged.
  const rawTemplatePageId = formData.get('templatePageId');
  const templatePageId =
    rawTemplatePageId === null ? undefined : rawTemplatePageId || null;

  const parsed = updateCollectionSchema.safeParse({
    id: id ?? undefined,
    name,
    slug,
    templatePageId,
  });
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input.' };
  }

  if (!parsed.data.id) {
    return { ok: false, error: 'Missing collection id.' };
  }

  try {
    await collectionsService.update(parsed.data.id, {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.slug !== undefined ? { slug: parsed.data.slug } : {}),
      ...(parsed.data.templatePageId !== undefined
        ? { templatePageId: parsed.data.templatePageId }
        : {}),
    }, await actorId());
    revalidatePath(PAGES.DASHBOARD.COLLECTIONS);
    revalidatePath(PAGES.DASHBOARD.COLLECTION(parsed.data.id));
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to update collection.' };
  }
}

export async function deleteCollection(collectionId: string) {
  try {
    await collectionsService.delete(collectionId, await actorId());
    revalidatePath(PAGES.DASHBOARD.COLLECTIONS);
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to delete collection.' };
  }
}

const addFieldSchema = z.object({
  collectionId: z.string().min(1),
  key: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(150),
  type: z.enum(['text', 'richtext', 'number', 'boolean', 'date', 'select', 'media', 'relation']),
  required: z.boolean().default(false),
  config: z.string().default('{}'),
});

function isChecked(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true';
}

export async function addCollectionField(formData: FormData) {
  const collectionId = formData.get('collectionId');
  const key = formData.get('key');
  const label = formData.get('label');
  const type = formData.get('type');
  const required = isChecked(formData.get('required'));
  const configRaw = formData.get('config') || '{}';
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(String(configRaw));
  } catch {
    config = {};
  }

  const parsed = addFieldSchema.safeParse({
    collectionId,
    key,
    label,
    type,
    required,
    config: JSON.stringify(config),
  });
  if (!parsed.success) {
    return { ok: false, error: 'Invalid field input.' };
  }

  try {
    await collectionsService.addField(
      parsed.data.collectionId,
      {
        key: parsed.data.key,
        label: parsed.data.label,
        type: parsed.data.type,
        required: parsed.data.required,
        config: config,
      },
      await actorId()
    );
    revalidatePath(PAGES.DASHBOARD.COLLECTION(parsed.data.collectionId));
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
    await collectionsService.updateField(String(fieldId), {
      ...(label !== undefined ? { label: String(label) } : {}),
      ...(type !== undefined ? { type: type as any } : {}),
      ...(required !== undefined ? { required } : {}),
    }, await actorId());
    revalidatePath(PAGES.DASHBOARD.COLLECTION(String(collectionId)));
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
    revalidatePath(PAGES.DASHBOARD.COLLECTION(collectionId));
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
      Object.values(data).find(v => typeof v === 'string' && v.trim().length > 0);
    slug = candidate ? slugify(String(candidate)) : `entry-${Date.now().toString(36)}`;
  }

  const parsed = createEntrySchema.safeParse({ collectionId, slug });
  if (!parsed.success) {
    return { ok: false, error: 'Invalid entry input.' };
  }

  try {
    await collectionsService.createEntry(
      parsed.data.collectionId,
      { slug: parsed.data.slug || slug, data },
      await actorId()
    );
    revalidatePath(PAGES.DASHBOARD.COLLECTION_ENTRIES(parsed.data.collectionId));
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to create entry.' };
  }
}

export async function updateCollectionEntry(formData: FormData) {
  const entryId = formData.get('entryId');
  const collectionId = formData.get('collectionId');
  const slug = formData.get('slug') || undefined;

  const parsed = z.object({
    entryId: z.string().min(1),
    collectionId: z.string().min(1),
    slug: z.string().trim().min(1).max(200).optional(),
  }).safeParse({ entryId, collectionId, slug });
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
    revalidatePath(PAGES.DASHBOARD.COLLECTION_ENTRY(parsed.data.collectionId, parsed.data.entryId));
    revalidatePath(PAGES.DASHBOARD.COLLECTION_ENTRIES(parsed.data.collectionId));
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error.message ?? 'Failed to update entry.' };
  }
}

export async function publishCollectionEntry(formData: FormData): Promise<void> {
  const entryId = formData.get('entryId') as string;
  const collectionId = formData.get('collectionId') as string;
  try {
    await collectionsService.publishEntry(entryId, await actorId());
    revalidatePath(PAGES.DASHBOARD.COLLECTION_ENTRY(collectionId, entryId));
    revalidatePath(PAGES.DASHBOARD.COLLECTION_ENTRIES(collectionId));
  } catch (error) {
    console.error('Failed to publish collection entry:', error);
  }
}

export async function unpublishCollectionEntry(formData: FormData): Promise<void> {
  const entryId = formData.get('entryId') as string;
  const collectionId = formData.get('collectionId') as string;
  try {
    await collectionsService.unpublishEntry(entryId, await actorId());
    revalidatePath(PAGES.DASHBOARD.COLLECTION_ENTRY(collectionId, entryId));
    revalidatePath(PAGES.DASHBOARD.COLLECTION_ENTRIES(collectionId));
  } catch (error) {
    console.error('Failed to unpublish collection entry:', error);
  }
}

export async function deleteCollectionEntry(formData: FormData): Promise<void> {
  const entryId = formData.get('entryId') as string;
  const collectionId = formData.get('collectionId') as string;
  try {
    await collectionsService.deleteEntry(entryId, await actorId());
    revalidatePath(PAGES.DASHBOARD.COLLECTION_ENTRIES(collectionId));
  } catch (error) {
    console.error('Failed to delete collection entry:', error);
  }
}

export async function listCollectionOptions() {
  try {
    const list = await collectionsService.list();
    return list.map(c => ({ id: c.id, name: c.name, slug: c.slug }));
  } catch {
    return [];
  }
}
