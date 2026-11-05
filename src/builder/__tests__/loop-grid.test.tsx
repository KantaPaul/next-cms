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
import { LoopGrid } from '../blocks/loop-grid';
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
