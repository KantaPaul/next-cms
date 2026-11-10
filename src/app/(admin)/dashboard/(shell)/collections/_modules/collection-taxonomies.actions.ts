'use server';

import { getCurrentUserAndTeamId } from '@/lib/auth';
import { collectionTaxonomiesService } from '@/server/services/collection-taxonomies.service';
import { collectionsService } from '@/server/services/collections.service';
import { revalidatePath } from 'next/cache';
import { PAGES } from '@/config/pages';
import {
  collectionTaxonomySchema,
  collectionTermSchema,
  updateCollectionBlockSettingsSchema,
  updateSupportsSchema,
} from './collections.schemas';
import type { PostTypeSupports } from '@/config/post-types';

async function actorId() {
  const { userId } = await getCurrentUserAndTeamId();
  return userId;
}

function revalidateCollection(slug: string) {
  revalidatePath(PAGES.DASHBOARD.COLLECTION(slug), 'layout');
}

export async function saveTaxonomyAction(input: unknown) {
  const parsed = collectionTaxonomySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid taxonomy input.',
    };
  }

  try {
    const row = await collectionTaxonomiesService.saveTaxonomy(
      parsed.data,
      await actorId()
    );
    const collection = await collectionsService.get(parsed.data.collectionId);
    revalidateCollection(collection.slug);
    return { ok: true, id: row.id, key: row.key };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message ?? 'Failed to save taxonomy.',
    };
  }
}

export async function deleteTaxonomyAction({
  id,
  collectionSlug,
}: {
  id: string;
  collectionSlug: string;
}) {
  try {
    await collectionTaxonomiesService.deleteTaxonomy(id, await actorId());
    revalidateCollection(collectionSlug);
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message ?? 'Failed to delete taxonomy.',
    };
  }
}

export async function saveTermAction(input: unknown, collectionSlug: string) {
  const parsed = collectionTermSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid term input.',
    };
  }

  try {
    const row = await collectionTaxonomiesService.saveTerm(
      parsed.data,
      await actorId()
    );
    revalidateCollection(collectionSlug);
    return { ok: true, id: row.id, slug: row.slug };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message ?? 'Failed to save term.',
    };
  }
}

export async function deleteTermAction({
  id,
  collectionSlug,
}: {
  id: string;
  collectionSlug: string;
}) {
  try {
    await collectionTaxonomiesService.deleteTerm(id, await actorId());
    revalidateCollection(collectionSlug);
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message ?? 'Failed to delete term.',
    };
  }
}

export async function updateSupportsAction({
  id,
  collectionSlug,
  supports,
}: {
  id: string;
  collectionSlug: string;
  supports: Partial<PostTypeSupports>;
}) {
  try {
    await collectionsService.update(
      id,
      { supports },
      await actorId()
    );
    revalidateCollection(collectionSlug);
    revalidatePath(PAGES.DASHBOARD.ROOT, 'layout');
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message ?? 'Failed to update features.',
    };
  }
}

export async function updateCollectionBlockSettingsAction(input: unknown) {
  const parsed = updateCollectionBlockSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid block settings.',
    };
  }

  try {
    await collectionsService.update(
      parsed.data.id,
      { blockSettings: parsed.data.blockSettings },
      await actorId()
    );
    revalidateCollection(parsed.data.collectionSlug);
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message ?? 'Failed to update block settings.',
    };
  }
}

export async function listCollectionTermOptions(collectionId: string) {
  if (!collectionId) return [];
  try {
    const taxs = await collectionTaxonomiesService.listTaxonomies(collectionId);
    const result: { id: string; name: string; slug: string; taxonomy: string }[] = [];
    for (const tax of taxs) {
      const terms = await collectionTaxonomiesService.listTerms(tax.id);
      for (const term of terms) {
        result.push({
          id: term.id,
          name: `${tax.name}: ${term.name}`,
          slug: term.slug,
          taxonomy: tax.key,
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}

