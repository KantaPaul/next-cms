/**
 * The pure, DB-independent half of the one-time content migration (R703 /
 * ENG-24): classifying stored rows, converting their content, and building
 * the backup a rollback restores from. `scripts/migrate-content-format.ts`
 * is the thin CLI that wires this to the real tables; keeping the decision
 * logic here means it can be unit-tested against fixture rows instead of a
 * live database.
 */

import {
  type BuilderDocument,
  isBuilderDocument,
  isLegacyPuckData,
  type PuckData,
  puckToDocument,
} from '@nextcms/builder-core';

/** One jsonb cell that may hold stored content, identified for backup and rollback. */
export type ContentCell = {
  table: string;
  id: string;
  column: string;
  content: unknown;
};

export type MigrationPlan = {
  /** Legacy Puck content, converted and ready to write back. */
  toMigrate: { cell: ContentCell; migrated: BuilderDocument }[];
  /** Already a BuilderDocument; nothing to do. */
  alreadyMigrated: ContentCell[];
  /** Neither shape (null, or data check-documents.tsx would also have flagged); left untouched. */
  unrecognized: ContentCell[];
};

/** Classifies every cell and converts the ones that need it. Touches no database. */
export function planMigration(cells: ContentCell[]): MigrationPlan {
  const plan: MigrationPlan = {
    toMigrate: [],
    alreadyMigrated: [],
    unrecognized: [],
  };
  for (const cell of cells) {
    if (cell.content == null) continue;
    if (isBuilderDocument(cell.content)) {
      plan.alreadyMigrated.push(cell);
    } else if (isLegacyPuckData(cell.content)) {
      plan.toMigrate.push({
        cell,
        migrated: puckToDocument(cell.content as PuckData),
      });
    } else {
      plan.unrecognized.push(cell);
    }
  }
  return plan;
}

/** One cell's original content, saved before it is overwritten (R703's "backup"). */
export type BackupEntry = ContentCell;

/** The backup file's content: every cell `planMigration` is about to change, as it was. */
export function buildBackup(plan: MigrationPlan): BackupEntry[] {
  return plan.toMigrate.map(({ cell }) => cell);
}

/** What a rollback would write: each backed-up cell's original content, by table+id+column. */
export function rollbackWrites(backup: BackupEntry[]): ContentCell[] {
  return backup.map(entry => ({ ...entry }));
}

/**
 * True when migrating then rolling back a set of cells would restore every
 * migrated cell's content exactly as it was — the property a "tested
 * rollback script" (R703) needs to hold.
 */
export function rollbackRestoresOriginal(cells: ContentCell[]): boolean {
  const plan = planMigration(cells);
  const restored = rollbackWrites(buildBackup(plan));
  const byKey = new Map(
    restored.map(cell => [`${cell.table}.${cell.id}.${cell.column}`, cell])
  );
  return plan.toMigrate.every(({ cell }) => {
    const back = byKey.get(`${cell.table}.${cell.id}.${cell.column}`);
    return (
      back !== undefined &&
      JSON.stringify(back.content) === JSON.stringify(cell.content)
    );
  });
}
