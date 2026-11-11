import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import type { AnyPgColumn, AnyPgTable } from 'drizzle-orm/pg-core';
import type { RevisionKindType } from '@/db/schema';
import type { DBTrx } from '@/lib/types';

export const AUTOSAVE_REVISION_LIMIT = 50;
export const DEFAULT_AUTOSAVE_LABEL = 'Autosave';

/**
 * Only unlabeled or default-labeled (`'Autosave'`) autosave-kind revisions are
 * eligible for automatic pruning. Manual, published, and custom-labeled
 * revisions are always preserved.
 */
export function isTrimmableAutosave(
  kind: RevisionKindType,
  label: string | null | undefined
): boolean {
  return (
    kind === 'autosave' &&
    (label == null || label === '' || label === DEFAULT_AUTOSAVE_LABEL)
  );
}

export type RevisionRetentionRow = {
  id: string;
  kind: RevisionKindType;
  label: string | null;
  createdAt: Date;
};

/** Pure selector returning IDs of oldest trimmable autosaves beyond `limit`. */
export function selectAutosaveIdsToTrim(
  rows: readonly RevisionRetentionRow[],
  limit = AUTOSAVE_REVISION_LIMIT
): string[] {
  const trimmable = rows
    .filter(r => isTrimmableAutosave(r.kind, r.label))
    .sort((a, b) => {
      const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });
  return trimmable.slice(limit).map(r => r.id);
}

type RevisionTable = AnyPgTable & {
  id: AnyPgColumn;
  kind: AnyPgColumn;
  label: AnyPgColumn;
  createdAt: AnyPgColumn;
};

/**
 * Deletes the oldest unlabeled / default-labeled autosave revisions beyond the
 * newest `limit` for a single page or post.
 */
export async function trimOldAutosaveRevisions({
  table,
  targetColumn,
  targetId,
  orm,
  limit = AUTOSAVE_REVISION_LIMIT,
}: {
  table: RevisionTable;
  targetColumn: AnyPgColumn;
  targetId: string;
  orm: DBTrx;
  limit?: number;
}): Promise<number> {
  const stale = await orm
    .select({ id: table.id })
    .from(table)
    .where(
      and(
        eq(targetColumn, targetId),
        eq(table.kind, 'autosave'),
        or(
          isNull(table.label),
          eq(table.label, ''),
          eq(table.label, DEFAULT_AUTOSAVE_LABEL)
        )
      )
    )
    .orderBy(desc(table.createdAt), desc(table.id))
    .offset(limit);

  if (stale.length === 0) return 0;

  await orm
    .delete(table)
    .where(inArray(table.id, stale.map(row => row.id)));

  return stale.length;
}
