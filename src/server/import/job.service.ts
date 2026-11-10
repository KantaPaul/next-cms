import 'server-only';
import { createId } from '@paralleldrive/cuid2';
import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import {
  ALLOWED_MIME,
  mediaService,
} from '@/app/(admin)/dashboard/(shell)/media/_modules/media.service';
import { menusService } from '@/app/(admin)/dashboard/(shell)/menus/_modules/menus.service';
import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';
import { normalizeContent } from '@/builder/data';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  categories,
  comments,
  globalBlocks,
  type ImportItemKind,
  type ImportItemStatus,
  type ImportJobCounts,
  type ImportJobOptions,
  type ImportJobProgress,
  type ImportJobReport,
  type ImportReportEntry,
  importItems,
  importJobs,
  media,
  menus,
  pageCategories,
  pageContents,
  pageRevisions,
  pages,
  pageTags,
  postCategories,
  postContents,
  postRevisions,
  postSeo,
  posts,
  postTags,
  redirects,
  seoMeta,
  tags,
  users,
  UserStatus,
} from '@/db/schema';
import type { MenuLocationType } from '@/db/schemas/shared.schema';
import { env } from '@/env.mjs';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { safeFetch } from '@/server/lib/safe-fetch';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { normalizeSitePath } from '@/server/services/redirects.service';
import { searchIndex } from '@/server/services/search.service';
import { adminSiteId } from '@/server/services/site-context';
import { storage } from '@/server/storage';
import {
  convertElementorToDocument,
  parseElementorPayload,
} from './elementor';
import { cleanWordPressHtml, type RewriteUrlMaps } from './html';
import {
  buildMenuTree,
  buildTaxonomyRedirectPaths,
  buildWordPressRedirectPaths,
  mapWpStatus,
  resolveUniqueSlug,
  resolveWpDate,
} from './mapper';
import { extractSeoFromMeta } from './meta';
import {
  parseWxr,
  slugifyImportValue,
  type WxrAuthor,
  type WxrComment,
  type WxrPost,
  type WxrTerm,
} from './wxr';

const NON_MEDIA_BATCH_SIZE = 25;
const MEDIA_BATCH_SIZE = 5;

