import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { type BlockSchemas, type BuilderDocument, DEFAULT_BREAKPOINTS, DOCUMENT_VERSION, type StyleClass } from '@nextcms/builder-core';
import { ClassesView, classLabel, sortAndFilterClasses, unusedClasses, variantRows } from '../classes-view';
import { EditorProvider } from '../context';
import { createEditorStore } from '../store';
import { createStyleClassStore, setStyleClassStore, type StyleClassAdapter } from '../style-classes';

const cls = (id: string, name: string, extra: Partial<StyleClass> = {}): StyleClass => ({
  id,
  siteId: 's',
  name,
  kind: 'class',
  variants: {},
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...extra,
});

const classes: Record<string, StyleClass> = {
  btn: cls('btn', 'button', { updatedAt: '2026-03-01' }),
  lg: cls('lg', 'is-large', { comboOf: 'btn' }),
  card: cls('card', 'card', { updatedAt: '2026-02-01' }),
  old: cls('old', 'old-hero'),
  h1: cls('h1', 'h1', { kind: 'tag', tag: 'h1' }),
};
const list = Object.values(classes).filter(c => c.kind === 'class');

describe('Classes manager helpers (KRK-04)', () => {
  it('labels classes, combos and tag styles', () => {
    assert.equal(classLabel(classes.card, classes), '.card');
    assert.equal(classLabel(classes.lg, classes), '.button.is-large');
    assert.equal(classLabel(classes.h1, classes), '<h1>');
  });

  it('searches by label, with or without the leading dot', () => {
    const names = (q: string) => sortAndFilterClasses(list, q, 'name', null, classes).map(c => c.id);
    assert.deepEqual(names('.butt'), ['btn', 'lg']);
    assert.deepEqual(names('large'), ['lg']);
    assert.deepEqual(names(''), ['btn', 'lg', 'card', 'old']);
  });

  it('sorts by usage, recency and unused first', () => {
    const counts = { btn: 5, card: 2, lg: 1 };
    const ids = (sort: 'usage' | 'recent' | 'unused') => sortAndFilterClasses(list, '', sort, counts, classes).map(c => c.id);
    assert.deepEqual(ids('usage'), ['btn', 'card', 'lg', 'old']);
    assert.deepEqual(ids('recent'), ['btn', 'card', 'lg', 'old']);
    assert.deepEqual(ids('unused'), ['old', 'lg', 'card', 'btn']);
  });

  it('finds unused classes, keeping bases of used combos, page uses and tag styles', () => {
    assert.deepEqual(unusedClasses(classes, null, new Set()), [], 'unknown counts: never call anything unused');
    const unused = (counts: Record<string, number>, page: string[] = []) =>
      unusedClasses(classes, counts, new Set(page)).map(c => c.id).sort();
    assert.deepEqual(unused({ lg: 1 }), ['card', 'old'], 'btn is the base of a used combo');
    assert.deepEqual(unused({}, ['card']), ['btn', 'lg', 'old']);
    assert.ok(!unused({}).includes('h1'));
  });

  it('lists variants in cascade order, state-less first', () => {
    const rows = variantRows(
      cls('x', 'x', {
        variants: {
          mobile: { color: '#3' },
          'desktop:hover': { color: '#2' },
          desktop: { paddingTop: '8px', color: '#1' },
          tablet: {},
        },
      }),
      DEFAULT_BREAKPOINTS
    );
    assert.deepEqual(
      rows.map(r => r.key),
      ['desktop', 'desktop:hover', 'mobile']
    );
    assert.deepEqual(rows[0].declarations, [
      ['color', '#1'],
      ['paddingTop', '8px'],
    ]);
  });
});

describe('ClassesView rendering', () => {
  it('shows tag styles, classes, the tag picker and a disabled clean-up before counts load', async () => {
    const adapter: StyleClassAdapter = {
      list: async () => Object.values(classes),
      create: async input => cls('new', input.name),
      update: async (id, patch) => ({ ...classes[id], ...patch }),
      remove: async () => {},
      usage: async () => [],
      usageCounts: async () => ({}),
    };
    const classStore = createStyleClassStore(adapter);
    await classStore.load();
    setStyleClassStore(classStore);
    const schemas: BlockSchemas = { Heading: { type: 'Heading', label: 'Heading' } };
    const doc: BuilderDocument = { version: DOCUMENT_VERSION, root: { props: {} }, rootSlot: [], nodes: {} };
    const store = createEditorStore({ document: doc, schemas });
    const html = renderToStaticMarkup(
      <EditorProvider store={store}>
        <ClassesView tags={['h1', 'h2', 'p']} />
      </EditorProvider>
    );
    assert.match(html, /&lt;h1&gt;/);
    assert.match(html, /\.button\.is-large/);
    assert.match(html, /Classes \(4\)/);
    assert.match(html, /<option value="h2">/);
    assert.doesNotMatch(html, /<option value="h1">/, 'h1 already has a tag style');
    assert.match(html, /<button[^>]*disabled=""[^>]*>Clean up unused classes<\/button>/);
  });
});
