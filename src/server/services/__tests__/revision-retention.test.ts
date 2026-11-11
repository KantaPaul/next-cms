import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  pageRevisions,
  postRevisions,
  REVISION_KIND,
} from '@/db/schema';
import {
  AUTOSAVE_REVISION_LIMIT,
  DEFAULT_AUTOSAVE_LABEL,
  isTrimmableAutosave,
  type RevisionRetentionRow,
  selectAutosaveIdsToTrim,
  trimOldAutosaveRevisions,
} from '@/server/services/revision-retention';

function makeRevision(
  index: number,
  overrides: Partial<RevisionRetentionRow> = {}
): RevisionRetentionRow {
  return {
    id: `rev-${String(index).padStart(3, '0')}`,
    kind: 'autosave',
    label: DEFAULT_AUTOSAVE_LABEL,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, index, 0)),
    ...overrides,
  };
}

describe('revision retention', () => {
  it('confirms the exact revision_kind enum values', () => {
    assert.deepEqual(REVISION_KIND, ['manual', 'autosave', 'published']);
    assert.equal(AUTOSAVE_REVISION_LIMIT, 50);
  });

  it('only marks unlabeled or default-labeled autosaves as trimmable', () => {
    assert.equal(isTrimmableAutosave('autosave', null), true);
    assert.equal(isTrimmableAutosave('autosave', ''), true);
    assert.equal(isTrimmableAutosave('autosave', 'Autosave'), true);
    assert.equal(isTrimmableAutosave('autosave', 'Before refactor'), false);
    assert.equal(isTrimmableAutosave('manual', null), false);
    assert.equal(isTrimmableAutosave('manual', 'Saved draft'), false);
    assert.equal(isTrimmableAutosave('published', 'Published'), false);
    assert.equal(isTrimmableAutosave('published', null), false);
  });

  it('trims oldest autosaves beyond 50 while keeping labeled, manual, and published revisions', () => {
    const oldestPublished = makeRevision(0, {
      kind: 'published',
      label: 'First publish',
    });
    const oldestManual = makeRevision(1, {
      kind: 'manual',
      label: 'Saved draft',
    });
    const labeledAutosave = makeRevision(2, {
      kind: 'autosave',
      label: 'Keep this checkpoint',
    });

    // Create 55 trimmable autosaves (indices 3..57, alternating null and 'Autosave').
    const autosaves: RevisionRetentionRow[] = [];
    for (let i = 3; i < 58; i++) {
      autosaves.push(
        makeRevision(i, {
          kind: 'autosave',
          label: i % 2 === 0 ? null : DEFAULT_AUTOSAVE_LABEL,
        })
      );
    }

    const all = [oldestPublished, oldestManual, labeledAutosave, ...autosaves];
    const toTrim = selectAutosaveIdsToTrim(all);

    assert.equal(toTrim.length, 5);
    assert.deepEqual(toTrim, [
      'rev-007',
      'rev-006',
      'rev-005',
      'rev-004',
      'rev-003',
    ]);

    const trimmedSet = new Set(toTrim);
    const remaining = all.filter(r => !trimmedSet.has(r.id));
    assert.equal(remaining.length, 53);
    assert.ok(remaining.some(r => r.id === oldestPublished.id));
    assert.ok(remaining.some(r => r.id === oldestManual.id));
    assert.ok(remaining.some(r => r.id === labeledAutosave.id));
    // Newest 50 autosaves (indices 8..57) are retained.
    for (let i = 8; i < 58; i++) {
      assert.ok(
        remaining.some(r => r.id === `rev-${String(i).padStart(3, '0')}`)
      );
    }
  });

  it('skips delete when stale autosave count is 0 and deletes stale rows for pages & posts', async () => {
    for (const [table, targetColumn] of [
      [pageRevisions, pageRevisions.pageId],
      [postRevisions, postRevisions.postId],
    ] as const) {
      let deletedCount = 0;
      let capturedOffset = -1;

      const makeStubOrm = (staleIds: { id: string }[]) =>
        ({
          select: () => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  offset: async (n: number) => {
                    capturedOffset = n;
                    return staleIds;
                  },
                }),
              }),
            }),
          }),
          delete: () => ({
            where: async () => {
              deletedCount += staleIds.length;
            },
          }),
        }) as unknown as Parameters<typeof trimOldAutosaveRevisions>[0]['orm'];

      const noopRemoved = await trimOldAutosaveRevisions({
        table,
        targetColumn,
        targetId: 'target-1',
        orm: makeStubOrm([]),
      });
      assert.equal(noopRemoved, 0);
      assert.equal(capturedOffset, 50);
      assert.equal(deletedCount, 0);

      const removed = await trimOldAutosaveRevisions({
        table,
        targetColumn,
        targetId: 'target-1',
        orm: makeStubOrm([{ id: 'old-1' }, { id: 'old-2' }]),
      });
      assert.equal(removed, 2);
      assert.equal(deletedCount, 2);
    }
  });
});
