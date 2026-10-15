import 'server-only';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  lte,
  ne,
  or,
  type SQL,
} from 'drizzle-orm';
import { db } from '@/db';
import type { SearchParams } from '@/db/helpers/parse-search-params';
import { paginate } from '@/db/helpers/with-pagination';
import {
  postCategories,
  postContents,
  postRevisions,
  posts,
  postSeo,
  postTags,
  postTemplates,
  users,
  type ContentKindType,
  type PostLayoutType,
  type RevisionKindType,
} from '@/db/schema';
import type { SeoInput } from '@/db/validations/pages.validation';
import type {
  CreatePostOutput,
  SavePostDraftInput,
  UpdatePostInput,
} from '@/db/validations/posts.validation';
import { isBuilderData } from '@/builder/data';
import { postTemplatesService } from '@/app/(admin)/dashboard/(shell)/posts/_modules/post-templates.service';
import { PERMISSIONS } from '@/config/permissions';
import type { DBTrx } from '@/lib/types';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';

const PUBLISHING_STATUSES = ['published', 'scheduled'] as const;
const AUTOSAVE_REVISION_INTERVAL_MS = 5 * 60 * 1000;

const SORTABLE = {
  title: posts.title,
  slug: posts.slug,
  status: posts.status,
  updatedAt: posts.updatedAt,
  createdAt: posts.createdAt,
  publishedAt: posts.publishedAt,
} as const;

const notDeleted = isNull(posts.deletedAt);

type PostRow = typeof posts.$inferSelect;
type Snapshot = { body: string; canvas: unknown };

async function getPostOrThrow(id: string, orm: DBTrx = db) {
  const [post] = await orm
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), notDeleted))
    .limit(1);
  if (!post) throw new NotFoundException('Post not found');
  return post;
}

function assertCanEdit(post: { createdBy: string }, access: UserAccess) {
  if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
    throw new ApplicationException('You do not have permission to edit posts.');
  }

  if (
    post.createdBy !== access.userId &&
    !accessService.can(access, PERMISSIONS.PAGES_PUBLISH)
  ) {
    throw new ApplicationException('You can only edit posts you created.');
  }
}

function assertCanSetStatus(status: string | undefined, access: UserAccess) {
  if (
    status &&
    (PUBLISHING_STATUSES as readonly string[]).includes(status) &&
    !accessService.can(access, PERMISSIONS.PAGES_PUBLISH)
  ) {
    throw new ApplicationException(
      'Only editors and admins can publish or schedule posts. Submit it for review instead.'
    );
  }
}

async function assertSlugAvailable(
  slug: string,
  language: string,
  excludeId?: string,
  orm: DBTrx = db
) {
  const [existing] = await orm
    .select({ id: posts.id })
    .from(posts)
    .where(
      and(
        eq(posts.slug, slug),
        eq(posts.language, language),
        notDeleted,
        excludeId ? ne(posts.id, excludeId) : undefined
      )
    )
    .limit(1);
  if (existing)
    throw new ApplicationException(
      `The slug "${slug}" is already used by another ${language} post.`
    );
}

const normalizeCanvas = (layout: PostLayoutType, canvas: unknown) =>
  layout === 'custom' && isBuilderData(canvas) ? canvas : null;

async function getContent(
  postId: string,
  kind: ContentKindType,
  orm: DBTrx = db
) {
  const [row] = await orm
    .select()
    .from(postContents)
    .where(and(eq(postContents.postId, postId), eq(postContents.kind, kind)))
    .limit(1);
  return row;
}

async function upsertContent(
  postId: string,
  kind: ContentKindType,
  values: Partial<Snapshot>,
  orm: DBTrx = db
) {
  const set = {
    ...(values.body !== undefined && { body: values.body }),
    ...(values.canvas !== undefined && {
      canvas: values.canvas as object | null,
    }),
  };
  await orm
    .insert(postContents)
    .values({
      postId,
      kind,
      body: values.body ?? '',
      canvas: (values.canvas ?? null) as object | null,
    })
    .onConflictDoUpdate({
      target: [postContents.postId, postContents.kind],
      set: { ...set, updatedAt: new Date() },
    });
}

