import { describe, it } from 'node:test';
import assert from 'node:assert';
import { type BlockSchemas, canPlace, createNode, normalizeNode } from '../blocks';
import {
  insertSubtree,
  moveNode,
  pruneDetached,
  removeNode,
  unwrapNode,
  updateProps,
  wrapNodes,
} from '../commands';
import { DOCUMENT_VERSION, type BuilderDocument, type BuilderNode } from '../document';
import { canRedo, canUndo, commit, createHistory, HISTORY_LIMIT, redo, undo } from '../history';
import {
  ancestorIds,
  cloneSubtree,
  extractSubtree,
  findPosition,
  ROOT_SLOT,
} from '../tree';

const node = (id: string, type = 'Text', slots: BuilderNode['slots'] = {}): BuilderNode => ({
  id,
  type,
  props: { label: id },
  slots,
});

// a, box[b, c], d
const doc: BuilderDocument = {
  version: DOCUMENT_VERSION,
  root: { props: {} },
  nodes: {
    a: node('a'),
    box: node('box', 'Box', { content: ['b', 'c'] }),
    b: node('b'),
    c: node('c'),
    d: node('d'),
  },
  rootSlot: ['a', 'box', 'd'],
};

const root = (index: number) => ({ parentId: null, slot: ROOT_SLOT, index });
const inBox = (index: number) => ({ parentId: 'box', slot: 'content', index });

describe('tree', () => {
  it('finds positions and ancestors', () => {
    assert.deepEqual(findPosition(doc, 'c'), inBox(1));
    assert.deepEqual(findPosition(doc, 'd'), root(2));
    assert.deepEqual(ancestorIds(doc, 'c'), ['box']);
  });

  it('clones a subtree with new ids', () => {
    let n = 0;
    const subtree = extractSubtree(doc, 'box');
    assert.ok(subtree);
    const copy = cloneSubtree(subtree, type => `${type}-${++n}`);
    assert.equal(copy.rootId, 'Box-1');
    assert.deepEqual(copy.nodes['Box-1'].slots.content, ['Text-2', 'Text-3']);
  });
});

describe('commands', () => {
  it('inserts at a position', () => {
    const next = insertSubtree(doc, { rootId: 'x', nodes: { x: node('x') } }, inBox(1));
    assert.deepEqual(next.nodes.box.slots.content, ['b', 'x', 'c']);
    assert.deepEqual(doc.nodes.box.slots.content, ['b', 'c'], 'input unchanged');
  });

  it('moves within a slot using pre-move indexes', () => {
    assert.deepEqual(moveNode(doc, 'a', root(2)).rootSlot, ['box', 'a', 'd']);
    assert.deepEqual(moveNode(doc, 'd', root(0)).rootSlot, ['d', 'a', 'box']);
    assert.equal(moveNode(doc, 'a', root(1)), doc, 'dropping in place is a no-op');
  });

  it('moves between slots and refuses to move a node inside itself', () => {
    const next = moveNode(doc, 'a', inBox(2));
    assert.deepEqual(next.rootSlot, ['box', 'd']);
    assert.deepEqual(next.nodes.box.slots.content, ['b', 'c', 'a']);
    assert.equal(moveNode(doc, 'box', inBox(0)), doc);
  });

  it('removes a node and its descendants', () => {
    const next = removeNode(doc, 'box');
    assert.deepEqual(next.rootSlot, ['a', 'd']);
    assert.equal(next.nodes.b, undefined);
  });

  it('updates props', () => {
    assert.equal(updateProps(doc, 'a', { label: 'A' }).nodes.a.props.label, 'A');
  });

  it('wraps siblings and unwraps them again', () => {
    const wrapped = wrapNodes(doc, ['d', 'a'], node('w', 'Box'), 'content');
    assert.deepEqual(wrapped.rootSlot, ['w', 'box']);
    assert.deepEqual(wrapped.nodes.w.slots.content, ['a', 'd']);
    const unwrapped = unwrapNode(wrapped, 'w');
    assert.deepEqual(unwrapped.rootSlot, ['a', 'd', 'box']);
    assert.equal(unwrapped.nodes.w, undefined);
  });

  it('prunes nodes that are no longer attached', () => {
    const orphan = { ...doc, nodes: { ...doc.nodes, z: node('z') } };
    assert.equal(pruneDetached(orphan).nodes.z, undefined);
    assert.equal(pruneDetached(doc), doc);
  });
});

