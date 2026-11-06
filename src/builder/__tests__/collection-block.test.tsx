/**
 * Collection block rendering: post blocks get the current post, and the
 * canvas explains publish state.
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/collection-block.test.tsx
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CollectionBlockRef } from '../blocks/collection-block';
import { injectPost } from '../loaders';
import { SAMPLE_POST } from '../post-template';

const post = { ...SAMPLE_POST, title: 'Ada Lovelace' };

describe('injectPost', () => {
  it('adds post to post blocks at any depth and leaves others alone', () => {
    const items = [
      {
        type: 'Columns',
        props: {
          id: 'c1',
          column1: [{ type: 'PostTitle', props: { id: 't1' } }],
        },
      },
      { type: 'RichText', props: { id: 'r1' } },
    ];
    const out = injectPost(items, post);
    const nested = (out[0].props as any).column1[0];
    assert.equal(nested.props.post.title, 'Ada Lovelace');
    assert.equal((out[1].props as any).post, undefined);
    // Input is not mutated.
    assert.equal((items[0].props as any).column1[0].props.post, undefined);
  });

  it('is a no-op without a post', () => {
    const items = [{ type: 'PostTitle', props: { id: 't1' } }];
    assert.equal(injectPost(items, undefined), items);
  });
});

describe('CollectionBlockRef', () => {
  it('renders post blocks inside the block', () => {
    const html = renderToStaticMarkup(
      createElement(CollectionBlockRef, {
        collectionBlockId: 'b1',
        blocks: injectPost([{ type: 'PostTitle', props: { id: 't1' } }], post),
      })
    );
    assert.match(html, /Ada Lovelace/);
  });

  it('warns on the canvas when the block is not published', () => {
    const html = renderToStaticMarkup(
      createElement(CollectionBlockRef, {
        collectionBlockId: 'b1',
        collectionBlockName: 'Team card',
        collectionBlockStatus: 'draft-only',
        collectionSlug: 'team-2',
        editing: true,
        blocks: [{ type: 'RichText', props: { id: 'r1', content: 'Hi' } }],
      })
    );
    assert.match(html, /Not published/);
    assert.match(html, /\/dashboard\/collections\/team-2\/blocks\/b1\/builder/);
  });

  it('renders nothing on the live site when there is no published content', () => {
    const html = renderToStaticMarkup(
      createElement(CollectionBlockRef, {
        collectionBlockId: 'b1',
        collectionBlockStatus: 'draft-only',
        blocks: [],
      })
    );
    assert.equal(html, '');
  });
});
