import 'server-only';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import {
  applyPatch,
  type BuilderDocument,
  type DocumentPatch,
  documentToPuck,
  toDocument,
} from '@nextcms/builder-core';
import { emptyContentFor, normalizeContent } from '@/builder/data';
import { documentIssues } from '@/builder/validate-document';
import { PERMISSIONS } from '@/config/permissions';
import { offerForPublishedPath } from '@/server/services/redirects.service';
import { searchIndex } from '@/server/services/search.service';
import { db } from '@/db';
import type { SearchParams } from '@/db/helpers/parse-search-params';
import { paginate } from '@/db/helpers/with-pagination';
import {
  type ContentKindType,
  type EditorTypeType,
  pageCategories,
  pageContents,
  pageRevisions,
  pages,
  pageTags,
  pageTemplates,
  type RevisionKindType,
  seoMeta,
  users,
} from '@/db/schema';
import type {
  CreatePagesOutput,
  SaveDraftInput,
  SeoInput,
  UpdatePagesInput,
} from '@/db/validations/pages.validation';
import type { DBTrx } from '@/lib/types';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';
import { assertSiteLocale } from '@/server/services/sites.service';

const PUBLISHING_STATUSES = ['published', 'scheduled'] as const;
const AUTOSAVE_REVISION_INTERVAL_MS = 5 * 60 * 1000;

const SORTABLE = {
  title: pages.title,
  slug: pages.slug,
  status: pages.status,
  updatedAt: pages.updatedAt,
  createdAt: pages.createdAt,
} as const;

async function alive() {
  return and(isNull(pages.deletedAt), eq(pages.siteId, await adminSiteId()));
}

async function getPageOrThrow(id: string, orm: DBTrx = db) {
  const [page] = await orm
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), await alive()))
    .limit(1);

  if (!page) throw new NotFoundException('Page not found');
  return page;
}

/** Authors may only touch their own pages; anyone who can publish may edit every page. */
function assertCanEdit(page: { createdBy: string }, access: UserAccess) {
  if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
    throw new ApplicationException('You do not have permission to edit pages.');
  }

  if (
    page.createdBy !== access.userId &&
    !accessService.can(access, PERMISSIONS.PAGES_PUBLISH)
  ) {
    throw new ApplicationException('You can only edit pages you created.');
  }
}

