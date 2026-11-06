import 'server-only';
import { z } from 'zod';
import { and, desc, eq, isNull, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  collectionEntries,
  collectionFields,
  collections,
  collectionTemplates,
  pages,
  users,
  type CollectionEntryStatus,
  type CollectionFieldType,
} from '@/db/schema';
import { accessService } from '@/server/services/access.service';
import { searchIndex } from '@/server/services/search.service';
import { adminSiteId } from '@/server/services/site-context';
import { auditService } from './audit.service';
import { collectionTaxonomiesService } from './collection-taxonomies.service';
import { PERMISSIONS } from '@/config/permissions';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { revalidatePublicSite } from '@/lib/utils/revalidate-site';
import { sanitizeRichText } from '@/builder/sanitize';
import {
  entryTitle,
  normalizePostTypeSupports,
  type PostTypeSupports,
  POST_TYPE_PRESETS,
} from '@/config/post-types';
import type { SeoInput } from '@/db/validations/pages.validation';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slugs owned by the app or reserved for future use. */
export const RESERVED_COLLECTION_SLUGS = [
  'api',
  'dashboard',
  'login',
  'logout',
  'media',
  'sitemap.xml',
  'robots.txt',
  '_next',
  'blog',
];

function assertSlugValid(slug: string) {
  if (!slugRegex.test(slug)) {
    throw new ApplicationException(
      'Slug can only contain lowercase letters, numbers, and dashes.'
    );
  }
  if (RESERVED_COLLECTION_SLUGS.includes(slug)) {
    throw new ApplicationException(
      `The slug "${slug}" is reserved by the app. Pick another one.`
    );
  }
}

/** Throws unless the actor may create post types and edit their fields. */
async function assertCanManagePostTypes(actorId: string) {
  const access = await accessService.getUserAccess(actorId);
  if (
    !accessService.can(access, PERMISSIONS.POST_TYPES_MANAGE) &&
    !accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)
  ) {
    throw new ApplicationException(
      'You do not have permission to manage post types.'
    );
  }
}

/**
 * Normalises raw form values (strings from FormData) to the JSON shape each
 * field type stores: numbers, booleans, and omitted empty optional values.
 */
export function coerceEntryData(
  fields: typeof collectionFields.$inferSelect[],
  data: unknown
): Record<string, unknown> {
  const input = (data && typeof data === 'object' ? data : {}) as Record<
    string,
    unknown
  >;
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    let value = input[field.key];
    if (value === undefined || value === null) continue;
    if (field.type === 'boolean') {
      value = value === true || value === 'true' || value === 'on';
    } else if (typeof value === 'string') {
      const trimmed = field.type === 'richtext' ? value : value.trim();
      if (trimmed === '' || (field.type === 'richtext' && value === '<p></p>')) {
        continue;
      }
      value = field.type === 'number' ? Number(trimmed) : trimmed;
    }
    out[field.key] = value;
  }
  return out;
}

/** Builds a Zod object schema from collection field rows and parses entry data. */
export function buildEntrySchema(fields: typeof collectionFields.$inferSelect[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    const isRequired = field.required === true;
    let base: z.ZodTypeAny;

    switch (field.type) {
      case 'text':
      case 'richtext':
        base = z.string();
        break;
      case 'number':
        base = z
          .number()
          .refine(v => Number.isFinite(v), 'Must be a finite number.');
        break;
      case 'boolean':
        base = z.boolean();
        break;
      case 'date':
        base = z.string().datetime({ offset: true }).or(z.string().date());
        break;
      case 'select': {
        const config = field.config as { choices?: string[] } | undefined;
        const choices = Array.isArray(config?.choices) ? config.choices : [];
        base = choices.length
          ? z.enum(choices as [string, ...string[]])
          : z.string();
        break;
      }
      case 'media':
        base = z.string();
        break;
      case 'url':
        base = z
          .string()
          .refine(
            v => /^(https?:\/\/|mailto:|tel:|\/)/i.test(v),
            'Must be a URL starting with http(s)://, mailto:, tel: or /.'
          );
        break;
      case 'relation': {
        base = z.string();
        break;
      }
      default:
        base = z.unknown();
    }

    shape[field.key] = isRequired ? base : base.optional();
  }

  return z.object(shape).strip();
}

