import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  type BuilderDocument,
  type BuilderNode,
  emptyDocument,
} from '../document';
import {
  ancestorIds,
  childIds,
  cloneSubtree,
  extractSubtree,
  findPosition,
  isInside,
  ROOT_SLOT,
  slotChildren,
  slotNames,
  subtreeIds,
  withSlotChildren,
} from '../tree';

function node(id: string, slots: Record<string, string[]> = {}): BuilderNode {
  return { id, type: 'Box', props: {}, slots };
}

function withNodes(...nodes: BuilderNode[]): BuilderDocument {
  const doc = emptyDocument();
  const byId: Record<string, BuilderNode> = {};
  for (const n of nodes) byId[n.id] = n;
  return { ...doc, nodes: byId };
}

describe('slotChildren / withSlotChildren', () => {
  it('reads and writes the root slot when parentId is null', () => {
    const doc = { ...emptyDocument(), rootSlot: ['a', 'b'] };
    assert.deepEqual(slotChildren(doc, { parentId: null, slot: ROOT_SLOT }), [
      'a',
      'b',
    ]);
    const next = withSlotChildren(doc, { parentId: null, slot: ROOT_SLOT }, [
      'b',
    ]);
    assert.deepEqual(next.rootSlot, ['b']);
  });

  it('reads and writes a node slot', () => {
    const doc = withNodes(node('a', { content: ['x'] }));
    assert.deepEqual(slotChildren(doc, { parentId: 'a', slot: 'content' }), [
      'x',
    ]);
    const next = withSlotChildren(doc, { parentId: 'a', slot: 'content' }, [
      'x',
      'y',
    ]);
    assert.deepEqual(next.nodes.a.slots.content, ['x', 'y']);
    assert.deepEqual(
      doc.nodes.a.slots.content,
      ['x'],
      'input document is untouched'
    );
  });

  it('returns an empty array and the input document unchanged for a missing parent', () => {
    const doc = withNodes(node('a'));
    assert.deepEqual(
      slotChildren(doc, { parentId: 'missing', slot: 'content' }),
      []
    );
    assert.equal(
      withSlotChildren(doc, { parentId: 'missing', slot: 'content' }, ['x']),
      doc
    );
  });
});

describe('findPosition', () => {
  it('finds a node in the root slot', () => {
    const doc = { ...emptyDocument(), rootSlot: ['a', 'b'] };
    assert.deepEqual(findPosition(doc, 'b'), {
      parentId: null,
      slot: ROOT_SLOT,
      index: 1,
    });
  });

  it('finds a node nested in a slot', () => {
    const doc = withNodes(node('a', { content: ['x', 'y'] }));
    assert.deepEqual(findPosition(doc, 'y'), {
      parentId: 'a',
      slot: 'content',
      index: 1,
    });
  });

  it('returns null for a node not attached to the tree', () => {
    const doc = withNodes(node('a'));
    assert.equal(findPosition(doc, 'ghost'), null);
  });
});

describe('slotNames / childIds / subtreeIds', () => {
  it('lists slot names in insertion order', () => {
    const n = node('a', { left: [], right: [] });
    assert.deepEqual(slotNames(n), ['left', 'right']);
  });

  it('flattens children across every slot in slot order', () => {
    const n = node('a', { left: ['l1'], right: ['r1', 'r2'] });
    assert.deepEqual(childIds(n), ['l1', 'r1', 'r2']);
  });

  it('collects a node and every descendant', () => {
    const doc = withNodes(
      node('a', { content: ['b'] }),
      node('b', { content: ['c'] }),
      node('c')
    );
    assert.deepEqual(subtreeIds(doc, 'a'), ['a', 'b', 'c']);
  });

  it('returns an empty array for a node that does not exist', () => {
    const doc = withNodes(node('a'));
    assert.deepEqual(subtreeIds(doc, 'ghost'), []);
  });
});

describe('isInside / ancestorIds', () => {
  const doc = withNodes(
    node('a', { content: ['b'] }),
    node('b', { content: ['c'] }),
    node('c')
  );

  it('reports whether a node is inside an ancestor, including itself', () => {
    assert.equal(isInside(doc, 'a', 'c'), true);
    assert.equal(isInside(doc, 'a', 'a'), true);
    assert.equal(isInside(doc, 'b', 'a'), false);
  });

  it('lists ancestors nearest-first, and an empty list at the root', () => {
    assert.deepEqual(ancestorIds(doc, 'c'), ['b', 'a']);
    assert.deepEqual(ancestorIds(doc, 'a'), []);
  });
});

describe('extractSubtree / cloneSubtree', () => {
  const doc = withNodes(node('a', { content: ['b'] }), node('b'));

  it('extracts a node and its descendants, or null if missing', () => {
    const subtree = extractSubtree(doc, 'a');
    assert.ok(subtree);
    assert.deepEqual(Object.keys(subtree.nodes).sort(), ['a', 'b']);
    assert.equal(extractSubtree(doc, 'ghost'), null);
  });

  it('clones with fresh ids and keeps the shape, including a node-id prop', () => {
    const withIdProp = withNodes(
      { ...node('a', { content: ['b'] }), props: { id: 'a' } },
      node('b')
    );
    const subtree = extractSubtree(withIdProp, 'a');
    assert.ok(subtree);
    let n = 0;
    const clone = cloneSubtree(subtree, () => `clone-${n++}`);
    assert.notEqual(clone.rootId, 'a');
    assert.equal(Object.keys(clone.nodes).length, 2);
    const root = clone.nodes[clone.rootId];
    assert.equal(
      root.props.id,
      clone.rootId,
      'a node-id prop is remapped to the new id'
    );
    assert.deepEqual(root.slots.content, [
      clone.nodes[root.slots.content[0]].id,
    ]);
  });
});
