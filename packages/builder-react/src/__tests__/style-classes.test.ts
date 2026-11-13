import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  type BlockSchemas,
  type BuilderDocument,
  DOCUMENT_VERSION,
  setNodeClasses,
  type StyleClass,
} from '@nextcms/builder-core';
import { createEditorStore } from '../store';
import {
  createStyleClassStore,
  importLegacyStyleClasses,
  LEGACY_STYLE_CLASS_KEY,
  type NewStyleClass,
  slugifyClassName,
  type StyleClassAdapter,
  type StyleClassPatch,
  uniqueClassName,
} from '../style-classes';

const cls = (id: string, name: string, extra: Partial<StyleClass> = {}): StyleClass => ({
  id,
  siteId: 's1',
  name,
  kind: 'class',
  variants: {},
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...extra,
});

/** An in-memory adapter that records calls and can be told to fail. */
function fakeAdapter(initial: StyleClass[] = []) {
  const rows = new Map(initial.map(row => [row.id, row]));
  let next = 1;
  const calls = { create: [] as NewStyleClass[], update: [] as [string, StyleClassPatch][], remove: [] as string[] };
  const failures = { create: false, update: false, remove: false, list: false };
  const adapter: StyleClassAdapter = {
    async list() {
      if (failures.list) throw new Error('list failed');
      return [...rows.values()];
    },
    async create(input) {
      calls.create.push(input);
      if (failures.create) throw new Error(`A class named "${input.name}" already exists on this site.`);
      const row = cls(`srv-${next++}`, input.name, { comboOf: input.comboOf, variants: input.variants ?? {} });
      rows.set(row.id, row);
      return row;
    },
    async update(id, patch) {
      calls.update.push([id, patch]);
      if (failures.update) throw new Error('save failed');
      const row = { ...rows.get(id)!, ...patch };
      rows.set(id, row);
      return row;
    },
    async remove(id) {
      calls.remove.push(id);
      if (failures.remove) throw new Error('This class is used by 2 elements.');
      rows.delete(id);
    },
    async usage() {
      return [];
    },
  };
  return { adapter, calls, failures, rows };
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('slugifyClassName / uniqueClassName', () => {
  it('turns free-form names into valid class names', () => {
    assert.equal(slugifyClassName('My Card'), 'my-card');
    assert.equal(slugifyClassName('  Héro — Large! '), 'hero-large');
    assert.equal(slugifyClassName('2 col'), 'c-2-col');
    assert.equal(slugifyClassName('!!!'), '');
  });

  it('adds a number suffix until the name is free', () => {
    assert.equal(uniqueClassName('card', []), 'card');
    assert.equal(uniqueClassName('card', ['card', 'card-2']), 'card-3');
  });
});

describe('style class store (KRK-01)', () => {
  it('loads classes and keeps the same state object until something changes', async () => {
    const { adapter } = fakeAdapter([cls('a', 'card')]);
    const store = createStyleClassStore(adapter);
    await store.load();
    const first = store.getState();
    assert.equal(first.status, 'ready');
    assert.deepEqual(Object.keys(first.classes), ['a']);
    assert.equal(store.getState(), first);
  });

  it('reports a failed load without throwing', async () => {
    const { adapter, failures } = fakeAdapter();
    failures.list = true;
    const errors: string[] = [];
    const store = createStyleClassStore(adapter, { onError: message => errors.push(message) });
    await store.load();
    assert.equal(store.getState().status, 'error');
    assert.equal(store.getState().error, 'list failed');
    assert.deepEqual(errors, ['list failed']);
  });

  it('creates through the server and keeps the server id', async () => {
    const { adapter } = fakeAdapter();
    const store = createStyleClassStore(adapter);
    const created = await store.createClass({ name: 'card', kind: 'class' });
    assert.equal(created.id, 'srv-1');
    assert.deepEqual(Object.keys(store.getState().classes), ['srv-1']);
  });

  it('sets the error and rethrows when create fails', async () => {
    const { adapter, failures } = fakeAdapter();
    failures.create = true;
    const store = createStyleClassStore(adapter);
    await assert.rejects(store.createClass({ name: 'card', kind: 'class' }), /already exists/);
    assert.match(store.getState().error ?? '', /already exists/);
    assert.deepEqual(store.getState().classes, {});
  });

  it('applies edits at once and saves them merged after the debounce', async () => {
    const { adapter, calls } = fakeAdapter([cls('a', 'card')]);
    const store = createStyleClassStore(adapter, { debounceMs: 10 });
    await store.load();
    store.updateClass('a', { name: 'card-big' });
    store.updateClass('a', { variants: { desktop: { color: '#000' } } });
    assert.equal(store.getState().classes.a.name, 'card-big');
    assert.equal(store.getState().pending, 1);
    assert.equal(calls.update.length, 0);
    await wait(30);
    assert.deepEqual(calls.update, [['a', { name: 'card-big', variants: { desktop: { color: '#000' } } }]]);
    assert.equal(store.getState().pending, 0);
  });

  it('rolls back to the last saved copy when a save fails, without throwing', async () => {
    const { adapter, failures } = fakeAdapter([cls('a', 'card')]);
    const store = createStyleClassStore(adapter, { debounceMs: 1000 });
    await store.load();
    store.updateClass('a', { name: 'saved-name' });
    await store.flush();
    failures.update = true;
    store.updateClass('a', { name: 'bad-name' });
    assert.equal(store.getState().classes.a.name, 'bad-name');
    await store.flush();
    assert.equal(store.getState().classes.a.name, 'saved-name');
    assert.equal(store.getState().error, 'save failed');
  });

  it('keeps an edit made while the previous save was in flight', async () => {
    const { adapter } = fakeAdapter([cls('a', 'card')]);
    const store = createStyleClassStore(adapter, { debounceMs: 1000 });
    await store.load();
    store.updateClass('a', { name: 'first' });
    const saving = store.flush();
    store.updateClass('a', { name: 'second' });
    await saving;
    assert.equal(store.getState().classes.a.name, 'second');
    await store.flush();
    assert.equal(store.getState().classes.a.name, 'second');
  });

  it('removes a class with its combos and drops their queued edits', async () => {
    const { adapter, calls } = fakeAdapter([cls('base', 'button'), cls('combo', 'is-large', { comboOf: 'base' })]);
    const store = createStyleClassStore(adapter, { debounceMs: 10 });
    await store.load();
    store.updateClass('combo', { name: 'is-huge' });
    await store.removeClass('base');
    assert.deepEqual(store.getState().classes, {});
    await wait(30);
    assert.deepEqual(calls.update, []);
    assert.deepEqual(calls.remove, ['base']);
  });

  it('restores the class and rethrows when the server refuses the delete', async () => {
    const { adapter, failures } = fakeAdapter([cls('a', 'card')]);
    failures.remove = true;
    const store = createStyleClassStore(adapter);
    await store.load();
    await assert.rejects(store.removeClass('a'), /used by 2 elements/);
    assert.equal(store.getState().classes.a.name, 'card');
    assert.match(store.getState().error ?? '', /used by 2 elements/);
  });
});

describe('importLegacyStyleClasses', () => {
  const storage = (value: string | null) => {
    let stored = value;
    return {
      getItem: (key: string) => (key === LEGACY_STYLE_CLASS_KEY ? stored : null),
      removeItem: () => {
        stored = null;
      },
      get value() {
        return stored;
      },
    };
  };

  it('imports slugified names, skips existing ones, and clears the key', async () => {
    const { adapter, calls } = fakeAdapter([cls('a', 'card')]);
    const store = createStyleClassStore(adapter);
    await store.load();
    const local = storage(JSON.stringify({ classes: { x: { name: 'Card' }, y: { name: 'Hero Big' }, z: { name: 'hero big' } } }));
    const result = await importLegacyStyleClasses(store, local);
    assert.deepEqual(result, { imported: 1, failed: 0 });
    assert.deepEqual(calls.create.map(c => c.name), ['hero-big']);
    assert.equal(local.value, null);
  });

  it('keeps the key when a create fails, so it is retried', async () => {
    const { adapter, failures } = fakeAdapter();
    failures.create = true;
    const store = createStyleClassStore(adapter);
    const local = storage(JSON.stringify({ classes: { x: { name: 'card' } } }));
    const result = await importLegacyStyleClasses(store, local);
    assert.deepEqual(result, { imported: 0, failed: 1 });
    assert.notEqual(local.value, null);
  });

  it('clears an unreadable key and does nothing without one', async () => {
    const { adapter, calls } = fakeAdapter();
    const store = createStyleClassStore(adapter);
    const broken = storage('{not json');
    assert.deepEqual(await importLegacyStyleClasses(store, broken), { imported: 0, failed: 0 });
    assert.equal(broken.value, null);
    assert.deepEqual(await importLegacyStyleClasses(store, storage(null)), { imported: 0, failed: 0 });
    assert.deepEqual(calls.create, []);
  });
});

describe('editor store class commands', () => {
  const schemas: BlockSchemas = { Text: { type: 'Text', label: 'Text' } };
  const doc: BuilderDocument = {
    version: DOCUMENT_VERSION,
    root: { props: {} },
    nodes: { a: { id: 'a', type: 'Text', props: {}, slots: {} } },
    rootSlot: ['a'],
  };
  const classIds = (store: ReturnType<typeof createEditorStore>) => store.getState().doc.nodes.a.props.classIds;

  it('adds, reorders and removes classes, one undo step each', () => {
    const store = createEditorStore({ document: doc, schemas });
    assert.ok(store.addNodeClass('a', 'btn'));
    assert.ok(store.addNodeClass('a', 'large'));
    assert.ok(store.reorderNodeClasses('a', ['large', 'btn']));
    assert.ok(store.removeNodeClass('a', 'btn'));
    assert.deepEqual(classIds(store), ['large']);
    assert.equal(store.getState().history.past.length, 4);
    store.undo();
    assert.deepEqual(classIds(store), ['large', 'btn']);
  });

  it('records nothing when the class list would not change', () => {
    const store = createEditorStore({ document: doc, schemas });
    store.addNodeClass('a', 'btn');
    const steps = store.getState().history.past.length;
    assert.equal(store.addNodeClass('a', 'btn'), false);
    assert.equal(store.removeNodeClass('a', 'other'), false);
    assert.equal(store.setNodeClasses('a', ['btn', 'btn']), false);
    assert.equal(store.getState().history.past.length, steps);
  });

  it('drops duplicates and empty ids', () => {
    const store = createEditorStore({ document: doc, schemas });
    store.setNodeClasses('a', ['btn', '', 'btn', 'large']);
    assert.deepEqual(classIds(store), ['btn', 'large']);
  });

  it('core setNodeClasses returns the same document when nothing changes', () => {
    const withClass = setNodeClasses(doc, 'a', ['btn']);
    assert.equal(setNodeClasses(withClass, 'a', ['btn']), withClass);
    assert.equal(setNodeClasses(doc, 'missing', ['btn']), doc);
  });
});
