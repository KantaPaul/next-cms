import assert from 'node:assert';
import { describe, it } from 'node:test';
import { DOCUMENT_VERSION, emptyDocument } from '@nextcms/builder-core';
import {
  buildBackup,
  type ContentCell,
  planMigration,
  rollbackRestoresOriginal,
  rollbackWrites,
} from '../content-migration';

const puckCell: ContentCell = {
  table: 'page_contents',
  id: 'p1',
  column: 'content',
  content: {
    root: { props: {} },
    content: [{ type: 'Hero', props: { id: 'h1' } }],
  },
};

const migratedCell: ContentCell = {
  table: 'page_contents',
  id: 'p2',
  column: 'content',
  content: emptyDocument(),
};

const nullCell: ContentCell = {
  table: 'page_contents',
  id: 'p3',
  column: 'content',
  content: null,
};

const junkCell: ContentCell = {
  table: 'page_contents',
  id: 'p4',
  column: 'content',
  content: { nonsense: true },
};

describe('planMigration (R703)', () => {
  it('converts legacy Puck content and leaves everything else classified, untouched', () => {
    const plan = planMigration([puckCell, migratedCell, nullCell, junkCell]);
    assert.equal(plan.toMigrate.length, 1);
    assert.equal(plan.toMigrate[0].cell.id, 'p1');
    assert.equal(plan.toMigrate[0].migrated.version, DOCUMENT_VERSION);
    assert.equal(plan.toMigrate[0].migrated.nodes.h1?.type, 'Hero');

    assert.deepEqual(plan.alreadyMigrated, [migratedCell]);
    assert.deepEqual(plan.unrecognized, [junkCell]);
    // null content (no draft saved yet) is neither migrated nor flagged — nothing to convert.
  });

  it('is a no-op over an already-migrated or empty set', () => {
    assert.deepEqual(planMigration([migratedCell, nullCell]).toMigrate, []);
    assert.deepEqual(planMigration([]), {
      toMigrate: [],
      alreadyMigrated: [],
      unrecognized: [],
    });
  });
});

describe('buildBackup / rollbackWrites (R703)', () => {
  it('backs up exactly the cells being migrated, by table/id/column', () => {
    const plan = planMigration([puckCell, migratedCell]);
    const backup = buildBackup(plan);
    assert.equal(backup.length, 1);
    assert.deepEqual(backup[0], puckCell);
  });

  it('a rollback writes back each backed-up cell unchanged', () => {
    const backup = buildBackup(planMigration([puckCell]));
    const writes = rollbackWrites(backup);
    assert.deepEqual(writes, [puckCell]);
  });
});

describe('rollbackRestoresOriginal (R703, "a tested rollback script")', () => {
  it('holds for a mix of legacy, migrated, null, and unrecognized content', () => {
    assert.equal(
      rollbackRestoresOriginal([puckCell, migratedCell, nullCell, junkCell]),
      true
    );
  });

  it('holds for several legacy rows across different tables', () => {
    const otherTable: ContentCell = {
      table: 'global_blocks',
      id: 'g1',
      column: 'content',
      content: {
        root: { props: {} },
        content: [{ type: 'Cta', props: { id: 'c1' } }],
      },
    };
    assert.equal(rollbackRestoresOriginal([puckCell, otherTable]), true);
  });

  it('holds trivially with nothing to migrate', () => {
    assert.equal(rollbackRestoresOriginal([migratedCell, nullCell]), true);
  });
});
