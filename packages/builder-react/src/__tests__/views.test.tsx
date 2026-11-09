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
import { fieldValueAccess } from '../fields';

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

      assert.match(html, /Search blocks or components\.\.\./);
      assert.match(html, />Blocks</);
      assert.match(html, />Patterns</);
      assert.match(html, />Global</);
      assert.match(html, /Heading/);
      assert.match(html, /Container/);
      assert.match(html, /Hover to preview/);
    });

    it('lists block presets under Patterns', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <ElementsView defaultTab="patterns" />
        </EditorProvider>
      );

      assert.match(html, /Section presets/);
      assert.match(html, /Heading: Hero/);
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
      // Number fields live on the Style tab; Content is shown first.
      assert.match(html, /title="Style \(⌥S\)"/);
      assert.doesNotMatch(html, /Heading Level/);
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
    const PAGE_FIELDS = {
      title: {
        type: 'text' as const,
        label: 'Title',
        tab: 'content',
        section: 'Page',
      },
      maxWidth: {
        type: 'select' as const,
        label: 'Content width',
        tab: 'style',
        section: 'Layout',
        options: [
          { label: 'Medium (1024px)', value: 'lg' },
          { label: 'Full width', value: 'full' },
        ],
      },
      position: {
        type: 'select' as const,
        label: 'Position',
        tab: 'style',
        section: 'Layout',
        path: 'layout.position',
        options: [
          { label: 'Top', value: 'top' },
          { label: 'Bottom', value: 'bottom' },
        ],
      },
    };

    it('renders tabs and sections, drops slug and description, and shows dashboard link only with settingsHref', () => {
      const store = createEditorStore({
        document: {
          ...INITIAL_DOC,
          root: { props: {} },
        },
        schemas: SCHEMAS,
      });

      const withLink = renderToStaticMarkup(
        <EditorProvider store={store}>
          <PageSettingsView
            fields={PAGE_FIELDS}
            label="Page"
            defaultProps={{ title: 'Fallback Title', maxWidth: 'lg' }}
            settingsHref="/dashboard/pages/42/edit"
          />
        </EditorProvider>
      );

      // Tabs and sections render
      assert.match(withLink, />Content</);
      assert.match(withLink, />Style</);
      assert.match(withLink, /Page/);

      // Slug and description are gone
      assert.doesNotMatch(withLink, /URL Slug/);
      assert.doesNotMatch(withLink, /Description/);

      // Title falls back to defaultProps
      assert.match(withLink, /Fallback Title/);

      // Dashboard link renders when settingsHref is set
      assert.match(withLink, /URL &amp; SEO settings/);
      assert.match(withLink, /\/dashboard\/pages\/42\/edit/);
      assert.match(withLink, /target="_blank"/);

      const withoutLink = renderToStaticMarkup(
        <EditorProvider store={store}>
          <PageSettingsView
            fields={PAGE_FIELDS}
            label="Page"
            defaultProps={{ title: 'Fallback Title' }}
          />
        </EditorProvider>
      );
      assert.doesNotMatch(withoutLink, /URL &amp; SEO settings/);
    });

    it('shows empty state for kinds with no root fields', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <PageSettingsView fields={{}} label="Global" />
        </EditorProvider>
      );

      assert.match(html, /No settings for this global\./);
    });

    it('supports root edits, reset, Show only changed, and nested path fields via updateRootProps', () => {
      const store = createEditorStore({
        document: {
          ...INITIAL_DOC,
          root: { props: { title: 'Initial' } },
        },
        schemas: SCHEMAS,
      });

      // 1. Root edit writes through updateRootProps
      store.updateRootProps({ title: 'Updated Title' }, 'root.title');
      assert.equal(store.getState().doc.root.props.title, 'Updated Title');

      // 2. Nested path field writes nested value
      const access = fieldValueAccess(PAGE_FIELDS.position, 'position');
      const nestedPatch = access.write(store.getState().doc.root.props, 'bottom');
      store.updateRootProps(nestedPatch, `root.${access.path}`);
      assert.deepEqual(store.getState().doc.root.props.layout, { position: 'bottom' });

      // 3. "Show only changed" renders only fields that differ from defaults
      const changedHtml = renderToStaticMarkup(
        <EditorProvider store={store}>
          <PageSettingsView
            fields={PAGE_FIELDS}
            label="Page"
            defaultProps={{ title: 'Fallback Title', maxWidth: 'lg' }}
            changedOnly={true}
          />
        </EditorProvider>
      );
      assert.match(changedHtml, /Updated Title/);
      assert.doesNotMatch(changedHtml, /Content width/);

      // 4. Reset field back to default
      const resetPatch = access.write(store.getState().doc.root.props, undefined);
      store.updateRootProps(resetPatch, `root.${access.path}`);
      assert.equal((store.getState().doc.root.props.layout as Record<string, unknown> | undefined)?.position, undefined);

      store.updateRootProps({ title: 'Fallback Title' }, 'root.title');
      assert.equal(store.getState().doc.root.props.title, 'Fallback Title');
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

    it('puts undo/redo and view routes in the footer rail, with a back button in settings', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });
      store.select('h1');

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <SinglePanel blocks={SCHEMAS as any} onOpenCommandPalette={() => {}} />
        </EditorProvider>
      );

      assert.match(html, /aria-label="Panel footer toolbar"/);
      assert.match(html, /aria-label="Undo"/);
      assert.match(html, /aria-label="Templates"/);
      assert.match(html, /aria-label="Command palette"/);
      // A nested block's Back jumps to its parent; a top-level one returns to the library.
      assert.match(html, /aria-label="(Back to blocks|Jump up to [^"]+)"/);
      assert.match(html, /aria-label="Close inspector"/);
    });

    it('opens on the block library with no back button when nothing is selected', () => {
      const store = createEditorStore({
        document: INITIAL_DOC,
        schemas: SCHEMAS,
      });

      const html = renderToStaticMarkup(
        <EditorProvider store={store}>
          <SinglePanel blocks={SCHEMAS as any} />
        </EditorProvider>
      );

      assert.match(html, /Blocks/);
      assert.doesNotMatch(html, /aria-label="Back to blocks"/);
    });
  });
});
