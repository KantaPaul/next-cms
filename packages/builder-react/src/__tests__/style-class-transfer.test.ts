import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type BlockSchemas, type BuilderDocument, DOCUMENT_VERSION, type StyleClass } from '@nextcms/builder-core';
import { documentExportJson } from '../json-io';
import { createEditorStore } from '../store';
import { copyBlockStyle, getCopiedClassIds, pasteBlockStyle, setCopiedBlockStyles } from '../style-clipboard';
import {
  createStyleClassStore,
  importStyleClassBundle,
  type NewStyleClass,
  setStyleClassStore,
  type StyleClassAdapter,
} from '../style-classes';

const cls = (id: string, name: string, extra: Partial<StyleClass> = {}): StyleClass => ({
  id,
  siteId: 's',
  name,
  kind: 'class',
  variants: {},
  createdAt: '',
  updatedAt: '',
  ...extra,
});

function adapterWith(initial: StyleClass[], failNames: string[] = []) {
  const created: NewStyleClass[] = [];
  let n = 0;
  const adapter: StyleClassAdapter = {
    list: async () => initial,
    create: async input => {
      if (failNames.includes(input.name)) throw new Error('Design permission required');
      created.push(input);
      return cls(`new-${++n}`, input.name, { comboOf: input.comboOf, variants: input.variants ?? {} });
    },
    update: async (id, patch) => ({ ...cls(id, 'x'), ...patch }),
    remove: async () => {},
    usage: async () => [],
  };
  return { adapter, created };
}

describe('importStyleClassBundle', () => {
  it('reuses, creates bases first, and points combos at the new base', async () => {
    const { adapter, created } = adapterWith([cls('site-card', 'card')]);
    const store = createStyleClassStore(adapter);
    await store.load();
    const result = await importStyleClassBundle(store, [
      { id: 'src-lg', name: 'is-large', kind: 'class', comboOf: 'src-btn', variants: {} },
      { id: 'src-btn', name: 'button', kind: 'class', variants: { desktop: { color: '#000' } } },
      { id: 'src-card', name: 'card', kind: 'class', variants: {} },
    ]);
    assert.deepEqual(result.map, { 'src-btn': 'new-1', 'src-lg': 'new-2', 'src-card': 'site-card' });
    assert.equal(result.reused, 1);
    assert.equal(result.created, 2);
    assert.equal(created[1].comboOf, 'new-1');
  });

  it('reports a failed base and skips its combo', async () => {
    const { adapter } = adapterWith([], ['button']);
    const store = createStyleClassStore(adapter);
    await store.load();
    const result = await importStyleClassBundle(store, [
      { id: 'src-btn', name: 'button', kind: 'class', variants: {} },
      { id: 'src-lg', name: 'is-large', kind: 'class', comboOf: 'src-btn', variants: {} },
    ]);
    assert.deepEqual(result.failed, ['button', 'is-large']);
    assert.deepEqual(result.map, {});
  });
});

describe('style copy and paste with classes', () => {
  const schemas: BlockSchemas = { Heading: { type: 'Heading', label: 'Heading', defaultProps: { section: {} } } };
  const doc: BuilderDocument = {
    version: DOCUMENT_VERSION,
    root: { props: {} },
    rootSlot: ['a', 'b'],
    nodes: {
      a: { id: 'a', type: 'Heading', props: { section: { paddingY: 'lg' }, classIds: ['btn', 'lg'] }, slots: {} },
      b: { id: 'b', type: 'Heading', props: { classIds: ['card'] }, slots: {} },
    },
  };

  it('copies classes and pastes them with the styles in one undo step', () => {
    const store = createEditorStore({ document: doc, schemas });
    setCopiedBlockStyles(null);
    copyBlockStyle(store, 'a');
    assert.deepEqual(getCopiedClassIds(), ['btn', 'lg']);
    const steps = store.getState().history.past.length;
    assert.ok(pasteBlockStyle(store, 'b'));
    assert.deepEqual(store.getState().doc.nodes.b.props.classIds, ['btn', 'lg']);
    assert.equal((store.getState().doc.nodes.b.props.section as { paddingY?: string }).paddingY, 'lg');
    assert.equal(store.getState().history.past.length, steps + 1);
  });

  it('can paste only the block settings and keep the target classes', () => {
    const store = createEditorStore({ document: doc, schemas });
    copyBlockStyle(store, 'a');
    assert.ok(pasteBlockStyle(store, 'b', { classes: false }));
    assert.deepEqual(store.getState().doc.nodes.b.props.classIds, ['card']);
  });

  it('pastes classes from a block that has no other styles', () => {
    const plain = { ...doc, nodes: { ...doc.nodes, a: { ...doc.nodes.a, props: { classIds: ['btn'] } } } };
    const store = createEditorStore({ document: plain, schemas: { Heading: { type: 'Heading', label: 'Heading' } } });
    setCopiedBlockStyles(null);
    assert.ok(copyBlockStyle(store, 'a'));
    assert.ok(pasteBlockStyle(store, 'b'));
    assert.deepEqual(store.getState().doc.nodes.b.props.classIds, ['btn']);
  });
});

describe('documentExportJson', () => {
  it('adds the used classes to the file, and nothing when no class is used', async () => {
    const { adapter } = adapterWith([cls('btn', 'button', { variants: { desktop: { color: '#000' } } }), cls('other', 'other')]);
    const store = createStyleClassStore(adapter);
    await store.load();
    setStyleClassStore(store);
    const withClass: BuilderDocument = {
      version: DOCUMENT_VERSION,
      root: { props: {} },
      rootSlot: ['a'],
      nodes: { a: { id: 'a', type: 'Heading', props: { classIds: ['btn'] }, slots: {} } },
    };
    const file = JSON.parse(documentExportJson(withClass));
    assert.deepEqual(file.styleClasses.map((c: { name: string }) => c.name), ['button']);
    assert.deepEqual(file.nodes, withClass.nodes);
    const without = { ...withClass, nodes: { a: { ...withClass.nodes.a, props: {} } } };
    assert.equal('styleClasses' in JSON.parse(documentExportJson(without)), false);
    setStyleClassStore(null);
  });
});