describe('history', () => {
  it('undoes and redoes', () => {
    const moved = moveNode(doc, 'a', root(3));
    let h = commit(createHistory(doc), moved, { label: 'Move' });
    assert.ok(canUndo(h));
    h = undo(h);
    assert.equal(h.present.doc, doc);
    assert.ok(canRedo(h));
    assert.equal(redo(h).present.doc, moved);
  });

  it('merges a typing burst into one step', () => {
    let h = createHistory(doc);
    h = commit(h, updateProps(doc, 'a', { label: 'H' }), { label: 'Edit', mergeKey: 'a.label', now: 0 });
    h = commit(h, updateProps(h.present.doc, 'a', { label: 'Hi' }), { label: 'Edit', mergeKey: 'a.label', now: 400 });
    assert.equal(h.past.length, 1);
    h = commit(h, updateProps(h.present.doc, 'a', { label: 'Hi!' }), { label: 'Edit', mergeKey: 'a.label', now: 2000 });
    assert.equal(h.past.length, 2, 'a pause starts a new step');
  });

  it('undo and redo are no-ops with nothing to undo or redo', () => {
    const h = createHistory(doc);
    assert.equal(canUndo(h), false);
    assert.equal(canRedo(h), false);
    assert.equal(undo(h), h);
    assert.equal(redo(h), h);
  });

  it('a new commit after undo drops the redo future', () => {
    let h = commit(createHistory(doc), moveNode(doc, 'a', root(3)), { label: 'Move' });
    h = undo(h);
    assert.ok(canRedo(h));
    h = commit(h, updateProps(doc, 'a', { label: 'New branch' }), { label: 'Edit' });
    assert.equal(canRedo(h), false, 'the abandoned future is gone once a new step is committed');
  });

  it('caps past entries at HISTORY_LIMIT', () => {
    let h = createHistory(doc);
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      h = commit(h, updateProps(h.present.doc, 'a', { label: `Step ${i}` }), { label: 'Edit' });
    }
    assert.equal(h.past.length, HISTORY_LIMIT);
  });
});

describe('block schemas', () => {
  const schemas: BlockSchemas = {
    Columns: {
      type: 'Columns',
      defaultProps: { layout: '1-1', column1: [], column2: [] },
      slots: { column1: { disallow: ['Columns'] }, column2: { disallow: ['Columns'] } },
    },
    Tabs: {
      type: 'Tabs',
      defaultProps: { items: [{ label: 'One', content: [] }] },
      arraySlots: { items: { content: { allow: ['Text'] } } },
    },
    Box: { type: 'Box', slots: { content: {} } },
  };

  it('creates nodes with empty slots instead of slot props', () => {
    const columns = createNode(schemas.Columns, 'c1');
    assert.deepEqual(columns.slots, { column1: [], column2: [] });
    assert.deepEqual(columns.props, { layout: '1-1' });
    const tabs = createNode(schemas.Tabs, 't1');
    assert.deepEqual(tabs.slots, { 'items[0].content': [] });
    assert.deepEqual(tabs.props.items, [{ label: 'One' }]);
  });

  it('adds and drops panel slots when items change', () => {
    const tabs = createNode(schemas.Tabs, 't1');
    const two = normalizeNode(
      { ...tabs, props: { items: [{ label: 'One' }, { label: 'Two' }] } },
      schemas.Tabs
    );
    assert.deepEqual(Object.keys(two.slots), ['items[0].content', 'items[1].content']);
    const one = normalizeNode({ ...two, props: { items: [{ label: 'One' }] } }, schemas.Tabs);
    assert.deepEqual(Object.keys(one.slots), ['items[0].content']);
  });

  it('applies allow and disallow rules', () => {
    const page: BuilderDocument = {
      ...doc,
      nodes: {
        ...doc.nodes,
        cols: createNode(schemas.Columns, 'cols'),
        tabs: createNode(schemas.Tabs, 'tabs'),
      },
    };
    assert.equal(canPlace(page, schemas, 'Columns', { parentId: 'cols', slot: 'column1' }), false);
    assert.equal(canPlace(page, schemas, 'Text', { parentId: 'cols', slot: 'column1' }), true);
    assert.equal(canPlace(page, schemas, 'Box', { parentId: 'tabs', slot: 'items[0].content' }), false);
    assert.equal(canPlace(page, schemas, 'Text', { parentId: 'tabs', slot: 'items[0].content' }), true);
    assert.equal(
      canPlace(page, schemas, 'Box', { parentId: 'box', slot: 'content' }, { movingId: 'box' }),
      false,
      'not inside itself'
    );
  });
});

describe('node meta', () => {
  it('survives a Puck round trip and stays out of props', async () => {
    const { documentToPuck, puckToDocument } = await import('../converter');
    const { updateMeta } = await import('../commands');
    const named = updateMeta(doc, 'a', { name: 'Intro', locked: true });
    assert.deepEqual(named.nodes.a.meta, { name: 'Intro', locked: true });
    const puck = documentToPuck(named);
    assert.deepEqual(puck.content[0].props.__editor, { name: 'Intro', locked: true });
    const back = puckToDocument(puck);
    const first = back.nodes[back.rootSlot[0]];
    assert.deepEqual(first.meta, { name: 'Intro', locked: true });
    assert.equal(first.props.__editor, undefined);
  });

  it('drops empty values', async () => {
    const { updateMeta } = await import('../commands');
    const named = updateMeta(doc, 'a', { name: 'Intro' });
    assert.equal(updateMeta(named, 'a', { name: '' }).nodes.a.meta, undefined);
  });
});
