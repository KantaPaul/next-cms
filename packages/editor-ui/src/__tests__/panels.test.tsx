import assert from 'node:assert';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { FieldRow } from '../inspector/FieldRow';
import { InspectorTabs } from '../inspector/InspectorTabs';
import { LibraryPanel } from '../library/LibraryPanel';
import { Tabs } from '../primitives/Tabs';
import { LAYER_ROW_ATTRIBUTE, LayersTree } from '../tree/LayersTree';

const items = [
  { type: 'hero', label: 'Hero', category: 'Heroes' },
  { type: 'cta', label: 'Call to action', category: 'Heroes' },
  { type: 'text', label: 'Rich text', category: 'Content' },
];

describe('LibraryPanel host integration (B15 E4)', () => {
  it('groups items under their categories, in the host order', () => {
    const html = renderToStaticMarkup(
      <LibraryPanel items={items} onSelectItem={() => {}} />
    );
    assert.ok(html.indexOf('Heroes') < html.indexOf('Content'));
    assert.match(html, /<section aria-label="Heroes">/);
  });

  it('uses host pointer drag instead of HTML5 drag when given', () => {
    const html = renderToStaticMarkup(
      <LibraryPanel
        items={items}
        onSelectItem={() => {}}
        onItemPointerDown={() => {}}
      />
    );
    assert.doesNotMatch(html, /draggable="true"/);
    assert.match(
      renderToStaticMarkup(
        <LibraryPanel items={items} onSelectItem={() => {}} />
      ),
      /draggable="true"/
    );
  });

  it('shows extras, falls back to a letter icon, and hides unused filters', () => {
    const html = renderToStaticMarkup(
      <LibraryPanel
        items={items}
        onSelectItem={() => {}}
        renderItemExtra={item => <i>{`presets-${item.type}`}</i>}
      />
    );
    assert.match(html, /presets-hero/);
    assert.match(html, /aria-hidden="true"[^>]*>H<\/div>/);
    assert.doesNotMatch(html, /Favorites/);
    assert.match(
      renderToStaticMarkup(
        <LibraryPanel
          items={items}
          onSelectItem={() => {}}
          onToggleFavorite={() => {}}
        />
      ),
      /Favorites/
    );
  });
});

describe('LayersTree host integration (B15 E4)', () => {
  const nodes = [
    {
      id: 'cols',
      name: 'Columns',
      type: 'Columns',
      children: [
        {
          id: 'cols::column1',
          name: 'Column 1',
          type: 'slot',
          group: true,
          children: [{ id: 'a', name: 'A', type: 'Text' }],
        },
        {
          id: 'cols::column2',
          name: 'Column 2',
          type: 'slot',
          group: true,
          children: [{ id: 'b', name: 'B', type: 'Text' }],
        },
      ],
    },
  ];

  it('marks several selected rows and the tree as multi-selectable', () => {
    const html = renderToStaticMarkup(
      <LayersTree nodes={nodes} selectedIds={['a', 'b']} onSelect={() => {}} />
    );
    assert.match(html, /aria-multiselectable="true"/);
    assert.equal(html.match(/aria-selected="true"/g)?.length, 2);
  });

  it('renders slot groups as labelled groups, not selectable rows, at the child depth', () => {
    const html = renderToStaticMarkup(
      <LayersTree nodes={nodes} onSelect={() => {}} />
    );
    assert.match(html, /role="group" aria-label="Column 1"/);
    assert.doesNotMatch(html, /role="treeitem"[^>]*aria-label="Column 1"/);
    assert.match(html, /aria-level="2"[^>]*aria-label="A"/);
  });

  it('tags rows and group headings for host hit-testing and draws the overlay', () => {
    const html = renderToStaticMarkup(
      <LayersTree
        nodes={nodes}
        onSelect={() => {}}
        overlay={<div id="drop-line" />}
      />
    );
    assert.match(html, new RegExp(`${LAYER_ROW_ATTRIBUTE}="cols::column2"`));
    assert.match(html, new RegExp(`${LAYER_ROW_ATTRIBUTE}="a"`));
    assert.match(html, /id="drop-line"/);
  });

  it('keeps hidden and locked state visible without hover', () => {
    const html = renderToStaticMarkup(
      <LayersTree
        nodes={[
          { id: 'x', name: 'X', type: 'Text', hidden: true, locked: true },
        ]}
        onSelect={() => {}}
        onToggleHide={() => {}}
        onToggleLock={() => {}}
      />
    );
    assert.match(html, /aria-label="Show X" aria-pressed="true"/);
    assert.match(html, /aria-label="Unlock X" aria-pressed="true"/);
  });
});

describe('Inspector parts (B15 E4)', () => {
  it('links the FieldRow label to its control and names the reset button', () => {
    const html = renderToStaticMarkup(
      <FieldRow label="Title" htmlFor="field-title" changed onReset={() => {}}>
        <input id="field-title" />
      </FieldRow>
    );
    assert.match(html, /<label for="field-title"/);
    assert.match(html, /aria-label="Reset Title"/);
  });

  it('shows where an inherited device value comes from, as text not a button', () => {
    const html = renderToStaticMarkup(
      <FieldRow
        label="Padding"
        device="mobile"
        isInherited
        inheritedFrom="tablet"
      >
        <input />
      </FieldRow>
    );
    assert.match(html, /from tablet/);
    assert.doesNotMatch(html, /<button[^>]*>.*from tablet/);
  });

  it('exposes tabs with roles, one tab stop, labels and changed dots', () => {
    const html = renderToStaticMarkup(
      <Tabs
        ariaLabel="Settings tabs"
        activeId="style"
        onChange={() => {}}
        items={[
          { id: 'content', label: 'Content', badge: 2 },
          {
            id: 'style',
            label: 'Style',
            badge: 3,
            changed: true,
            ariaLabel: 'Style (3, changed)',
          },
        ]}
      />
    );
    assert.match(html, /role="tablist" aria-label="Settings tabs"/);
    assert.match(
      html,
      /role="tab" aria-selected="true" aria-label="Style \(3, changed\)" tabindex="0"/
    );
    assert.match(html, /role="tab" aria-selected="false"[^>]*tabindex="-1"/);
    assert.match(html, /rounded-full bg-\[var\(--ne-primary\)\]/);
  });

  it('keeps the settings search open while it has a query', () => {
    const html = renderToStaticMarkup(
      <InspectorTabs
        tabs={[{ id: 'a', label: 'A' }]}
        activeTab="a"
        onTabChange={() => {}}
        searchQuery="pad"
        onSearchChange={() => {}}
      />
    );
    assert.match(
      html,
      /type="search" aria-label="Search settings"[^>]*value="pad"/
    );
  });
});
