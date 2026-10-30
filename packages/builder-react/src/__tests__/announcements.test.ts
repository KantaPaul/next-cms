import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  type BlockSchemas,
  type BuilderDocument,
  DOCUMENT_VERSION,
} from '@nextcms/builder-core';
import { describeHistoryChange } from '../announcements';
import { createEditorStore } from '../store';

const schemas: BlockSchemas = {
  Text: { type: 'Text', label: 'Text', defaultProps: { text: 'Hello' } },
  Hero: { type: 'Hero', label: 'Hero', defaultProps: {} },
};

const doc: BuilderDocument = {
  version: DOCUMENT_VERSION,
  root: { props: {} },
  nodes: {
    a: { id: 'a', type: 'Text', props: {}, slots: {}, meta: { name: 'Intro' } },
    h: { id: 'h', type: 'Hero', props: {}, slots: {} },
  },
  rootSlot: ['a', 'h'],
};

/** Runs an edit on a fresh store and returns what would be announced. */
function announced(
  edit: (store: ReturnType<typeof createEditorStore>) => void,
  before?: (store: ReturnType<typeof createEditorStore>) => void
) {
  let n = 0;
  const store = createEditorStore({
    document: doc,
    schemas,
    createId: type => `${type}-${++n}`,
  });
  before?.(store);
  const previous = store.getState().history;
  edit(store);
  const state = store.getState();
  return describeHistoryChange(
    previous,
    state.history,
    state.selection,
    (d, id) => {
      const node = d.nodes[id];
      return node?.meta?.name || schemas[node?.type ?? '']?.label || 'block';
    }
  );
}

describe('describeHistoryChange (B15 E5)', () => {
  it('announces a move with the new position', () => {
    assert.equal(
      announced(store => {
        store.select('h');
        store.nudge('h', -1);
      }),
      'Moved Hero, now 1 of 2'
    );
  });

  it('announces inserts, duplicates and deletes', () => {
    assert.equal(
      announced(store => store.insertBlock('Hero')),
      'Added Hero'
    );
    assert.equal(
      announced(store => store.duplicate(['a'])),
      'Duplicated Intro'
    );
    assert.equal(
      announced(store => store.remove(['h'])),
      'Block deleted'
    );
    assert.equal(
      announced(store => store.remove(['a', 'h'])),
      'Blocks deleted'
    );
  });

  it('names the step that undo and redo reversed', () => {
    const nudge = (store: ReturnType<typeof createEditorStore>) =>
      store.nudge('h', -1);
    assert.equal(
      announced(store => store.undo(), nudge),
      'Undid Move block'
    );
    assert.equal(
      announced(
        store => store.redo(),
        store => {
          nudge(store);
          store.undo();
        }
      ),
      'Redid Move block'
    );
  });

  it('stays quiet for typing and selection-only changes', () => {
    assert.equal(
      announced(store => store.updateProps('a', { text: 'x' }, 'a.text')),
      null
    );
    assert.equal(
      announced(store => store.select('h')),
      null
    );
  });
});
