import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectClassUsage,
  comboBaseProblem,
  countClassUsage,
  inUseMessage,
  styleClassesTag,
  styleClassWriteError,
} from '../style-classes.rules';

describe('style class rules (KRK-01)', () => {
  describe('collectClassUsage', () => {
    it('finds nodes in a BuilderDocument by node id', () => {
      const doc = {
        version: 1,
        root: { props: {} },
        rootSlot: ['a', 'b'],
        nodes: {
          a: { id: 'a', type: 'Container', props: { classIds: ['card', 'is-large'] }, slots: { content: ['c'] } },
          b: { id: 'b', type: 'Heading', props: { classIds: ['title'] }, slots: {} },
          c: { id: 'c', type: 'Text', props: { classIds: ['card'] }, slots: {} },
        },
      };
      assert.deepEqual(collectClassUsage(doc, 'card'), ['a', 'c']);
      assert.deepEqual(collectClassUsage(doc, 'title'), ['b']);
      assert.deepEqual(collectClassUsage(doc, 'missing'), []);
    });

    it('finds nodes in legacy Puck data by props.id, including zones', () => {
      const data = {
        root: { props: {} },
        content: [{ type: 'Section', props: { id: 's1', classIds: ['card'] } }],
        zones: { 's1:content': [{ type: 'Text', props: { id: 't1', classIds: ['card'] } }] },
      };
      assert.deepEqual(collectClassUsage(data, 'card'), ['s1', 't1']);
    });

    it('ignores classIds without a node id and non-array classIds', () => {
      assert.deepEqual(collectClassUsage({ props: { classIds: ['card'] } }, 'card'), []);
      assert.deepEqual(collectClassUsage({ id: 'x', props: { classIds: 'card' } }, 'card'), []);
      assert.deepEqual(collectClassUsage(null, 'card'), []);
    });

    it('does not loop on shared or repeated objects', () => {
      const shared = { id: 'n', props: { classIds: ['card'] } };
      assert.deepEqual(collectClassUsage({ a: shared, b: [shared, shared] }, 'card'), ['n']);
    });
  });

  describe('comboBaseProblem', () => {
    it('accepts a plain class on the same site', () => {
      assert.equal(comboBaseProblem({ siteId: 's', kind: 'class', comboOf: null }, 's'), null);
    });

    it('rejects a missing base, another site, tag styles and nested combos', () => {
      assert.match(comboBaseProblem(undefined, 's') ?? '', /does not exist/);
      assert.match(comboBaseProblem({ siteId: 'other', kind: 'class' }, 's') ?? '', /does not exist/);
      assert.match(comboBaseProblem({ siteId: 's', kind: 'tag' }, 's') ?? '', /Tag styles/);
      assert.match(comboBaseProblem({ siteId: 's', kind: 'class', comboOf: 'x' }, 's') ?? '', /combo class cannot/);
    });
  });

  describe('inUseMessage', () => {
    it('is null when nothing uses the class', () => {
      assert.equal(inUseMessage(0, 0), null);
    });

    it('counts elements and combos with correct plurals', () => {
      assert.match(inUseMessage(1, 0) ?? '', /used by 1 element\./);
      assert.match(inUseMessage(3, 2) ?? '', /used by 3 elements and 2 combo classes\./);
      assert.match(inUseMessage(0, 1) ?? '', /used by 1 combo class\./);
    });
  });

  describe('styleClassWriteError', () => {
    it('turns a unique violation (also when wrapped) into a readable message', () => {
      assert.equal(
        styleClassWriteError({ code: '23505' }, 'card').message,
        'A class named "card" already exists on this site.'
      );
      const wrapped = Object.assign(new Error('Failed query'), { cause: { code: '23505' } });
      assert.match(styleClassWriteError(wrapped, 'card').message, /already exists/);
    });

    it('passes other errors through unchanged', () => {
      const error = new Error('connection lost');
      assert.equal(styleClassWriteError(error, 'card'), error);
    });
  });

  it('builds a per-site cache tag', () => {
    assert.equal(styleClassesTag('site-1'), 'style-classes:site-1');
  });

  describe('countClassUsage', () => {
    it('counts elements per class across entries, once per node even in draft and published', () => {
      const draft = { nodes: { a: { id: 'a', props: { classIds: ['card', 'big'] } }, b: { id: 'b', props: { classIds: ['card'] } } } };
      const published = { nodes: { a: { id: 'a', props: { classIds: ['card'] } } } };
      const legacy = { content: [{ props: { id: 'x', classIds: ['card'] } }] };
      assert.deepEqual(
        countClassUsage([
          { id: 'page-1', content: draft },
          { id: 'page-1', content: published },
          { id: 'tpl-1', content: legacy },
        ]),
        { card: 3, big: 1 }
      );
    });

    it('is empty for content without classes', () => {
      assert.deepEqual(countClassUsage([{ id: 'p', content: null }, { id: 'q', content: { nodes: {} } }]), {});
    });
  });
});
