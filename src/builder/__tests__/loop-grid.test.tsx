/**
 * Loop Grid renders its Loop Item template once per item, with per-item
 * `loopItem` bindings.
 *
 * Run with: tsx --import ./scripts/server-only-stub.mjs --test src/builder/__tests__/loop-grid.test.tsx
 */
import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  type BuilderDocument,
  type NormalizedListingItem,
} from '@nextcms/builder-core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsentProvider } from '@/components/site/consent-provider';
import { DEFAULT_CONSENT_SETTINGS } from '@/lib/site-essentials-types';
import { LoopGrid } from '../blocks/loop-grid';
import { LoopItemField } from '../blocks/loop-item-field';
import { LoopItemProvider } from '../blocks/query-loop-client';
import { sanitizeFieldFilters } from '../loaders';

const template: BuilderDocument = {
  version: 1,
  root: { props: {} },
  rootSlot: ['b1', 'b2'],
  nodes: {
    b1: {
      id: 'b1',
      type: 'Button',
      props: {
        label: { $dynamic: 'loopItem', path: 'title' },
        link: { $dynamic: 'loopItem', path: 'url' },
      },
      slots: {},
    },
    b2: {
      id: 'b2',
      type: 'LoopItemField',
      props: { field: 'custom', customKey: 'role' },
      slots: {},
    },
  },
};

const item = (id: string, title: string, role: string): NormalizedListingItem => ({
  id,
  title,
  slug: id,
  url: `/collections/team/${id}`,
  source: 'collection-entries',
  terms: [],
  raw: { role },
});

