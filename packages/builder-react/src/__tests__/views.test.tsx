import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorProvider } from '../context';
import { ElementsView } from '../elements-view';
import { HistoryView } from '../history-view';
import { LayersView } from '../layers-view';
import { PageSettingsView } from '../page-settings-view';
import { SettingsView } from '../settings-view';
import { SinglePanel } from '../single-panel';
import { createEditorStore } from '../store';

const SCHEMAS = {
  Heading: {
    type: 'Heading',
    label: 'Heading',
    fields: {
      text: { type: 'text' as const, label: 'Title Text' },
      level: { type: 'number' as const, label: 'Heading Level' },
    },
    defaultProps: { text: 'Hello World', level: 1 },
    presets: {
      Hero: { text: 'Hero Headline', level: 1 },
    },
  },
  Container: {
    type: 'Container',
    label: 'Container',
    slots: { content: {} },
    fields: {
      padding: { type: 'number' as const, label: 'Padding' },
    },
    defaultProps: { padding: 16 },
  },
};

const INITIAL_DOC = {
  version: 1 as const,
  root: { id: 'root', type: 'root', props: { title: 'My Home Page', slug: '/home' } },
  nodes: {
    c1: { id: 'c1', type: 'Container', props: { padding: 24 }, slots: { content: ['h1'] } },
    h1: { id: 'h1', type: 'Heading', props: { text: 'Main Title', level: 1 }, slots: {} },
  },
  rootSlot: ['c1'],
};

describe('Single Panel Layout Views (Phase 6)', () => {
  describe('ElementsView', () => {
    it('renders categorized elements with search and preset chips', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <ElementsView />
        </EditorProvider>
      );

      assert.match(html, /Search elements…/);
      assert.match(html, /Heading/);
      assert.match(html, /Container/);
      assert.match(html, /Hero/); // Preset chip
    });
  });

  describe('LayersView', () => {
    it('renders document hierarchy tree with search filter', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <LayersView />
        </EditorProvider>
      );

      assert.match(html, /Filter layers…/);
      assert.match(html, /Container/);
      assert.match(html, /Heading/);
    });
  });

  describe('SettingsView', () => {
    it('renders accordion sections for the selected block', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });
      store.select('h1');

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <SettingsView blocks={SCHEMAS as any} />
        </EditorProvider>
      );

      assert.match(html, /Search settings…/);
      assert.match(html, /Title Text/);
      assert.match(html, /Heading Level/);
    });

    it('renders multi-selection batch action state when >1 blocks are selected', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });
      store.select(['c1', 'h1']);

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <SettingsView blocks={SCHEMAS as any} />
        </EditorProvider>
      );

      assert.match(html, /2 blocks selected/);
      assert.match(html, /Duplicate All/);
      assert.match(html, /Delete All/);
    });
  });

  describe('PageSettingsView', () => {
    it('renders root page title, slug, and description inputs', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <PageSettingsView />
        </EditorProvider>
      );

      assert.match(html, /Page Settings/);
      assert.match(html, /Page Title/);
      assert.match(html, /URL Slug/);
      assert.match(html, /My Home Page/);
      assert.match(html, /\/home/);
    });
  });

  describe('HistoryView', () => {
    it('renders timeline with active state and undo/redo controls', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });
      store.insertBlock('Heading');

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <HistoryView />
        </EditorProvider>
      );

      assert.match(html, /History Timeline/);
      assert.match(html, /Undo/);
      assert.match(html, /Redo/);
      assert.match(html, /Active/);
    });
  });

  describe('SinglePanel', () => {
    it('renders EditorPanel with tabs and ToolRail', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });
      store.select('h1');

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <SinglePanel blocks={SCHEMAS as any} defaultMode="settings" />
        </EditorProvider>
      );

      assert.match(html, /role="toolbar"/);
      assert.match(html, /Settings/);
      assert.match(html, /Layers/);
      assert.match(html, /Elements/);
      assert.match(html, /Page/);
      assert.match(html, /History/);
      assert.match(html, /Title Text/);
    });
  });
});
