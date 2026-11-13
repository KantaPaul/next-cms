import 'server-only';
import {
  type BreakpointConfig,
  compileStyleClasses,
  DEFAULT_BREAKPOINTS,
  STYLE_CLASS_CSS_VERSION,
  type StyleClass,
} from '@nextcms/builder-core';
import { createId } from '@paralleldrive/cuid2';
import { and, asc, eq } from 'drizzle-orm';
import { revalidateTag, unstable_cache } from 'next/cache';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  collectionBlocks,
  collectionTemplates,
  globalBlocks,
  loopTemplates,
  pageContents,
  pages,
  pageTemplates,
  postTemplates,
  siteSettings,
  styleClasses,
} from '@/db/schema';
import {
  type StyleClassCreateRequest,
  type StyleClassPatch,
  styleClassPatchSchema,
  styleClassSchema,
} from '@/schemas/style-classes.schema';
import { normalizeBuilderSettings } from '@/config/builder-settings';
import { requirePermission } from './require-permission';
import {
  collectClassUsage,
  comboBaseProblem,
  countClassUsage,
  inUseMessage,
  styleClassesTag,
  styleClassWriteError,
} from './style-classes.rules';

export type { StyleClass } from '@nextcms/builder-core';
export { styleClassesTag } from './style-classes.rules';

export type StyleClassUsage = {
  entryId: string;
  kind:
    | 'page'
    | 'global-block'
    | 'page-template'
    | 'post-template'
    | 'collection-template'
    | 'collection-block'
    | 'loop-template';
  title: string;
  nodeIds: string[];
};

type StyleClassRow = typeof styleClasses.$inferSelect;

