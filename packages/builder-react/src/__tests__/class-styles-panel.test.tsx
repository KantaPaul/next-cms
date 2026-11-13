import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { type BlockSchemas, type BuilderDocument, DOCUMENT_VERSION, type StyleClass } from '@nextcms/builder-core';
import { ClassStylesPanel, classChips, classToAdd, nodesUsingClass, SelectedClassStyles } from '../class-styles-panel';
import { EditorProvider } from '../context';
import { createEditorStore } from '../store';
import { createStyleClassStore, setStyleClassStore, type StyleClassAdapter } from '../style-classes';

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

const classes = {
  btn: cls('btn', 'button', { variants: { desktop: { color: '#000' } } }),
  lg: cls('lg', 'is-large', { comboOf: 'btn' }),
  card: cls('card', 'card'),
};

const schemas: BlockSchemas = { Heading: { type: 'Heading', label: 'Heading' } };
const doc: BuilderDocument = {
  version: DOCUMENT_VERSION,
  root: { props: {} },
  rootSlot: ['a', 'b'],
  nodes: {
    a: { id: 'a', type: 'Heading', props: { classIds: ['btn', 'lg'] }, slots: {} },
    b: { id: 'b', type: 'Heading', props: { classIds: ['btn'] }, slots: {} },
  },
};

describe('class panel helpers (KRK-03)', () => {
  it('builds chips in order, marking combos and deleted classes', () => {
    assert.deepEqual(classChips(['btn', 'lg', 'gone'], classes), [
      { id: 'btn', name: 'button', combo: false, missing: false },
      { id: 'lg', name: 'is-large', combo: true, missing: false },
      { id: 'gone', name: 'missing class', combo: false, missing: true },
    ]);
    assert.equal(classChips(['lg'], classes)[0].combo, false, 'a combo without its base before it is not drawn attached');
    assert.deepEqual(classChips(undefined, classes), []);
  });

  it('applies an existing class, creates a combo on a block with a base, or a plain class otherwise', () => {
    assert.deepEqual(classToAdd('Card', ['btn'], classes), { kind: 'apply', id: 'card' });
    assert.equal(classToAdd('button', ['btn'], classes), null, 'already on the block');
    assert.deepEqual(classToAdd('Is Wide', ['btn'], classes), { kind: 'create', name: 'is-wide', comboOf: 'btn' });
    assert.deepEqual(classToAdd('hero', [], classes), { kind: 'create', name: 'hero' });
    assert.equal(classToAdd('!!!', [], classes), null);
  });

  it('finds the blocks on the page that use a class', () => {
    assert.deepEqual(nodesUsingClass(doc, 'btn').sort(), ['a', 'b']);
    assert.deepEqual(nodesUsingClass(doc, 'card'), []);
  });
});

describe('class edit target in the editor store', () => {
  it('sets a class and state, and drops the state with the class', () => {
    const store = createEditorStore({ document: doc, schemas });
    store.select('a');
    store.setClassEdit({ classId: 'btn', state: 'hover' });
    assert.deepEqual(store.getState().classEdit, { classId: 'btn', state: 'hover' });
    const before = store.getState();
    store.setClassEdit({ classId: 'btn', state: 'hover' });
    assert.equal(store.getState(), before, 'no change, no new state');
    store.setClassEdit({ classId: null });
    assert.deepEqual(store.getState().classEdit, { classId: null, state: null });
  });

  it('resets when another block is selected, not when the same one is', () => {
    const store = createEditorStore({ document: doc, schemas });
    store.select('a');
    store.setClassEdit({ classId: 'btn', state: 'hover' });
    store.select('a');
    assert.equal(store.getState().classEdit.classId, 'btn');
    store.select('b');
    assert.deepEqual(store.getState().classEdit, { classId: null, state: null });
  });
});

describe('ClassStylesPanel rendering', () => {
  const adapter: StyleClassAdapter = {
    list: async () => Object.values(classes),
    create: async input => cls('new', input.name),
    update: async (id, patch) => ({ ...classes[id as keyof typeof classes], ...patch }),
    remove: async () => {},
    usage: async () => [],
  };

  const setup = async (classId: string | null, state: string | null = null) => {
    const classStore = createStyleClassStore(adapter);
    await classStore.load();
    setStyleClassStore(classStore);
    const store = createEditorStore({ document: doc, schemas });
    store.select('a');
    store.setClassEdit({ classId, state });
    return store;
  };

  it('shows the block classes and the hint when no class is chosen', async () => {
    const store = await setup(null);
    const html = renderToStaticMarkup(
      <EditorProvider store={store}>
        <ClassStylesPanel nodeId="a" />
      </EditorProvider>
    );
    assert.match(html, /\.button/);
    assert.match(html, /\.is-large/);
    assert.match(html, /Choose a class to edit its styles/);
    assert.doesNotMatch(html, /Typography/);
  });

  it('shows the state picker and CSS editor with an own value for the chosen class', async () => {
    const store = await setup('btn');
    const html = renderToStaticMarkup(
      <EditorProvider store={store}>
        <ClassStylesPanel nodeId="a" />
      </EditorProvider>
    );
    assert.match(html, /id="class-state"/);
    assert.match(html, /Typography/);
    assert.match(html, /value="#000"/);
    assert.match(html, /title="Set here"/);
  });

  it('shows an inherited value and Content for ::before', async () => {
    const store = await setup('btn', 'before');
    const html = renderToStaticMarkup(
      <EditorProvider store={store}>
        <ClassStylesPanel nodeId="a" />
      </EditorProvider>
    );
    assert.match(html, /placeholder="#000"/);
    assert.match(html, /Inherited from Desktop/);
    assert.match(html, /for="class-content"/);
  });

  it('SelectedClassStyles renders only for supported, single selections', async () => {
    const store = await setup(null);
    const render = (supports: (type: string) => boolean) =>
      renderToStaticMarkup(
        <EditorProvider store={store}>
          <SelectedClassStyles supports={supports} />
        </EditorProvider>
      );
    assert.match(render(() => true), /Class styles/);
    assert.equal(render(() => false), '');
    store.select(['a', 'b']);
    assert.equal(render(() => true), '');
  });
});
