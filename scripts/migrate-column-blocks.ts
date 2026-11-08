/**
 * Migrates legacy column slots (`left/center/right`, `col1..6`, `column1..4`)
 * on `Columns`, `HeaderBar`, `HeaderColumns`, and `FooterColumns` into real
 * `Column` blocks across all sites, drafts, published content, revisions,
 * translations, templates, patterns, collection entries, loop templates,
 * experiments, and global blocks.
 *
 * Dry-run by default: reports counts and failures without modifying the database.
 * When `--execute` is passed, writes a JSON backup before updating rows in a transaction.
 *
 * Usage:
 *   tsx scripts/migrate-column-blocks.ts                 # dry run (default)
 *   tsx scripts/migrate-column-blocks.ts --execute       # write after saving backup
 *   tsx scripts/migrate-column-blocks.ts --rollback FILE # restore from backup
 */

import { readFile, writeFile } from 'node:fs/promises';
import { eq, isNotNull } from 'drizzle-orm';
import {
  documentProblems,
  isBuilderDocument,
  isLegacyPuckData,
  toDocument,
} from '@nextcms/builder-core';
import { db } from '@/db';
import {
  collectionBlocks,
  collectionEntries,
  collectionTemplates,
  globalBlocks,
  loopTemplates,
  pageContents,
  pageExperiments,
  pageRevisions,
  pageTemplates,
  postContents,
  postRevisions,
  postTemplates,
} from '@/db/schema';
import { migrateColumnBlocks } from '@/builder/migrations/column-blocks';

export type CellTarget =
  | 'page_contents.content'
  | 'page_revisions.content'
  | 'post_contents.canvas'
  | 'post_revisions.canvas'
  | 'global_blocks.content'
  | 'global_blocks.published_content'
  | 'page_templates.content'
  | 'post_templates.content'
  | 'post_templates.draft_content'
  | 'collection_templates.content'
  | 'collection_templates.draft_content'
  | 'collection_blocks.content'
  | 'collection_blocks.draft_content'
  | 'collection_entries.canvas'
  | 'collection_entries.draft_canvas'
  | 'loop_templates.content'
  | 'loop_templates.published_content'
  | 'page_experiments.variant_content';

export type StoredCell = {
  target: CellTarget;
  id: string;
  content: unknown;
};

export type MigrationPlan = {
  scanned: number;
  toMigrate: { cell: StoredCell; migrated: unknown }[];
  unchanged: StoredCell[];
  skipped: StoredCell[];
  failures: { cell: StoredCell; errors: string[] }[];
  byTarget: Record<
    string,
    { scanned: number; toMigrate: number; unchanged: number; failures: number }
  >;
};

export function planColumnBlocksMigration(cells: StoredCell[]): MigrationPlan {
  const toMigrate: { cell: StoredCell; migrated: unknown }[] = [];
  const unchanged: StoredCell[] = [];
  const skipped: StoredCell[] = [];
  const failures: { cell: StoredCell; errors: string[] }[] = [];
  const byTarget: MigrationPlan['byTarget'] = {};

  for (const cell of cells) {
    const stats = (byTarget[cell.target] ??= {
      scanned: 0,
      toMigrate: 0,
      unchanged: 0,
      failures: 0,
    });
    stats.scanned += 1;

    const raw = cell.content;
    if (
      !raw ||
      typeof raw !== 'object' ||
      (!isBuilderDocument(raw) && !isLegacyPuckData(raw) && !Array.isArray(raw))
    ) {
      skipped.push(cell);
      stats.unchanged += 1;
      continue;
    }

    try {
      const migrated = migrateColumnBlocks(raw);
      if (migrated === raw || JSON.stringify(migrated) === JSON.stringify(raw)) {
        unchanged.push(cell);
        stats.unchanged += 1;
        continue;
      }

      const issues = documentProblems(toDocument(migrated));
      if (issues.length > 0) {
        failures.push({ cell, errors: issues });
        stats.failures += 1;
        continue;
      }

      toMigrate.push({ cell, migrated });
      stats.toMigrate += 1;
    } catch (err) {
      failures.push({
        cell,
        errors: [err instanceof Error ? err.message : String(err)],
      });
      stats.failures += 1;
    }
  }

  return {
    scanned: cells.length,
    toMigrate,
    unchanged,
    skipped,
    failures,
    byTarget,
  };
}

