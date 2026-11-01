import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BlockLibrary } from '../library/BlockLibrary';
import {
  BlockThumbnailPreview,
  blockThumbnailFamily,
} from '../library/BlockThumbnailPreview';
import {
  MAX_RECENT_BLOCKS,
  pushRecentBlock,
  readLibraryPreferences,
  toggleFavoriteBlock,
  writeLibraryPreferences,
} from '../library/libraryPreferences';

const BLOCKS = [
  {
    type: 'Hero',
    label: 'Hero',
    category: 'Heroes',
    icon: 'hero',
    description: 'Headline banner with copy and actions',
  },
  {
    type: 'Columns',
    label: 'Columns',
    category: 'Layout',
    icon: 'columns',
    description: 'Two to four side-by-side columns',
  },
  { type: 'Image', label: 'Image', category: 'Media', icon: 'image' },
];

describe('libraryPreferences', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('toggles favorites and keeps recents newest first, capped', () => {
    let prefs = { favorites: [], recents: [] } as {
      favorites: string[];
      recents: string[];
    };
    prefs = toggleFavoriteBlock(prefs, 'Hero');
    assert.deepEqual(prefs.favorites, ['Hero']);
    prefs = toggleFavoriteBlock(prefs, 'Hero');
    assert.deepEqual(prefs.favorites, []);

    for (let i = 0; i < MAX_RECENT_BLOCKS + 2; i++) {
      prefs = pushRecentBlock(prefs, `B${i}`);
    }
    prefs = pushRecentBlock(prefs, 'B3');
    assert.equal(prefs.recents.length, MAX_RECENT_BLOCKS);
    assert.equal(prefs.recents[0], 'B3');
    assert.equal(prefs.recents.filter(t => t === 'B3').length, 1);
  });

  it('round-trips through storage and survives broken storage', () => {
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => data.get(k) ?? null,
        setItem: (k: string, v: string) => data.set(k, v),
      },
    });
    writeLibraryPreferences('k', { favorites: ['Hero'], recents: ['Image'] });
    assert.deepEqual(readLibraryPreferences('k'), {
      favorites: ['Hero'],
      recents: ['Image'],
    });

    data.set('k', '{not json');
    assert.deepEqual(readLibraryPreferences('k'), {
      favorites: [],
      recents: [],
    });

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });
    assert.deepEqual(readLibraryPreferences('k'), {
      favorites: [],
      recents: [],
    });
    assert.doesNotThrow(() =>
      writeLibraryPreferences('k', { favorites: [], recents: [] })
    );
  });
});

describe('BlockThumbnailPreview', () => {
  it('picks a family by type, then by category', () => {
    assert.equal(blockThumbnailFamily('Hero'), 'hero');
    assert.equal(blockThumbnailFamily('Columns'), 'columns');
    assert.equal(blockThumbnailFamily('ContactForm'), 'form');
    assert.equal(blockThumbnailFamily('Unknown', 'marketing'), 'cards');
    assert.equal(blockThumbnailFamily('Unknown'), 'generic');
  });

  it('renders the family wireframe', () => {
    const html = renderToStaticMarkup(<BlockThumbnailPreview type="Video" />);
    assert.match(html, /data-family="video"/);
  });
});

describe('BlockLibrary', () => {
  it('renders tabs, search, favorites, recents, and category cards', () => {
    const html = renderToStaticMarkup(
      <BlockLibrary
        blocks={BLOCKS}
        favorites={['Hero']}
        recents={['Image', 'Columns']}
        onToggleFavorite={() => {}}
        onAddBlock={() => {}}
      />
    );
    for (const text of ['Blocks', 'Patterns', 'Global']) {
      assert.match(html, new RegExp(`role="tab"[^>]*>(<[^>]+>)*${text}<`));
    }
    assert.match(html, /placeholder="Search blocks or components\.\.\."/);
    assert.match(html, /aria-label="Favorites"/);
    assert.match(html, /Recent additions/);
    assert.ok(html.indexOf('>Image<') < html.indexOf('>Columns<'));
    assert.match(html, /aria-label="Heroes"/);
    assert.match(html, /Two to four side-by-side columns/);
    assert.match(html, /Hover to preview/);
    assert.match(html, /aria-label="Remove Hero from favorites"/);
    assert.match(html, /aria-label="Add Columns to favorites"/);
  });

  it('hides favorites and recents when empty', () => {
    const html = renderToStaticMarkup(
      <BlockLibrary blocks={BLOCKS} onAddBlock={() => {}} />
    );
    assert.doesNotMatch(html, /aria-label="Favorites"/);
    assert.doesNotMatch(html, /Recent additions/);
  });

  it('lists patterns by group and global blocks', () => {
    const patterns = renderToStaticMarkup(
      <BlockLibrary
        blocks={BLOCKS}
        defaultTab="patterns"
        patterns={[
          { id: 'a', label: 'Split hero', category: 'Templates' },
          { id: 'b', label: 'Hero: Dark', category: 'Section presets' },
        ]}
        onAddBlock={() => {}}
      />
    );
    assert.match(patterns, /Split hero/);
    assert.match(patterns, /Section presets/);

    const globals = renderToStaticMarkup(
      <BlockLibrary
        blocks={BLOCKS}
        defaultTab="global"
        globals={[{ id: 'g1', label: 'Site header' }]}
        onAddBlock={() => {}}
      />
    );
    assert.match(globals, /Site header/);
  });
});