/**
 * Layout switches apply to the live post at once, so its published canvas must match: a fresh copy of the
 * template when going custom (the live page looks unchanged), none when going back to a template.
 */
async function setPublishedCanvas(
  postId: string,
  canvas: unknown,
  orm: DBTrx = db
) {
  await orm
    .update(postContents)
    .set({ canvas: canvas as object | null, updatedAt: new Date() })
    .where(
      and(eq(postContents.postId, postId), eq(postContents.kind, 'published'))
    );
}

async function upsertSeo(
  postId: string,
  seo: Partial<SeoInput> | undefined,
  orm: DBTrx = db
) {
  if (!seo) return;
  await orm
    .insert(postSeo)
    .values({ postId, ...seo })
    .onConflictDoUpdate({
      target: postSeo.postId,
      set: { ...seo, updatedAt: new Date() },
    });
}

async function syncTaxonomy(
  postId: string,
  input: { categories?: string[] | null; tags?: string[] | null },
  orm: DBTrx = db
) {
  if (input.categories) {
    await orm.delete(postCategories).where(eq(postCategories.postId, postId));

    if (input.categories.length) {
      await orm
        .insert(postCategories)
        .values(input.categories.map(categoryId => ({ postId, categoryId })))
        .onConflictDoNothing();
    }
  }

  if (input.tags) {
    await orm.delete(postTags).where(eq(postTags.postId, postId));

    if (input.tags.length) {
      await orm
        .insert(postTags)
        .values(input.tags.map(tagId => ({ postId, tagId })))
        .onConflictDoNothing();
    }
  }
}

async function writeRevision(
  post: Pick<PostRow, 'id' | 'title' | 'layout'>,
  kind: RevisionKindType,
  snapshot: Snapshot,
  authorId: string,
  label?: string | null,
  orm: DBTrx = db
) {
  const [revision] = await orm
    .insert(postRevisions)
    .values({
      postId: post.id,
      kind,
      title: post.title,
      label: label ?? null,
      layout: post.layout,
      body: snapshot.body,
      canvas: normalizeCanvas(post.layout, snapshot.canvas) as object | null,
      authorId,
    })
    .returning();
  return revision;
}

async function publishInTx(postId: string, authorId: string, orm: DBTrx) {
  const post = await getPostOrThrow(postId, orm);
  const draft = await getContent(postId, 'draft', orm);
  const snapshot = {
    body: draft?.body ?? '',
    canvas: normalizeCanvas(post.layout, draft?.canvas),
  };

  await upsertContent(postId, 'published', snapshot, orm);
  const [updated] = await orm
    .update(posts)
    .set({
      status: 'published',
      publishedAt: post.publishedAt ?? new Date(),
      scheduledAt: null,
    })
    .where(eq(posts.id, postId))
    .returning();

  await writeRevision(
    updated,
    'published',
    snapshot,
    authorId,
    'Published',
    orm
  );
  return updated;
}

