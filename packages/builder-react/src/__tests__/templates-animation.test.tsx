import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  type BlockSchemas,
  type BuilderDocument,
  type FieldDef,
} from '@nextcms/builder-core';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EditorProvider } from '../context';
import {
  DEFAULT_TEMPLATES,
  type TemplateItem,
} from '../data/default-templates';
import { FieldControl, setE12ControlsEnabled } from '../fields';
import { SinglePanel } from '../single-panel';
import { createEditorStore } from '../store';
import { TemplateLibraryView } from '../template-library-view';

const SCHEMAS: BlockSchemas = {
  Heading: {
    type: 'Heading',
    label: 'Heading',
    defaultProps: { text: 'Heading' },
  },
  Text: {
    type: 'Text',
    label: 'Text',
    defaultProps: { text: 'Paragraph' },
  },
  Button: {
    type: 'Button',
    label: 'Button',
    defaultProps: { text: 'Click me' },
  },
  Container: {
    type: 'Container',
    label: 'Container',
    defaultProps: {},
  },
  Columns: {
    type: 'Columns',
    label: 'Columns',
    defaultProps: { count: 2 },
  },
  Card: {
    type: 'Card',
    label: 'Card',
    defaultProps: { title: 'Card' },
  },
};

const INITIAL_DOC: BuilderDocument = {
  version: 1,
  root: { props: {} },
  rootSlot: ['b1'],
  nodes: {
    b1: { id: 'b1', type: 'Text', props: { text: 'Existing block' }, slots: {} },
  },
};

describe('DEFAULT_TEMPLATES (Phase 8)', () => {
  it('contains expected starter templates with valid document structures', () => {
    assert.ok(DEFAULT_TEMPLATES.length >= 4);

    const hero = DEFAULT_TEMPLATES.find(t => t.category === 'Hero');
    assert.ok(hero);
    assert.ok(hero.content.root);
    assert.ok(Object.keys(hero.content.nodes).length > 0);

    const features = DEFAULT_TEMPLATES.find(t => t.category === 'Features');
    assert.ok(features);

    const pricing = DEFAULT_TEMPLATES.find(t => t.category === 'Pricing');
    assert.ok(pricing);

    const cta = DEFAULT_TEMPLATES.find(t => t.category === 'CTA');
    assert.ok(cta);
  });
});

describe('TemplateLibraryView (Phase 8)', () => {
  it('renders templates list, search, and categories', () => {
    const store = createEditorStore({
      document: INITIAL_DOC,
      schemas: SCHEMAS,
    });

    const html = renderToStaticMarkup(
      <EditorProvider store={store}>
        <TemplateLibraryView />
      </EditorProvider>
    );

    assert.ok(html.includes('Templates'));
    assert.ok(html.includes('Modern Split Hero'));
    assert.ok(html.includes('Three-Column Features'));
    assert.ok(html.includes('Tiered Pricing Table'));
    assert.ok(html.includes('Insert'));
  });

  it('renders custom template with delete button', () => {
    const customTemplate: TemplateItem = {
      id: 'custom-1',
      name: 'My Special Section',
      description: 'Hand-crafted section for sales',
      category: 'Custom',
      isCustom: true,
      content: {
        version: 1,
        root: { props: {} },
        rootSlot: ['c1'],
        nodes: {
          c1: { id: 'c1', type: 'Heading', props: { text: 'Special' }, slots: {} },
        },
      },
    };

    const store = createEditorStore({
      document: INITIAL_DOC,
      schemas: SCHEMAS,
    });

    const html = renderToStaticMarkup(
      <EditorProvider store={store}>
        <TemplateLibraryView
          templates={[customTemplate]}
          onDeleteTemplate={() => {}}
        />
      </EditorProvider>
    );

    assert.ok(html.includes('My Special Section'));
    assert.ok(html.includes('Custom'));
    assert.ok(html.includes('Delete My Special Section'));
  });
});

describe('SinglePanel with Template Mode (Phase 8)', () => {
  it('renders template tab and switches to template library', () => {
    const store = createEditorStore({
      document: INITIAL_DOC,
      schemas: SCHEMAS,
    });

    const blocks = {
      Text: {
        label: 'Text',
        fields: { text: { type: 'text' as const, label: 'Text' } },
        defaultProps: { text: 'Paragraph' },
      },
    };

    const html = renderToStaticMarkup(
      <EditorProvider store={store}>
        <SinglePanel blocks={blocks} defaultMode="templates" />
      </EditorProvider>
    );

    assert.ok(html.includes('Template Library'));
    assert.ok(html.includes('Templates ('));
    assert.ok(html.includes('Modern Split Hero'));
  });
});

describe('Animation & Easing Field Controls (Phase 8)', () => {
  beforeEach(() => {
    setE12ControlsEnabled(true);
  });

  it('renders easing field control', () => {
    const easingField: FieldDef = {
      type: 'easing',
      label: 'Motion Curve',
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="curve"
        field={easingField}
        value="ease-in-out"
        onChange={() => {}}
        props={{}}
      />
    );

    assert.ok(html.includes('Motion Curve'));
    assert.ok(html.includes('Ease In-Out'));
    assert.ok(html.includes('role="radiogroup"'));
  });

  it('renders transition picker field control', () => {
    const transitionField: FieldDef = {
      type: 'transition',
      label: 'Hover Transition',
    };

    const html = renderToStaticMarkup(
      <FieldControl
        name="transition"
        field={transitionField}
        value={{
          property: 'all',
          duration: 300,
          timingFunction: 'ease-out',
          delay: 0,
        }}
        onChange={() => {}}
        props={{}}
      />
    );

    assert.ok(html.includes('Transition Property'));
    assert.ok(html.includes('Duration'));
    assert.ok(html.includes('Hover Me'));
  });
});
