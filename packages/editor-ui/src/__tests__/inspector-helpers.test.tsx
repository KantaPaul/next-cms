import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BackgroundGroup,
  backgroundMode,
  ColorField,
  DEFAULT_COLOR_TOKENS,
  DEFAULT_ICON_OPTIONS,
  filterColorTokens,
  filterIcons,
  findVariableTokenForValue,
  IconField,
  isCssVariable,
  MediaField,
  normalizeMedia,
  pushRecentIcon,
} from '../controls';
import { FieldGroup } from '../inspector/FieldGroup';
import { ChangedFilter, SettingsSearch } from '../inspector/SettingsSearch';
import { PanelTabs } from '../shell/PanelTabs';

describe('IconField', () => {
  it('search matches id, name, and keywords, case-insensitively', () => {
    const ids = (q: string) => filterIcons(DEFAULT_ICON_OPTIONS, q).map(i => i.id);
    assert.deepEqual(ids('ROCK'), ['rocket']);
    assert.equal(ids('STAR')[0], 'star');
    assert.ok(ids('email').includes('mail'), 'keyword "email" finds Mail');
    assert.ok(ids('cart').includes('shopping-cart'), 'name "Cart" matches');
    assert.deepEqual(ids('zzz-nothing'), []);
    assert.equal(filterIcons(DEFAULT_ICON_OPTIONS, '  ').length, DEFAULT_ICON_OPTIONS.length);
  });

  it('keeps the recent row unique, newest first, and capped', () => {
    assert.deepEqual(pushRecentIcon(['star', 'zap'], 'zap'), ['zap', 'star']);
    assert.deepEqual(
      pushRecentIcon(['a', 'b', 'c'], 'd', 3),
      ['d', 'a', 'b']
    );
  });

  it('renders the selected icon name in the trigger', () => {
    const html = renderToStaticMarkup(
      <IconField label="Icon" value="rocket" onChange={() => {}} />
    );
    assert.match(html, /Rocket/);
    assert.match(html, /Change/);
  });
});

describe('MediaField', () => {
  it('warns about missing alt text only when an image is set', () => {
    const empty = renderToStaticMarkup(
      <MediaField value={{ url: '' }} onChange={() => {}} />
    );
    assert.doesNotMatch(empty, /Missing alt text/);

    const noAlt = renderToStaticMarkup(
      <MediaField value={{ url: 'https://x.test/a.jpg' }} onChange={() => {}} />
    );
    assert.match(noAlt, /Missing alt text/);
    assert.match(noAlt, /Remove/);

    const withAlt = renderToStaticMarkup(
      <MediaField value={{ url: 'https://x.test/a.jpg', alt: 'A cat' }} onChange={() => {}} />
    );
    assert.doesNotMatch(withAlt, /Missing alt text/);
  });

  it('shows Browse only when the host passes onBrowse', () => {
    const without = renderToStaticMarkup(
      <MediaField value={{ url: '' }} onChange={() => {}} />
    );
    assert.doesNotMatch(without, />Browse</);
    const withBrowse = renderToStaticMarkup(
      <MediaField value={{ url: '' }} onChange={() => {}} onBrowse={() => {}} />
    );
    assert.match(withBrowse, /Browse/);
  });

  it('normalizes bare URLs and objects', () => {
    assert.deepEqual(normalizeMedia('a.jpg'), { url: 'a.jpg' });
    assert.deepEqual(normalizeMedia({ url: 'a.jpg', alt: 'x' }), { url: 'a.jpg', alt: 'x' });
    assert.deepEqual(normalizeMedia(undefined), { url: '' });
  });
});

describe('ColorField variables', () => {
  it('detects CSS variables', () => {
    assert.ok(isCssVariable('var(--ne-primary)'));
    assert.ok(isCssVariable(' var(--a, #fff) '));
    assert.ok(!isCssVariable('#2563eb'));
  });

  it('finds the theme token a hard-coded value matches', () => {
    assert.equal(
      findVariableTokenForValue(DEFAULT_COLOR_TOKENS, '#2563eb')?.cssVar,
      '--ne-primary'
    );
    assert.equal(
      findVariableTokenForValue(DEFAULT_COLOR_TOKENS, 'rgb(37, 99, 235)')?.cssVar,
      '--ne-primary'
    );
    assert.equal(findVariableTokenForValue(DEFAULT_COLOR_TOKENS, 'var(--ne-primary)'), undefined);
    assert.equal(findVariableTokenForValue(DEFAULT_COLOR_TOKENS, '#123456'), undefined);
  });

  it('searches tokens by name, variable, and value', () => {
    assert.deepEqual(
      filterColorTokens(DEFAULT_COLOR_TOKENS, 'danger').map(t => t.name),
      ['Crimson Danger']
    );
    assert.ok(filterColorTokens(DEFAULT_COLOR_TOKENS, '#059669').length === 1);
  });

  it('renders the token name for a variable value', () => {
    const html = renderToStaticMarkup(
      <ColorField label="Text" value="var(--ne-primary)" onChange={() => {}} />
    );
    assert.match(html, /Primary/);
  });
});

describe('BackgroundGroup modes', () => {
  it('maps color and image to Classic, gradient to Gradient', () => {
    assert.equal(backgroundMode({ type: 'color' }), 'classic');
    assert.equal(backgroundMode({ type: 'image' }), 'classic');
    assert.equal(backgroundMode({ type: 'gradient' }), 'gradient');
  });

  it('shows the color and image controls in Classic', () => {
    const html = renderToStaticMarkup(
      <BackgroundGroup value={{ type: 'color', color: '#fff' }} onChange={() => {}} defaultOpen />
    );
    assert.match(html, /Classic/);
    assert.match(html, /Gradient/);
    assert.match(html, /Background Color/);
    assert.match(html, /Image/);
  });
});

describe('Inspector helpers', () => {
  it('FieldGroup shows a modified dot and count only when changed', () => {
    const plain = renderToStaticMarkup(<FieldGroup title="Layout">x</FieldGroup>);
    assert.doesNotMatch(plain, /data-modified-dot/);
    const changed = renderToStaticMarkup(
      <FieldGroup title="Layout" changedCount={2}>x</FieldGroup>
    );
    assert.match(changed, /data-modified-dot/);
    assert.match(changed, /2 modified/);
  });

  it('SettingsSearch and ChangedFilter render their state', () => {
    const search = renderToStaticMarkup(<SettingsSearch value="pad" onChange={() => {}} />);
    assert.match(search, /Clear search/);
    const filter = renderToStaticMarkup(
      <ChangedFilter checked changedTotal={3} onChange={() => {}} />
    );
    assert.match(filter, /aria-pressed="true"/);
    assert.match(filter, /Show only changed/);
    assert.match(filter, />3</);
  });

  it('PanelTabs shows a modified dot and the shortcut', () => {
    const html = renderToStaticMarkup(
      <PanelTabs
        activeTab="content"
        onChange={() => {}}
        tabs={[
          { id: 'content', label: 'Content', shortcut: '⌥C', changed: true },
          { id: 'style', label: 'Style', shortcut: '⌥S' },
        ]}
      />
    );
    assert.equal(html.match(/data-modified-dot/g)?.length, 1);
    assert.match(html, /aria-keyshortcuts="Alt\+C"/);
    assert.match(html, /title="Content \(⌥C\)"/);
  });
});