const DEFAULT_OPTIONS: ImportJobOptions = {
  downloadMedia: true,
  importAsDrafts: false,
  createRedirects: true,
  importComments: true,
  importAuthors: true,
  templateTarget: 'page_template',
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  pdf: 'application/pdf',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

function inferMime(headerContentType: string | null, filename: string): string {
  const cleanHeader = headerContentType?.split(';')[0]?.trim().toLowerCase();
  if (cleanHeader && cleanHeader !== 'application/octet-stream') {
    return cleanHeader;
  }
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_MIME[ext] ?? cleanHeader ?? 'application/octet-stream';
}

/** The response body, or null once it passes `maxBytes` (the download is cancelled). */
async function readCapped(
  res: Response,
  maxBytes: number
): Promise<ArrayBuffer | null> {
  if (!res.body) return new ArrayBuffer(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

function filenameFromUrl(urlStr: string, fallback = 'imported-media'): string {
  try {
    const u = new URL(urlStr);
    const base = u.pathname.split('/').filter(Boolean).pop();
    if (base) return base.slice(0, 200);
  } catch {
    // ignore
  }
  return fallback;
}

function stripTagsToPlain(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function sortCategoriesTopologically(terms: WxrTerm[]): WxrTerm[] {
  const bySlug = new Map(terms.map(t => [t.slug, t]));
  const visited = new Set<string>();
  const ordered: WxrTerm[] = [];

  const visit = (term: WxrTerm, stack = new Set<string>()) => {
    if (visited.has(term.slug) || stack.has(term.slug)) return;
    stack.add(term.slug);
    if (term.parentSlug && bySlug.has(term.parentSlug)) {
      visit(bySlug.get(term.parentSlug)!, stack);
    }
    visited.add(term.slug);
    ordered.push(term);
  };

  for (const t of terms) visit(t);
  return ordered;
}

function sortCommentsParentFirst(list: WxrComment[]): WxrComment[] {
  const byId = new Map(list.map(c => [c.wpId, c]));
  const visited = new Set<string>();
  const ordered: WxrComment[] = [];

  const visit = (c: WxrComment, stack = new Set<string>()) => {
    if (visited.has(c.wpId) || stack.has(c.wpId)) return;
    stack.add(c.wpId);
    if (c.parentWpId && c.parentWpId !== '0' && byId.has(c.parentWpId)) {
      visit(byId.get(c.parentWpId)!, stack);
    }
    visited.add(c.wpId);
    ordered.push(c);
  };

  for (const c of list) visit(c);
  return ordered;
}

function dashboardUrlFor(kind: ImportItemKind, newId: string | null): string | null {
  if (!newId) return null;
  switch (kind) {
    case 'post':
      return PAGES.DASHBOARD.POSTS.EDIT(newId);
    case 'page':
      return PAGES.DASHBOARD.PAGES.EDIT(newId);
    case 'attachment':
      return PAGES.DASHBOARD.MEDIA;
    case 'menu':
      return PAGES.DASHBOARD.MENUS;
    case 'category':
    case 'tag':
      return PAGES.DASHBOARD.TAXONOMY;
    case 'comment':
      return PAGES.DASHBOARD.COMMENTS;
    case 'author':
      return PAGES.DASHBOARD.USERS;
    case 'template':
      return PAGES.DASHBOARD.TEMPLATES;
    default:
      return null;
  }
}

export const importJobService = {
  listJobs: async (access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const siteId = await adminSiteId();
    return db
      .select({
        id: importJobs.id,
        sourceKind: importJobs.sourceKind,
        sourceFilename: importJobs.sourceFilename,
        status: importJobs.status,
        options: importJobs.options,
        counts: importJobs.counts,
        progress: importJobs.progress,
        report: importJobs.report,
        createdAt: importJobs.createdAt,
        updatedAt: importJobs.updatedAt,
      })
      .from(importJobs)
      .where(and(eq(importJobs.siteId, siteId), isNull(importJobs.deletedAt)))
      .orderBy(desc(importJobs.createdAt))
      .limit(20);
  },

  getJob: async (jobId: string, access: UserAccess) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );
    const siteId = await adminSiteId();
    const [job] = await db
      .select()
      .from(importJobs)
      .where(
        and(
          eq(importJobs.id, jobId),
          eq(importJobs.siteId, siteId),
          isNull(importJobs.deletedAt)
        )
      )
      .limit(1);
    if (!job) throw new NotFoundException('Import job not found');
    return job;
  },

  createJobFromUpload: async ({
    filename,
    buffer,
    access,
  }: {
    filename: string;
    buffer: Buffer;
    access: UserAccess;
  }) => {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.SETTINGS_MANAGE
    );

    const lower = filename.toLowerCase();
    const isJson = lower.endsWith('.json');
    const isXml = lower.endsWith('.xml');
    if (!isJson && !isXml) {
      throw new ApplicationException(
        'Upload a WordPress WXR (.xml) or Elementor template (.json) file.'
      );
    }

    const siteId = await adminSiteId();
    const jobId = createId();
    const ext = isJson ? 'json' : 'xml';
    const sourceKey = `imports/${jobId}.${ext}`;
    const contentType = isJson ? 'application/json' : 'application/xml';

    // Save raw source to private storage (never into `media` table)
    await storage().put(sourceKey, buffer, contentType);

    if (isJson) {
      let parsedTemplate: ReturnType<typeof parseElementorPayload>;
      try {
        parsedTemplate = parseElementorPayload(buffer.toString('utf8'));
      } catch {
        throw new ApplicationException('Invalid Elementor template JSON file.');
      }
      if (!parsedTemplate.elements.length) {
        throw new ApplicationException(
          'Elementor JSON file contains no elements.'
        );
      }

      const templateTitle =
        parsedTemplate.title?.trim() ||
        filename.replace(/\.json$/i, '').trim() ||
        'Elementor Template';
      const preview = convertElementorToDocument(parsedTemplate.elements, {
        pageTitle: templateTitle,
      });

      const widgetCounts = new Map<string, number>();
      for (const w of preview.fallbackWidgets) {
        widgetCounts.set(w, (widgetCounts.get(w) ?? 0) + 1);
      }

      const counts: ImportJobCounts = {
        authors: 0,
        categories: 0,
        tags: 0,
        attachments: 0,
        posts: 0,
        pages: 0,
        elementorPages: 1,
        menus: 0,
        comments: 0,
        templates: 1,
        skippedTypes: {},
        fallbackWidgets: [...widgetCounts.entries()].map(([widget, cnt]) => ({
          widget,
          pageTitle: templateTitle,
          count: cnt,
        })),
        totalProcessable: 1,
      };

      const progress: ImportJobProgress = {
        processed: 0,
        total: 1,
        imported: 0,
        skipped: 0,
        failed: 0,
      };

      const [job] = await db
        .insert(importJobs)
        .values({
          id: jobId,
          siteId,
          createdBy: access.userId,
          sourceKind: 'elementor_json',
          sourceFilename: filename.slice(0, 255),
          sourceKey,
          status: 'parsed',
          options: DEFAULT_OPTIONS,
          counts,
          progress,
          report: { renames: [], warnings: [], redirectsCreated: 0 },
        })
        .returning();

      await db.insert(importItems).values({
        jobId,
        siteId,
        kind: 'template',
        wpId: 'template-1',
        wpSlug: slugifyImportValue(templateTitle),
        title: templateTitle.slice(0, 500),
        status: 'pending',
        sortOrder: 1000,
        payload: {
          title: templateTitle,
          elements: parsedTemplate.elements,
        },
      });

      return job;
    }

    // Parse WXR XML
    let parsedWxr: ReturnType<typeof parseWxr>;
    try {
      parsedWxr = parseWxr(buffer.toString('utf8'));
    } catch (err) {
      throw new ApplicationException(
        err instanceof Error ? err.message : 'Failed to parse WXR XML.'
      );
    }

    const categoriesList = sortCategoriesTopologically(
      parsedWxr.terms.filter(t => t.taxonomy === 'category')
    );
    const tagsList = parsedWxr.terms.filter(t => t.taxonomy === 'post_tag');
    const navMenuTerms = parsedWxr.terms.filter(t => t.taxonomy === 'nav_menu');

    const attachmentsList = parsedWxr.posts.filter(
      p => p.postType === 'attachment'
    );
    const postsList = parsedWxr.posts.filter(p => p.postType === 'post');
    const pagesList = parsedWxr.posts.filter(p => p.postType === 'page');
    const menuItemsList = parsedWxr.posts.filter(
      p => p.postType === 'nav_menu_item'
    );
    const otherPosts = parsedWxr.posts.filter(
      p =>
        p.postType !== 'post' &&
        p.postType !== 'page' &&
        p.postType !== 'attachment' &&
        p.postType !== 'nav_menu_item'
    );

    // Group menu items by nav_menu slug
    const menuGroups = new Map<string, { title: string; items: WxrPost[] }>();
    for (const term of navMenuTerms) {
      menuGroups.set(term.slug, { title: term.name || term.slug, items: [] });
    }
    for (const mi of menuItemsList) {
      const targetSlugs = mi.navMenuSlugs.length ? mi.navMenuSlugs : ['main-menu'];
      for (const mSlug of targetSlugs) {
        if (!menuGroups.has(mSlug)) {
          menuGroups.set(mSlug, { title: mSlug, items: [] });
        }
        menuGroups.get(mSlug)!.items.push(mi);
      }
    }
    const nonEmptyMenus = [...menuGroups.entries()].filter(
      ([, g]) => g.items.length > 0
    );

    const approvedComments = sortCommentsParentFirst(
      parsedWxr.comments.filter(c => c.approved)
    );

    // Dry-run Elementor scan for preview counts & fallback widget warnings
    let elementorPages = 0;
    const fallbackWidgets: ImportJobCounts['fallbackWidgets'] = [];
    for (const item of [...pagesList, ...postsList]) {
      const rawEl = item.meta._elementor_data;
      if (!rawEl) continue;
      try {
        const parsedEl = parseElementorPayload(rawEl);
        if (parsedEl.elements.length === 0) continue;
        if (item.postType === 'page') elementorPages += 1;
        const conv = convertElementorToDocument(parsedEl.elements, {
          pageTitle: item.title,
        });
        if (conv.fallbackWidgets.length > 0) {
          const grouped = new Map<string, number>();
          for (const w of conv.fallbackWidgets) {
            grouped.set(w, (grouped.get(w) ?? 0) + 1);
          }
          for (const [widget, cnt] of grouped.entries()) {
            fallbackWidgets.push({ widget, pageTitle: item.title, count: cnt });
          }
        }
      } catch {
        // Invalid Elementor JSON will fall back gracefully during import
      }
    }

    // Build rows for import_items
    const itemRows: Array<typeof importItems.$inferInsert> = [];
    let order = 0;

    for (const author of parsedWxr.authors) {
      order += 1;
      itemRows.push({
        jobId,
        siteId,
        kind: 'author',
        wpId: author.wpId || author.login || author.email,
        wpSlug: author.login,
        title: author.displayName.slice(0, 500),
        status: 'pending',
        sortOrder: 1000 + order,
        payload: author as unknown as Record<string, unknown>,
      });
    }

    for (const cat of categoriesList) {
      order += 1;
      itemRows.push({
        jobId,
        siteId,
        kind: 'category',
        wpId: cat.wpId || cat.slug,
        wpSlug: cat.slug,
        title: cat.name.slice(0, 500),
        status: 'pending',
        sortOrder: 2000 + order,
        payload: cat as unknown as Record<string, unknown>,
      });
    }

    for (const tag of tagsList) {
      order += 1;
      itemRows.push({
        jobId,
        siteId,
        kind: 'tag',
        wpId: tag.wpId || tag.slug,
        wpSlug: tag.slug,
        title: tag.name.slice(0, 500),
        status: 'pending',
        sortOrder: 3000 + order,
        payload: tag as unknown as Record<string, unknown>,
      });
    }

    for (const att of attachmentsList) {
      order += 1;
      itemRows.push({
        jobId,
        siteId,
        kind: 'attachment',
        wpId: att.wpId,
        wpSlug: att.slug,
        title: att.title.slice(0, 500),
        oldUrl: att.attachmentUrl || att.guid || att.link || null,
        status: 'pending',
        sortOrder: 4000 + order,
        payload: {
          ...att,
          siteUrl: parsedWxr.siteUrl,
          siteTitle: parsedWxr.siteTitle,
        } as unknown as Record<string, unknown>,
      });
    }

    for (const post of postsList) {
      order += 1;
      itemRows.push({
        jobId,
        siteId,
        kind: 'post',
        wpId: post.wpId,
        wpSlug: post.slug,
        title: post.title.slice(0, 500),
        oldUrl: post.link || null,
        status: 'pending',
        sortOrder: 5000 + order,
        payload: {
          ...post,
          siteUrl: parsedWxr.siteUrl,
          siteTitle: parsedWxr.siteTitle,
        } as unknown as Record<string, unknown>,
      });
    }

    for (const page of pagesList) {
      order += 1;
      itemRows.push({
        jobId,
        siteId,
        kind: 'page',
        wpId: page.wpId,
        wpSlug: page.slug,
        title: page.title.slice(0, 500),
        oldUrl: page.link || null,
        status: 'pending',
        sortOrder: 6000 + order,
        payload: {
          ...page,
          siteUrl: parsedWxr.siteUrl,
          siteTitle: parsedWxr.siteTitle,
        } as unknown as Record<string, unknown>,
      });
    }

    for (const [menuSlug, group] of nonEmptyMenus) {
      order += 1;
      itemRows.push({
        jobId,
        siteId,
        kind: 'menu',
        wpId: menuSlug,
        wpSlug: menuSlug,
        title: group.title.slice(0, 500),
        status: 'pending',
        sortOrder: 7000 + order,
        payload: {
          menuSlug,
          menuTitle: group.title,
          items: group.items,
        } as unknown as Record<string, unknown>,
      });
    }

    for (const comment of approvedComments) {
      order += 1;
      itemRows.push({
        jobId,
        siteId,
        kind: 'comment',
        wpId: comment.wpId,
        title: `${comment.authorName} on #${comment.postWpId}`.slice(0, 500),
        status: 'pending',
        sortOrder: 8000 + order,
        payload: comment as unknown as Record<string, unknown>,
      });
    }

    for (const skippedPost of otherPosts) {
      order += 1;
      itemRows.push({
        jobId,
        siteId,
        kind: 'skipped',
        wpId: skippedPost.wpId || `${skippedPost.postType}-${order}`,
        wpSlug: skippedPost.slug,
        title: skippedPost.title.slice(0, 500),
        status: 'skipped',
        sortOrder: 9000 + order,
        message: `Skipped unsupported post type "${skippedPost.postType}"`,
        payload: { postType: skippedPost.postType },
      });
    }

    const totalProcessable =
      parsedWxr.authors.length +
      categoriesList.length +
      tagsList.length +
      attachmentsList.length +
      postsList.length +
      pagesList.length +
      nonEmptyMenus.length +
      approvedComments.length;

    const counts: ImportJobCounts = {
      authors: parsedWxr.authors.length,
      categories: categoriesList.length,
      tags: tagsList.length,
      attachments: attachmentsList.length,
      posts: postsList.length,
      pages: pagesList.length,
      elementorPages,
      menus: nonEmptyMenus.length,
      comments: approvedComments.length,
      templates: 0,
      skippedTypes: parsedWxr.skippedTypes,
      fallbackWidgets,
      totalProcessable,
    };

    const progress: ImportJobProgress = {
      processed: 0,
      total: totalProcessable,
      imported: 0,
      skipped: otherPosts.length,
      failed: 0,
    };

    const [job] = await db
      .insert(importJobs)
      .values({
        id: jobId,
        siteId,
        createdBy: access.userId,
        sourceKind: 'wxr',
        sourceFilename: filename.slice(0, 255),
        sourceKey,
        status: totalProcessable === 0 ? 'done' : 'parsed',
        options: DEFAULT_OPTIONS,
        counts,
        progress,
        report: { renames: [], warnings: [], redirectsCreated: 0 },
      })
      .returning();

    if (itemRows.length > 0) {
      for (let i = 0; i < itemRows.length; i += 250) {
        await db.insert(importItems).values(itemRows.slice(i, i + 250));
      }
    }

    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'import_job',
      targetId: job.id,
      targetName: filename,
    });

    return job;
  },

  updateJob: async (
    jobId: string,
    patch: {
      status?: 'running' | 'cancelled' | 'parsed';
      options?: Partial<ImportJobOptions>;
    },
    access: UserAccess
  ) => {
    const job = await importJobService.getJob(jobId, access);
    const nextOptions: ImportJobOptions = {
      ...job.options,
      ...(patch.options ?? {}),
    };
    const nextStatus =
      patch.status &&
      (patch.status === 'cancelled' ||
        (patch.status === 'running' &&
          (job.status === 'parsed' || job.status === 'cancelled')) ||
        (patch.status === 'parsed' && job.status === 'cancelled'))
        ? patch.status
        : job.status;

    const [updated] = await db
      .update(importJobs)
      .set({
        options: nextOptions,
        status: nextStatus,
      })
      .where(eq(importJobs.id, job.id))
      .returning();
    return updated;
  },

  stepJob: async (jobId: string, access: UserAccess) => {
    const job = await importJobService.getJob(jobId, access);
    if (job.status === 'cancelled' || job.status === 'done') {
      return job;
    }

    const siteId = job.siteId;
    const options = { ...DEFAULT_OPTIONS, ...job.options };
    const report: ImportJobReport = {
      renames: [...(job.report?.renames ?? [])],
      warnings: [...(job.report?.warnings ?? [])],
      redirectsCreated: job.report?.redirectsCreated ?? 0,
    };

    if (job.status === 'parsed') {
      await db
        .update(importJobs)
        .set({ status: 'running' })
        .where(eq(importJobs.id, job.id));
    }

    // Fetch pending items
    const pendingRows = await db
      .select()
      .from(importItems)
      .where(
        and(eq(importItems.jobId, job.id), eq(importItems.status, 'pending'))
      )
      .orderBy(asc(importItems.sortOrder))
      .limit(NON_MEDIA_BATCH_SIZE);

    if (pendingRows.length === 0) {
      const [doneJob] = await db
        .update(importJobs)
        .set({ status: 'done' })
        .where(eq(importJobs.id, job.id))
        .returning();
      revalidatePublicSite();
      return doneJob;
    }

    // Respect 5 media files or 25 non-media items per step
    const batch: typeof pendingRows = [];
    if (pendingRows[0].kind === 'attachment' && options.downloadMedia) {
      for (const r of pendingRows) {
        if (r.kind !== 'attachment' || batch.length >= MEDIA_BATCH_SIZE) break;
        batch.push(r);
      }
    } else {
      for (const r of pendingRows) {
        if (
          r.kind === 'attachment' &&
          options.downloadMedia &&
          batch.length > 0
        ) {
          break;
        }
        batch.push(r);
        if (batch.length >= NON_MEDIA_BATCH_SIZE) break;
      }
    }

    // Load lookup maps from existing DB + prior import_items for this siteId
    const [
      allRoles,
      existingSiteUsers,
      existingCats,
      existingTags,
      existingPosts,
      existingPages,
      existingMedia,
      existingMenus,
      existingComments,
      existingRedirects,
      priorItems,
    ] = await Promise.all([
      accessService.ensureRolesSeeded(),
      db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(isNull(users.deletedAt)),
      db
        .select({ id: categories.id, slug: categories.slug, name: categories.name })
        .from(categories)
        .where(and(eq(categories.siteId, siteId), isNull(categories.deletedAt))),
      db
        .select({ id: tags.id, slug: tags.slug, name: tags.name })
        .from(tags)
        .where(and(eq(tags.siteId, siteId), isNull(tags.deletedAt))),
      db
        .select({ id: posts.id, slug: posts.slug, title: posts.title, language: posts.language })
        .from(posts)
        .where(and(eq(posts.siteId, siteId), isNull(posts.deletedAt))),
      db
        .select({ id: pages.id, slug: pages.slug, title: pages.title, language: pages.language })
        .from(pages)
        .where(and(eq(pages.siteId, siteId), isNull(pages.deletedAt))),
      db
        .select({ id: media.id, url: media.url, title: media.title })
        .from(media)
        .where(eq(media.siteId, siteId)),
      db
        .select({ id: menus.id, location: menus.location, language: menus.language })
        .from(menus)
        .where(and(eq(menus.siteId, siteId), isNull(menus.deletedAt))),
      db
        .select({ id: comments.id, parentId: comments.parentId })
        .from(comments)
        .where(and(eq(comments.siteId, siteId), isNull(comments.deletedAt))),
      db
        .select({ fromPath: redirects.fromPath })
        .from(redirects)
        .where(eq(redirects.siteId, siteId)),
      db
        .select()
        .from(importItems)
        .where(
          and(
            eq(importItems.siteId, siteId),
            inArray(importItems.status, ['done', 'skipped'])
          )
        ),
    ]);

    const authorRoleId =
      allRoles.find(r => r.name === 'Author')?.id ??
      allRoles.find(r => r.name === 'Viewer')?.id ??
      null;

    const userIdByEmail = new Map(
      existingSiteUsers.map(u => [u.email.toLowerCase(), u.id])
    );
    const categoryIdBySlug = new Map(existingCats.map(c => [c.slug, c.id]));
    const tagIdBySlug = new Map(existingTags.map(t => [t.slug, t.id]));
    const usedPostSlugs = new Set(existingPosts.map(p => p.slug));
    const usedPageSlugs = new Set(existingPages.map(p => p.slug));
    const activeMediaById = new Map(existingMedia.map(m => [m.id, m]));
    const activePostIds = new Set(existingPosts.map(p => p.id));
    const activePageIds = new Set(existingPages.map(p => p.id));
    const activeMenuIds = new Set(existingMenus.map(m => m.id));
    const commentParentById = new Map(
      existingComments.map(c => [c.id, c.parentId])
    );
    const takenRedirectPaths = new Set(existingRedirects.map(r => r.fromPath));
    const takenMenuLocations = new Set(
      existingMenus.map(m => `${m.location}:${m.language}`)
    );

    const authorUserIdByLogin = new Map<string, string>();
    const mediaByWpId = new Map<string, { id: string; url: string }>();
    const postUrlByWpId = new Map<string, string>();
    const postTitleByWpId = new Map<string, string>();
    const postNewIdByWpId = new Map<string, string>();
    const termUrlByWpId = new Map<string, string>();
    const termNameByWpId = new Map<string, string>();
    const commentNewIdByWpId = new Map<string, string>();
    const urlMap = new Map<string, string>();
    const idMap = new Map<string, string>();

    // Track items already imported on this siteId whose target record still exists
    const activePriorByKey = new Map<
      string,
      { newId: string; newUrl: string | null }
    >();

    for (const pi of priorItems) {
      if (!pi.newId) continue;
      if (pi.kind === 'author') {
        if (pi.wpSlug) authorUserIdByLogin.set(pi.wpSlug, pi.newId);
        const pEmail = (pi.payload as { email?: string } | null)?.email;
        if (pEmail) authorUserIdByLogin.set(pEmail.toLowerCase(), pi.newId);
      } else if (pi.kind === 'category' && pi.wpId) {
        const slug = pi.wpSlug || pi.wpId;
        if (categoryIdBySlug.has(slug)) {
          const url = `/blog/category/${slug}`;
          termUrlByWpId.set(pi.wpId, url);
          termNameByWpId.set(pi.wpId, pi.title || slug);
        }
      } else if (pi.kind === 'tag' && pi.wpId) {
        const slug = pi.wpSlug || pi.wpId;
        if (tagIdBySlug.has(slug)) {
          const url = `/blog/tag/${slug}`;
          termUrlByWpId.set(pi.wpId, url);
          termNameByWpId.set(pi.wpId, pi.title || slug);
        }
      } else if (pi.kind === 'attachment') {
        const m = activeMediaById.get(pi.newId);
        if (m) {
          mediaByWpId.set(pi.wpId, { id: m.id, url: m.url });
          if (pi.oldUrl) {
            urlMap.set(pi.oldUrl, m.url);
            try {
              const u = new URL(pi.oldUrl);
              const path =
                u.pathname.length > 1 && u.pathname.endsWith('/')
                  ? u.pathname.slice(0, -1)
                  : u.pathname;
              urlMap.set(`${u.origin.toLowerCase()}${path}`, m.url);
              urlMap.set(path, m.url);
            } catch {
              // ignore
            }
          }
          activePriorByKey.set(`attachment:${pi.wpId}`, {
            newId: m.id,
            newUrl: m.url,
          });
        }
      } else if (pi.kind === 'post') {
        if (activePostIds.has(pi.newId) && pi.newUrl) {
          postUrlByWpId.set(pi.wpId, pi.newUrl);
          postTitleByWpId.set(pi.wpId, pi.title || '');
          postNewIdByWpId.set(pi.wpId, pi.newId);
          idMap.set(pi.wpId, pi.newUrl);
          if (pi.oldUrl) urlMap.set(pi.oldUrl, pi.newUrl);
          activePriorByKey.set(`post:${pi.wpId}`, {
            newId: pi.newId,
            newUrl: pi.newUrl,
          });
        }
      } else if (pi.kind === 'page') {
        if (activePageIds.has(pi.newId) && pi.newUrl) {
          postUrlByWpId.set(pi.wpId, pi.newUrl);
          postTitleByWpId.set(pi.wpId, pi.title || '');
          idMap.set(pi.wpId, pi.newUrl);
          if (pi.oldUrl) urlMap.set(pi.oldUrl, pi.newUrl);
          activePriorByKey.set(`page:${pi.wpId}`, {
            newId: pi.newId,
            newUrl: pi.newUrl,
          });
        }
      } else if (pi.kind === 'menu') {
        if (activeMenuIds.has(pi.newId)) {
          activePriorByKey.set(`menu:${pi.wpId}`, {
            newId: pi.newId,
            newUrl: pi.newUrl,
          });
        }
      } else if (pi.kind === 'comment') {
        if (commentParentById.has(pi.newId)) {
          commentNewIdByWpId.set(pi.wpId, pi.newId);
          activePriorByKey.set(`comment:${pi.wpId}`, {
            newId: pi.newId,
            newUrl: pi.newUrl,
          });
        }
      }
    }

    const createSafeRedirects = async (paths: string[], toPath: string) => {
      if (!options.createRedirects) return;
      for (const rawFrom of paths) {
        let fromPath: string;
        try {
          fromPath = normalizeSitePath(rawFrom);
        } catch {
          continue;
        }
        if (fromPath === toPath || takenRedirectPaths.has(fromPath)) continue;
        // Never shadow an active page at `/slug`
        const slugCandidate = fromPath.startsWith('/') ? fromPath.slice(1) : fromPath;
        if (!slugCandidate.includes('/') && usedPageSlugs.has(slugCandidate)) {
          continue;
        }
        try {
          await db
            .insert(redirects)
            .values({
              siteId,
              fromPath,
              toPath,
              statusCode: 301,
            })
            .onConflictDoNothing();
          takenRedirectPaths.add(fromPath);
          report.redirectsCreated += 1;
        } catch {
          // ignore duplicate/invalid redirect
        }
      }
    };

    const resolveCreatedBy = (login?: string): string => {
      if (login && authorUserIdByLogin.has(login)) {
        return authorUserIdByLogin.get(login)!;
      }
      return access.userId;
    };

    let lastTitle = '';

    for (const item of batch) {
      lastTitle = item.title || item.wpId;
      let status: ImportItemStatus = 'done';
      let newId: string | null = null;
      let newUrl: string | null = null;
      let message: string | null = null;

      try {
        switch (item.kind as ImportItemKind) {
          case 'author': {
            if (!options.importAuthors) {
              status = 'skipped';
              message = 'Author import disabled';
              break;
            }
            const author = item.payload as unknown as WxrAuthor;
            const email = (
              author.email || `${slugifyImportValue(author.login || author.wpId)}@imported.local`
            ).toLowerCase();

            const existingId = userIdByEmail.get(email);
            if (existingId) {
              newId = existingId;
              newUrl = PAGES.DASHBOARD.USERS;
              if (author.login) authorUserIdByLogin.set(author.login, existingId);
              authorUserIdByLogin.set(email, existingId);
              message = `Matched existing user (${email})`;
            } else {
              const [createdUser] = await db
                .insert(users)
                .values({
                  name: (author.displayName || author.login || email).slice(0, 120),
                  email,
                  passwordHash: null,
                  emailVerified: false,
                  status: UserStatus.Inactive,
                  roleId: authorRoleId,
                })
                .returning({ id: users.id });
              newId = createdUser.id;
              newUrl = PAGES.DASHBOARD.USERS;
              userIdByEmail.set(email, createdUser.id);
              if (author.login) authorUserIdByLogin.set(author.login, createdUser.id);
              authorUserIdByLogin.set(email, createdUser.id);
              message = `Created inactive Author (${email})`;
            }
            break;
          }

          case 'category': {
            const term = item.payload as unknown as WxrTerm;
            const existingId = categoryIdBySlug.get(term.slug);
            const catUrl = `/blog/category/${term.slug}`;
            if (existingId) {
              newId = existingId;
              newUrl = catUrl;
              message = 'Matched existing category';
            } else {
              const parentId = term.parentSlug
                ? (categoryIdBySlug.get(term.parentSlug) ?? null)
                : null;
              const [createdCat] = await db
                .insert(categories)
                .values({
                  siteId,
                  name: term.name.slice(0, 100),
                  slug: term.slug.slice(0, 150),
                  description: term.description ?? null,
                  parentId,
                  language: 'en',
                  createdBy: access.userId,
                })
                .returning({ id: categories.id });
              newId = createdCat.id;
              newUrl = catUrl;
              categoryIdBySlug.set(term.slug, createdCat.id);
              await createSafeRedirects(
                buildTaxonomyRedirectPaths(term, catUrl),
                catUrl
              );
            }
            if (term.wpId) {
              termUrlByWpId.set(term.wpId, catUrl);
              termNameByWpId.set(term.wpId, term.name);
            }
            break;
          }

          case 'tag': {
            const term = item.payload as unknown as WxrTerm;
            const existingId = tagIdBySlug.get(term.slug);
            const tagUrl = `/blog/tag/${term.slug}`;
            if (existingId) {
              newId = existingId;
              newUrl = tagUrl;
              message = 'Matched existing tag';
            } else {
              const [createdTag] = await db
                .insert(tags)
                .values({
                  siteId,
                  name: term.name.slice(0, 100),
                  slug: term.slug.slice(0, 150),
                  language: 'en',
                  createdBy: access.userId,
                })
                .returning({ id: tags.id });
              newId = createdTag.id;
              newUrl = tagUrl;
              tagIdBySlug.set(term.slug, createdTag.id);
              await createSafeRedirects(
                buildTaxonomyRedirectPaths(term, tagUrl),
                tagUrl
              );
            }
            if (term.wpId) {
              termUrlByWpId.set(term.wpId, tagUrl);
              termNameByWpId.set(term.wpId, term.name);
            }
            break;
          }

          case 'attachment': {
            const prior = activePriorByKey.get(`attachment:${item.wpId}`);
            if (prior) {
              status = 'skipped';
              newId = prior.newId;
              newUrl = prior.newUrl;
              message = 'Already imported';
              break;
            }
            if (!options.downloadMedia) {
              status = 'skipped';
              message = 'Media downloads disabled';
              break;
            }
            const att = item.payload as unknown as WxrPost;
            const srcUrl = att.attachmentUrl || att.guid || att.link;
            if (!srcUrl) {
              status = 'failed';
              message = 'Attachment has no URL';
              break;
            }

            const res = await safeFetch(srcUrl, {
              signal: AbortSignal.timeout(15_000),
            });
            if (!res.ok) {
              throw new Error(`HTTP ${res.status} downloading ${srcUrl}`);
            }

            const maxBytes = env.MEDIA_MAX_UPLOAD_MB * 1024 * 1024;
            const contentLength = Number(res.headers.get('content-length') ?? 0);
            if (contentLength > maxBytes) {
              throw new Error(
                `Media exceeds ${env.MEDIA_MAX_UPLOAD_MB} MB limit`
              );
            }

            // Read as a stream and stop at the limit: a server that sends no
            // Content-Length must not be able to fill memory first.
            const arrBuf = await readCapped(res, maxBytes);
            if (!arrBuf) {
              throw new Error(
                `Media exceeds ${env.MEDIA_MAX_UPLOAD_MB} MB limit`
              );
            }

            const fname = filenameFromUrl(srcUrl, `${att.slug || 'file'}.bin`);
            const mime = inferMime(res.headers.get('content-type'), fname);
            if (!ALLOWED_MIME.includes(mime)) {
              throw new Error(`Unsupported MIME type: ${mime}`);
            }

            const altText = att.meta._wp_attachment_image_alt?.trim() || null;
            const fileObj = new File([new Uint8Array(arrBuf)], fname, {
              type: mime,
            });
            const uploaded = await mediaService.upload(
              fileObj,
              { folder: 'wp-import', alt: altText, siteId },
              access
            );

            if (att.title && att.title !== uploaded.title) {
              await db
                .update(media)
                .set({ title: att.title.slice(0, 255) })
                .where(eq(media.id, uploaded.id));
            }

            newId = uploaded.id;
            newUrl = uploaded.url;
            mediaByWpId.set(att.wpId, { id: uploaded.id, url: uploaded.url });
            urlMap.set(srcUrl, uploaded.url);
            if (att.guid && att.guid !== srcUrl) urlMap.set(att.guid, uploaded.url);
            activePriorByKey.set(`attachment:${item.wpId}`, {
              newId: uploaded.id,
              newUrl: uploaded.url,
            });
            break;
          }

          case 'post': {
            const prior = activePriorByKey.get(`post:${item.wpId}`);
            if (prior) {
              status = 'skipped';
              newId = prior.newId;
              newUrl = prior.newUrl;
              message = 'Already imported';
              break;
            }
            const wpPost = item.payload as unknown as WxrPost & {
              siteUrl?: string;
              siteTitle?: string;
            };
            const { slug, renamed } = resolveUniqueSlug(wpPost.slug, usedPostSlugs);
            const { status: mappedStatus, visibility } = mapWpStatus(
              wpPost.status,
              options.importAsDrafts
            );
            const dateVal = resolveWpDate(
              wpPost.postDateGmt,
              wpPost.postDate,
              wpPost.pubDate
            );
            const createdBy = resolveCreatedBy(wpPost.creatorLogin);
            const rewriteMaps: RewriteUrlMaps = {
              urlMap,
              idMap,
              oldSiteUrl: wpPost.siteUrl,
            };

            const thumbWpId = wpPost.meta._thumbnail_id;
            const featuredImage =
              thumbWpId && mediaByWpId.has(thumbWpId)
                ? mediaByWpId.get(thumbWpId)!.url
                : null;

            const rawElementor = wpPost.meta._elementor_data;
            let layout: 'template' | 'custom' = 'template';
            let bodyHtml = cleanWordPressHtml(wpPost.content, rewriteMaps);
            let canvas: unknown = null;

            if (rawElementor) {
              try {
                const parsedEl = parseElementorPayload(rawElementor);
                if (parsedEl.elements.length > 0) {
                  const conv = convertElementorToDocument(parsedEl.elements, {
                    pageTitle: wpPost.title,
                    urlMaps: rewriteMaps,
                  });
                  for (const w of conv.warnings) report.warnings.push(w);
                  if (conv.valid) {
                    layout = 'custom';
                    canvas = normalizeContent('builder', conv.document);
                    bodyHtml = conv.fallbackHtml || bodyHtml;
                  } else {
                    report.warnings.push(
                      `Elementor validation failed on post "${wpPost.title}" (${conv.issues[0]}); imported as rich text.`
                    );
                    bodyHtml = conv.fallbackHtml || bodyHtml;
                  }
                }
              } catch {
                report.warnings.push(
                  `Invalid Elementor data on post "${wpPost.title}"; imported HTML body.`
                );
              }
            }

            const excerpt = wpPost.excerpt
              ? stripTagsToPlain(cleanWordPressHtml(wpPost.excerpt, rewriteMaps))
              : null;

            const seo = extractSeoFromMeta(wpPost.meta, {
              title: wpPost.title,
              siteName: wpPost.siteTitle,
            });
            if (seo?.ogImage && urlMap.has(seo.ogImage)) {
              seo.ogImage = urlMap.get(seo.ogImage);
            }

            const catIds = wpPost.categories
              .map(s => categoryIdBySlug.get(s))
              .filter((v): v is string => Boolean(v));
            const tagIds = wpPost.tags
              .map(s => tagIdBySlug.get(s))
              .filter((v): v is string => Boolean(v));

            const created = await db.transaction(async tx => {
              const [row] = await tx
                .insert(posts)
                .values({
                  siteId,
                  title: wpPost.title.slice(0, 255),
                  slug,
                  excerpt,
                  featuredImage,
                  status: mappedStatus,
                  visibility,
                  layout,
                  language: 'en',
                  allowComments: true,
                  publishedAt:
                    mappedStatus === 'published' ? (dateVal ?? new Date()) : null,
                  scheduledAt: mappedStatus === 'scheduled' ? dateVal : null,
                  createdBy,
                })
                .returning();

              await tx.insert(postContents).values({
                postId: row.id,
                kind: 'draft',
                body: bodyHtml,
                canvas: canvas as object | null,
              });

              if (mappedStatus === 'published') {
                await tx.insert(postContents).values({
                  postId: row.id,
                  kind: 'published',
                  body: bodyHtml,
                  canvas: canvas as object | null,
                });
                await tx.insert(postRevisions).values({
                  postId: row.id,
                  kind: 'published',
                  title: row.title,
                  label: 'Imported from WordPress',
                  layout,
                  body: bodyHtml,
                  canvas: canvas as object | null,
                  authorId: createdBy,
                });
              }

              if (seo) {
                await tx.insert(postSeo).values({ postId: row.id, ...seo });
              }
              if (catIds.length) {
                await tx
                  .insert(postCategories)
                  .values(catIds.map(categoryId => ({ postId: row.id, categoryId })))
                  .onConflictDoNothing();
              }
              if (tagIds.length) {
                await tx
                  .insert(postTags)
                  .values(tagIds.map(tagId => ({ postId: row.id, tagId })))
                  .onConflictDoNothing();
              }

              return row;
            });

            if (mappedStatus === 'published') {
              await searchIndex.syncPost(created.id);
            }

            newId = created.id;
            newUrl = PAGES.SITE.post(created.slug, created.language);
            activePostIds.add(created.id);
            postUrlByWpId.set(wpPost.wpId, newUrl);
            postTitleByWpId.set(wpPost.wpId, created.title);
            postNewIdByWpId.set(wpPost.wpId, created.id);
            idMap.set(wpPost.wpId, newUrl);
            if (wpPost.link) urlMap.set(wpPost.link, newUrl);

            if (renamed) {
              report.renames.push({
                kind: 'post',
                wpId: wpPost.wpId,
                title: created.title,
                fromSlug: wpPost.slug,
                toSlug: created.slug,
                newId: created.id,
                newUrl,
              });
              message = `Slug conflict: renamed "${wpPost.slug}" → "${created.slug}"`;
            }

            await createSafeRedirects(
              buildWordPressRedirectPaths(wpPost, newUrl),
              newUrl
            );
            break;
          }

          case 'page': {
            const prior = activePriorByKey.get(`page:${item.wpId}`);
            if (prior) {
              status = 'skipped';
              newId = prior.newId;
              newUrl = prior.newUrl;
              message = 'Already imported';
              break;
            }
            const wpPage = item.payload as unknown as WxrPost & {
              siteUrl?: string;
              siteTitle?: string;
            };
            const { slug, renamed } = resolveUniqueSlug(wpPage.slug, usedPageSlugs);
            const { status: mappedStatus, visibility } = mapWpStatus(
              wpPage.status,
              options.importAsDrafts
            );
            const dateVal = resolveWpDate(
              wpPage.postDateGmt,
              wpPage.postDate,
              wpPage.pubDate
            );
            const createdBy = resolveCreatedBy(wpPage.creatorLogin);
            const rewriteMaps: RewriteUrlMaps = {
              urlMap,
              idMap,
              oldSiteUrl: wpPage.siteUrl,
            };

            let editorType: 'richtext' | 'builder' = 'richtext';
            let content: unknown = cleanWordPressHtml(wpPage.content, rewriteMaps);

            const rawElementor = wpPage.meta._elementor_data;
            if (rawElementor) {
              try {
                const parsedEl = parseElementorPayload(rawElementor);
                if (parsedEl.elements.length > 0) {
                  const conv = convertElementorToDocument(parsedEl.elements, {
                    pageTitle: wpPage.title,
                    urlMaps: rewriteMaps,
                  });
                  for (const w of conv.warnings) report.warnings.push(w);
                  if (conv.valid) {
                    editorType = 'builder';
                    content = normalizeContent('builder', conv.document);
                  } else {
                    report.warnings.push(
                      `Elementor validation failed on "${wpPage.title}" (${conv.issues[0]}); imported as rich text.`
                    );
                    editorType = 'richtext';
                    content =
                      conv.fallbackHtml ||
                      cleanWordPressHtml(wpPage.content, rewriteMaps);
                  }
                }
              } catch {
                report.warnings.push(
                  `Invalid Elementor data on page "${wpPage.title}"; imported as rich text.`
                );
              }
            }

            const seo = extractSeoFromMeta(wpPage.meta, {
              title: wpPage.title,
              siteName: wpPage.siteTitle,
            });
            if (seo?.ogImage && urlMap.has(seo.ogImage)) {
              seo.ogImage = urlMap.get(seo.ogImage);
            }

            const catIds = wpPage.categories
              .map(s => categoryIdBySlug.get(s))
              .filter((v): v is string => Boolean(v));
            const tagIds = wpPage.tags
              .map(s => tagIdBySlug.get(s))
              .filter((v): v is string => Boolean(v));

            const created = await db.transaction(async tx => {
              const [row] = await tx
                .insert(pages)
                .values({
                  siteId,
                  title: wpPage.title.slice(0, 255),
                  slug,
                  status: mappedStatus,
                  visibility,
                  editorType,
                  language: 'en',
                  publishedAt:
                    mappedStatus === 'published' ? (dateVal ?? new Date()) : null,
                  scheduledAt: mappedStatus === 'scheduled' ? dateVal : null,
                  createdBy,
                })
                .returning();

              await tx.insert(pageContents).values({
                pageId: row.id,
                kind: 'draft',
                content: content as object,
                version: 1,
              });

              if (mappedStatus === 'published') {
                await tx.insert(pageContents).values({
                  pageId: row.id,
                  kind: 'published',
                  content: content as object,
                  version: 1,
                });
                await tx.insert(pageRevisions).values({
                  pageId: row.id,
                  editorType,
                  kind: 'published',
                  title: row.title,
                  label: 'Imported from WordPress',
                  content: content as object,
                  authorId: createdBy,
                });
              }

              if (seo) {
                await tx.insert(seoMeta).values({ pageId: row.id, ...seo });
              }
              if (catIds.length) {
                await tx
                  .insert(pageCategories)
                  .values(catIds.map(categoryId => ({ pageId: row.id, categoryId })))
                  .onConflictDoNothing();
              }
              if (tagIds.length) {
                await tx
                  .insert(pageTags)
                  .values(tagIds.map(tagId => ({ pageId: row.id, tagId })))
                  .onConflictDoNothing();
              }

              return row;
            });

            if (mappedStatus === 'published') {
              await searchIndex.syncPage(created.id);
            }

            newId = created.id;
            newUrl = PAGES.SITE.page(created.slug, created.language, created.isHome);
            activePageIds.add(created.id);
            postUrlByWpId.set(wpPage.wpId, newUrl);
            postTitleByWpId.set(wpPage.wpId, created.title);
            idMap.set(wpPage.wpId, newUrl);
            if (wpPage.link) urlMap.set(wpPage.link, newUrl);

            if (renamed) {
              report.renames.push({
                kind: 'page',
                wpId: wpPage.wpId,
                title: created.title,
                fromSlug: wpPage.slug,
                toSlug: created.slug,
                newId: created.id,
                newUrl,
              });
              message = `Slug conflict: renamed "${wpPage.slug}" → "${created.slug}"`;
            }

            await createSafeRedirects(
              buildWordPressRedirectPaths(wpPage, newUrl),
              newUrl
            );
            break;
          }

          case 'template': {
            const tplPayload = item.payload as {
              title: string;
              elements: unknown[];
            };
            const conv = convertElementorToDocument(tplPayload.elements, {
              pageTitle: tplPayload.title,
            });
            for (const w of conv.warnings) report.warnings.push(w);
            if (!conv.valid) {
              throw new Error(
                `Elementor template validation failed: ${conv.issues[0]}`
              );
            }

            if (options.templateTarget === 'global_block') {
              const existingGlobals = await db
                .select({ name: globalBlocks.name })
                .from(globalBlocks)
                .where(eq(globalBlocks.siteId, siteId));
              const usedNames = new Set(
                existingGlobals.map(g => g.name.trim().toLowerCase())
              );
              let candidateName = tplPayload.title.trim() || 'Elementor Block';
              let suffix = 2;
              while (usedNames.has(candidateName.toLowerCase())) {
                candidateName = `${tplPayload.title.trim()} (${suffix})`;
                suffix += 1;
              }
              const puckData = normalizeContent('builder', conv.document) as {
                root?: { props?: Record<string, unknown> };
                content: never[];
                zones?: Record<string, never[]>;
              };
              const saved = await templatesService.saveGlobalBlock(
                {
                  name: candidateName,
                  category: 'Elementor Import',
                  content: puckData,
                },
                access
              );
              newId = saved.id;
              newUrl = PAGES.DASHBOARD.GLOBAL_BLOCK(saved.id);
            } else {
              const saved = await templatesService.saveTemplate(
                {
                  name: tplPayload.title.slice(0, 150),
                  category: 'Elementor Import',
                  editorType: 'builder',
                  content: conv.document,
                },
                access
              );
              newId = saved.id;
              newUrl = PAGES.DASHBOARD.TEMPLATE(saved.id);
            }
            break;
          }

          case 'menu': {
            const prior = activePriorByKey.get(`menu:${item.wpId}`);
            if (prior) {
              status = 'skipped';
              newId = prior.newId;
              newUrl = prior.newUrl;
              message = 'Already imported';
              break;
            }
            const menuPayload = item.payload as {
              menuSlug: string;
              menuTitle: string;
              items: WxrPost[];
            };
            const tree = buildMenuTree(menuPayload.items, {
              postUrlByWpId,
              termUrlByWpId,
              urlByOldUrl: urlMap,
              postTitleByWpId,
              termNameByWpId,
            });

            const preferred: MenuLocationType = menuPayload.menuSlug.includes('footer')
              ? 'footer'
              : menuPayload.menuSlug.includes('sidebar')
                ? 'sidebar'
                : 'header';
            const order: MenuLocationType[] = [
              preferred,
              ...(['header', 'footer', 'sidebar'] as MenuLocationType[]).filter(
                loc => loc !== preferred
              ),
            ];
            const chosenLocation = order.find(
              loc => !takenMenuLocations.has(`${loc}:en`)
            );

            if (!chosenLocation) {
              status = 'skipped';
              message =
                'All menu locations (header, footer, sidebar) already have menus assigned.';
              break;
            }

            const savedMenu = await menusService.saveMenu(
              {
                title: menuPayload.menuTitle.slice(0, 100),
                location: chosenLocation,
                language: 'en',
              },
              access.userId
            );
            takenMenuLocations.add(`${chosenLocation}:en`);
            await menusService.saveItems(savedMenu.id, tree, access.userId);
            newId = savedMenu.id;
            newUrl = PAGES.DASHBOARD.MENUS;
            activeMenuIds.add(savedMenu.id);
            break;
          }

          case 'comment': {
            if (!options.importComments) {
              status = 'skipped';
              message = 'Comment import disabled';
              break;
            }
            const prior = activePriorByKey.get(`comment:${item.wpId}`);
            if (prior) {
              status = 'skipped';
              newId = prior.newId;
              newUrl = prior.newUrl;
              message = 'Already imported';
              break;
            }
            const wpComment = item.payload as unknown as WxrComment;
            if (!wpComment.approved) {
              status = 'skipped';
              message = 'Unapproved comment skipped';
              break;
            }
            const targetPostId = postNewIdByWpId.get(wpComment.postWpId);
            if (!targetPostId) {
              status = 'skipped';
              message = 'Target post was not imported';
              break;
            }
            let parentId: string | null = null;
            if (wpComment.parentWpId && wpComment.parentWpId !== '0') {
              const mappedParent = commentNewIdByWpId.get(wpComment.parentWpId) ?? null;
              if (mappedParent) {
                // next-cms supports 1 level of replies: attach to top-level parent
                parentId = commentParentById.get(mappedParent) ?? mappedParent;
              }
            }

            const commentDate = resolveWpDate(wpComment.date) ?? new Date();
            const [createdComment] = await db
              .insert(comments)
              .values({
                siteId,
                postId: targetPostId,
                parentId,
                authorName: (wpComment.authorName || 'Anonymous').slice(0, 80),
                authorEmail: (
                  wpComment.authorEmail || 'imported@example.com'
                ).slice(0, 200),
                authorUrl: wpComment.authorUrl
                  ? wpComment.authorUrl.slice(0, 300)
                  : null,
                body: wpComment.content || '(empty)',
                status: 'approved',
                createdAt: commentDate,
              })
              .returning({ id: comments.id });

            newId = createdComment.id;
            newUrl = PAGES.DASHBOARD.COMMENTS;
            commentNewIdByWpId.set(wpComment.wpId, createdComment.id);
            commentParentById.set(createdComment.id, parentId);
            break;
          }

          default: {
            status = 'skipped';
            message = 'Skipped';
          }
        }
      } catch (err) {
        status = 'failed';
        message = err instanceof Error ? err.message : String(err);
      }

      await db
        .update(importItems)
        .set({
          status,
          newId,
          newUrl,
          message,
        })
        .where(eq(importItems.id, item.id));
    }

    // Recompute exact progress counts from import_items
    const allItems = await db
      .select({ status: importItems.status, kind: importItems.kind })
      .from(importItems)
      .where(eq(importItems.jobId, job.id));

    let pendingCount = 0;
    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    for (const row of allItems) {
      if (row.status === 'pending') pendingCount += 1;
      else if (row.status === 'done') importedCount += 1;
      else if (row.status === 'skipped') skippedCount += 1;
      else if (row.status === 'failed') failedCount += 1;
    }

    const processableTotal = allItems.filter(r => r.kind !== 'skipped').length;
    const processedCount = allItems.filter(
      r => r.kind !== 'skipped' && r.status !== 'pending'
    ).length;

    const nextProgress: ImportJobProgress = {
      processed: processedCount,
      total: processableTotal,
      imported: importedCount,
      skipped: skippedCount,
      failed: failedCount,
      currentItem: lastTitle,
    };

    const nextStatus = pendingCount === 0 ? 'done' : 'running';

    const [updatedJob] = await db
      .update(importJobs)
      .set({
        status: nextStatus,
        progress: nextProgress,
        report,
      })
      .where(eq(importJobs.id, job.id))
      .returning();

    if (nextStatus === 'done') {
      revalidatePublicSite();
    }

    return updatedJob;
  },

  getReport: async (jobId: string, access: UserAccess) => {
    const job = await importJobService.getJob(jobId, access);
    const rows = await db
      .select({
        kind: importItems.kind,
        wpId: importItems.wpId,
        wpSlug: importItems.wpSlug,
        title: importItems.title,
        status: importItems.status,
        newId: importItems.newId,
        newUrl: importItems.newUrl,
        oldUrl: importItems.oldUrl,
        message: importItems.message,
      })
      .from(importItems)
      .where(eq(importItems.jobId, job.id))
      .orderBy(asc(importItems.sortOrder));

    const entries: Array<
      ImportReportEntry & { dashboardUrl: string | null; oldUrl: string | null }
    > = rows.map(r => ({
      kind: r.kind as ImportItemKind,
      wpId: r.wpId,
      title: r.title || r.wpSlug || r.wpId,
      status: r.status as ImportItemStatus,
      newId: r.newId,
      newUrl: r.newUrl,
      oldUrl: r.oldUrl,
      message: r.message,
      dashboardUrl: dashboardUrlFor(r.kind as ImportItemKind, r.newId),
    }));

    return {
      job,
      entries,
    };
  },

  reportToCsv: (
    entries: Array<{
      kind: string;
      wpId: string;
      title: string;
      status: string;
      newId?: string | null;
      newUrl?: string | null;
      oldUrl?: string | null;
      message?: string | null;
    }>
  ): string => {
    const esc = (val: string | null | undefined) => {
      const s = val ?? '';
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = [
      'Kind',
      'WP ID',
      'Title',
      'Status',
      'New ID',
      'New URL',
      'Old URL',
      'Message',
    ].join(',');
    const lines = entries.map(e =>
      [
        esc(e.kind),
        esc(e.wpId),
        esc(e.title),
        esc(e.status),
        esc(e.newId),
        esc(e.newUrl),
        esc(e.oldUrl),
        esc(e.message),
      ].join(',')
    );
    return [header, ...lines].join('\n');
  },
};
