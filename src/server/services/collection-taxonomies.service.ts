import 'server-only';
import { and, asc, count, eq, ilike, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  collectionTaxonomies,
  collectionTerms,
  collectionEntryTerms,
  collections,
} from '@/db/schema';
import { ApplicationException, NotFoundException } from '@/lib/utils/error';
import { auditService } from '@/server/services/audit.service';
import { adminSiteId } from '@/server/services/site-context';

export type CollectionTermNode = {
  id: string;
  taxonomyId: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  position: number;
  count: number;
  depth: number;
};

export type TaxonomyInput = {
  id?: string;
  collectionId: string;
  key: string;
  name: string;
  singularName?: string | null;
  hierarchical?: boolean;
  position?: number;
};

export type TermInput = {
  id?: string;
  taxonomyId: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  position?: number;
};

const slugRegex = /^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/;

export const collectionTaxonomiesService = {
  listTaxonomies: async (collectionId: string) => {
    const siteId = await adminSiteId();
    return db
      .select()
      .from(collectionTaxonomies)
      .where(
        and(
          eq(collectionTaxonomies.collectionId, collectionId),
          eq(collectionTaxonomies.siteId, siteId),
          isNull(collectionTaxonomies.deletedAt)
        )
      )
      .orderBy(asc(collectionTaxonomies.position), asc(collectionTaxonomies.name));
  },

  getTaxonomy: async (id: string) => {
    const siteId = await adminSiteId();
    const [row] = await db
      .select()
      .from(collectionTaxonomies)
      .where(
        and(
          eq(collectionTaxonomies.id, id),
          eq(collectionTaxonomies.siteId, siteId),
          isNull(collectionTaxonomies.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  getTaxonomyByKey: async (
    collectionId: string,
    key: string,
    siteIdOverride?: string
  ) => {
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
      .from(collectionTaxonomies)
      .where(
        and(
          eq(collectionTaxonomies.collectionId, collectionId),
          eq(collectionTaxonomies.key, key),
          eq(collectionTaxonomies.siteId, siteId),
          isNull(collectionTaxonomies.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  saveTaxonomy: async (input: TaxonomyInput, userId: string) => {
    const { id, ...values } = input;
    const siteId = await adminSiteId();

    const normalizedKey = values.key.trim().toLowerCase();
    if (!slugRegex.test(normalizedKey)) {
      throw new ApplicationException(
        'Taxonomy key can only contain lowercase letters, numbers, and dashes.'
      );
    }

    const normalizedName = values.name.trim();
    if (!normalizedName) {
      throw new ApplicationException('Taxonomy name is required.');
    }

    // Check name clash (case-insensitive) within collection
    const [nameClash] = await db
      .select({ id: collectionTaxonomies.id })
      .from(collectionTaxonomies)
      .where(
        and(
          eq(collectionTaxonomies.siteId, siteId),
          eq(collectionTaxonomies.collectionId, values.collectionId),
          sql`lower(trim(${collectionTaxonomies.name})) = lower(${normalizedName})`,
          isNull(collectionTaxonomies.deletedAt),
          id ? ne(collectionTaxonomies.id, id) : undefined
        )
      )
      .limit(1);

    if (nameClash) {
      throw new ApplicationException(
        `A taxonomy named "${normalizedName}" already exists for this post type.`
      );
    }

    // Check key clash within collection
    const [clash] = await db
      .select({ id: collectionTaxonomies.id })
      .from(collectionTaxonomies)
      .where(
        and(
          eq(collectionTaxonomies.siteId, siteId),
          eq(collectionTaxonomies.collectionId, values.collectionId),
          eq(collectionTaxonomies.key, normalizedKey),
          isNull(collectionTaxonomies.deletedAt),
          id ? ne(collectionTaxonomies.id, id) : undefined
        )
      )
      .limit(1);

    if (clash) {
      throw new ApplicationException(
        `A taxonomy with key "${normalizedKey}" already exists for this post type.`
      );
    }

    const payload = {
      ...values,
      key: normalizedKey,
      siteId,
      updatedAt: new Date(),
    };

    const [row] = id
      ? await db
          .update(collectionTaxonomies)
          .set(payload)
          .where(
            and(
              eq(collectionTaxonomies.id, id),
              eq(collectionTaxonomies.siteId, siteId)
            )
          )
          .returning()
      : await db
          .insert(collectionTaxonomies)
          .values({
            ...payload,
            position: values.position ?? 0,
          })
          .returning();

    if (!row) throw new NotFoundException('Taxonomy not found');
    await auditService.log({
      actorId: userId,
      action: id ? 'update' : 'create',
      targetType: 'taxonomy',
      targetId: row.id,
      targetName: `Taxonomy: ${row.name}`,
    });
    return row;
  },

  deleteTaxonomy: async (id: string, userId: string) => {
    const siteId = await adminSiteId();
    const [row] = await db
      .delete(collectionTaxonomies)
      .where(
        and(
          eq(collectionTaxonomies.id, id),
          eq(collectionTaxonomies.siteId, siteId)
        )
      )
      .returning();

    if (!row) throw new NotFoundException('Taxonomy not found');
    await auditService.log({
      actorId: userId,
      action: 'delete',
      targetType: 'taxonomy',
      targetId: id,
      targetName: `Taxonomy: ${row.name}`,
    });
    return row;
  },

  listTerms: async (taxonomyId: string): Promise<CollectionTermNode[]> => {
    const siteId = await adminSiteId();
    const rows = await db
      .select({
        id: collectionTerms.id,
        taxonomyId: collectionTerms.taxonomyId,
        name: collectionTerms.name,
        slug: collectionTerms.slug,
        description: collectionTerms.description,
        parentId: collectionTerms.parentId,
        position: collectionTerms.position,
        count: count(collectionEntryTerms.entryId),
      })
      .from(collectionTerms)
      .leftJoin(
        collectionEntryTerms,
        eq(collectionEntryTerms.termId, collectionTerms.id)
      )
      .where(
        and(
          isNull(collectionTerms.deletedAt),
          eq(collectionTerms.taxonomyId, taxonomyId),
          eq(collectionTerms.siteId, siteId)
        )
      )
      .groupBy(collectionTerms.id)
      .orderBy(asc(collectionTerms.position), asc(collectionTerms.name));

    const byParent = new Map<string | null, typeof rows>();

    for (const row of rows) {
      const key =
        row.parentId && rows.some(r => r.id === row.parentId)
          ? row.parentId
          : null;
      byParent.set(key, [...(byParent.get(key) ?? []), row]);
    }

    const tree: CollectionTermNode[] = [];

    const walk = (parentId: string | null, depth: number) => {
      for (const row of byParent.get(parentId) ?? []) {
        tree.push({ ...row, depth });
        walk(row.id, depth + 1);
      }
    };

    walk(null, 0);
    return tree;
  },

  getTerm: async (id: string) => {
    const siteId = await adminSiteId();
    const [row] = await db
      .select()
      .from(collectionTerms)
      .where(
        and(
          eq(collectionTerms.id, id),
          eq(collectionTerms.siteId, siteId),
          isNull(collectionTerms.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  getTermBySlug: async (
    taxonomyId: string,
    slug: string,
    siteIdOverride?: string
  ) => {
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
      .from(collectionTerms)
      .where(
        and(
          eq(collectionTerms.taxonomyId, taxonomyId),
          ilike(collectionTerms.slug, slug),
          eq(collectionTerms.siteId, siteId),
          isNull(collectionTerms.deletedAt)
        )
      )
      .limit(1);
    return row ?? null;
  },

  saveTerm: async (input: TermInput, userId: string) => {
    const { id, ...values } = input;
    const siteId = await adminSiteId();

    const normalizedSlug = values.slug.trim();
    if (!slugRegex.test(normalizedSlug)) {
      throw new ApplicationException(
        'Term slug can only contain letters, numbers, and dashes.'
      );
    }

    const normalizedName = values.name.trim();
    if (!normalizedName) {
      throw new ApplicationException('Term name is required.');
    }

    // Check name clash (case-insensitive) within this taxonomy
    const [nameClash] = await db
      .select({ id: collectionTerms.id, name: collectionTerms.name })
      .from(collectionTerms)
      .where(
        and(
          eq(collectionTerms.siteId, siteId),
          eq(collectionTerms.taxonomyId, values.taxonomyId),
          sql`lower(trim(${collectionTerms.name})) = lower(${normalizedName})`,
          isNull(collectionTerms.deletedAt),
          id ? ne(collectionTerms.id, id) : undefined
        )
      )
      .limit(1);

    if (nameClash) {
      throw new ApplicationException(
        `A term named "${normalizedName}" already exists in this taxonomy.`
      );
    }

    const [clash] = await db
      .select({ id: collectionTerms.id })
      .from(collectionTerms)
      .where(
        and(
          eq(collectionTerms.siteId, siteId),
          eq(collectionTerms.taxonomyId, values.taxonomyId),
          ilike(collectionTerms.slug, normalizedSlug),
          isNull(collectionTerms.deletedAt),
          id ? ne(collectionTerms.id, id) : undefined
        )
      )
      .limit(1);

    if (clash) {
      throw new ApplicationException(
        `A term with slug "${normalizedSlug}" already exists in this taxonomy.`
      );
    }

    // Parent cycle guard
    if (id && values.parentId) {
      if (values.parentId === id) {
        throw new ApplicationException('A term cannot be nested inside itself.');
      }
      const all = await db
        .select({ id: collectionTerms.id, parentId: collectionTerms.parentId })
        .from(collectionTerms)
        .where(
          and(
            eq(collectionTerms.taxonomyId, values.taxonomyId),
            isNull(collectionTerms.deletedAt)
          )
        );

      let cursor: string | null | undefined = values.parentId;
      while (cursor) {
        if (cursor === id) {
          throw new ApplicationException('A term cannot be nested inside itself.');
        }
        cursor = all.find(c => c.id === cursor)?.parentId;
      }
    }

    const payload = {
      ...values,
      slug: normalizedSlug,
      siteId,
      updatedAt: new Date(),
    };

    const [row] = id
      ? await db
          .update(collectionTerms)
          .set(payload)
          .where(
            and(eq(collectionTerms.id, id), eq(collectionTerms.siteId, siteId))
          )
          .returning()
      : await db
          .insert(collectionTerms)
          .values({
            ...payload,
            position: values.position ?? 0,
          })
          .returning();

    if (!row) throw new NotFoundException('Term not found');
    await auditService.log({
      actorId: userId,
      action: id ? 'update' : 'create',
      targetType: 'taxonomy',
      targetId: row.id,
      targetName: `Term: ${row.name}`,
    });
    return row;
  },

  deleteTerm: async (id: string, userId: string) => {
    const siteId = await adminSiteId();
    const [term] = await db
      .select()
      .from(collectionTerms)
      .where(and(eq(collectionTerms.id, id), eq(collectionTerms.siteId, siteId)))
      .limit(1);
    if (!term) throw new NotFoundException('Term not found');

    // Re-parent children before deleting
    await db
      .update(collectionTerms)
      .set({ parentId: term.parentId, updatedAt: new Date() })
      .where(
        and(
          eq(collectionTerms.parentId, id),
          eq(collectionTerms.taxonomyId, term.taxonomyId)
        )
      );

    const [row] = await db
      .delete(collectionTerms)
      .where(and(eq(collectionTerms.id, id), eq(collectionTerms.siteId, siteId)))
      .returning();

    await auditService.log({
      actorId: userId,
      action: 'delete',
      targetType: 'taxonomy',
      targetId: id,
      targetName: `Term: ${term.name}`,
    });
    return row;
  },

  /** Lists taxonomies with all their terms (as trees) for a post type. */
  listTaxonomiesWithTerms: async (collectionId: string) => {
    const taxes = await collectionTaxonomiesService.listTaxonomies(collectionId);
    const results = await Promise.all(
      taxes.map(async tax => {
        const terms = await collectionTaxonomiesService.listTerms(tax.id);
        return {
          ...tax,
          terms,
        };
      })
    );
    return results;
  },

  /** Loads all term assignments for a given entry. */
  getEntryTerms: async (entryId: string) => {
    return db
      .select({
        termId: collectionTerms.id,
        taxonomyId: collectionTerms.taxonomyId,
        name: collectionTerms.name,
        slug: collectionTerms.slug,
        description: collectionTerms.description,
        parentId: collectionTerms.parentId,
        position: collectionTerms.position,
        taxonomyKey: collectionTaxonomies.key,
        taxonomyName: collectionTaxonomies.name,
        hierarchical: collectionTaxonomies.hierarchical,
      })
      .from(collectionEntryTerms)
      .innerJoin(
        collectionTerms,
        eq(collectionEntryTerms.termId, collectionTerms.id)
      )
      .innerJoin(
        collectionTaxonomies,
        eq(collectionTerms.taxonomyId, collectionTaxonomies.id)
      )
      .where(
        and(
          eq(collectionEntryTerms.entryId, entryId),
          isNull(collectionTerms.deletedAt)
        )
      )
      .orderBy(asc(collectionTerms.position), asc(collectionTerms.name));
  },

  /**
   * Syncs term relations for an entry. `termsByTaxonomy` maps `taxonomyId` -> `termId[]`.
   * Only taxonomies present in the object are synced; omitted taxonomies are left untouched.
   */
  syncEntryTerms: async (
    entryId: string,
    termsByTaxonomy: Record<string, string[]>
  ) => {
    for (const [taxonomyId, termIds] of Object.entries(termsByTaxonomy)) {
      const taxTerms = await db
        .select({ id: collectionTerms.id })
        .from(collectionTerms)
        .where(
          and(
            eq(collectionTerms.taxonomyId, taxonomyId),
            isNull(collectionTerms.deletedAt)
          )
        );

      const allTaxTermIds = taxTerms.map(t => t.id);
      if (allTaxTermIds.length > 0) {
        await db
          .delete(collectionEntryTerms)
          .where(
            and(
              eq(collectionEntryTerms.entryId, entryId),
              inArray(collectionEntryTerms.termId, allTaxTermIds)
            )
          );
      }

      const validIdSet = new Set(allTaxTermIds);
      const toInsert = (termIds || []).filter(id => validIdSet.has(id));

      if (toInsert.length > 0) {
        await db
          .insert(collectionEntryTerms)
          .values(
            toInsert.map(termId => ({
              entryId,
              termId,
            }))
          )
          .onConflictDoNothing();
      }
    }
  },
};