export const postsService = {
  getPaginated: async (searchParams: SearchParams) => {
    const { page, size, sort, order, search, status, layout, language } =
      searchParams;
    const { offset, limit } = paginate({
      page: page as string,
      size: size as string,
    });

    const conditions: (SQL | undefined)[] = [notDeleted];
    if (typeof status === 'string' && status)
      conditions.push(eq(posts.status, status as never));
    if (layout === 'custom') conditions.push(eq(posts.layout, 'custom'));
    else if (layout === 'default')
      conditions.push(
        eq(posts.layout, 'template'),
        or(isNull(posts.templateId), eq(postTemplates.isDefault, true))
      );
    else if (typeof layout === 'string' && layout)
      conditions.push(
        eq(posts.layout, 'template'),
        eq(posts.templateId, layout)
      );
    if (typeof language === 'string' && language)
      conditions.push(eq(posts.language, language));

    if (typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(posts.title, term), ilike(posts.slug, term)));
    }

    const where = and(...conditions);
    const sortColumn =
      SORTABLE[(sort as keyof typeof SORTABLE) ?? 'updatedAt'] ??
      posts.updatedAt;
    const orderBy = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const [data, [{ totalCount }]] = await Promise.all([
      db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          status: posts.status,
          visibility: posts.visibility,
          layout: posts.layout,
          templateId: posts.templateId,
          templateName: postTemplates.name,
          language: posts.language,
          featuredImage: posts.featuredImage,
          scheduledAt: posts.scheduledAt,
          publishedAt: posts.publishedAt,
          createdAt: posts.createdAt,
          updatedAt: posts.updatedAt,
          createdBy: posts.createdBy,
          authorName: users.name,
        })
        .from(posts)
        .leftJoin(users, eq(users.id, posts.createdBy))
        .leftJoin(postTemplates, eq(postTemplates.id, posts.templateId))
        .where(where)
        .orderBy(orderBy, desc(posts.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ totalCount: count() })
        .from(posts)
        .leftJoin(postTemplates, eq(postTemplates.id, posts.templateId))
        .where(where),
    ]);

    return { data, totalCount };
  },

  getStatusCounts: async () => {
    const rows = await db
      .select({ status: posts.status, total: count() })
      .from(posts)
      .where(notDeleted)
      .groupBy(posts.status);
    return Object.fromEntries(rows.map(r => [r.status, r.total])) as Record<
      string,
      number
    >;
  },

  getById: async ({ id }: { id: string }) => {
    const post = await db.query.posts.findFirst({
      where: (t, { eq, and, isNull }) => and(eq(t.id, id), isNull(t.deletedAt)),
      with: {
        contents: true,
        seo: true,
        categories: { columns: { categoryId: true } },
        tags: { columns: { tagId: true } },
        author: { columns: { id: true, name: true, email: true, image: true } },
      },
    });
    if (!post) return null;

    const draft = post.contents.find(c => c.kind === 'draft');
    const published = post.contents.find(c => c.kind === 'published');
    const current = draft ?? published;
    const { contents: _contents, ...rest } = post;
    const snapshot = (row?: typeof draft) =>
      JSON.stringify([row?.body ?? '', row?.canvas ?? null]);

    return {
      ...rest,
      body: current?.body ?? '',
      canvas: normalizeCanvas(post.layout, current?.canvas),
      hasUnpublishedChanges:
        post.status === 'published' && snapshot(draft) !== snapshot(published),
      categories: post.categories.map(c => c.categoryId),
      tags: post.tags.map(t => t.tagId),
    };
  },

  create: async (input: CreatePostOutput, access: UserAccess) => {
    if (!accessService.can(access, PERMISSIONS.PAGES_CREATE)) {
      throw new ApplicationException(
        'You do not have permission to create posts.'
      );
    }

    assertCanSetStatus(input.status, access);

    if (input.status === 'scheduled' && !input.scheduledAt) {
      throw new ApplicationException(
        'Pick a date and time to schedule this post.'
      );
    }

    const { body, categories, tags, seo, ...postInput } = input;
    await assertSlugAvailable(postInput.slug, postInput.language);

    const created = await db.transaction(async tx => {
      const [post] = await tx
        .insert(posts)
        .values({
          ...postInput,
          status: postInput.status === 'published' ? 'draft' : postInput.status,
          createdBy: access.userId,
        })
        .returning();

      await upsertContent(
        post.id,
        'draft',
        { body: body ?? '', canvas: null },
        tx
      );
      await upsertSeo(post.id, seo, tx);
      await syncTaxonomy(post.id, { categories, tags }, tx);
      await auditService.log(
        {
          actorId: access.userId,
          action: 'create',
          targetType: 'post',
          targetId: post.id,
          targetName: post.title,
        },
        tx
      );

      if (postInput.status === 'published')
        return publishInTx(post.id, access.userId, tx);
      return post;
    });

    if (created.status === 'published') revalidatePublicSite();
    return created;
  },

  update: async (input: UpdatePostInput, access: UserAccess) => {
    const existing = await getPostOrThrow(input.id);
    assertCanEdit(existing, access);
    if (input.status !== existing.status)
      assertCanSetStatus(input.status, access);

    const { id, body, categories, tags, seo, ...postInput } = input;

    if (postInput.slug || postInput.language) {
      await assertSlugAvailable(
        postInput.slug ?? existing.slug,
        postInput.language ?? existing.language,
        id
      );
    }

    if (
      postInput.status === 'scheduled' &&
      !postInput.scheduledAt &&
      !existing.scheduledAt
    ) {
      throw new ApplicationException(
        'Pick a date and time to schedule this post.'
      );
    }

    const wasPublished = existing.status === 'published';
    const updated = await db.transaction(async tx => {
      const wantsPublish = postInput.status === 'published';
      const [post] = await tx
        .update(posts)
        .set({
          ...postInput,
          ...(wantsPublish && { status: existing.status }),
          ...(postInput.status &&
            postInput.status !== 'scheduled' && { scheduledAt: null }),
        })
        .where(eq(posts.id, id))
        .returning();

      if (body !== undefined) await upsertContent(id, 'draft', { body }, tx);
      await upsertSeo(id, seo, tx);
      await syncTaxonomy(id, { categories, tags }, tx);

      const action =
        postInput.status === 'review' && existing.status !== 'review'
          ? 'review_requested'
          : 'update';
      await auditService.log(
        {
          actorId: access.userId,
          action,
          targetType: 'post',
          targetId: id,
          targetName: post.title,
        },
        tx
      );

      if (wantsPublish) {
        const published = await publishInTx(id, access.userId, tx);
        await auditService.log(
          {
            actorId: access.userId,
            action: 'publish',
            targetType: 'post',
            targetId: id,
            targetName: post.title,
          },
          tx
        );
        return published;
      }

      return post;
    });

    if (wasPublished || updated.status === 'published') revalidatePublicSite();
    return updated;
  },

  saveDraft: async (input: SavePostDraftInput, access: UserAccess) => {
    const post = await getPostOrThrow(input.id);
    assertCanEdit(post, access);

    return db.transaction(async tx => {
      await upsertContent(
        post.id,
        'draft',
        {
          ...(input.body !== undefined && { body: input.body }),
          ...(input.canvas !== undefined && {
            canvas: normalizeCanvas(post.layout, input.canvas),
          }),
        },
        tx
      );

      const [updated] = await tx
        .update(posts)
        .set({ title: input.title ?? post.title, updatedAt: new Date() })
        .where(eq(posts.id, post.id))
        .returning();

      const draft = await getContent(post.id, 'draft', tx);
      const snapshot = {
        body: draft?.body ?? '',
        canvas: draft?.canvas ?? null,
      };

      if (input.autosave) {
        const [lastAutosave] = await tx
          .select({ createdAt: postRevisions.createdAt })
          .from(postRevisions)
          .where(
            and(
              eq(postRevisions.postId, post.id),
              eq(postRevisions.kind, 'autosave')
            )
          )
          .orderBy(desc(postRevisions.createdAt))
          .limit(1);

        if (
          !lastAutosave ||
          Date.now() - lastAutosave.createdAt.getTime() >
            AUTOSAVE_REVISION_INTERVAL_MS
        ) {
          await writeRevision(
            updated,
            'autosave',
            snapshot,
            access.userId,
            'Autosave',
            tx
          );
        }
      } else {
        await writeRevision(
          updated,
          'manual',
          snapshot,
          access.userId,
          'Saved draft',
          tx
        );
      }

      return { id: updated.id, savedAt: new Date().toISOString() };
    });
  },

  /** `custom` starts the post's canvas from its live template; `template` drops the canvas. */
  switchLayout: async (
    input: { id: string; layout: PostLayoutType },
    access: UserAccess
  ) => {
    const post = await getPostOrThrow(input.id);
    assertCanEdit(post, access);
    if (post.layout === input.layout) return post;

    const template =
      input.layout === 'custom'
        ? await postTemplatesService.resolveForPost(post)
        : null;

    const switched = await db.transaction(async tx => {
      const draft = await getContent(post.id, 'draft', tx);
      await writeRevision(
        post,
        'manual',
        { body: draft?.body ?? '', canvas: draft?.canvas ?? null },
        access.userId,
        `Before switching to ${input.layout === 'custom' ? 'a custom layout' : 'a template'}`,
        tx
      );
      await upsertContent(post.id, 'draft', { canvas: template }, tx);
      await setPublishedCanvas(post.id, template, tx);
      const [updated] = await tx
        .update(posts)
        .set({ layout: input.layout })
        .where(eq(posts.id, post.id))
        .returning();
      return updated;
    });

    if (post.status === 'published') revalidatePublicSite();
    return switched;
  },

  /** Renders the post through a named template (`null` = default). A custom canvas is kept in a revision. */
  setTemplate: async (
    input: { id: string; templateId: string | null },
    access: UserAccess
  ) => {
    const post = await getPostOrThrow(input.id);
    assertCanEdit(post, access);
    if (post.layout === 'template' && post.templateId === input.templateId)
      return post;

    let templateName = 'the default template';

    if (input.templateId) {
      const [template] = await db
        .select({ name: postTemplates.name })
        .from(postTemplates)
        .where(eq(postTemplates.id, input.templateId))
        .limit(1);
      if (!template) throw new NotFoundException('Template not found');
      templateName = template.name;
    }

    const updated = await db.transaction(async tx => {
      if (post.layout === 'custom') {
        const draft = await getContent(post.id, 'draft', tx);
        await writeRevision(
          post,
          'manual',
          { body: draft?.body ?? '', canvas: draft?.canvas ?? null },
          access.userId,
          'Before switching to a template',
          tx
        );
        await upsertContent(post.id, 'draft', { canvas: null }, tx);
        await setPublishedCanvas(post.id, null, tx);
      }

      const [row] = await tx
        .update(posts)
        .set({ layout: 'template', templateId: input.templateId })
        .where(eq(posts.id, post.id))
        .returning();
      await auditService.log(
        {
          actorId: access.userId,
          action: 'update',
          targetType: 'post',
          targetId: post.id,
          targetName: post.title,
          details: `Layout set to ${templateName}`,
        },
        tx
      );
      return row;
    });

    if (post.status === 'published') revalidatePublicSite();
    return updated;
  },

  publish: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_PUBLISH
    );
    const post = await db.transaction(async tx => {
      const published = await publishInTx(id, access.userId, tx);
      await auditService.log(
        {
          actorId: access.userId,
          action: 'publish',
          targetType: 'post',
          targetId: id,
          targetName: published.title,
        },
        tx
      );
      return published;
    });
    revalidatePublicSite();
    return post;
  },

  unpublish: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_PUBLISH
    );
    const [post] = await db
      .update(posts)
      .set({ status: 'draft' })
      .where(and(eq(posts.id, id), notDeleted))
      .returning();
    if (!post) throw new NotFoundException('Post not found');
    await auditService.log({
      actorId: access.userId,
      action: 'unpublish',
      targetType: 'post',
      targetId: id,
      targetName: post.title,
    });
    revalidatePublicSite();
    return post;
  },

  duplicate: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_CREATE
    );
    const source = await postsService.getById({ id });
    if (!source) throw new NotFoundException('Post not found');

    let slug = `${source.slug}-copy`;

    for (let n = 2; ; n++) {
      const [taken] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(
          and(
            eq(posts.slug, slug),
            eq(posts.language, source.language),
            notDeleted
          )
        )
        .limit(1);
      if (!taken) break;
      slug = `${source.slug}-copy-${n}`;
    }

    return db.transaction(async tx => {
      const [post] = await tx
        .insert(posts)
        .values({
          title: `${source.title} (Copy)`,
          slug,
          excerpt: source.excerpt,
          featuredImage: source.featuredImage,
          status: 'draft',
          visibility: source.visibility,
          layout: source.layout,
          templateId: source.templateId,
          language: source.language,
          createdBy: access.userId,
        })
        .returning();

      await upsertContent(
        post.id,
        'draft',
        { body: source.body, canvas: source.canvas },
        tx
      );

      if (source.seo) {
        const {
          id: _id,
          postId: _postId,
          createdAt: _c,
          updatedAt: _u,
          deletedAt: _d,
          ...seo
        } = source.seo;
        await upsertSeo(post.id, seo, tx);
      }

      await syncTaxonomy(
        post.id,
        { categories: source.categories, tags: source.tags },
        tx
      );
      await auditService.log(
        {
          actorId: access.userId,
          action: 'create',
          targetType: 'post',
          targetId: post.id,
          targetName: post.title,
          details: `Duplicated from ${source.title}`,
        },
        tx
      );
      return post;
    });
  },

  softDelete: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_DELETE
    );
    const [post] = await db
      .update(posts)
      .set({ deletedAt: new Date() })
      .where(and(eq(posts.id, id), notDeleted))
      .returning();
    if (!post) throw new NotFoundException('Post not found');
    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'post',
      targetId: id,
      targetName: post.title,
    });
    if (post.status === 'published') revalidatePublicSite();
    return post;
  },

  listRevisions: async ({ id }: { id: string }) =>
    db
      .select({
        id: postRevisions.id,
        kind: postRevisions.kind,
        label: postRevisions.label,
        title: postRevisions.title,
        layout: postRevisions.layout,
        createdAt: postRevisions.createdAt,
        authorName: users.name,
      })
      .from(postRevisions)
      .leftJoin(users, eq(users.id, postRevisions.authorId))
      .where(eq(postRevisions.postId, id))
      .orderBy(desc(postRevisions.createdAt))
      .limit(100),

  getRevision: async ({ revisionId }: { revisionId: string }) => {
    const [revision] = await db
      .select()
      .from(postRevisions)
      .where(eq(postRevisions.id, revisionId));
    if (!revision) throw new NotFoundException('Revision not found');
    return revision;
  },

  createRevision: async (
    { id, label }: { id: string; label?: string },
    access: UserAccess
  ) => {
    const post = await getPostOrThrow(id);
    assertCanEdit(post, access);
    const draft = await getContent(id, 'draft');
    return writeRevision(
      post,
      'manual',
      { body: draft?.body ?? '', canvas: draft?.canvas ?? null },
      access.userId,
      label || 'Manual snapshot'
    );
  },

  restoreRevision: async (
    { revisionId }: { revisionId: string },
    access: UserAccess
  ) => {
    const revision = await postsService.getRevision({ revisionId });
    const post = await getPostOrThrow(revision.postId);
    assertCanEdit(post, access);

    return db.transaction(async tx => {
      const [updated] = await tx
        .update(posts)
        .set({ title: revision.title, layout: revision.layout })
        .where(eq(posts.id, post.id))
        .returning();

      const snapshot = {
        body: revision.body ?? '',
        canvas: normalizeCanvas(revision.layout, revision.canvas),
      };
      await upsertContent(post.id, 'draft', snapshot, tx);
      await writeRevision(
        updated,
        'manual',
        snapshot,
        access.userId,
        `Restored revision from ${revision.createdAt.toISOString()}`,
        tx
      );
      await auditService.log(
        {
          actorId: access.userId,
          action: 'restore',
          targetType: 'post',
          targetId: post.id,
          targetName: updated.title,
          details: `Revision ${revision.id}`,
        },
        tx
      );
      return updated;
    });
  },

  /** Publishes every scheduled post whose time has come. Safe to call repeatedly. */
  publishDueScheduled: async () => {
    const due = await db
      .select({ id: posts.id, title: posts.title, createdBy: posts.createdBy })
      .from(posts)
      .where(
        and(
          eq(posts.status, 'scheduled'),
          lte(posts.scheduledAt, new Date()),
          notDeleted
        )
      );

    for (const post of due) {
      await db.transaction(async tx => {
        await publishInTx(post.id, post.createdBy, tx);
        await auditService.log(
          {
            actorId: null,
            action: 'publish',
            targetType: 'post',
            targetId: post.id,
            targetName: post.title,
            details: 'Scheduled publish',
          },
          tx
        );
      });
    }

    if (due.length) revalidatePublicSite();
    return due.map(p => p.id);
  },
};

export type PostDetail = NonNullable<
  Awaited<ReturnType<typeof postsService.getById>>
>;
export type PostListItem = Awaited<
  ReturnType<typeof postsService.getPaginated>
>['data'][number];
