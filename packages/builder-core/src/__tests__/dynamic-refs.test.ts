import assert from 'node:assert';
import { describe, it } from 'node:test';
import { APPROVED_DYNAMIC_SOURCES, dynamicBindingSchema } from '../dynamic';
import { collectDynamicRefs, resolveDynamicValue } from '../dynamic-resolver';
import { normalizeProps } from '../normalize';
import { DOCUMENT_VERSION, type BuilderDocument } from '../document';

describe('Picked-record dynamic sources (pageRef / postRef)', () => {
  const context = {
    postRef: { p1: { id: 'p1', title: 'Hello post' } },
    pageRef: { a1: { id: 'a1', title: 'About', url: '/about' } },
  };

  it('lists Specific Page and Specific Blog Post as pickable sources', () => {
    assert.equal(APPROVED_DYNAMIC_SOURCES.postRef.pick, 'post');
    assert.equal(APPROVED_DYNAMIC_SOURCES.pageRef.pick, 'page');
  });

  it('resolves a field of the chosen record', () => {
    assert.equal(
      resolveDynamicValue({ $dynamic: 'postRef', ref: 'p1', path: 'title' }, context),
      'Hello post'
    );
    assert.equal(
      resolveDynamicValue({ $dynamic: 'pageRef', ref: 'a1', path: 'url' }, context),
      '/about'
    );
  });

  it('falls back when the record is missing or not chosen', () => {
    const fallback = 'Fallback';
    assert.equal(
      resolveDynamicValue({ $dynamic: 'postRef', ref: 'gone', path: 'title', fallback }, context),
      fallback
    );
    assert.equal(
      resolveDynamicValue({ $dynamic: 'postRef', path: 'title', fallback }, context),
      fallback
    );
    assert.equal(
      resolveDynamicValue({ $dynamic: 'postRef', ref: '__proto__', path: 'title' }, context),
      ''
    );
  });

  it('keeps ref through validation and normalization', () => {
    const binding = { $dynamic: 'postRef', ref: 'p1', path: 'title' };
    assert.ok(dynamicBindingSchema.safeParse(binding).success);
    assert.deepEqual(normalizeProps({ title: binding }).title, binding);
  });

  it('collects refs at any depth, once per id', () => {
    const doc = {
      version: DOCUMENT_VERSION,
      rootIds: ['n1'],
      nodes: {
        n1: {
          id: 'n1',
          type: 'Features',
          props: {
            title: { $dynamic: 'pageRef', ref: 'a1', path: 'title' },
            items: [
              { title: { $dynamic: 'postRef', ref: 'p1', path: 'title' } },
              { title: { $dynamic: 'postRef', ref: 'p1', path: 'url' } },
              { title: { $dynamic: 'page', path: 'title' } },
            ],
          },
        },
      },
    } as unknown as BuilderDocument;
    assert.deepEqual(collectDynamicRefs(doc), { pageRef: ['a1'], postRef: ['p1'] });
  });
});
