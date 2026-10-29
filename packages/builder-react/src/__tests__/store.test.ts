import { describe, it } from 'node:test';
import assert from 'node:assert';
import { type BlockSchemas, DOCUMENT_VERSION, type BuilderDocument } from '@nextcms/builder-core';
import { autoScrollSpeed, dropIndex, dropLine } from '../drop';
import { keyAction, runKeyAction } from '../keyboard';
import { createEditorStore } from '../store';

const schemas: BlockSchemas = {
  Text: { type: 'Text', label: 'Text', defaultProps: { text: 'Hello' } },
  Box: { type: 'Box', label: 'Box', slots: { content: { disallow: ['Box'] } } },
};

const doc: BuilderDocument = {
  version: DOCUMENT_VERSION,
  root: { props: {} },
  nodes: {
    a: { id: 'a', type: 'Text', props: {}, slots: {} },
    box: { id: 'box', type: 'Box', props: {}, slots: { content: ['b'] } },
    b: { id: 'b', type: 'Text', props: {}, slots: {} },
  },
  rootSlot: ['a', 'box'],
};

const setup = () => {
  let n = 0;
  return createEditorStore({ document: doc, schemas, createId: type => `${type}-${++n}` });
};

describe('editor store', () => {
  it('inserts after the selection and selects the new block', () => {
    const store = setup();
    store.select('a');
    const id = store.insertBlock('Text');
    assert.equal(id, 'Text-1');
    assert.deepEqual(store.getState().doc.rootSlot, ['a', 'Text-1', 'box']);
    assert.deepEqual(store.getState().selection, ['Text-1']);
    assert.equal(store.getState().doc.nodes['Text-1'].props.text, 'Hello');
    assert.ok(store.isDirty());
  });

  it('refuses inserts and moves the nesting rules forbid', () => {
    const store = setup();
    assert.equal(store.insertBlock('Box', { parentId: 'box', slot: 'content', index: 0 }), null);
    assert.equal(store.move('box', { parentId: 'box', slot: 'content', index: 0 }), false);
    assert.equal(store.getState().history.past.length, 0);
  });

  it('undoes and redoes a move', () => {
    const store = setup();
    store.move('a', { parentId: 'box', slot: 'content', index: 1 });
    assert.deepEqual(store.getState().doc.nodes.box.slots.content, ['b', 'a']);
    store.undo();
    assert.equal(store.getState().doc, store.getState().history.present.doc);
    assert.deepEqual(store.getState().doc.rootSlot, ['a', 'box']);
    assert.ok(!store.isDirty());
    store.redo();
    assert.deepEqual(store.getState().doc.rootSlot, ['box']);
  });

  it('copies and pastes with new ids', () => {
    const store = setup();
    store.select('box');
    store.copy();
    const pasted = store.paste();
    assert.equal(pasted, 'Box-1');
    const nodes = store.getState().doc.nodes;
    assert.deepEqual(nodes['Box-1'].slots.content, ['Text-2']);
  });

  it('nudges, selects siblings and parents', () => {
    const store = setup();
    store.select('a');
    store.nudge('a', 1);
    assert.deepEqual(store.getState().doc.rootSlot, ['box', 'a']);
    store.selectSibling(-1);
    assert.deepEqual(store.getState().selection, ['box']);
    store.selectFirstChild();
    assert.deepEqual(store.getState().selection, ['b']);
    store.selectParent();
    assert.deepEqual(store.getState().selection, ['box']);
  });

  it('merges typing into one undo step and wraps and unwraps', () => {
    const store = setup();
    store.updateProps('a', { text: 'H' }, 'a.text');
    store.updateProps('a', { text: 'Hi' }, 'a.text');
    assert.equal(store.getState().history.past.length, 1);
    const wrapper = store.wrap('Box', ['a']);
    assert.ok(wrapper);
    assert.deepEqual(store.getState().doc.nodes[wrapper].slots.content, ['a']);
    store.unwrap(wrapper);
    assert.deepEqual(store.getState().doc.rootSlot, ['a', 'box']);
  });

  it('notifies subscribers on change', () => {
    const store = setup();
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.select('a');
    store.remove();
    off();
    store.select(null);
    assert.equal(calls, 2);
  });
});

describe('keyboard', () => {
  it('maps keys to actions', () => {
    assert.equal(keyAction({ key: 'z', metaKey: true }), 'undo');
    assert.equal(keyAction({ key: 'Z', ctrlKey: true, shiftKey: true }), 'redo');
    assert.equal(keyAction({ key: 'ArrowUp', altKey: true }), 'move-up');
    assert.equal(keyAction({ key: 'ArrowDown' }), 'select-next');
    assert.equal(keyAction({ key: 'Enter', shiftKey: true }), 'select-parent');
    assert.equal(keyAction({ key: 'Backspace' }), 'delete');
    assert.equal(keyAction({ key: 'a' }), null);
  });

  it('runs actions against the store', () => {
    const store = setup();
    assert.equal(runKeyAction(store, 'delete'), false, 'nothing selected');
    runKeyAction(store, 'select-next');
    assert.deepEqual(store.getState().selection, ['a']);
    assert.ok(runKeyAction(store, 'duplicate'));
    assert.equal(store.getState().doc.rootSlot.length, 3);
    runKeyAction(store, 'undo');
    assert.equal(store.getState().doc.rootSlot.length, 2);
  });
});

describe('drop geometry', () => {
  const rows = [
    { left: 0, top: 0, width: 100, height: 40 },
    { left: 0, top: 50, width: 100, height: 40 },
  ];

  it('picks the index by the middle of each child', () => {
    assert.equal(dropIndex(rows, { x: 10, y: 10 }, 'y'), 0);
    assert.equal(dropIndex(rows, { x: 10, y: 30 }, 'y'), 1);
    assert.equal(dropIndex(rows, { x: 10, y: 95 }, 'y'), 2);
    assert.equal(dropIndex([], { x: 0, y: 0 }, 'y'), 0);
  });

  it('draws the line between children or in an empty slot', () => {
    const slot = { left: 0, top: 0, width: 100, height: 100 };
    assert.equal(dropLine(rows, 1, 'y', slot).top, 50 - 1.5);
    assert.equal(dropLine(rows, 2, 'y', slot).top, 90 - 1.5);
    assert.equal(dropLine([], 0, 'y', slot).top, 50);
  });

  it('scrolls near the edges only', () => {
    assert.ok(autoScrollSpeed(5, 500) < 0);
    assert.ok(autoScrollSpeed(495, 500) > 0);
    assert.equal(autoScrollSpeed(250, 500), 0);
    assert.equal(autoScrollSpeed(9999, 500), autoScrollSpeed(500, 500));
  });
});
