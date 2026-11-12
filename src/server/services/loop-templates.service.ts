import 'server-only';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { PERMISSIONS } from '@/config/permissions';
import { db } from '@/db';
import {
  collections,
  externalApis,
  loopTemplates,
  type LoopTemplateSource,
} from '@/db/schema';
import { NotFoundException, ApplicationException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import {
  accessService,
  type UserAccess,
} from '@/server/services/access.service';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';

/** Puck-shaped builder content, as stored for global blocks. */
export type LoopTemplateContent = {
  root?: { props?: Record<string, unknown> };
  content: unknown[];
  zones?: Record<string, unknown[]>;
};

export const EMPTY_LOOP_TEMPLATE_CONTENT: LoopTemplateContent = {
  root: { props: {} },
  content: [],
  zones: {},
};

function normalize(content: unknown): LoopTemplateContent {
  if (Array.isArray(content)) return { root: { props: {} }, content, zones: {} };
  if (content && typeof content === 'object') {
    const obj = content as Partial<LoopTemplateContent>;
    return {
      root: obj.root ?? { props: {} },
      content: Array.isArray(obj.content) ? obj.content : [],
      zones: obj.zones && typeof obj.zones === 'object' ? obj.zones : {},
    };
  }
  return { ...EMPTY_LOOP_TEMPLATE_CONTENT };
}

const where = async (id: string) =>
  and(
    eq(loopTemplates.id, id),
    eq(loopTemplates.siteId, await adminSiteId()),
    isNull(loopTemplates.deletedAt)
  );

export const loopTemplatesService = {
  normalize,

  async list(filter?: {
    sourceType?: LoopTemplateSource;
    collectionId?: string | null;
    externalApiId?: string | null;
  }) {
    const conds = [
      eq(loopTemplates.siteId, await adminSiteId()),
      isNull(loopTemplates.deletedAt),
    ];
    if (filter?.sourceType) {
      conds.push(eq(loopTemplates.sourceType, filter.sourceType));
    }
    if (filter?.sourceType === 'collection' && filter.collectionId) {
      conds.push(eq(loopTemplates.collectionId, filter.collectionId));
    }
    if (filter?.sourceType === 'external-api' && filter.externalApiId) {
      conds.push(eq(loopTemplates.externalApiId, filter.externalApiId));
    }
    return db
      .select({
        id: loopTemplates.id,
        name: loopTemplates.name,
        sourceType: loopTemplates.sourceType,
        collectionId: loopTemplates.collectionId,
        collectionName: collections.name,
        externalApiId: loopTemplates.externalApiId,
        externalApiName: externalApis.name,
        publishedAt: loopTemplates.publishedAt,
        updatedAt: loopTemplates.updatedAt,
        createdAt: loopTemplates.createdAt,
      })
      .from(loopTemplates)
      .leftJoin(collections, eq(collections.id, loopTemplates.collectionId))
      .leftJoin(externalApis, eq(externalApis.id, loopTemplates.externalApiId))
      .where(and(...conds))
      .orderBy(desc(loopTemplates.updatedAt), asc(loopTemplates.name));
  },

  async get(id: string) {
    const [row] = await db.select().from(loopTemplates).where(await where(id));
    return row ?? null;
  },

  /**
   * Content used to render a Loop Grid: the published version, or the draft
   * when `draft` is set (editor canvas) or nothing was published yet.
   */
  async getRenderContent(
    id: string,
    options: { siteId?: string; draft?: boolean } = {}
  ) {
    if (!id) return null;
    const conds = [eq(loopTemplates.id, id), isNull(loopTemplates.deletedAt)];
    if (options.siteId) conds.push(eq(loopTemplates.siteId, options.siteId));
    const [row] = await db
      .select({
        id: loopTemplates.id,
        name: loopTemplates.name,
        sourceType: loopTemplates.sourceType,
        externalApiId: loopTemplates.externalApiId,
        content: loopTemplates.content,
        publishedContent: loopTemplates.publishedContent,
      })
      .from(loopTemplates)
      .where(and(...conds))
      .limit(1);
    if (!row) return null;
    const active = options.draft
      ? row.content
      : (row.publishedContent ?? row.content);
    return {
      id: row.id,
      name: row.name,
      sourceType: row.sourceType,
      externalApiId: row.externalApiId,
      content: normalize(active),
    };
  },

  async create(
    input: {
      name: string;
      sourceType: LoopTemplateSource;
      collectionId?: string | null;
      externalApiId?: string | null;
      content?: unknown;
    },
    access: UserAccess
  ) {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_EDIT);
    if (input.sourceType === 'collection' && !input.collectionId) {
      throw new ApplicationException('Choose a post type for this template.');
    }
    if (input.sourceType === 'external-api' && !input.externalApiId) {
      throw new ApplicationException('Choose an External API for this template.');
    }
    const [row] = await db
      .insert(loopTemplates)
      .values({
        siteId: await adminSiteId(),
        name: input.name.trim() || 'Loop item',
        sourceType: input.sourceType,
        collectionId:
          input.sourceType === 'collection' ? (input.collectionId ?? null) : null,
        externalApiId:
          input.sourceType === 'external-api'
            ? (input.externalApiId ?? null)
            : null,
        content: normalize(input.content ?? EMPTY_LOOP_TEMPLATE_CONTENT),
      })
      .returning();
    await auditService.log({
      actorId: access.userId,
      action: 'create',
      targetType: 'loop_template',
      targetId: row.id,
      targetName: row.name,
    });
    return row;
  },

  async update(
    input: {
      id: string;
      name?: string;
      content?: unknown;
    },
    access: UserAccess
  ) {
    await accessService.assertPermission(access.userId, PERMISSIONS.PAGES_EDIT);
    const [row] = await db
      .update(loopTemplates)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.content !== undefined
          ? { content: normalize(input.content) }
          : {}),
      })
      .where(await where(input.id))
      .returning();
    if (!row) throw new NotFoundException('Loop template not found');
    return row;
  },

  async publish(id: string, access: UserAccess) {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_PUBLISH
    );
    const existing = await loopTemplatesService.get(id);
    if (!existing) throw new NotFoundException('Loop template not found');
    const [row] = await db
      .update(loopTemplates)
      .set({ publishedContent: existing.content, publishedAt: new Date() })
      .where(await where(id))
      .returning();
    await auditService.log({
      actorId: access.userId,
      action: 'publish',
      targetType: 'loop_template',
      targetId: row.id,
      targetName: row.name,
    });
    await revalidatePublicSite(row.siteId);
    return row;
  },

  async duplicate(id: string, access: UserAccess) {
    const existing = await loopTemplatesService.get(id);
    if (!existing) throw new NotFoundException('Loop template not found');
    return loopTemplatesService.create(
      {
        name: `${existing.name} (copy)`,
        sourceType: existing.sourceType,
        collectionId: existing.collectionId,
        externalApiId: existing.externalApiId,
        content: existing.content,
      },
      access
    );
  },

  async delete(id: string, access: UserAccess) {
    await accessService.assertPermission(
      access.userId,
      PERMISSIONS.PAGES_DELETE
    );
    const [row] = await db
      .update(loopTemplates)
      .set({ deletedAt: new Date() })
      .where(await where(id))
      .returning();
    if (!row) throw new NotFoundException('Loop template not found');
    await auditService.log({
      actorId: access.userId,
      action: 'delete',
      targetType: 'loop_template',
      targetId: id,
      targetName: row.name,
    });
    await revalidatePublicSite(row.siteId);
    return row;
  },
};

export type LoopTemplateListItem = Awaited<
  ReturnType<typeof loopTemplatesService.list>
>[number];
