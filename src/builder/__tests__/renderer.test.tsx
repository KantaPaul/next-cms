/**
 * BuilderRenderer smoke tests (post-Puck cutover).
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/renderer.test.tsx
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { puckToDocument } from '@nextcms/builder-core';
import { BuilderRenderer, rendererComponents } from '../renderer';
import { NATIVE_BLOCKS } from '../definitions/native';

const POST_TYPES = new Set([
  'PostTitle',
  'PostFeaturedImage',
  'PostMeta',
  'PostContent',
  'RelatedPosts',
]);

describe('renderer components', () => {
  it('has a component for every page native block', () => {
    const components = rendererComponents('page');
    const missing = NATIVE_BLOCKS.map(b => b.type)
      .filter(type => !POST_TYPES.has(type))
      .filter(type => !(type in components));
    assert.deepEqual(missing, []);
  });

  it('has a component for every post native block', () => {
    const components = rendererComponents('post');
    const missing = NATIVE_BLOCKS.map(b => b.type).filter(
      type => !(type in components)
    );
    assert.deepEqual(missing, []);
  });
});

describe('BuilderRenderer renders', () => {
  it('renders an empty document', () => {
    const doc = puckToDocument({ root: { props: {} }, content: [], zones: {} });
    const html = renderToStaticMarkup(createElement(BuilderRenderer, { document: doc }));
    assert.ok(html.length > 0);
  });
});