function toStyleClass(row: StyleClassRow): StyleClass {
  const iso = (value: Date | null) => (value ?? row.createdAt).toISOString();
  return {
    id: row.id,
    siteId: row.siteId,
    name: row.name,
    kind: row.kind === 'tag' ? 'tag' : 'class',
    tag: row.tag ?? undefined,
    comboOf: row.comboOf ?? undefined,
    variants: row.variants ?? {},
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

/* ---------- Permissions ---------- */

/** Reading classes is needed to apply them, so page editors can read. */
async function requireRead() {
  const result = await requirePermission(PERMISSIONS.PAGES_EDIT);
  if (result.allowed) return result;
  const design = await requirePermission(PERMISSIONS.DESIGN_MANAGE);
  if (!design.allowed) throw new Error('You do not have access to style classes.');
  return design;
}

/** Creating, changing and deleting classes restyles the whole site. */
async function requireWrite() {
  const result = await requirePermission(PERMISSIONS.DESIGN_MANAGE);
  if (!result.allowed) throw new Error('Design permission required to change style classes.');
  return result;
}

/* ---------- Feature switch ---------- */

/**
 * Whether style classes are on for a site (`builder_settings.styleClasses`,
 * off by default). Public: rendering calls it. Cached with the class CSS and
 * cleared by the same tag when the setting changes.
 */
export async function styleClassesEnabled(siteId: string): Promise<boolean> {
  return unstable_cache(
    async () => {
      const row = await db
        .select({ builderSettings: siteSettings.builderSettings })
        .from(siteSettings)
        .where(eq(siteSettings.siteId, siteId))
        .limit(1);
      return normalizeBuilderSettings(row[0]?.builderSettings).styleClasses;
    },
    ['style-classes-enabled', siteId],
    { tags: [styleClassesTag(siteId)] }
  )();
}

const DISABLED_MESSAGE = 'Style classes are turned off for this site. Turn them on in Settings → Blocks.';

async function requireEnabled(siteId: string) {
  if (!(await styleClassesEnabled(siteId))) throw new Error(DISABLED_MESSAGE);
}

/* ---------- CSS ---------- */

/** Breakpoints for a site, falling back to the defaults (the compiler normalizes them). */
async function siteBreakpoints(siteId: string): Promise<BreakpointConfig> {
  const row = await db
    .select({ breakpoints: siteSettings.breakpoints })
    .from(siteSettings)
    .where(eq(siteSettings.siteId, siteId))
    .limit(1);
  const raw = row[0]?.breakpoints;
  return Array.isArray(raw) ? (raw as BreakpointConfig) : DEFAULT_BREAKPOINTS;
}

async function rowsForSite(siteId: string): Promise<StyleClassRow[]> {
  return db
    .select()
    .from(styleClasses)
    .where(eq(styleClasses.siteId, siteId))
    .orderBy(asc(styleClasses.name));
}

/**
 * Compiled CSS for a site: every class (editor canvas) or only `usedIds`
 * (published page). Public: the site layout calls it without a session.
 * Cached per site and invalidated by `styleClassesTag(siteId)`.
 */
export async function cssForSite(siteId: string, usedIds?: Set<string>): Promise<string> {
  if (!(await styleClassesEnabled(siteId))) return '';
  const usedKey = usedIds ? JSON.stringify([...usedIds].sort()) : 'all';
  return unstable_cache(
    async () => {
      const [breakpoints, rows] = await Promise.all([siteBreakpoints(siteId), rowsForSite(siteId)]);
      return compileStyleClasses({
        classes: rows.map(toStyleClass),
        usedClassIds: usedIds,
        breakpoints,
      });
    },
    ['style-classes-css', String(STYLE_CLASS_CSS_VERSION), siteId, usedKey],
    { tags: [styleClassesTag(siteId)] }
  )();
}

export type StyleClassesForRender = {
  /** Class id → name, for the classes the page uses (resolves `classIds` to `c-<name>`). */
  classes: Record<string, { name: string }>;
  /** Compiled CSS for those classes. */
  css: string;
};

/**
 * Names and CSS for the classes a rendered page uses. Public: called while
 * rendering the site, without a session. Cached per site and set of ids.
 */
export async function classesForRender(
  siteId: string,
  usedIds: Set<string>
): Promise<StyleClassesForRender> {
  if (usedIds.size === 0 || !(await styleClassesEnabled(siteId))) return { classes: {}, css: '' };
  const usedKey = JSON.stringify([...usedIds].sort());
  return unstable_cache(
    async (): Promise<StyleClassesForRender> => {
      const [breakpoints, rows] = await Promise.all([siteBreakpoints(siteId), rowsForSite(siteId)]);
      const all = rows.map(toStyleClass);
      const classes: Record<string, { name: string }> = {};
      for (const cls of all) if (usedIds.has(cls.id)) classes[cls.id] = { name: cls.name };
      const css = compileStyleClasses({ classes: all, usedClassIds: usedIds, breakpoints });
      return { classes, css };
    },
    ['style-classes-render', String(STYLE_CLASS_CSS_VERSION), siteId, usedKey],
    { tags: [styleClassesTag(siteId)] }
  )();
}

/** Drops cached class CSS for a site. Call after class or breakpoint changes. */
export function revalidateStyleClassCss(siteId: string) {
  try {
    revalidateTag(styleClassesTag(siteId), 'max');
  } catch {
    /* outside a request or action (scripts, tests) */
  }
}

/* ---------- Reads ---------- */

async function findRow(siteId: string, id: string): Promise<StyleClassRow | undefined> {
  const rows = await db
    .select()
    .from(styleClasses)
    .where(and(eq(styleClasses.id, id), eq(styleClasses.siteId, siteId)))
    .limit(1);
  return rows[0];
}

export async function list(siteId: string): Promise<StyleClass[]> {
  await requireRead();
  return (await rowsForSite(siteId)).map(toStyleClass);
}

export async function get(siteId: string, id: string): Promise<StyleClass | undefined> {
  await requireRead();
  const row = await findRow(siteId, id);
  return row ? toStyleClass(row) : undefined;
}

/* ---------- Writes ---------- */

export async function create(siteId: string, input: StyleClassCreateRequest): Promise<StyleClass> {
  await requireWrite();
  await requireEnabled(siteId);
  const data = styleClassSchema.parse(input);

  if (data.comboOf) {
    const problem = comboBaseProblem(await findRow(siteId, data.comboOf), siteId);
    if (problem) throw new Error(problem);
  }
  if (data.kind === 'tag') {
    const existing = await db
      .select({ id: styleClasses.id })
      .from(styleClasses)
      .where(
        and(
          eq(styleClasses.siteId, siteId),
          eq(styleClasses.kind, 'tag'),
          eq(styleClasses.tag, data.tag as string)
        )
      )
      .limit(1);
    if (existing[0]) throw new Error(`The <${data.tag}> tag already has a style on this site.`);
  }

  try {
    const [row] = await db
      .insert(styleClasses)
      .values({
        id: createId(),
        siteId,
        name: data.name,
        kind: data.kind,
        tag: data.kind === 'tag' ? (data.tag ?? null) : null,
        comboOf: data.comboOf ?? null,
        variants: data.variants,
      })
      .returning();
    revalidateStyleClassCss(siteId);
    return toStyleClass(row);
  } catch (error) {
    throw styleClassWriteError(error, data.name);
  }
}

/** Changes a class's name or variants. Kind, tag and combo base are fixed after creation. */
export async function update(siteId: string, id: string, patch: StyleClassPatch): Promise<StyleClass> {
  await requireWrite();
  await requireEnabled(siteId);
  const data = styleClassPatchSchema.parse(patch);
  try {
    const [row] = await db
      .update(styleClasses)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(styleClasses.id, id), eq(styleClasses.siteId, siteId)))
      .returning();
    if (!row) throw new Error('Class not found on this site.');
    revalidateStyleClassCss(siteId);
    return toStyleClass(row);
  } catch (error) {
    throw styleClassWriteError(error, data.name);
  }
}