async function loadAllCells(): Promise<StoredCell[]> {
  const [
    pages,
    pageRevs,
    posts,
    postRevs,
    globalsContent,
    globalsPublished,
    pageTpls,
    postTpls,
    postTplsDraft,
    colTpls,
    colTplsDraft,
    colBlocks,
    colBlocksDraft,
    colEntriesCanvas,
    colEntriesDraft,
    loopTpls,
    loopTplsPublished,
    experiments,
  ] = await Promise.all([
    db
      .select({ id: pageContents.id, content: pageContents.content })
      .from(pageContents)
      .where(isNotNull(pageContents.content)),
    db
      .select({ id: pageRevisions.id, content: pageRevisions.content })
      .from(pageRevisions)
      .where(isNotNull(pageRevisions.content)),
    db
      .select({ id: postContents.id, content: postContents.canvas })
      .from(postContents)
      .where(isNotNull(postContents.canvas)),
    db
      .select({ id: postRevisions.id, content: postRevisions.canvas })
      .from(postRevisions)
      .where(isNotNull(postRevisions.canvas)),
    db
      .select({ id: globalBlocks.id, content: globalBlocks.content })
      .from(globalBlocks),
    db
      .select({ id: globalBlocks.id, content: globalBlocks.publishedContent })
      .from(globalBlocks)
      .where(isNotNull(globalBlocks.publishedContent)),
    db
      .select({ id: pageTemplates.id, content: pageTemplates.content })
      .from(pageTemplates),
    db
      .select({ id: postTemplates.id, content: postTemplates.content })
      .from(postTemplates)
      .where(isNotNull(postTemplates.content)),
    db
      .select({ id: postTemplates.id, content: postTemplates.draftContent })
      .from(postTemplates)
      .where(isNotNull(postTemplates.draftContent)),
    db
      .select({ id: collectionTemplates.id, content: collectionTemplates.content })
      .from(collectionTemplates)
      .where(isNotNull(collectionTemplates.content)),
    db
      .select({ id: collectionTemplates.id, content: collectionTemplates.draftContent })
      .from(collectionTemplates)
      .where(isNotNull(collectionTemplates.draftContent)),
    db
      .select({ id: collectionBlocks.id, content: collectionBlocks.content })
      .from(collectionBlocks)
      .where(isNotNull(collectionBlocks.content)),
    db
      .select({ id: collectionBlocks.id, content: collectionBlocks.draftContent })
      .from(collectionBlocks)
      .where(isNotNull(collectionBlocks.draftContent)),
    db
      .select({ id: collectionEntries.id, content: collectionEntries.canvas })
      .from(collectionEntries)
      .where(isNotNull(collectionEntries.canvas)),
    db
      .select({ id: collectionEntries.id, content: collectionEntries.draftCanvas })
      .from(collectionEntries)
      .where(isNotNull(collectionEntries.draftCanvas)),
    db
      .select({ id: loopTemplates.id, content: loopTemplates.content })
      .from(loopTemplates),
    db
      .select({ id: loopTemplates.id, content: loopTemplates.publishedContent })
      .from(loopTemplates)
      .where(isNotNull(loopTemplates.publishedContent)),
    db
      .select({ id: pageExperiments.id, content: pageExperiments.variantContent })
      .from(pageExperiments),
  ]);

  const tag = (target: CellTarget, rows: { id: string; content: unknown }[]): StoredCell[] =>
    rows.map(r => ({ target, id: r.id, content: r.content }));

  return [
    ...tag('page_contents.content', pages),
    ...tag('page_revisions.content', pageRevs),
    ...tag('post_contents.canvas', posts),
    ...tag('post_revisions.canvas', postRevs),
    ...tag('global_blocks.content', globalsContent),
    ...tag('global_blocks.published_content', globalsPublished),
    ...tag('page_templates.content', pageTpls),
    ...tag('post_templates.content', postTpls),
    ...tag('post_templates.draft_content', postTplsDraft),
    ...tag('collection_templates.content', colTpls),
    ...tag('collection_templates.draft_content', colTplsDraft),
    ...tag('collection_blocks.content', colBlocks),
    ...tag('collection_blocks.draft_content', colBlocksDraft),
    ...tag('collection_entries.canvas', colEntriesCanvas),
    ...tag('collection_entries.draft_canvas', colEntriesDraft),
    ...tag('loop_templates.content', loopTpls),
    ...tag('loop_templates.published_content', loopTplsPublished),
    ...tag('page_experiments.variant_content', experiments),
  ];
}