describe('LoopGrid', () => {
  it('repeats the template with each item’s fields', () => {
    const html = renderToStaticMarkup(
      createElement(LoopGrid, {
        template,
        templateId: 't1',
        items: [item('ada', 'Ada Lovelace', 'Engineer'), item('alan', 'Alan Turing', 'Researcher')],
        total: 2,
        totalPages: 1,
      })
    );
    assert.match(html, /Ada Lovelace/);
    assert.match(html, /Alan Turing/);
    assert.match(html, /Engineer/);
    assert.match(html, /Researcher/);
    assert.match(html, /\/collections\/team\/alan/);
    assert.doesNotMatch(html, /\$dynamic/);
  });

  it('falls back to the default card and shows a hint in the editor', () => {
    const html = renderToStaticMarkup(
      createElement(LoopGrid, {
        template: null,
        editing: true,
        items: [item('ada', 'Ada Lovelace', 'Engineer')],
        total: 1,
        totalPages: 1,
      })
    );
    assert.match(html, /Ada Lovelace/);
    assert.match(html, /Loop Item template/);
  });

  it('renders multiple fields and all Showcase custom field types in LoopItemField', () => {
    const showcaseItem: NormalizedListingItem = {
      id: 'entry-1',
      title: 'Northwind Studio',
      slug: 'northwind-studio',
      url: '/collections/showcase/northwind-studio',
      excerpt: 'Agency portfolio built on post types.',
      image: '/uploads/featured.jpg',
      hasGallery: true,
      galleryCount: 4,
      publishedAt: '2026-11-05T17:14:31.226Z',
      author: { id: 'u1', name: 'Editor User', image: null },
      terms: [
        { id: 't1', name: 'Agency', slug: 'agency', taxonomy: 'industry' },
        { id: 't2', name: 'Loop Grid', slug: 'loop-grid', taxonomy: 'feature' },
      ],
      source: 'collection-entries',
      raw: {
        title: 'Northwind Studio',
        client: 'Northwind',
        screenshot: '/uploads/screenshot.jpg',
        summary: '<p><strong>Rich</strong> agency summary paragraph.</p>',
        website: '/showcase-site/northwind',
        launched: '2026-01-20',
        pages: 26,
        highlight: 'Post types',
        gallery: ['/uploads/shot-1.jpg', '/uploads/shot-2.jpg', '/uploads/shot-3.jpg'],
        video: '/uploads/demo.mp4',
        __fieldMeta: {
          screenshot: { label: 'Screenshot', type: 'media', config: { isFeatured: true, multiple: false } },
          summary: { label: 'Summary', type: 'richtext', config: {} },
          website: { label: 'Website', type: 'url', config: { urlMode: 'other' } },
          launched: { label: 'Launched', type: 'date', config: {} },
          gallery: { label: 'Gallery', type: 'media', config: { multiple: true } },
          video: { label: 'video', type: 'url', config: { urlMode: 'video' } },
        },
      },
    };

    const html = renderToStaticMarkup(
      createElement(ConsentProvider, {
        settings: DEFAULT_CONSENT_SETTINGS,
        initialCookie: null,
        children: createElement(LoopItemProvider, {
          item: showcaseItem,
          children: createElement(LoopItemField, {
            editing: true,
            items: [
              {
                field: 'custom',
                customKey: 'gallery',
                galleryViewMode: 'featured-slider',
                showGalleryBadge: true,
              },
              {
                field: 'custom',
                customKey: 'screenshot',
              },
              {
                field: 'custom',
                customKey: 'title',
                textSize: 'h2',
                style: { color: '#112233' },
              },
              {
                field: 'custom',
                customKey: 'summary',
              },
              {
                field: 'custom',
                customKey: 'publishedAt',
                dateFormat: 'iso',
              },
              {
                field: 'custom',
                customKey: 'authorName',
                authorDisplay: 'avatar-name',
                authorPrefix: 'By ',
              },
              {
                field: 'custom',
                customKey: 'terms',
                termsDisplay: 'badges',
              },
              {
                field: 'custom',
                customKey: 'url',
                urlDisplay: 'link',
                readMoreLabel: 'Explore Case Study',
                urlConfig: { url: '', newTab: true, nofollow: true },
              },
              {
                field: 'custom',
                customKey: 'website',
                urlDisplay: 'button',
                readMoreLabel: 'Visit Live Site',
                urlConfig: { url: '', newTab: true, nofollow: false },
              },
              {
                field: 'custom',
                customKey: 'video',
              },
            ],
          }),
        }),
      })
    );

    // Gallery slider renders featured image first + gallery badge + slide controls
    assert.ok(html.includes('data-loop-gallery-slider=""'));
    assert.ok(html.includes('data-gallery-badge=""'));
    assert.ok(html.includes('src="/uploads/featured.jpg"'));
    // Single media field renders <img> tag, not plain URL string
    assert.ok(html.includes('src="/uploads/screenshot.jpg"'));
    // Rich text summary renders HTML formatting, not raw <p> tags
    assert.ok(html.includes('<strong>Rich</strong> agency summary paragraph.'));
    // Date format option (ISO) renders YYYY-MM-DD
    assert.ok(html.includes('2026-11-05'));
    // Author renders with prefix
    assert.ok(html.includes('By Editor User'));
    // Terms render term names, never [object Object]
    assert.ok(html.includes('Agency'));
    assert.ok(html.includes('Loop Grid'));
    assert.ok(!html.includes('[object Object]'));
    // Permalink renders link with custom title and URL component rel/target
    assert.ok(html.includes('href="/collections/showcase/northwind-studio"'));
    assert.ok(html.includes('Explore Case Study'));
    assert.ok(html.includes('rel="noopener noreferrer nofollow"'));
    // Website renders button link with URL component settings
    assert.ok(html.includes('href="/showcase-site/northwind"'));
    assert.ok(html.includes('Visit Live Site'));
    // Video renders video player
    assert.ok(html.includes('src="/uploads/demo.mp4"'));
  });
});

describe('sanitizeFieldFilters', () => {
  it('keeps valid filters and drops broken or half-filled ones', () => {
    assert.deepEqual(
      sanitizeFieldFilters([
        { key: 'price', operator: 'gte', value: '5' },
        { key: 'role', operator: 'eq', value: '' },
        { key: 'bad key', operator: 'eq', value: 'x' },
        { key: 'featured', operator: 'exists' },
        'nope',
      ]),
      [
        { key: 'price', operator: 'gte', value: '5' },
        { key: 'featured', operator: 'exists' },
      ]
    );
    assert.deepEqual(sanitizeFieldFilters(undefined), []);
  });
});
