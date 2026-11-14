import { createId } from '@paralleldrive/cuid2';
import { db } from '@/db';
import * as schema from '@/db/schema';

export type LocalizedPageInput = {
  title: string;
  slug: string;
  description?: string;
  content: unknown;
};

export async function insertLocalizedPages({
  siteId,
  authorId,
  isHome = false,
  isBlogIndex = false,
  translations,
}: {
  siteId: string;
  authorId: string;
  isHome?: boolean;
  isBlogIndex?: boolean;
  translations: Record<string, LocalizedPageInput>;
}) {
  const groupId = createId();
  const createdIds: Record<string, string> = {};

  for (const [locale, data] of Object.entries(translations)) {
    const pageId = createId();
    await db.insert(schema.pages).values({
      id: pageId,
      siteId,
      title: data.title,
      slug: data.slug,
      language: locale,
      translationGroupId: groupId,
      editorType: 'builder',
      status: 'published',
      isHome,
      isBlogIndex,
      createdBy: authorId,
      publishedAt: new Date(),
    });
    await db.insert(schema.pageContents).values({
      pageId,
      content: data.content as never,
    });
    createdIds[locale] = pageId;
  }

  return { groupId, ids: createdIds };
}
