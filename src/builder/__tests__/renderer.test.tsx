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
import { POST_BLOCK_TYPES } from '../post-template';

const POST_TYPES = new Set<string>(POST_BLOCK_TYPES);

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

  it('resolves dynamic content bindings and global theme tokens in renderDocumentWithLoaders', async () => {
    const { renderDocumentWithLoaders } = await import('../renderer');
    const { createDynamicBinding } = await import('@nextcms/builder-core');

    const doc: any = {
      version: 1,
      root: { props: {} },
      nodes: {
        hero1: {
          id: 'hero1',
          type: 'Hero',
          props: {
            title: createDynamicBinding('page', 'title'),
            subtitle: createDynamicBinding('site', 'name'),
          },
          slots: {},
        },
      },
      rootSlot: ['hero1'],
    };

    const metadata = {
      themeTokens: {
        primaryColor: '#2563eb',
        accentColor: '#10b981',
        fontFamily: 'Inter',
        borderRadius: 'md',
        colorMode: 'light',
        colors: {
          primary: '#2563eb',
          accent: '#10b981',
          text: '#111827',
        },
      },
      page: {
        title: 'Dynamic Page Title 2026',
      },
      site: {
        name: 'Dynamic Site Name',
      },
    };

    const rendered = await renderDocumentWithLoaders(doc, metadata as any, metadata as any);
    const html = renderToStaticMarkup(rendered as any);

    assert.ok(html.includes('Dynamic Page Title 2026'), 'HTML contains resolved dynamic page title');
    assert.ok(html.includes('Dynamic Site Name'), 'HTML contains resolved dynamic site name');
    assert.ok(html.includes('--site-color-primary'), 'HTML contains theme CSS variable');
  });

  it('renders Hero parts in partOrder and only emits data-part wrappers in editing mode', () => {
    const doc: any = {
      version: 1,
      root: { props: {} },
      nodes: {
        hero1: {
          id: 'hero1',
          type: 'Hero',
          props: {
            badge: 'BADGE_TEXT',
            title: 'TITLE_TEXT',
            subtitle: 'SUBTITLE_TEXT',
            primaryButtonText: 'BTN_TEXT',
            primaryButtonLink: '#',
            partOrder: ['title', 'badge', 'buttons', 'subtitle'],
          },
          slots: {},
        },
      },
      rootSlot: ['hero1'],
    };

    const publishedHtml = renderToStaticMarkup(
      createElement(BuilderRenderer, { document: doc })
    );
    assert.ok(
      !publishedHtml.includes('data-part='),
      'Published HTML must not contain data-part wrappers'
    );
    const titleIdx = publishedHtml.indexOf('TITLE_TEXT');
    const badgeIdx = publishedHtml.indexOf('BADGE_TEXT');
    const btnIdx = publishedHtml.indexOf('BTN_TEXT');
    const subIdx = publishedHtml.indexOf('SUBTITLE_TEXT');
    assert.ok(titleIdx > -1 && badgeIdx > -1 && btnIdx > -1 && subIdx > -1);
    assert.ok(titleIdx < badgeIdx, 'title rendered before badge');
    assert.ok(badgeIdx < btnIdx, 'badge rendered before buttons');
    assert.ok(btnIdx < subIdx, 'buttons rendered before subtitle');

    const editingHtml = renderToStaticMarkup(
      createElement(BuilderRenderer, {
        document: doc,
        metadata: { editing: true },
      })
    );
    assert.ok(
      editingHtml.includes('data-part="title"'),
      'Editing HTML includes data-part wrappers'
    );
    assert.ok(editingHtml.includes('data-part="badge"'));
  });
});