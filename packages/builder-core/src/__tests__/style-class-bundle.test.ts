import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type BuilderDocument, DOCUMENT_VERSION } from '../document';
import {
  bundleStyleClasses,
  type BundledStyleClass,
  planStyleClassImport,
  remapDocumentClassIds,
  splitStyleClassBundle,
} from '../style-class-bundle';
import type { StyleClass } from '../style-classes';

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

const doc = (classIds: Record<string, string[] | undefined>): BuilderDocument => ({
  version: DOCUMENT_VERSION,
  root: { props: {} },
  rootSlot: Object.keys(classIds),
  nodes: Object.fromEntries(
    Object.entries(classIds).map(([id, ids]) => [id, { id, type: 'Heading', props: ids ? { classIds: ids } : {}, slots: {} }])
  ),
});

const bundled = (id: string, name: string, extra: Partial<BundledStyleClass> = {}): BundledStyleClass => ({
  id,
  name,
  kind: 'class',
  variants: {},
  ...extra,
});

describe('style class bundles (KRK-01, step 1.8)', () => {
  it('bundles the classes a document uses plus their combo bases', () => {
    const classes = {
      btn: cls('btn', 'button', { variants: { desktop: { color: '#000' } } }),
      lg: cls('lg', 'is-large', { comboOf: 'btn' }),
      unused: cls('unused', 'unused'),
    };
    const result = bundleStyleClasses(doc({ a: ['lg'] }), classes);
    assert.deepEqual(result, [
      { id: 'btn', name: 'button', kind: 'class', variants: { desktop: { color: '#000' } } },
      { id: 'lg', name: 'is-large', kind: 'class', comboOf: 'btn', variants: {} },
    ]);
    assert.deepEqual(bundleStyleClasses(doc({ a: undefined }), classes), []);
  });

  it('splits a file into document and bundle, ignoring malformed entries', () => {
    const plain = { version: 1, nodes: {} };
    assert.deepEqual(splitStyleClassBundle(plain), { document: plain, bundle: [] });
    const { document, bundle } = splitStyleClassBundle({
      version: 1,
      nodes: {},
      styleClasses: [bundled('a', 'card'), { id: 1, name: 'bad' }, { id: 'b', name: 'x', kind: 'other', variants: {} }],
    });
    assert.deepEqual(document, { version: 1, nodes: {} });
    assert.deepEqual(bundle.map(b => b.id), ['a']);
  });

  describe('planStyleClassImport', () => {
    it('reuses a class with the same name and styles', () => {
      const existing = [cls('site-card', 'card', { variants: { desktop: { color: '#000' } } })];
      const steps = planStyleClassImport([bundled('src-card', 'card', { variants: { desktop: { color: '#000' } } })], existing);
      assert.deepEqual(steps, [{ action: 'reuse', sourceId: 'src-card', targetId: 'site-card' }]);
    });

    it('creates a renamed class when the name is taken by different styles', () => {
      const existing = [cls('x', 'card', { variants: { desktop: { color: '#000' } } }), cls('y', 'card-2')];
      const steps = planStyleClassImport([bundled('src', 'card', { variants: { desktop: { color: '#fff' } } })], existing);
      assert.equal(steps[0].action, 'create');
      assert.equal(steps[0].action === 'create' && steps[0].name, 'card-3');
    });

    it('creates bases before combos and reuses a combo only with its reused base', () => {
      const existing = [cls('b1', 'button'), cls('c1', 'is-large', { comboOf: 'b1' })];
      const reuseBoth = planStyleClassImport(
        [bundled('src-lg', 'is-large', { comboOf: 'src-btn' }), bundled('src-btn', 'button')],
        existing
      );
      assert.deepEqual(reuseBoth, [
        { action: 'reuse', sourceId: 'src-btn', targetId: 'b1' },
        { action: 'reuse', sourceId: 'src-lg', targetId: 'c1' },
      ]);
      const newBase = planStyleClassImport(
        [bundled('src-lg', 'is-large', { comboOf: 'src-btn' }), bundled('src-btn', 'button', { variants: { desktop: { color: '#f00' } } })],
        existing
      );
      assert.deepEqual(
        newBase.map(step => [step.action, step.sourceId, step.action === 'create' ? step.name : step.targetId]),
        [
          ['create', 'src-btn', 'button-2'],
          ['create', 'src-lg', 'is-large-2'],
        ]
      );
      assert.equal(newBase[1].action === 'create' && newBase[1].comboOfSource, 'src-btn');
    });

    it('skips a combo whose base is not in the bundle, and reuses a site tag style', () => {
      const existing = [cls('site-h1', 'h1', { kind: 'tag', tag: 'h1' })];
      const steps = planStyleClassImport(
        [bundled('orphan', 'is-large', { comboOf: 'gone' }), bundled('src-h1', 'h1', { kind: 'tag', tag: 'h1', variants: { desktop: { color: '#f00' } } })],
        existing
      );
      assert.deepEqual(steps, [{ action: 'reuse', sourceId: 'src-h1', targetId: 'site-h1' }]);
    });
  });

  describe('remapDocumentClassIds', () => {
    it('maps ids, drops unknown ones, and removes emptied lists', () => {
      const source = doc({ a: ['x', 'y'], b: ['gone'], c: undefined });
      const result = remapDocumentClassIds(source, { x: 'X', y: 'X' });
      assert.deepEqual(result.nodes.a.props.classIds, ['X']);
      assert.equal('classIds' in result.nodes.b.props, false);
      assert.equal(result.nodes.c, source.nodes.c);
    });

    it('returns the same document when nothing changes', () => {
      const source = doc({ a: ['x'] });
      assert.equal(remapDocumentClassIds(source, { x: 'x' }), source);
    });
  });
});
