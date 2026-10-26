import 'server-only';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { pagesServices } from '@/app/(admin)/dashboard/(shell)/pages/_modules/pages.service';
import { postsService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/posts.service';
import { db } from '@/db';
import { pages, posts, users } from '@/db/schema';
import { ApplicationException } from '@/lib/utils/error';
import type { UserAccess } from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { sendMail } from '@/server/services/mail';
import { adminSiteId } from '@/server/services/site-context';

async function authorEmail(userId: string) {
  const [user] = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}

async function notifyAuthor(
  email: string | undefined,
  subject: string,
  text: string
) {
  if (!email) return;
  try {
    await sendMail({ to: email, subject, text });
  } catch (error) {
    console.error('[review-mail]', error);
  }
}

export const reviewService = {
  list: async () => {
    const [pageRows, postRows] = await Promise.all([
      db
        .select({
          id: pages.id,
          title: pages.title,
          slug: pages.slug,
          language: pages.language,
          updatedAt: pages.updatedAt,
          authorName: users.name,
          authorEmail: users.email,
        })
        .from(pages)
        .leftJoin(users, eq(users.id, pages.createdBy))
        .where(
          and(
            eq(pages.siteId, await adminSiteId()),
            eq(pages.status, 'review'),
            isNull(pages.deletedAt)
          )
        )
        .orderBy(desc(pages.updatedAt)),
      db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          language: posts.language,
          updatedAt: posts.updatedAt,
          authorName: users.name,
          authorEmail: users.email,
        })
        .from(posts)
        .leftJoin(users, eq(users.id, posts.createdBy))
        .where(
          and(
            eq(posts.siteId, await adminSiteId()),
            eq(posts.status, 'review'),
            isNull(posts.deletedAt)
          )
        )
        .orderBy(desc(posts.updatedAt)),
    ]);
    return {
      pages: pageRows.map(row => ({ ...row, kind: 'page' as const })),
      posts: postRows.map(row => ({ ...row, kind: 'post' as const })),
    };
  },

  approve: async (kind: 'page' | 'post', id: string, access: UserAccess) => {
    const published =
      kind === 'page'
        ? await pagesServices.publish({ id }, access)
        : await postsService.publish({ id }, access);
    const author = await authorEmail(published.createdBy);
    await notifyAuthor(
      author?.email,
      `Approved: ${published.title}`,
      `"${published.title}" was approved and published.`
    );
    return published;
  },

  requestChanges: async (
    kind: 'page' | 'post',
    id: string,
    note: string,
    access: UserAccess
  ) => {
    const trimmed = note.trim();
    if (!trimmed) throw new ApplicationException('Add a note for the author.');
    const table = kind === 'page' ? pages : posts;
    const [row] = await db
      .update(table)
      .set({ status: 'draft' })
      .where(and(eq(table.id, id), eq(table.status, 'review'), isNull(table.deletedAt)))
      .returning();
    if (!row) throw new ApplicationException('That item is no longer in review.');
    await auditService.log({
      actorId: access.userId,
      action: 'update',
      targetType: kind,
      targetId: id,
      targetName: row.title,
      details: trimmed,
    });
    const author = await authorEmail(row.createdBy);
    await notifyAuthor(
      author?.email,
      `Changes requested: ${row.title}`,
      `Changes were requested on "${row.title}".\n\n${trimmed}`
    );
    return row;
  },
};
