import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { PAGES } from '@/config/pages';
import { db } from '@/db';
import {
  pageContents,
  pages,
  postContents,
  posts,
  searchDocuments,
} from '@/db/schema';
import { siteContext } from '@/server/services/site-context';
import type { DBTrx } from '@/lib/types';
import { extractDocumentText, stripHtml } from '@/lib/search-text';

type Orm = DBTrx;

async function replaceDocument(
  orm: Orm,
  row: {
    kind: 'page' | 'post';
    pageId?: string | null;
    postId?: string | null;
    title: string;
    path: string;
    language: string;
    body: string;
    siteId: string;
  }
) {
  if (row.pageId) {
    await orm.delete(searchDocuments).where(eq(searchDocuments.pageId, row.pageId));
  }
  if (row.postId) {
    await orm.delete(searchDocuments).where(eq(searchDocuments.postId, row.postId));
  }
  await orm.insert(searchDocuments).values({
    siteId: row.siteId,
    kind: row.kind,
    pageId: row.pageId ?? null,
    postId: row.postId ?? null,
    title: row.title,
    path: row.path,
    language: row.language,
    body: row.body,
  });
}

export const searchIndex = {
  syncPage: async (id: string, orm: Orm = db) => {
    const [page] = await orm.select().from(pages).where(eq(pages.id, id)).limit(1);
    if (
      !page ||
      page.deletedAt ||
      page.status !== 'published' ||
      page.visibility !== 'public'
    ) {
      await orm.delete(searchDocuments).where(eq(searchDocuments.pageId, id));
      return;
    }
    const [content] = await orm
      .select({ content: pageContents.content })
      .from(pageContents)
      .where(and(eq(pageContents.pageId, id), eq(pageContents.kind, 'published')))
      .limit(1);
    const site = await siteContext.getById(page.siteId);
    await replaceDocument(orm, {
      kind: 'page',
      pageId: page.id,
      siteId: page.siteId,
      title: page.title,
      path: PAGES.SITE.page(
        page.slug,
        page.language,
        page.isHome,
        site?.defaultLocale ?? 'en'
      ),
      language: page.language,
      body: extractDocumentText(content?.content),
    });
  },

  syncPost: async (id: string, orm: Orm = db) => {
    const [post] = await orm.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (
      !post ||
      post.deletedAt ||
      post.status !== 'published' ||
      post.visibility !== 'public'
    ) {
      await orm.delete(searchDocuments).where(eq(searchDocuments.postId, id));
      return;
    }
    const [content] = await orm
      .select({ body: postContents.body, canvas: postContents.canvas })
      .from(postContents)
      .where(and(eq(postContents.postId, id), eq(postContents.kind, 'published')))
      .limit(1);
    const body = [stripHtml(content?.body ?? ''), extractDocumentText(content?.canvas)]
      .filter(Boolean)
      .join(' ');
    const site = await siteContext.getById(post.siteId);
    await replaceDocument(orm, {
      kind: 'post',
      postId: post.id,
      siteId: post.siteId,
      title: post.title,
      path: PAGES.SITE.post(post.slug, post.language, site?.defaultLocale ?? 'en'),
      language: post.language,
      body,
    });
  },

  removePage: async (id: string, orm: Orm = db) => {
    await orm.delete(searchDocuments).where(eq(searchDocuments.pageId, id));
  },

  removePost: async (id: string, orm: Orm = db) => {
    await orm.delete(searchDocuments).where(eq(searchDocuments.postId, id));
  },

  search: async ({
    q,
    language,
    limit = 20,
  }: {
    q: string;
    language?: string | null;
    limit?: number;
  }) => {
    const query = q.trim();
    if (!query) return [];
    const tsQuery = sql`plainto_tsquery('english', ${query})`;
    const filters = [
      sql`${searchDocuments.searchVector} @@ ${tsQuery}`,
      eq(searchDocuments.siteId, (await siteContext.publicSite()).id),
      language ? eq(searchDocuments.language, language) : undefined,
    ];
    return db
      .select({
        kind: searchDocuments.kind,
        title: searchDocuments.title,
        path: searchDocuments.path,
        language: searchDocuments.language,
        snippet: sql<string>`regexp_replace(ts_headline('english', ${searchDocuments.body}, ${tsQuery}, 'MaxFragments=1, MaxWords=24, MinWords=8'), '<[^>]+>', '', 'g')`,
      })
      .from(searchDocuments)
      .where(and(...filters))
      .orderBy(sql`ts_rank(${searchDocuments.searchVector}, ${tsQuery}) desc`)
      .limit(limit);
  },
};
