import 'server-only';
import { z } from 'zod';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  collectionEntries,
  collectionFields,
  collections,
  type CollectionEntryStatus,
  type CollectionFieldType,
} from '@/db/schema';
import { accessService } from '@/server/services/access.service';
import { adminSiteId } from '@/server/services/site-context';
import { auditService } from './audit.service';
import { PERMISSIONS } from '@/config/permissions';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { sanitizeRichText } from '@/builder/sanitize';

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
        base = z.enum(choices as [string, ...string[]]);
        break;
      }
      case 'media':
        base = z.string();
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
  const result = schema.safeParse(data ?? {});
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
  async get(id: string) {
    const siteId = await adminSiteId();
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
  async getBySlug(slug: string) {
    const siteId = await adminSiteId();
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

  /** Get fields for a collection, ordered by position. */
  async getFields(collectionId: string) {
    return db
      .select()
      .from(collectionFields)
      .where(eq(collectionFields.collectionId, collectionId))
      .orderBy(collectionFields.position);
  },

  /** Create a collection. Requires settings.manage. */
  async create(
    input: { name: string; slug: string; templatePageId?: string | null },
    actorId: string
  ) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)) {
      throw new ApplicationException(
        'You do not have permission to manage collections.'
      );
    }

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
        `A collection with slug "${input.slug}" already exists.`
      );
    }

    const [row] = await db
      .insert(collections)
      .values({
        siteId,
        name: input.name,
        slug: input.slug,
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

  /** Update a collection's name/slug/template. Requires settings.manage. */
  async update(
    id: string,
    input: { name?: string; slug?: string; templatePageId?: string | null },
    actorId: string
  ) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)) {
      throw new ApplicationException(
        'You do not have permission to manage collections.'
      );
    }

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
          `A collection with slug "${input.slug}" already exists.`
        );
      }
    }

    const [row] = await db
      .update(collections)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.templatePageId !== undefined
          ? { templatePageId: input.templatePageId }
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

  /** Soft-delete a collection. Requires settings.manage. */
  async delete(id: string, actorId: string) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)) {
      throw new ApplicationException(
        'You do not have permission to manage collections.'
      );
    }

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

  /** Add a field to a collection. Requires settings.manage. */
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
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)) {
      throw new ApplicationException(
        'You do not have permission to manage collections.'
      );
    }

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

  /** Update a field. Requires settings.manage. */
  async updateField(
    fieldId: string,
    input: { label?: string; type?: CollectionFieldType; required?: boolean; config?: Record<string, unknown>; position?: number },
    actorId: string
  ) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)) {
      throw new ApplicationException(
        'You do not have permission to manage collections.'
      );
    }

    const [field] = await db
      .select()
      .from(collectionFields)
      .where(eq(collectionFields.id, fieldId))
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
      targetName: field.label,
    });
    return row;
  },

  /** Delete a field. Does not rewrite existing entry JSON. Requires settings.manage. */
  async deleteField(fieldId: string, actorId: string) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.SETTINGS_MANAGE)) {
      throw new ApplicationException(
        'You do not have permission to manage collections.'
      );
    }

    const [field] = await db
      .select({ collectionId: collectionFields.collectionId, label: collectionFields.label })
      .from(collectionFields)
      .where(eq(collectionFields.id, fieldId))
      .limit(1);
    if (!field) throw new NotFoundException('Field not found');

    await db
      .delete(collectionFields)
      .where(eq(collectionFields.id, fieldId));

    await auditService.log({
      actorId,
      action: 'delete',
      targetType: 'collection_field',
      targetId: fieldId,
      targetName: field.label,
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
  async getPublishedEntry(collectionSlug: string, entrySlug: string) {
    const siteId = await adminSiteId();
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

  /** Create an entry (draft). Requires pages.create. */
  async createEntry(
    collectionId: string,
    input: { slug: string; data: Record<string, unknown> },
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

    const fields = await this.getFields(collectionId);
    const { data, error } = parseEntryData(fields, input.data);
    if (error) {
      throw new ApplicationException(`Invalid entry data: ${error.message}`);
    }

    const [existing] = await db
      .select({ id: collectionEntries.id })
      .from(collectionEntries)
      .where(
        and(
          eq(collectionEntries.collectionId, collectionId),
          eq(collectionEntries.slug, input.slug),
          isNull(collectionEntries.deletedAt)
        )
      )
      .limit(1);
    if (existing) {
      throw new ApplicationException(
        `An entry with slug "${input.slug}" already exists.`
      );
    }

    const [row] = await db
      .insert(collectionEntries)
      .values({
        siteId,
        collectionId,
        slug: input.slug,
        status: 'draft',
        data,
      })
      .returning();

    await auditService.log({
      actorId,
      action: 'create',
      targetType: 'collection_entry',
      targetId: row.id,
      targetName: input.slug,
    });
    return row;
  },

  /** Update an entry (stays draft). Requires pages.edit. */
  async updateEntry(
    id: string,
    input: { slug?: string; data?: Record<string, unknown> },
    actorId: string
  ) {
    const access = await accessService.getUserAccess(actorId);
    if (!accessService.can(access, PERMISSIONS.PAGES_EDIT)) {
      throw new ApplicationException(
        'You do not have permission to edit entries.'
      );
    }

    const entry = await this.getEntry(id);
    const fields = await this.getFields(entry.collectionId);

    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (input.slug !== undefined) values.slug = input.slug;
    if (input.data !== undefined) {
      const { data, error } = parseEntryData(fields, input.data);
      if (error) {
        throw new ApplicationException(`Invalid entry data: ${error.message}`);
      }
      values.data = data;
    }

    const [row] = await db
      .update(collectionEntries)
      .set(values)
      .where(eq(collectionEntries.id, id))
      .returning();

    await auditService.log({
      actorId,
      action: 'update',
      targetType: 'collection_entry',
      targetId: id,
      targetName: entry.slug,
    });
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
        publishedAt: new Date(),
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
  },
};
