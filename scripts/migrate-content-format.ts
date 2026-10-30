/**
 * One-time migration of stored Puck content to the BuilderDocument format
 * (R703 / ENG-24), with a JSON backup written before any write and a
 * `--rollback` mode that restores it. The conversion itself
 * (`planMigration`/`puckToDocument`) is covered by its own unit tests in
 * scripts/lib/__tests__/content-migration.test.ts; this file is just the
 * thin wiring to the real tables, exercised by hand against a seeded or
 * staging database, never run automatically.
 *
 * Usage:
 *   tsx scripts/migrate-content-format.ts                 # dry run (default): report only
 *   tsx scripts/migrate-content-format.ts --execute        # write the migration, after a backup
 *   tsx scripts/migrate-content-format.ts --rollback FILE  # restore content from a backup file
 */
import { readFile, writeFile } from 'node:fs/promises';
import { eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import {
  globalBlocks,
  pageContents,
  pageRevisions,
  pageTemplates,
  postContents,
  postRevisions,
  postTemplates,
} from '@/db/schema';
import {
  buildBackup,
  type ContentCell,
  planMigration,
} from './lib/content-migration';

/** Every jsonb cell R703 names: page_contents, post_contents, revisions, templates, and global blocks. */
async function loadCells(): Promise<ContentCell[]> {
  const [pages, posts, revisions, postRevs, globals, pageTpl, postTpl, postTplDraft] =
    await Promise.all([
      db
        .select({ id: pageContents.id, content: pageContents.content })
        .from(pageContents)
        .where(isNotNull(pageContents.content)),
      db
        .select({ id: postContents.id, content: postContents.canvas })
        .from(postContents)
        .where(isNotNull(postContents.canvas)),
      db
        .select({ id: pageRevisions.id, content: pageRevisions.content })
        .from(pageRevisions)
        .where(isNotNull(pageRevisions.content)),
      db
        .select({ id: postRevisions.id, content: postRevisions.canvas })
        .from(postRevisions)
        .where(isNotNull(postRevisions.canvas)),
      db
        .select({ id: globalBlocks.id, content: globalBlocks.content })
        .from(globalBlocks),
      db
        .select({ id: pageTemplates.id, content: pageTemplates.content })
        .from(pageTemplates),
      db
        .select({ id: postTemplates.id, content: postTemplates.content })
        .from(postTemplates),
      db
        .select({ id: postTemplates.id, content: postTemplates.draftContent })
        .from(postTemplates)
        .where(isNotNull(postTemplates.draftContent)),
    ]);
  return [
    ...pages.map(r => ({
      table: 'page_contents',
      id: r.id,
      column: 'content',
      content: r.content,
    })),
    ...posts.map(r => ({
      table: 'post_contents',
      id: r.id,
      column: 'canvas',
      content: r.content,
    })),
    ...revisions.map(r => ({
      table: 'page_revisions',
      id: r.id,
      column: 'content',
      content: r.content,
    })),
    ...postRevs.map(r => ({
      table: 'post_revisions',
      id: r.id,
      column: 'canvas',
      content: r.content,
    })),
    ...globals.map(r => ({
      table: 'global_blocks',
      id: r.id,
      column: 'content',
      content: r.content,
    })),
    ...pageTpl.map(r => ({
      table: 'page_templates',
      id: r.id,
      column: 'content',
      content: r.content,
    })),
    ...postTpl.map(r => ({
      table: 'post_templates',
      id: r.id,
      column: 'content',
      content: r.content,
    })),
    ...postTplDraft.map(r => ({
      table: 'post_templates_draft',
      id: r.id,
      column: 'draft_content',
      content: r.content,
    })),
  ];
}

type TableName =
  | 'page_contents'
  | 'post_contents'
  | 'page_revisions'
  | 'post_revisions'
  | 'global_blocks'
  | 'page_templates'
  | 'post_templates'
  | 'post_templates_draft';

/** Writes one cell back, in the one column each table actually stores its document in. */
async function writeCell(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  table: TableName,
  id: string,
  content: unknown
) {
  switch (table) {
    case 'page_contents':
      return tx
        .update(pageContents)
        .set({ content })
        .where(eq(pageContents.id, id));
    case 'post_contents':
      return tx
        .update(postContents)
        .set({ canvas: content })
        .where(eq(postContents.id, id));
    case 'page_revisions':
      return tx
        .update(pageRevisions)
        .set({ content })
        .where(eq(pageRevisions.id, id));
    case 'post_revisions':
      return tx
        .update(postRevisions)
        .set({ canvas: content })
        .where(eq(postRevisions.id, id));
    case 'global_blocks':
      return tx
        .update(globalBlocks)
        .set({ content })
        .where(eq(globalBlocks.id, id));
    case 'page_templates':
      return tx
        .update(pageTemplates)
        .set({ content })
        .where(eq(pageTemplates.id, id));
    case 'post_templates':
      return tx
        .update(postTemplates)
        .set({ content })
        .where(eq(postTemplates.id, id));
    case 'post_templates_draft':
      return tx
        .update(postTemplates)
        .set({ draftContent: content })
        .where(eq(postTemplates.id, id));
  }
}

async function writeCells(
  cells: { table: TableName; id: string; content: unknown }[]
) {
  await db.transaction(async tx => {
    for (const { table, id, content } of cells)
      await writeCell(tx, table, id, content);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const rollbackFile = args.includes('--rollback')
    ? args[args.indexOf('--rollback') + 1]
    : null;

  if (rollbackFile) {
    const backup = JSON.parse(
      await readFile(rollbackFile, 'utf8')
    ) as (ContentCell & {
      table: TableName;
    })[];
    console.log(
      `Rolling back ${backup.length} cell(s) from ${rollbackFile}...`
    );
    await writeCells(backup);
    console.log('Rollback complete.');
    return;
  }

  const plan = planMigration(await loadCells());
  console.log(
    `${plan.toMigrate.length} to migrate, ${plan.alreadyMigrated.length} already migrated, ${plan.unrecognized.length} unrecognized`
  );
  for (const cell of plan.unrecognized)
    console.log(`  unrecognized: ${cell.table} ${cell.id}`);

  if (!args.includes('--execute')) {
    console.log(
      'Dry run only — pass --execute to write the migration (after a backup is saved).'
    );
    return;
  }
  if (plan.toMigrate.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  const backupFile = `migration-backup-${Date.now()}.json`;
  await writeFile(backupFile, JSON.stringify(buildBackup(plan), null, 2));
  console.log(`Backed up ${plan.toMigrate.length} cell(s) to ${backupFile}`);

  await writeCells(
    plan.toMigrate.map(({ cell, migrated }) => ({
      table: cell.table as TableName,
      id: cell.id,
      content: migrated,
    }))
  );
  console.log(`Migrated ${plan.toMigrate.length} cell(s). Roll back with:`);
  console.log(
    `  tsx scripts/migrate-content-format.ts --rollback ${backupFile}`
  );
}

main().then(() => process.exit(0));