async function writeCell(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  target: CellTarget,
  id: string,
  content: unknown
) {
  switch (target) {
    case 'page_contents.content':
      return tx.update(pageContents).set({ content }).where(eq(pageContents.id, id));
    case 'page_revisions.content':
      return tx.update(pageRevisions).set({ content }).where(eq(pageRevisions.id, id));
    case 'post_contents.canvas':
      return tx.update(postContents).set({ canvas: content }).where(eq(postContents.id, id));
    case 'post_revisions.canvas':
      return tx.update(postRevisions).set({ canvas: content }).where(eq(postRevisions.id, id));
    case 'global_blocks.content':
      return tx.update(globalBlocks).set({ content }).where(eq(globalBlocks.id, id));
    case 'global_blocks.published_content':
      return tx
        .update(globalBlocks)
        .set({ publishedContent: content })
        .where(eq(globalBlocks.id, id));
    case 'page_templates.content':
      return tx.update(pageTemplates).set({ content }).where(eq(pageTemplates.id, id));
    case 'post_templates.content':
      return tx.update(postTemplates).set({ content }).where(eq(postTemplates.id, id));
    case 'post_templates.draft_content':
      return tx
        .update(postTemplates)
        .set({ draftContent: content })
        .where(eq(postTemplates.id, id));
    case 'collection_templates.content':
      return tx
        .update(collectionTemplates)
        .set({ content })
        .where(eq(collectionTemplates.id, id));
    case 'collection_templates.draft_content':
      return tx
        .update(collectionTemplates)
        .set({ draftContent: content })
        .where(eq(collectionTemplates.id, id));
    case 'collection_blocks.content':
      return tx
        .update(collectionBlocks)
        .set({ content })
        .where(eq(collectionBlocks.id, id));
    case 'collection_blocks.draft_content':
      return tx
        .update(collectionBlocks)
        .set({ draftContent: content })
        .where(eq(collectionBlocks.id, id));
    case 'collection_entries.canvas':
      return tx
        .update(collectionEntries)
        .set({ canvas: content })
        .where(eq(collectionEntries.id, id));
    case 'collection_entries.draft_canvas':
      return tx
        .update(collectionEntries)
        .set({ draftCanvas: content })
        .where(eq(collectionEntries.id, id));
    case 'loop_templates.content':
      return tx.update(loopTemplates).set({ content }).where(eq(loopTemplates.id, id));
    case 'loop_templates.published_content':
      return tx
        .update(loopTemplates)
        .set({ publishedContent: content })
        .where(eq(loopTemplates.id, id));
    case 'page_experiments.variant_content':
      return tx
        .update(pageExperiments)
        .set({ variantContent: content })
        .where(eq(pageExperiments.id, id));
  }
}

async function writeCells(cells: StoredCell[]) {
  await db.transaction(async tx => {
    for (const cell of cells) {
      await writeCell(tx, cell.target, cell.id, cell.content);
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const rollbackFile = args.includes('--rollback')
    ? args[args.indexOf('--rollback') + 1]
    : null;

  if (rollbackFile) {
    const backup = JSON.parse(await readFile(rollbackFile, 'utf8')) as StoredCell[];
    console.log(`Rolling back ${backup.length} cell(s) from ${rollbackFile}...`);
    await writeCells(backup);
    console.log('Rollback complete.');
    return;
  }

  const cells = await loadAllCells();
  const plan = planColumnBlocksMigration(cells);

  console.log(
    `Column blocks migration report:\n` +
      `  Scanned:    ${plan.scanned}\n` +
      `  To migrate: ${plan.toMigrate.length}\n` +
      `  Unchanged:  ${plan.unchanged.length}\n` +
      `  Failures:   ${plan.failures.length}`
  );

  for (const [target, stats] of Object.entries(plan.byTarget)) {
    if (stats.scanned > 0) {
      console.log(
        `  - ${target.padEnd(36)} scanned=${stats.scanned} migrate=${stats.toMigrate} unchanged=${stats.unchanged} failures=${stats.failures}`
      );
    }
  }

  for (const failure of plan.failures) {
    console.error(
      `  [FAILURE] ${failure.cell.target} (${failure.cell.id}): ${failure.errors.join('; ')}`
    );
  }

  if (!args.includes('--execute')) {
    console.log(
      '\nDry run only — pass --execute to write the migration (after a backup is saved).'
    );
    return;
  }

  if (plan.failures.length > 0) {
    console.error('Aborting write due to validation failures.');
    process.exit(1);
  }

  if (plan.toMigrate.length === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  const backupFile = `column-blocks-backup-${Date.now()}.json`;
  const backupData: StoredCell[] = plan.toMigrate.map(({ cell }) => cell);
  await writeFile(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`Backed up ${backupData.length} cell(s) to ${backupFile}`);

  await writeCells(
    plan.toMigrate.map(({ cell, migrated }) => ({
      target: cell.target,
      id: cell.id,
      content: migrated,
    }))
  );
  console.log(`Migrated ${plan.toMigrate.length} cell(s). Roll back with:`);
  console.log(`  tsx scripts/migrate-column-blocks.ts --rollback ${backupFile}`);
}

const isMain =
  process.argv[1]?.endsWith('migrate-column-blocks.ts') ||
  process.argv[1]?.endsWith('migrate-column-blocks');
if (isMain) {
  main().then(() => process.exit(0));
}