/** Renames a class. Nodes reference ids, so no document changes. */
export async function rename(siteId: string, id: string, name: string): Promise<StyleClass> {
  return update(siteId, id, { name });
}

/**
 * Copies a class (and its combo base) under a new name. A tag can only be
 * styled once, so duplicating a tag style creates a plain class with its styles.
 */
export async function duplicate(siteId: string, id: string, name: string): Promise<StyleClass> {
  await requireWrite();
  const existing = await findRow(siteId, id);
  if (!existing) throw new Error('Class not found on this site.');
  return create(siteId, {
    name,
    kind: 'class',
    comboOf: existing.kind === 'tag' ? undefined : (existing.comboOf ?? undefined),
    variants: existing.variants ?? {},
  });
}

/**
 * Deletes a class. Refused while elements or combo classes use it, unless
 * `force`. Combos are deleted with their base (database cascade); element
 * references become dangling ids, which the renderer ignores.
 */
export async function remove(siteId: string, id: string, opts: { force?: boolean } = {}): Promise<void> {
  await requireWrite();
  const row = await findRow(siteId, id);
  if (!row) throw new Error('Class not found on this site.');

  if (!opts.force) {
    const [used, combos] = await Promise.all([
      usageFor(siteId, id),
      db
        .select({ id: styleClasses.id })
        .from(styleClasses)
        .where(and(eq(styleClasses.siteId, siteId), eq(styleClasses.comboOf, id))),
    ]);
    const elementCount = used.reduce((sum, hit) => sum + hit.nodeIds.length, 0);
    const message = inUseMessage(elementCount, combos.length);
    if (message) throw new Error(message);
  }

  await db.delete(styleClasses).where(and(eq(styleClasses.id, id), eq(styleClasses.siteId, siteId)));
  revalidateStyleClassCss(siteId);
}

/* ---------- Usage ---------- */

type ContentRow = { id: string; title: string; content: unknown };

