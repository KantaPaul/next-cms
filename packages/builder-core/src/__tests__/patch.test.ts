import { describe, it } from 'node:test';
import assert from 'node:assert';
import { insertSubtree, moveNode, removeNode, updateProps, updateRootProps } from '../commands';
import { DOCUMENT_VERSION, type BuilderDocument } from '../document';
import { applyPatch, diffDocuments, documentProblems, isEmptyPatch } from '../patch';

const doc: BuilderDocument = {
  version: DOCUMENT_VERSION,
  root: { props: { maxWidth: 'xl' } },
  nodes: {
    a: { id: 'a', type: 'Text', props: { text: 'A' }, slots: {} },
    box: { id: 'box', type: 'Box', props: {}, slots: { content: ['b'] } },
    b: { id: 'b', type: 'Text', props: { text: 'B' }, slots: {} },
  },
  rootSlot: ['a', 'box'],
};

describe('diffDocuments and applyPatch', () => {
  it('finds nothing when nothing changed', () => {
    assert.ok(isEmptyPatch(diffDocuments(doc, doc)));
    assert.ok(isEmptyPatch(diffDocuments(doc, structuredClone(doc))), 'equal copies are not changes');
  });

  it('sends only the changed node for a prop edit', () => {
    const next = updateProps(doc, 'b', { text: 'Bee' });
    const patch = diffDocuments(doc, next);
    assert.deepEqual(Object.keys(patch.upsert), ['b']);
    assert.equal(patch.rootSlot, undefined);
    assert.deepEqual(applyPatch(doc, patch), next);
  });

  it('covers moves, inserts, removals, and page settings', () => {
    let next = moveNode(doc, 'a', { parentId: 'box', slot: 'content', index: 1 });
    next = insertSubtree(next, { rootId: 'c', nodes: { c: { id: 'c', type: 'Text', props: {}, slots: {} } } }, { parentId: null, slot: 'root', index: 0 });
    next = removeNode(next, 'b');
    next = updateRootProps(next, { maxWidth: 'lg' });
    const patch = diffDocuments(doc, next);
    assert.deepEqual(patch.remove, ['b']);
    assert.deepEqual(patch.rootSlot, ['c', 'box']);
    assert.deepEqual(patch.root, { props: { maxWidth: 'lg' } });
    assert.deepEqual(applyPatch(doc, patch), next);
  });

  it('is far smaller than the document for a one-block edit on a large page', () => {
    const nodes: BuilderDocument['nodes'] = {};
    const rootSlot = Array.from({ length: 500 }, (_, i) => {
      nodes[`n${i}`] = { id: `n${i}`, type: 'Hero', props: { title: 'A headline that explains what you do', subtitle: 'One or two sentences.' }, slots: {} };
      return `n${i}`;
    });
    const big: BuilderDocument = { ...doc, nodes, rootSlot };
    const patch = diffDocuments(big, updateProps(big, 'n42', { title: 'Changed' }));
    assert.ok(JSON.stringify(patch).length * 100 < JSON.stringify(big).length);
  });
});

describe('documentProblems', () => {
  it('accepts a sound document and reports broken ones', () => {
    assert.deepEqual(documentProblems(doc), []);
    const dangling = { ...doc, rootSlot: ['a', 'box', 'ghost'] };
    assert.match(documentProblems(dangling)[0], /missing node ghost/);
    const twice = { ...doc, rootSlot: ['a', 'box', 'b'] };
    assert.match(documentProblems(twice)[0], /node b is in/);
    const orphan = { ...doc, nodes: { ...doc.nodes, z: { id: 'z', type: 'Text', props: {}, slots: {} } } };
    assert.match(documentProblems(orphan)[0], /not on the page/);
  });
});
