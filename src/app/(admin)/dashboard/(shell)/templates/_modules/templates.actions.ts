'use server';
import { and, asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { adminSiteId } from '@/server/services/site-context';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { templatesService } from '@/app/(admin)/dashboard/(shell)/templates/_modules/templates.service';
import { PAGES } from '@/config/pages';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import { globalBlocks, pageTemplates } from '@/db/schema';
import { EDITOR_TYPE } from '@/db/schemas/shared.schema';
import {
  accessProcedure,
  permissionProcedure,
} from '@/server/procedures/permission.procedure';

const blockItemSchema = z.object({
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()).and(z.object({ id: z.string() })),
});

/** Empty content is allowed on create only; service enforces non-empty on update. */
const globalBlockContentSchema = z.union([
  z.array(blockItemSchema),
  z.object({
    root: z
      .object({ props: z.record(z.string(), z.unknown()).optional() })
      .optional(),
    content: z.array(blockItemSchema),
    zones: z.record(z.string(), z.array(blockItemSchema)).optional(),
  }),
]);

export const listGlobalBlockOptions = permissionProcedure(
  PERMISSIONS.PAGES_EDIT
).query(async () => {
  const rows = await db
    .select({
      id: globalBlocks.id,
      name: globalBlocks.name,
      category: globalBlocks.category,
    })
    .from(globalBlocks)
    .orderBy(asc(globalBlocks.name));
  return rows.map(r =>
    r.category === 'contact-form'
      ? { ...r, name: `${r.name} (contact form)` }
      : r
  );
});

/**
 * Public read of a global block's sections. Used by the GlobalRef block's `resolveData`
 * in the editor and during public rendering. Reads published_content by default, or draft content when draft: true.
 */
export async function getGlobalBlockContent(
  id: string,
  options?: string | { siteId?: string; draft?: boolean }
) {
  if (typeof id !== 'string' || !id) return null;
  const siteId = typeof options === 'string' ? options : options?.siteId;
  const draft = typeof options === 'object' ? !!options?.draft : false;

  const conditions = [eq(globalBlocks.id, id)];
  if (siteId) {
    conditions.push(eq(globalBlocks.siteId, siteId));
  }
  const [row] = await db
    .select({
      id: globalBlocks.id,
      name: globalBlocks.name,
      content: globalBlocks.content,
      publishedContent: globalBlocks.publishedContent,
    })
    .from(globalBlocks)
    .where(and(...conditions))
    .limit(1);

  if (row) {
    const activeContent = draft
      ? row.content
      : (row.publishedContent ?? row.content);
    let blocks: unknown[] = [];
    let zones: Record<string, unknown[]> = {};

    if (Array.isArray(activeContent)) {
      blocks = activeContent;
    } else if (activeContent && typeof activeContent === 'object') {
      const obj = activeContent as {
        content?: unknown[];
        zones?: Record<string, unknown[]>;
      };
      blocks = Array.isArray(obj.content) ? obj.content : [];
      zones = obj.zones && typeof obj.zones === 'object' ? obj.zones : {};
    }

    return {
      id: row.id,
      name: row.name,
      content: activeContent,
      blocks,
      zones,
    };
  }

  // Fallback: check pageTemplates
  const [templateRow] = await db
    .select({
      id: pageTemplates.id,
      name: pageTemplates.name,
      content: pageTemplates.content,
    })
    .from(pageTemplates)
    .where(eq(pageTemplates.id, id))
    .limit(1);

  if (!templateRow) return null;

  let blocks: unknown[] = [];
  let zones: Record<string, unknown[]> = {};

  if (Array.isArray(templateRow.content)) {
    blocks = templateRow.content;
  } else if (templateRow.content && typeof templateRow.content === 'object') {
    const obj = templateRow.content as {
      content?: unknown[];
      zones?: Record<string, unknown[]>;
    };
    blocks = Array.isArray(obj.content) ? obj.content : [];
    zones = obj.zones && typeof obj.zones === 'object' ? obj.zones : {};
  }

  return {
    id: templateRow.id,
    name: templateRow.name,
    content: templateRow.content,
    blocks,
    zones,
  };
}

export const saveGlobalBlock = accessProcedure
  .input(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(150),
      category: z.string().trim().max(50).optional(),
      content: globalBlockContentSchema,
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await templatesService.saveGlobalBlock(
      input as never,
      ctx.access
    );
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    revalidatePath(PAGES.DASHBOARD.CONTACT_FORMS);
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    return row;
  });

export const publishGlobalBlock = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await templatesService.publishGlobalBlock(input.id, ctx.access);
    const siteId = await adminSiteId();
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    revalidatePath(PAGES.DASHBOARD.CONTACT_FORMS);
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    await revalidatePublicSite(siteId);
    return row;
  });

export const renameGlobalBlock = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(150),
      category: z.string().trim().max(50),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await templatesService.renameGlobalBlock(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    revalidatePath(PAGES.DASHBOARD.CONTACT_FORMS);
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    return row;
  });

export const deleteGlobalBlock = accessProcedure
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const row = await templatesService.deleteGlobalBlock(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    revalidatePath(PAGES.DASHBOARD.CONTACT_FORMS);
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    return row;
  });

export const saveTemplate = accessProcedure
  .input(
    z.object({
      name: z.string().trim().min(1).max(150),
      description: z.string().trim().max(500).nullish(),
      category: z.string().trim().max(50).optional(),
      editorType: z.enum(EDITOR_TYPE),
      content: z.unknown(),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await templatesService.saveTemplate(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    revalidatePath(PAGES.DASHBOARD.CONTACT_FORMS);
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    return row;
  });

export const deleteTemplate = accessProcedure
  .input(z.object({ id: z.string().min(1) }))
  .action(async ({ input, ctx }) => {
    const row = await templatesService.deleteTemplate(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    revalidatePath(PAGES.DASHBOARD.CONTACT_FORMS);
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    return row;
  });

export const updateTemplate = accessProcedure
  .input(
    z.object({
      id: z.string().min(1),
      content: z.unknown(),
      name: z.string().trim().min(1).max(150).optional(),
      description: z.string().trim().max(500).nullish(),
      category: z.string().trim().max(50).optional(),
    })
  )
  .action(async ({ input, ctx }) => {
    const row = await templatesService.updateTemplate(input, ctx.access);
    revalidatePath(PAGES.DASHBOARD.TEMPLATES);
    revalidatePath(PAGES.DASHBOARD.CONTACT_FORMS);
    revalidatePath(PAGES.DASHBOARD.HEADER_FOOTER);
    return row;
  });