function hitsFrom(rows: ContentRow[], kind: StyleClassUsage['kind'], classId: string): StyleClassUsage[] {
  const byEntry = new Map<string, StyleClassUsage>();
  for (const row of rows) {
    const nodeIds = collectClassUsage(row.content, classId);
    if (!nodeIds.length) continue;
    const hit = byEntry.get(row.id);
    if (hit) {
      hit.nodeIds = [...new Set([...hit.nodeIds, ...nodeIds])].sort();
    } else {
      byEntry.set(row.id, { entryId: row.id, kind, title: row.title, nodeIds });
    }
  }
  return [...byEntry.values()];
}

type ContentGroup = { kind: StyleClassUsage['kind']; rows: ContentRow[] };

/** Every stored builder document of a site, by kind. Draft and published page content are both included. */
async function contentForSite(siteId: string): Promise<ContentGroup[]> {
  const [pageRows, blockRows, pageTemplateRows, postTemplateRows, collectionTemplateRows, collectionBlockRows, loopRows] =
    await Promise.all([
      db
        .select({ id: pages.id, title: pages.title, content: pageContents.content })
        .from(pageContents)
        .innerJoin(pages, eq(pageContents.pageId, pages.id))
        .where(eq(pages.siteId, siteId)),
      db
        .select({ id: globalBlocks.id, title: globalBlocks.name, content: globalBlocks.content })
        .from(globalBlocks)
        .where(eq(globalBlocks.siteId, siteId)),
      db
        .select({ id: pageTemplates.id, title: pageTemplates.name, content: pageTemplates.content })
        .from(pageTemplates)
        .where(eq(pageTemplates.siteId, siteId)),
      db
        .select({ id: postTemplates.id, title: postTemplates.name, content: postTemplates.content })
        .from(postTemplates)
        .where(eq(postTemplates.siteId, siteId)),
      db
        .select({ id: collectionTemplates.id, title: collectionTemplates.name, content: collectionTemplates.content })
        .from(collectionTemplates)
        .where(eq(collectionTemplates.siteId, siteId)),
      db
        .select({ id: collectionBlocks.id, title: collectionBlocks.name, content: collectionBlocks.content })
        .from(collectionBlocks)
        .where(eq(collectionBlocks.siteId, siteId)),
      db
        .select({ id: loopTemplates.id, title: loopTemplates.name, content: loopTemplates.content })
        .from(loopTemplates)
        .where(eq(loopTemplates.siteId, siteId)),
    ]);
  return [
    { kind: 'page', rows: pageRows },
    { kind: 'global-block', rows: blockRows },
    { kind: 'page-template', rows: pageTemplateRows },
    { kind: 'post-template', rows: postTemplateRows },
    { kind: 'collection-template', rows: collectionTemplateRows },
    { kind: 'collection-block', rows: collectionBlockRows },
    { kind: 'loop-template', rows: loopRows },
  ];
}

/** Where a class is used, across every table that stores builder documents. No permission check. */
async function usageFor(siteId: string, classId: string): Promise<StyleClassUsage[]> {
  const groups = await contentForSite(siteId);
  return groups.flatMap(group => hitsFrom(group.rows, group.kind, classId));
}

/**
 * How many elements use each class across the site, from one scan of all
 * content (for the Classes manager's counts, sorting and clean-up). Classes
 * with no entry are unused.
 */
export async function usageCounts(siteId: string): Promise<Record<string, number>> {
  await requireRead();
  const groups = await contentForSite(siteId);
  return countClassUsage(groups.flatMap(group => group.rows.map(row => ({ id: row.id, content: row.content }))));
}

export async function usage(siteId: string, classId: string): Promise<StyleClassUsage[]> {
  await requireRead();
  return usageFor(siteId, classId);
}

export const styleClassesService = {
  list,
  get,
  create,
  update,
  rename,
  duplicate,
  remove,
  usage,
  usageCounts,
  styleClassesEnabled,
  cssForSite,
  classesForRender,
  revalidateStyleClassCss,
};
