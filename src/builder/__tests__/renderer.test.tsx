/**
 * BuilderRenderer must produce the same HTML as Puck `Render` (R684), including
 * nested slots, and a document converted back to Puck must render the same (R683).
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/renderer.test.tsx
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Data } from '@measured/puck';
// Puck's server build: what Next.js uses to render published pages.
import { Render } from '@measured/puck/rsc';
import { builderConfig, postBuilderConfig } from '../config';
import { documentToPuck, puckToDocument } from '@nextcms/builder-core';
import type { BuilderData } from '../data';
import { SAMPLE_POST } from '../post-template';
import { BuilderRenderer, rendererComponents } from '../renderer';

// Slot children are stored inline in props, as Puck 0.20 `slot` fields save them.
const fixtures: Record<string, BuilderData> = {
  flat: {
    root: { props: { maxWidth: 'xl', theme: 'site', paddingY: 'none' } },
    content: [
      { type: 'Hero', props: { id: 'hero-1', title: 'Hello', subtitle: 'Sub', alignment: 'center' } },
      { type: 'CTA', props: { id: 'cta-1', title: 'Get started' } },
    ],
    zones: {},
  },
  columns: {
    root: { props: {} },
    content: [
      {
        type: 'Columns',
        props: {
          id: 'cols-1',
          layout: '1-1',
          column1: [{ type: 'RichText', props: { id: 'rt-1', content: '<p>Left</p>' } }],
          column2: [{ type: 'Button', props: { id: 'btn-1', label: 'Right', link: '/' } }],
          column3: [],
          column4: [],
        },
      },
    ],
    zones: {},
  },
  container: {
    root: { props: {} },
    content: [
      {
        type: 'Container',
        props: {
          id: 'ctr-1',
          content: [
            { type: 'RichText', props: { id: 'rt-2', content: '<p>Inside</p>' } },
            { type: 'Spacer', props: { id: 'sp-1' } },
          ],
        },
      },
    ],
    zones: {},
  },
  tabs: {
    root: { props: {} },
    content: [
      {
        type: 'Tabs',
        props: {
          id: 'tabs-1',
          items: [
            { label: 'One', content: [{ type: 'RichText', props: { id: 'rt-t0', content: '<p>Tab 1</p>' } }] },
            { label: 'Two', content: [{ type: 'RichText', props: { id: 'rt-t1', content: '<p>Tab 2</p>' } }] },
          ],
        },
      },
    ],
    zones: {},
  },
};

// Blocks that page and post content use in the single-post template.
fixtures.gallery = {
  root: { props: {} },
  content: [
    {
      type: 'Gallery',
      props: {
        id: 'gal-1',
        title: 'Work',
        columns: 3,
        items: [{ image: '/a.jpg', caption: 'A' }, { image: '/b.jpg', caption: 'B' }],
      },
    },
    { type: 'CollectionItem', props: { id: 'ci-1', field: 'title' } },
  ],
  zones: {},
};

const postFixture: BuilderData = {
  root: { props: {} },
  content: [
    { type: 'PostTitle', props: { id: 'pt-1' } },
    { type: 'PostFeaturedImage', props: { id: 'pf-1' } },
    { type: 'PostMeta', props: { id: 'pm-1' } },
    { type: 'PostContent', props: { id: 'pc-1' } },
    { type: 'RelatedPosts', props: { id: 'rp-1', posts: [] } },
  ],
  zones: {},
};

const normalize = (html: string) => html.replace(/\s+/g, ' ').trim();
const puckHtml = (data: BuilderData) =>
  normalize(renderToStaticMarkup(createElement(Render, { config: builderConfig, data: data as Data })));
const newHtml = (data: BuilderData) =>
  normalize(renderToStaticMarkup(createElement(BuilderRenderer, { document: puckToDocument(data) })));

describe('BuilderRenderer matches Puck Render', () => {
  for (const [name, data] of Object.entries(fixtures)) {
    it(`renders ${name} the same`, () => {
      assert.equal(newHtml(data), puckHtml(data));
    });
  }
});

describe('renderer covers every Puck block', () => {
  it('has a component for every page block', () => {
    const missing = Object.keys(builderConfig.components).filter(
      type => !(type in rendererComponents('page'))
    );
    assert.deepEqual(missing, []);
  });

  it('has a component for every post block', () => {
    const missing = Object.keys(postBuilderConfig.components).filter(
      type => !(type in rendererComponents('post'))
    );
    assert.deepEqual(missing, []);
  });
});

describe('post layouts render the same', () => {
  it('renders post blocks with the current post', () => {
    const metadata = { post: { ...SAMPLE_POST, title: 'Real post title' } };
    const puck = normalize(
      renderToStaticMarkup(
        createElement(Render, {
          config: postBuilderConfig,
          data: postFixture as Data,
          metadata,
        })
      )
    );
    const next = normalize(
      renderToStaticMarkup(
        createElement(BuilderRenderer, {
          document: puckToDocument(postFixture),
          metadata,
          kind: 'post',
        })
      )
    );
    assert.ok(puck.includes('Real post title'));
    assert.equal(next, puck);
  });
});

describe('documents converted back to Puck render the same', () => {
  for (const [name, data] of Object.entries(fixtures)) {
    it(`renders ${name} the same after a round trip`, () => {
      const back = documentToPuck(puckToDocument(data));
      assert.equal(puckHtml(back), puckHtml(data));
    });
  }
});