function assertCanSetStatus(status: string | undefined, access: UserAccess) {
  if (
    status &&
    (PUBLISHING_STATUSES as readonly string[]).includes(status) &&
    !accessService.can(access, PERMISSIONS.PAGES_PUBLISH)
  ) {
    throw new ApplicationException(
      'Only editors and admins can publish or schedule pages. Submit it for review instead.'
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
    .select({ id: pages.id })
    .from(pages)
    .where(
      and(
        eq(pages.slug, slug),
        eq(pages.language, language),
        await alive(),
        excludeId ? ne(pages.id, excludeId) : undefined
      )
    )
    .limit(1);

  if (existing) {
    throw new ApplicationException(
      `The slug "${slug}" is already used by another ${language} page.`
    );
  }
}

/** Writes content and bumps its version, so editors can detect other saves (R738). */
async function upsertContent(
  pageId: string,
  kind: ContentKindType,
  content: unknown,
  orm: DBTrx = db
) {
  const [row] = await orm
    .insert(pageContents)
    .values({ pageId, kind, content: content as object, version: 1 })
    .onConflictDoUpdate({
      target: [pageContents.pageId, pageContents.kind],
      set: {
        content: content as object,
        version: sql`${pageContents.version} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning({ version: pageContents.version });
  return row.version;
}

async function getContent(
  pageId: string,
  kind: ContentKindType,
  orm: DBTrx = db
) {
  const [row] = await orm
    .select()
    .from(pageContents)
    .where(and(eq(pageContents.pageId, pageId), eq(pageContents.kind, kind)))
    .limit(1);
  return row;
}

async function upsertSeo(
  pageId: string,
  seo: Partial<SeoInput> | undefined,
  orm: DBTrx = db
) {
  if (!seo) return;
  await orm
    .insert(seoMeta)
    .values({ pageId, ...seo })
    .onConflictDoUpdate({
      target: seoMeta.pageId,
      set: { ...seo, updatedAt: new Date() },
    });
}

async function syncTaxonomy(
  pageId: string,
  input: { categories?: string[] | null; tags?: string[] | null },
  orm: DBTrx = db
) {
  if (input.categories) {
    await orm.delete(pageCategories).where(eq(pageCategories.pageId, pageId));

    if (input.categories.length) {
      await orm
        .insert(pageCategories)
        .values(input.categories.map(categoryId => ({ pageId, categoryId })))
        .onConflictDoNothing();
    }
  }

  if (input.tags) {
    await orm.delete(pageTags).where(eq(pageTags.pageId, pageId));

    if (input.tags.length) {
      await orm
        .insert(pageTags)
        .values(input.tags.map(tagId => ({ pageId, tagId })))
        .onConflictDoNothing();
    }
  }
}

async function clearOtherHomePages(
  pageId: string,
  language: string,
  orm: DBTrx = db
) {
  const siteId = await adminSiteId();
  await orm
    .update(pages)
    .set({ isHome: false })
    .where(
      and(
        eq(pages.siteId, siteId),
        eq(pages.language, language),
        eq(pages.isHome, true),
        ne(pages.id, pageId)
      )
    );
}

async function clearOtherBlogIndexPages(
  pageId: string,
  language: string,
  orm: DBTrx = db
) {
  const siteId = await adminSiteId();
  await orm
    .update(pages)
    .set({ isBlogIndex: false })
    .where(
      and(
        eq(pages.siteId, siteId),
        eq(pages.language, language),
        eq(pages.isBlogIndex, true),
        ne(pages.id, pageId)
      )
    );
}

async function writeRevision(
  page: { id: string; title: string; editorType: EditorTypeType },
  kind: RevisionKindType,
  content: unknown,
  authorId: string,
  label?: string | null,
  orm: DBTrx = db
) {
  const [revision] = await orm
    .insert(pageRevisions)
    .values({
      pageId: page.id,
      editorType: page.editorType,
      kind,
      title: page.title,
      label: label ?? null,
      content: content as object,
      authorId,
    })
    .returning();
  return revision;
}

/** Stores draft content, updates the page, and records a revision like the builders always have. */
async function writeDraft(
  page: { id: string; title: string; editorType: EditorTypeType },
  content: unknown,
  options: { title?: string; autosave: boolean },
  access: UserAccess,
  tx: DBTrx
) {
  const version = await upsertContent(page.id, 'draft', content, tx);

  const [updated] = await tx
    .update(pages)
    .set({ title: options.title ?? page.title, updatedAt: new Date() })
    .where(eq(pages.id, page.id))
    .returning();

  if (options.autosave) {
    const [lastAutosave] = await tx
      .select({ createdAt: pageRevisions.createdAt })
      .from(pageRevisions)
      .where(
        and(
          eq(pageRevisions.pageId, page.id),
          eq(pageRevisions.kind, 'autosave')
        )
      )
      .orderBy(desc(pageRevisions.createdAt))
      .limit(1);

    if (
      !lastAutosave ||
      Date.now() - lastAutosave.createdAt.getTime() >
        AUTOSAVE_REVISION_INTERVAL_MS
    ) {
      await writeRevision(updated, 'autosave', content, access.userId, 'Autosave', tx);
    }
  } else {
    await writeRevision(updated, 'manual', content, access.userId, 'Saved draft', tx);
  }

  return { id: updated.id, savedAt: new Date().toISOString(), version };
}

async function publishInTx(pageId: string, authorId: string, orm: DBTrx) {
  const page = await getPageOrThrow(pageId, orm);
  const draft = await getContent(pageId, 'draft', orm);
  const content = draft?.content ?? emptyContentFor(page.editorType);

  await upsertContent(pageId, 'published', content, orm);

  const [updated] = await orm
    .update(pages)
    .set({ status: 'published', publishedAt: new Date(), scheduledAt: null })
    .where(eq(pages.id, pageId))
    .returning();

  await writeRevision(
    updated,
    'published',
    content,
    authorId,
    'Published',
    orm
  );
  return updated;
}

export const pagesServices = {
  getPaginated: async (searchParams: SearchParams) => {
    const { page, size, sort, order, search, status, editorType, language } =
      searchParams;
    const { offset, limit } = paginate({
      page: page as string,
      size: size as string,
    });

    const conditions: (SQL | undefined)[] = [await alive()];
    if (typeof status === 'string' && status)
      conditions.push(eq(pages.status, status as never));
    if (typeof editorType === 'string' && editorType)
      conditions.push(eq(pages.editorType, editorType as never));
    if (typeof language === 'string' && language)
      conditions.push(eq(pages.language, language));

    if (typeof search === 'string' && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(or(ilike(pages.title, term), ilike(pages.slug, term)));
    }

    const where = and(...conditions);
    const sortColumn =
      SORTABLE[(sort as keyof typeof SORTABLE) ?? 'updatedAt'] ??
      pages.updatedAt;
    const orderBy = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const [data, [{ totalCount }]] = await Promise.all([
      db
        .select({
          id: pages.id,
          title: pages.title,
          slug: pages.slug,
          status: pages.status,
          visibility: pages.visibility,
          editorType: pages.editorType,
          language: pages.language,
          isHome: pages.isHome,
          isBlogIndex: pages.isBlogIndex,
          scheduledAt: pages.scheduledAt,
          publishedAt: pages.publishedAt,
          createdAt: pages.createdAt,
          updatedAt: pages.updatedAt,
          createdBy: pages.createdBy,
          authorName: users.name,
        })
        .from(pages)
        .leftJoin(users, eq(users.id, pages.createdBy))
        .where(where)
        .orderBy(orderBy, desc(pages.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ totalCount: count() }).from(pages).where(where),
    ]);

    return { data, totalCount };
  },

  getStatusCounts: async () => {
    const rows = await db
      .select({ status: pages.status, total: count() })
      .from(pages)
      .where(await alive())
      .groupBy(pages.status);
    return Object.fromEntries(rows.map(r => [r.status, r.total])) as Record<
      string,
      number
    >;
  },

  getById: async ({ id }: { id: string }) => {
    const siteId = await adminSiteId();
    const page = await db.query.pages.findFirst({
      where: (t, { eq, and, isNull }) =>
        and(eq(t.id, id), eq(t.siteId, siteId), isNull(t.deletedAt)),
      with: {
        contents: true,
        seo: true,
        categories: { columns: { categoryId: true } },
        tags: { columns: { tagId: true } },
        author: { columns: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!page) return null;

    const draft = page.contents.find(c => c.kind === 'draft');
    const published = page.contents.find(c => c.kind === 'published');
    const { contents, ...rest } = page;

    return {
      ...rest,
      content: normalizeContent(
        page.editorType,
        draft?.content ?? published?.content
      ),
      publishedContent: published
        ? normalizeContent(page.editorType, published.content)
        : null,
      /** Version of the stored draft; 0 when there is none yet. */
      draftVersion: draft?.version ?? 0,
      hasUnpublishedChanges:
        page.status === 'published' &&
        JSON.stringify(draft?.content ?? null) !==
          JSON.stringify(published?.content ?? null),
      categories: page.categories.map(c => c.categoryId),
      tags: page.tags.map(t => t.tagId),
    };
  },

  create: async (input: CreatePagesOutput, access: UserAccess) => {
    if (!accessService.can(access, PERMISSIONS.PAGES_CREATE)) {
      throw new ApplicationException(
        'You do not have permission to create pages.'
      );
    }

    assertCanSetStatus(input.status, access);

    if (input.status === 'scheduled' && !input.scheduledAt) {
      throw new ApplicationException(
        'Pick a date and time to schedule this page.'
      );
    }

    const { content, categories, tags, seo, templateId, ...pageInput } = input;
    let editorType = pageInput.editorType;
    let initialContent = content;

    if (templateId) {
      const siteId = await adminSiteId();
      const [template] = await db
        .select()
        .from(pageTemplates)
        .where(and(eq(pageTemplates.id, templateId), eq(pageTemplates.siteId, siteId)));
      if (!template) throw new NotFoundException('Template not found');
      editorType = template.editorType;
      initialContent = template.content;
    }

    const draftContent = normalizeContent(editorType, initialContent);
    const siteId = await adminSiteId();
    await assertSiteLocale(pageInput.language, siteId);
    await assertSlugAvailable(pageInput.slug, pageInput.language);

    const created = await db.transaction(async tx => {
      const [page] = await tx
        .insert(pages)
        .values({
          ...pageInput,
          siteId,
          editorType,
          status: pageInput.status === 'published' ? 'draft' : pageInput.status,
          createdBy: access.userId,
        })
        .returning();

      await upsertContent(page.id, 'draft', draftContent, tx);
      await upsertSeo(page.id, seo, tx);
      await syncTaxonomy(page.id, { categories, tags }, tx);
      if (page.isHome) await clearOtherHomePages(page.id, page.language, tx);
      if (page.isBlogIndex)
        await clearOtherBlogIndexPages(page.id, page.language, tx);

      await auditService.log(
        {
          actorId: access.userId,
          action: 'create',
          targetType: 'page',
          targetId: page.id,
          targetName: page.title,
        },
        tx
      );

      if (pageInput.status === 'published')
        return publishInTx(page.id, access.userId, tx);
      return page;
    });

    if (created.status === 'published') revalidatePublicSite();
    return created;
  },

  update: async (input: UpdatePagesInput, access: UserAccess) => {
    const existing = await getPageOrThrow(input.id);
    assertCanEdit(existing, access);
    if (input.status !== existing.status)
      assertCanSetStatus(input.status, access);

    const {
      id,
      content,
      categories,
      tags,
      seo,
      templateId: _templateId,
      ...pageInput
    } = input;
    const language = pageInput.language ?? existing.language;
    await assertSiteLocale(language, existing.siteId);

    if (pageInput.slug || pageInput.language) {
      await assertSlugAvailable(pageInput.slug ?? existing.slug, language, id);
    }

    if (
      pageInput.status === 'scheduled' &&
      !pageInput.scheduledAt &&
      !existing.scheduledAt
    ) {
      throw new ApplicationException(
        'Pick a date and time to schedule this page.'
      );
    }

    const wasPublished = existing.status === 'published';

    const updated = await db.transaction(async tx => {
      const wantsPublish = pageInput.status === 'published';

      const [page] = await tx
        .update(pages)
        .set({
          ...pageInput,
          ...(wantsPublish && { status: existing.status }),
          ...(pageInput.status &&
            pageInput.status !== 'scheduled' && { scheduledAt: null }),
        })
        .where(eq(pages.id, id))
        .returning();

      const editorType = page.editorType;

      if (content !== undefined) {
        await upsertContent(
          id,
          'draft',
          normalizeContent(editorType, content),
          tx
        );
      }

      await upsertSeo(id, seo, tx);
      await syncTaxonomy(id, { categories, tags }, tx);
      if (page.isHome) await clearOtherHomePages(id, page.language, tx);
      if (page.isBlogIndex)
        await clearOtherBlogIndexPages(id, page.language, tx);

      const action =
        pageInput.status === 'review' && existing.status !== 'review'
          ? 'review_requested'
          : 'update';
      await auditService.log(
        {
          actorId: access.userId,
          action,
          targetType: 'page',
          targetId: id,
          targetName: page.title,
        },
        tx
      );

      if (wantsPublish) {
        const published = await publishInTx(id, access.userId, tx);
        await auditService.log(
          {
            actorId: access.userId,
            action: 'publish',
            targetType: 'page',
            targetId: id,
            targetName: page.title,
          },
          tx
        );
        return published;
      }

      return page;
    });

    if (wasPublished || updated.status === 'published') revalidatePublicSite();
    if (updated.status === 'published') await searchIndex.syncPage(updated.id);
    else if (wasPublished) await searchIndex.removePage(updated.id);
    return {
      ...updated,
      redirectOffer: offerForPublishedPath('page', existing, updated),
    };
  },

  saveDraft: async (input: SaveDraftInput, access: UserAccess) => {
    const page = await getPageOrThrow(input.id);
    assertCanEdit(page, access);

    const content = normalizeContent(page.editorType, input.content);

    return db.transaction(tx =>
      writeDraft(page, content, { title: input.title, autosave: !!input.autosave }, access, tx)
    );
  },

  /**
   * Saves the new editor's draft (R738, R739, R741): checks the version the
   * editor started from, applies a patch (or takes a whole document), checks
   * the result, and stores it as Puck data so both editors read it.
   */
  saveEditorDraft: async (
    input: {
      id: string;
      baseVersion: number;
      patch?: DocumentPatch;
      document?: BuilderDocument;
    },
    access: UserAccess
  ): Promise<
    | { ok: true; version: number; savedAt: string }
    | { ok: false; conflict: true; version: number; document: BuilderDocument }
  > => {
    const page = await getPageOrThrow(input.id);
    assertCanEdit(page, access);
    if (page.editorType !== 'builder') {
      throw new ApplicationException('This page does not use the visual builder.');
    }

    return db.transaction(async tx => {
      // Lock the draft row so two saves cannot both pass the version check.
      const [row] = await tx
        .select()
        .from(pageContents)
        .where(and(eq(pageContents.pageId, page.id), eq(pageContents.kind, 'draft')))
        .for('update')
        .limit(1);
      const stored = row ?? (await getContent(page.id, 'published', tx));
      const current = row?.version ?? 0;
      const base = toDocument(stored?.content);
      if (input.baseVersion !== current) {
        return { ok: false as const, conflict: true as const, version: current, document: base };
      }

      const next = input.patch
        ? applyPatch(base, input.patch)
        : input.document;
      if (!next) throw new ApplicationException('Nothing to save.');
      const problems = documentIssues(next);
      if (problems.length) {
        throw new ApplicationException(`The page could not be saved: ${problems.slice(0, 3).join('; ')}`);
      }

      // Store every block id: the next save reads this back and applies a
      // patch by id, so blocks added in the editor must keep theirs.
      const saved = await writeDraft(
        page,
        documentToPuck(next, { ids: 'always' }),
        { autosave: true },
        access,
        tx
      );
      return { ok: true as const, version: saved.version, savedAt: saved.savedAt };
    });
  },

  switchEditor: async (
    input: { id: string; editorType: EditorTypeType },
    access: UserAccess
  ) => {
    const page = await getPageOrThrow(input.id);
    assertCanEdit(page, access);
    if (page.editorType === input.editorType) return page;

    return db.transaction(async tx => {
      const draft = await getContent(page.id, 'draft', tx);
      await writeRevision(
        page,
        'manual',
        draft?.content ?? null,
        access.userId,
        `Before switching to ${input.editorType}`,
        tx
      );

      const [previous] = await tx
        .select({ content: pageRevisions.content })
        .from(pageRevisions)
        .where(
          and(
            eq(pageRevisions.pageId, page.id),
            eq(pageRevisions.editorType, input.editorType)
          )
        )
        .orderBy(desc(pageRevisions.createdAt))
        .limit(1);

      await upsertContent(
        page.id,
        'draft',
        normalizeContent(input.editorType, previous?.content),
        tx
      );
      const [updated] = await tx
        .update(pages)
        .set({ editorType: input.editorType })
        .where(eq(pages.id, page.id))
        .returning();
      return updated;
    });
  },

  publish: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_PUBLISH
    );
    const page = await db.transaction(async tx => {
      const published = await publishInTx(id, access.userId, tx);
      await auditService.log(
        {
          actorId: access.userId,
          action: 'publish',
          targetType: 'page',
          targetId: id,
          targetName: published.title,
        },
        tx
      );
      return published;
    });
    revalidatePublicSite();
    await searchIndex.syncPage(page.id);
    return { ...page, redirectOffer: null };
  },

  unpublish: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_PUBLISH
    );
    const [page] = await db
      .update(pages)
      .set({ status: 'draft' })
      .where(and(eq(pages.id, id), await alive()))
      .returning();
    if (!page) throw new NotFoundException('Page not found');
    await searchIndex.removePage(id);
    await auditService.log({
      actorId: access.userId,
      action: 'unpublish',
      targetType: 'page',
      targetId: id,
      targetName: page.title,
    });
    revalidatePublicSite();
    return page;
  },

  duplicate: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_CREATE
    );
    const source = await pagesServices.getById({ id });
    if (!source) throw new NotFoundException('Page not found');

    let slug = `${source.slug}-copy`;

    for (let n = 2; ; n++) {
      const [taken] = await db
        .select({ id: pages.id })
        .from(pages)
        .where(
          and(
            eq(pages.slug, slug),
            eq(pages.language, source.language),
            await alive()
          )
        )
        .limit(1);
      if (!taken) break;
      slug = `${source.slug}-copy-${n}`;
    }

    return db.transaction(async tx => {
      const [page] = await tx
        .insert(pages)
        .values({
          siteId: source.siteId,
          title: `${source.title} (Copy)`,
          slug,
          status: 'draft',
          visibility: source.visibility,
          editorType: source.editorType,
          language: source.language,
          isHome: false,
          createdBy: access.userId,
        })
        .returning();

      await upsertContent(page.id, 'draft', source.content, tx);

      if (source.seo) {
        const {
          id: _id,
          pageId: _pageId,
          createdAt: _c,
          updatedAt: _u,
          deletedAt: _d,
          ...seo
        } = source.seo;
        await upsertSeo(page.id, seo, tx);
      }

      await syncTaxonomy(
        page.id,
        { categories: source.categories, tags: source.tags },
        tx
      );
      await auditService.log(
        {
          actorId: access.userId,
          action: 'create',
          targetType: 'page',
          targetId: page.id,
          targetName: page.title,
          details: `Duplicated from ${source.title}`,
        },
        tx
      );
      return page;
    });
  },

  softDelete: async ({ id }: { id: string }, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_DELETE
    );
    const [page] = await db
      .update(pages)
      .set({ deletedAt: new Date(), isHome: false, isBlogIndex: false })
      .where(and(eq(pages.id, id), await alive()))
      .returning();
    if (!page) throw new NotFoundException('Page not found');
    await searchIndex.removePage(id);
    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'page',
      targetId: id,
      targetName: page.title,
    });
    if (page.status === 'published') revalidatePublicSite();
    return page;
  },

  listRevisions: async ({ id }: { id: string }) =>
    db
      .select({
        id: pageRevisions.id,
        kind: pageRevisions.kind,
        label: pageRevisions.label,
        title: pageRevisions.title,
        editorType: pageRevisions.editorType,
        createdAt: pageRevisions.createdAt,
        authorName: users.name,
      })
      .from(pageRevisions)
      .leftJoin(users, eq(users.id, pageRevisions.authorId))
      .where(eq(pageRevisions.pageId, id))
      .orderBy(desc(pageRevisions.createdAt))
      .limit(100),

  getRevision: async ({ revisionId }: { revisionId: string }) => {
    const [revision] = await db
      .select()
      .from(pageRevisions)
      .where(eq(pageRevisions.id, revisionId));
    if (!revision) throw new NotFoundException('Revision not found');
    return revision;
  },

  createRevision: async (
    { id, label }: { id: string; label?: string },
    access: UserAccess
  ) => {
    const page = await getPageOrThrow(id);
    assertCanEdit(page, access);
    const draft = await getContent(id, 'draft');
    return writeRevision(
      page,
      'manual',
      draft?.content ?? null,
      access.userId,
      label || 'Manual snapshot'
    );
  },

  restoreRevision: async (
    { revisionId }: { revisionId: string },
    access: UserAccess
  ) => {
    const revision = await pagesServices.getRevision({ revisionId });
    const page = await getPageOrThrow(revision.pageId);
    assertCanEdit(page, access);

    return db.transaction(async tx => {
      const [updated] = await tx
        .update(pages)
        .set({ title: revision.title, editorType: revision.editorType })
        .where(eq(pages.id, page.id))
        .returning();

      await upsertContent(
        page.id,
        'draft',
        normalizeContent(revision.editorType, revision.content),
        tx
      );
      await writeRevision(
        updated,
        'manual',
        revision.content,
        access.userId,
        `Restored revision from ${revision.createdAt.toISOString()}`,
        tx
      );
      await auditService.log(
        {
          actorId: access.userId,
          action: 'restore',
          targetType: 'page',
          targetId: page.id,
          targetName: updated.title,
          details: `Revision ${revision.id}`,
        },
        tx
      );
      return updated;
    });
  },

  createTranslation: async (
    { id, language }: { id: string; language: string },
    access: UserAccess
  ) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_CREATE
    );
    const source = await pagesServices.getById({ id });
    if (!source) throw new NotFoundException('Page not found');
    await assertSiteLocale(language, source.siteId);
    if (source.language === language)
      throw new ApplicationException(
        'Pick a different language for the translation.'
      );

    const groupId = source.translationGroupId ?? source.id;
    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(
        and(
          eq(pages.translationGroupId, groupId),
          eq(pages.language, language),
          await alive()
        )
      )
      .limit(1);
    if (existing)
      throw new ApplicationException(
        `A ${language} translation already exists.`
      );

    await assertSlugAvailable(source.slug, language);

    return db.transaction(async tx => {
      if (!source.translationGroupId) {
        await tx
          .update(pages)
          .set({ translationGroupId: groupId })
          .where(eq(pages.id, source.id));
      }

      const [page] = await tx
        .insert(pages)
        .values({
          siteId: source.siteId,
          title: source.title,
          slug: source.slug,
          status: 'draft',
          visibility: source.visibility,
          editorType: source.editorType,
          language,
          isHome: source.isHome,
          isBlogIndex: source.isBlogIndex,
          translationGroupId: groupId,
          createdBy: access.userId,
        })
        .returning();

      await upsertContent(page.id, 'draft', source.content, tx);

      if (source.seo) {
        const {
          id: _id,
          pageId: _pageId,
          createdAt: _c,
          updatedAt: _u,
          deletedAt: _d,
          ...seo
        } = source.seo;
        await upsertSeo(page.id, seo, tx);
      }

      if (page.isHome) await clearOtherHomePages(page.id, language, tx);
      if (page.isBlogIndex)
        await clearOtherBlogIndexPages(page.id, language, tx);
      await auditService.log(
        {
          actorId: access.userId,
          action: 'create',
          targetType: 'page',
          targetId: page.id,
          targetName: page.title,
          details: `Translation (${language}) of ${source.id}`,
        },
        tx
      );
      return page;
    });
  },

  getTranslations: async (groupId: string | null, pageId: string) => {
    if (!groupId) return [];
    return db
      .select({
        id: pages.id,
        language: pages.language,
        title: pages.title,
        slug: pages.slug,
        status: pages.status,
      })
      .from(pages)
      .where(
        and(
          eq(pages.translationGroupId, groupId),
          ne(pages.id, pageId),
          await alive()
        )
      );
  },

  /** Publishes every scheduled page whose time has come. Safe to call repeatedly. */
  publishDueScheduled: async () => {
    const due = await db
      .select({ id: pages.id, title: pages.title, createdBy: pages.createdBy })
      .from(pages)
      .where(
        and(eq(pages.status, 'scheduled'), lte(pages.scheduledAt, new Date()))
      );

    for (const page of due) {
      try {
        await db.transaction(async tx => {
          await publishInTx(page.id, page.createdBy, tx);
          await auditService.log(
            {
              actorId: null,
              action: 'publish',
              targetType: 'page',
              targetId: page.id,
              targetName: page.title,
              details: 'Scheduled publish',
            },
            tx
          );
        });
      } catch (error) {
        console.error('[pages.publishDueScheduled] failed for', page.id, error);
      }
    }

    if (due.length) revalidatePublicSite();
    return due.map(p => p.id);
  },

  listForSelect: async (ids?: string[]) =>
    db
      .select({
        id: pages.id,
        title: pages.title,
        slug: pages.slug,
        language: pages.language,
      })
      .from(pages)
      .where(and(await alive(), ids?.length ? inArray(pages.id, ids) : undefined))
      .orderBy(asc(pages.title)),
};

export type PageDetail = NonNullable<
  Awaited<ReturnType<typeof pagesServices.getById>>
>;
export type PageListItem = Awaited<
  ReturnType<typeof pagesServices.getPaginated>
>['data'][number];
