import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FieldDef } from '@nextcms/builder-core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorProvider } from '../context';
import { BUILT_IN_FIELDS } from '../fields';
import { keyAction, runKeyAction } from '../keyboard';
import { filterSettingsFields, SettingsView } from '../settings-view';
import { createEditorStore } from '../store';

const FIELDS: Record<string, FieldDef> = {
  title: { type: 'text', label: 'Title', group: 'Content' },
  icon: { type: 'icon', label: 'Icon' },
  image: { type: 'media', label: 'Image' },
  color: { type: 'color', label: 'Text color', group: 'Color' },
  padding: { type: 'number', label: 'Padding', group: 'Spacing', description: 'Inner space' },
  cssId: { type: 'text', label: 'CSS ID', group: 'Advanced' },
};
const DEFAULTS = { title: 'Hi', icon: 'star', color: '#000', padding: 8, cssId: '' };
const PROPS = { ...DEFAULTS, title: 'Changed', padding: 16 };

const names = (sections: ReturnType<typeof filterSettingsFields>) =>
  sections.flatMap(s => s.fields.map(([n]) => n));

describe('filterSettingsFields', () => {
  const base = { fields: FIELDS, props: PROPS, defaultProps: DEFAULTS, device: 'desktop' as const };

  it('splits fields into Content / Style / Advanced tabs', () => {
    assert.deepEqual(names(filterSettingsFields({ ...base, tab: 'content' })), ['title', 'icon', 'image']);
    assert.deepEqual(names(filterSettingsFields({ ...base, tab: 'style' })), ['color', 'padding']);
    assert.deepEqual(names(filterSettingsFields({ ...base, tab: 'advanced' })), ['cssId']);
  });

  it('"Show only changed" keeps fields that differ from defaults', () => {
    assert.deepEqual(names(filterSettingsFields({ ...base, changedOnly: true })), ['title', 'padding']);
    assert.deepEqual(names(filterSettingsFields({ ...base, changedOnly: true, tab: 'advanced' })), []);
  });

  it('counts changed fields per section', () => {
    const sections = filterSettingsFields(base);
    const bySection = Object.fromEntries(sections.map(s => [s.title, s.changedCount]));
    assert.equal(bySection.Content, 1);
    assert.equal(bySection['Layout & Spacing'], 1);
  });

  it('search matches label, name, or description across every tab', () => {
    assert.deepEqual(names(filterSettingsFields({ ...base, query: 'inner', tab: 'content' })), ['padding']);
    assert.deepEqual(names(filterSettingsFields({ ...base, query: 'CSS' })), ['cssId']);
    assert.deepEqual(
      names(filterSettingsFields({ ...base, query: 'title', changedOnly: true })),
      ['title']
    );
  });
});

describe('SettingsView', () => {
  const SCHEMAS = {
    Card: { type: 'Card', label: 'Card', fields: FIELDS, defaultProps: DEFAULTS },
  };
  const doc = {
    version: 1 as const,
    root: { id: 'root', type: 'root', props: {} },
    nodes: { c1: { id: 'c1', type: 'Card', props: PROPS, parent: 'root', slot: 'content' } },
    slots: { root: { content: ['c1'] } },
  };

  const render = (extra: Record<string, unknown> = {}) => {
    const store = createEditorStore({ document: doc as any, schemas: SCHEMAS as any });
    store.select('c1');
    return renderToStaticMarkup(
      <EditorProvider store={store}>
        <SettingsView blocks={SCHEMAS as any} {...extra} />
      </EditorProvider>
    );
  };

  it('renders tabs, search, the changed filter, and section dots', () => {
    const html = render();
    assert.match(html, /Search settings/);
    assert.match(html, /Show only changed/);
    assert.match(html, /aria-keyshortcuts="Alt\+S"/);
    assert.match(html, /data-modified-dot/);
    assert.match(html, /Title/);
  });

  it('honours a controlled changedOnly prop', () => {
    const html = render({ changedOnly: true, onChangedOnlyChange: () => {} });
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /Title/);
    assert.doesNotMatch(html, />Icon</);
  });

  it('can hide the built-in filter for a host-driven chip', () => {
    assert.doesNotMatch(render({ hideChangedFilter: true }), /Show only changed/);
  });
});

describe('settings tab shortcuts', () => {
  it('maps ⌥C / ⌥S / ⌥A by physical key, even when macOS types a symbol', () => {
    assert.equal(keyAction({ key: 'ç', code: 'KeyC', altKey: true }), 'settings-content');
    assert.equal(keyAction({ key: 'ß', code: 'KeyS', altKey: true }), 'settings-style');
    assert.equal(keyAction({ key: 'a', altKey: true }), 'settings-advanced');
    assert.equal(keyAction({ key: 'ArrowUp', altKey: true }), 'move-up');
    assert.equal(keyAction({ key: 'c', metaKey: true }), 'copy');
  });

  it('calls onSettingsTab when given', () => {
    const store = createEditorStore({ document: { version: 1, root: { id: 'root', type: 'root', props: {} }, nodes: {}, slots: {} } as any, schemas: {} });
    let tab = '';
    assert.equal(runKeyAction(store, 'settings-style', { onSettingsTab: t => { tab = t; } }), true);
    assert.equal(tab, 'style');
  });
});

describe('icon and media field types', () => {
  it('are registered as built-in inspector fields', () => {
    assert.ok(BUILT_IN_FIELDS.icon);
    assert.ok(BUILT_IN_FIELDS.media);
  });
});