/** Parses entry data against the field schema. Returns { data, error }. */
export function parseEntryData(
  fields: typeof collectionFields.$inferSelect[],
  data: unknown
): { data: Record<string, unknown>; error: z.ZodError | null } {
  const schema = buildEntrySchema(fields);
  const result = schema.safeParse(coerceEntryData(fields, data));
  if (!result.success) {
    return { data: {}, error: result.error };
  }
  return { data: result.data as Record<string, unknown>, error: null };
}

/** Sanitized rich text for rendering. */
export function renderFieldValue(
  field: typeof collectionFields.$inferSelect,
  value: unknown
): string {
  if (value === undefined || value === null) return '';
  if (field.type === 'richtext') {
    return sanitizeRichText(String(value));
  }
  if (field.type === 'boolean') return String(!!value);
  if (field.type === 'date') return String(value);
  if (field.type === 'number') return String(value);
  return String(value);
}

export const collectionsService = {
  /** List active collections for the current site. */
  async list() {
    const siteId = await adminSiteId();
    return db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.siteId, siteId),
          isNull(collections.deletedAt),
          eq(collections.status, 'active')
        )
      )
      .orderBy(collections.name);
  },

  /** Get one collection by id. */
  async get(id: string, siteIdOverride?: string) {
    const siteId = siteIdOverride ?? (await adminSiteId());
    const [row] = await db
      .select()
      .from(collections)
      .where(
        and(eq(collections.id, id), eq(collections.siteId, siteId))
      )
      .limit(1);
    if (!row) throw new NotFoundException('Collection not found');
    return row;
  },

  /** Get one collection by slug. */
  async getBySlug(slug: string, siteIdOverride?: string) {
    let siteId = siteIdOverride;
    if (!siteId) {
      try {
        siteId = await adminSiteId();
      } catch {
        siteId = 'default';
      }
    }
    const [row] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.slug, slug),
          eq(collections.siteId, siteId),
          isNull(collections.deletedAt),
          eq(collections.status, 'active')
        )
      )
      .limit(1);
    if (!row) throw new NotFoundException('Collection not found');
    return row;
  },

  /** Find active collection by slug without throwing. */
  async findBySlug(slug: string, siteIdOverride?: string) {
    let siteId = siteIdOverride;
    if (!siteId) {
      try {
        siteId = await adminSiteId();
      } catch {
        siteId = 'default';
      }
    }
    const [row] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.slug, slug),
          eq(collections.siteId, siteId),
          isNull(collections.deletedAt),
          eq(collections.status, 'active')
        )
      )
      .limit(1);
    return row ?? null;
  },

  /**
   * A post type for the dashboard by its slug, or by its id for old links.
   * Archived types are included so they can still be managed.
   */
  async findForAdmin(slugOrId: string) {
    if (!slugOrId) return null;
    const siteId = await adminSiteId();
    const base = and(eq(collections.siteId, siteId), isNull(collections.deletedAt));
    const [bySlug] = await db
      .select()
      .from(collections)
      .where(and(base, eq(collections.slug, slugOrId)))
      .limit(1);
    if (bySlug) return { collection: bySlug, matchedBy: 'slug' as const };
    const [byId] = await db
      .select()
      .from(collections)
      .where(and(base, eq(collections.id, slugOrId)))
      .limit(1);
    return byId ? { collection: byId, matchedBy: 'id' as const } : null;
  },

  /** Find active collection linked to a template page. */
  async findByTemplatePageId(templatePageId: string, siteIdOverride?: string) {
    const siteId = siteIdOverride ?? (await adminSiteId());
    const [row] = await db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.templatePageId, templatePageId),
          eq(collections.siteId, siteId),
          isNull(collections.deletedAt),
          eq(collections.status, 'active')
        )
      )
      .limit(1);
    return row ?? null;
  },

  /** Get the latest published entry for a collection. */
  async getLatestPublishedEntry(collectionId: string, siteIdOverride?: string) {
    const siteId = siteIdOverride ?? (await adminSiteId());
    const [entry] = await db
      .select()
      .from(collectionEntries)
      .where(
        and(
          eq(collectionEntries.collectionId, collectionId),
          eq(collectionEntries.siteId, siteId),
          eq(collectionEntries.status, 'published'),
          isNull(collectionEntries.deletedAt)
        )
      )
      .orderBy(desc(collectionEntries.publishedAt), desc(collectionEntries.createdAt))
      .limit(1);

    if (!entry) return null;
    const collection = await this.get(collectionId, siteId);
    const fields = await this.getFields(collectionId);
    return {
      ...entry,
      collection: { ...collection, fields },
    };
  },

  /** Get the latest entry or a mock entry for previewing a collection template. */
  async getPreviewEntryForCollection(collectionId: string) {
    const [entry] = await db
      .select()
      .from(collectionEntries)
      .where(
        and(
          eq(collectionEntries.collectionId, collectionId),
          isNull(collectionEntries.deletedAt)
        )
      )
      .orderBy(desc(collectionEntries.createdAt))
      .limit(1);

    const collection = await this.get(collectionId);
    const fields = await this.getFields(collectionId);

    if (entry) {
      return {
        ...entry,
        collection: { ...collection, fields },
      };
    }

    // Fallback: construct mock preview entry if no entries exist yet
    const mockData: Record<string, unknown> = {};
    for (const f of fields) {
      mockData[f.key] = `Sample ${f.label}`;
    }
    return {
      id: 'preview-entry',
      siteId: collection.siteId,
      collectionId: collection.id,
      slug: 'sample-entry',
      status: 'published',
      data: mockData,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      collection: { ...collection, fields },
    };
  },

  /** Get fields for a collection, ordered by position. */
  async getFields(collectionId: string) {
    return db
      .select()
      .from(collectionFields)
      .where(eq(collectionFields.collectionId, collectionId))
      .orderBy(collectionFields.position);
  },

  /** Create a collection. Requires post_types.manage. */
  async create(
    input: {
      name: string;
      slug: string;
      singularName?: string | null;
      icon?: string | null;
      description?: string | null;
      templatePageId?: string | null;
    },
    actorId: string
  ) {
    await assertCanManagePostTypes(actorId);

    const siteId = await adminSiteId();
    assertSlugValid(input.slug);

    const [existing] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.slug, input.slug),
          eq(collections.siteId, siteId),
          isNull(collections.deletedAt)
        )
      )
      .limit(1);
    if (existing) {
      throw new ApplicationException(
        `A post type with slug "${input.slug}" already exists.`
      );
    }

    const [row] = await db
      .insert(collections)
      .values({
        siteId,
        name: input.name,
        slug: input.slug,
        singularName: input.singularName || null,
        icon: input.icon || null,
        description: input.description || null,
        templatePageId: input.templatePageId ?? null,
      })
      .returning();

    await auditService.log({
      actorId,
      action: 'create',
      targetType: 'collection',
      targetId: row.id,
      targetName: input.name,
    });
    return row;
  },

  /** Update a collection's name/slug/template. Requires post_types.manage. */
  async update(
    id: string,
    input: {
      name?: string;
      slug?: string;
      singularName?: string | null;
      icon?: string | null;
      description?: string | null;
      templatePageId?: string | null;
      supports?: Partial<PostTypeSupports>;
    },
    actorId: string
  ) {
    await assertCanManagePostTypes(actorId);

    const collection = await this.get(id);
    const siteId = await adminSiteId();

    if (input.slug && input.slug !== collection.slug) {
      assertSlugValid(input.slug);
      const [existing] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.slug, input.slug),
            eq(collections.siteId, siteId),
            isNull(collections.deletedAt),
            ne(collections.id, id)
          )
        )
        .limit(1);
      if (existing) {
        throw new ApplicationException(
          `A post type with slug "${input.slug}" already exists.`
        );
      }
    }

    const [row] = await db
      .update(collections)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.singularName !== undefined
          ? { singularName: input.singularName || null }
          : {}),
        ...(input.icon !== undefined ? { icon: input.icon || null } : {}),
        ...(input.description !== undefined
          ? { description: input.description || null }
          : {}),
        ...(input.templatePageId !== undefined
          ? { templatePageId: input.templatePageId }
          : {}),
        ...(input.supports !== undefined
          ? {
              supports: normalizePostTypeSupports({
                ...collection.supports,
                ...input.supports,
              }),
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(collections.id, id))
      .returning();

    await auditService.log({
      actorId,
      action: 'update',
      targetType: 'collection',
      targetId: id,
      targetName: collection.name,
    });
    return row;
  },

  /** Soft-delete a collection. Requires post_types.manage. */
  async delete(id: string, actorId: string) {
    await assertCanManagePostTypes(actorId);

    const collection = await this.get(id);
    await db
      .update(collections)
      .set({ status: 'archived', deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(collections.id, id));

    await auditService.log({
      actorId,
      action: 'delete',
      targetType: 'collection',
      targetId: id,
      targetName: collection.name,
    });
  },

  /** Add a field to a collection. Requires post_types.manage. */
  async addField(
    collectionId: string,
    input: {
      key: string;
      label: string;
      type: CollectionFieldType;
      required?: boolean;
      config?: Record<string, unknown>;
    },
    actorId: string
  ) {
    await assertCanManagePostTypes(actorId);

    const siteId = await adminSiteId();
    const [collection] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(eq(collections.id, collectionId), eq(collections.siteId, siteId))
      )
      .limit(1);
    if (!collection) throw new NotFoundException('Collection not found');

    const [existing] = await db
      .select({ id: collectionFields.id })
      .from(collectionFields)
      .where(
        and(
          eq(collectionFields.collectionId, collectionId),
          eq(collectionFields.key, input.key)
        )
      )
      .limit(1);
    if (existing) {
      throw new ApplicationException(
        `A field with key "${input.key}" already exists.`
      );
    }

    const [maxPos] = await db
      .select({ position: collectionFields.position })
      .from(collectionFields)
      .where(eq(collectionFields.collectionId, collectionId))
      .orderBy(desc(collectionFields.position))
      .limit(1);

    const [row] = await db
      .insert(collectionFields)
      .values({
        collectionId,
        key: input.key,
        label: input.label,
        type: input.type,
        required: input.required ?? false,
        position: (maxPos?.position ?? -1) + 1,
        config: input.config ?? {},
      })
      .returning();

    await auditService.log({
      actorId,
      action: 'create',
      targetType: 'collection_field',
      targetId: row.id,
      targetName: input.label,
    });
    return row;
  },

  /** Update a field. Requires post_types.manage. */
  async updateField(
    fieldId: string,
    input: { label?: string; type?: CollectionFieldType; required?: boolean; config?: Record<string, unknown>; position?: number },
    actorId: string
  ) {
    await assertCanManagePostTypes(actorId);

    const siteId = await adminSiteId();
    const [field] = await db
      .select()
      .from(collectionFields)
      .innerJoin(collections, eq(collections.id, collectionFields.collectionId))
      .where(and(eq(collectionFields.id, fieldId), eq(collections.siteId, siteId)))
      .limit(1);
    if (!field) throw new NotFoundException('Field not found');

    const [row] = await db
      .update(collectionFields)
      .set({
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.required !== undefined ? { required: input.required } : {}),
        ...(input.config !== undefined ? { config: input.config } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        updatedAt: new Date(),
      })
      .where(eq(collectionFields.id, fieldId))
      .returning();

    await auditService.log({
      actorId,
      action: 'update',
      targetType: 'collection_field',
      targetId: fieldId,
      targetName: (field as any).label,
    });
    return row;
  },

  /** Delete a field. Does not rewrite existing entry JSON. Requires post_types.manage. */
  async deleteField(fieldId: string, actorId: string) {
    await assertCanManagePostTypes(actorId);

    const siteId = await adminSiteId();
    const owned = await db
      .select({ id: collectionFields.id })
      .from(collectionFields)
      .innerJoin(collections, eq(collections.id, collectionFields.collectionId))
      .where(and(eq(collectionFields.id, fieldId), eq(collections.siteId, siteId)))
      .limit(1);
    if (!owned[0]) throw new NotFoundException('Field not found');
    let fieldLabel: string | undefined;
    const fl = await db.select().from(collectionFields).where(eq(collectionFields.id, fieldId)).limit(1);
    fieldLabel = (fl[0] as any)?.label;

    await db
      .delete(collectionFields)
      .where(eq(collectionFields.id, fieldId));

    await auditService.log({
      actorId,
      action: 'delete',
      targetType: 'collection_field',
      targetId: fieldId,
      targetName: fieldLabel,
    });
  },

  /** List entries for a collection. */
  async listEntries(collectionId: string) {
    const siteId = await adminSiteId();
    return db
      .select()
      .from(collectionEntries)
      .where(
        and(
          eq(collectionEntries.collectionId, collectionId),
          eq(collectionEntries.siteId, siteId),
          isNull(collectionEntries.deletedAt)
        )
      )
      .orderBy(desc(collectionEntries.updatedAt));
  },

  /** Get one entry by id. */
  async getEntry(id: string) {
    const siteId = await adminSiteId();
    const [row] = await db
      .select()
      .from(collectionEntries)
      .where(
        and(eq(collectionEntries.id, id), eq(collectionEntries.siteId, siteId))
      )
      .limit(1);
    if (!row) throw new NotFoundException('Entry not found');
    return row;
  },

  /** Get a published entry by collection slug and entry slug. */
  async getPublishedEntry(
    collectionSlug: string,
    entrySlug: string,
    siteIdOverride?: string
  ) {
    const siteId = siteIdOverride ?? (await adminSiteId());
    const [row] = await db
      .select()
      .from(collectionEntries)
      .innerJoin(collections, eq(collectionEntries.collectionId, collections.id))
      .where(
        and(
          eq(collections.slug, collectionSlug),
          eq(collectionEntries.slug, entrySlug),
          eq(collectionEntries.siteId, siteId),
          eq(collectionEntries.status, 'published'),
          isNull(collectionEntries.deletedAt),
          isNull(collections.deletedAt),
          eq(collections.status, 'active')
        )
      )
      .limit(1);
    if (!row) throw new NotFoundException('Entry not found');
    const fields = await this.getFields(row.collections.id);
    return {
      ...row.collection_entries,
      collection: { ...row.collections, fields },
    };
  },

  /**
   * Get a published entry by matching either the collection slug or the template page slug.
   */
  async getPublishedEntryByAnySlug(
    collectionOrPageSlug: string,
    entrySlug: string,
    siteIdOverride?: string
  ) {
    const siteId = siteIdOverride ?? (await adminSiteId());

    // 1. First attempt: match by collection slug
    try {
      return await this.getPublishedEntry(collectionOrPageSlug, entrySlug, siteId);
    } catch {
      // Continue to template page match
    }

    // 2. Second attempt: match by template page slug
    const [matchedPage] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(
        and(
          eq(pages.slug, collectionOrPageSlug),
          eq(pages.siteId, siteId),
          isNull(pages.deletedAt)
        )
      )
      .limit(1);

    if (matchedPage) {
      const [col] = await db
        .select()
        .from(collections)
        .where(
          and(
            eq(collections.templatePageId, matchedPage.id),
            eq(collections.siteId, siteId),
            isNull(collections.deletedAt),
            eq(collections.status, 'active')
          )
        )
        .limit(1);

      if (col) {
        return this.getPublishedEntry(col.slug, entrySlug, siteId);
      }
    }

    throw new NotFoundException('Entry not found');
  },

  /** Create an entry (draft). Requires pages.create. */
  async createEntry(
    collectionId: string,
    input: {
      slug?: string;
      data?: Record<string, unknown>;
      excerpt?: string | null;
      featuredImage?: string | null;
      status?: CollectionEntryStatus;
      visibility?: 'public' | 'private';
      scheduledAt?: Date | string | null;
      layout?: 'template' | 'custom';
      templateId?: string | null;
      canvas?: unknown;
      draftCanvas?: unknown;
      seo?: SeoInput | null;
      terms?: Record<string, string[]>;
    },
    actorId: string
  ) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.PAGES_CREATE)) {
      throw new ApplicationException(
        'You do not have permission to create entries.'
      );
    }

    const siteId = await adminSiteId();
    const [collection] = await db
      .select()
      .from(collections)
      .where(
        and(eq(collections.id, collectionId), eq(collections.siteId, siteId))
      )
      .limit(1);
    if (!collection) throw new NotFoundException('Collection not found');

    const supports = normalizePostTypeSupports(collection.supports);
    const fields = await this.getFields(collectionId);
    const { data, error } = parseEntryData(fields, input.data ?? {});
    if (error) {
      throw new ApplicationException(`Invalid entry data: ${error.message}`);
    }

    const rawSlug = input.slug?.trim() || entryTitle(data, fields) || 'entry';
    let targetSlug =
      rawSlug
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 190) || 'entry';

    let suffix = 1;
    const baseSlug = targetSlug;
    while (true) {
      const [existing] = await db
        .select({ id: collectionEntries.id })
        .from(collectionEntries)
        .where(
          and(
            eq(collectionEntries.collectionId, collectionId),
            eq(collectionEntries.slug, targetSlug),
            isNull(collectionEntries.deletedAt)
          )
        )
        .limit(1);
      if (!existing) break;
      targetSlug = `${baseSlug}-${suffix++}`;
    }

    const now = new Date();
    let status: CollectionEntryStatus = 'draft';
    let publishedAt: Date | null = null;
    let scheduledAt: Date | null = null;

    if (supports.status && input.status) {
      status = input.status;
      if (status === 'published') {
        publishedAt = now;
        scheduledAt = null;
      } else if (status === 'scheduled') {
        if (!input.scheduledAt) {
          throw new ApplicationException(
            'A scheduled date and time is required.'
          );
        }
        scheduledAt = new Date(input.scheduledAt);
      }
    }

    const [row] = await db
      .insert(collectionEntries)
      .values({
        siteId,
        collectionId,
        slug: targetSlug,
        status,
        data,
        publishedAt,
        scheduledAt,
        authorId: supports.author ? actorId : null,
        excerpt: supports.excerpt ? (input.excerpt ?? null) : null,
        featuredImage: supports.featuredImage
          ? (input.featuredImage ?? null)
          : null,
        visibility:
          supports.status && input.visibility ? input.visibility : 'public',
        layout:
          supports.template && input.layout ? input.layout : 'template',
        templateId:
          supports.template && input.templateId ? input.templateId : null,
        canvas:
          supports.template && input.canvas ? (input.canvas as any) : null,
        draftCanvas:
          supports.template && input.draftCanvas
            ? (input.draftCanvas as any)
            : null,
        seo: supports.seo && input.seo ? input.seo : null,
      })
      .returning();

    if (supports.taxonomies && input.terms) {
      await collectionTaxonomiesService.syncEntryTerms(row.id, input.terms);
    }

    await auditService.log({
      actorId,
      action: 'create',
      targetType: 'collection_entry',
      targetId: row.id,
      targetName: row.slug,
    });

    if (row.status === 'published') {
      try {
        await searchIndex.syncCollectionEntry(row.id);
      } catch (err) {
        console.error('Failed to sync collection entry search document:', err);
      }
    }

    return row;
  },

  /** Update an entry. Requires pages.edit. */
  async updateEntry(
    id: string,
    input: {
      slug?: string;
      data?: Record<string, unknown>;
      excerpt?: string | null;
      featuredImage?: string | null;
      status?: CollectionEntryStatus;
      visibility?: 'public' | 'private';
      scheduledAt?: Date | string | null;
      layout?: 'template' | 'custom';
      templateId?: string | null;
      canvas?: unknown;
      draftCanvas?: unknown;
      seo?: SeoInput | null;
      terms?: Record<string, string[]>;
    },
    actorId: string
  ) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
      throw new ApplicationException(
        'You do not have permission to edit entries.'
      );
    }

    const entry = await this.getEntry(id);
    const collection = await this.get(entry.collectionId);
    const supports = normalizePostTypeSupports(collection.supports);
    const fields = await this.getFields(entry.collectionId);

    const values: Record<string, unknown> = { updatedAt: new Date() };

    if (input.slug !== undefined) {
      const normalizedSlug = input.slug
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 190);
      if (!normalizedSlug) {
        throw new ApplicationException('Slug cannot be empty.');
      }
      const [clash] = await db
        .select({ id: collectionEntries.id })
        .from(collectionEntries)
        .where(
          and(
            eq(collectionEntries.collectionId, entry.collectionId),
            eq(collectionEntries.slug, normalizedSlug),
            isNull(collectionEntries.deletedAt),
            ne(collectionEntries.id, id)
          )
        )
        .limit(1);
      if (clash) {
        throw new ApplicationException(
          `An entry with slug "${normalizedSlug}" already exists.`
        );
      }
      values.slug = normalizedSlug;
    }

    if (input.data !== undefined) {
      const { data, error } = parseEntryData(fields, input.data);
      if (error) {
        throw new ApplicationException(`Invalid entry data: ${error.message}`);
      }
      values.data = data;
    }

    if (supports.excerpt && input.excerpt !== undefined) {
      values.excerpt = input.excerpt;
    }
    if (supports.featuredImage && input.featuredImage !== undefined) {
      values.featuredImage = input.featuredImage;
    }
    if (supports.seo && input.seo !== undefined) {
      values.seo = input.seo;
    }
    if (supports.template) {
      if (input.layout !== undefined) values.layout = input.layout;
      if (input.templateId !== undefined) values.templateId = input.templateId;
      if (input.canvas !== undefined) values.canvas = input.canvas;
      if (input.draftCanvas !== undefined) values.draftCanvas = input.draftCanvas;
    }
    if (supports.status) {
      if (input.visibility !== undefined) values.visibility = input.visibility;
      if (input.scheduledAt !== undefined) {
        values.scheduledAt = input.scheduledAt
          ? new Date(input.scheduledAt)
          : null;
      }
      if (input.status !== undefined) {
        values.status = input.status;
        if (input.status === 'published') {
          values.publishedAt = entry.publishedAt ?? new Date();
          values.scheduledAt = null;
        } else if (input.status === 'scheduled') {
          if (!input.scheduledAt && !entry.scheduledAt) {
            throw new ApplicationException(
              'A scheduled date and time is required.'
            );
          }
        }
      }
    }

    const [row] = await db
      .update(collectionEntries)
      .set(values)
      .where(eq(collectionEntries.id, id))
      .returning();

    if (supports.taxonomies && input.terms) {
      await collectionTaxonomiesService.syncEntryTerms(id, input.terms);
    }

    await auditService.log({
      actorId,
      action: 'update',
      targetType: 'collection_entry',
      targetId: id,
      targetName: row.slug,
    });

    try {
      await searchIndex.syncCollectionEntry(id);
    } catch (err) {
      console.error('Failed to sync collection entry search document:', err);
    }

    return row;
  },

  /** Publish an entry. Requires pages.publish. */
  async publishEntry(id: string, actorId: string) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.PAGES_PUBLISH)) {
      throw new ApplicationException(
        'You do not have permission to publish entries.'
      );
    }

    const entry = await this.getEntry(id);
    if (entry.status === 'published') {
      return entry;
    }

    const [row] = await db
      .update(collectionEntries)
      .set({
        status: 'published',
        publishedAt: entry.publishedAt ?? new Date(),
        scheduledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(collectionEntries.id, id))
      .returning();

    await auditService.log({
      actorId,
      action: 'publish',
      targetType: 'collection_entry',
      targetId: id,
      targetName: entry.slug,
    });
    try {
      await searchIndex.syncCollectionEntry(id);
    } catch (err) {
      console.error('Failed to sync collection entry search document:', err);
    }
    return row;
  },

  /** Unpublish an entry. Requires pages.publish. */
  async unpublishEntry(id: string, actorId: string) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.PAGES_PUBLISH)) {
      throw new ApplicationException(
        'You do not have permission to publish entries.'
      );
    }

    const entry = await this.getEntry(id);
    if (entry.status === 'draft') {
      return entry;
    }

    const [row] = await db
      .update(collectionEntries)
      .set({
        status: 'draft',
        publishedAt: null,
        scheduledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(collectionEntries.id, id))
      .returning();

    await auditService.log({
      actorId,
      action: 'unpublish',
      targetType: 'collection_entry',
      targetId: id,
      targetName: entry.slug,
    });
    await searchIndex.removeCollectionEntry(id);
    return row;
  },

  /** Delete an entry. Requires pages.edit. */
  async deleteEntry(id: string, actorId: string) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
      throw new ApplicationException(
        'You do not have permission to delete entries.'
      );
    }

    const entry = await this.getEntry(id);
    await db
      .update(collectionEntries)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(collectionEntries.id, id));

    await auditService.log({
      actorId,
      action: 'delete',
      targetType: 'collection_entry',
      targetId: id,
      targetName: entry.slug,
    });
    await searchIndex.removeCollectionEntry(id);
  },

  /** Get one entry by id with author, template, and assigned taxonomy terms. */
  async getEntryWithDetails(id: string) {
    const siteId = await adminSiteId();
    const [row] = await db
      .select({
        entry: collectionEntries,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        template: {
          id: collectionTemplates.id,
          name: collectionTemplates.name,
        },
      })
      .from(collectionEntries)
      .leftJoin(users, eq(collectionEntries.authorId, users.id))
      .leftJoin(
        collectionTemplates,
        eq(collectionEntries.templateId, collectionTemplates.id)
      )
      .where(
        and(eq(collectionEntries.id, id), eq(collectionEntries.siteId, siteId))
      )
      .limit(1);

    if (!row) throw new NotFoundException('Entry not found');
    const terms = await collectionTaxonomiesService.getEntryTerms(id);
    return {
      ...row.entry,
      author: row.author?.id ? row.author : null,
      template: row.template?.id ? row.template : null,
      terms,
    };
  },

  /** Publishes every scheduled collection entry whose time has come. Safe to call repeatedly. */
  async publishDueScheduledEntries() {
    const due = await db
      .select({
        id: collectionEntries.id,
        slug: collectionEntries.slug,
        authorId: collectionEntries.authorId,
        scheduledAt: collectionEntries.scheduledAt,
      })
      .from(collectionEntries)
      .where(
        and(
          eq(collectionEntries.status, 'scheduled'),
          lte(collectionEntries.scheduledAt, new Date()),
          isNull(collectionEntries.deletedAt)
        )
      );

    for (const entry of due) {
      try {
        await db
          .update(collectionEntries)
          .set({
            status: 'published',
            publishedAt: entry.scheduledAt ?? new Date(),
            scheduledAt: null,
            updatedAt: new Date(),
          })
          .where(eq(collectionEntries.id, entry.id));

        await auditService.log({
          actorId: entry.authorId,
          action: 'publish',
          targetType: 'collection_entry',
          targetId: entry.id,
          targetName: entry.slug,
          details: 'Scheduled publish',
        });

        try {
          await searchIndex.syncCollectionEntry(entry.id);
        } catch (err) {
          console.error(
            '[collections.publishDueScheduledEntries] search sync failed',
            err
          );
        }
      } catch (error) {
        console.error(
          '[collections.publishDueScheduledEntries] failed for',
          entry.id,
          error
        );
      }
    }

    if (due.length > 0) {
      revalidatePublicSite();
    }
    return due.map(e => e.id);
  },

  /** Creates a post type and its fields from a ready-made preset. */
  async createFromPreset(presetId: string, actorId: string) {
    const preset = POST_TYPE_PRESETS.find(p => p.id === presetId);
    if (!preset) throw new NotFoundException('Preset not found');
    await assertCanManagePostTypes(actorId);

    // Pick a free slug so a second "Team" install doesn't fail.
    const siteId = await adminSiteId();
    let slug = preset.slug;
    for (let i = 2; ; i++) {
      const [taken] = await db
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.slug, slug),
            eq(collections.siteId, siteId),
            isNull(collections.deletedAt)
          )
        )
        .limit(1);
      if (!taken) break;
      slug = `${preset.slug}-${i}`;
    }

    const collection = await this.create(
      {
        name: preset.name,
        singularName: preset.singularName,
        slug,
        icon: preset.icon,
        description: preset.description,
      },
      actorId
    );
    for (const field of preset.fields) {
      await this.addField(collection.id, field, actorId);
    }
    return collection;
  },

  /** Entry choices for a relation field pointing at `collectionId`. */
  async listEntryOptions(collectionId: string) {
    const [rows, fields] = await Promise.all([
      this.listEntries(collectionId),
      this.getFields(collectionId),
    ]);
    return rows.map(r => ({
      id: r.id,
      label: entryTitle(r.data, fields) || r.slug,
    }));
  },
};
