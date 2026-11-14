'use server';

import { createId } from '@paralleldrive/cuid2';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  collectionEntries,
  pageContents,
  pages,
  postContents,
  posts,
} from '@/db/schema';
import { getCurrentUserAndTeamId } from '@/lib/auth';
import { collectionsService } from '@/server/services/collections.service';
import { siteContext } from '@/server/services/site-context';

export type TranslatableKind = 'page' | 'post' | 'collection';

export async function findTranslationAction(
  kind: TranslatableKind,
  id: string,
  targetLocale: string
): Promise<{ found: boolean; id?: string }> {
  const { userId } = await getCurrentUserAndTeamId();
  const site = await siteContext.adminSite(userId);

  if (kind === 'page') {
    const [source] = await db
      .select({
        id: pages.id,
        language: pages.language,
        translationGroupId: pages.translationGroupId,
      })
      .from(pages)
      .where(and(eq(pages.id, id), eq(pages.siteId, site.id), isNull(pages.deletedAt)))
      .limit(1);

    if (!source) return { found: false };
    if (source.language === targetLocale) return { found: true, id: source.id };
    if (!source.translationGroupId) return { found: false };

    const [match] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(
        and(
          eq(pages.siteId, site.id),
          eq(pages.translationGroupId, source.translationGroupId),
          eq(pages.language, targetLocale),
          isNull(pages.deletedAt)
        )
      )
      .limit(1);

    return match ? { found: true, id: match.id } : { found: false };
  }

  if (kind === 'post') {
    const [source] = await db
      .select({
        id: posts.id,
        language: posts.language,
        translationGroupId: posts.translationGroupId,
      })
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.siteId, site.id), isNull(posts.deletedAt)))
      .limit(1);

    if (!source) return { found: false };
    if (source.language === targetLocale) return { found: true, id: source.id };
    if (!source.translationGroupId) return { found: false };

    const [match] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        and(
          eq(posts.siteId, site.id),
          eq(posts.translationGroupId, source.translationGroupId),
          eq(posts.language, targetLocale),
          isNull(posts.deletedAt)
        )
      )
      .limit(1);

    return match ? { found: true, id: match.id } : { found: false };
  }

  const [source] = await db
    .select({
      id: collectionEntries.id,
      language: collectionEntries.language,
      translationGroupId: collectionEntries.translationGroupId,
      collectionId: collectionEntries.collectionId,
    })
    .from(collectionEntries)
    .where(and(eq(collectionEntries.id, id), isNull(collectionEntries.deletedAt)))
    .limit(1);

  if (!source) return { found: false };
  if (source.language === targetLocale) return { found: true, id: source.id };
  if (!source.translationGroupId) return { found: false };

  const [match] = await db
    .select({ id: collectionEntries.id })
    .from(collectionEntries)
    .where(
      and(
        eq(collectionEntries.collectionId, source.collectionId),
        eq(collectionEntries.translationGroupId, source.translationGroupId),
        eq(collectionEntries.language, targetLocale),
        isNull(collectionEntries.deletedAt)
      )
    )
    .limit(1);

  return match ? { found: true, id: match.id } : { found: false };
}

export async function createTranslationForLocaleAction(
  kind: TranslatableKind,
  id: string,
  targetLocale: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const { userId } = await getCurrentUserAndTeamId();
    const site = await siteContext.adminSite(userId);

    if (kind === 'collection') {
      const created = await collectionsService.createEntryTranslation(
        { id, language: targetLocale },
        userId
      );
      return { ok: true, id: created.id };
    }

    if (kind === 'page') {
      const [source] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.id, id), eq(pages.siteId, site.id), isNull(pages.deletedAt)))
        .limit(1);
      if (!source) return { ok: false, error: 'Page not found' };

      const groupId = source.translationGroupId || createId();
      if (!source.translationGroupId) {
        await db
          .update(pages)
          .set({ translationGroupId: groupId })
          .where(eq(pages.id, source.id));
      }

      const [sourceContent] = await db
        .select()
        .from(pageContents)
        .where(eq(pageContents.pageId, source.id))
        .limit(1);

      const [created] = await db
        .insert(pages)
        .values({
          siteId: site.id,
          title: `${source.title} (${targetLocale})`,
          slug: `${source.slug}-${targetLocale}-${createId().slice(0, 4)}`,
          language: targetLocale,
          translationGroupId: groupId,
          editorType: source.editorType,
          status: 'draft',
          headerTemplateId: source.headerTemplateId,
          footerTemplateId: source.footerTemplateId,
          createdBy: userId,
          isHome: false,
          isBlogIndex: false,
        })
        .returning({ id: pages.id });

      if (sourceContent) {
        await db.insert(pageContents).values({
          pageId: created.id,
          kind: sourceContent.kind,
          content: sourceContent.content,
        });
      }

      return { ok: true, id: created.id };
    }

    const [source] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.siteId, site.id), isNull(posts.deletedAt)))
      .limit(1);
    if (!source) return { ok: false, error: 'Post not found' };

    const groupId = source.translationGroupId || createId();
    if (!source.translationGroupId) {
      await db
        .update(posts)
        .set({ translationGroupId: groupId })
        .where(eq(posts.id, source.id));
    }

    const [sourceContent] = await db
      .select()
      .from(postContents)
      .where(eq(postContents.postId, source.id))
      .limit(1);

    const [created] = await db
      .insert(posts)
      .values({
        siteId: site.id,
        title: `${source.title} (${targetLocale})`,
        slug: `${source.slug}-${targetLocale}-${createId().slice(0, 4)}`,
        language: targetLocale,
        translationGroupId: groupId,
        layout: source.layout,
        templateId: source.templateId,
        createdBy: userId,
        status: 'draft',
      })
      .returning({ id: posts.id });

    if (sourceContent) {
      await db.insert(postContents).values({
        postId: created.id,
        body: sourceContent.body,
        canvas: sourceContent.canvas,
      });
    }

    return { ok: true, id: created.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to create translation',
    };
  }
}
